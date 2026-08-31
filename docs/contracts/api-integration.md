# 프론트엔드 API 연동 계약

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-08-30
> Scope: GitHub Issue #13
> AS-IS baseline: `main@389ee1078fc41e52b46f268facf7032fec0da159`
> Compared unmerged implementation: `dev@b6713880be394063a38835837dc230d858f3cad3`
> Canonical product scope: `guardbench-backend/docs/product/mvp-scope.md` (`APPROVED`)
> Canonical API: `guardbench-backend/docs/api/openapi.yaml` (`APPROVED`)

이 문서는 GuardBench 프론트엔드가 승인된 백엔드 API를 화면에서 호출하고 응답을 UI 상태로 변환하는 경계를 정의한다. 요청·응답 schema를 복제하지 않고 OpenAPI의 endpoint와 schema 이름을 참조한다.

## 1. 판단 기준

- `AS-IS`는 위 baseline의 코드에서 관찰되는 동작이다.
- `TO-BE`는 승인된 MVP 범위와 OpenAPI에서 직접 도출되는 소비 규칙이다.
- 환경별 mock, 재시도 횟수, 사용자 문구처럼 백엔드 계약이 결정하지 않는 정책은 `미결정`이다.
- `dev`에 코드가 있다는 사실만으로 TO-BE를 승인하지 않는다. 계약과 일치하는 미병합 구현과 남은 정책을 구분한다.
- API schema의 필드·enum·validation은 OpenAPI가 소유한다. 이 문서는 화면 mapping과 사용자 표현만 소유한다.

## 2. 브랜치 기준과 영향

`main`과 `dev`는 선후 관계가 아니라 공통 지점 이후 서로 고유 커밋을 가진 분기 상태다. `main`에는 화면 명세와 사용자 흐름이 있고, `dev`에는 다음 미병합 구현이 있다.

| `dev` 구현 | 계약 정합성 | 남은 범위 |
| --- | --- | --- |
| OpenAPI 기준 TestRun 요청·응답 DTO | 계약과 대체로 일치 | 실제 병합과 전체 화면 검증 |
| TestRun 목록·상세·결과 DTO mapping | 계약과 대체로 일치 | pagination, filter와 오류 UX |
| `204 No Content` parsing 생략 | 계약과 일치 | 공통 client 병합 |
| code와 field errors를 보존하는 `ApiError` | 계약과 일치 | 화면별 오류 mapping 정책 |
| TestCase 삭제 성공 후에만 로컬 제거 | 계약과 일치 | 재조회와 사용자 피드백 정책 |
| `FINISHED`에서 끝나는 Polling hook | 계약과 일치 | 화면 연결, backoff와 복구 정책 |
| 선택적 `Idempotency-Key` 전달 | 계약과 일치 | key 생성·보존·재사용 정책 |

`dev`가 `main`에 병합되면 [화면 명세](../product/screen-spec.md)와 [사용자 흐름](../product/user-flows.md)의 TestSuite 생성, TestRun DTO, 결과 mapping, 오류 처리 및 삭제 흐름 AS-IS를 다시 검토한다.

## 3. 화면별 API 추적

