import React, { useEffect } from 'react';
import type { ViewType } from '../../types';
import { LayoutDashboard, Layers, PlayCircle, History, CheckCircle2, Network, Shield, X } from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={18} /> },
    { view: 'suites', label: '테스트 스위트', icon: <Layers size={18} /> },
    { view: 'new-run', label: '새 테스트 실행', icon: <PlayCircle size={18} /> },
    { view: 'runs', label: '실행 이력', icon: <History size={18} /> },
    { view: 'result', label: '결과 상세', icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-drawer"
        className={`fixed lg:sticky top-0 left-0 h-screen w-[244px] z-50 p-6 flex flex-col bg-gradient-to-b from-[#101923] to-[#0c141c] text-[#dce5ec] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between pb-7 px-2">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#2cba83] text-[#071b14] grid place-items-center font-black shadow-[0_0_0_5px_rgba(44,186,131,0.10)]">
              <Shield size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <strong className="block text-white tracking-tight text-[17px] leading-tight">GuardBench</strong>
              <span className="text-[#8092a1] text-[11px]">Policy regression testing</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#8092a1] hover:text-white hover:bg-[#192532]"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-[#647686] text-[10px] font-extrabold tracking-wider px-3 mb-2">WORKSPACE</div>
        <nav className="space-y-1" aria-label="주 메뉴">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onSelectView(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#20303c] text-white shadow-[inset_3px_0_#2cba83]'
                    : 'text-[#9caebb] hover:bg-[#192532] hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-[#2cba83]' : 'text-[#697586]'}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="text-[#647686] text-[10px] font-extrabold tracking-wider px-3 mt-6 mb-2">SYSTEM</div>
        <nav className="space-y-1">
          <button
            onClick={() => onSelectView('architecture')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors ${
              currentView === 'architecture'
                ? 'bg-[#20303c] text-white shadow-[inset_3px_0_#2cba83]'
                : 'text-[#9caebb] hover:bg-[#192532] hover:text-white'
            }`}
          >
            <span className={currentView === 'architecture' ? 'text-[#2cba83]' : 'text-[#697586]'}>
              <Network size={18} />
            </span>
            아키텍처
          </button>
        </nav>

        <div className="mt-auto border border-[#253540] rounded-xl p-3.5 text-[#8fa0ad] text-[11px] leading-relaxed">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#8092a1]" />
            <b className="text-[#dce5ec]">시스템 상태 API 미제공</b>
          </div>
          <div>실행·목록 요청의 개별 응답을 확인하세요.</div>
        </div>
      </aside>
    </>
  );
};
