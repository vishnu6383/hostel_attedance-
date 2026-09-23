export type Role = 'ADMIN' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  registerNumber?: string;
}

export interface Student {
  _id: string;
  studentId: string;
  registerNumber: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  year: string;
  sem?: string;
  hostelBlock: string;
  roomNumber: string;
  registeredFaceImage?: string;
  hasFaceEmbedding?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface AttendanceSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionName: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
}

export type LocationStatusType =
  | 'LOCATION_PENDING'
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'LOCATION_PERMISSION_DENIED'
  | 'LOCATION_ERROR';

export type VerificationStatusType = 'VERIFIED' | 'FAILED' | 'PENDING';
export type LivenessStatusType = 'LIVENESS_PENDING' | 'LIVENESS_PASSED' | 'LIVENESS_FAILED' | 'LIVENESS_TIMEOUT';

export type FinalAttendanceStatusType =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'INVALID_STUDENT'
  | 'FACE_VERIFICATION_FAILED'
  | 'LIVENESS_FAILED'
  | 'PRESENT'
  | 'ABSENT';

export interface AttendanceRecord {
  _id: string;
  sessionId: AttendanceSession | string;
  studentId: Student | string;
  registerNumber: string;
  date: string;
  timestamp: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationAccuracy?: number;
  distanceFromHostel?: number;
  locationStatus: LocationStatusType;
  faceVerificationStatus: VerificationStatusType;
  faceMatchScore?: number;
  livenessStatus: LivenessStatusType;
  gestureChallenge?: string;
  gestureResult?: string;
  finalStatus: FinalAttendanceStatusType;
}

export interface DashboardMetrics {
  activeSession: AttendanceSession | null;
  totalStudents: number;
  present: number;
  pending: number;
  absent: number;
  outsideGeofence: number;
  faceFailed: number;
  livenessFailed: number;
  attendancePercentage: number;
  timestamp?: string;
}

export interface ChallengeOption {
  id: string;
  instruction: string;
  description: string;
  type: 'FACE_HEAD' | 'FACE_EXPRESSION' | 'HAND_GESTURE';
}
