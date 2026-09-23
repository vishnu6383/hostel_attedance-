# Smart Hostel Attendance Management System

A production-ready full-stack web application designed for college hostel attendance. It replaces traditional manual fingerprint punching with a multi-stage remote verification pipeline enforced on the backend:

**Attendance Time Check → Geolocation Check → Register Number Check → Face Verification → Randomized Gesture Liveness → PRESENT**

---

## 🎯 Configured System Parameters

- **Fixed Hostel Geofence Coordinates**:
  - **Latitude**: `10.868924665957088`
  - **Longitude**: `78.12895788178469`
  - **Geofence Radius**: `100 meters`
- **Database**:
  - **MongoDB URI**: `mongodb://localhost:27017/hostel_attendance`

---

## 🚀 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite (`host: true` enabled for mobile network access)
- **Styling**: Tailwind CSS (Dark theme design system)
- **Icons & Animation**: Lucide React, Canvas Confetti
- **Biometrics & Vision**: MediaPipe Vision & HTML5 Canvas Landmark Extractors
- **Real-Time Updates**: Socket.IO Client
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Database**: MongoDB & Mongoose ODM (`mongodb://localhost:27017/hostel_attendance`)
- **Real-Time Communication**: Socket.IO Server
- **Security & Validation**: JWT, bcrypt, Helmet, CORS, express-rate-limit, Zod

---

## 📱 Mobile Access & Deployment Guide

Mobile web browsers (iOS Safari, Android Chrome) enforce strict web security policies: **Geolocation (GPS)** and **Webcam Access** require **HTTPS** (or `localhost`).

### Option 1: Local Network Mobile Testing
1. Make sure your mobile phone and computer are connected to the same Wi-Fi network.
2. Find your computer's local IP address (e.g., `192.168.1.5`).
3. Start the backend (`npm run dev` in `server`) and frontend (`npm run dev` in `client`).
4. To test camera & GPS on mobile locally, run an HTTPS tunnel like ngrok:
   ```bash
   npx ngrok http 5173
   ```
5. Open the `https://xxxx.ngrok-free.app` link on your mobile phone browser.

### Option 2: Production Cloud Deployment (HTTPS Enabled automatically)
When deployed to standard cloud providers, SSL (`https://`) is enabled automatically, making camera and geolocation work out of the box on mobile phones:
- **Frontend**: Deploy `client/` to **Vercel** or **Netlify**.
- **Backend & Database**: Deploy `server/` to **Render**, **Railway**, or **AWS/DigitalOcean**, and use **MongoDB Atlas** or your hosted MongoDB instance.

---

## 🛠️ Quick Start Guide

### 1. Start Backend
```bash
cd server
npm install
npm run seed  # Seed DB with sample data & admin account
npm run dev   # Runs Express backend on http://localhost:5000
```

### 2. Start Frontend
```bash
cd client
npm install
npm run dev   # Runs Vite on http://localhost:5173 (Network: http://0.0.0.0:5173)
```

---

## 🔑 Default Credentials

### Admin Login
- **URL**: `http://localhost:5173/admin/login`
- **Email**: `admin@hostel.com`
- **Password**: `admin123`

### Sample Student Register Numbers
- `23ADS001` (Aravind Kumar, Block A, Room 101)
- `23ADS002` (Bhavna Sharma, Block A, Room 102)
- `23CSE015` (Chaitanya Reddy, Block A, Room 204)
- `23ECE042` (Deepak Verma, Block B, Room 108)
