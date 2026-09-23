import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, MapPin, Trash2, Clock, Info } from 'lucide-react';
import { api } from '../services/api';
import { AttendanceSession } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const format12Hour = (time24: string) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${mStr || '00'} ${ampm}`;
};

export const AdminSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('10:00');
  const [sessionName, setSessionName] = useState('Morning Hostel Attendance');
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/admin/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/admin/sessions', {
        date,
        startTime,
        endTime,
        sessionName,
      });

      if (res.data.success) {
        setShowModal(false);
        fetchSessions();
      } else {
        setError(res.data.message || 'Failed to schedule session');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error scheduling session.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance session?')) return;
    try {
      await api.delete(`/admin/sessions/${id}`);
      fetchSessions();
    } catch (err) {
      alert('Failed to delete session');
    }
  };

  const applyPreset = (title: string, start: string, end: string) => {
    setSessionName(title);
    setStartTime(start);
    setEndTime(end);
  };

  if (loading) {
    return <LoadingSpinner message="Loading attendance session schedules..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-sky-400" />
            <span>Attendance Scheduling</span>
          </h1>
          <p className="text-xs text-slate-400">Configure attendance window time schedules</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Session</span>
        </button>
      </div>

      {/* Non-editable Fixed Hostel Geofence Display Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Hostel Geofence: Configured & Enforced</h4>
            <p className="text-xs text-slate-400">Latitude, Longitude and Radius are fixed application configuration settings.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
          Fixed Geofence Active
        </span>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white">Attendance Sessions History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Session Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No attendance sessions scheduled yet. Click "Schedule New Session" to start.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{session.sessionName}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">{session.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-sky-400 space-y-0.5">
                      <div>{session.startTime} — {session.endTime}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        ({format12Hour(session.startTime)} — {format12Hour(session.endTime)})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSession(session._id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>Schedule Attendance Session</span>
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Presets</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('Morning Attendance', '09:30', '10:00')}
                  className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded-xl text-[11px] font-medium border border-slate-800 transition-colors"
                >
                  🌅 09:30 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Evening Roll Call', '20:00', '21:00')}
                  className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded-xl text-[11px] font-medium border border-slate-800 transition-colors"
                >
                  🌆 08:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Night Attendance', '21:30', '22:30')}
                  className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-purple-400 rounded-xl text-[11px] font-medium border border-slate-800 transition-colors"
                >
                  🌙 09:30 PM
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Session Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-400" />
                    <span>{format12Hour(startTime)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-400" />
                    <span>{format12Hour(endTime)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-sky-600/30"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
