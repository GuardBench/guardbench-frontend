# 프론트엔드 사용자 흐름

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-09-04
> Scope: GitHub Issues #33, #62, #72, #86
> Implementation baseline: PR #88 (`agent/72-regression-result-detail-docs`)
> #86 갱신: 단일 Target 생성 계약과 결과·회귀 화면의 평가 정책 metadata 제거를 반영한다.
> Canonical API: [`../api/openapi.yaml`](../api/openapi.yaml) (`APPROVED`)
> Screen specification: [`screen-spec.md`](screen-spec.md)
> API consumption contract: [`../contracts/api-integration.md`](../contracts/api-integration.md)

이 문서는 TestSuite 준비부터 Application TestRun 실행, Evaluator 결과 검토와 Regression 비교까지 사용자의 목표와 상태 전이를 연결한다. Regression comparison 기능과 Backend comparison API 소비는 MVP 필수이며, Result Detail은 요약/진입점만 제공하고 상세 비교는 별도 Regression Detail 화면에서 수행한다. API schema를 복제하지 않고 최신 OpenAPI의 endpoint와 schema를 참조한다.

## 1. 읽는 방법

| 표기 | 의미 |
| --- | --- |
| `AS-IS` | 기준 구현에서 관찰되는 현재 흐름 |
| `TO-BE` | OpenAPI에서 직접 도출되는 승인된 목표 흐름 |
| `미결정` | 별도 제품·UI Decision이 필요한 흐름 |

각 단계의 data 출처는 실제 `API`, 명시적 `demo/mock`, `local UI state`로 구분한다. API 실패 또는 실제 빈 결과를 mock 성공으로 바꾸지 않는다.

## 2. 전체 사용자 여정

```mermaid
flowchart TD
    A[TestSuite 확인] --> B[TestCase 준비]
    B --> C[새 테스트 실행]
    C --> D[Application HTTP Target 입력]
    D --> F[POST TestRun]
    F -->|202 Accepted| G[Run 상세 즉시 조회]
    G -->|QUEUED / PREPARING / RUNNING| H[진행률 Polling]
    H --> G
    G -->|FINISHED| I[Outcome과 Quality Gate 확인]
    I --> J[개별 Evaluator 결과 조회]
    J --> K[TP/TN/FP/FN metrics 검토]
    I --> L[Regression 요약/진입점]
    L -->|비교 가능 Run 있음| M[회귀 상세 보기]
    M --> N[Regression Detail]
    N --> O[Comparable Runs 조회]
    O --> P[Historical Run 선택]
    P --> Q[Regression summary와 변화 case 확인]
    L -->|비교 가능 Run 없음| R[현재 Run 검토 종료]
```

필수 핵심 흐름은 하나의 Application Target을 실행하고 관측된 동작과 assertion을 확인하는 것이다. Regression은 현재 Run의 Quality Gate 입력이 아니며, 사용자가 필요할 때 과거 comparable Run과 별도로 비교한다. 이 비교 기능 자체와 comparison API 소비는 MVP 필수다.

현재 구현은 Suite/TestCase 관리, Target/Profile Run 생성, Polling, 결과와 Evaluator metrics 검토, comparable Run 조회와 저장 결과 비교까지 API에 연결한다. Result Detail에는 `RegressionSummaryEntry`가 있고, 상세 비교는 `RegressionDetailView`에서 수행한다. (`AS-IS`)

## 3. TestSuite와 TestCase 준비

### 사용자 목표

실행할 TestSuite를 선택할 수 있고, 해당 Suite에 최소 한 개의 활성 TestCase가 있도록 준비한다.

### 3.1 Suite 목록 확인

```mermaid
flowchart TD
    A[테스트 스위트 진입] --> B[GET test-suites]
    B -->|items 있음| C[Suite card와 page 표시]
    B -->|items 비어 있음| D[실제 빈 상태와 생성 action]
    B -->|오류| E[오류와 재시도]
    C --> F[Suite 선택]
    F --> G[TestCase 관리 진입]
```

- API 성공의 빈 `items`는 등록된 Suite가 없는 상태다.
- 이전 data를 보여주며 갱신이 실패하면 stale임을 함께 표시한다.
- API에 없는 pass rate, status와 last run을 서버 값처럼 만들지 않는다.

