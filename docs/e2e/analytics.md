# 분석 이벤트 전송(PostHog) — iOS Release 수동 e2e

## 목적과 범위

앱이 이벤트를 PostHog로 보내는 것(실제 `lynx.fetch` 전송), 키가 없을 때 아무것도 보내지
않는 것, 두 스레드의 첫 렌더가 서로 다른 sink를 받아도 화면이 달라지지 않는 것(spec Q-5)을
자체 호스트 앱에서 확인한다. 자동 E2E: not applicable(runner/command 없음). 대역으로는
전송 · 하이드레이션 · PostHog 수신을 대신할 수 없어서 수동 절차로 고정한다.

정본: `.agent-harness/work/posthog-analytics/spec.md` §4.1(이벤트 카탈로그 18행) ·
§4.2(요청 모양) · §11 Q-5 · §12(한계). 이 문서에 없는 이벤트 이름 · property를 현장에서
만들지 않는다. 이벤트 관찰은 이 문서 한 곳에 모은다(다른 e2e 문서의 관찰 항목은 바꾸지 않는다).

## 전제

공통 전제([README](README.md)) + **Release 호스트**(`apps/ios`). Explorer는 판정 환경이 아니다.

- **키 없음(A)**: `apps/mobile/.env.local`에 `PUBLIC_POSTHOG_KEY`가 없거나 비어 있다.
- **키 있음(B)**: 같은 파일에 `PUBLIC_POSTHOG_KEY=phc_…`(PostHog 프로젝트 설정의 Project API Key)를
  둔다. 개발 · 시뮬레이터 빌드는 운영과 **별도 프로젝트 키**를 쓴다.
- 키는 **빌드 시점에 번들로 치환**된다. `.env.local`을 바꾼 뒤에는 반드시 `pnpm bundle:host`
  (빌드 + `apps/ios`로 번들 복사)를 다시 하고 호스트 앱을 다시 설치 · 실행한다. 앱만
  재시작해서는 이전 키가 남는다.

### 요청 관찰 수단(A2 · A3)

`us.i.posthog.com` 요청 유무만 본다(본문은 B에서 Live events로 본다).

1. **권장: 맥의 HTTP 프록시**(Proxyman · Charles 등). 시뮬레이터는 맥의 시스템 프록시를 따르므로
   맥에서 프록시를 켜고, 호스트 `us.i.posthog.com`의 HTTPS 복호화를 켠다. 필터에 `posthog`를
   걸고 앱 실행 시점부터 A1 전 구간을 기록한다.
2. **대체(프록시 없이)**: 맥에서 `sudo tcpdump -i any -n 'port 53' | grep -i posthog`로 DNS 조회를
   본다. 조회가 0줄이면 접속 시도가 없었다는 뜻이다(캐시된 이름은 놓칠 수 있어 앱을 새로 띄워
   시작 시점부터 잡는다). 본문 확인은 못 한다.
3. 프록시도 tcpdump도 못 쓰면 A2 · A3는 「관찰 불가」로 기록하고 통과로 세지 않는다.

## A — 키 없이 실행 가능

### A1. 화면 불변 · 하이드레이션 문제 없음

전제: 키 없음 → `pnpm bundle:host` → 새로 설치한 Release 호스트(토큰 없는 상태, [진입 흐름](entry-flow.md)).

단계:
1. 앱 실행 → 스플래시 → 온보딩 → 로그인 → 코드 검증 → 언어 선택 → 여정 입장 → 여정 맵.
2. 설정 탭으로 이동, 세션 옵션 토글(자동 재생 · 자막)을 켜고 끈다.
3. 머리의 알림 버튼으로 알림 화면을 열고 닫는다.
4. 앱을 종료했다가 다시 실행해 첫 화면(여정 맵)까지 간다.

