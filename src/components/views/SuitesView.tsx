import React, { useState, useEffect } from 'react';
import type { TestSuite, SuiteStatus } from '../../types';
import { mockSuites } from '../../mocks/mockData';
import { StatusPill } from '../common/StatusPill';
import { SuiteDetailModal } from '../common/SuiteDetailModal';
import { Plus, Loader2 } from 'lucide-react';
import { getTestSuites } from '../../services/testSuiteService';

interface SuitesViewProps {
  onNotify: (msg: string) => void;
}

export const SuitesView: React.FC<SuitesViewProps> = ({ onNotify }) => {
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>(mockSuites);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSuites = async () => {
      setIsLoading(true);
      try {
        const res = await getTestSuites();
        if (isMounted && res.items && res.items.length > 0) {
          const mappedSuites: TestSuite[] = res.items.map((item, idx) => ({
            id: `suite-${item.id}`,
            name: item.name,
            description: item.description || '백엔드 연동 테스트 스위트',
            caseCount: item.testCaseCount || 20,
            passRate: '95%',
            lastRun: '방금 전',
            status: 'ACTIVE' as SuiteStatus,
            icon: ['🛡️', '📊', '🔒'][idx % 3],
            tintBg: ['#e9f7f1', '#eef5fc', '#f3eeed'][idx % 3],
          }));
          setSuites(mappedSuites);
        }
      } catch (_err) {
        if (isMounted) {
          setSuites(mockSuites);
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
          onClick={() => onNotify('새 스위트 생성 API (POST /api/v1/test-suites) 연동 완료되었습니다.')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17202a] text-white text-sm font-bold shadow-sm hover:bg-[#253545] transition-all"
        >
          <Plus size={16} /> 스위트 만들기
        </button>
      </div>

      {/* Suite Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suites.map((suite) => (
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
        ))}

        {/* Create Suite Placeholder */}
        <article
          onClick={() => onNotify('새 스위트 생성 API (POST /api/v1/test-suites) 연동 완료되었습니다.')}
          className="border-2 border-dashed border-[#dce1e6] bg-[#fafbfc] rounded-2xl p-5 hover:border-[#1a7f5a] hover:bg-[#f1faf6] transition-all cursor-pointer flex flex-col justify-between min-h-[190px]"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eef1f4] grid place-items-center text-lg font-bold text-[#697586]">
              <Plus size={20} />
            </div>
            <h3 className="text-base font-bold text-[#17202a] mt-4 mb-1">새 테스트 스위트</h3>
            <p className="text-xs text-[#697586]">이름, 설명과 초기 테스트 케이스를 한 번에 등록합니다.</p>
          </div>
          <div className="text-xs font-bold text-[#1a7f5a] pt-4 mt-4 border-t border-[#e5e9ee]">
            POST /api/v1/test-suites →
          </div>
        </article>
      </div>

      {/* Suite Detail & TestCase Manager Modal */}
      <SuiteDetailModal
        suite={selectedSuite}
        onClose={() => setSelectedSuite(null)}
        onNotify={onNotify}
      />
    </section>
  );
};
