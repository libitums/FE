# 푸시 콘솔 (로컬)

학습자를 진행 단계로 나눠 맞춤 알림을 보내고, **대조군과 비교해 알림마다 복귀를 재는** 로컬 도구입니다([ADR-0129](../../docs/adr/0129-push-console-segment-campaigns.md)).
서버에 올리지 않습니다 — 이 기기에서 `pnpm push:console`로 띄우고, 발송은 기존 Edge Function `send-push`의 `announcement`(사용자 id 목록)를 부릅니다.

```sh
pnpm push:console          # http://127.0.0.1:4777
```

## 처음 한 번

설정은 저장소 밖 `~/.duru/push-console/config.json`에 둡니다(워크트리가 달라도 같은 기록을 봅니다). 환경 변수가 있으면 그쪽이 앞섭니다.

```json
{
  "supabaseProjectRef": "<프로젝트 ref>",
  "posthogProjectId": "<PostHog 프로젝트 id>",
  "posthogPersonalApiKey": "<선택 — phx_…, 권한 query:read>"
}
```

| 값 | 환경 변수 | 없으면 |
|---|---|---|
| Supabase 프로젝트 ref | `SUPABASE_PROJECT_REF` | 시작하지 않습니다 |
| service role 키 | `SUPABASE_SERVICE_ROLE_KEY` | 실행마다 `supabase projects api-keys`로 받습니다(`supabase login` 필요). 파일에 쓰지 않습니다 |
| PostHog 개인 키 · 프로젝트 id | `POSTHOG_PERSONAL_API_KEY` · `POSTHOG_PROJECT_ID` | 결과에서 「앱 열기 · 알림 누름」이 빠지고 학습한 날 · 지금까지 연 적만 봅니다 |

## 화면

- **세그먼트** — 푸시를 받을 수 있는 회원(기기 행 있음 · 시험 계정 제외)을 진행 단계로 나눈 수, 마지막으로 앱을 연 뒤 지난 시간, 문구 언어.
- **추천** — 「추천 받기」를 누르면 이 컴퓨터에 로그인된 Claude Code(`claude -p`)가 다음 24시간에 보낼 캠페인 2 ~ 4개를 고릅니다. 카드의 「이 추천으로 캠페인 만들기」는 양식만 채우고, 보내기는 직접 합니다.
- **새 캠페인** — 세그먼트 · 쉰 시간 · 현지 시각 창 · 쉬는 시간 · 대조군 비율 → 「대상 계산」으로 수와 언어별 미리보기 → 확인창에 보낼 사람 수를 적어 보냅니다(한글 자판에서도 되게 숫자로). 미리보기와 발송은 같은 대조군 기준값을 쓰고, 그사이 대상 수가 바뀌면 보내지 않고 다시 계산하라고 알립니다.
- **내 기기로 먼저 보기** — 새 캠페인 3단계에서 시험 계정(`duru_tester`) 기기에만 지금 문구로 한 통 보냅니다. 캠페인 기록 · 대조군 · 쉬는 시간에 들어가지 않고 `test-sends.jsonl`에 남습니다. 시험 계정이 아니면 서버가 거절합니다.
- **결과** — 캠페인마다 발송 그룹 vs 대조군의 24 · 72시간 복귀율, 차이(%p) · 95% 신뢰구간 · p값, 누적 복귀 곡선, `send-push` 응답.

## Claude 추천 (`recommend.mjs`)

- 보내는 것: 세그먼트별 사람 수 · 쉰 기간 · 문구 언어 분포 · 이 컴퓨터 시각별 도달 수, 지난 캠페인(최근 8개)의 지표 차이와 영어 문구, 기본 문구, 퍼널 분석 요약(`PRODUCT_FACTS`). **사람 이름 · 사용자 id는 보내지 않습니다.**
- 실행: `claude -p --output-format json --json-schema … --tools "" --strict-mcp-config --no-session-persistence`, 실행 폴더는 기록 폴더(저장소 지침을 읽지 않게). 5분이 넘으면 끊습니다. 한 번에 약 50초 · $0.2 (2026-11-12, claude-opus-5-5).
- 응답은 스키마로 모양을 고정하고, 다시 검사합니다 — 모르는 세그먼트 · 영어 없음 · 모르는 자리표시는 빼고 이유를 보여 줍니다. 마지막 추천은 `~/.duru/push-console/recommendations/latest.json`.

## 디자인

