import logging
from fastapi import FastAPI, HTTPException, Security, Depends, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import (
    EmbeddingExtractRequest,
    EmbeddingExtractResponse,
    FaceVerifyRequest,
    FaceVerifyResponse,
    AntiSpoofRequest,
    AntiSpoofResponse,
    TestFaceRequest,
    TestFaceResponse
)
from app.face_service import FaceService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="Smart Hostel Attendance — AI Face Verification & Anti-Spoof Microservice",
    version="1.0.0",
    description="Python FastAPI service providing DeepFace ArcFace embeddings, RetinaFace detection, and Anti-Spoofing presentation attack detection."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing AI Service API Key (X-API-Key)."
        )
    return api_key

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "AI Face Verification Microservice",
        "model": settings.FACE_MODEL,
        "detector": settings.FACE_DETECTOR,
        "threshold": settings.FACE_THRESHOLD
    }

@app.post("/extract-embedding", response_model=EmbeddingExtractResponse, dependencies=[Depends(verify_api_key)])
def extract_embedding(req: EmbeddingExtractRequest):
    try:
        img = FaceService.decode_base64_image(req.image_base64)
        success, face_count, embedding, msg = FaceService.extract_embedding(img)
        return EmbeddingExtractResponse(
            success=success,
            face_detected=success,
            embedding=embedding,
            face_count=face_count,
            model=settings.FACE_MODEL,
            detector=settings.FACE_DETECTOR,
            message=msg
        )
    except Exception as e:
        logger.error(f"Error extracting embedding: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-face", response_model=FaceVerifyResponse, dependencies=[Depends(verify_api_key)])
def verify_face(req: FaceVerifyRequest):
    try:
        live_img = FaceService.decode_base64_image(req.live_image_base64)
        ref_img = None
        if req.reference_image_base64 and len(req.reference_image_base64.strip()) > 0:
            ref_img = FaceService.decode_base64_image(req.reference_image_base64)

        res = FaceService.verify_face(
            live_img=live_img,
            reference_embeddings=req.reference_embeddings,
            reference_img=ref_img
        )
        return FaceVerifyResponse(**res)
    except Exception as e:
        logger.error(f"Error in face verification: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/anti-spoof", response_model=AntiSpoofResponse, dependencies=[Depends(verify_api_key)])
def anti_spoof(req: AntiSpoofRequest):
    try:
        img = FaceService.decode_base64_image(req.image_base64)
        is_real, score, msg = FaceService.check_anti_spoof(img)
        return AntiSpoofResponse(
            is_real=is_real,
            score=score,
            is_spoof=not is_real,
            message=msg
        )
    except Exception as e:
        logger.error(f"Error in anti-spoof check: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/test-face", response_model=TestFaceResponse)
@app.post("/api/test-face", response_model=TestFaceResponse)
def test_face(req: TestFaceRequest):
    try:
        ref_b64 = req.reference_image_base64 or ""
        test_b64 = req.test_image_base64 or ""

        if len(ref_b64.strip()) == 0 or len(test_b64.strip()) == 0:
            return TestFaceResponse(
                verified=False,
                distance=1.0,
                threshold=settings.FACE_THRESHOLD,
                similarity=0.0,
                model=settings.FACE_MODEL,
                detector=settings.FACE_DETECTOR,
                metric=settings.FACE_DISTANCE_METRIC,
                reference_hash="",
                test_hash="",
                is_identical_image=False,
                face_count_ref=0,
                face_count_test=0,
                message="MISSING_IMAGE: Both reference and test base64 images are required."
            )

        ref_img = FaceService.decode_base64_image(ref_b64)
        test_img = FaceService.decode_base64_image(test_b64)
        res = FaceService.test_face_direct(ref_img, test_img)
        return TestFaceResponse(**res)
    except Exception as e:
        logger.error(f"Error in test-face endpoint: {str(e)}")
        return TestFaceResponse(
            verified=False,
            distance=1.0,
            threshold=settings.FACE_THRESHOLD,
            similarity=0.0,
            model=settings.FACE_MODEL,
            detector=settings.FACE_DETECTOR,
            metric=settings.FACE_DISTANCE_METRIC,
            reference_hash="",
            test_hash="",
            is_identical_image=False,
            face_count_ref=0,
            face_count_test=0,
            message=f"Test face error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