| 사용자 목표 | 화면 | Endpoint | AS-IS | TO-BE mapping |
| --- | --- | --- | --- | --- |
| Suite 목록 확인 | 테스트 스위트 | `GET /api/v1/test-suites` | API 항목과 실제 빈 결과를 구분하고 오류에는 code·stale·재시도를 표시 | pagination/filter 정책 확정 |
| Suite 생성 | 테스트 스위트 | `POST /api/v1/test-suites` | 생성 modal이 요청하고 서버 ID를 반영 | field별 오류 control 연결 |
| Suite 상세·수정 | 테스트 스위트 | `GET/PATCH /api/v1/test-suites/{suiteId}` | 서비스만 있고 연결 UI 없음 | summary field만 표시하고 API에 없는 상태·통과율을 사실처럼 만들지 않음 |
| TestCase 목록 | TestCase 관리 modal | `GET /api/v1/test-suites/{suiteId}/test-cases` | 실제 빈 결과와 code·stale·재시도를 표시하며 mock fallback 없음 | `TestCaseListRes.page`를 UI pagination에 연결 |
| TestCase 생성 | TestCase 관리 modal | `POST /api/v1/test-suites/{suiteId}/test-cases` | 생성 응답의 서버 ID와 field로 로컬 추가 | 목록/page 재동기화 정책 |
| TestCase 상세·수정 | TestCase 관리 modal | `GET/PATCH /api/v1/test-cases/{testCaseId}` | 수정 UI는 데모 | 허용 field의 부분 수정과 validation detail을 mapping |
| TestCase 삭제 | TestCase 관리 modal | `DELETE /api/v1/test-cases/{testCaseId}` | 204 성공 후에만 로컬 제거하고 실패 시 code와 서버 상태 유지 | 필요 시 서버 재동기화 |
| TestRun 생성 | 새 테스트 실행 | `POST /api/v1/test-runs` | 승인된 요청·응답 DTO 사용, 오류 code 보존 | `Idempotency-Key` 생성·복원 정책 |
| 실행 이력 | 실행 이력 | `GET /api/v1/test-runs` | 세 상태 축과 progress를 표시하고 오류·빈 결과 분리 | server pagination/filter 연결 |
| 진행 확인 | 결과 상세 또는 실행 이력 | `GET /api/v1/test-runs/{runId}` | Polling hook이 화면에 연결되지 않음 | 상세를 즉시 조회하고 `FINISHED`까지 Polling |
| 결과 분석 | 결과 상세 | `GET /api/v1/test-runs/{runId}/results` | 응답 items를 Snapshot 행으로 mapping하고 오류·빈 결과 분리 | pagination과 결과 filter 연결 |

대시보드와 아키텍처 화면에는 승인된 전용 API가 없다. 정적·mock 데이터를 실제 서버 집계나 도메인 최신 상태로 표현하지 않는다. (`AS-IS`, 후속 Decision)

## 4. DTO와 UI 상태 mapping

### 4.1 공통 원칙 (`TO-BE`)

- API DTO와 화면 모델을 구분하고 service 또는 전용 mapper에서 명시적으로 변환한다.
- API에 없는 Suite 이름, version, 통과율, 장식 상태는 응답에서 얻은 값처럼 만들지 않는다.
- 식별자는 OpenAPI의 `int64` 의미를 보존한다. 화면 장식용 `#`, `suite-`, `tc-` 접두사는 API 경계에서 제거하거나 추가하지 않는다.
- 날짜는 서버의 UTC ISO 8601 값을 원본으로 보존하고 표시 계층에서 locale을 적용한다.
- 목록 응답은 `items`와 `page`를 하나의 서버 상태로 다룬다.

### 4.2 TestRun의 세 축 (`TO-BE`)

| 축 | 값 | UI 의미 |
| --- | --- | --- |
| `status` | `QUEUED`, `PREPARING`, `RUNNING`, `FINISHED` | 실행 생명주기와 Polling 종료 조건 |
| `executionOutcome` | `COMPLETED`, `ERROR`, `INCOMPLETE`, 실행 중 `null` | 실행 신뢰도와 처리 결과 |
| Quality Gate | `PASS`, `FAIL`, `NOT_EVALUATED`, 실행 중 `null` | 정책 Gate 판정 |

- `FAILED`를 TestRun status로 만들지 않는다.
- `qualityGate = null`은 아직 평가 전이고 `NOT_EVALUATED`는 종료됐지만 평가 불가다.
- Gate `FAIL`을 실행 오류로 표현하지 않는다.
- progress는 `processedTestCaseCount`와 `percent`를 사용한다.

### 4.3 Snapshot 결과 (`TO-BE`)

- Expected, Baseline/Candidate execution, assertion, comparability, change type을 별도 값으로 표시한다.
- `FAILED`, `TIMED_OUT`, `NOT_STARTED`를 assertion 실패와 혼동하지 않는다.
- `NOT_COMPARABLE`이면 없는 change type을 추정하지 않는다.
- 행과 상세 modal은 동일한 `TestRunResultListItemRes` 원본을 사용한다.

## 5. 공통 API client

### AS-IS

- base URL은 `VITE_API_BASE_URL` 또는 `/api/v1`이다.
- JSON envelope의 `data`를 반환한다.
- HTTP 또는 envelope 오류는 `ApiError`로 변환하며 HTTP status, code와 field errors를 보존한다.
- network 실패와 계약에 맞지 않는 JSON 응답은 각각 `NETWORK_ERROR`, `INVALID_RESPONSE`로 구분한다.
- `204 No Content`는 JSON parsing을 생략한다.
- timeout, 취소, 인증과 공통 재시도 정책이 없다.

