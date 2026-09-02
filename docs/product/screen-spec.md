# 프론트엔드 화면 및 기능 명세

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-09-02
> Scope: GitHub Issues #33, #62
> AS-IS baseline: `dev@554a2d9705c0cfd4bb25b03ae9dbe779e816a53e`
> Canonical API: [`../api/openapi.yaml`](../api/openapi.yaml) (`APPROVED`)
> API consumption contract: [`../contracts/api-integration.md`](../contracts/api-integration.md)

이 문서는 현재 프론트엔드 화면의 실제 동작과 최신 OpenAPI에서 직접 도출되는 목표 동작을 구분한다. API schema를 다시 정의하지 않으며 endpoint와 schema의 의미는 OpenAPI 및 API 연동 계약을 따른다.

## 1. 읽는 방법

| 표기 | 의미 |
| --- | --- |
| `AS-IS` | 기준 commit의 코드에서 관찰되는 현재 동작 |
| `TO-BE` | 최신 OpenAPI에서 직접 도출되는 목표 동작 |
| `미결정` | OpenAPI만으로 확정할 수 없는 제품·UI 정책 |
| `데모` | 실제 API나 영속 상태가 아닌 정적 표현 |

코드가 OpenAPI와 다르면 AS-IS 불일치로 기록하고 목표 사양으로 승인하지 않는다. 실제 API 성공, 빈 결과, 오류와 demo/mock을 서로 구분한다.

## 2. 공통 셸과 navigation

### 화면 목록

| 화면 | View | 현재 진입 방식 | 목표 역할 |
| --- | --- | --- | --- |
| 대시보드 | `DashboardView` | Sidebar / logo | 정적 데모와 실제 집계의 출처 구분 |
| 테스트 스위트 | `SuitesView` | Sidebar | Suite와 TestCase 관리 |
| 새 테스트 실행 | `NewRunView` | Sidebar / 다시 실행 | TestSuite + Application Target + Evaluation Profile 제출 |
| 실행 이력 | `RunsView` | Sidebar | Run lifecycle/outcome/Gate 조회와 상세 진입 |
| 결과 상세 | `ResultDetailView` | Run 행 / 생성 완료 | 현재 Run 결과와 Evaluator 분석 확인 |
| 아키텍처 | `ArchitectureView` | Sidebar | 정적 설명 자료 |

현재는 `App`의 local state로 화면과 선택 Run을 관리하며 URL route가 없다. 새로고침, browser back/forward와 직접 URL 진입은 화면 상태를 복원하지 않는다. (`AS-IS`)

라우팅 방식, URL 구조와 filter/page 보존은 `미결정`이다. 다만 어떤 방식을 선택해도 실제 Run ID와 화면 장식 ID를 분리하고, 화면 이동 시 이전 요청과 Polling을 정리해야 한다. (`TO-BE`)

## 3. 공통 화면 상태

API를 소비하는 화면은 다음 상태를 구분한다.

| 상태 | 표현 원칙 |
| --- | --- |
| initial/loading | 아직 실제 data가 확정되지 않았음을 표시한다. |
| success with data | 서버가 반환한 data와 page metadata를 표시한다. |
| success with empty | 실제 빈 결과로 표시하며 mock으로 대체하지 않는다. |
| error without data | 지속되는 오류 설명과 가능한 재시도 action을 제공한다. |
| refresh error with prior data | 이전 data를 유지할 경우 stale/갱신 실패를 함께 표시한다. |
| demo/mock | 실제 API 결과가 아니라는 출처를 명시한다. |

Toast는 일시적 action 결과에 사용할 수 있지만 조회 실패, validation detail과 복구가 필요한 오류를 toast만으로 숨기지 않는다.

## 4. 대시보드

### 목적

GuardBench의 핵심 개념과 최근 활동 형태를 시각적으로 소개한다.

### 현재 동작 (`AS-IS`)

- TestSuite와 TestRun 목록 API의 page metadata와 items로 통계, 최근 활동과 Quality Gate 분포를 표시한다.
- 대시보드 전용 집계 endpoint는 호출하지 않으며, 조회 범위 기반 수치를 전체 집계처럼 표현하지 않는다.
- 최초 loading, 최초 오류, 성공 후 실제 empty와 이전 data를 유지한 갱신 오류를 구분한다.
- 일부 card와 action은 다른 local view로 이동한다.

