import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/common/Header';

export const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