### TO-BE

- 204는 body parsing 없이 성공으로 처리한다.
- 오류에는 HTTP status, envelope message, `data.code`, validation `errors`를 보존한다.
- network 실패, timeout/abort, invalid JSON, HTTP/API 오류를 최소한 진단 가능한 범주로 구분한다.
- 서버가 제공한 안전한 message만 사용자 표현 후보로 사용하고 stack trace나 provider 원문을 노출하지 않는다.
- GET 요청에 불필요한 `Content-Type`을 강제할지 여부는 구현 시 검토한다.

timeout 값, 자동 재시도 대상과 인증·권한 오류 UX는 `미결정`이다.

## 6. TestRun 생성과 멱등성

### TO-BE

1. 실제 TestSuite ID, 하나의 Guardrail ID, Baseline numbered version과 Candidate `DRAFT`를 수집한다.
2. 필수값, numbered version과 동일 Guardrail ID 조건을 검증한다.
3. 한 논리적 생성 시도에 하나의 `Idempotency-Key`를 부여한다.
4. 같은 시도의 응답을 받지 못한 재전송에는 같은 key와 같은 요청을 사용한다.
5. 성공 응답의 `id`, `status`, `testCaseCount`, `createdAt`을 보존하고 상세 조회로 이어간다.
6. `TEST_SUITE_EMPTY`와 `IDEMPOTENCY_KEY_CONFLICT`를 일반 네트워크 오류와 구분한다.

OpenAPI에서 header는 선택 사항이지만, 사용자 중복 실행을 막기 위한 프론트엔드 사용 원칙은 필요하다. key 생성 형식, 저장 위치, 승인된 3시간 서버 TTL 안의 재사용 수명, 화면 이탈 후 복원 방식은 API 계약과 백엔드 ADR을 함께 참조해 후속 Decision에서 확정한다. (`미결정`)

## 7. Polling

### TO-BE 흐름

1. 생성 응답 또는 실행 이력에서 Run ID를 얻으면 상세를 즉시 한 번 조회한다.
2. `QUEUED`, `PREPARING`, `RUNNING`이면 progress와 마지막 갱신 시각을 표시하고 반복 조회한다.
3. `FINISHED`이면 Polling을 종료하고 outcome과 Quality Gate를 표시한다.
4. 결과 목록을 조회한다. 종료 직전 race로 `TEST_RUN_NOT_FINISHED`가 오면 진행 상태로 되돌려 상세를 다시 확인한다.
5. Run 변경, 화면 이탈 또는 unmount 시 진행 중 요청과 timer를 취소한다.

고정 간격, 지수 backoff, jitter, 최대 지속 시간, background tab 감속, 일시 오류 허용 횟수와 수동 재시도 UI는 `미결정`이다. 오류가 발생했다는 이유로 mock Run을 완료 결과처럼 표시하지 않는다.

## 8. Pagination과 filter

### TO-BE

- page는 1-based이며 기본값 1, size는 OpenAPI의 1~100 범위를 따른다.
- `PageMetaRes.number`, `size`, `totalElements`, `totalPages`, `hasPrevious`, `hasNext`를 함께 보존한다.
- 범위를 초과한 page에서도 서버가 돌려준 요청 page 번호와 빈 `items`를 유지한다.
- filter 또는 검색을 server-side로 제공하는 endpoint에서는 전체 결과에 적용한 뒤 pagination한 서버 결과를 사용한다.
- 반복 query parameter인 TestRun status/outcome/Gate filter는 OR 의미를 보존한다.
- filter 없는 FINISHED 결과의 `totalElements`는 고정 `testCaseCount`와 같아야 한다. 다르면 정상 빈 결과로 단정하지 않고 계약 불일치로 진단한다.

URL에 page/filter를 보존할지, filter 변경 시 page를 1로 되돌릴지와 빈 상태 CTA는 `미결정`이다.

## 9. 빈 결과

### TO-BE 원칙

