import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Verification Notice',
  message,
  onRetry,
}) => {
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-rose-200 text-sm">{title}</h4>
          <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-colors shadow-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
