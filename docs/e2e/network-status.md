# 분석 이벤트의 연결 종류 — 기기 확인

결정은 [ADR-0096](../adr/0096-network-type-in-analytics.md)이 진다. 자동 테스트는 문자열 해석 · 모듈 없음/실패 · `/batch/` 요청의 두 속성 · 호스트 분류표를 지키지만,
**실제 연결에서 호스트가 무엇을 보고하는지 · 옛 빌드 위에 덮어 깔았을 때 · 오프라인 이벤트가 나중에 그 값으로 들어오는지**는 기기에서만 판정한다.

## 준비

- Android: 읽기 전용 에뮬레이터(`-read-only -port 5556`) · `bundled` 변형 · `.env.local`의 PostHog 키(빌드 뒤 지운다). iOS: 시뮬레이터 · Debug 호스트.
- 판정: PostHog에서 그 기기의 최근 이벤트 `network` · `networkCost`(environment로 거른다) · logcat의 `FATAL` · `AndroidRuntime`.
- 연결 바꾸기(에뮬레이터): Wi-Fi 끔 `adb shell svc wifi disable`(셀룰러만 남음) · 비행기 모드 `adb shell cmd connectivity airplane-mode enable` · 데이터 절약 `adb shell cmd netpolicy set restrict-background true`.

| # | 조작 | 기대 | 환경 | 결과 |
|---|---|---|---|---|
| NS-E1 | 이 모듈이 없는 옛 빌드를 깔고 실행한 뒤, 새 빌드를 `install -r`로 덮어 깔고 실행 | 첫 설치 시각이 그대로(데이터 유지) · 크래시 없음 · 앱이 평소대로 선다 | 에뮬레이터 | 아래 기록 |
| NS-E2 | Wi-Fi에서 이벤트를 낸다(온보딩 `Next`) | `network = wifi` · `networkCost = unmetered` | 에뮬레이터 · 시뮬레이터 | 아래 기록 |
| NS-E3 | Wi-Fi를 끄고 이벤트를 낸다 | `cellular` · `metered` | 에뮬레이터 | 아래 기록 |
| NS-E4 | NS-E3에서 데이터 절약을 켜고 이벤트를 낸다 | `cellular` · `constrained` | 에뮬레이터 | 아래 기록 |
| NS-E5 | 비행기 모드에서 이벤트를 낸 뒤 비행기 모드를 끈다 | 연결된 뒤 그 이벤트가 `offline` · `unknown`으로 들어온다 | 에뮬레이터 | 아래 기록 |
| NS-E6 | iOS 저데이터 모드 · 셀룰러 | `constrained` · `cellular`/`metered` | 실기만 | 미실행 |

## 실행 기록

### 2026-11-04 — Android 에뮬레이터(Pixel_8 AVD, 읽기 전용) · `bundled` · 에이전트 실행, 사람 미확인

- 이 빌드는 `.env.local`의 운영 키로 보내 테스트 이벤트가 `environment = production`에 섞였다(실행당 3건 남짓).
- **NS-E1 통과** — 옛 빌드(1.1.0, 모듈 없음)를 실행한 뒤 새 빌드를 `install -r`. `firstInstallTime` 그대로(2026-10-14) · logcat `FATAL EXCEPTION` 0건 · 스플래시 → 온보딩.
- **NS-E2 통과** — Wi-Fi: `episode_update_splash_closed` · `entry_screen_viewed` · `episode_content_refreshed` 모두 `wifi` · `unmetered`.
- **NS-E3 통과** — Wi-Fi 끔(기본 네트워크 `MOBILE[NR]` validated): 같은 세 이벤트 `cellular` · `metered`. 처음 시도에서는 스플래시(약 24초)가 끝나기 전에 앱을 다시 띄워 이벤트가 나지 않았다 — 앱 결함이 아니라 조작 순서.
- **NS-E4 통과** — 데이터 절약(`Restrict background status: enabled`): 세 이벤트 `cellular` · `constrained`.
- **NS-E5 통과** — 비행기 모드에서 낸 `entry_screen_viewed` 두 건이 연결 뒤 `offline` · `unknown`으로 들어왔다(대기열).
- 같은 시간대 다른 사용자(옛 앱)의 이벤트는 두 속성이 없다 — 옛 호스트 · 옛 JS는 그대로다.

### 2026-11-04 — iOS 시뮬레이터(iPhone 17 Pro) · Debug 호스트 + `--bundle-url=main.lynx` · 에이전트 실행, 사람 미확인

- 호스트 로그에 `NetworkStatusModule registered` · 크래시 없음 · 스플래시 → 맵 → 설정까지 평소대로.
- **값 확인은 못 했다(NS-E2 iOS 미판정).** 이 시뮬레이터에서는 설정을 열어도 PostHog 대기열 저장(`StorageModule.set analytics.queue`)이 한 번도 없었다 — 이벤트가 만들어지지 않는다. **main 번들(이 변경 없음)로 바꿔 끼워도 똑같았다** — 이 변경의 결과가 아니라 이 환경의 기존 동작이다. 원인은 따로 본다.
- HostTests `NetworkStatusModuleTests`(분류표 · 이름 · 첫 보고 전 `unknown`)는 통과했다. iOS 값은 TestFlight 빌드 · 실기에서 PostHog로 판정한다(NS-E6와 함께).
