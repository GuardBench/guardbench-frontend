# 프론트엔드 화면 및 기능 명세 기준선

> Status: AS-IS
> Owner: Frontend
> Last reviewed: 2026-08-27
> Scope: GitHub Issue #8
> Canonical API: `guardbench-backend/docs/api/openapi.yaml` (`APPROVED`)

이 문서는 현재 프론트엔드 코드에서 관찰되는 화면과 동작을 기록한다. 정적 mock, 실제 API 호출, 로컬 UI 상태와 미구현 동작을 구분하며, 현재 동작을 승인된 목표 사양으로 확정하지 않는다.

## 1. 공통 셸과 이동

### 화면 목록

| View 값 | 화면 | 진입 방법 |
| --- | --- | --- |
| `dashboard` | 대시보드 | 최초 진입, 사이드바 |
| `suites` | 테스트 스위트 | 사이드바 |
| `new-run` | 새 테스트 실행 | 사이드바 또는 화면 내 실행 버튼 |
| `runs` | 실행 이력 | 사이드바 또는 대시보드의 전체 보기 |
| `result` | 결과 상세 | 실행 이력 행 선택 또는 TestRun 생성 성공 |
| `architecture` | 아키텍처 & 도메인 | 사이드바 또는 상단 도움말 |

### 현재 이동 방식

- 별도 router 없이 `App`의 `currentView` 로컬 상태로 화면을 전환한다.
- 결과 상세의 선택 Run ID도 `App` 로컬 상태에 보관한다.
- 화면 전환 시 상단으로 스크롤하고 모바일 메뉴를 닫는다.
- URL이 바뀌지 않으므로 직접 링크, 브라우저 뒤로 가기, 새로고침 후 화면 복원은 지원하지 않는다.
- 최초 결과 상세 선택값은 mock Run `#5001`이다.

### 공통 사용자 피드백

- 공통 toast는 우측 하단에 약 2.8초 표시된다.
- toast는 성공, 실패, 데모 안내를 같은 시각 표현으로 표시한다.
- 전역 오류 경계, 확인 dialog, 지속되는 오류 영역은 없다.
- 모바일에서는 sidebar overlay와 닫기 동작을 제공한다.

## 2. 구현 상태 표기

| 표기 | 의미 |
| --- | --- |
| 실제 연동 | 승인 여부와 별개로 현재 코드가 백엔드 API를 호출한다. |
| 부분 연동 | API를 호출하지만 일부 필드·상태·후속 동작은 mock 또는 로컬 값이다. |
| mock | `src/mocks/mockData.ts`의 정적 데이터를 표시한다. |
| 로컬 | 컴포넌트의 메모리 상태만 바꾼다. 새로고침하면 사라진다. |
| 데모 | 사용자에게 동작처럼 보이지만 API 호출이나 영속 변경이 없다. |
| 미구현 | UI 또는 계약에 표현됐지만 실제 동작이 없다. |

## 3. 대시보드

### 목적

정책 회귀 테스트의 요약, 최근 Quality Gate 판정과 최근 활동을 한 화면에서 보여주는 데모 대시보드다.

### 데이터와 동작

| 항목 | 출처 | 현재 동작 |
| --- | --- | --- |
| 4개 요약 통계 | mock | 고정 값 표시 |
| 최근 7일 차트 | mock | 고정 막대 데이터 표시 |
| 최근 활동 | mock | 고정 활동 목록과 상태 pill 표시 |
| 새 테스트 실행 | 로컬 이동 | `new-run` 화면으로 이동 |
| 전체 보기 | 로컬 이동 | `runs` 화면으로 이동 |

### 상태 지원

- 로딩: 없음
- 빈 결과: 없음
- 오류: 없음
- 실제 API: 없음

### 미구현·미결정

- 대시보드 집계 API와 기간 기준이 정해지지 않았다.
- 최근 활동의 정의, 정렬, 최대 개수와 이동 대상이 정해지지 않았다.
- 차트 tooltip은 브라우저 `title`에 의존한다.

## 4. 테스트 스위트

### 목적

TestSuite 목록을 카드로 조회하고 선택한 Suite의 TestCase를 modal에서 관리한다.

### 목록 데이터 흐름

1. 화면은 먼저 `mockSuites`로 렌더링된다.
2. mount 시 `GET /api/v1/test-suites`를 호출한다.
3. 응답 `items`가 한 건 이상이면 프론트엔드 카드 타입으로 변환한다.
4. API 오류 또는 빈 응답이면 mock 카드가 유지된다.

API 응답에 없는 다음 필드는 프론트엔드에서 고정 또는 장식 값으로 만든다.

| UI 필드 | 현재 값 |
| --- | --- |
| 상태 | 모든 API Suite를 `활성`으로 표시 |
| 최근 통과율 | `-` |
| 마지막 실행 | `-` |
| 아이콘 | 고정 기호 |
| 배경색 | 고정 색상 |

