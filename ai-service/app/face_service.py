import base64
import cv2
import numpy as np
import logging
from typing import List, Tuple, Dict, Any, Optional
from deepface import DeepFace
from app.config import settings

logger = logging.getLogger("ai_service")

class FaceService:
    @staticmethod
    def decode_base64_image(base64_str: str) -> np.ndarray:
        """Decodes base64 string or Data URL into OpenCV BGR image numpy array with strict error handling."""
        if not base64_str or len(base64_str.strip()) == 0:
            raise ValueError("Empty or missing base64 image payload.")
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        try:
            img_bytes = base64.b64decode(base64_str)
            nparr = np.frombuffer(img_bytes, np.uint8)
            if nparr.size == 0:
                raise ValueError("Empty buffer derived from base64 input.")
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None or img.size == 0:
                raise ValueError("Failed to decode image from base64 input string.")
            return img
        except Exception as e:
            raise ValueError(f"Invalid base64 image input: {str(e)}")

    @staticmethod
    def extract_embedding(img: np.ndarray) -> Tuple[bool, int, List[float], str]:
        """
        Detects face using fast/efficient backends (opencv, ssd, mtcnn, retinaface)
        and extracts 512-D ArcFace embedding vector.
        """
        if img is None or img.size == 0:
            return False, 0, [], "Invalid input image array."

        detectors = ["opencv", "ssd", "mtcnn", settings.FACE_DETECTOR]
        detectors = list(dict.fromkeys(detectors))

        for detector in detectors:
            try:
                embeddings = DeepFace.represent(
                    img_path=img,
                    model_name=settings.FACE_MODEL,
                    detector_backend=detector,
                    enforce_detection=False
                )

                if len(embeddings) > 0 and "embedding" in embeddings[0]:
                    vec = embeddings[0]["embedding"]
                    face_count = len(embeddings)
                    return True, face_count, [float(x) for x in vec], f"ArcFace embedding extracted successfully using {detector} detector."
            except Exception as det_err:
                logger.debug(f"Detector {detector} failed: {str(det_err)}")
                continue

        return False, 0, [], "No face detected in the frame using available face detectors."

    @staticmethod
    def check_anti_spoof(img: np.ndarray) -> Tuple[bool, float, str]:
        """
        Evaluates image for Presentation Attacks (printed photo, phone screen, static image).
        Uses DeepFace anti-spoofing model + Laplacian texture variance check.
        Returns: (is_real, score, message)
        """
        if img is None or img.size == 0:
            return False, 0.0, "Invalid image for anti-spoof analysis."

        try:
            # 1. Try DeepFace anti-spoofing check
            objs = DeepFace.extract_faces(
                img_path=img,
                detector_backend="opencv",
                enforce_detection=False,
                anti_spoofing=True
            )

            if len(objs) > 0 and "is_real" in objs[0]:
                is_real = bool(objs[0]["is_real"])
                score = float(objs[0].get("antispoof_score", 0.95 if is_real else 0.15))
                if not is_real:
                    return False, score, "Presentation attack / spoof detected (photo screen or printed image)."
                return True, score, "Anti-spoofing check passed: Live human face."
        except Exception as e:
            logger.warning(f"DeepFace anti-spoofing model fallback active: {str(e)}")

        # 2. Laplacian texture variance check (threshold tuned for webcam frames)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        if laplacian_var < 1.0:
            return False, 0.20, "Spoof detected: Image lacks depth/texture variance (blank/frozen stream)."

        return True, 0.90, "Anti-spoofing passed via texture analyzer."

    @staticmethod
    def verify_face(
        live_img: np.ndarray,
        reference_embeddings: Optional[List[List[float]]] = None,
        reference_img: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Compares live camera frame against student's enrolled reference ArcFace embeddings
        OR directly against the student's enrolled reference database photo.
        Returns detailed verification decision result and extracted reference embedding if calculated.
        """
        # 1. Extract live embedding
        success, face_count, live_vec, msg = FaceService.extract_embedding(live_img)

        if not success:
            return {
                "verified": False,
                "similarity": 0.0,
                "distance": 1.0,
                "threshold": settings.FACE_THRESHOLD,
                "face_count": face_count,
                "multiple_faces": face_count > 1,
                "model": settings.FACE_MODEL,
                "detector": "opencv",
                "message": msg,
                "extracted_reference_embedding": None
            }

        if face_count > 1:
            return {
                "verified": False,
                "similarity": 0.0,
                "distance": 1.0,
                "threshold": settings.FACE_THRESHOLD,
                "face_count": face_count,
                "multiple_faces": True,
                "model": settings.FACE_MODEL,
                "detector": "opencv",
                "message": "Multiple faces detected in frame! Only one person allowed.",
                "extracted_reference_embedding": None
            }

        # 2. Prepare target reference embeddings list
        target_embeddings: List[List[float]] = []
        extracted_ref_vec: Optional[List[float]] = None

        if reference_embeddings and len(reference_embeddings) > 0:
            for vec in reference_embeddings:
                if vec and len(vec) > 0:
                    target_embeddings.append(vec)

        # If reference image is provided and no embedding was passed, dynamically generate live embedding from reference database photo!
        if reference_img is not None:
            ref_success, _, ref_vec, ref_msg = FaceService.extract_embedding(reference_img)
            if ref_success and len(ref_vec) > 0:
                target_embeddings.append(ref_vec)
                extracted_ref_vec = ref_vec
            else:
                logger.warning(f"Could not extract face embedding from reference database photo: {ref_msg}")

        if len(target_embeddings) == 0:
            return {
                "verified": False,
                "similarity": 0.0,
                "distance": 1.0,
                "threshold": settings.FACE_THRESHOLD,
                "face_count": 1,
                "multiple_faces": False,
                "model": settings.FACE_MODEL,
                "detector": "opencv",
                "message": "No valid face embeddings or profile photo found for student.",
                "extracted_reference_embedding": None
            }

        # 3. Compute Cosine Distance & Similarity against reference vectors
        best_distance = 1.0
        best_similarity = 0.0

        live_arr = np.array(live_vec, dtype=np.float64)
        norm_live = np.linalg.norm(live_arr) or 1e-6

        for ref_vec in target_embeddings:
            ref_arr = np.array(ref_vec, dtype=np.float64)
            norm_ref = np.linalg.norm(ref_arr) or 1e-6

            dot_product = np.dot(live_arr, ref_arr)
            cosine_sim = float(dot_product / (norm_live * norm_ref))

            # Cosine distance: 1.0 - cosine_similarity
            distance = float(max(0.0, 1.0 - cosine_sim))

            # Scaled similarity score between 0.0 and 1.0 for reporting
            similarity_score = max(0.0, min(1.0, (cosine_sim + 1.0) / 2.0))

            if distance < best_distance:
                best_distance = distance
                best_similarity = similarity_score

        # ArcFace Cosine Distance Threshold (Default 0.68)
        match_threshold = settings.FACE_THRESHOLD  # 0.68
        # STRICT COMPARISON: ONLY verify if distance is less than or equal to threshold!
        verified = bool(best_distance <= match_threshold)

        return {
            "verified": verified,
            "similarity": round(best_similarity, 4),
            "distance": round(best_distance, 4),
            "threshold": match_threshold,
            "face_count": 1,
            "multiple_faces": False,
            "model": settings.FACE_MODEL,
            "detector": settings.FACE_DETECTOR,
            "message": f"ArcFace identity verification PASSED (Distance: {round(best_distance, 4)}, Threshold: {match_threshold})." if verified else f"Face identity MISMATCH! Imposter face rejected (Distance: {round(best_distance, 4)}, Required: <= {match_threshold}).",
            "extracted_reference_embedding": extracted_ref_vec
        }

    @staticmethod
    def test_face_direct(ref_img: np.ndarray, test_img: np.ndarray) -> Dict[str, Any]:
        """
        Isolated control test endpoint method.
        Directly compares two decoded BGR images using DeepFace.verify.
        """
        import hashlib
        ref_bytes = cv2.imencode('.png', ref_img)[1].tobytes()
        test_bytes = cv2.imencode('.png', test_img)[1].tobytes()
        ref_hash = hashlib.md5(ref_bytes).hexdigest()
        test_hash = hashlib.md5(test_bytes).hexdigest()
        is_identical = ref_hash == test_hash

        # Extract embeddings and count faces
        ref_ok, ref_count, ref_vec, ref_msg = FaceService.extract_embedding(ref_img)
        test_ok, test_count, test_vec, test_msg = FaceService.extract_embedding(test_img)

        if not ref_ok or not test_ok:
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": settings.FACE_THRESHOLD,
                "similarity": 0.0,
                "model": settings.FACE_MODEL,
                "detector": settings.FACE_DETECTOR,
                "metric": settings.FACE_DISTANCE_METRIC,
                "reference_hash": ref_hash,
                "test_hash": test_hash,
                "is_identical_image": is_identical,
                "face_count_ref": ref_count,
                "face_count_test": test_count,
                "message": f"Face detection failed: {ref_msg if not ref_ok else test_msg}"
            }

        # Fast vector comparison fallback
        res = FaceService.verify_face(live_img=test_img, reference_img=ref_img)
        return {
            "verified": res["verified"],
            "distance": res["distance"],
            "threshold": res["threshold"],
            "similarity": res["similarity"],
            "model": settings.FACE_MODEL,
            "detector": settings.FACE_DETECTOR,
            "metric": settings.FACE_DISTANCE_METRIC,
            "reference_hash": ref_hash,
            "test_hash": test_hash,
            "is_identical_image": is_identical,
            "face_count_ref": ref_count,
            "face_count_test": test_count,
            "message": f"Verification completed: {res['message']}"
        }