### 목표 경계 (`TO-BE`)

- OpenAPI에는 대시보드 전용 집계 endpoint가 없다.
- 목록 API의 조회 범위를 실제 전체 집계나 Regression 결과처럼 표현하지 않는다.
- demo 화면으로 유지하면 명시적인 demo 표식을 제공한다.

실제 대시보드의 지표, 기간과 endpoint 도입 여부는 `미결정`이다.

## 5. 테스트 스위트와 TestCase 관리

### 목적

TestSuite 목록을 확인하고 Run에서 사용할 TestCase를 관리한다.

### 현재 동작 (`AS-IS`)

- Suite 목록은 `GET /api/v1/test-suites`를 사용한다.
- API 성공의 실제 빈 결과와 오류를 구분하며 silent mock fallback을 사용하지 않는다.
- Suite 생성 modal은 `POST /api/v1/test-suites`를 사용하고 서버가 반환한 ID를 반영한다.
- Suite 선택 시 TestCase 관리 modal에서 `GET /api/v1/test-suites/{suiteId}/test-cases`를 사용한다.
- TestCase 생성은 POST, 삭제는 DELETE를 사용한다. 삭제 실패를 성공으로 확정하지 않는다.
- TestCase 수정 action은 완전한 편집 UI로 연결되지 않았다.
- server pagination/filter는 화면 control에 완전히 연결되지 않았다.

### 목표 동작 (`TO-BE`)

| 사용자 action | Endpoint | 화면 책임 |
| --- | --- | --- |
| Suite 목록 | `GET /api/v1/test-suites` | data/empty/error/page를 구분한다. |
| Suite 생성 | `POST /api/v1/test-suites` | validation detail을 관련 field에 표시한다. |
| Suite 상세·수정 | `GET/PATCH /api/v1/test-suites/{suiteId}` | API에 없는 상태·pass rate를 만들지 않는다. |
| TestCase 목록·생성 | `GET/POST /api/v1/test-suites/{suiteId}/test-cases` | `404 TEST_SUITE_NOT_FOUND`와, 존재하는 Suite가 `200`으로 반환한 빈 `items`를 구분한다. |
| TestCase 상세·수정·삭제 | `GET/PATCH/DELETE /api/v1/test-cases/{testCaseId}` | `204` 성공 후 삭제를 확정하고 과거 Snapshot은 영향받지 않음을 안내한다. |

Suite 생성은 두 형태를 모두 허용한다.

- `testCases`를 생략하거나 `null`, 빈 배열로 보내 빈 Suite를 먼저 생성한다.
- 최대 100개의 초기 TestCase를 함께 보내 Suite와 하나의 트랜잭션에서 원자적으로 생성한다. 초기 TestCase 하나라도 유효하지 않으면 Suite를 포함한 전체 요청이 실패한다.

현재 MVP 화면은 이름만 입력하면 빈 Suite를 생성하고, 사용자가 초기 TestCase 추가를 선택하면 한 건을 같은 생성 요청에 포함한다. OpenAPI는 최대 100건까지 허용하지만 UI가 한 번에 몇 건을 지원할지는 API 제약과 별개의 제품 범위다. 생성 후에는 두 경우 모두 동일한 TestCase 관리 화면을 사용한다.

pagination/filter UX, 삭제 확인 방식과 mutation 후 재조회 정책은 `미결정`이다.

## 6. 새 테스트 실행

### 목적

사용자가 TestSuite, 테스트할 AI Application과 평가 정책을 선택해 비동기 TestRun을 접수한다.

```text
TestSuite
+ OpenAI-compatible HTTP endpoint / required model / optional revision
+ Evaluation Profile checks / strictness
→ POST /api/v1/test-runs
→ 202 Accepted
→ Run 상세 조회
```

### 현재 동작 (`AS-IS`)

