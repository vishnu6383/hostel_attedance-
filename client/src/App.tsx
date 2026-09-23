import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { StudentAttendancePage } from './pages/StudentAttendancePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminSessionsPage } from './pages/AdminSessionsPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminAttendanceHistoryPage } from './pages/AdminAttendanceHistoryPage';
import { FaceDebugPage } from './pages/FaceDebugPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Student Guided Verification Flow */}
          <Route element={<StudentLayout />}>
            <Route path="/" element={<StudentAttendancePage />} />
            <Route path="/attendance" element={<StudentAttendancePage />} />
            <Route path="/debug-face" element={<FaceDebugPage />} />
          </Route>

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Portal Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="sessions" element={<AdminSessionsPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="logs" element={<AdminAttendanceHistoryPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
