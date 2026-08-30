# 프론트엔드 UI 및 접근성 가이드

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-08-31
> Scope: GitHub Issue #17
> AS-IS baseline: `main@d12ab47d58545c47fe7ce3b8737209469f3efb4d`
> Canonical product scope: `guardbench-backend/docs/product/mvp-scope.md` (`APPROVED`)
> Canonical API: `guardbench-backend/docs/api/openapi.yaml` (`APPROVED`)

이 문서는 반복되는 UI 상태와 interaction의 현재 동작을 기록하고, 승인된 제품·API 계약을 사용자가 오해하지 않도록 표현하는 공통 기준을 정의한다. 구체적 문구·디자인 token·도구 선택은 근거 없이 확정하지 않는다.

## 1. 기본 원칙

- 상태를 색상, icon 또는 toast 하나에만 의존해 전달하지 않는다.
- 실제 API 성공, 실제 빈 결과, 오류, mock과 demo를 서로 다른 상태로 표현한다.
- native HTML element로 해결할 수 있는 interaction에는 `div` click과 custom role보다 `button`, `a`, `input`, `select`를 우선한다.
- keyboard와 pointer 사용자가 같은 핵심 기능과 정보를 이용할 수 있어야 한다.
- control에는 label, native element 등 코드로 식별 가능한 이름과 상태를 제공하되, 동적 상태의 음성 안내는 이번 데모 범위에서 제외한다.
- API schema와 오류 code 의미는 [API 연동 계약](../contracts/api-integration.md)을 따른다.
- 상태 소유권과 오류 경계는 [프론트엔드 아키텍처](../architecture/frontend-architecture.md)를 따른다.

## 2. 현재 공통 UI (`AS-IS`)

| 영역 | 현재 동작 | 제약 |
| --- | --- | --- |
| loading | 제목 옆 작은 spinner 또는 제출 button 문구 | accessible status와 지속 상태 설명 없음 |
| empty | 빈 table 또는 mock 유지 | 실제 0건과 오류를 구분하기 어려움 |
| error | 일반 toast 또는 silent mock fallback | code·field error·재시도 경로 없음 |
| toast | 우측 하단 약 2.8초, 문자열 하나 | severity, queue와 dismiss 없음 |
| modal/drawer | overlay click과 닫기 button | dialog semantics, focus trap·복원, Escape 미지원 |
| clickable card/row | `article`/`tr`에 `onClick` | keyboard focus와 activation 없음 |
| form | 시각적 `label`이 있지만 명시적 연결 부족 | field error와 invalid state 없음 |
| status | pill, text와 색상 | 일부 상태 의미가 API 축과 불일치 가능 |
| responsive | mobile sidebar와 table horizontal scroll | focus/scroll lock과 좁은 화면 정보 우선순위 미정 |

## 3. Loading과 진행 상태

### TO-BE

- 최초 로딩, 기존 데이터 갱신, mutation 제출과 장기 실행 progress를 구분한다.
- 최초 로딩에서는 대상 영역의 목적을 유지하면서 loading 상태임을 화면의 text로 전달한다.
- background 갱신은 기존 데이터를 숨기지 않되 stale 또는 갱신 중 상태를 식별할 수 있어야 한다.
- mutation 중에는 같은 논리 요청의 중복 제출을 막고 button의 disabled/busy 상태와 진행 문구를 함께 제공한다.
- TestRun progress는 `status`, `processedTestCaseCount`, `percent`를 사용하며 Gate 결과처럼 표현하지 않는다.
- spinner animation만으로 상태를 전달하지 않는다.

동적 상태의 screen reader 음성 안내(`aria-live`, `role="status"` 등)는 이번 데모 범위에서 제외한다. skeleton 사용 범위와 기존 데이터 유지 시간은 `미결정`이다.

## 4. 빈 결과

### TO-BE

- API가 성공해 `items: []`를 반환하면 실제 빈 결과로 표시하고 mock으로 바꾸지 않는다.
- 최초 데이터 0건, filter/search 결과 0건과 범위 초과 page를 구분한다.
- empty 영역에는 현재 조건과 가능한 다음 action을 설명하되 존재하지 않는 create 기능을 CTA로 제공하지 않는다.
- FINISHED TestRun의 filter 없는 결과가 비어 계약 위반이 의심되면 정상 empty로 단정하지 않는다.
- empty와 404, network 오류 또는 권한 오류를 같은 화면으로 표현하지 않는다.

