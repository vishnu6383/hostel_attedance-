import os
import base64
import json
import hashlib
import sys

sys.stdout.reconfigure(encoding='utf-8')

import requests

BASE_URL = "http://127.0.0.1:8000"

def get_base64_image(filepath: str) -> str:
    with open(filepath, 'rb') as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode('utf-8')

def run_test(test_id: str, title: str, ref_file: str, test_file: str, expected_verified: bool):
    print("\n" + "=" * 70)
    print(f"{test_id}: {title}")
    print("=" * 70)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ref_path = os.path.join(base_dir, "test_images", ref_file) if ref_file else None
    test_path = os.path.join(base_dir, "test_images", test_file) if test_file else None
    
    ref_b64 = get_base64_image(ref_path) if ref_path and os.path.exists(ref_path) else ""
    test_b64 = get_base64_image(test_path) if test_path and os.path.exists(test_path) else ""
    
    payload = {
        "reference_image_base64": ref_b64,
        "test_image_base64": test_b64
    }
    
    try:
        res = requests.post(f"{BASE_URL}/test-face", json=payload, timeout=30)
        data = res.json()
        print("API RESPONSE:")
        print(json.dumps(data, indent=2))
        
        verified = data.get("verified", False)
        dist = data.get("distance", 1.0)
        thresh = data.get("threshold", 0.68)
        
        passed = (verified == expected_verified)
        status_str = "[PASS]" if passed else "[FAIL - TEST ASSERTION FAILED]"
        
        print(f"\nASSERTION RESULT: {status_str}")
        print(f"  Expected Verified: {expected_verified} | Actual: {verified}")
        print(f"  Distance: {dist} | Threshold: {thresh}")
        return {
            "test_id": test_id,
            "title": title,
            "ref_file": ref_file or "None",
            "test_file": test_file or "None",
            "expected": "PASS" if expected_verified else "FAIL",
            "actual": "PASS" if verified else "FAIL",
            "verified": verified,
            "distance": dist,
            "threshold": thresh,
            "passed": passed
        }
    except Exception as err:
        print(f"[ERROR] API Request Failed: {err}")
        return {
            "test_id": test_id,
            "title": title,
            "ref_file": ref_file or "None",
            "test_file": test_file or "None",
            "expected": "PASS" if expected_verified else "FAIL",
            "actual": "ERROR",
            "verified": False,
            "distance": 1.0,
            "threshold": 0.68,
            "passed": False
        }

if __name__ == "__main__":
    print("\n========================================================")
    print("      MANDATORY 7-STAGE FACE PIPELINE TEST SUITE        ")
    print("========================================================\n")
    
    results = []
    results.append(run_test("TEST 1", "Vishnu (Ref) vs Vishnu (Live)", "Vishnu.png", "Vishnu.png", True))
    results.append(run_test("TEST 2", "Vishnu (Ref) vs Person B (Live)", "Vishnu.png", "PersonB.png", False))
    results.append(run_test("TEST 3", "Person B (Ref) vs Vishnu (Live)", "PersonB.png", "Vishnu.png", False))
    results.append(run_test("TEST 4", "Person B (Ref) vs Person B (Live)", "PersonB.png", "PersonB.png", True))
    results.append(run_test("TEST 5", "Missing Live Image", "Vishnu.png", "", False))
    results.append(run_test("TEST 6", "Missing Reference Image", "", "Vishnu.png", False))

    print("\n\n" + "=" * 75)
    print("                        TEST SUITE SUMMARY TABLE                        ")
    print("=" * 75)
    print(f"{'TEST ID':<8} | {'REFERENCE':<12} | {'TEST IMAGE':<12} | {'EXPECTED':<8} | {'ACTUAL':<8} | {'DIST':<6} | {'STATUS'}")
    print("-" * 75)
    for r in results:
        status_mark = "✓ PASSED" if r["passed"] else "❌ FAILED"
        print(f"{r['test_id']:<8} | {r['ref_file']:<12} | {r['test_file']:<12} | {r['expected']:<8} | {r['actual']:<8} | {r['distance']:<6.4f} | {status_mark}")
    print("=" * 75 + "\n")
