import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Plus, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { createTestSuite } from '../../services/testSuiteService';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { LAYER_CLASS } from '../../config/layers';

interface CreateSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type InitialCase = {
  name: string;
  input: string;
  category: string;
  expectedAction: 'ALLOW' | 'BLOCK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
};

const emptyInitialCase: InitialCase = {
  name: '',
  input: '',
  category: '',
  expectedAction: 'BLOCK',
  severity: 'HIGH',
};

export const CreateSuiteModal: React.FC<CreateSuiteModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isInitialCaseOpen, setIsInitialCaseOpen] = useState(false);
  const [initialCase, setInitialCase] = useState<InitialCase>(emptyInitialCase);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setName('');
    setDescription('');
    setIsInitialCaseOpen(false);
    setInitialCase(emptyInitialCase);
    setValidationMessage(null);
    onClose();
  }, [onClose]);

  const dialogRef = useDialogFocus({ isOpen, onClose: close, initialFocusRef: nameInputRef });

  if (!isOpen) return null;

  const submit = async () => {
    if (!name.trim()) {
      setValidationMessage('테스트 스위트 이름을 입력해 주세요.');
      return;
    }

    if (isInitialCaseOpen && (!initialCase.name.trim() || !initialCase.input.trim() || !initialCase.category.trim())) {
      setValidationMessage('초기 테스트 케이스의 이름, 입력값, 카테고리를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setValidationMessage(null);
    try {
      await createTestSuite({
        name: name.trim(),
        description: description.trim() || null,
        testCases: isInitialCaseOpen
          ? [{
              name: initialCase.name.trim(),
              input: initialCase.input.trim(),
              category: initialCase.category.trim(),
              expectedAction: initialCase.expectedAction,
              severity: initialCase.severity,
            }]
          : undefined,
      });
      onCreated();
      close();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.length) {
        setValidationMessage(`[${error.code}] ${error.fieldErrors.map((fieldError) => fieldError.message).join(' ')}`);
      } else if (error instanceof ApiError) {
        setValidationMessage(`[${error.code}] ${error.message}`);
      } else {
        setValidationMessage(error instanceof Error ? error.message : '테스트 스위트를 생성하지 못했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 ${LAYER_CLASS.dialog} flex items-start justify-center overflow-y-auto px-4 py-[5vh]`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" aria-hidden="true" />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-suite-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#e5e9ee] bg-white shadow-2xl animate-rise"
      >
        <header className="flex items-start justify-between border-b border-[#e5e9ee] bg-[#fafbfb] p-6">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">Test catalog</p>
            <h2 id="create-suite-title" className="text-xl font-extrabold text-[#17202a]">
              새 테스트 스위트 만들기
            </h2>
            <p className="mt-1 text-xs text-[#697586]">검증 목적을 등록하고, 필요하면 초기 테스트 케이스를 함께 추가합니다.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="새 테스트 스위트 생성 창 닫기"
            className="rounded-xl p-2 text-[#697586] transition-colors hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
          <div className="shrink-0 space-y-4">
            <div>
              <label htmlFor="suite-name" className="mb-1 block text-xs font-bold text-[#4e5a68]">
                스위트 이름 <span className="text-[#bd3b35]">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="suite-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setValidationMessage(null);
                }}
                placeholder="예: Customer Support Safety"
                className="w-full rounded-lg border border-[#dce1e6] bg-white p-2.5 text-sm outline-none focus:border-[#1a7f5a]"
              />
            </div>
            <div>
              <label htmlFor="suite-description" className="mb-1 block text-xs font-bold text-[#4e5a68]">
                설명 <span className="font-normal text-[#697586]">(선택)</span>
              </label>
              <textarea
                id="suite-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="이 스위트에서 검증할 정책과 목적을 설명해 주세요."
                className="w-full resize-y rounded-lg border border-[#dce1e6] bg-white p-2.5 text-sm outline-none focus:border-[#1a7f5a]"
              />
            </div>
          </div>

          <section className={`rounded-xl border border-[#e5e9ee] bg-[#fafcfb] p-4 ${isInitialCaseOpen ? 'min-h-0 flex-1 overflow-y-auto' : 'shrink-0'}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#17202a]">초기 테스트 케이스 <span className="font-medium text-[#697586]">(선택)</span></h3>
                <p className="mt-0.5 text-xs text-[#697586]">생략하면 빈 Suite가 생성되며 TestCase는 나중에 추가할 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInitialCaseOpen((previous) => !previous)}
                aria-expanded={isInitialCaseOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce1e6] bg-white px-3 py-2 text-xs font-bold text-[#253545] hover:bg-[#eef1f4]"
              >
                <Plus size={14} /> {isInitialCaseOpen ? '케이스 닫기' : '케이스 추가'}
              </button>
            </div>

            {isInitialCaseOpen && (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e5e9ee] pt-4 text-xs sm:grid-cols-2">
                <div>
                  <label htmlFor="initial-case-name" className="mb-1 block font-bold text-[#4e5a68]">케이스 이름 *</label>
                  <input
                    id="initial-case-name"
                    type="text"
                    value={initialCase.name}
                    onChange={(event) => setInitialCase({ ...initialCase, name: event.target.value })}
                    placeholder="예: 개인정보 탈취 요청 차단"
                    className="w-full rounded-lg border border-[#dce1e6] bg-white p-2.5 outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div>
                  <label htmlFor="initial-case-category" className="mb-1 block font-bold text-[#4e5a68]">카테고리</label>
                  <input
                    id="initial-case-category"
                    type="text"
                    value={initialCase.category}
                    onChange={(event) => setInitialCase({ ...initialCase, category: event.target.value })}
                    placeholder="예: PII"
                    className="w-full rounded-lg border border-[#dce1e6] bg-white p-2.5 outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="initial-case-input" className="mb-1 block font-bold text-[#4e5a68]">입력 프롬프트 *</label>
                  <textarea
                    id="initial-case-input"
                    rows={3}
                    value={initialCase.input}
                    onChange={(event) => setInitialCase({ ...initialCase, input: event.target.value })}
                    placeholder="LLM에 전달할 입력 텍스트"
                    className="w-full resize-y rounded-lg border border-[#dce1e6] bg-white p-2.5 outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div>
                  <label htmlFor="initial-case-expected-action" className="mb-1 block font-bold text-[#4e5a68]">Expected Action</label>
                  <select
                    id="initial-case-expected-action"
                    value={initialCase.expectedAction}
                    onChange={(event) => setInitialCase({ ...initialCase, expectedAction: event.target.value as InitialCase['expectedAction'] })}
                    className="w-full rounded-lg border border-[#dce1e6] bg-white p-2.5 outline-none"
                  >
                    <option value="BLOCK">BLOCK (차단)</option>
                    <option value="ALLOW">ALLOW (허용)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="initial-case-severity" className="mb-1 block font-bold text-[#4e5a68]">Severity</label>
                  <select
                    id="initial-case-severity"
                    value={initialCase.severity}
                    onChange={(event) => setInitialCase({ ...initialCase, severity: event.target.value as InitialCase['severity'] })}
                    className="w-full rounded-lg border border-[#dce1e6] bg-white p-2.5 outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {validationMessage && (
            <div className="shrink-0 rounded-xl border border-[#f0ddb0] bg-[#fff5e8] px-4 py-3 text-xs text-[#805100]">
              <p className="mb-1 font-bold">입력 또는 요청을 확인해 주세요.</p>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {validationMessage}
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#e5e9ee] bg-[#fafbfb] p-4">
          <span className="text-[11px] text-[#697586]">등록 후 현재 목록을 다시 불러옵니다.</span>
          <div className="flex gap-2">
            <button type="button" onClick={close} disabled={isSubmitting} className="rounded-xl px-4 py-2 text-xs font-bold text-[#4e5a68] hover:bg-[#eef1f4] disabled:opacity-50">
              취소
            </button>
            <button type="button" onClick={submit} disabled={isSubmitting} className="rounded-xl bg-[#17202a] px-4 py-2 text-xs font-bold text-white hover:bg-[#253545] disabled:opacity-50">
              {isSubmitting ? '등록 중...' : '스위트 만들기'}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