페이지는 [design-system](https://github.com/libitums/design-system)을 따릅니다 — 값을 페이지에 적지 않고, 서버가 앱과 같은 `@libitums/design-tokens`의 `variables.css` · `typography.css`와 랜딩의 Pretendard · Jost 폰트 패키지를 그대로 내줍니다(`/ds/` · `/fonts/`).

| 자리 | 컴포넌트 스펙 |
|---|---|
| 묶음 표면 | Card(M · L padding, `shadow.s1`, `radius.md`) |
| 버튼 | Button — 주 행동 Brand 1개(보내기), 보조 Outline, 탭 Subtle, 다이얼로그 Neutral · Subtle |
| 입력 | Text Field(56px · Label · Suffix · Counter · 바깥 focus ring) |
| 켜고 끄기 | Toggle sm |
| 대조군 비율 | Option Selector S · Outlined · Grid |
| 캠페인 · 결과 판정 | Status Indicator(보냄 · 효과 있음 = Completed, 집계 중 = In progress, 역효과 · 일부 실패 = Needs retry, 차이 불분명 = Locked) |
| 보내기 확인 | Dialog(Scrim `opacity.scrim`, `surface.floating`, 위 Neutral 계속 · 아래 Subtle 취소, ESC = 취소, focus 가둠) |

디자인 시스템이 밝은 테마 하나라 어두운 모드는 두지 않습니다.

## 세그먼트 (`segments.mjs`)

| id | 조건 (`learning_progress.progress.catalogProgress`) |
|---|---|
| `tutorial-cover` | 튜토리얼에 표지(`intro`)가 없음 |
| `tutorial-lesson1` | 표지는 있고 `S1`이 없음 |
| `tutorial-lesson2` | `S1`은 있고 `S2`가 없음 |
| `tutorial-rest` | `S2`는 있고 `RP`가 없음 |
| `episode-next` · `episode-mid` | 처음으로 `RP`가 없는 에피소드의 진행이 비었는지 · 시작했는지 |
| `all-done` | 모든 에피소드에 `RP` |
| `streak-at-risk` (겹침) | `learning_days` 연속 2일 이상 · 현지 오늘 학습 없음 |

- 현지 시각 · 날짜는 `learner_profiles.country_code`의 대표 시간대입니다. 표에 없는 나라는 시각 창을 켜면 빠집니다.
- 문구 언어는 나라로 고릅니다(VN vi · ID id · MY ms · 스페인어권 es · JP ja · 나머지 en). 서버는 앱 UI 언어를 모릅니다.

## 겹침 · 횟수

- 자동 「다시 돌아오기」(매일 10:00 UTC, 3일 · 7일 — ADR-0034 D5)를 앞뒤 24시간 안에 받았거나 받을 사람은 기본으로 뺍니다.
- 이 콘솔로 받은 뒤 쉬는 시간(기본 24시간) 안의 사람은 뺍니다. 대조군은 받지 않았으니 세지 않습니다.
- 컴패니언 선톡은 지금 시험 계정에만 나가고(`companion.settings.testers_only`), 시험 계정은 콘솔 대상이 아닙니다.

## 컴퓨터가 꺼져 있을 때 — Supabase 예약

콘솔은 이 기기에서 돌아서, 정해진 시각에 컴퓨터가 꺼져 있으면 보낼 수 없습니다. 그때는 그 시각 기준으로 대상 · 대조군 · 문구를 미리 계산해 캠페인 기록(`status: "scheduled"`)을 남기고, 캠페인마다 한 번만 도는 pg_cron 작업이 Vault의 `send_push_service_role_key`로 `send-push`를 부르게 합니다(「다시 돌아오기」와 같은 경로, 키가 이 기기 밖으로 나가지 않음). 작업은 실행 뒤 스스로 지워집니다.

- 대상은 계산한 때의 데이터로 고정됩니다 — 그사이 앱을 연 사람도 받을 수 있습니다.
- 캠페인마다 1분씩 띄워 예약하면 `send-push` 함수 로그의 요약(`devices · sent · failed`)을 캠페인별로 가를 수 있습니다. 기록의 전달 수는 비어 있습니다.
- 2026-11-12 20시 · 23시(KST) 3캠페인씩을 이렇게 보냈습니다(계산 스크립트는 콘솔 모듈을 그대로 씀).

## 같은 실험 묶음

- 캠페인마다 **묶음 이름**이 있습니다. 비우면 캠페인 이름에서 끝의 「N차」를 뗀 이름입니다(`레슨 2 재도전 저녁 1차` → `레슨 2 재도전 저녁`).
- 대조군은 묶음 이름으로 나눕니다 — 같은 묶음은 회차가 바뀌어도 **같은 사람이 대조군에 남습니다.** 묶음 결과는 「반복해서 받은 사람 vs 한 번도 안 받은 사람」의 누적 효과입니다.
- 결과 탭의 「같은 실험 묶음」은 회차들의 보낸 그룹 · 대조군 사람 수를 더해 다시 비교하고(`poolResults`), 회차별 72시간 차이를 표로 보여 줍니다. 같은 사람이 여러 회차에 세어지므로 실제보다 조금 더 확실해 보일 수 있습니다.
- 한 번에 150 ~ 400명이라 대조군 20%로는 신뢰구간이 ±15%p쯤입니다. 기본 대조군은 튜토리얼 레슨 세그먼트 50%, 나머지 30%입니다.

## 복귀를 재는 법 (`results.mjs`)

캠페인마다 대상을 `hash(캠페인 id, 사용자 id)`로 나눠 **대조군은 보내지 않습니다**. 발송 그룹 − 대조군의 차이가 알림의 몫입니다.

| 지표 | 출처 | 뜻 |
|---|---|---|
| 앱 열기 24 · 72시간 | PostHog (distinct_id = 사용자 id) | 발송 뒤 창 안에 앱 이벤트가 하나라도 있음 |
| 알림 누름 24 · 72시간 | PostHog `push_notification_opened` | 대조군은 0이 정상 |
| 학습한 날 24 · 72시간 | `learning_days` | 현지 날짜로 발송한 날 ~ 창 끝 날에 학습함 |
| 지금까지 앱을 연 적 있음 | `push_devices.last_active_at` | 발송 뒤 언젠가 앱을 열었음(창 없음) |

- 학습한 날은 날 단위라 발송한 날 발송 **전** 학습도 들어갑니다. 대조군도 같은 조건이라 차이는 그대로 읽어도 됩니다.
- 기록은 `~/.duru/push-console/campaigns/<id>.json` — 조건 · 문구 · 사람마다 그룹과 받은 문구 · `send-push` 응답. 이 파일을 지우면 결과를 볼 수 없습니다.

## 테스트

```sh
pnpm test:push-console
```
