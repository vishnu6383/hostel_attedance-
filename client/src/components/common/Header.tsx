import React from 'react';
import { Shield, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/30 group-hover:border-sky-500 transition-colors">
            <Shield className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white flex items-center gap-2">
              SmartHostel <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30 font-semibold">ATTENDANCE</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Multi-Factor Anti-Proxy Verification System</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-200">{user.name}</p>
                <p className="text-xs text-sky-400 font-semibold">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/admin/login');
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-colors border border-slate-700"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/admin/login')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
