# 프론트엔드 API 연동 계약

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-09-04
> Scope: GitHub Issues #32, #62, #72
> AS-IS baseline: `main@39c74d6efc355665516b3069fbe538f18d327d24`
> Canonical API: [`../api/openapi.yaml`](../api/openapi.yaml) (`APPROVED`)

이 문서는 GuardBench 프론트엔드가 승인된 OpenAPI를 화면에서 소비하는 경계를 정의한다. API endpoint, schema, enum, validation과 오류 code의 소유자는 OpenAPI다. 이 문서는 schema를 다시 정의하지 않고 DTO를 화면 상태로 변환하는 원칙과 사용자 표현 책임만 소유한다.

## 1. 판단 기준

- `TO-BE`는 현재 저장소의 [`openapi.yaml`](../api/openapi.yaml)에서 직접 도출할 수 있는 소비 규칙이다.
- 현재 코드가 OpenAPI와 다르면 코드 동작을 `AS-IS` 불일치로 기록하며 목표 계약으로 승격하지 않는다.
- OpenAPI가 확정하지 않은 실행 오류 code 전체 목록, 재시도 또는 인증 정책은 프론트엔드가 추측하지 않는다.
- 특정 provider, Evaluator type 또는 Guardrail identifier/version은 사용자가 제출하는 TestRun 입력이 아니다.
- 다른 문서와 이 문서가 충돌하면 API 요청·응답 의미는 OpenAPI를 우선한다.

## 2. 실행 모델 변경

최신 계약에서 하나의 TestRun은 하나의 HTTP AI Application Target을 실행하고, 사용자가 요청한 inline Evaluation Profile을 GuardBench가 내부 Evaluator 설정으로 해석한다. 같은 Run 안에서 Baseline과 Candidate Guardrail을 동시에 실행하는 모델은 더 이상 승인된 계약이 아니다.

| 영역 | 폐기된 모델 | 현재 OpenAPI와 구현 |
| --- | --- | --- |
| 생성 입력 | Baseline numbered Guardrail + Candidate DRAFT | 단일 `TargetReferenceReq` + `EvaluationProfileReq` |
| 사용자 선택 | Guardrail ID/version | OpenAI-compatible HTTP endpoint, 필수 model, 선택 revision, checks, strictness |
| 상세 Target | `targets.baseline`, `targets.candidate` | 단일 `target` |
| 개별 결과 | baseline/candidate execution과 change type | Application 실행 상태, Evaluator verdict, assertion, evaluation outcome |
| Quality Gate metrics | 고정 regression 지표 타입 | `assertionPassRate`, `executionSuccessRate` 또는 `null` |
| Regression | 현재 Run 안에서 변화 계산 | 비교 가능한 과거 Run과 저장 결과를 별도 endpoint로 비교 |

핵심 생성·결과·Evaluator 구현은 #27~#29와 #60~#61에서 완료됐다. Regression comparison API 소비도 #30/PR #71에서 Result Detail 내부 section으로 구현됐으며, 별도 Regression 전용 page만 Optional이다.

### 2.1 사용자가 선택하는 실행·평가 입력

사용자 선택은 **무엇을 실행할지**와 **어떤 정책으로 평가할지**의 두 부분으로 나뉜다.

| 입력 | 사용자가 정하는 의미 | 계약상 제약 | 화면 표현 원칙 |
| --- | --- | --- | --- |
| Application HTTP endpoint | 테스트할 AI Application의 호출 주소 | `target.type`은 MVP에서 `HTTP_ENDPOINT`이고 `identifier`는 `http://` 또는 `https://` URI여야 한다. | “Application URL”처럼 사용자 목적에 맞는 이름을 사용한다. 내부 TargetReference나 provider 용어를 입력 라벨로 강제하지 않는다. |
| model | OpenAI-compatible Chat Completions request body에 전달할 모델 식별자 | request와 response에서 필수이며 공백이 아닌 문자열이어야 한다. | Application이 인식하는 모델 식별자로 설명한다. Evaluator provider나 Guardrail ID와 혼동하지 않는다. |
| revision | 사용자가 실행 대상을 구분하기 위한 배포·모델·commit 식별 문자열 | request에서는 선택 사항이다. 전달할 때는 공백이 아닌 문자열이어야 하며, 생략하면 response의 `target.revision`은 `null`이다. | endpoint가 같아도 배포 버전을 구분하고 싶을 때 입력한다. 서버가 검증하거나 해석한 실제 버전이라고 과장하지 않는다. |
| checks | 이번 Run에서 확인할 보안 평가 목적 | 최소 한 개를 선택하고 중복할 수 없다. 허용 값은 `PROMPT_INJECTION`, `PII_LEAKAGE`, `HARMFUL_CONTENT`다. | 복수 선택 control로 제공하되 OpenAPI에 없는 check를 프론트에서 추가하지 않는다. |
| strictness | 선택한 checks를 어느 엄격도로 평가할지 정하는 정책 | `RELAXED`, `STANDARD`, `STRICT` 중 정확히 하나다. | 사용자 정책 수준으로 표현한다. 특정 Evaluator provider의 threshold나 Guardrail version을 직접 선택하는 값으로 설명하지 않는다. |

