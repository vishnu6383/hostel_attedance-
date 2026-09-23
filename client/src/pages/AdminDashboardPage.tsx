import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  MapPin, 
  ScanFace, 
  Sparkles, 
  Percent, 
  Radio, 
  Search 
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { DashboardMetrics, AttendanceRecord } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/admin/reports/dashboard'),
        api.get('/admin/reports/logs'),
      ]);

      if (statsRes.data.success) {
        setMetrics(statsRes.data.stats);
      }
      if (logsRes.data.success) {
        setLogs(logsRes.data.logs);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Socket.IO Real-Time Connection Setup
    const socket = getSocket();
    socket.emit('join_admin_room');

    socket.on('dashboard_metrics_update', (updatedMetrics: DashboardMetrics) => {
      setMetrics(updatedMetrics);
    });

    socket.on('student_progress_update', (progressData: any) => {
      setLogs((prev) => [progressData, ...prev.filter(l => l.registerNumber !== progressData.registerNumber)]);
    });

    return () => {
      socket.off('dashboard_metrics_update');
      socket.off('student_progress_update');
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.registerNumber?.toLowerCase().includes(search.toLowerCase()) ||
      log.studentId?.name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PRESENT') return log.finalStatus === 'PRESENT';
    if (filterStatus === 'OUTSIDE_GEOFENCE') return log.finalStatus === 'OUTSIDE_GEOFENCE' || log.locationStatus === 'OUTSIDE_GEOFENCE';
    if (filterStatus === 'FACE_FAILED') return log.finalStatus === 'FACE_VERIFICATION_FAILED' || log.faceVerificationStatus === 'FAILED';
    if (filterStatus === 'LIVENESS_FAILED') return log.finalStatus === 'LIVENESS_FAILED' || log.livenessStatus === 'LIVENESS_FAILED';
    if (filterStatus === 'PENDING') return log.finalStatus === 'PENDING';
    return true;
  });

  if (loading) {
    return <LoadingSpinner message="Connecting to live Socket.IO dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Live Admin Dashboard</span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Socket.IO Live
            </span>
          </h1>
          <p className="text-xs text-slate-400">Real-time hostel student attendance verification tracking</p>
        </div>

        {metrics?.activeSession && (
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-400">Current Session: </span>
              <span className="font-bold text-sky-400">{metrics.activeSession.sessionName}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-slate-300 font-medium">
              {metrics.activeSession.startTime} - {metrics.activeSession.endTime}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{metrics?.totalStudents || 0}</p>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl space-y-1 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Present</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{metrics?.present || 0}</p>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl space-y-1 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400">{metrics?.pending || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Attendance Rate</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-400">{metrics?.attendancePercentage || 0}%</p>
        </div>

        <div className="bg-slate-900 border border-rose-500/20 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Outside Geofence</span>
            <MapPin className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-rose-400">{metrics?.outsideGeofence || 0}</p>
        </div>

        <div className="bg-slate-900 border border-rose-500/20 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Face Failed</span>
            <ScanFace className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-rose-400">{metrics?.faceFailed || 0}</p>
        </div>

        <div className="bg-slate-900 border border-rose-500/20 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Liveness Failed</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-rose-400">{metrics?.livenessFailed || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Absent</span>
            <UserX className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-400">{metrics?.absent || 0}</p>
        </div>
      </div>

      {/* Live Monitoring Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-white">Live Student Progression Stream</h2>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Reg Number or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 outline-none"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-1.5 px-3 outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="OUTSIDE_GEOFENCE">Outside Geofence</option>
              <option value="FACE_FAILED">Face Failed</option>
              <option value="LIVENESS_FAILED">Liveness Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Block / Room</th>
                <th className="py-3 px-4">Location Check</th>
                <th className="py-3 px-4">Face Check</th>
                <th className="py-3 px-4">Liveness Check</th>
                <th className="py-3 px-4">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No active student verification records match filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log._id || index} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-sky-400">{log.registerNumber}</td>
                    <td className="py-3 px-4 font-medium text-white">{log.studentId?.name || log.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.studentId?.hostelBlock || log.hostelBlock || 'Block A'} - {log.studentId?.roomNumber || log.roomNumber || '---'}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={log.locationStatus || 'PENDING'} /></td>
                    <td className="py-3 px-4"><StatusBadge status={log.faceVerificationStatus || 'PENDING'} /></td>
                    <td className="py-3 px-4"><StatusBadge status={log.livenessStatus || 'PENDING'} /></td>
                    <td className="py-3 px-4"><StatusBadge status={log.finalStatus || 'PENDING'} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
