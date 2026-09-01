# GuardBench Frontend 문서

> Status: AS-IS / TO-BE / 미결정
> Owner: Frontend
> Last reviewed: 2026-09-01
> Scope: GitHub Issues #8, #10, #11, #13, #15, #17, #32, #33, #34, #35

이 디렉터리는 GuardBench 프론트엔드의 화면 동작, 사용자 흐름, API 소비 방식, 구조와 UI 규칙을 저장소에서 관리하기 위한 문서 진입점이다.

문서는 현재 구현을 기록한 `AS-IS`, 최신 OpenAPI에서 도출되는 `TO-BE`와 별도 결정이 필요한 `미결정`을 함께 관리한다. `AS-IS` 동작을 승인된 제품 요구사항이나 향후 목표 동작으로 간주하지 않는다.

## 문서 상태

| 상태 | 의미 |
| --- | --- |
| `AS-IS` | 현재 코드에서 관찰되는 동작을 기록한다. 올바른 목표 동작이라는 의미는 아니다. |
| `DRAFT` | 검토 또는 결정이 필요한 제안이다. 구현 계약으로 사용하지 않는다. |
| `APPROVED` | 팀이 승인한 프론트엔드 계약이다. 구현과 리뷰의 기준으로 사용한다. |

문서에 상태가 없으면 확정 계약으로 사용하지 않는다. 한 문서 안에 상태가 섞이면 각 절이나 표 항목에 상태를 별도로 표시한다.

## 계약 우선순위

프론트엔드 구현과 문서가 충돌하면 다음 순서로 판단한다.

1. 현재 Issue의 승인된 요구사항과 사용자의 명시적 지시
2. 이 저장소의 [`api/openapi.yaml`](api/openapi.yaml)과 백엔드 저장소의 동일한 `APPROVED` OpenAPI 및 제품·도메인 계약
3. 프론트엔드 저장소의 `APPROVED` 문서
4. 테스트와 현재 공개 코드 동작
5. `AS-IS` 및 `DRAFT` 문서
6. mock 데이터와 데모 표현

백엔드 API의 요청·응답 스키마를 이 저장소에서 다시 정의하지 않는다. 프론트엔드 문서는 화면이 승인된 OpenAPI를 어떻게 소비하고 사용자에게 표현하는지 기록한다.

API 관련 문서의 책임은 다음 순서로 좁아진다.

```text
OpenAPI
  → API 연동 계약
  → 화면 명세와 사용자 흐름
  → 프론트엔드 아키텍처
  → UI 및 접근성 가이드
```

- OpenAPI는 endpoint, schema, enum, nullable, validation과 공개 오류를 소유한다.
- API 연동 계약은 프론트엔드의 소비·mapping 원칙을 소유한다.
- 제품 문서는 사용자 목표, 화면과 상태 흐름을 소유한다.
- 아키텍처 문서는 상태·의존성·계층 경계를 소유한다.
- UI 가이드는 label, feedback, interaction과 접근성 표현을 소유한다.

## 문서 지도

| 문서 | 상태 | 목적 |
| --- | --- | --- |
| [OpenAPI](api/openapi.yaml) | `APPROVED` | 프론트엔드가 소비하는 endpoint와 공개 schema의 canonical copy다. |
| [화면 및 기능 명세](product/screen-spec.md) | `AS-IS` / `TO-BE` / `미결정` | 6개 현재 화면과 Application Target·Evaluator·Regression 목표 화면을 구분한다. |
| [사용자 흐름](product/user-flows.md) | `AS-IS` / `TO-BE` / `미결정` | Suite 준비부터 Run 접수·Polling·결과·Evaluator 분석·선택적 비교까지 연결한다. |
| [API 연동 계약](contracts/api-integration.md) | `AS-IS` / `TO-BE` / `미결정` | 요청 구성, DTO mapping, 오류, Polling, metrics, comparison과 비공개 정책을 정의한다. |
| [프론트엔드 아키텍처](architecture/frontend-architecture.md) | `AS-IS` / `TO-BE` / `미결정` | query identity, 상태 소유권, API 계층, Polling·동기화·오류와 테스트 경계를 정의한다. |
| [UI 및 접근성 가이드](conventions/ui-guidelines.md) | `AS-IS` / `TO-BE` / `미결정` | 상태 축, form, 빈 결과·오류, Evaluator·Regression과 접근성 표현을 정의한다. |
| [프론트엔드 빌드 및 dev 배포](operations/frontend-deployment.md) | `AS-IS` / `DRAFT` | PR build, 문서-only 제외, dev 배포 조건과 AWS 인증 전환 방향을 기록한다. |

Application 자연어 응답은 현재 public API와 UI에서 비공개로 확정돼 있다. 관리자 또는 배포 전 테스트라는 이유만으로 원문을 조회·저장·표시하지 않는다.

## 최신 OpenAPI 개정 추적

| 이슈 | 범위 | 상태 확인 위치 |
| --- | --- | --- |
| #32 | API 연동 계약 | `contracts/api-integration.md` |
| #33 | 화면 명세와 사용자 흐름 | `product/` |
| #34 | 프론트엔드 아키텍처 | `architecture/frontend-architecture.md` |
| #35 | UI 가이드와 문서 지도 | `conventions/ui-guidelines.md`, 이 문서 |
| #36 | 전체 개정 추적 | GitHub Issue checklist |

## 갱신 기준

다음 변경은 관련 문서를 함께 검토한다.

- 화면 추가·삭제 또는 주요 사용자 행동 변경
- 라우팅 및 화면 진입 조건 변경
- API endpoint, 요청·응답 매핑 또는 오류 처리 변경
- mock과 실제 API 사이의 전환 정책 변경
- 로딩, 빈 결과, 오류, Polling 상태 표현 변경
- 공통 컴포넌트 책임이나 상태 관리 구조 변경
- 접근성 또는 반응형 기준 변경

문서와 코드가 다르면 차이를 숨기지 않고 현재 상태와 필요한 후속 Issue를 기록한다.