### 3.2 Suite 생성·수정

| action | 정상 종료 | 오류 분기 |
| --- | --- | --- |
| 생성 | POST 성공 data를 목록에 반영하거나 재조회 | validation field, network/API 오류를 form에 유지 |
| 상세 | GET 성공 data 표시 | 미존재와 일시 오류 구분 |
| 수정 | PATCH 성공 후 변경된 field 반영 | validation 실패 시 원래 server state를 성공으로 덮지 않음 |

Suite 삭제 endpoint는 OpenAPI에 없으므로 목표 사용자 흐름에 포함하지 않는다.

Suite 생성은 다음 두 정상 흐름을 지원한다.

1. `testCases`를 생략하거나 `null`, 빈 배열로 보내 빈 Suite를 먼저 생성한다.
2. 초기 TestCase를 함께 보내 Suite와 원자적으로 생성한다. 초기 TestCase 하나라도 validation에 실패하면 부분 생성 없이 전체 요청이 실패한다.

현재 MVP 화면에서는 Suite 이름만으로 생성할 수 있고, 선택한 초기 TestCase는 단건 입력 또는 JSON 배열 붙여넣기·UTF-8 CSV 업로드로 최대 1,000건까지 같은 요청에 포함한다. 생성 후 TestCase 추가·수정은 공통 TestCase 관리 흐름을 사용한다.

### 3.3 TestCase 조회·변경

1. Suite를 선택하면 TestCase 목록을 조회한다.
2. 존재하는 Suite가 `200`과 빈 `items`를 반환한 상태, `404 TEST_SUITE_NOT_FOUND`, 그 밖의 조회 오류를 구분한다.
3. 생성·수정 validation detail을 관련 field에 표시한다.
4. 삭제는 `204 No Content`가 확인된 뒤 현재 목록에서 제거하거나 재조회한다.
5. 삭제 실패 시 성공 toast를 표시하거나 항목 제거를 확정하지 않는다.
6. 현재 TestCase 변경과 무관하게 과거 Run의 TestCaseSnapshot 결과는 유지된다.

### 실행 가능 조건

활성 TestCase가 없는 Suite로 Run을 만들면 서버는 `TEST_SUITE_EMPTY`로 접수를 거부한다. 프론트는 이 응답을 network 실패와 구분하고 TestCase 준비 흐름으로 돌아갈 수 있게 한다.

## 4. TestRun 생성

### 사용자 목표 (`TO-BE`)

TestSuite와 테스트할 Application을 선택하고 실행 요청을 중복 없이 접수한다.

### 4.1 입력 흐름

```mermaid
flowchart TD
    A[새 테스트 실행 진입] --> B[TestSuite 목록 조회]
    B -->|없음| C[Suite 준비 안내]
    B -->|오류| D[오류와 재시도]
    B -->|선택 가능| E[Suite 선택]
    E --> F[Application URL 입력]
    F --> G[필수 model 입력]
    G --> H[선택 revision 입력]
    H --> K[실행 요약 확인]
    K --> L{client validation}
    L -->|실패| M[관련 control 오류]
    L -->|통과| N[POST test-runs]
```

사용자 언어는 다음 의미를 유지한다.

- **Application**: 테스트할 AI 애플리케이션
- **Application URL**: GuardBench가 호출할 OpenAI-compatible Chat Completions full endpoint
- **Model**: Application request body에 전달할 필수 모델 식별자
- **Revision**: 사용자가 배포·모델·commit을 구분하기 위한 선택 정보

TestCase의 기대 동작과 Backend가 관측한 동작을 비교하며, 사용자는 판정 모델이나 prompt를 설정하지 않는다.

사용자가 Evaluator provider/type, Guardrail identifier/version이나 Snapshot ID를 직접 입력하지 않는다.

### 4.2 현재 흐름 (`AS-IS`)

현재 화면은 Suite 목록을 API로 조회하고 `testSuiteId`와 URL/model/revision을 가진 단일 `target`을 최신 `TestRunCreateReq`로 전송한다. 접수 성공 시 Run 상세로 이동하며 결과 불명 network 오류에서는 동일 payload와 Idempotency-Key를 유지한다.