Architecture 화면의 규칙 목록은 정적 데모 자료로 명시한다. `VITE_DATA_MODE=demo` 환경은 앱 상단에 DEMO 표시를 제공하며 API 오류를 mock 성공 데이터로 바꾸지 않는다.

### 사용자 동작

| 동작 | 상태 | 현재 동작 |
| --- | --- | --- |
| Suite 카드 선택 | 부분 연동 | TestCase 관리 modal을 연다. |
| 스위트 만들기 | API | 생성 modal에서 Suite와 선택적인 초기 TestCase를 등록한다. |
| 빈 카드 영역의 새 Suite 선택 | API | 같은 생성 modal을 연다. |

### 목록 상태 지원

- 로딩: 상단의 작은 spinner 표시
- 빈 결과: 실제 0건 전용 화면과 Suite 생성 action 표시
- 오류: 구조화된 오류 code, stale 상태와 재시도 action 표시
- pagination, 검색, 정렬: UI에 없음

### TestCase 관리 modal

#### 조회

- Suite 선택 시 `GET /api/v1/test-suites/{suiteId}/test-cases`를 호출한다.
- `suite-` 접두사를 제거한 값을 API ID로 사용한다.
- 페이지 크기는 20이며 page 값은 UI의 1-based 값을 그대로 전송한다.
- 오류 시 기존 API 데이터가 있으면 stale로 표시하고, 없으면 오류 상태와 재시도 action을 제공한다.
- API 실패를 선택된 Suite의 mock `testCases`로 대체하지 않는다.

#### 생성

- 이름과 input의 빈 문자열 여부만 검사한다. 공백만 있는 값은 클라이언트에서 거르지 않는다.
- category, expectedAction, severity 입력을 제공한다.
- `POST /api/v1/test-suites/{suiteId}/test-cases`를 호출한다.
- 성공 응답의 서버 ID와 field를 로컬 목록 끝에 추가한다.
- 생성 후 전체 개수와 pagination 메타데이터는 다시 조회하지 않는다.
- 요청 중 중복 제출 방지와 field별 오류 표시는 없다.

#### 수정

- 편집 아이콘은 API나 편집 폼을 열지 않고 이동 안내 toast만 표시한다.

#### 삭제

- 확인 절차 없이 `DELETE /api/v1/test-cases/{testCaseId}`를 호출한다.
- API 성공 여부와 무관하게 로컬 목록에서 제거하고 성공 toast를 표시한다.
- 전체 개수와 페이지 메타데이터는 갱신하지 않는다.

#### modal 상태 지원

- 로딩: 제목 옆 spinner
- 빈 결과: 빈 table만 표시하며 설명이나 CTA 없음
- 조회 오류: 구조화된 오류 code, 재시도와 stale 상태 표시
- 생성 오류: code와 field errors를 form 영역에 유지
- 삭제 오류: 서버 성공 전에는 로컬 목록에서 제거하지 않고 code를 포함해 안내
- 접근성: dialog role, focus trap, Escape 닫기, 삭제 확인이 없음

## 5. 새 테스트 실행

### 목적

TestSuite와 Baseline/Candidate Guardrail Target을 선택해 TestRun 실행을 요청한다.

### 데이터 출처

- Suite 선택지는 3개 고정 option이며 TestSuite API를 사용하지 않는다.
- Suite ID, 이름, case 수가 화면 코드에 함께 하드코딩되어 있다.
- Baseline 및 Candidate Guardrail 값에는 고정 초기값이 들어 있다.
- 예상 실행 수는 고정 case 수의 두 배로 계산한다.

### 사용자 동작

1. Suite와 Target 입력값을 변경한다.
2. 테스트 실행 요청 버튼을 선택한다.
3. `POST /api/v1/test-runs`를 호출한다.
4. 성공하면 toast를 표시하고 `result` 화면으로 이동한다.
5. 실패하면 오류 message를 toast로 표시한다.

### 상태 지원

- 제출 중: 버튼 비활성화 및 문구 변경
- 입력 validation: 없음
- 빈 Suite 또는 잘못된 version의 field 오류: 없음
- API 오류: toast만 표시
- 멱등 재시도 안내: 없음

### 승인된 OpenAPI와의 주요 불일치

- 현재 요청은 `suiteId`, `baselineGuardrailId`, `baselineGuardrailVersion`, `candidateGuardrailId`, `candidateGuardrailVersion`의 평면 구조다.
- OpenAPI는 `testSuiteId`, 중첩 `baseline`, 중첩 `candidate`를 요구한다.
- OpenAPI Candidate는 version 입력이 아니라 `source: DRAFT`를 요구한다.
- OpenAPI는 Baseline과 Candidate의 `guardrailId`가 같아야 한다.
- 현재 UI와 서비스는 이 동일 ID 조건을 검증하지 않는다.
- `Idempotency-Key` header를 생성하거나 전송하지 않는다.
- 프론트엔드는 생성 응답의 `runId`와 `executionStatus`를 기대하지만 OpenAPI는 `id`, `testSuiteId`, `status`, `testCaseCount`, `createdAt`을 반환한다.

