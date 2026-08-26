import React, { useState, useEffect } from 'react';
import type { TestSuite, SuiteStatus } from '../../types';
import { StatusPill } from '../common/StatusPill';
import { CreateSuiteModal } from '../common/CreateSuiteModal';
import { SuiteDetailModal } from '../common/SuiteDetailModal';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { getTestSuites } from '../../services/testSuiteService';

interface SuitesViewProps {
  onNotify: (msg: string) => void;
}

export const SuitesView: React.FC<SuitesViewProps> = ({ onNotify }) => {
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [isCreateSuiteOpen, setIsCreateSuiteOpen] = useState(false);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSuites = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const res = await getTestSuites();
        if (isMounted) {
          const mappedSuites: TestSuite[] = (res.items || []).map((item, idx) => ({
            id: String(item.id),
            name: item.name,
            description: item.description || '',
            caseCount: item.testCaseCount ?? 0,
            passRate: '—',
            lastRun: '—',
            status: '활성' as SuiteStatus,
            icon: ['🛡️', '📊', '🔒', '⌘', '文'][idx % 5],
            tintBg: ['#e9f7f1', '#eef5fc', '#f3eeed', '#f3effa', '#fff7e8'][idx % 5],
          }));
          setSuites(mappedSuites);
        }
      } catch (_err) {
        if (isMounted) {
          setHasError(true);
          setSuites([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSuites();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5 flex items-center gap-2">
            <span>Test catalog</span>
            {isLoading && <Loader2 size={13} className="animate-spin text-[#1a7f5a]" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">테스트 스위트</h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            검증 목적별 테스트 케이스를 관리합니다. 카드를 클릭하여 소속 TestCase를 관리할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => setIsCreateSuiteOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17202a] text-white text-sm font-bold shadow-sm hover:bg-[#253545] transition-all"
        >
          <Plus size={16} /> 스위트 만들기
        </button>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#fff0ef] border border-[#fdd] text-[#bd3b35] text-xs font-medium">
          <AlertCircle size={14} />
          <span>테스트 스위트 목록을 불러오지 못했습니다. 네트워크 연결 또는 백엔드 상태를 확인해 주세요.</span>
        </div>
      )}

      {/* Suite Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suites.length > 0 ? (
          suites.map((suite) => (
            <article
              key={suite.id}
              onClick={() => setSelectedSuite(suite)}
              className="bg-white border border-[#e5e9ee] rounded-2xl p-5 shadow-[0_3px_15px_rgba(17,31,44,0.025)] hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center text-lg font-bold"
                    style={{ backgroundColor: suite.tintBg }}
                  >
                    {suite.icon}
                  </div>
                  <StatusPill status={suite.status} />
                </div>
                <h3 className="text-base font-bold text-[#17202a] group-hover:text-[#1a7f5a] mt-4 mb-2">
                  {suite.name}
                </h3>
                <p className="text-xs text-[#697586] leading-relaxed line-clamp-2">{suite.description}</p>
              </div>

              <div className="flex gap-4 pt-4 mt-4 border-t border-[#e5e9ee] text-[10px] text-[#697586]">
                <div>
                  <b className="block text-sm text-[#17202a]">{suite.caseCount}</b>
                  테스트 케이스
                </div>
                <div>
                  <b className="block text-sm text-[#17202a]">{suite.passRate}</b>
                  최근 통과율
                </div>
                <div>
                  <b className="block text-sm text-[#17202a]">{suite.lastRun}</b>
                  마지막 실행
                </div>
              </div>
            </article>
          ))
        ) : !isLoading && !hasError ? (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-[#dce1e6] bg-[#fafbfc] px-6 py-12 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#eef1f4] text-[#697586]">
              <Plus size={20} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17202a]">아직 테스트 스위트가 없습니다</h3>
            <p className="mt-1 text-xs text-[#697586]">첫 스위트를 만들어 정책 회귀 검증을 시작해 보세요.</p>
            <button
              type="button"
              onClick={() => setIsCreateSuiteOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17202a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#253545]"
            >
              <Plus size={14} /> 스위트 만들기
            </button>
          </div>
        ) : null}
      </div>

      {/* Suite Detail & TestCase Manager Modal */}
      <SuiteDetailModal
        suite={selectedSuite}
        onClose={() => setSelectedSuite(null)}
        onNotify={onNotify}
      />
      <CreateSuiteModal
        isOpen={isCreateSuiteOpen}
        onClose={() => setIsCreateSuiteOpen(false)}
      />
    </section>
  );
};