`checks`와 `strictness`는 독립 리소스 ID가 아니라 TestRun 요청에 포함되는 inline `evaluationProfile`이다. GuardBench가 이 profile을 실제 Evaluator 설정으로 해석한다. 따라서 프론트엔드는 사용자가 특정 Evaluator type/provider나 Guardrail identifier/version을 직접 선택한 것처럼 표시하거나 request에 추가하지 않는다.

### 2.2 Quality Gate와 metrics의 nullable 구조

Quality Gate에는 서로 다른 두 종류의 `null`이 있다.

| 응답 상태 | 의미 | UI 처리 |
| --- | --- | --- |
| `qualityGate: null` | Run이 아직 진행 중이거나 Gate가 아직 결정되지 않았다. | `NOT_EVALUATED`로 바꾸지 않고 “평가 진행 전/결정 전” 상태로 표현한다. |
| `qualityGate.status: NOT_EVALUATED`, `metrics: null` | Run은 종료됐지만 Gate를 계산할 수 없었다. | 종료된 평가 불가 상태로 표현하고 진행 중 상태와 구분한다. |
| `qualityGate.status: PASS` 또는 `FAIL` | 현재 Run의 assertion 집계를 바탕으로 Gate가 결정됐다. | PASS/FAIL 상태는 표시할 수 있지만 metrics의 세부 카드 구성은 확정된 필드만 사용한다. |

`QualityGateRes.metrics`는 필드 자체는 required지만 값은 nullable이다. 값이 있으면
`additionalProperties: false`인 객체이며 `assertionPassRate`와 `executionSuccessRate` 두 필드를 모두
포함한다. 두 값은 0~1의 서버 저장 비율이다. OpenAPI는 두 비율이 각각 0.95 이상이면 PASS,
하나라도 미만이면 FAIL이라고 정의한다.

따라서 프론트엔드는 다음을 지킨다.

- `status`와 두 metrics는 서버 응답을 source of truth로 사용한다.
- 비율은 퍼센트로 formatting할 수 있지만 Gate status를 프론트에서 다시 계산하지 않는다.
- 기존 `candidateAssertionPassRate`, `securityRegressionRate`, `usabilityRegressionRate`를 새 계약으로 재사용하지 않는다.
- `metrics: null`을 0% 객체로 바꾸거나 누락된 key를 추정하지 않는다.

## 3. 화면과 endpoint 추적

| 사용자 목표 | 화면 | Endpoint | 소비 원칙 |
| --- | --- | --- | --- |
| Suite 목록·생성 | 테스트 스위트 | `GET/POST /api/v1/test-suites` | `items`와 `page`를 함께 보존하고 validation detail을 form에 연결한다. |
| Suite 상세·수정 | 테스트 스위트 | `GET/PATCH /api/v1/test-suites/{suiteId}` | API에 없는 상태, 통과율 또는 최근 실행을 서버 값처럼 만들지 않는다. |
| TestCase 목록·생성 | TestCase 관리 | `GET/POST /api/v1/test-suites/{suiteId}/test-cases` | 빈 collection과 Suite 미존재를 구분한다. |
| TestCase 상세·수정·삭제 | TestCase 관리 | `GET/PATCH/DELETE /api/v1/test-cases/{testCaseId}` | 삭제는 `204 No Content`로 처리하며 성공 전 로컬 제거를 확정하지 않는다. |
| Run 생성 | 새 테스트 실행 | `POST /api/v1/test-runs` | 단일 Target과 inline Evaluation Profile을 전송한다. |
| Run 이력 | 실행 이력 | `GET /api/v1/test-runs` | lifecycle, outcome, Gate를 독립 축으로 표시하고 서버 filter/page를 사용한다. |
| Run 진행·요약 | 결과 상세 또는 실행 이력 | `GET /api/v1/test-runs/{testRunId}` | 즉시 조회 후 `FINISHED`까지 Polling한다. |
| 개별 평가 결과 | 결과 상세 | `GET /api/v1/test-runs/{testRunId}/results` | `FINISHED` 이후 조회하고 실행·평가·assertion 상태를 분리한다. |
| Evaluator 분류 지표 | Evaluator 검토 | `GET /api/v1/test-runs/{testRunId}/evaluator-metrics` | 서버가 집계한 TP/TN/FP/FN과 rate를 source of truth로 사용한다. |
| 비교 후보 | Result Detail Regression section | `GET /api/v1/test-runs/{testRunId}/comparable-runs` | Backend가 반환한 candidate만 표시하고 프론트에서 비교 가능 조건을 재구현하지 않는다. |
| 저장 결과 비교 | Result Detail Regression section | `GET /api/v1/test-runs/{currentRunId}/comparisons/{comparisonRunId}` | 서버 summary count와 case별 comparability/change type을 그대로 사용하고 변화 case를 우선 탐색한다. |

