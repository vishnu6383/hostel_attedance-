import os
import hashlib
import json
import sys
import traceback

sys.stdout.reconfigure(encoding='utf-8')

from deepface import DeepFace

def get_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        hasher.update(f.read())
    return hasher.hexdigest()

def test_pair(ref_path: str, test_path: str, model_name: str = "ArcFace", detector_backend: str = "retinaface"):
    print("\n" + "=" * 60)
    print(f"TESTING PAIR: {os.path.basename(ref_path)} vs {os.path.basename(test_path)}")
    print("=" * 60)
    
    ref_hash = get_file_hash(ref_path)
    test_hash = get_file_hash(test_path)
    
    print(f"Reference Image: {ref_path} (MD5: {ref_hash})")
    print(f"Test Image:      {test_path} (MD5: {test_hash})")
    if ref_hash == test_hash:
        print("[WARNING] Both images are IDENTICAL (same file/content)!")
    else:
        print("[OK] Confirmed: Images are physically DIFFERENT.")

    try:
        res = DeepFace.verify(
            img1_path=ref_path,
            img2_path=test_path,
            model_name=model_name,
            detector_backend=detector_backend,
            distance_metric="cosine",
            enforce_detection=False,
            align=True
        )
        print("\nRAW DEEPFACE RESULT:")
        print(json.dumps(res, indent=4, default=str))
        
        distance = res.get("distance", 1.0)
        threshold = res.get("threshold", 0.68)
        verified = res.get("verified", False)
        
        print("\nSUMMARY:")
        print(f"  Verified:  {verified}")
        print(f"  Distance:  {distance:.4f}")
        print(f"  Threshold: {threshold:.4f}")
        print(f"  Model:     {model_name}")
        print(f"  Detector:  {detector_backend}")
        print(f"  Metric:    cosine")
        return res
    except Exception as e:
        print(f"[ERROR] Exception during DeepFace verification:")
        traceback.print_exc()
        return None

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vishnu_img = os.path.join(base_dir, "test_images", "Vishnu.png")
    person_b_img = os.path.join(base_dir, "test_images", "PersonB.png")

    print("\n--- ISOLATED DEEPFACE ARCFACE TEST SUITE ---")
    
    print("\n1. Vishnu vs Vishnu (Expected: verified = True)")
    test_pair(vishnu_img, vishnu_img)
    
    print("\n2. Vishnu vs Person B (Expected: verified = False)")
    test_pair(vishnu_img, person_b_img)
    
    print("\n3. Person B vs Person B (Expected: verified = True)")
    test_pair(person_b_img, person_b_img)
