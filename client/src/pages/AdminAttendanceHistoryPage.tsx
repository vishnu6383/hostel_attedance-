import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Search, Calendar, Filter } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminAttendanceHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/reports/logs', {
        params: {
          search,
          status: statusFilter,
          date: dateFilter,
        },
      });
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, statusFilter, dateFilter]);

  const handleExportCSV = () => {
    const token = localStorage.getItem('hostel_jwt_token');
    const url = `/api/admin/reports/export-csv?date=${dateFilter}`;

    // Trigger CSV download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `hostel_attendance_${dateFilter || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to export CSV report.'));
  };

  if (loading) {
    return <LoadingSpinner message="Loading attendance history..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-400" />
            <span>Attendance History & CSV Reporting</span>
          </h1>
          <p className="text-xs text-slate-400">View detailed multi-verification audit logs and export CSV reports</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Register Number or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500"
          />
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 pl-9 pr-3 outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 px-3 outline-none focus:border-sky-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="OUTSIDE_GEOFENCE">Outside Geofence</option>
          <option value="FACE_FAILED">Face Failed</option>
          <option value="LIVENESS_FAILED">Liveness Failed</option>
        </select>
      </div>

      {/* Attendance History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Hostel Block & Room</th>
                <th className="py-3 px-4">Session Date</th>
                <th className="py-3 px-4">Location Check</th>
                <th className="py-3 px-4">Face Check</th>
                <th className="py-3 px-4">Liveness Check</th>
                <th className="py-3 px-4">Final Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No attendance records found for selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-sky-400">{log.registerNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{log.studentId?.name || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {log.studentId?.hostelBlock || 'Block A'} - {log.studentId?.roomNumber || '---'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{log.date}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={log.locationStatus} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={log.faceVerificationStatus} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={log.livenessStatus} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={log.finalStatus} /></td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                    </td>
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
