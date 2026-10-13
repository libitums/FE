# 크래시 리포팅(에러 경계의 오류 통로 보고) — Android API 30 에뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들 크기만 재었습니다.
- 기능 PR: 크래시 리포팅 1 — JS 예외 수집 + Android 호스트에 Sentry(이 보고서와 같은 PR)
- 대상 commit: `feat/crash-reporting-sentry`의 `1c626045`
- 기기: Android API 30 arm64 에뮬레이터(AVD `R6_API30`) — 동작 확인(e2e A단계)만 했고 성능 캡처는 하지 않았습니다.
- OS: Android 11(API 30)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `packages/ui-lynx/dist`(Node 22.23.2). 접속 값 파일(`apps/mobile/.env*`)이 없는 작업 트리에서 빌드했습니다.
- 측정 일시: 2026-10-13

## 시나리오

- 번들 크기: 이 브랜치에서 `pnpm build` 뒤 `pnpm size:check`를 한 번 돌려 `main.lynx.bundle` · `static/image` · `packages/ui-lynx/dist`의 바이트를 상한과 비교했습니다.
- 기준 커밋(`fa00ee33`)의 번들은 이 회차에 다시 빌드하지 않았습니다 — 증가분을 수치로 내지 못합니다.
- Android 산출물: e2e A단계가 만든 `bundled` APK의 dex · 네이티브 라이브러리를 읽었습니다(같은 날, `3dcf0292`, `google-services.json` 없는 작업 트리).

## 이 변경이 무엇을 건드렸나

- 메인 · 백그라운드 두 스레드에 실리는 것: 순수 모듈 `lib/crash-report.ts`(24줄 — 값 변환 하나 · `lynx.reportError` 호출 하나)와 `ErrorBoundary.componentDidCatch`의 호출 한 줄.
  `ErrorBoundary`가 두 스레드에서 import되므로 두 번 실립니다.
- 실행 경로: 보통의 실행에서는 이 코드가 **돌지 않습니다.** 에러 경계가 렌더 예외를 잡았을 때만 한 번 불립니다.
- 새 npm 의존성 · 이미지 · 음원은 없습니다. JS 쪽에 Sentry SDK를 넣지 않았습니다.
- Android 호스트: `io.sentry:sentry-android-core:8.60.0`과 호스트 클래스 일곱이 더해졌고, 앱 시작(`DuruApplication.onCreate`)의 첫 일로 `CrashReporting.start`가 불립니다.
  DSN이 없는 빌드에서는 DSN 문자열 검사 하나로 끝나고 SDK를 초기화하지 않습니다.

## 분석 결과

| 대상 | 크기 | 상한 | 여유 |
| --- | --- | --- | --- |
| `apps/mobile/dist/main.lynx.bundle` | 1,721,178 bytes | 1,722,000 bytes | 822 bytes |
| `apps/mobile/dist/static/image` | 8,688,181 bytes | 11,520,000 bytes | 2,831,819 bytes |
| `packages/ui-lynx/dist` | 512,483 bytes | 513,000 bytes | 517 bytes |

- 세 대상 모두 상한 안입니다. 상한(`devtools/bundle-size/budget.json`)은 바꾸지 않았습니다.
- `main.lynx.bundle`의 증가분은 재지 못했습니다. 상한 note가 적은 3b-2의 실측 1,720,937 bytes(`d5f6ff31`)와는 241 bytes 차이지만, 그 커밋과 이 브랜치의 기준 커밋 사이에 앱 소스 변경이 더 있어
  그 차를 이 변경의 몫으로 읽을 수 없습니다. 같은 날 e2e가 모의 접속 값으로 만든 번들은 1,721,225 bytes였습니다 — 47 bytes의 차는 번들에 들어간 접속 값이 달라 생긴 것으로 봅니다(추론 — 따로 가르지 않았습니다).
- `static/image` · `packages/ui-lynx/dist`는 3b-2 보고서의 값과 같습니다(이 변경이 건드리지 않았습니다).
- Android `bundled` APK(`3dcf0292`): dex 1개 · `classes.dex` 3,552,224 bytes, 네이티브 라이브러리에 `libsentry*.so` 0개(`.so` 추가 없음). Sentry를 넣기 전의 dex 크기는 이 회차에 재지 않았습니다.

수집하지 못한 항목: 렌더링 · 메모리 · 앱 시작 시간. `performance:capture`는 iOS 수집 경로이고 이 변경의 런타임 영향은 Android 호스트 쪽(앱 시작의 `CrashReporting.start`)에 있어, 이 회차에는 어느 쪽도 캡처하지 않았습니다.

## 결론과 후속

- JS 번들은 상한 안이지만 여유가 822 bytes로 줄었습니다. 다음 기능 하나가 상한을 넘길 수 있습니다 — 그때 실측으로 다시 정합니다.
- 런타임에서 재야 할 것: DSN을 넣은 `release` · `bundled` 빌드의 콜드 스타트(`SentryAndroid.init`이 `Application.onCreate`의 첫 일로 돕니다)와 오류가 연달아 날 때 호스트 깔때기가 화면을 늦추는지.
  e2e B단계(같은 날, DSN을 넣은 `bundled`)는 이 둘을 직접 재지 못했습니다 — 오류 한 건의 호스트 콜백 구간이 로그 시각으로 2 ~ 7 ms였다는 간접 값만 있고(다른 리스너가 섞인 구간, 두 표본) 콜드 스타트는 재지 않았습니다.
- 기준 커밋과 같은 조건으로 번들을 나란히 빌드해 증가분을 수치로 남기는 일이 남았습니다.

## 제한 사항

- 빌드 1회 표본이고 렌더링 · 메모리 · 앱 시작 시간은 미측정입니다. 이 기록은 기준값이 아니며 성능 판정을 하지 못합니다.
- SDK를 실제로 초기화한 빌드(DSN 있음)는 e2e B단계에서 에뮬레이터 한 대로 한 번 돌았으나 시간을 재는 실행이 아니었습니다. 초기화 비용 · 세션 추적 · ANR 감시가 앱에 주는 영향은 이 기록으로 말할 수 없습니다.
- Android 산출물 수치는 `google-services.json` 없는 작업 트리의 `bundled` 한 번의 값입니다. 출시 AAB의 값이 아니며 Sentry 이전 값과의 비교가 없습니다.

## 2026-10-13 main(#242) 병합 뒤

- `main.lynx.bundle` 1,722,103 bytes [실측] — 상한 1,722,000을 103 bytes 넘어 1,723,000으로 올렸다(사용자 결정, `devtools/bundle-size/budget.json` note). 이 브랜치 단독의 병합 전 실측은 1,721,225 bytes였다.
