import React, { useEffect, useId, useState } from 'react';
import { getTestRunResultDetail, type TestRunResultDetailRes } from '../../services/testRunService';
import { presentApplicationResponse } from './applicationResponsePresentation';

interface ApplicationResponseEvidenceProps {
  testRunId: number | string;
  testCaseSnapshotId: number | string;
}

export const ApplicationResponseEvidence: React.FC<ApplicationResponseEvidenceProps> = ({
  testRunId,
  testCaseSnapshotId,
}) => {
  const [detail, setDetail] = useState<TestRunResultDetailRes | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const contentId = useId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    setExpanded(false);

    getTestRunResultDetail(testRunId, testCaseSnapshotId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken, testCaseSnapshotId, testRunId]);

  const presentation = presentApplicationResponse(detail?.applicationResponse ?? null);

  return <section className="mt-5 rounded-xl border border-[#dfe5e9] bg-white p-4" aria-labelledby={`${contentId}-title`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 id={`${contentId}-title`} className="text-sm font-bold text-[#17202a]">대상 애플리케이션 응답</h3>
        <p className="mt-1 text-[11px] text-[#697586]">실행 당시 저장된 응답 원문입니다.</p>
      </div>
      {!loading && !error && presentation.available && <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
        className="rounded-lg border border-[#dfe5e9] bg-white px-3 py-2 text-xs font-bold text-[#43515d] hover:border-[#b8c2ca] hover:bg-[#f8f9fa]"
      >
        {expanded ? '응답 내용 숨기기' : '응답 내용 보기'}
      </button>}
    </div>

    {loading && <p className="mt-3 text-xs text-[#697586]">응답 정보를 불러오는 중입니다.</p>}

    {!loading && error && <div className="mt-3 rounded-lg border border-[#f0ddb0] bg-[#fff7e8] p-3 text-xs text-[#78501b]">
      <p>대상 애플리케이션 응답을 불러오지 못했습니다.</p>
      <button
        type="button"
        onClick={() => setReloadToken((value) => value + 1)}
        className="mt-2 font-bold underline"
      >다시 시도</button>
    </div>}

    {!loading && !error && !presentation.available && <p className="mt-3 text-xs text-[#697586]">이 실행에는 저장된 대상 애플리케이션 응답이 없습니다.</p>}

    {!loading && !error && presentation.available && <>
      <p className="mt-3 text-[11px] text-[#8a570f]">민감정보 또는 유해한 내용이 포함될 수 있습니다.</p>
      {expanded && <pre
        id={contentId}
        className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#f6f8f9] p-3 font-sans text-xs leading-5 text-[#17202a]"
      >{presentation.displayText}</pre>}
    </>}
  </section>;
};
