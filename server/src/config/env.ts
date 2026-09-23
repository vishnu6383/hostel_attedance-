import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/hostel_attendance'),
  JWT_SECRET: z.string().default('super_secret_hostel_jwt_key_2026_change_in_prod'),
  
  // Fixed Hostel Geofence Location (System Config)
  HOSTEL_LATITUDE: z.string().transform(val => parseFloat(val.trim())).default('11.055548'),
  HOSTEL_LONGITUDE: z.string().transform(val => parseFloat(val.trim())).default('78.047153'),
  HOSTEL_GEOFENCE_RADIUS_METERS: z.string().transform(val => parseFloat(val.trim())).default('100'),
  
  TIMEZONE: z.string().default('Asia/Kolkata'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.string().default('development'),
  TEST_MODE: z.string().transform(val => val === 'true').default('false'),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  AI_SERVICE_API_KEY: z.string().default('super_secret_ai_api_key_2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const ENV = parsed.data;
console.log(`📍 Loaded Hostel Geofence Center: Lat ${ENV.HOSTEL_LATITUDE}, Lon ${ENV.HOSTEL_LONGITUDE} (Radius: ${ENV.HOSTEL_GEOFENCE_RADIUS_METERS}m)`);
