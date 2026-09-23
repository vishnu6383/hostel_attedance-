import axios from 'axios';
import { ENV } from '../config/env';

export interface AIServiceVerifyResponse {
  verified: boolean;
  similarity: number;
  distance: number;
  threshold: number;
  face_count: number;
  multiple_faces: boolean;
  model: string;
  detector: string;
  message: string;
  extracted_reference_embedding?: number[];
}

export interface AIServiceAntiSpoofResponse {
  is_real: boolean;
  score: number;
  is_spoof: boolean;
  message: string;
}

export interface AIServiceEmbeddingResponse {
  success: boolean;
  face_detected: boolean;
  embedding: number[];
  face_count: number;
  model: string;
  detector: string;
  message: string;
}

export class AIService {
  private static get headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': ENV.AI_SERVICE_API_KEY,
    };
  }

  /**
   * Check if Python FastAPI AI Service is reachable
   */
  public static async isHealthy(): Promise<boolean> {
    try {
      const res = await axios.get(`${ENV.AI_SERVICE_URL}/health`, { timeout: 10000 });
      return res.status === 200 && res.data.status === 'HEALTHY';
    } catch (err: any) {
      console.warn('⚠️ Python AI Service health check failed:', err.message);
      return false;
    }
  }

  /**
   * Extract ArcFace 512-D embedding from image using Python FastAPI microservice
   */
  public static async extractEmbedding(imageBase64: string): Promise<AIServiceEmbeddingResponse | null> {
    try {
      const res = await axios.post<AIServiceEmbeddingResponse>(
        `${ENV.AI_SERVICE_URL}/extract-embedding`,
        { image_base64: imageBase64 },
        { headers: this.headers, timeout: 15000 }
      );
      return res.data;
    } catch (err: any) {
      console.warn('⚠️ Python AI Service embedding extraction fallback:', err.message);
      return null;
    }
  }

  /**
   * Perform ArcFace facial identity verification against student enrolled embeddings or reference photo
   */
  public static async verifyFace(
    liveImageBase64: string,
    referenceEmbeddings?: number[][],
    referenceImageBase64?: string
  ): Promise<AIServiceVerifyResponse | null> {
    try {
      const res = await axios.post<AIServiceVerifyResponse>(
        `${ENV.AI_SERVICE_URL}/verify-face`,
        {
          live_image_base64: liveImageBase64,
          reference_embeddings: referenceEmbeddings || [],
          reference_image_base64: referenceImageBase64 || '',
        },
        { headers: this.headers, timeout: 15000 }
      );
      return res.data;
    } catch (err: any) {
      console.warn('⚠️ Python AI Service face verification fallback:', err.message);
      return null;
    }
  }

  /**
   * Perform DeepFace anti-spoof presentation attack check
   */
  public static async checkAntiSpoof(imageBase64: string): Promise<AIServiceAntiSpoofResponse | null> {
    try {
      const res = await axios.post<AIServiceAntiSpoofResponse>(
        `${ENV.AI_SERVICE_URL}/anti-spoof`,
        { image_base64: imageBase64 },
        { headers: this.headers, timeout: 15000 }
      );
      return res.data;
    } catch (err: any) {
      console.warn('⚠️ Python AI Service anti-spoof check fallback:', err.message);
      return null;
    }
  }

  /**
   * Perform DeepFace isolated test-face comparison between two images
   */
  public static async testFace(
    referenceImageBase64: string,
    testImageBase64: string
  ): Promise<any> {
    try {
      const res = await axios.post(
        `${ENV.AI_SERVICE_URL}/test-face`,
        {
          reference_image_base64: referenceImageBase64,
          test_image_base64: testImageBase64,
        },
        { headers: this.headers, timeout: 25000 }
      );
      return res.data;
    } catch (err: any) {
      console.warn('⚠️ Python AI Service test-face failed:', err.message);
      return {
        verified: false,
        message: `AI Service test-face call failed: ${err.message}`,
      };
    }
  }
}