화면별 문구와 CTA는 제품 Decision으로 남긴다.

## 5. 오류와 stale 상태

| 오류 범주 | 사용자 표현 책임 |
| --- | --- |
| field validation | 관련 field 근처에 오류를 연결하고 수정 가능한 값 유지 |
| 404 | 대상이 존재하지 않음을 설명하고 안전한 이동 경로 제공 |
| conflict | 현재 상태 또는 재요청 충돌 원인과 다음 action 구분 |
| network/timeout | 서버가 거부한 것과 결과를 알 수 없는 상황을 구분 |
| parsing/unknown | 일반 실패로 숨기더라도 진단 가능한 내부 context 보존 |
| rendering | 화면 error boundary에서 격리하고 API 오류와 구분 |

### TO-BE

- 오류로 인해 이전 데이터를 유지하면 “최신”으로 오인하지 않도록 갱신 실패/stale 상태를 함께 표시한다.
- 화면 핵심 작업을 막는 오류는 자동으로 사라지는 toast만 사용하지 않고 지속 영역과 재시도 action을 제공한다.
- mutation 실패를 성공 toast로 표시하거나 로컬 상태를 성공으로 확정하지 않는다.
- mock/demo를 오류 fallback으로 사용하면 실제 성공 데이터와 명시적으로 구분한다.
- 안전한 server message만 사용자에게 노출하고 stack trace나 provider 원문을 표시하지 않는다.

자동 재시도, offline 표현, 오류 report와 마지막 성공 데이터 유지 정책은 `미결정`이다.

## 6. Form과 validation

### 입력 기본 규칙

- 모든 input/select에는 programmatic label을 제공한다. 시각적 `<label>`은 `htmlFor`와 control `id`로 연결한다.
- required, 형식과 예시는 placeholder만으로 전달하지 않고 label 또는 설명으로 제공한다.
- 도움말과 field error는 `aria-describedby` 등으로 해당 control과 연결한다.
- invalid control은 시각적 표현과 `aria-invalid` 상태를 함께 제공한다.
- 공백만 있는 필수 문자열, numeric version과 식별자 형식을 client에서 조기 안내하되 server validation을 대체하지 않는다.
- server `VALIDATION_ERROR.errors`를 가능한 field에 mapping하고 mapping할 수 없는 오류는 form 수준에서 표시한다.
- 오류 발생 후 사용자가 입력한 안전한 값을 유지한다.

### 제출과 취소

- 제출 중 같은 button과 Enter 경로의 중복 요청을 막는다.
- 성공은 server 응답 후 확정하고 생성된 server ID를 사용한다.
- timeout으로 결과가 불명확한 멱등 요청은 단순 실패와 구분한다.
- 취소, 화면 이탈과 form draft 보존·경고 정책은 `미결정`이다.

## 7. Button, link와 clickable surface

- 상태 변경·modal 열기·submit은 `button`을 사용한다.
- URL navigation은 link semantics를 사용한다. 현재 router가 없어도 `div` click을 접근 가능한 navigation으로 간주하지 않는다.
- icon-only button에는 보이는 text 또는 accessible name을 제공한다.
- disabled button은 이유를 주변 설명으로 알 수 있어야 한다.
- card 또는 table row 전체가 click 대상이면 keyboard focus, Enter/Space activation과 내부 action 충돌을 설계한다. 가능하면 명시적 link/button을 둔다.
- hover 효과만으로 click 가능성을 전달하지 않는다.
- 최소 touch target 크기의 구체적 token은 디자인 Decision에서 확정한다.

## 8. Toast와 지속 피드백

### 상태 종류

| 종류 | 용도 |
| --- | --- |
| success | server mutation 성공이 확정된 경우 |
| error | 사용자가 즉시 알 필요가 있는 실패의 보조 알림 |
| warning | 결과 불명, stale 또는 위험 action 주의 |
| info | 완료 여부와 무관한 안내 |
| demo/mock | 실제 API 성공과 구분되는 명시적 데모 상태 |

- 핵심 오류·validation·장기 progress를 toast만으로 전달하지 않는다.
- 새 toast가 이전 toast를 무조건 덮어쓰지 않도록 queue 또는 대체 정책을 정한다.
- 자동 dismiss 시간, 수동 닫기, 위치, 최대 개수와 queue 방식은 `미결정`이다.