- Suite 목록은 실제 API에서 조회한다.
- OpenAI-compatible full endpoint, 필수 model과 선택 revision을 입력받는다.
- checks 복수 선택과 Profile 전체의 단일 strictness를 입력받는다.
- `testRunService`는 최신 `target`과 inline `evaluationProfile`을 전송한다.
- 동일 payload의 결과 불명 재시도에는 같은 Idempotency-Key를 유지한다.

### 현재 form 계약 (`AS-IS`)

| 영역 | 입력 | 상태와 validation |
| --- | --- | --- |
| TestSuite | 실제 Suite ID | loading, empty, 조회 오류와 선택 상태 |
| Application | HTTP/HTTPS URL | 필수, URL parsing과 HTTP/HTTPS protocol 검사 |
| Application model | Chat Completions request의 모델 식별자 | 필수, 공백 문자열 금지 |
| Application revision | 배포·모델·commit 식별 문자열 | 선택, 공백 문자열 금지 |
| Evaluation checks | Prompt Injection, PII Leakage, Harmful Content | Profile에서 최소 1개, 중복 불가 |
| Strictness | Relaxed, Standard, Strict | Evaluation Profile 전체에 정확히 1개 선택하며 선택된 모든 checks에 공통 적용 |

- 사용자에게 Evaluator provider/type 또는 Guardrail ID/version을 입력받지 않는다.
- Evaluation Profile은 저장된 리소스 ID가 아니라 Run에 포함되는 inline 정책으로 설명한다.
- 현재 OpenAPI는 check별 strictness를 지원하지 않는다. check마다 다른 엄격도를 보내거나 화면 전용 조합을 request body에 추가하지 않는다.
- 예상 실행 수는 활성 TestCaseSnapshot당 단일 Application 처리 기준이며 기존 `caseCount * 2`를 사용하지 않는다.
- 화면 요약에는 Suite, Application URL/model/revision과 Evaluation Profile을 표시한다.
- 한 논리적 제출 payload에는 같은 `Idempotency-Key`를 사용하고 payload가 바뀌면 새 key를 사용한다.

### 생성 결과와 오류 (`AS-IS`)

- `202 Accepted`는 실행 완료가 아니라 접수 성공이다.
- 응답의 Run ID, status, testCaseCount, target, evaluationProfile과 createdAt을 보존한다.
- 접수 후 즉시 Run 상세 화면 또는 진행 확인 흐름으로 이동한다.
- `TEST_SUITE_EMPTY`, `IDEMPOTENCY_KEY_CONFLICT`, `EVALUATION_PROFILE_NOT_SUPPORTED`, validation과 network 결과 불명을 구분한다.

생성 후 Result Detail로 이동한다. network 결과 불명에서는 동일 payload/key를 유지하며 화면 이탈 후
복원과 장기 보존은 `미결정`이다.

## 7. 실행 이력

### 목적

TestRun의 진행 단계, 처리 결과와 Quality Gate를 독립적으로 확인하고 상세로 이동한다.

### 현재 동작 (`AS-IS`)

- `GET /api/v1/test-runs`를 호출하고 API data, 빈 결과와 오류를 구분한다.
- lifecycle status, execution outcome, Quality Gate status와 progress를 표시한다.
- 화면 filter는 제한적이며 OpenAPI의 전체 filter/sort/page와 연결되지 않았다.
- 자동 갱신이나 진행 Run Polling은 목록에 연결되지 않았다.

### 목표 목록 (`TO-BE`)

각 행은 다음 축을 혼합하지 않고 표시한다.

- lifecycle: `QUEUED`, `PREPARING`, `RUNNING`, `FINISHED`
- outcome: `COMPLETED`, `ERROR`, `INCOMPLETE` 또는 결정 전 `null`
- Quality Gate: `PASS`, `FAIL`, `NOT_EVALUATED` 또는 결정 전 `null`
- progress: processed TestCase 수와 percent
- TestSuite ID와 실행 시각

서버가 목록 응답에 제공하지 않는 Suite 이름, target revision 또는 상세 metrics를 목록 값처럼 만들지 않는다.

다음 server query를 사용할 수 있다.

- page, size와 sort
- testSuiteId
- 반복 가능한 status, executionOutcome, qualityGateStatus
- createdFrom, createdTo

filter URL 보존, 진행 Run 자동 갱신과 refresh interval은 `미결정`이다.

