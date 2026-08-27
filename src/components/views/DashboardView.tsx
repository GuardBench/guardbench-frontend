import React, { useEffect, useMemo, useState } from 'react';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StatusPill } from '../common/StatusPill';
import { getTestSuites } from '../../services/testSuiteService';
import { listTestRuns, type TestRunListItemRes } from '../../services/testRunService';

interface DashboardViewProps {
  onGoNewRun: () => void;
  onGoRuns: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onGoNewRun, onGoRuns }) => {
  const [runs, setRuns] = useState<TestRunListItemRes[]>([]);
  const [suiteTotal, setSuiteTotal] = useState(0);
  const [testCaseTotal, setTestCaseTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const [suiteResponse, runResponse] = await Promise.all([getTestSuites({ size: 100 }), listTestRuns({ size: 100 })]);
        if (!isMounted) return;
        setSuiteTotal(suiteResponse.page.totalElements);
        setTestCaseTotal(suiteResponse.items.reduce((sum, suite) => sum + suite.testCaseCount, 0));
        setRuns(runResponse.items);
      } catch (_error) {
        if (isMounted) {
          setHasError(true);
          setRuns([]);
          setSuiteTotal(0);
          setTestCaseTotal(0);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const stats = useMemo(() => [
    { label: '테스트 스위트', value: suiteTotal, note: '등록된 스위트', tintBg: '#e9f7f1' },
    { label: '테스트 케이스', value: testCaseTotal, note: '조회된 스위트의 활성 케이스 합계', tintBg: '#eef5fc' },
    { label: '실행 이력', value: runs.length, note: '최근 조회 실행', tintBg: '#f3effa' },
    { label: 'Gate 실패', value: runs.filter((run) => run.qualityGateStatus === 'FAIL').length, note: '최근 조회 실행 기준', color: '#bd3b35', tintBg: '#fff0ef' },
  ], [runs, suiteTotal, testCaseTotal]);
  const chartRuns = runs.slice(0, 7).reverse();

  return (
    <section className="space-y-6 animate-rise">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5 flex items-center gap-2"><span>Overview</span>{isLoading && <Loader2 size={13} className="animate-spin" />}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">정책 변경을 배포 전에 검증하세요.</h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">현재 API에서 조회한 TestSuite와 TestRun 정보를 표시합니다.</p>
        </div>
        <button onClick={onGoNewRun} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17202a] text-white text-sm font-bold shadow-sm hover:bg-[#253545] transition-all"><Plus size={16} /> 새 테스트 실행</button>
      </div>
      {hasError && <div className="flex items-center gap-2 rounded-xl border border-[#fdd] bg-[#fff0ef] px-4 py-3 text-xs font-medium text-[#bd3b35]"><AlertCircle size={14} /> 대시보드 데이터를 불러오지 못했습니다.</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.85fr] gap-5">
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between mb-6"><div><h2 className="text-base font-bold text-[#17202a]">최근 실행 결과</h2><p className="text-xs text-[#697586] mt-1">최근 조회된 실행의 Quality Gate 상태</p></div><span className="px-2.5 py-1 rounded-full bg-[#f1f3f5] text-[#586473] text-[10px] font-extrabold">최대 7건</span></div>
          {chartRuns.length > 0 ? <div className="h-48 flex items-end gap-3 sm:gap-4 border-b border-[#e5e9ee] px-2 pb-1">{chartRuns.map((run) => { const color = run.qualityGateStatus === 'PASS' ? 'bg-[#40ad83]' : run.qualityGateStatus === 'FAIL' ? 'bg-[#e3736d]' : 'bg-[#b7c1ca]'; return <div key={run.id} className="flex-1 flex items-end justify-center h-full relative"><div className={`w-full max-w-[28px] rounded-t-md ${color}`} style={{ height: '100%' }} title={`#${run.id}: ${run.qualityGateStatus ?? '평가 전'}`} /><span className="absolute -bottom-6 text-[10px] text-[#697586] whitespace-nowrap">#{run.id}</span></div>; })}</div> : <div className="h-48 grid place-items-center border-b border-[#e5e9ee] text-xs text-[#697586]">표시할 실행 이력이 없습니다.</div>}
          <div className="flex justify-center gap-6 mt-8 text-xs text-[#697586]"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#40ad83]" /> Gate 통과</span><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#e3736d]" /> Gate 실패</span><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#b7c1ca]" /> 평가 전·불가</span></div>
        </article>
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-bold text-[#17202a]">최근 활동</h2><p className="text-xs text-[#697586] mt-1">최근 조회된 TestRun</p></div><button onClick={onGoRuns} className="text-xs font-bold text-[#697586] hover:text-[#17202a]">전체 보기 →</button></div>
          <div className="divide-y divide-[#e5e9ee]">{runs.slice(0, 5).map((run) => <div key={run.id} className="py-3.5 flex items-center justify-between gap-3"><div><b className="block text-xs text-[#17202a]">실행 #{run.id}</b><small className="text-[11px] text-[#697586]">Suite #{run.testSuiteId} · {run.testCaseCount} snapshots</small></div><StatusPill kind={run.qualityGateStatus ? 'gate' : 'progress'} status={run.qualityGateStatus ?? run.status} /></div>)}{!isLoading && runs.length === 0 && <div className="py-8 text-center text-xs text-[#697586]">최근 실행 이력이 없습니다.</div>}</div>
        </article>
      </div>
    </section>
  );
};
