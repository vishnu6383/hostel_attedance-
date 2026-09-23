from pydantic import BaseModel, Field
from typing import List, Optional

class EmbeddingExtractRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded student face image (Data URL or raw base64)")

class EmbeddingExtractResponse(BaseModel):
    success: bool
    face_detected: bool = Field(..., alias="face_detected")
    embedding: List[float] = []
    face_count: int = 0
    model: str = "ArcFace"
    detector: str = "retinaface"
    message: str = ""

    class Config:
        populate_by_name = True

class FaceVerifyRequest(BaseModel):
    live_image_base64: str = Field(..., description="Base64 encoded live camera frame")
    reference_embeddings: Optional[List[List[float]]] = Field(None, description="List of registered 512-D ArcFace student embeddings in DB")
    reference_image_base64: Optional[str] = Field(None, description="Base64 encoded registered student photo in DB")

class FaceVerifyResponse(BaseModel):
    verified: bool
    similarity: float
    distance: float
    threshold: float
    face_count: int = 1
    multiple_faces: bool = False
    model: str = "ArcFace"
    detector: str = "opencv"
    message: str
    extracted_reference_embedding: Optional[List[float]] = None

class AntiSpoofRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded frame for presentation attack check")

class AntiSpoofResponse(BaseModel):
    is_real: bool
    score: float
    is_spoof: bool
    message: str

class TestFaceRequest(BaseModel):
    reference_image_base64: str = Field(..., description="Base64 encoded reference face image")
    test_image_base64: str = Field(..., description="Base64 encoded test face image")

class TestFaceResponse(BaseModel):
    verified: bool
    distance: float
    threshold: float
    similarity: float
    model: str = "ArcFace"
    detector: str = "retinaface"
    metric: str = "cosine"
    reference_hash: str
    test_hash: str
    is_identical_image: bool
    face_count_ref: int = 1
    face_count_test: int = 1
    message: str

