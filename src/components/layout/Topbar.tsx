import React from 'react';
import type { ViewType } from '../../types';
import { Menu, UserRound } from 'lucide-react';
import { LAYER_CLASS } from '../../config/layers';

interface TopbarProps {
  currentView: ViewType;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

const titleMap: Record<ViewType, string> = {
  dashboard: '대시보드',
  suites: '테스트 스위트',
  'new-run': '새 테스트 실행',
  runs: '실행 이력',
  result: '결과 상세',
  regression: 'Regression 상세',
};

export const Topbar: React.FC<TopbarProps> = ({ currentView, isMobileMenuOpen, onToggleMobileMenu }) => {
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

      <div
        role="img"
        aria-label="사용자"
        className="grid h-8 w-8 place-items-center rounded-full bg-[#e7ebef] text-[#43515d]"
      >
        <UserRound size={18} aria-hidden="true" />
      </div>
    </header>
  );
};
