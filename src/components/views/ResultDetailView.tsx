import React, { useState, useEffect } from 'react';
import { StatusPill } from '../common/StatusPill';
import { SnapshotDiffModal } from '../common/SnapshotDiffModal';
import { Download, RefreshCw, ArrowRight, Eye, Info, Loader2, AlertCircle } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import {
  getTestRunDetail,
  getTestRunResults,
  type TestRunDetailRes,
  type TestRunResultListItemRes,
  type TestExecutionResultRes,
} from '../../services/testRunService';
import type { SnapshotCase, TargetStatus, QualityGateState } from '../../types';

interface ResultDetailViewProps {
  selectedRunId?: string;
  onGoNewRun: () => void;
  onNotify: (msg: string) => void;
}

/**
 * 실행 상태(TestExecutionResultStatus)와 결과(actualAction)를
 * 기존 UI의 TargetStatus로 변환하는 헬퍼.
 *
 * OpenAPI에서 이 두 가지는 독립 필드입니다:
 *  - status: SUCCEEDED | FAILED | TIMED_OUT | NOT_STARTED
 *  - actualAction: ALLOW | BLOCK | null
 *
 * UI에서는 하나의 셀로 표현하므로 SUCCEEDED이면 actualAction을,
 * 그 외에는 실행 상태를 표시합니다.
 */
function mapExecutionToTargetStatus(exec: TestExecutionResultRes): TargetStatus {
  if (exec.status === 'SUCCEEDED' && exec.actualAction) {
    return exec.actualAction; // 'ALLOW' | 'BLOCK'
  }
  if (exec.status === 'TIMED_OUT') return 'TIMEOUT';
  if (exec.status === 'FAILED') return 'FAILED';
  return 'NOT_STARTED';
}

/**
 * API 결과 아이템을 UI의 SnapshotCase 타입으로 변환하는 헬퍼.
 */
function mapResultToSnapshot(item: TestRunResultListItemRes): SnapshotCase {
  return {
    id: `#${item.snapshotId}`,
    title: item.name,
    category: item.category,
    severity: item.severity,
    expected: item.expectedAction,
    baseline: {
      status: mapExecutionToTargetStatus(item.baselineExecution),
      errorCode: item.baselineExecution.error?.code,
      errorMessage: item.baselineExecution.error?.message,
    },
    candidate: {
      status: mapExecutionToTargetStatus(item.candidateExecution),
      errorCode: item.candidateExecution.error?.code,
      errorMessage: item.candidateExecution.error?.message,
    },
    // null → 'NONE' (생성 안 됨)
    assertion: item.assertionStatus ?? 'NONE',
    change: item.changeType ?? (item.comparabilityStatus === 'NOT_COMPARABLE' ? 'NOT_COMPARABLE' : 'NONE'),
    inputPrompt: item.input,
  };
}

/** 숫자 비율(0~1)을 백분율 문자열로 변환 */
function rateToPercent(rate: number | undefined | null): string | null {
  if (rate == null) return null;
  return `${(rate * 100).toFixed(1)}%`;
}

