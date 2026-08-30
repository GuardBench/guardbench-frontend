# 프론트엔드 빌드 및 dev 배포

> Status: AS-IS / DRAFT
> Owner: Frontend / Infrastructure
> Last reviewed: 2026-08-31
> Scope: GitHub Issue #10

## 실행 조건

`.github/workflows/deploy.yml`은 다음 조건으로 실행한다.

| 이벤트 | Build | dev 배포 |
| --- | --- | --- |
| `main` 대상 PR | 실행 | 실행하지 않음 |
| `main` push | 실행 | Build 성공 후 실행 |
| 수동 실행 | 실행 | Build 성공 후 실행 |
| `docs/**` 또는 Markdown-only PR/push | 실행하지 않음 | 실행하지 않음 |

문서와 코드가 함께 변경되면 일반 코드 변경으로 취급한다. 수동 실행은 path filter와 관계없이 현재 `main` 또는 실행 시 선택한 ref를 빌드하고 dev에 배포한다.

## Job 경계

- `Build`는 checkout, dependency 설치, TypeScript/Vite build와 artifact 업로드를 담당한다.
- `Deploy to Dev`는 성공한 build artifact만 내려받아 S3 sync와 CloudFront invalidation을 수행한다.
- AWS 인증이나 배포가 실패해도 `Build` job 결과를 별도로 확인할 수 있다.
- PR에서는 AWS credential을 사용하지 않는다.

## AWS 대상 (`AS-IS`)

- Region: `ap-northeast-2`
- S3 bucket: `guardbench-dev-frontend`
- CloudFront distribution: `E1PVL0Z78B1HMR`

대상 값은 현재 IaC output과 대조해야 한다. 장기적으로 workflow에 resource ID를 중복 기록하지 않고 repository/environment variable 또는 승인된 IaC output으로 연결하는 방식을 검토한다.

## AWS 인증

현재 workflow는 다음 GitHub Actions repository secret을 사용한다.

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

두 secret 중 하나가 없거나 만료되면 `Configure AWS Credentials`가 실패한다. 이 경우 Build 성공 여부를 먼저 확인하고, secret 값을 로그에 출력하지 않은 채 저장소 관리자와 AWS 관리자가 credential 상태를 확인한다.

### 목표 상태 (`DRAFT` / IaC 선행 작업 필요)

GitHub OIDC를 신뢰하는 최소 권한 IAM Role을 IaC에서 생성한 뒤 `aws-actions/configure-aws-credentials`의 `role-to-assume` 방식으로 전환한다. Role은 다음 작업에 필요한 범위만 허용해야 한다.

- 해당 frontend S3 bucket의 배포 객체 조회·생성·삭제
- 해당 CloudFront distribution의 invalidation 생성

OIDC 전환 전에는 workflow에 존재하지 않는 Role ARN을 임의로 넣지 않는다. IAM Role 생성·적용과 repository variable 등록은 `GuardBench/guardbench-iac#6`에서 추적한다.

## 실패 확인과 재실행

1. `Build`가 실패하면 dependency, TypeScript 또는 Vite 오류를 먼저 수정한다.
2. `Build` 성공 후 `Deploy to Dev`가 인증 단계에서 실패하면 GitHub secret 또는 향후 OIDC Role 설정을 확인한다.
3. S3 sync 실패 시 대상 bucket과 IAM 권한을 확인한다.
4. CloudFront invalidation 실패 시 distribution ID와 IAM 권한을 확인한다.
5. 원인이 해결된 뒤 실패한 run을 재실행하거나 `workflow_dispatch`로 명시적으로 다시 배포한다.

배포 실패를 해결하기 위해 동일한 코드의 빈 commit을 만들지 않는다.