대시보드와 아키텍처 화면에는 전용 API가 없다. 정적 또는 mock 자료를 실제 서버 집계나 최신 도메인 상태로 표현하지 않는다.

## 4. 공통 API 경계

공통 API 경계는 화면이 HTTP 세부사항이나 backend DTO에 직접 의존하지 않게 하는 층이다. 책임은 다음 방향으로 흐른다.

```text
View / Form
  → endpoint service
  → API DTO ↔ UI model mapper
  → common API client
  → GuardBench REST API
```

각 단계는 자신보다 아래 단계의 책임을 중복하지 않는다. 예를 들어 view가 success envelope를 직접 unwrap하거나, 공통 client가 `FALSE_NEGATIVE`의 화면 문구를 결정하거나, mapper가 서버에 없는 값을 만들어서는 안 된다.

### 4.1 계층별 책임

| 계층 | 소유 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| View / Form | 입력, loading/empty/error/stale 표시, 사용자 action과 접근성 | URL 조합, envelope parsing, backend schema 재정의 |
| endpoint service | endpoint와 HTTP method, path/query/header/body 구성, endpoint별 DTO type | toast 문구, modal 상태, 장식용 화면 값 |
| mapper | 검증된 API DTO를 화면 model로 변환 | 누락된 서버 값을 mock·추정값으로 보충, network 요청 |
| common API client | base URL, 공통 header, fetch, envelope unwrap, transport/HTTP/API 오류 구조화 | TestRun 상태 해석, 화면 이동, endpoint별 retry 정책 |
| OpenAPI | endpoint, method, schema, enum, nullable, validation, 공개 오류 계약 | 화면 layout, 사용자 문구, local interaction |

작은 endpoint에서는 service와 mapper가 같은 파일에 있을 수 있지만 책임 자체를 합치지는 않는다. 정확한 폴더 구조와 OpenAPI 생성 타입 도입은 별도 아키텍처 결정이다.

### 4.2 요청 구성

- base URL은 runtime config가 소유하고 endpoint service는 `/test-runs` 같은 상대 경로만 전달한다.
- path parameter는 실제 API ID를 사용한다. 장식용 `#901`, `suite-1`을 그대로 URL에 넣지 않는다.
- query parameter는 OpenAPI의 이름, 반복 방식과 범위를 보존한다.
  - 배열 filter는 같은 parameter를 반복해 OR 의미를 유지한다.
  - 값이 `undefined`인 선택 parameter는 보내지 않는다.
  - 유효한 값이 될 수 있는 `0`, `false`, 빈 collection을 단순 truthy 검사로 잘못 누락하지 않는다.
- JSON body에는 OpenAPI schema의 field만 넣는다. `additionalProperties: false`인 request에 화면 전용 label이나 임시 상태를 섞지 않는다.
- `Idempotency-Key`처럼 endpoint가 정의한 header는 endpoint service가 명시적으로 전달한다.
- body가 없는 GET과 DELETE에 `Content-Type: application/json`을 항상 붙일 필요가 있는지는 구현 시 검토한다. `Accept`와 실제 body의 content type을 구분한다.
- 사용자 입력 validation은 빠른 피드백을 위해 client에서도 수행할 수 있지만 서버 validation을 대체하지 않는다. 최종 허용값과 제약은 OpenAPI다.

### 4.3 DTO와 화면 모델

API DTO는 서버 응답을 손실 없이 표현하고, 화면 모델은 UI가 표시하기 쉬운 구조를 표현한다.