toast의 screen reader 음성 안내를 위한 live region은 이번 데모 범위에서 제외한다. 성공·오류 정보는 화면에서 확인할 수 있어야 하며, 핵심 오류는 지속 영역에도 남긴다.

## 9. Table, list와 pagination

- table에는 column header와 문맥상 필요한 caption 또는 accessible name을 제공한다.
- status cell은 text를 포함하고 색상만으로 의미를 전달하지 않는다.
- interactive row는 keyboard 경로를 제공하고 내부 delete/edit/detail action의 event 경계를 분리한다.
- loading, empty와 error를 데이터 행처럼 혼동하지 않고 table 주변 상태 영역으로 표현할 수 있다.
- horizontal scroll container는 keyboard 및 zoom 환경에서 content가 잘리지 않게 한다.
- pagination은 현재 page, 전체 page 또는 결과 범위와 이전·다음 가능 여부를 제공한다.
- filter/search에는 label, clear action과 적용 결과를 제공하고 filter 변경 시 page 처리 정책을 명시한다.

page를 URL에 보존할지, mobile에서 table을 card로 바꿀지는 `미결정`이다.

## 10. Dialog, modal과 drawer

### TO-BE interaction

1. trigger가 dialog를 열고 trigger element를 기억한다.
2. dialog에 `role="dialog"`, modal semantics와 accessible name을 제공한다.
3. 열린 뒤 heading 또는 첫 번째 의미 있는 control로 focus를 이동한다.
4. Tab/Shift+Tab focus가 modal 범위를 벗어나 background로 이동하지 않게 한다.
5. Escape와 명시적 닫기 button을 제공한다. backdrop click은 데이터 손실 가능성에 따라 결정한다.
6. 닫을 때 원래 trigger 또는 합리적인 다음 위치로 focus를 복원한다.
7. 열린 동안 background의 pointer·keyboard 접근과 page scroll을 제어한다.

- destructive action은 대상과 결과를 명확히 한 확인 절차를 제공한다.
- side drawer도 modal로 동작한다면 동일한 focus와 background 규칙을 적용한다.
- nested modal을 기본 패턴으로 만들지 않는다.
- backdrop close와 미저장 draft 처리, animation 방식은 `미결정`이다.

## 11. Keyboard, focus와 page structure

- 모든 핵심 action은 Tab으로 도달하고 keyboard로 실행할 수 있어야 한다.
- native control의 Enter/Space 동작을 보존하고 custom key handler는 필요한 경우에만 추가한다.
- focus indicator를 제거하지 않으며 배경과 구분 가능하게 표시한다.
- 화면 전환 후 page heading 또는 main 영역으로 focus를 옮길 필요를 검토한다.
- validation 제출 실패 시 첫 오류로 focus하거나 오류 summary와 field를 연결한다.
- `header`, `nav`, `main`, heading 순서 등 landmark와 문서 구조를 사용한다.

정확한 focus 이동 정책은 `미결정`이다. skip link, screen reader 음성 안내와 지원 matrix는 이번 데모 범위에서 제외한다.

## 12. 반응형, 확대와 motion

### AS-IS

- `lg` 미만에서 sidebar를 drawer로 열고 overlay를 제공한다.
- 일부 header/action은 `sm` breakpoint에서 row/column 배치를 바꾼다.
- 결과 table은 최소 폭과 horizontal scroll을 사용한다.
- modal/drawer는 viewport 높이를 사용하고 내부 scroll을 제공한다.
- `animate-rise`, spinner와 여러 transition을 사용하지만 reduced-motion 분기는 없다.

### TO-BE

- 200% 이상 확대와 좁은 viewport에서 핵심 content와 action이 잘리거나 겹치지 않게 한다.
- table horizontal scroll이 page 전체 scroll과 충돌하지 않도록 영역을 명확히 한다.
- drawer와 modal의 close action이 viewport 안에 유지되어야 한다.
- text wrapping으로 status, metric과 button 의미가 사라지지 않게 한다.
- motion은 정보 이해에 필수적이지 않아야 하며 사용자 reduced-motion 설정에 대응한다.
- color contrast는 실제 token과 상태 조합별로 검증한다.

지원 viewport, breakpoint와 contrast 목표 수준은 디자인·접근성 Decision에서 확정한다.

## 13. Status, outcome과 Quality Gate