### 4.3 접수와 멱등성 (`AS-IS`)

1. 한 논리적 제출 시도에 하나의 Idempotency-Key를 연결한다.
2. 사용자가 제출하면 같은 key와 request body로 한 번 접수한다.
3. `202 Accepted`를 받으면 실행 완료가 아니라 안전한 접수 성공으로 표시한다.
4. 현재는 response의 Run ID로 상세 조회에 이동한다. Location header 보존은 남은 계약 격차다.
5. 응답을 받지 못해 결과가 불명확한 경우 동일 body 재전송에 같은 key를 사용한다.
6. 다른 body에 같은 key를 재사용하지 않는다.

현재 key는 payload fingerprint별로 메모리에 보존하며 network 결과 불명에서 재사용하고 성공 또는 명시적 서버 거부 후 폐기한다. 화면 이탈 후 복원과 장기 보존은 `미결정`이다.

### 4.4 생성 오류 분기

| 상황 | 의미 | 다음 행동 |
| --- | --- | --- |
| validation | Suite, URL, model 또는 revision 오류 | 관련 control에 detail 표시 |
| `TEST_SUITE_NOT_FOUND` | 선택 Suite가 더 이상 존재하지 않음 | Suite 목록 재조회 |
| `TEST_SUITE_EMPTY` | 활성 TestCase가 없음 | TestCase 준비로 이동 |
| `IDEMPOTENCY_KEY_CONFLICT` | 같은 key를 다른 body에 재사용 | 자동 재시도 중단, 새 논리 시도 안내 |
| network/timeout | 접수 여부가 불명확할 수 있음 | 같은 key 재사용 정책에 따라 확인·재시도 |

취소 전송의 보장, timeout 값과 자동 retry는 OpenAPI만으로 정하지 않는다.

## 5. Run 진행 확인

### 사용자 목표

접수된 Run이 어느 단계인지 확인하고 완료 또는 오류 종료까지 상태를 잃지 않는다.

### 상태 축

| 축 | 값 | 흐름에서의 역할 |
| --- | --- | --- |
| lifecycle `status` | QUEUED, PREPARING, RUNNING, FINISHED | Polling 지속·종료 |
| `executionOutcome` | COMPLETED, ERROR, INCOMPLETE, null | 처리 종료 결과 |
| Quality Gate | PASS, FAIL, NOT_EVALUATED, null | 현재 Run assertion 집계 판정 |

`FINISHED`는 성공만을 의미하지 않는다. ERROR 또는 INCOMPLETE로 종료될 수 있으며 Gate FAIL도 HTTP 조회 실패가 아니다.

### Polling 흐름 (`TO-BE`)

```mermaid
stateDiagram-v2
    [*] --> ImmediateFetch
    ImmediateFetch --> Polling: QUEUED / PREPARING / RUNNING
    Polling --> Polling: detail 갱신
    Polling --> Finished: status = FINISHED
    ImmediateFetch --> Finished: status = FINISHED
    ImmediateFetch --> RecoverableError: 일시 조회 오류
    Polling --> RecoverableError: 일시 조회 오류
    RecoverableError --> ImmediateFetch: 사용자 또는 정책상 재시도
    ImmediateFetch --> NotFound: TEST_RUN_NOT_FOUND
    Finished --> [*]
    NotFound --> [*]
```

1. 생성 또는 Run 선택 직후 상세를 한 번 조회한다.
2. 진행 상태이면 processed count, percent와 updatedAt을 표시한다.
3. 같은 Run의 다음 조회를 예약한다.
4. Run 변경 또는 화면 이탈 시 이전 timer/request를 취소한다.
5. 늦게 도착한 이전 응답을 현재 Run에 적용하지 않는다.
6. FINISHED에서 Polling을 중단한다.

일시 오류 허용 횟수, backoff, background tab, 최대 대기와 수동 재시도 배치는 `미결정`이다.

## 6. 현재 Run 결과 검토

### 사용자 목표

Run의 처리 신뢰도와 Quality Gate를 확인하고 TestCaseSnapshot별 Evaluator 판정을 검토한다. Regression은 현재 Run 해석과 섞지 않고 Result Detail의 요약/진입점에서 별도 분석 화면으로 이동한다.