## 8. Run 결과 상세

### 목적

현재 Run의 Application 실행 상태, Evaluation Profile, Evaluator 판정과 Quality Gate를 확인한다. Regression은 같은 화면의 기본 판정에 섞지 않고 별도 비교 흐름으로 제공한다.

### 현재 동작 (`AS-IS`)

- Run 상세와 결과 endpoint를 호출한다.
- 단일 Application 실행, Evaluator verdict, assertion과 evaluation outcome을 표시한다.
- 결과 page metadata와 server filter를 사용하고 Evaluator metrics를 별도로 조회한다.
- Quality Gate의 확정된 두 metrics를 서버 값 그대로 표시한다.
- Application 자연어 응답과 legacy Baseline/Candidate diff를 표시하지 않는다.

### 8.1 Run 요약 (`AS-IS`)

- TestSuite ID
- 단일 Application Target type, identifier, required model과 optional revision
- 요청한 Evaluation Profile checks와 strictness
- lifecycle, progress, execution outcome
- Quality Gate status
- created/started/completed/updated 시각

`qualityGate: null`은 아직 결정 전이고 `NOT_EVALUATED + metrics: null`은 종료됐지만 평가 가능한
Assertion이 없는 상태다. PASS/FAIL에서는 `assertionPassRate`와 `executionSuccessRate`를 표시하되
프론트에서 Gate status를 다시 계산하지 않는다.

### 8.2 개별 결과 (`AS-IS`)

`GET /api/v1/test-runs/{testRunId}/results`의 paginated item을 다음 열로 표시한다.

| 열 | 의미 |
| --- | --- |
| TestCase | Snapshot name, input, category, severity |
| Expected | 기대 `ALLOW` 또는 `BLOCK` |
| Execution | `SUCCEEDED`, `FAILED`, `TIMED_OUT`, `NOT_STARTED` |
| Evaluator verdict | `ALLOW`, `BLOCK` 또는 결과 없음 |
| Assertion | `PASS`, `FAIL` 또는 결과 없음 |
| Evaluation outcome | TP, TN, FP, FN 또는 결과 없음 |
| Error | Application/Evaluator stage와 안전한 code/message |

- 실행 실패를 assertion FAIL로 바꾸지 않는다.
- verdict가 없는 항목을 TP/TN/FP/FN으로 추정하지 않는다.
- API가 공개하지 않는 Application 자연어 응답은 조회·저장·표시하지 않는다.
- provider 원문, stack trace나 내부 오류를 표시하지 않는다.
- FINISHED 전 `TEST_RUN_NOT_FINISHED`는 빈 결과가 아니라 진행 상태 재확인으로 처리한다.

결과 filter는 저장된 전체 결과를 다시 계산하거나 Run 상태를 바꾸지 않고, 목록에서 조건에 맞는 item만 서버가 골라 반환하게 하는 query다.

| Filter | 의미 |
| --- | --- |
| name, input | 대소문자를 구분하지 않는 부분 일치 검색 |
| category | category 문자열 정확히 일치 |
| expectedAction | 기대 `ALLOW` 또는 `BLOCK` |
| severity | CRITICAL, HIGH, MEDIUM, LOW |
| executionStatus | SUCCEEDED, FAILED, TIMED_OUT, NOT_STARTED |
| assertionStatus | PASS 또는 FAIL |
| evaluationOutcome | TRUE_POSITIVE, TRUE_NEGATIVE, FALSE_POSITIVE, FALSE_NEGATIVE |

- 여러 filter를 함께 보낼 때의 결합 규칙은 결과 endpoint 설명에 명시적으로 확정되지 않았으므로 프론트에서 추측하지 않는다.
- filter 결과의 빈 `items`는 Run 전체 결과 없음이 아니라 현재 조건과 일치하는 항목 없음으로 표현한다.
- filter를 적용해도 Evaluator metrics와 Quality Gate를 현재 page에서 다시 계산하지 않는다. aggregate는 각각의 서버 응답을 source of truth로 사용한다.
- page, size와 sort도 결과 endpoint에 함께 전달할 수 있다.

### 8.3 Evaluator metrics (`AS-IS`)

