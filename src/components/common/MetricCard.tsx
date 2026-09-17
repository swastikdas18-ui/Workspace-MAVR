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
    border: 'hover:border-amber-600/30',
    iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(180,83,9,0.15)]',
    sparkline: '#D97706',
  },
  blue: {
    border: 'hover:border-blue-500/30',
    iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(37,99,235,0.15)]',
    sparkline: '#2563EB',
  },
  emerald: {
    border: 'hover:border-emerald-500/30',
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(5,150,105,0.15)]',
    sparkline: '#059669',
  },
  amber: {
    border: 'hover:border-amber-500/30',
    iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(217,119,6,0.15)]',
    sparkline: '#D97706',
  },
  rose: {
    border: 'hover:border-rose-500/30',
    iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(225,29,72,0.15)]',
    sparkline: '#E11D48',
  },
  slate: {
    border: 'hover:border-stone-400/30',
    iconBg: 'bg-stone-100 text-stone-700 border-stone-200',
    glow: 'group-hover:shadow-[0_4px_16px_-4px_rgba(120,113,108,0.15)]',
    sparkline: '#78716C',
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
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E8E3DA]">
        <span className="ui-caption font-bold uppercase tracking-wider text-stone-500">{label}</span>
        <div className={`p-2 rounded-[14px] border ${currentTheme.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Card Content */}
      <div className="py-3 flex items-baseline justify-between gap-4 flex-1">
        <span className="ui-h2">{value}</span>

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
      <div className="pt-3 border-t border-[#E8E3DA] flex items-center justify-between text-xs">
        {trend ? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[14px] ${
                trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : trend.direction === 'down'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
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