| API 값 | 경계 처리 원칙 |
| --- | --- |
| `int64` ID | 문자열 장식 없이 의미를 보존한다. JavaScript number 안전 범위를 넘을 가능성이 있으면 타입 전략을 별도 결정한다. |
| UTC ISO 8601 | 원문을 보존하고 locale formatting은 표시 계층에서 수행한다. |
| enum | OpenAPI enum을 source of truth로 사용하고 임의의 fallback enum을 정상 상태로 만들지 않는다. |
| required + nullable | field 누락은 계약 위반, 명시적 `null`은 계약이 허용한 상태로 구분한다. |
| optional | 누락과 사용자가 빈 값을 제출한 경우를 구분한다. |
| paginated response | `items`와 `page`를 한 조회 결과로 보존한다. |
| error detail | 공개 `code`, `message`, validation `errors` 또는 execution `stage`를 보존한다. |

mapper는 다음 규칙을 따른다.

- API에 없는 Suite 이름, pass rate, Target version 또는 결과 값을 서버에서 받은 것처럼 생성하지 않는다.
- `null`을 임의의 성공·실패 enum으로 바꾸지 않는다.
- 화면에서 필요한 파생 표시값은 원본 DTO와 계산 근거를 추적할 수 있어야 한다.
- filter나 page가 바뀌면 새 응답의 `items`와 `page`를 함께 교체한다. 이전 items와 새 page를 섞지 않는다.
- OpenAPI에 없는 Application 자연어 응답, provider 원문, stack trace 또는 내부 예외 메시지를 결과 DTO에서 얻을 수 있다고 가정하지 않는다.

### 4.4 Success response와 envelope

JSON 성공 응답은 공통 envelope의 `httpStatus`, `message`, `data`를 사용한다. 공통 client는 envelope를 검증한 뒤 endpoint service에 `data`를 반환한다.

현재 `apiClient`는 다음을 수행한다. (`AS-IS`)

- `VITE_API_BASE_URL` 또는 `/api/v1`을 base URL로 사용한다.
- JSON을 parse하고 `httpStatus` 존재 여부를 최소 검증한다.
- 성공 시 `data`를 반환한다.
- `204 No Content`는 JSON parsing 없이 `undefined`를 반환한다.

목표 경계는 다음과 같다. (`TO-BE`)

- HTTP status와 envelope `httpStatus`가 서로 모순되거나 required envelope field가 없으면 정상 data로 사용하지 않는다.
- `200`, `202` 등 endpoint별 성공 status 차이를 유지한다. mutation 접수와 처리 완료를 같은 의미로 보지 않는다.
- `204`는 body가 없는 성공이다. 빈 JSON object나 `null` data를 요구하지 않는다.
- JSON parse 성공만으로 schema 전체가 검증됐다고 간주하지 않는다. runtime schema validation 도입 여부는 별도 결정이지만, 최소한 계약과 다른 shape는 `INVALID_RESPONSE`로 진단할 수 있어야 한다.
- envelope `message`는 보조 정보다. 화면의 도메인 상태를 message 문자열 parsing으로 결정하지 않는다.

### 4.5 오류 분류와 보존

오류는 발생 위치와 복구 방식이 다르므로 한 종류의 “요청 실패”로 합치지 않는다.

| 오류 범주 | 예 | 공통 경계의 처리 | 화면 책임 |
| --- | --- | --- | --- |
| network | 연결 실패, DNS, offline | HTTP status가 없는 구조화 오류 | 연결 실패와 재시도 가능성 표시 |
| abort | Run 변경, 화면 이탈, 사용자 취소 | 일반 network 오류와 구분 | 실패 toast를 띄우지 않고 오래된 요청 결과를 폐기 |
| timeout | client 제한 시간 초과 | abort와 구분 가능한 code 보존 | 상태 불명과 명시적 서버 거부를 구분 |
| invalid response | invalid JSON, envelope/shape 불일치 | `INVALID_RESPONSE`와 HTTP status 보존 | 정상 빈 결과로 표시하지 않음 |
| HTTP/API | 4xx/5xx와 공개 error envelope | status, message, `data.code`, field errors 보존 | endpoint code별 사용자 흐름 선택 |
| execution result error | HTTP 200 결과 안의 `error` | DTO의 stage/code/message로 보존 | Application/Evaluator 실패를 assertion과 분리 |
| rendering | React render 예외 | API client에서 처리하지 않음 | error boundary와 복구 UI |

