import React from 'react';
import type { ViewType } from '../../types';
import { Menu } from 'lucide-react';
import { LAYER_CLASS } from '../../config/layers';

interface TopbarProps {
  currentView: ViewType;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onHelpClick: () => void;
}

const titleMap: Record<ViewType, string> = {
  dashboard: '대시보드',
  suites: '테스트 스위트',
  'new-run': '새 테스트 실행',
  runs: '실행 이력',
  result: '결과 상세',
  regression: 'Regression 상세',
  architecture: '아키텍처',
};

export const Topbar: React.FC<TopbarProps> = ({ currentView, isMobileMenuOpen, onToggleMobileMenu, onHelpClick }) => {
  return (
    <header className={`sticky top-0 ${LAYER_CLASS.topbar} h-[72px] px-6 lg:px-8 bg-white/85 backdrop-blur-md border-b border-[#e5e9ee] flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="sidebar-drawer"
          className="lg:hidden p-2 rounded-lg border border-[#e5e9ee] hover:bg-gray-100 transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu size={18} />
        </button>
        <div className="text-sm text-[#697586]">
          GuardBench / <b className="text-[#17202a]">{titleMap[currentView]}</b>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#cfe6dd] bg-[#f1faf6] text-[#1a7f5a] text-xs font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1a7f5a]" />
          AP-NORTHEAST-2 · MVP
        </span>
        <button
          onClick={onHelpClick}
          className="px-3 py-1.5 rounded-lg border border-[#e5e9ee] text-xs font-bold text-[#17202a] hover:bg-gray-50 transition-colors"
        >
          문서
        </button>
        <div className="w-8 h-8 rounded-full bg-[#e7ebef] grid place-items-center text-xs font-extrabold text-[#17202a]">
          해인
        </div>
      </div>
    </header>
  );
};