export const ResultDetailView: React.FC<ResultDetailViewProps> = ({
  selectedRunId,
  onGoNewRun,
  onNotify,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotCase | null>(null);
  const [runDetail, setRunDetail] = useState<TestRunDetailRes | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotCase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFinished, setIsNotFinished] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [resultsError, setResultsError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!selectedRunId) return;
      setIsLoading(true);
      setIsNotFinished(false);
      setDetailError(null);
      setResultsError(null);

      const cleanId = selectedRunId;

      try {
        // 1단계: 먼저 상세 조회로 현재 상태 확인
        const detail = await getTestRunDetail(cleanId);
        if (!isMounted) return;
        setRunDetail(detail);

        // 2단계: FINISHED일 때만 결과 조회 시도
        if (detail.status === 'FINISHED') {
          try {
            const results = await getTestRunResults(cleanId);
            if (!isMounted) return;
            setSnapshots(results.items.map(mapResultToSnapshot));
          } catch (err) {
            if (!isMounted) return;
            // 409 TEST_RUN_NOT_FINISHED — race condition 대비
            if (err instanceof ApiError && err.code === 'TEST_RUN_NOT_FINISHED') {
              setIsNotFinished(true);
              setSnapshots([]);
            } else {
              setResultsError(err);
            }
          }
        } else {
          // 아직 FINISHED가 아님
          setIsNotFinished(true);
          setSnapshots([]);
        }
      } catch (error) {
        if (!isMounted) return;
        setDetailError(error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [selectedRunId, reloadToken]);

  // ── 표시용 값 계산 ──────────────────────────────────────────

  const runId = runDetail?.id ? `#${runDetail.id}` : selectedRunId || '—';
  const status = runDetail?.status ?? 'QUEUED';
  const testCaseCount = runDetail?.testCaseCount ?? 0;
  const progressPercent = runDetail?.progress?.percent ?? 0;

  // Quality Gate 상태 분리:
  // - qualityGate === null → 아직 평가 전 (진행 중)
  // - qualityGate.status === 'NOT_EVALUATED' → 끝났지만 평가 불가
  const qualityGate = runDetail?.qualityGate;
  const gateStatus: QualityGateState = qualityGate
    ? qualityGate.status
    : 'NOT_EVALUATED_BEFORE_FINISH';

  const metrics = qualityGate?.metrics;

  // Gate 제목과 메시지
  const gateTitle = (() => {
    if (!qualityGate) return '평가 진행 중';
    switch (qualityGate.status) {
      case 'PASS': return '배포 가능 (Gate 통과)';
      case 'FAIL': return '배포 차단';
      case 'NOT_EVALUATED': return '평가 불가';
      default: return '—';
    }
  })();

  const gateMessage = (() => {
    if (!qualityGate) return '실행이 아직 완료되지 않아 Quality Gate를 평가하기 전 상태입니다.';
    switch (qualityGate.status) {
      case 'PASS': return '모든 기준을 충족하여 Candidate 정책을 배포할 수 있습니다.';
      case 'FAIL': return '하나 이상의 Quality Gate 기준을 충족하지 못해 배포할 수 없습니다.';
      case 'NOT_EVALUATED': return '비교 가능한 실행 결과가 존재하지 않아 Quality Gate를 평가할 수 없습니다.';
      default: return '';
    }
  })();

  // Target 정보
  const baselineVersion = runDetail?.targets
    ? `Guardrail v${runDetail.targets.baseline.version}`
    : '—';
  const baselineHash = runDetail?.targets?.baseline.guardrailId ?? '—';
  const candidateVersion = runDetail?.targets
    ? `Draft → ${runDetail.targets.candidate.resolvedVersion ? `v${runDetail.targets.candidate.resolvedVersion}` : '준비 중'}`
    : '—';
  const candidateHash = runDetail?.targets?.candidate.guardrailId ?? '—';

  // Metric 표시값
  const candidateAssertionRate = rateToPercent(metrics?.candidateAssertionPassRate);
  const securityRegressionText = metrics
    ? `${metrics.securityRegressionCount}건 · ${rateToPercent(metrics.securityRegressionRate)}`
    : null;
  const usabilityRegressionText = metrics
    ? rateToPercent(metrics.usabilityRegressionRate)
    : null;
  const executionSuccessRate = rateToPercent(metrics?.testExecutionSuccessRate);

  // ── 렌더 헬퍼 ───────────────────────────────────────────────

  const renderTargetText = (target: { status: TargetStatus }) => {
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

  const executionOutcomeStatus = runDetail?.executionOutcome ?? null;

  if (!isLoading && detailError && !runDetail) {
    return (
      <section className="space-y-6 animate-rise">
        <div>
          <div className="mb-1.5 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">Run {selectedRunId || '—'}</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17202a] sm:text-3xl">테스트 결과 상세</h1>
        </div>
        <RequestErrorBanner
          error={detailError}
          fallbackMessage="테스트 실행 상세를 불러오지 못했습니다."
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5 flex items-center gap-2">
            <span>Run {runId}</span>
            <span>·</span>
            <StatusPill kind="progress" status={status} />
            {isLoading && <Loader2 size={13} className="animate-spin text-[#1a7f5a]" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">
            테스트 결과 상세
          </h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            Suite #{runDetail?.testSuiteId ?? '—'} · {runDetail?.createdAt ?? '—'} · {testCaseCount} snapshots
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5e9ee] bg-white text-xs font-bold text-[#17202a] hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
          <button
            onClick={() => onNotify('리포트 내보내기는 아직 지원하지 않습니다.')}
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

      {/* Not Finished Banner */}
      {isNotFinished && !isLoading && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#fff7e8] border border-[#f0ddb0] text-[#78501b] text-xs font-medium">
          <AlertCircle size={14} />
          <span>
            실행이 아직 완료되지 않았습니다 ({status}, {progressPercent.toFixed(0)}%).
            완료 후 결과를 확인할 수 있습니다.
          </span>
        </div>
      )}

      {detailError !== null && runDetail && !isLoading && (
        <RequestErrorBanner
          error={detailError}
          fallbackMessage="최신 테스트 실행 상세를 불러오지 못했습니다."
          stale
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      )}

      {resultsError !== null && !isLoading && (
        <RequestErrorBanner
          error={resultsError}
          fallbackMessage="Snapshot 결과를 불러오지 못했습니다."
          stale={snapshots.length > 0}
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      )}

      {/* Result Hero: Gate Card & Target Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.72fr_1.5fr] gap-5">
        {/* Quality Gate Banner */}
        <article
          className={`relative overflow-hidden text-white rounded-2xl p-6 shadow-md flex flex-col justify-between ${
            gateStatus === 'FAIL'
              ? 'bg-gradient-to-br from-[#9f2f2b] to-[#ca4d45]'
              : gateStatus === 'PASS'
              ? 'bg-gradient-to-br from-[#1a7f5a] to-[#2cba83]'
              : 'bg-gradient-to-br from-[#586473] to-[#8092a1]'
          }`}
        >
          <div className="absolute -right-4 -bottom-6 text-7xl font-black opacity-10 pointer-events-none">
            {gateStatus === 'NOT_EVALUATED_BEFORE_FINISH' ? 'PENDING' : gateStatus || 'GATE'}
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
              {executionOutcomeStatus && (
                <StatusPill kind="execution" status={executionOutcomeStatus} />
              )}
              <StatusPill kind="gate" status={gateStatus} />
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
            {candidateAssertionRate ?? '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#1a7f5a] rounded-full"
              style={{ width: candidateAssertionRate || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Candidate 기대 결과 부합 비율 (≥ 95%)</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Security Regression</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#bd3b35] block mt-1">
            {securityRegressionText ?? '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#bd3b35] rounded-full"
              style={{ width: rateToPercent(metrics?.securityRegressionRate) || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Baseline 차단 → Candidate 허용 (0건 필수)</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Usability Regression</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#a56512] block mt-1">
            {usabilityRegressionText ?? '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#a56512] rounded-full"
              style={{ width: rateToPercent(metrics?.usabilityRegressionRate) || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">Baseline 허용 → Candidate 오차단 비율 (≤ 5%)</div>
        </article>

        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-4 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#697586] font-bold">Execution Success</span>
            <Info size={13} className="text-[#8fa0ad] cursor-pointer" />
          </div>
          <b className="text-lg text-[#246fa8] block mt-1">
            {executionSuccessRate ?? '계산 불가'}
          </b>
          <div className="h-1.5 bg-[#edf0f2] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#246fa8] rounded-full"
              style={{ width: executionSuccessRate || '0%' }}
            />
          </div>
          <div className="text-[10px] text-[#697586] mt-2">오류 없이 실행을 마친 Snapshot 비율 (≥ 95%)</div>
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
            {isNotFinished
              ? '실행이 완료되면 Snapshot별 판정 결과가 표시됩니다.'
              : resultsError
              ? '결과 조회 오류를 해결한 뒤 다시 시도해 주세요.'
              : '비교 가능한 Snapshot 데이터가 없습니다.'}
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
                    if (c === 'USABILITY_REGRESSION')
                      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fff0d4] text-[#a56512]">USABILITY REGRESSION</span>;
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
