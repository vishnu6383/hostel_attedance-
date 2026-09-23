# AI Face Verification & Anti-Spoof Microservice (FastAPI + DeepFace)

Dedicated Python FastAPI service providing DeepFace facial identity verification with ArcFace 512-dimensional embeddings, RetinaFace face detection/alignment, and presentation attack anti-spoofing detection.

## Technology Stack
- **Framework**: FastAPI + Uvicorn
- **AI Models**: DeepFace (ArcFace, RetinaFace)
- **Computer Vision**: OpenCV, NumPy
- **Security**: X-API-Key Header Authentication

## Setup & Running

1. **Create Virtual Environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Microservice**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

## Endpoints

- `GET /health` — Check microservice health status.
- `POST /extract-embedding` — Extract 512-D ArcFace embedding vector from student photo.
- `POST /verify-face` — Verify live webcam frame against enrolled student embeddings.
- `POST /anti-spoof` — Presentation attack check (reject printed photos & phone screens).