- TestRun `status`는 진행 단계, `executionOutcome`은 실행 결과, Quality Gate는 정책 판정으로 분리한다.
- `FINISHED + ERROR`를 진행 중 또는 정책 FAIL로 표현하지 않는다.
- Gate `FAIL`은 실행 실패가 아니라 평가 가능한 정책 판정 실패다.
- `qualityGate = null`은 평가 전이고 `NOT_EVALUATED`는 종료 후 평가 불가다.
- badge에는 enum code 또는 이해 가능한 text를 포함하고 icon/색상은 보조 수단으로 사용한다.
- progress, outcome과 Gate를 하나의 “상태” filter로 합치지 않는다.

화면별 한국어 label은 제품 용어 검토 후 확정한다.

## 14. 공통 컴포넌트 책임

| 컴포넌트 후보 | 공통 책임 | 화면 책임 |
| --- | --- | --- |
| Button/IconButton | semantics, focus, disabled/busy | action과 label |
| Field/Error | label, description, invalid 연결 | validation rule과 message mapping |
| StatusPill | 상태 종류별 시각·text 구조 | 어떤 축의 값을 표시할지 선택 |
| Toast | severity, dismiss와 queue | 발생 시점과 message |
| Loading/Empty/Error | 공통 구조와 접근 가능한 상태 | 화면 목적, CTA와 retry |
| Dialog/Drawer | focus, Escape, background, scroll | content, submit과 discard 정책 |
| Pagination | 현재 위치와 이전·다음 semantics | query와 server page 상태 |

공통 component는 API endpoint나 mock을 직접 알지 않는다. component library 도입과 디자인 token은 `미결정`이다.

## 15. Baseline 저장 결과 방향 (`DRAFT` / 백엔드 계약 대기)

Baseline 결과를 미리 저장하고 TestRun에서는 Candidate만 실행하는 방향은 아직 승인된 백엔드 계약이 아니다. 다음 UI를 확정하지 않는다.

- Baseline 선택 control, 기본값과 검색 방식
- Baseline 생성·갱신 action
- 누락·Suite 불일치·stale Baseline의 오류 문구
- Candidate-only progress와 결과 layout

방향이 승인되면 저장 Baseline과 이번 Candidate 실행의 출처를 명시적으로 구분한다. Baseline을 이번 Run에서 실행된 결과처럼 표시하지 않고, 기준의 identity/version/생성 시점 등 승인된 provenance를 사용자가 확인할 수 있게 한다. stale·불일치·부분 누락을 정상 비교 결과로 표현하지 않는다.

## 16. 접근성 검증 전략

| 검증 | 대상 |
| --- | --- |
| 코드 검토 | native semantics, label, heading, landmark와 ARIA 사용 |
| keyboard 수동 검증 | Tab 순서, activation, Escape, focus trap·복원 |
| zoom/viewport | reflow, table scroll, modal/drawer와 touch action |
| motion/color | reduced motion, contrast와 색상 독립성 |
| component test | accessible name, invalid state, dialog와 화면의 dynamic feedback |
| browser flow | Suite 관리, Run 생성·진행·결과 분석 핵심 여정 |

axe 등 자동 검사와 CI required check는 `미결정`이다. screen reader 음성 안내와 지원 matrix는 이번 데모 범위에서 제외한다. 자동 검사는 keyboard 흐름과 실제 이해 가능성을 대체하지 않는다.

## 17. 후속 구현·Decision 후보

- loading/empty/error/stale 공통 상태 component
- structured field error와 form validation
- toast severity, queue와 지속 오류 영역
- accessible dialog/drawer와 destructive confirmation
- clickable card/row의 native interaction 전환
- focus management와 landmark
- responsive table/modal과 reduced motion
- 접근성 component/E2E 검사 기반
- 디자인 token, breakpoint와 지원 matrix Decision
- Baseline 계약 승인 후 선택·출처·stale UI 갱신

이 문서는 위 구현과 디자인 선택을 승인하지 않는다.

## 18. 검증 근거

- `src/App.tsx`
- `src/components/layout/`
- `src/components/views/`
- `src/components/common/`
- `src/index.css`
- [화면 명세](../product/screen-spec.md)
- [사용자 흐름](../product/user-flows.md)
- [API 연동 계약](../contracts/api-integration.md)
- [프론트엔드 아키텍처](../architecture/frontend-architecture.md)

실제 screen reader·browser matrix 검증, UI 코드 변경과 디자인 token 확정은 이 Issue 범위에 포함하지 않았다.