현재 `ApiError`는 HTTP status, code와 validation field errors를 보존하고 JSON/envelope 오류를 구조화한다. 다만 fetch가 던진 abort도 현재는 `NETWORK_ERROR`가 될 수 있어 구분이 필요하다. (`AS-IS` 불일치)

서버가 공개한 안전한 `message`, `code`, validation detail만 사용자 표현 후보로 사용한다. provider 원문, stack trace와 내부 예외를 추출하거나 노출하지 않는다. unknown code도 버리지 않고 일반 오류 표현과 진단 정보에 보존한다.

### 4.6 취소, 동시 요청과 stale 상태

- Run ID, filter 또는 page가 바뀌면 이전 요청을 취소하거나 응답 적용 시 현재 request identity를 확인한다.
- 늦게 도착한 이전 응답이 새 선택의 state를 덮어쓰지 않게 한다.
- Polling 요청이 겹치지 않도록 한 요청의 완료·취소와 다음 tick의 관계를 관리한다.
- 화면 이탈과 unmount 시 timer와 진행 중 요청을 정리한다.
- background 갱신 실패 후 이전 성공 data를 유지한다면 반드시 stale/갱신 실패 상태를 함께 표시한다.
- mutation 성공 후 목록을 낙관적으로 갱신할지 재조회할지는 endpoint별 정책이다. 실패를 성공처럼 반영하지 않는 원칙은 공통이다.

`AbortSignal` 전달 위치, timeout 구현, 중복 GET 제거와 cache library 도입은 `미결정`이다.

### 4.7 실제 API와 mock 경계

- 실제 API mode와 demo/mock mode를 명시적으로 구분한다.
- 실제 API의 성공 data와 mock item을 한 collection에 섞지 않는다.
- API 실패 또는 성공한 빈 결과를 mock 성공으로 대체하지 않는다.
- mock fixture도 OpenAPI shape와 nullable 조합을 따라야 하지만 실제 계약 검증의 대체물은 아니다.
- production에서 mock을 허용할지와 설정 누락 시 fail-fast할지는 별도 Decision으로 확정한다.

timeout 값, 자동 재시도 대상, 인증·권한 오류 UX, runtime schema validation과 공통 cache 정책은 OpenAPI가 결정하지 않으므로 `미결정`이다.

## 5. TestRun 생성

### 5.1 입력 mapping (`AS-IS`)

`TestRunCreateReq`는 다음 사용자 입력을 연결한다.

- 실제 `testSuiteId`
- 하나의 `target`
  - MVP type은 `HTTP_ENDPOINT`
  - `identifier`는 HTTP 또는 HTTPS URI
  - `model`은 OpenAI-compatible request body에 전달할 필수 non-blank 문자열이다.
  - `revision`은 선택적이며 공백 문자열을 보내지 않는다.
- 하나의 inline `evaluationProfile`
  - `checks`는 최소 한 개이며 중복 없이 선택한다.
  - 값은 `PROMPT_INJECTION`, `PII_LEAKAGE`, `HARMFUL_CONTENT` 중 하나다.
  - `strictness`는 `RELAXED`, `STANDARD`, `STRICT` 중 하나다.

사용자에게 Evaluator provider/type, Guardrail identifier/version, Snapshot identity를 요구하거나 request에 추가하지 않는다. `additionalProperties: false`이므로 화면 전용 필드를 body에 섞지 않는다.

### 5.2 접수와 멱등성

1. 한 논리적 제출 시도에 하나의 `Idempotency-Key`를 부여한다.
2. 응답을 확인하지 못해 동일 body를 재전송할 때 같은 key를 사용한다.
3. key는 선택 header지만 중복 실행 방지 정책을 별도 Decision으로 확정한다.
4. 현재는 `202 Accepted`의 `TestRunCreateRes`에 포함된 Run ID로 상세 조회에 이동한다. `Location` header 보존은 `apiClient`가 response header를 노출할 때까지 남은 계약 격차다.
5. 같은 key와 같은 body의 재전송은 기존 Run의 현재 status를 반환할 수 있다.
6. `TEST_SUITE_EMPTY`, `IDEMPOTENCY_KEY_CONFLICT`, `EVALUATION_PROFILE_NOT_SUPPORTED`를 일반 network 오류와 구분한다.

현재 구현은 payload fingerprint별 key를 메모리에 보존하고 network 결과 불명에서는 재사용하며, 성공 또는 명시적 서버 거부 후 폐기한다. 화면 이탈 후 복원, 장기 보존과 OpenAPI에 없는 TTL은 `미결정`이다.

## 6. Run lifecycle, outcome과 Quality Gate