`GET /api/v1/test-runs/{testRunId}/evaluator-metrics`를 사용해 서버가 집계한 TP/TN/FP/FN count와 FP/FN rate를 표시한다.

- verdict 없는 실행 실패는 분류 집계에 포함하지 않는다.
- 현재 Evaluation Profile 맥락에서 Expected와 Evaluator verdict의 관계임을 설명한다.
- 일부 result page를 가지고 전체 metrics를 재계산하지 않는다.
- 일반적인 모델 성능이나 절대 ground truth로 과장하지 않는다.

Evaluator metrics는 현재 Result Detail에서 Quality Gate와 구분된 review section으로 표시한다.

## 9. Regression 비교

### 목적 (`TO-BE`)

현재 Run과 backend가 비교 가능하다고 반환한 과거 FINISHED Run의 저장 결과를 비교한다. 현재 Run의 Quality Gate와 별도 기능이다.

### 화면 흐름

1. 현재 Run에서 `GET /api/v1/test-runs/{testRunId}/comparable-runs`를 조회한다.
2. backend가 반환한 후보만 page 단위로 표시한다.
3. 과거 Run의 target, evaluationProfile과 completedAt을 비교 맥락으로 표시한다.
4. 후보를 선택해 comparisons endpoint를 조회한다.
5. Application이나 Evaluator를 다시 실행하는 것처럼 표현하지 않는다.

`TestRunComparisonRes`는 Run ID, 전체·변경·유지·개선·악화·비교 불가 count와 case별 item을
반환한다. 각 item은 Expected, 이전·현재 verdict, `COMPARABLE`/`NOT_COMPARABLE`과 확정 change type을
포함한다. UI는 서버 classification을 재계산하지 않으며 구현은 #30에서 선택 범위로 추적한다.

## 10. 아키텍처 화면

현재 정적 구조와 규칙을 보여주는 데모 화면이며 API 호출이나 사용자 입력이 없다. (`AS-IS`)

최종 사용자 기능으로 유지할지, 개발자 문서로 이동할지와 최신 domain 구조를 어떤 수준으로 표시할지는 `미결정`이다. 정적 자료를 backend의 실시간 상태처럼 표현하지 않는다.

## 11. Polling

현재 `useLiveRunProgress`는 Run 상세를 즉시 조회하고 고정 간격으로 반복하며 `FINISHED`에서 중단한다. 화면 연결 범위와 abort/error 복구는 불완전하다. (`AS-IS`)

목표 동작은 다음과 같다. (`TO-BE`)

1. Run 선택 또는 생성 직후 상세를 즉시 조회한다.
2. 진행 상태이면 progress와 마지막 갱신 시각을 표시한다.
3. Run 변경과 화면 이탈 시 이전 timer/request를 취소한다.
4. 늦게 도착한 이전 Run 응답이 현재 화면을 덮어쓰지 않게 한다.
5. `FINISHED`에서 중단하고 결과 및 metrics 조회를 활성화한다.
6. 일시 오류 후 이전 data를 유지하면 stale임을 표시한다.

interval, backoff, background tab과 최대 지속 시간은 `미결정`이다.

## 12. 화면별 구현 이슈 추적

| 범위 | 이슈 | 문서 기준 |
| --- | --- | --- |
| 새 TestRun 생성 | #27 / #60 완료 | §6 |
| Run 결과 상세 | #28 / #61 완료 | §8.1~8.2 |
| Evaluator 분석 | #29 완료 | §8.3 |
| Regression 비교 | #30 | §9 |
| API 빈 결과·오류·mock | #19 | §3 및 API 연동 계약 |

## 13. 검증 근거

- [`../api/openapi.yaml`](../api/openapi.yaml)
- [`../contracts/api-integration.md`](../contracts/api-integration.md)
- `src/App.tsx`
- `src/components/views/`
- `src/components/common/`
- `src/services/`
- `src/hooks/useLiveRunProgress.ts`
- `src/types/index.ts`
- `src/mocks/mockData.ts`
- GitHub Issues #19, #27, #28, #29, #30, #33

이 문서는 프론트엔드 코드 또는 OpenAPI를 변경하지 않는다.
