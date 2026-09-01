# OpenAPI 사본 관리

`guardbench-backend/docs/api/openapi.yaml`이 유일한 canonical source다. 이 디렉터리의
`openapi.yaml`은 프론트엔드 검토와 타입 계약을 위한 byte-identical 사본이며 직접 수정하지 않는다.

## 동기화

백엔드 저장소의 최신 `dev`를 가져온 뒤 프론트엔드 저장소에서 실행한다.

```powershell
npm run openapi:sync -- --backend-path ../guardbench-backend --ref origin/dev
```

이 명령은 사본과 `openapi.source.json`의 source commit 및 SHA-256을 함께 갱신한다.

## 검증

기록된 source commit과 현재 사본의 일치를 확인한다.

```powershell
npm run openapi:verify -- --backend-path ../guardbench-backend
```

기록 이후 백엔드 `dev`에 계약 변경이 생겼는지 확인한다.

```powershell
npm run openapi:check-latest -- --backend-path ../guardbench-backend --ref origin/dev
```

GitHub Actions의 `OpenAPI Contract` workflow도 매일 최신 백엔드 `dev`와 비교한다. drift가
발견되면 사본을 빌드 중 임의로 바꾸지 않고 실패로 알리며, 동기화와 프론트 영향 검토는 PR로 수행한다.

OpenAPI 변경은 백엔드에서 먼저 승인·병합한 뒤 동기화한다. 프론트 변경 PR은 출처 metadata,
생성 또는 수동 DTO, 화면 동작과 계약 문서를 함께 검토한다.