관찰:
- 모든 화면이 분석 도입 전과 같다(문구 · 배치 · 이동 · 토글 상태 변화).
- 첫 화면이 그려질 때 하이드레이션 경고 · 깜빡임 · 빨간 오류 화면이 없다(메인 스레드와
  백그라운드 스레드가 서로 다른 sink를 받는 것이 화면에 영향이 없다는 가정 Q-5의 확인).
  Lynx DevTool 콘솔을 붙였다면 오류 · 경고 로그가 없다.
- 판정: 위 셋 중 하나라도 어긋나면 실패.

### A2. 키 없이 요청 0건

전제: A1과 같은 빌드. 「요청 관찰 수단」을 A1 시작 전에 켠다.

단계: A1의 1~4를 수행하는 동안 기록한다(앱 실행 시점부터).

관찰: `us.i.posthog.com`(어느 경로든)으로 가는 요청 · DNS 조회 **0건**. 1건이라도 있으면 실패.

### A3. `phx_` 개인 키 거부

전제: `.env.local`에 `PUBLIC_POSTHOG_KEY=phx_dummy0000000000` 같은 **가짜** `phx_` 값을 둔다.
`pnpm bundle:host` → 앱 재설치 · 실행. (실제 개인 키를 넣지 않는다.)

단계: A1 · A2를 그대로 반복한다.

관찰: 화면은 A1과 같고 `us.i.posthog.com` 요청 **0건**(앱이 `phc_`로 시작하지 않는 키를 거부한다).
요청이 나가면 실패. 확인이 끝나면 `.env.local`에서 가짜 값을 지운다.

## B — 키가 있어야 실행 가능(실제 `phc_` 키 필요)

전제: 별도 프로젝트의 실제 `phc_` 키를 `.env.local`에 넣고 `pnpm bundle:host` → 앱 재설치 · 실행.
PostHog 웹에서 해당 프로젝트의 **Activity → Live events**를 열어 둔다(도착에 수 초 걸린다).

| id | 단계 | 관찰(판정) |
|---|---|---|
| B1 | 앱 실행 → 진입 흐름 통과 → 설정 탭 tap | Live events에 `settings_opened` 1건. properties에 `$lib = libitums-lynx`, `$process_person_profile = false` |
| B2 | 설정 토글 · 알림 항목 tap · 스페셜 유닛 열기 · 나가기 | 각 이벤트가 이름 · properties 그대로 도착(spec §4.1 카탈로그와 대조: 예 `session_option_changed`의 `option` · `value`, `notification_item_tapped`의 `notificationId` · `target`, `messenger_unit_opened`의 `unitId` · `entrySource`). 전화번호 · 인증 토큰 · 대화 본문 · 기기 모델 · OS 버전이 properties에 **없다** |
| B3 | 앱을 완전히 종료 후 재실행 → 설정 탭 tap | 새 `settings_opened`의 `distinct_id`가 B1과 **다르다**(실행마다 새 사용자 — 한계 §12-1) |
| B4 | 비행기 모드를 켠 채 설정 탭 tap → 앱 조작 계속 → (a) 30초 안에 비행기 모드 해제 (b) 다른 회차: 켠 채 앱 종료 | 화면 동작 불변 · 오류 화면 없음. (a) 비행기 모드를 끈 뒤 15초 안팎에 **새 조작 없이** 도착한다(ADR-0029 D12 재시도). (b) 비행기 모드를 끄고 앱을 다시 켜면 **곧바로** 도착한다(저장된 대기열) |
| B5 | 이벤트 하나 발생 직후 홈으로 보내고 5초 뒤 앱 복귀 | 도착 여부를 **기록만** 한다(background flush 없음의 실제 영향 — 판정 아님) |

## 실행 기록

