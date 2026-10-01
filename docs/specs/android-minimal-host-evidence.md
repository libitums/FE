# Android 최소 호스트 `/change` 증거

2026-10-01. 계약은 [android-minimal-host.md](android-minimal-host.md), 수동 기기 결과는
[android-host.md](../e2e/android-host.md)에 있다. 하네스에는 실행 엔진이 없어
`workflows/change.yaml`의 순서와 게이트를 메인 작업에서 수동으로 확인했다.

| 단계 | 증거와 판정 |
|---|---|
| requirements · specification | 사용자 범위를 **최소 호스트부터**로 확정. 계약에 플랫폼 경계, 순수 함수, 네 계층 적용성, 문서 영향을 기록 |
| design 확장 | 새 화면·토큰 없음. 기존 `apps/mobile` 번들을 단일 `LynxView`에서 표시 |
| state-data 확장 | 새 서버 데이터 계층 없음. 기존 JS 계약의 `StorageModule.get/set/remove`만 `SharedPreferences`로 구현 |
| logic-scaffold · unit-design · unit-red | `HostPaths` 스캐폴드와 Java 테스트를 작성. 최초 컴파일 실패 뒤 URL 분기 테스트의 실제 assertion 실패를 확인 |
| logic · unit-green | Debug/번들 URL 및 이미지 URL 변환 구현. `sh apps/android/test-host-paths.sh` 통과 |
| ui-scaffold · ui-design · ui-red · ui-implementation · ui-green | 적용 안 함. 네이티브 UI 컴포넌트가 없고 화면은 기존 Lynx 번들 소유 |
| integration-design · integration-red | 번들·정적 자산 복사 테스트를 작성. 구현 전 복사 결과 누락으로 실패 확인 |
| integration-implementation · integration-green | `pnpm test:android-bundle`, `pnpm bundle:android`, `assembleDebug`, `assembleBundled` 통과. APK에서 번들과 이미지 자산 확인 |
| e2e-design · e2e-red · e2e-implementation · e2e-green | 에뮬레이터 실행에서 Debug 이미지 누락을 관찰하고 URL 변환을 수정. A1·A2 통과. A3 저장소 계측 테스트에서 `apply()`의 재시작 후 값 유실을 재현하고 세션 키를 동기 기록해 통과. A4를 온보딩·로그인 화면까지 확장하고 130% 글자에서 Facebook 로고 겹침을 수정해 통과. 초기 심사 버전의 실제 소셜 로그인과 로그인 뒤 화면은 미검증 |
| accessibility 확장 | 시스템 글자 크기 130%에서 첫 화면 텍스트 줄바꿈과 선택지 표시 확인. 스크린리더 판정은 아직 없음 |
| documentation · review | README, 워크플로 문서, ADR, 수동 기기 절차를 갱신. 빌드·첫 화면·A3 저장소 경계는 통과, 전체 E2E 완료 판정은 실제 소셜 로그인 검증까지 보류 |

Debug는 `pnpm preview`로 빌드된 번들을 제공한다. `pnpm dev` HMR 번들은
WebSocket 지원이 없어 현재 호스트에서 빈 화면이므로 수용 경로에 넣지 않았다.

## 후속 A5 — 소셜 인증 경계

초기 심사 버전의 소셜 로그인만을 대상으로 Android `WebAuthenticationModule`과
Apple 웹 OAuth 분기를 추가했다([ADR-0039](../adr/0039-android-social-oauth.md)).
순수 Java URL·콜백 검사, API 35 계측 3건, 모바일 통합 테스트와 `pnpm verify`가
통과했다. 임시 테스트 URL로 Apple 버튼의 브라우저 시작, 모의 딥링크 복귀,
브라우저 뒤로 취소를 관찰했다. 임시 설정은 번들과 APK에서 제거했다.
실제 제공자 로그인·A3 세션 갱신과 Android Apple 계정 삭제는 아직 수용 판정을 내리지 않았다.