현재 요청은 승인된 계약과 일치하지 않으므로 정상 연동으로 간주하지 않는다.

## 6. 실행 이력

### 목적

TestRun의 진행 상태, 실행 결과와 Quality Gate를 서로 다른 축으로 표시하고 상세 화면으로 이동한다.

### 데이터 흐름

1. 빈 로컬 목록에서 시작해 mount 시 `GET /api/v1/test-runs`를 호출한다.
2. 응답 `items`를 승인된 `TestRunListItemRes`로 사용한다.
3. 성공한 `items: []`는 실제 빈 결과로 표시한다.
4. 오류 시 mock으로 바꾸지 않고 code, stale 상태와 재시도 action을 표시한다.

행은 승인된 목록 응답의 `testSuiteId`, `status`, `testCaseCount`, `progress`, `executionOutcome`, `qualityGateStatus`를 직접 소비한다. API에 없는 Suite 이름과 Target version은 만들지 않는다.

### 검색과 필터

- 검색은 현재 메모리 목록의 Run ID와 Suite ID에 대해 수행한다.
- 상태 필터도 현재 메모리 목록에서 수행한다.
- `RUNNING` 필터는 실제 `RUNNING`만이 아니라 `FINISHED`가 아닌 모든 상태를 포함한다.
- API가 제공하는 status, executionOutcome, qualityGateStatus, 기간 필터를 사용하지 않는다.
- pagination UI와 메타데이터 처리가 없다.

### 사용자 동작과 상태

- 행 선택: 선택 Run ID를 가지고 결과 상세로 이동
- 새 테스트 실행: `new-run`으로 이동
- 로딩: 상단 작은 spinner
- 빈 결과: 빈 table만 표시
- 오류: 구조화된 오류 code와 재시도 경로를 표시하며 이전 데이터가 있으면 stale로 유지

## 7. 결과 상세

### 목적

선택한 TestRun의 Quality Gate, Target, 핵심 metrics와 Snapshot별 판정을 표시하고 상세 diff를 제공한다.

### 데이터 흐름

- 선택 Run ID에서 `#`을 제거해 `GET /api/v1/test-runs/{id}/results`를 호출한다.
- 프론트엔드는 응답을 `{ run, executionDetails }`로 기대한다.
- 승인된 API는 Snapshot 결과 `items`와 `page`를 반환한다.
- API 성공 여부와 관계없이 Snapshot table은 `mockRunDetailsMap`의 mock 데이터를 사용한다.
- API 성공 시에도 Target hash와 4개 metric 일부를 고정 문자열로 만든다.
- Gate 제목과 설명, version, Snapshot diff는 mock 상세 데이터에서 가져온다.

따라서 이 화면은 현재 실제 결과 조회 화면이 아니라 mock 중심의 결과 데모다.

### 사용자 동작

| 동작 | 상태 | 현재 동작 |
| --- | --- | --- |
| Snapshot 행 선택 | mock | mock Snapshot diff modal을 연다. |
| 리포트 | 데모 | 내보내기 없이 안내 toast만 표시한다. |
| 다시 실행 | 로컬 이동 | 값 복사 없이 새 실행 화면으로 이동한다. |

### 상태 지원

- 로딩: 제목 옆 작은 spinner
- 실행 중: results API의 `TEST_RUN_NOT_FINISHED`를 진행 중 상태로 유지
- 빈 결과: FINISHED 결과 조회 성공 후 `items: []`일 때 전용 문구 표시
- 오류: 상세·결과 오류를 분리하고 code와 재시도 경로 표시
- pagination 및 결과 필터: 없음

### Snapshot diff modal

- input, Expected, Baseline/Candidate 결과, 오류, filter reason과 latency를 표시한다.
- 표시 데이터는 현재 mock이다.
- dialog role, focus trap과 Escape 닫기를 지원하지 않는다.

## 8. 아키텍처 & 도메인

### 목적

백엔드 실행 흐름, 인프라 구성과 핵심 도메인 규칙을 정적 화면으로 설명한다.

### 데이터와 동작

- 실행 흐름과 인프라 카드는 JSX에 정적으로 작성되어 있다.
- 핵심 도메인 규칙은 `mockRules`를 사용한다.
- API 호출과 사용자 입력은 없다.
- 상단 도움말 선택 시 이 화면으로 이동하면서 Notion 설계 문서를 바탕으로 구성했다는 toast를 표시한다.

