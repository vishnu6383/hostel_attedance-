/**
 * Time utility functions for robust 24-hour time normalization,
 * minute calculations, and session status evaluation.
 */

/**
 * Normalizes any time string (e.g., "9:30", "09:30", "9:30 PM", "21:30") into standard "HH:mm" (24-hour padded format).
 */
export function normalizeTimeStr(timeInput: string): string {
  if (!timeInput) return '00:00';
  const trimmed = timeInput.trim();

  // Match 12-hour format with optional AM/PM (e.g., "9:30 AM", "09:30 PM")
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3] ? match12[3].toUpperCase() : null;

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Fallback for simple "H:mm" or "HH:mm"
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Converts a time string ("HH:mm") into total minutes from midnight for numeric comparison.
 */
export function timeToMinutes(timeInput: string): number {
  const norm = normalizeTimeStr(timeInput);
  const [h, m] = norm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Computes session status based on current India date and time vs session schedule.
 */
export function computeSessionStatus(
  sessionDate: string,
  startTimeStr: string,
  endTimeStr: string,
  currentDateStr: string,
  currentTimeStr: string
): 'SCHEDULED' | 'ACTIVE' | 'CLOSED' {
  if (sessionDate < currentDateStr) {
    return 'CLOSED';
  }
  if (sessionDate > currentDateStr) {
    return 'SCHEDULED';
  }

  // Same date -> compare minutes
  const currentMins = timeToMinutes(currentTimeStr);
  const startMins = timeToMinutes(startTimeStr);
  const endMins = timeToMinutes(endTimeStr);

  if (currentMins < startMins) {
    return 'SCHEDULED';
  } else if (currentMins >= startMins && currentMins <= endMins) {
    return 'ACTIVE';
  } else {
    return 'CLOSED';
  }
}
