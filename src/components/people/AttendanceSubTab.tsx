import React from 'react';
import { AttendanceHistoryTable } from './AttendanceHistoryTable';

interface AttendanceSubTabProps {
  isCheckedIn: boolean;
  todayAttendance: any;
  attendanceHistory: any[];
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export const AttendanceSubTab: React.FC<AttendanceSubTabProps> = ({
  isCheckedIn,
  todayAttendance,
  attendanceHistory,
  onCheckIn,
  onCheckOut,
}) => {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">My Clock Status</p>
          <h4 className="text-lg font-bold text-slate-100 mt-1">
            {isCheckedIn ? 'Checked In' : 'Checked Out'}
          </h4>
          {todayAttendance?.checkInAt && (
            <p className="text-xs text-purple-400 mt-0.5">
              Since {new Date(todayAttendance.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={isCheckedIn ? onCheckOut : onCheckIn}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg cursor-pointer ${
            isCheckedIn
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
          }`}
        >
          {isCheckedIn ? 'Check Out' : 'Check In'}
        </button>
      </div>

      <div className="bg-slate-900/40 rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-slate-200">Attendance Log History</h3>
        </div>
        <div className="overflow-x-auto">
          <AttendanceHistoryTable attendanceHistory={attendanceHistory} />
        </div>
      </div>
    </div>
  );
};