| 축 | 값 | UI 의미 |
| --- | --- | --- |
| `status` | `QUEUED`, `PREPARING`, `RUNNING`, `FINISHED` | lifecycle과 Polling 종료 조건 |
| `executionOutcome` | `COMPLETED`, `ERROR`, `INCOMPLETE`, 미결정 시 `null` | Run 처리 결과와 신뢰도 |
| Quality Gate | `PASS`, `FAIL`, `NOT_EVALUATED`, 미결정 시 `null` | 현재 Run의 assertion 집계 판정 |

- `FAILED`를 Run status로 만들지 않는다.
- Gate `FAIL`과 execution `ERROR`를 같은 실패로 표현하지 않는다.
- `qualityGate = null`과 종료 후 `qualityGate.status = NOT_EVALUATED`를 구분한다.
- `QualityGateRes.metrics`는 Gate가 `NOT_EVALUATED`이면 `null`이다.
- PASS/FAIL metrics는 `assertionPassRate`와 `executionSuccessRate`를 사용하며 둘 다 서버 저장 값을 표시한다.

## 7. Polling과 결과 조회

1. 생성 응답 또는 실행 이력에서 Run ID를 얻으면 상세를 즉시 조회한다.
2. `QUEUED`, `PREPARING`, `RUNNING`이면 `processedTestCaseCount`와 `percent`를 표시하고 반복 조회한다.
3. Run 변경, 화면 이탈 또는 unmount 시 timer와 진행 중 요청을 취소한다.
4. `FINISHED`이면 Polling을 종료하고 outcome과 Quality Gate를 표시한다.
5. 개별 결과와 Evaluator metrics를 조회한다.
6. 종료 직전 race로 결과 API가 `TEST_RUN_NOT_FINISHED`를 반환하면 완료 결과로 간주하지 않고 상세 상태를 다시 확인한다.

고정 간격, backoff, jitter, background tab 감속, 최대 지속 시간과 일시 오류 허용 횟수는 `미결정`이다.

## 8. 개별 결과 mapping

`TestRunResultItemRes`는 실행 당시 TestCaseSnapshot과 Evaluator의 공개 결과다.

| 필드 | 표현 책임 |
| --- | --- |
| `testCaseSnapshotId` | 현재 TestCase ID와 혼동하지 않는 실행 당시 결과 identity |
| `expectedAction` | TestCase가 기대한 `ALLOW` 또는 `BLOCK` |
| `executionStatus` | Application 실행과 Evaluator 처리가 도달한 terminal 상태 |
| `evaluatorVerdict` | Evaluator가 만든 공통 `ALLOW` 또는 `BLOCK`; 결과가 없으면 `null` |
| `assertionStatus` | Expected와 verdict 일치 여부; 평가 결과가 없으면 `null` |
| `evaluationOutcome` | `TRUE_POSITIVE`, `TRUE_NEGATIVE`, `FALSE_POSITIVE`, `FALSE_NEGATIVE`; 평가 결과가 없으면 `null` |
| `error.stage` | `APPLICATION_TARGET` 또는 `EVALUATOR` 실패 위치 |

- `FAILED`, `TIMED_OUT`, `NOT_STARTED`를 assertion `FAIL`과 혼동하지 않는다.
- verdict가 없는 항목을 FP/FN 통계에 포함하지 않는다.
- API 결과에는 Application 자연어 응답이 포함되지 않는다. #28과 #29의 Application Response 표시는 OpenAPI 변경 없이 구현 가능한 목표로 간주하지 않는다.
- provider 원문이나 내부 오류로 빈 필드를 보충하지 않는다.

`error.code`의 목표 값 목록과 terminal 상태 mapping은 OpenAPI가 아직 확정하지 않았다. 프론트는 알려지지 않은 code도 안전한 message와 stage를 보존해 표시할 수 있어야 한다.

### 8.1 Application 자연어 응답 공개 원칙

현재 OpenAPI는 Application 자연어 응답을 Evaluator의 내부 입력으로만 사용하고 public 결과에는 포함하지 않는다. 따라서 프론트엔드의 기본 정책은 **원문을 조회·저장·표시하지 않는 것**이다.

TestCase의 `input`, 주제, category와 expected action을 안다고 해서 실제 Application 응답의 민감도를 예측할 수는 없다. 응답에는 요청하지 않은 개인정보, 고객 데이터, 인증 정보, 내부 시스템 정보, system prompt 또는 외부 도구 결과가 포함될 수 있다. 관리자 전용 화면이나 배포 전 테스트도 다음 위험을 제거하지 않는다.

