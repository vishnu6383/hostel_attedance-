import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
};
