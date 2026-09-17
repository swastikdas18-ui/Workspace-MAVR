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
    <div className="flex flex-col rounded-[24px] bg-[#F5F2EB]/60 border border-[#E8E3DA] p-4 shadow-2xs min-w-[240px]">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
          <h3 className="ui-caption font-bold text-stone-900 tracking-tight">{stage.label}</h3>
          <span className="ui-mono px-2 py-0.5 rounded-full bg-white text-stone-600 border border-[#E8E3DA] font-semibold text-[10px]">
            {records.length}
          </span>
        </div>
        <span className="ui-mono font-semibold text-stone-600 text-xs">
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
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E8E3DA]">
                <h4 
                  onClick={() => onSelectLead(rec)}
                  className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors cursor-pointer truncate"
                >
                  {rec.company}
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">
                  ₹{rec.deal_value.toLocaleString()}
                </span>
              </div>

              {/* Card Content */}
              <div className="space-y-1.5 flex-1">
                <p className="text-[11px] text-stone-700 font-medium">{rec.customer_name}</p>
                {rec.notes && (
                  <p className="text-[11px] text-stone-600 line-clamp-2 bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E3DA] leading-relaxed">
                    {rec.notes}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2.5 border-t border-[#E8E3DA] flex items-center justify-between text-[10px] text-stone-500">
                <div className="flex items-center gap-1.5">
                  {owner && <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />}
                  <span className="truncate max-w-[80px] font-medium">{owner ? owner.name.split(' ')[0] : 'Unassigned'}</span>
                </div>

                <select
                  value={rec.status}
                  onChange={(e) => onStageShift(rec.id, e.target.value as CrmStatus)}
                  className="bg-[#FAF8F5] border border-[#E8E3DA] text-stone-700 text-[10px] rounded-lg px-2 py-1 outline-none focus:border-amber-600 transition-colors cursor-pointer font-medium"
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
