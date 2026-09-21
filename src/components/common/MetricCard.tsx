import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  subtitle?: string;
  sparklineData?: number[];
  color?: 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
}

const colorMap = {
  purple: {
    border: 'hover:border-[#B8FF3B]/50',
    iconBg: 'bg-[#B8FF3B]/10 text-[#B8FF3B] border-[#B8FF3B]/25',
    glow: 'group-hover:shadow-[0_4px_20px_-4px_rgba(184,255,59,0.25)]',
    sparkline: '#B8FF3B',
  },
  blue: {
    border: 'hover:border-sky-500/40',
    iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(14,165,233,0.3)]',
    sparkline: '#38BDF8',
  },
  emerald: {
    border: 'hover:border-[#B8FF3B]/50',
    iconBg: 'bg-[#B8FF3B]/10 text-[#B8FF3B] border-[#B8FF3B]/25',
    glow: 'group-hover:shadow-[0_4px_20px_-4px_rgba(184,255,59,0.25)]',
    sparkline: '#B8FF3B',
  },
  amber: {
    border: 'hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(245,158,11,0.3)]',
    sparkline: '#F59E0B',
  },
  rose: {
    border: 'hover:border-rose-500/40',
    iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(244,63,94,0.3)]',
    sparkline: '#F43F5E',
  },
  slate: {
    border: 'hover:border-slate-500/40',
    iconBg: 'bg-[#242936] text-slate-300 border-[#2A303D]',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(148,163,184,0.2)]',
    sparkline: '#94A3B8',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  subtitle,
  sparklineData,
  color = 'purple',
  onClick,
}) => {
  const currentTheme = colorMap[color];

  // Generate SVG path for mini sparkline if real data exists
  const hasSparkline = sparklineData && sparklineData.length > 1;
  const minVal = hasSparkline ? Math.min(...sparklineData, 0) : 0;
  const maxVal = hasSparkline ? Math.max(...sparklineData, 100) : 100;
  const width = 80;
  const height = 28;
  const points = hasSparkline
    ? sparklineData
        .map((val, i) => {
          const x = (i / (sparklineData.length - 1)) * width;
          const y = height - ((val - minVal) / (maxVal - minVal || 1)) * (height - 4) - 2;
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`group relative ui-card-interactive p-5 ${currentTheme.border} ${currentTheme.glow} cursor-pointer overflow-hidden flex flex-col justify-between`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#2A303D]">
        <span className="ui-caption font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`p-2 rounded-[12px] border ${currentTheme.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Card Content */}
      <div className="py-3 flex items-baseline justify-between gap-4 flex-1">
        <span className="ui-h2 text-white font-mono font-bold">{value}</span>

        {/* Mini Sparkline Chart */}
        {hasSparkline && (
          <div className="opacity-80 group-hover:opacity-100 transition-opacity">
            <svg width={width} height={height} className="overflow-visible">
              <polyline
                fill="none"
                stroke={currentTheme.sparkline}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Card Footer: Trend & Telemetry */}
      <div className="pt-3 border-t border-[#2A303D] flex items-center justify-between text-xs">
        {trend ? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[12px] ${
                trend.direction === 'up'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30'
                  : trend.direction === 'down'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-[#242936] text-slate-400 border border-[#2A303D]'
              }`}
            >
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
              {trend.value}
            </span>
            <span className="text-stone-500 text-[11px]">{trend.label || 'vs last month'}</span>
          </div>
        ) : (
          <span className="text-stone-400 text-[11px]">{subtitle || 'Live telemetry'}</span>
        )}
      </div>
    </motion.div>
  );
};
