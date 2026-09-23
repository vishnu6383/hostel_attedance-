import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Users, 
  FileSpreadsheet, 
  ShieldCheck, 
  MapPin 
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'Live Monitoring', icon: LayoutDashboard },
    { to: '/admin/sessions', label: 'Attendance Sessions', icon: CalendarClock },
    { to: '/admin/students', label: 'Student Management', icon: Users },
    { to: '/admin/logs', label: 'Attendance History & CSV', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            ADMIN CONTROL PANEL
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-600/10 text-sky-400 border border-sky-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Fixed Hostel Geofence Status Badge (Not editable via UI as mandated) */}
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 font-medium text-xs mb-1">
            <MapPin className="w-4 h-4" />
            <span>Hostel Geofence Status</span>
          </div>
          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Configured & Active
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Lat/Lon loaded from backend application configuration.
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-sky-500" />
        <span>System Version 1.0.0 (Secure)</span>
      </div>
    </aside>
  );
};
