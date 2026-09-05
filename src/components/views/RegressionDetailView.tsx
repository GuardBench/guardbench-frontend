import { ArrowLeft } from 'lucide-react';
import type { RegressionComparisonState } from '../../hooks/useRegressionComparison';
import { RegressionComparisonSection } from './RegressionComparisonSection';

interface RegressionDetailViewProps {
  runId: string;
  regression: RegressionComparisonState;
  onBack: () => void;
}

export function RegressionDetailView({ runId, regression, onBack }: RegressionDetailViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#4e5a68] hover:text-[#17202a]"
          >
            <ArrowLeft size={14} /> 결과 상세로 돌아가기
          </button>
          <h1 className="text-2xl font-black tracking-tight text-[#17202a]">Regression 상세</h1>
          <p className="mt-1 text-sm text-[#697586]">
            Current Run #{runId}과 비교 가능한 과거 Run의 저장 결과 변화를 분석합니다.
          </p>
        </div>
      </div>

      <RegressionComparisonSection runId={runId} regression={regression} />
    </div>
  );
}