- 성공 응답의 `items: []`는 실제 빈 결과다. mock으로 대체하지 않는다.
- 최초 데이터 0건, filter 결과 0건, 범위 초과 page를 구분한다.
- TestSuite/TestCase의 정상 빈 목록과 `TEST_SUITE_NOT_FOUND`를 구분한다.
- FINISHED 결과가 filter 없이 비었으면 정상 빈 화면보다 계약 위반 가능성을 우선 확인한다.
- 이전 데이터가 보이는 동안 새 조회가 빈 결과를 반환하면 이전 값을 실제 최신 결과처럼 유지하지 않는다.

빈 화면 문구, CTA와 일러스트는 UI 가이드에서 결정한다. (`미결정`)

## 10. 환경별 mock

현재 코드는 환경 구분 없이 mock을 초기값과 오류 fallback으로 사용한다. (`AS-IS`)

다음 항목은 백엔드 계약만으로 확정할 수 없어 Decision이 필요하다.

| 환경 | 결정할 내용 |
| --- | --- |
| 로컬 개발 | 명시적 mock mode와 실제 API mode 전환, 기본값 |
| 자동 테스트 | deterministic fixture, network 차단과 계약 fixture 관리 |
| 데모 | mock 사용 표시, 쓰기 동작 제한과 데이터 초기화 |
| 실제 API/배포 | mock 금지 여부, 설정 누락 시 fail-fast 여부 |

공통 최소 원칙은 다음과 같다. (`TO-BE`)

- 실제 API 응답과 mock을 출처 표시 없이 같은 collection에 섞지 않는다.
- API 실패나 실제 빈 결과를 mock 성공 데이터로 위장하지 않는다.
- mock mode는 승인된 서버 상태나 제품 계약의 증거가 아니다.
- production 허용 여부가 결정되기 전까지 silent fallback을 목표 동작으로 승인하지 않는다.

## 11. 오류와 fallback

| 상황 | AS-IS | TO-BE 원칙 |
| --- | --- | --- |
| 목록 조회 실패 | 오류 code와 재시도 경로를 표시하고 이전 데이터가 있으면 stale로 표시 | 화면별 404·권한 문구 세분화 |
| mutation validation | `ApiError` code와 field details를 form 또는 지속 오류 영역에 보존 | field별 control 연결 |
| 404 | 구조화된 오류로 표시하며 mock으로 대체하지 않음 | 리소스 미존재 전용 이동 경로 |
| 409 | 일반 오류 | `TEST_SUITE_EMPTY`, `IDEMPOTENCY_KEY_CONFLICT`, `TEST_RUN_NOT_FINISHED`별 흐름 분리 |
| DELETE 실패 | 성공처럼 제거 가능 | 성공을 확정하지 않고 서버 상태 유지 또는 재조회 |
| network/timeout | 일반 오류 | 결과 불명과 명시적 거부를 구분 |

마지막 성공 데이터 유지, 오류 banner/toast, 자동 재시도와 오프라인 복구 방식은 `미결정`이다. 어떤 선택이든 stale 데이터에는 오류 또는 갱신 실패 상태를 함께 표시하고 최신 성공 데이터처럼 오인시키지 않는다.

## 12. 후속 구현·Decision 후보

- 환경별 `VITE_DATA_MODE`의 실제 demo fixture 적용 범위 Decision
- abort/timeout 처리와 오류별 자동 재시도 정책
- TestRun 멱등 key 생성과 복원
- Polling 연결, backoff, 오류 복구와 background tab 정책
- pagination/filter UI와 URL 상태 Decision
- 실제 빈 결과와 오류 상태 UI
- OpenAPI 기반 타입 생성 여부 Decision

이 문서는 위 구현을 수행하거나 정책을 임의로 승인하지 않는다.

## 13. 검증 근거

- `src/services/`
- `src/hooks/useLiveRunProgress.ts`
- `src/components/views/`
- `src/components/common/SuiteDetailModal.tsx`
- `src/mocks/mockData.ts`
- [화면 명세](../product/screen-spec.md)
- [사용자 흐름](../product/user-flows.md)
- `guardbench-backend/docs/product/mvp-scope.md`
- `guardbench-backend/docs/api/openapi.yaml`

실제 backend를 실행한 end-to-end 검증과 `dev` 병합은 이 Issue 범위에 포함하지 않았다.
