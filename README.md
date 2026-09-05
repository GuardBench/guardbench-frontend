# GuardBench Web Frontend

GuardBench(AI Application 응답 동작 및 정책 회귀 테스트 플랫폼)의 공식 웹 프론트엔드 모듈입니다.

## 🚀 주요 기능 및 화면

- **대시보드 (Dashboard)**: 전체 스위트 현황, 최근 7일 Quality Gate 판정 추이 차트, 최근 활동 피드
- **테스트 스위트 (Test Suites)**: 검증 목적별 테스트 케이스 스위트 카탈로그 및 세부 정보
- **새 테스트 실행 (New Run)**: Baseline Target(운영 버전) vs Candidate Target(DRAFT -> Materialized Version) 설정 및 실행 요청
- **실행 이력 (Run History)**: 실행 신뢰성(Execution Status)과 Quality Gate 판정(PASS/FAIL/NOT_EVALUATED) 분리 조회
- **결과 상세 (Result Detail)**: Quality Gate 판정 히어로 카드, Target Flow, 4대 핵심 메트릭, Snapshot별 회귀 분석 테이블

## 🛠️ 기술 스택

- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Pretendard Font
- **Icons**: Lucide React
- **Architecture**: Single Page Application (SPA)
- **Deployment**: AWS S3 + CloudFront OAC

## 💻 로컬 개발 환경 실행

`.env.example`을 기준으로 실행 환경을 설정합니다. 기본값은 `VITE_DATA_MODE=api`이며 API 오류를 mock 성공 데이터로 바꾸지 않습니다. 데모·정적 자료를 사용하는 환경은 `VITE_DATA_MODE=demo`를 명시하고 화면 상단의 DEMO 표시로 실제 API 데이터와 구분합니다.

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 프로덕션 빌드 검증
npm run build
```

## 🌐 배포 아키텍처 (CI/CD)

- GitHub Actions (`.github/workflows/deploy.yml`): `main` 브랜치 push 시 자동 빌드 후 S3 버킷(`guardbench-dev-frontend`) 동기화 및 CloudFront 캐시 무효화 수행.
