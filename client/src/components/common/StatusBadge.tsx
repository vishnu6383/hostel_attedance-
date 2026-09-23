import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'PRESENT':
      case 'VERIFIED':
      case 'WITHIN_GEOFENCE':
      case 'LIVENESS_PASSED':
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'OUTSIDE_GEOFENCE':
      case 'FACE_VERIFICATION_FAILED':
      case 'LIVENESS_FAILED':
      case 'FAILED':
      case 'ABSENT':
      case 'LOCATION_ERROR':
      case 'CLOSED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'PENDING':
      case 'LOCATION_PENDING':
      case 'LIVENESS_PENDING':
      case 'SCHEDULED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
    >
      {formatText(status)}
    </span>
  );
};