### 미결정

- 이 화면을 최종 사용자 기능으로 유지할지 개발 참고 기능으로 분류할지 결정되지 않았다.
- 표시 내용과 승인된 백엔드 문서 사이의 갱신 책임과 검증 절차가 없다.

## 9. API 계층 공통 동작

### 현재 구현

- 기본 주소는 `VITE_API_BASE_URL` 또는 `/api/v1`이다.
- 모든 요청에 `Content-Type: application/json`과 `Accept: application/json`을 설정한다.
- JSON envelope의 `data`를 반환한다.
- HTTP 오류 또는 envelope `httpStatus >= 400`이면 `Error`를 던진다.

### 현재 제약

- JSON body가 없는 `204 No Content` 응답은 parsing을 생략한다.
- 오류 envelope의 code와 field errors를 `ApiError`에 보존한다.
- network 오류와 계약에 맞지 않는 JSON 응답을 별도 client code로 구분한다.
- request 취소, timeout, 인증, 공통 재시도 정책이 없다.

## 10. Polling 구현 상태

`useLiveRunProgress` 훅은 2초 간격 상태 조회를 의도하지만 현재 어떤 화면에서도 사용하지 않는다.

추가로 다음 계약 불일치가 있다.

- 훅 응답은 `executionStatus`와 `FAILED` 상태를 기대한다.
- 승인된 API는 `status`를 사용하며 TestRun 상태는 `QUEUED`, `PREPARING`, `RUNNING`, `FINISHED`다.
- 오류 종료는 별도 `FAILED` 상태가 아니라 `FINISHED`와 `executionOutcome`으로 표현한다.
- 승인된 progress는 `processedTestCaseCount`와 `percent`를 제공한다.
- 현재 타입은 `executedSnapshots`, `totalSnapshots`를 기대한다.

## 11. 주요 계약 불일치 목록

| 영역 | 현재 프론트엔드 | 승인된 계약 | 상태 |
| --- | --- | --- | --- |
| TestSuite 생성 배열 | `initialTestCases` | `testCases` | 불일치 |
| TestRun Suite ID | `suiteId: string` | `testSuiteId: int64` | 불일치 |
| TestRun Target | 평면 필드 | `baseline`, `candidate` 객체 | 불일치 |
| Candidate 입력 | Guardrail version | `source: DRAFT` | 불일치 |
| Target Guardrail ID | 서로 다른 값 허용 | 동일 ID 필수 | 불일치 |
| 멱등성 | header 없음 | `Idempotency-Key` 지원 | 미구현 |
| TestRun 생성 응답 | `runId`, `executionStatus` | `id`, `status` 등 | 불일치 |
| TestRun 진행 상태 | `FAILED` 포함 | `FINISHED + executionOutcome` | 불일치 |
| progress | snapshot 실행 수 | 처리 TestCase 수와 percent | 불일치 |
| TestRun 목록 | UI 전용 `TestRun` 직접 사용 | API 목록 요약 | mapping 없음 |
| 결과 목록 | `{run, executionDetails}` | paginated `{items, page}` | 불일치 |
| DELETE 응답 | JSON envelope parsing | 성공 시 `204` 가능 | 처리 불일치 가능 |

이 표는 수정 방향을 승인하지 않는다. API 연동 계약 문서와 후속 구현 Issue에서 해결 범위를 결정한다.

## 12. 후속 Issue 후보

### 문서화

- 사용자 흐름 문서 작성
- API 연동 계약과 화면 mapping 작성
- 프론트엔드 아키텍처 문서 작성
- UI 및 접근성 가이드 작성

### 구현 또는 Decision

- TestRun 생성 요청·응답을 OpenAPI와 정렬
- TestRun 목록 DTO mapping과 Suite 이름 표시 전략 결정
- 상태 조회 Polling을 승인된 상태 모델로 구현
- 결과 상세와 paginated Snapshot 결과 mapping 구현
- demo fixture 적용 화면과 운영 환경 차단 정책 결정
- TestSuite 생성과 TestCase 수정 UI 구현
- TestCase 생성·삭제 후 서버 상태 재동기화
- URL routing과 직접 링크 도입 결정
- 공통 API 오류 모델과 `204` 응답 처리
- dialog 접근성과 삭제 확인 동작 개선
- 자동화된 frontend test 기반 구축

## 13. 검증 근거

다음 코드를 기준으로 대조했다.

- `src/App.tsx`
- `src/types/index.ts`
- `src/components/layout/`
- `src/components/views/`
- `src/components/common/`
- `src/services/`
- `src/hooks/useLiveRunProgress.ts`
- `src/mocks/mockData.ts`
- `package.json`
- `guardbench-backend/docs/api/openapi.yaml`

실제 backend를 실행한 end-to-end 검증은 이 Issue 범위에 포함하지 않았다.
