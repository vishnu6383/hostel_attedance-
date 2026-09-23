import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { initSocketIO } from './services/socketService';

const server = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocketIO(server, ENV.CLIENT_URL);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Smart Hostel Attendance Server running on port ${ENV.PORT}`);
      console.log(`🌐 Environment: ${ENV.NODE_ENV}`);
      console.log(`📍 Fixed Hostel Geofence Center: Lat ${ENV.HOSTEL_LATITUDE}, Lon ${ENV.HOSTEL_LONGITUDE}`);
      console.log(`📏 Geofence Radius: ${ENV.HOSTEL_GEOFENCE_RADIUS_METERS} meters (Strict Biometric Bounding-Box Active)`);
      console.log(`🕒 Server Timezone: ${ENV.TIMEZONE}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