- 관리자 계정의 과도한 권한, 계정 탈취 또는 내부자 오용
- 결과 DB, backup, observability pipeline과 로그로의 민감정보 복제
- 브라우저 cache, 화면 캡처, 화면 공유와 export를 통한 2차 노출
- 보존 기간, 삭제 요청, 감사와 규제 범위의 확대
- 원문이 UI에 렌더링될 때 발생할 수 있는 injection과 안전하지 않은 link/content 처리

결과 검토의 기본 화면은 원문 대신 다음 최소 정보로 목적을 충족한다.

- TestCaseSnapshot의 name, input, expected action, severity와 category
- Application/Evaluator 처리의 `executionStatus`
- `evaluatorVerdict`, `assertionStatus`, `evaluationOutcome`
- 공개 가능한 `error.stage`, `code`, `message`
- Run 및 Evaluation Profile metadata

향후 실제 디버깅에 원문이 꼭 필요하다는 근거가 생기면 일반 결과 DTO에 바로 추가하지 않고 별도 보안·제품 Decision과 OpenAPI 변경을 선행한다. 최소한 다음 통제가 함께 확정되어야 한다.

- 기본 비공개와 명시적 권한이 있는 사용자만 사용하는 on-demand reveal
- Run, tenant와 역할을 함께 검증하는 server-side authorization
- 원문 접근에 대한 사용자·시각·Run 단위 audit log
- secret/PII 탐지와 masking 또는 redaction 정책
- 전송·저장 암호화, 짧은 retention과 확실한 삭제 정책
- browser cache, analytics, error reporting, 일반 application log와 export로의 전파 차단
- 안전한 text rendering과 길이 제한

이 통제 없이 “관리자이므로” 또는 “배포 전 테스트이므로” 원문을 공개하지 않는다. 관리자 여부는 위험을 없애는 근거가 아니라, 제한 공개가 필요할 때 적용할 여러 통제 중 하나다.

## 9. Evaluator metrics

Evaluator metrics endpoint는 한 Run의 저장된 Expected와 Evaluator verdict 분류 집계를 반환한다. 서버 응답의 TP/TN/FP/FN count와 FP/FN rate를 source of truth로 사용하며 결과 page 일부로 전체 지표를 다시 계산하지 않는다.

- verdict가 없는 실행 실패는 분류 집계에서 제외한다.
- FP/FN은 현재 Evaluation Profile과 TestCase ExpectedResult의 관계이며 일반적인 모델 성능의 절대 ground truth로 과장하지 않는다.
- Quality Gate와 Evaluator confusion metrics는 서로 다른 API와 사용자 목적을 가진다.

## 10. Comparable Runs와 Regression

Regression comparison API 소비는 MVP 필수이며 현재 `RegressionComparisonSection`에서 구현되어 있다. 별도 Regression 전용 page는 Optional이다.

1. 현재 Run의 `comparable-runs` endpoint가 반환한 후보만 표시한다.
2. 같은 Suite라는 이유만으로 프론트가 후보를 추가하지 않는다.
3. 선택한 후보와 current Run을 comparisons endpoint로 조회한다.
4. summary의 `totalCases`, `changedCount`, `unchangedCount`, `improvedCount`, `regressedCount`, `notComparableCount`를 보존한다.
5. 각 item의 `snapshotId`, `testCaseId`, `name`, `input`, `expectedAction`, `comparisonVerdict`, `currentVerdict`, `comparabilityStatus`, `changeType`을 보존한다.
6. `COMPARABLE`/`NOT_COMPARABLE`과 `NO_CHANGE`, `SECURITY_REGRESSION`, `USABILITY_REGRESSION`, `IMPROVEMENT`, `POLICY_BEHAVIOR_CHANGED`를 서버 분류 그대로 표시한다.
7. 현재 구현의 changed-only filter처럼 변화 case를 우선 탐색할 수 있게 한다. filter/tab 표현을 바꾸더라도 프론트에서 change type을 재분류하지 않는다.
8. 한 case의 Expected, comparison/current verdict, comparability와 change type은 동일 비교 컨텍스트에서 연결해 보여준다.
9. 현재 item 데이터만으로 가능한 `ALLOW → BLOCK`, `BLOCK → ALLOW` 같은 action transition은 UI 보조 표현으로 파생할 수 있지만, 이를 위해 신규 backend 집계 API를 요구하지 않는다.
10. 비교 과정에서 Application이나 Evaluator를 다시 실행하는 것처럼 표현하지 않는다.

