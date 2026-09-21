import React from 'react';
import { CrmRecord, CrmStatus } from '../../../types';
import { UserAvatar } from '../../../components/common/UserAvatar';

export interface CrmKanbanColumnProps {
  stage: {
    id: CrmStatus;
    label: string;
    dotClass: string;
  };
  stages: Array<{ id: CrmStatus; label: string }>;
  records: CrmRecord[];
  users: Array<{ id: string; name: string; avatar?: string }>;
  onSelectLead: (lead: CrmRecord) => void;
  onStageShift: (leadId: string, nextStatus: CrmStatus) => void;
}

export const CrmKanbanColumn: React.FC<CrmKanbanColumnProps> = React.memo(({
  stage,
  stages,
  records,
  users,
  onSelectLead,
  onStageShift,
}) => {
  const stageValue = records.reduce((acc, curr) => acc + (curr.deal_value || 0), 0);

  return (
    <div className="flex flex-col rounded-[24px] bg-[#111827]/70 backdrop-blur-md border border-[#1E293B] p-4 shadow-sm min-w-[240px]">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
          <h3 className="ui-caption font-bold text-slate-200 tracking-tight">{stage.label}</h3>
          <span className="ui-mono px-2 py-0.5 rounded-full bg-[#1E293B] text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
            {records.length}
          </span>
        </div>
        <span className="ui-mono font-semibold text-emerald-400 text-xs">
          ₹{stageValue > 1000 ? `${(stageValue / 1000).toFixed(0)}k` : stageValue}
        </span>
      </div>

      {/* Cards Container */}
      <div className="space-y-3 flex-1 min-h-[300px]">
        {records.map((rec) => {
          const owner = users.find(u => u.id === rec.owner_id);
          return (
            <div
              key={rec.id}
              className="ui-card-interactive p-4 space-y-2.5 group flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1E293B]">
                <h4 
                  onClick={() => onSelectLead(rec)}
                  className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors cursor-pointer truncate"
                >
                  {rec.company}
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                  ₹{rec.deal_value.toLocaleString()}
                </span>
              </div>

              {/* Card Content */}
              <div className="space-y-1.5 flex-1">
                <p className="text-[11px] text-slate-300 font-medium">{rec.customer_name}</p>
                {rec.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 bg-[#0F172A] p-2 rounded-xl border border-[#1E293B] leading-relaxed">
                    {rec.notes}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  {owner && <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />}
                  <span className="truncate max-w-[80px] font-medium text-slate-300">{owner ? owner.name.split(' ')[0] : 'Unassigned'}</span>
                </div>

                <select
                  value={rec.status}
                  onChange={(e) => onStageShift(rec.id, e.target.value as CrmStatus)}
                  className="bg-[#111827] border border-[#1E293B] text-slate-300 text-[10px] rounded-lg px-2 py-1 outline-none focus:border-emerald-500/40 transition-colors cursor-pointer font-medium"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
CrmKanbanColumn.displayName = 'CrmKanbanColumn';
