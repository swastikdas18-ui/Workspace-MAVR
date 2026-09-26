import React from 'react';

export const AttendanceHistoryTable = ({ attendanceHistory }) => {
  return (
    <table className="w-full text-left text-xs text-slate-300">
      <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 uppercase text-[10px] tracking-wider">
        <tr>
          <th className="p-3.5">Date</th>
          <th className="p-3.5">Staff Member</th>
          <th className="p-3.5">Check In</th>
          <th className="p-3.5">Check Out</th>
          <th className="p-3.5">Worked Duration</th>
          <th className="p-3.5">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {attendanceHistory.map((a) => (
          <tr key={a.id} className="hover:bg-white/[0.02] transition">
            <td className="p-3.5 font-medium text-slate-100">{a.date}</td>
            <td className="p-3.5">{a.user?.name || 'Staff Member'}</td>
            <td className="p-3.5 text-slate-300">
              {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>
            <td className="p-3.5 text-slate-300">
              {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>
            <td className="p-3.5 text-slate-400">
              {a.workedHours > 0 ? `${Math.floor(a.workedHours / 60)}h ${a.workedHours % 60}m` : 'In Progress'}
            </td>
            <td className="p-3.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  a.status === 'present'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : a.status === 'late'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {a.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};