### 6.1 상세 요약

FINISHED 전후에 다음 정보를 표시한다.

- TestSuite ID와 Run ID
- Application Target URL, required model과 optional revision
- lifecycle와 progress
- execution outcome
- Quality Gate status
- 실행 관련 시각

`qualityGate: null`은 결정 전이며 `NOT_EVALUATED + metrics: null`은 종료됐지만 평가 가능한 Assertion이 없는 상태다. PASS/FAIL에서는 서버의 `assertionPassRate`와 `executionSuccessRate`를 표시하고 Gate를 프론트에서 재계산하지 않는다.

### 6.2 개별 결과 조회

```mermaid
flowchart TD
    A[Run 상세] --> B{status FINISHED?}
    B -->|아니오| C[상세 Polling 유지]
    B -->|예| D[GET results]
    D -->|items 있음| E[실행·Verdict·Assertion 표시]
    D -->|filter 결과 없음| F[조건에 맞는 결과 없음]
    D -->|TEST_RUN_NOT_FINISHED| C
    D -->|오류| G[오류와 재시도]
```

각 결과에서 다음을 구분한다.

- TestCaseSnapshot의 input과 Expected
- Application/Evaluator 처리의 execution status
- Evaluator verdict
- Expected와 verdict의 assertion
- TP/TN/FP/FN evaluation outcome
- Application Target 또는 Evaluator failure stage와 안전한 오류

Application 자연어 응답은 현재 public API에 없으며 프론트엔드는 원문을 조회·저장·표시하지 않는다. 관리자 또는 배포 전 테스트라는 이유만으로 공개하지 않는다.

### 6.3 결과 해석

| Expected | Verdict | Outcome | Assertion |
| --- | --- | --- | --- |
| BLOCK | BLOCK | TRUE_POSITIVE | PASS |
| BLOCK | ALLOW | FALSE_NEGATIVE | FAIL |
| ALLOW | BLOCK | FALSE_POSITIVE | FAIL |
| ALLOW | ALLOW | TRUE_NEGATIVE | PASS |

verdict가 없으면 assertion과 outcome도 `null`일 수 있다. 실행 실패를 FALSE_POSITIVE/FALSE_NEGATIVE 또는 assertion FAIL로 추정하지 않는다.

### 6.4 결과 filter와 빈 상태

filter는 저장된 Run 결과를 다시 실행하거나 재평가하지 않고, 조건에 맞는 결과 item만 server-side로 조회한다.

- name과 input: 부분 일치 검색
- category, expected action과 severity: TestCaseSnapshot 속성으로 제한
- execution status: 실패, timeout, 미시작 등 실행 처리 상태로 제한
- assertion status: PASS 또는 FAIL로 제한
- evaluation outcome: TP, TN, FP 또는 FN으로 제한

예를 들어 `evaluationOutcome=FALSE_NEGATIVE`는 Expected가 BLOCK이지만 Evaluator verdict가 ALLOW인 저장 결과만 조회한다. filter 결과가 비어 있으면 “현재 조건과 일치하는 결과 없음”으로 표시하며 Run 전체 결과 없음과 구분한다.

filter가 적용된 현재 page로 전체 TP/TN/FP/FN metrics나 Quality Gate를 다시 계산하지 않는다. 전체 집계는 evaluator-metrics와 Run 상세 응답을 source of truth로 사용한다.

### 6.5 현재 구현 (`AS-IS`)

현재 결과 화면은 단일 Application execution, Evaluator verdict, assertion, outcome과 안전한 오류를 표시한다. 결과 filter/page, Evaluator metrics와 Quality Gate는 각 서버 응답을 독립적으로 사용한다.

`RegressionSummaryEntry`는 `GET /api/v1/test-runs/{testRunId}/comparable-runs`로 baseline을 고르고 case-level `items`가 없는 comparison summary endpoint에서 변화 집계를 조회한다. 비교 가능한 Run이 있으면 `회귀 상세 보기` action을 제공하며, 전체 comparison payload와 table은 Regression Detail 진입 전에는 불러오거나 표시하지 않는다.

