import React from 'react';
import type { StatItem } from '../../types';

export const StatCard: React.FC<StatItem> = ({ label, value, note, deltaUp, color, tintBg = '#eef1f4' }) => {
  return (
    <article className="relative overflow-hidden bg-white border border-[#e5e9ee] rounded-2xl p-5 min-h-[135px] shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
      {/* Decorative background circle */}
      <div
        className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ backgroundColor: tintBg }}
      />
      <div className="relative z-10">
        <div className="text-[#697586] font-bold text-xs">{label}</div>
        <div
          className="mt-4 text-[31px] font-extrabold tracking-tight leading-none"
          style={{ color: color || '#17202a' }}
        >
          {value}
        </div>
        <div className="text-[#697586] text-[11px] mt-2 flex items-center gap-1">
          {deltaUp && <span className="text-[#1a7f5a] font-bold">▲</span>}
          {note}
        </div>
      </div>
    </article>
  );
};