비교 가능 여부와 Regression classification은 backend가 소유한다. Quality Gate는 현재 Run 자체의 판정이며 Regression은 두 Run의 저장 결과 비교이므로 하나의 status나 metric으로 합치지 않는다.

Result Detail은 전체 case를 동일 비중으로 나열하는 것보다 summary와 `changeType`을 이용해 Regression/Improvement/변화 case를 먼저 찾을 수 있게 하는 것을 우선한다. 별도 page 없이 `비교 Run 선택 → summary 확인 → 변화 case 탐색 → case 비교`가 section/modal/drawer 안에서 끝나면 MVP 계약을 충족한다.

## 11. Pagination과 filter

- page는 1-based이며 기본값 1, size는 1~100 범위다.
- `PageMetaRes` 전체를 보존한다.
- 범위를 초과한 page의 빈 `items`를 최초 데이터 없음과 구분한다.
- 반복 status/outcome/Gate filter의 OR 의미를 보존한다.
- created-from/to와 sort를 서버 query로 전달하고 전체 결과를 받은 것처럼 client-side filter하지 않는다.
- 결과 목록의 execution status, assertion status, evaluation outcome, severity/category filter는 OpenAPI에 선언된 query만 사용한다.
- filter 없는 FINISHED 결과의 `page.totalElements`가 고정 `testCaseCount`와 다르면 정상 빈 결과로 단정하지 않고 계약 불일치로 진단한다.

URL에 filter/page를 보존할지와 filter 변경 시 page 초기화 방식은 `미결정`이다.

## 12. 빈 결과, 오류와 mock

| 상황 | 처리 원칙 |
| --- | --- |
| 성공한 `items: []` | 실제 빈 결과로 표시하며 mock으로 대체하지 않는다. |
| `VALIDATION_ERROR` | field와 message를 관련 control에 연결한다. |
| `TEST_*_NOT_FOUND` | 해당 리소스 미존재 흐름으로 처리한다. |
| `TEST_RUN_NOT_FINISHED` | 진행 상태를 재확인하며 완료 결과 없음으로 표시하지 않는다. |
| `TEST_RUNS_NOT_COMPARABLE` | 비교 불가로 표시하고 Regression 결과를 추정하지 않는다. |
| `TEST_SUITE_EMPTY` | Run 생성이 접수되지 않았음을 표시한다. |
| `IDEMPOTENCY_KEY_CONFLICT` | 같은 key의 다른 요청 충돌로 표시하고 자동 재전송하지 않는다. |
| `EVALUATION_PROFILE_NOT_SUPPORTED` | 다른 checks/strictness 조합 또는 Evaluator catalog 등록이 필요함을 안내한다. |
| unknown execution error code | 공개 message와 failure stage를 보존하고 provider 원문을 노출하지 않는다. |

실제 API 응답과 mock을 같은 collection에 출처 표시 없이 섞지 않는다. 실제 API 실패나 빈 결과를 mock 성공으로 위장하지 않는다. 환경별 mock 기본값, production 허용 여부와 fail-fast 정책은 별도 Decision이 필요하다.

## 13. OpenAPI 미확정 영역

다음 항목은 프론트 문서에서 임의로 확정하지 않는다.

- 실행 오류 `code`의 전체 목록과 terminal 상태 mapping
- Idempotency-Key의 client 보존 수명
- timeout, retry, backoff와 background Polling 정책
- comparison nullable enum 표현의 OpenAPI 3.0.3 도구 호환성(backend #144)
- 인증·권한 오류와 사용자 세션 UX
- OpenAPI 타입 생성 도입 여부

미확정 영역이 구현을 차단하면 관련 backend Issue 또는 별도 프론트 Decision에 연결한다.

## 14. 검증 근거

- [`../api/openapi.yaml`](../api/openapi.yaml)
- `src/services/apiClient.ts`
- `src/services/testSuiteService.ts`
- `src/services/testCaseService.ts`
- `src/services/testRunService.ts`
- `src/services/regressionService.ts`
- `src/hooks/useLiveRunProgress.ts`
- `src/components/views/NewRunView.tsx`
- `src/components/views/RunsView.tsx`
- `src/components/views/ResultDetailView.tsx`
- `src/components/views/RegressionComparisonSection.tsx`
- GitHub Issues #27, #28, #29, #30, #32, #72
- GitHub PR #71

실제 backend와의 end-to-end 검증 및 프론트엔드 구현 수정은 이 문서 Issue의 범위가 아니다.