## 7. Evaluator 분석

### 사용자 목표 (`AS-IS`)

관측된 Evaluator verdict가 TestCase의 Expected와 어떻게 일치했는지 aggregate 관점에서 검토한다.

1. FINISHED Run에서 evaluator-metrics endpoint를 조회한다.
2. 서버가 반환한 TP/TN/FP/FN count를 표시한다.
3. 분모가 없는 경우 `null`일 수 있는 FP/FN rate를 0으로 바꾸지 않는다.
4. false positive/negative 항목을 보고 싶으면 결과 endpoint의 evaluation outcome filter를 사용한다.
5. result page 일부에서 전체 metrics를 다시 계산하지 않는다.

이 분석은 현재 TestCase Expected를 기준으로 한 결과이지 모델의 보편적 정확도나 절대 ground truth가 아니다. verdict 없는 실행 실패는 metrics에서 제외한다. 현재 Result Detail 안에서 제공한다.

## 8. 과거 Run과 Regression 비교

### 사용자 목표 (`AS-IS`)

Result Detail에서 Regression의 존재를 빠르게 인지한 뒤, 별도 Regression Detail 화면으로 이동해 현재 Run과 backend가 comparable로 판정한 과거 FINISHED Run의 저장 결과를 비교한다.

```mermaid
flowchart TD
    A[현재 FINISHED Run Result Detail] --> B[GET comparable-runs 요약 조회]
    B -->|items 없음| C[비교 가능한 과거 Run 없음]
    B -->|items 있음| D[회귀 상세 보기]
    D --> E[Regression Detail]
    E --> F[GET comparable-runs]
    F --> G[과거 Run 선택]
    G --> H[GET comparisons]
    H -->|성공| I[Regression summary 확인]
    I --> J[변화 case 우선 탐색]
    J --> K[Expected와 Previous/Current verdict 비교]
    H -->|TEST_RUNS_NOT_COMPARABLE| L[비교 조건 변경 안내]
    H -->|TEST_RUN_NOT_FINISHED| M[Run 상태 재확인]
```

### Result Detail 책임

- 현재 Run 자체의 실행 결과와 Quality Gate를 우선한다.
- Regression은 `RegressionSummaryEntry`로 요약/진입점만 제공한다.
- comparable Run이 존재하는지 확인한다.
- 전체 comparison table이나 case-level 변화 분석은 렌더링하지 않는다.

### Regression Detail 책임

- 프론트는 같은 Suite라는 이유로 후보를 추가하지 않는다.
- Application target URL/model/revision은 비교 축이므로 후보마다 달라도 될 수 있다.
- Application Target과 완료 시각은 사용자 맥락으로 표시하지만 실제 comparability 판정은 backend가 소유한다.
- 비교 중 Application이나 Evaluator를 다시 호출하지 않는다.
- Quality Gate와 Regression을 하나의 PASS/FAIL로 합치지 않는다.
- summary의 changed/unchanged/regressed/improved/notComparable 값을 서버 값 그대로 사용한다.
- case-level `changeType`과 `comparabilityStatus`를 재계산하지 않는다.
- changed-only filter를 사용해 변화 case를 먼저 볼 수 있다. 향후 tab/filter 표현이 바뀌어도 Regression/Improvement/변화 우선 탐색이라는 목적은 유지한다.
- 한 case에서 Expected, Previous verdict, Current verdict, comparability와 change type을 같은 상세 맥락에서 확인한다.
- 현재 데이터만으로 가능한 경우 `ALLOW → BLOCK`, `BLOCK → ALLOW` 같은 action transition을 보조 표현으로 사용할 수 있으나 이를 위해 신규 backend API를 요구하지 않는다.

comparison response는 `SECURITY_REGRESSION`, `USABILITY_REGRESSION`, `IMPROVEMENT`, `POLICY_BEHAVIOR_CHANGED`, `NO_CHANGE`를 확정해서 반환한다. 프론트는 서버 값을 그대로 사용한다.

Regression Detail은 Result Detail의 drill-down 화면이다. 현재 앱은 local view state를 사용하므로 `regression` view로 전환하며, 이 작업을 위해 새 routing library를 도입하지 않는다.