| 환경 | bundle SHA-256 | A1 | A2 | A3 | B1 | B2 | B3 | B4 | B5 | 확인자 · 시각 |
|---|---|---|---|---|---|---|---|---|---|---|
| iOS Simulator(iPhone 17 Pro) · iOS 26.5 · **Debug 호스트(내장 번들)** — Release 아님 | 미기록 | 통과(키 없는 빌드, `ce80bc2` — 여정 맵 · 설정 탭 · 자동 재생 토글 정상, JS 오류 0) | 관찰 불가(프록시 · tcpdump 미사용 — 통과로 세지 않음) | 미실행 | 미실행(키 없음) — 대체 관찰은 아래 | 미실행(키 없음) | 미실행 | 미실행 | 미실행 | 루트 에이전트 · 2026-09-29 09:55–10:15 KST |
| iOS Simulator(iPhone 17 Pro) · iOS 26.5 · **Debug 호스트(내장 번들) · 실제 `phc_` 키** — Release 아님 | `9c796a8d5030…`(응답 기록용 진단 줄을 더한 임시 번들 — 커밋 `3fbf26b` + 진단) | 미실행(이 회차는 키 있음) | 미실행 | 미실행 | 통과 — `settings_opened`가 `us.i.posthog.com/batch/`에 `200 {"status":"Ok"}`, `$lib = libitums-lynx`, `$process_person_profile = false` | 부분 — `session_option_changed`(`option` · `value`) · `notifications_opened` · `notification_item_tapped`(`notificationId` · `target`) 모두 200, 개인정보 속성 없음. 스페셜 유닛 열기 · 나가기는 새 설치에서 유닛이 전부 잠겨 미실행 | 통과 — 재실행 뒤 `settings_opened`의 `distinct_id`가 앞 실행과 다름 | 미실행(시뮬레이터에 비행기 모드 없음) | 관찰: 이벤트 3ms 뒤 전송 · 200, 홈으로 가기 전에 끝남 | 루트 에이전트 · 2026-09-29 10:35–10:41 KST |
| iOS Simulator(iPhone 17 Pro) · iOS 26.5 · **Debug 호스트 · 대기열 회차** — 전송 대상을 로컬 수집 서버로 바꾼 임시 번들(`fd2e64f` · `a6f51e4` + 호스트 교체) | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 대체 관찰로 통과 — (a) 서버를 끈 채 이벤트 2건 → 서버를 켜자 새 조작 없이 약 23초 뒤 도착 (b) 끈 채 앱 종료 → 서버를 켜고 재실행하자 1초 안에 원래 `distinct_id`로 도착. 첫 시도(`fd2e64f`)는 실패 — Lynx `fetch`가 연결 실패를 status 499로 돌려 SDK가 버렸다(수정 `a6f51e4`) | 미실행 | 루트 에이전트 · 2026-09-29 12:37–12:49 KST |
| iOS Simulator · Release | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미기록 — 실행 시 입력 |
| iPhone 실기 · Release | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미기록 — 실행 시 입력 |

**Debug 회차의 대체 관찰(판정 아님).** 합성 키(`phc_…`)로 빌드하고 전송 호스트만 맥의 로컬 수집
서버로 바꾼 임시 번들(커밋하지 않음)에서, 설정 탭 · 자동 재생 토글이 `/batch/` 요청 두 건
(`settings_opened` · `session_option_changed`, 같은 `distinct_id`, `$lib = libitums-lynx`,
`$geoip_disable = true`, `$process_person_profile = false`)으로 도착했다. 이 관찰이 결함 하나를
드러냈다 — 수정 전(`ce80bc2`)에는 키가 있어도 요청이 0건이었다. 기기의 background 런타임에는
`globalThis.fetch` · `globalThis.lynx`가 없고 맨 식별자 `lynx.fetch`만 있어, 전송 해석이 늘 없음을
돌려줬다(수정 `f2a1079`). vitest는 두 이름을 구분하지 못해 unit · integration이 잡지 못한다.

B는 실제 `phc_` 키가 생기기 전까지 실행할 수 없다(spec Q-4). 회차가 생기면 해당 행의
`미실행` · `미기록`을 그 회차의 값으로 바꾼다. B5는 판정이 아니라 관찰 기록이다.
