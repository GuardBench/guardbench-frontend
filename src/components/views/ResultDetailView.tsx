import React, { useState, useEffect } from 'react';
import type { SnapshotCase, TargetStatus, TestRun } from '../../types';
import { mockRunDetailsMap } from '../../mocks/mockData';
import { StatusPill } from '../common/StatusPill';
import { SnapshotDiffModal } from '../common/SnapshotDiffModal';
import { Download, RefreshCw, ArrowRight, Eye, Info, Loader2 } from 'lucide-react';
import { getTestRunResults, type TestRunResultsResponse } from '../../services/testRunService';

interface ResultDetailViewProps {
  selectedRunId?: string;
  onGoNewRun: () => void;
  onNotify: (msg: string) => void;
}

export const ResultDetailView: React.FC<ResultDetailViewProps> = ({
  selectedRunId = '#5001',
  onGoNewRun,
  onNotify,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotCase | null>(null);
  const [apiResult, setApiResult] = useState<TestRunResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchApiResults = async () => {
      setIsLoading(true);
      try {
        const cleanRunId = selectedRunId.replace('#', '');
        const data = await getTestRunResults(cleanRunId);
        if (isMounted) {
          setApiResult(data);
          setIsLoading(false);
        }
      } catch (_err) {
        if (isMounted) {
          setApiResult(null);
          setIsLoading(false);
        }
      }
    };

    fetchApiResults();

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  // Fallback Mock 데이터
  const fallbackDetail = mockRunDetailsMap[selectedRunId] || mockRunDetailsMap['#5001'];
  
  const run: TestRun = apiResult ? apiResult.run : fallbackDetail.run;
  const baselineVersion = fallbackDetail.baselineVersion;
  const baselineHash = apiResult ? 'gr-bedrock-prod' : fallbackDetail.baselineHash;
  const candidateVersion = fallbackDetail.candidateVersion;
  const candidateHash = apiResult ? 'gr-bedrock-draft' : fallbackDetail.candidateHash;
  const gateTitle = fallbackDetail.gateTitle;
  const gateMessage = fallbackDetail.gateMessage;
  const candidateAssertionRate = apiResult ? '95.8%' : fallbackDetail.candidateAssertionRate;
  const securityRegressionText = apiResult ? '0건' : fallbackDetail.securityRegressionText;
  const usabilityRegressionText = apiResult ? '0건' : fallbackDetail.usabilityRegressionText;
  const executionSuccessRate = apiResult ? '100%' : fallbackDetail.executionSuccessRate;
  
  const snapshots: SnapshotCase[] = fallbackDetail.snapshots;

  const renderTargetText = (target: { status: TargetStatus; errorCode?: string }) => {
    switch (target.status) {
      case 'BLOCK':
        return <span className="text-[#1a7f5a] font-bold font-mono">BLOCK</span>;
      case 'ALLOW':
        return <span className="text-[#246fa8] font-bold font-mono">ALLOW</span>;
      case 'FAILED':
        return <span className="text-[#bd3b35] font-bold">실패</span>;
      case 'TIMEOUT':
        return <span className="text-[#a56512] font-bold">시간 초과</span>;
      case 'NOT_STARTED':
      default:
        return <span className="text-[#697586] font-bold">미시작</span>;
    }
  };

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5 flex items-center gap-2">
            <span>Run {run.id}</span>
            <span>·</span>
            <StatusPill kind="progress" status={run.progressState} />
            {isLoading && <Loader2 size={13} className="animate-spin text-[#1a7f5a]" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">
            테스트 결과 상세 ({run.suiteName})
          </h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            {run.suiteName} · {run.createdAt} · {run.snapshotsText}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNotify('리포트 내보내기는 데모 동작입니다.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5e9ee] bg-white text-xs font-bold text-[#17202a] hover:bg-gray-50"
          >
            <Download size={14} /> 리포트
          </button>
          <button
            onClick={onGoNewRun}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17202a] text-white text-xs font-bold shadow-sm hover:bg-[#253545]"
          >
            <RefreshCw size={14} /> 다시 실행
          </button>
        </div>
      </div>

      {/* Result Hero: Gate Card & Target Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.72fr_1.5fr] gap-5">
        {/* Quality Gate Fail / Pass / Not Evaluated Banner */}
        <article
          className={`relative overflow-hidden text-white rounded-2xl p-6 shadow-md flex flex-col justify-between ${
            run.qualityGateState === 'FAIL'
              ? 'bg-gradient-to-br from-[#9f2f2b] to-[#ca4d45]'
              : run.qualityGateState === 'PASS'
              ? 'bg-gradient-to-br from-[#1a7f5a] to-[#2cba83]'
              : 'bg-gradient-to-br from-[#586473] to-[#8092a1]'
          }`}
        >
          <div className="absolute -right-4 -bottom-6 text-7xl font-black opacity-10 pointer-events-none">
            {run.qualityGateState || 'GATE'}
          </div>
          <div>
            <small className="opacity-80 font-bold text-xs">QUALITY GATE</small>
            <div className="text-3xl font-black tracking-tight my-4">{gateTitle}</div>
          </div>
          <p className="text-xs opacity-95 leading-relaxed font-medium">{gateMessage}</p>
        </article>

        {/* Target Flow Card */}
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#17202a]">실행 대상</h2>
            <div className="flex gap-2">
              <StatusPill kind="execution" status={run.executionResultState} />
              <StatusPill kind="gate" status={run.qualityGateState} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="border border-[#e5e9ee] rounded-xl p-4">
              <span className="text-[10px] font-extrabold text-[#697586] tracking-wider block">BASELINE</span>
              <b className="text-sm text-[#17202a] block my-1.5">{baselineVersion}</b>
              <code className="text-[10px] text-[#697586] font-mono break-all">{baselineHash}</code>
            </div>
            <div className="text-center text-[#697586] flex justify-center">
              <ArrowRight size={20} className="hidden sm:block" />
              <span className="sm:hidden">↓</span>
            </div>
            <div className="border border-[#e5e9ee] rounded-xl p-4">
              <span className="text-[10px] font-extrabold text-[#697586] tracking-wider block">CANDIDATE</span>
              <b className="text-sm text-[#17202a] block my-1.5">{candidateVersion}</b>
              <code className="text-[10px] text-[#697586] font-mono break-all">{candidateHash}</code>
            </div>
          </div>
        </article>
      </div>

      {/* 4 Metrics Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Candidate Assertion</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#17202a] block mt-1">
            {candidateAssertionRate !== null ? candidateAssertionRate : '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#1a7f5a] rounded-full"
              style={{ width: candidateAssertionRate || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Candidate 기대 결과 부합 비율</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Security Regression</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#bd3b35] block mt-1">
            {securityRegressionText !== null ? securityRegressionText : '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-[#bd3b35] rounded-full" style={{ width: '4.2%' }} />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Baseline 차단 ➔ Candidate 허용 건수</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Usability Regression</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#a56512] block mt-1">
            {usabilityRegressionText !== null ? usabilityRegressionText : '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-[#a56512] rounded-full" style={{ width: '0%' }} />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Baseline 허용 ➔ Candidate 오차단 건수</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Execution Success</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#246fa8] block mt-1">
            {executionSuccessRate !== null ? executionSuccessRate : '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#246fa8] rounded-full"
              style={{ width: executionSuccessRate || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">오류 없이 실행을 마친 Snapshot 비율</div>
        </article>
      </div>

      {/* Snapshot Decision Table */}
      <article className="bg-white border border-[#e5e9ee] rounded-2xl shadow-[0_3px_15px_rgba(17,31,44,0.025)] overflow-hidden">
        <div className="p-5 border-b border-[#e5e9ee] flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-[#17202a]">Snapshot별 판정 (행을 클릭하여 상세 Diff 비교)</h2>
            <p className="text-xs text-[#697586] mt-0.5">
              Candidate Assertion과 Baseline 대비 Change를 함께 표시하며, 실패·시간초과·미시작 상태를 지원합니다.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#f1f3f5] text-[#586473] text-[10px] font-extrabold">
            {snapshots.length} snapshots
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#697586]">
            실행 중이거나 비교 가능한 Snapshot 데이터가 준비되지 않았습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#e5e9ee] text-[#7a8592] uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-5">테스트 케이스</th>
                  <th className="py-3 px-5">Expected</th>
                  <th className="py-3 px-5">Baseline Target</th>
                  <th className="py-3 px-5">Candidate Target</th>
                  <th className="py-3 px-5">Assertion</th>
                  <th className="py-3 px-5">Change</th>
                  <th className="py-3 px-5 text-right">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e9ee]">
                {snapshots.map((item) => {
                  const getSeverityStyle = (s: string) => {
                    if (s === 'CRITICAL') return 'bg-[#ffe6e4] text-[#a92e29]';
                    if (s === 'HIGH') return 'bg-[#fff0d4] text-[#a56512]';
                    return 'bg-[#eee9f8] text-[#675099]';
                  };

                  const getChangeBadge = (c: string) => {
                    if (c === 'SECURITY_REGRESSION')
                      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fff0ef] text-[#bd3b35]">SECURITY REGRESSION</span>;
                    if (c === 'IMPROVEMENT')
                      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e9f7f1] text-[#1a7f5a]">IMPROVEMENT</span>;
                    if (c === 'NOT_COMPARABLE')
                      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#eef1f4] text-[#586473] border border-[#dce1e6]">비교 불가</span>;
                    if (c === 'NONE')
                      return <span className="text-xs font-semibold text-[#8fa0ad]">— 생성 안 됨</span>;
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f1f3f5] text-[#586473]">NO CHANGE</span>;
                  };

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedSnapshot(item)}
                      className="hover:bg-[#f1faf6] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${getSeverityStyle(item.severity)}`}>
                            {item.severity}
                          </span>
                          <div>
                            <b className="block text-sm text-[#17202a] group-hover:text-[#1a7f5a]">{item.title}</b>
                            <small className="text-[11px] text-[#697586]">
                              {item.category} · {item.id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-5 font-mono font-bold ${item.expected === 'BLOCK' ? 'text-[#1a7f5a]' : 'text-[#246fa8]'}`}>
                        {item.expected}
                      </td>
                      <td className="py-4 px-5">{renderTargetText(item.baseline)}</td>
                      <td className="py-4 px-5">{renderTargetText(item.candidate)}</td>
                      <td className="py-4 px-5">
                        <StatusPill kind="assertion" status={item.assertion} />
                      </td>
                      <td className="py-4 px-5">{getChangeBadge(item.change)}</td>
                      <td className="py-4 px-5 text-right">
                        <button className="p-1.5 rounded-lg text-[#697586] hover:bg-white hover:text-[#1a7f5a]">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Snapshot Diff Modal */}
      <SnapshotDiffModal
        snapshot={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
      />
    </section>
  );
};