## 9. 공통 예외와 복구

| 상황 | 사용자에게 보여줄 상태 | 금지되는 처리 |
| --- | --- | --- |
| API 성공 + empty | 실제 빈 결과와 관련 CTA | mock 성공 data 대체 |
| validation | field별 오류와 입력 유지 | 일반 실패 toast만 표시 |
| 404 | 리소스 미존재와 돌아갈 경로 | stale data를 최신으로 표시 |
| 409 not finished | 진행 상태 재확인 | 결과 없음으로 확정 |
| 409 not comparable | 비교 불가와 후보 재선택 | 프론트에서 비교 강행 |
| network/timeout | 결과 불명·재시도 가능성 | 명시적 서버 거부로 단정 |
| request abort | 조용한 취소와 이전 응답 폐기 | 실패 toast |
| refresh error | 이전 data + stale 표시 | 이전 data를 최신으로 표시 |

## 10. 화면과 API 추적표

| 사용자 목표 | 화면 | Endpoint | 구현 상태 |
| --- | --- | --- | --- |
| Suite 목록·생성 | 테스트 스위트 | `GET/POST /api/v1/test-suites` | 부분 구현 |
| Suite 상세·수정 | 테스트 스위트 | `GET/PATCH /api/v1/test-suites/{suiteId}` | UI 일부 미구현 |
| TestCase 목록·생성 | TestCase 관리 | `GET/POST /api/v1/test-suites/{suiteId}/test-cases` | 부분 구현 |
| TestCase 상세·수정·삭제 | TestCase 관리 | `GET/PATCH/DELETE /api/v1/test-cases/{testCaseId}` | 수정 UI 일부 미구현 |
| Run 생성 | 새 테스트 실행 | `POST /api/v1/test-runs` | 최신 Target/Profile 계약 구현, #60 |
| Run 이력 | 실행 이력 | `GET /api/v1/test-runs` | 기본 조회 구현, filter/page 미완성 |
| Run 진행·요약 | 결과 상세 | `GET /api/v1/test-runs/{testRunId}` | 구현 |
| 개별 결과 | 결과 상세 | `GET /api/v1/test-runs/{testRunId}/results` | 구현 |
| Evaluator metrics | Evaluator 분석 | `GET /api/v1/test-runs/{testRunId}/evaluator-metrics` | 구현 |
| Regression 진입 가능 여부 | Result Detail summary entry | `GET /api/v1/test-runs/{testRunId}/comparable-runs` | 구현, #72/PR #88 |
| 비교 후보 | Regression Detail | `GET /api/v1/test-runs/{testRunId}/comparable-runs` | 구현, #30/PR #71 재사용 |
| Run 비교 | Regression Detail | `GET /api/v1/test-runs/{currentRunId}/comparisons/{comparisonRunId}` | 구현, #30/PR #71 재사용 |

## 11. 미결정 사항

- Run 생성 후 기본 이동 화면과 navigation 복원
- Idempotency-Key 생성·저장·폐기 정책
- Polling interval, retry, backoff와 background 동작
- pagination/filter의 URL 보존
- error code별 최종 사용자 문구
- Evaluator 분석의 tab/별도 화면 배치
- Regression Detail의 세부 시각적 표현과 action transition 표시 방식
- report/export 범위

Application 자연어 응답 비공개는 미결정 사항이 아니라 현재 확정된 정책이다.

## 12. 검증 근거

- [`../api/openapi.yaml`](../api/openapi.yaml)
- [`screen-spec.md`](screen-spec.md)
- [`../contracts/api-integration.md`](../contracts/api-integration.md)
- `src/App.tsx`
- `src/components/views/ResultDetailView.tsx`
- `src/components/views/RegressionSummaryEntry.tsx`
- `src/components/views/RegressionDetailView.tsx`
- `src/components/views/RegressionComparisonSection.tsx`
- `src/components/common/`
- `src/services/regressionService.ts`
- `src/services/`
- `src/hooks/useLiveRunProgress.ts`
- GitHub Issues #19, #27, #28, #29, #30, #33, #72
- GitHub PR #71, #88

이 문서는 OpenAPI 계약을 변경하지 않는다.
