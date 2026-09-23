import { ENV } from '../config/env';

export type LocationStatusType =
  | 'LOCATION_PENDING'
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'LOCATION_PERMISSION_DENIED'
  | 'LOCATION_ERROR'
  | 'LOW_GPS_ACCURACY';

export interface GeofenceResult {
  isWithin: boolean;
  distanceMeters: number;
  allowedRadius: number;
  hostelLat: number;
  hostelLon: number;
  studentLat: number;
  studentLon: number;
  accuracy: number;
  status: LocationStatusType;
  message: string;
}

export class GeofenceService {
  /**
   * Calculates Haversine distance in meters between two lat/lon points on Earth.
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
  }

  /**
   * Evaluates student location against the FIXED hostel geofence.
   */
  public static verifyLocation(
    studentLat: number,
    studentLon: number,
    accuracy: number = 0,
    testModeOverride: boolean = false
  ): GeofenceResult {
    const hostelLat = ENV.HOSTEL_LATITUDE;
    const hostelLon = ENV.HOSTEL_LONGITUDE;
    const allowedRadius = ENV.HOSTEL_GEOFENCE_RADIUS_METERS;

    // Calculate actual physical Haversine distance
    const rawDistance = this.calculateHaversineDistance(studentLat, studentLon, hostelLat, hostelLon);

    // If dev test mode checkbox is checked or ENV.TEST_MODE is true, allow verification simulation
    if (testModeOverride || ENV.TEST_MODE) {
      return {
        isWithin: true,
        distanceMeters: rawDistance,
        allowedRadius,
        hostelLat,
        hostelLon,
        studentLat,
        studentLon,
        accuracy,
        status: 'WITHIN_GEOFENCE',
        message: `Location verified (${ENV.TEST_MODE ? 'ENV Test Mode' : 'Dev Test Mode'} Active — Physical distance: ${rawDistance}m).`,
      };
    }

    // Poor GPS Accuracy check (e.g. > 100 meters)
    if (accuracy > 100) {
      return {
        isWithin: false,
        distanceMeters: rawDistance,
        allowedRadius,
        hostelLat,
        hostelLon,
        studentLat,
        studentLon,
        accuracy,
        status: 'LOW_GPS_ACCURACY',
        message: 'GPS accuracy is too low. Please enable precise location and try again.',
      };
    }

    // Physical distance check against allowed radius
    const isWithin = rawDistance <= allowedRadius;

    return {
      isWithin,
      distanceMeters: rawDistance,
      allowedRadius,
      hostelLat,
      hostelLon,
      studentLat,
      studentLon,
      accuracy,
      status: isWithin ? 'WITHIN_GEOFENCE' : 'OUTSIDE_GEOFENCE',
      message: isWithin
        ? `Location verified successfully within hostel geofence (${rawDistance}m from center).`
        : `Attendance unavailable. You are ${Math.round(rawDistance - allowedRadius)} meters outside the hostel attendance area.`,
    };
  }
}
