# ADR-0211: 내 스토리 올리기 창의 시간대 — 기기 시차가 학습 프로필 나라보다 먼저, 시차 0이면 스토어 나라

- 상태: **채택 — 서버 파일(PR `fix/my-story-slot-timezone`) · 앱(스토어 나라를 목록 · 단어/카드 올리기에 싣는 PR, 서버 PR 뒤), 운영 미적용 · 함수 미배포**.
- 날짜: 2026-11-27
- **사용자 결정(2026-11-27)**: 「스토어 나라 값 맞춰서」 — 현지 시각을 정할 때 스토어 나라 값을 기준으로 맞춘다.
- 고치는 결정: [ADR-0191](0191-my-stories-reactions-as-chat.md) D8(시간대 창 — 「프로필 · 지역 · 학습 나라 → 앱이 보낸 차이 → UTC」).
  이어받는 결정: [ADR-0178](0178-friend-stories.md)(`user_timezone` · 스토리 알림) · [ADR-0127](0127-companion-push-target.md).

## 맥락

- 운영(2026-11-27 SELECT): Asia/Seoul 사용자(Android SM-S931N, 시험 계정)의 11-26 16:32 · 11-27 16:30 KST 사진 스토리가 `morning`으로 기록됐다.
  같은 사람의 11-27 18:48 KST는 `night`(맞음). Kabul · Jakarta 사용자는 맞았다.
- 기기 시차는 맞았다. 탐침 번들로 `new Date().getTimezoneOffset()`을 읽었다 — Android(Pixel 8 에뮬레이터, `assembleBundled`, Lynx 4.0 quickjs,
  메인 · 배경 스레드)와 iOS(시뮬레이터, JSC) 모두 Asia/Seoul에서 **-540**(1월 · 7월 같음). Android에는 `Intl`이 없고(IANA 이름을 JS로 못 읽음),
  iOS는 `Intl…timeZone` = `Asia/Seoul`. 앱은 `tz_offset_min: 540`을 보냈다.
- `my_story_window`는 `companion.user_timezone`(프로필 시간대 → `last_region` → **학습 프로필 나라**)이 있으면 기기 시차를 보지 않았다.
  이 사용자의 학습 프로필 나라는 11-27 09:47:45 UTC(18:47 KST)에 KR로 다시 저장됐다 — 그 행은 16:30 기록 뒤 · 18:48 기록 바로 앞에 바뀌었다
  (행 xmin 472906, 슬롯 xmin 466809 · 472949). 그 전 나라는 KR이 아니었고(시험 계정이 나라를 자주 바꿈), 16:30 KST를 아침으로 만드는
  UTC−3 ~ +4 나라였다.
- 학습 프로필 나라는 「레슨 문장에 들어가는 나라」(자기소개)라, 지금 있는 곳의 증거가 아니다.
- `companion.profiles.timezone` · `last_region`은 운영 7,287명 중 **0명** — 앱이 시간대를 저장하지 않고, 채팅에 `client_region`을 싣지 않는다.
  스토어 나라는 앱이 이미 안다(`purchaseStore().storefront` — iOS `Storefront.current.countryCode` · Android RevenueCat
  `getStorefrontCountryCode`) — 사진 · 글 올리기는 `client_region`으로 이미 보낸다(위기 연락처용, #598).

## 결정

### D1. 판정 순서

1. 저장된 IANA 시간대(`companion.profiles.timezone`)
2. 기기 시차(분) — **0이 아니고** -720 ~ 840일 때
3. 스토어 나라의 대표 시간대 — 요청의 `p_region`, 없으면 저장된 `last_region`
4. 학습 프로필 나라의 대표 시간대
5. UTC

- **시차 0은 「모름」이다.** 기기가 못 읽은 0과 UTC+0 나라를 가릴 수 없다. UTC+0 나라(영국 겨울 · 포르투갈 · 가나 …)는 3의 나라 시간대가 같은
  답을 내므로 잃는 것이 없다. 0인데 나라도 모르면 UTC — 옛 동작과 같다.
- 기기 시차가 스토어 나라보다 먼저다 — 여행 중에는 기기가 맞고, 스토어 나라는 계정을 만든 곳이다. 여러 시간대 나라(미국 · 브라질 · 인도네시아 ·
  멕시코 · 러시아)도 기기 시차가 정확하다.
- 학습 프로필 나라는 스토어 나라 뒤 — 사람이 고른 자기소개 값이라 가장 약한 증거다.

### D2. 스토어 나라 표 — 내 스토리 전용

- `companion.story_country_timezone(country)` = 기존 `companion.country_timezone`(44개, `_shared/push-campaign-locale.ts`와 같은 표) + 보충:
  스페인어권(BO · CR · CU · DO · EC · GT · HN · NI · PA · PR · PY · SV · UY · VE) · MO · BN · LA · TL · MN · KZ · IR · IQ · NZ · PT · NL · BE ·
  CH · PL · SE · MA · GH · ZA. 여러 시간대 나라는 인구 대표(US 동부 · BR 상파울루 · ID 자카르타 · MX 멕시코시티 · RU 모스크바).
- 주요 시장(vi · id · th · ms · es · ja · zh-TW 사용 나라 + MX · BR · US)은 모두 있다(TZ6).
- `user_timezone` · `country_timezone`은 **바꾸지 않는다** — 바꾸면 스토리 알림(현지 09 ~ 20시, 시간대 없으면 제외) · 하루 한 번 판정의 대상이
  달라진다. 표를 합치는 것은 그 기능의 결정으로 남긴다.

### D3. 인자 — RPC 여섯에 `p_region text default null`

- 서버: `companion_my_photo_gate` · `companion_save_my_photo_story` · `companion_my_text_gate` · `companion_save_my_text_story` — Edge가 요청의
  `client_region`을 넘긴다. 앱: `companion_my_stories` · `companion_post_my_story` — 앱 PR이 스토어 나라를 싣는다.
- 본문은 그대로 두고 인자와 창 호출만 바꾼다(정의를 읽어 고쳐 쓰는 20270104 · 20270107의 방식). 옛 서명은 지운다 — 기본값 인자가 겹치면 부를 때 모호하다.
- 옛 앱 · 옛 Edge(인자 없음)는 그대로 된다. **적용 순서: 마이그레이션 → Edge 배포 → 앱.** 새 Edge · 앱이 옛 함수에 `p_region`을 넘기면 함수를 찾지 못한다.

### D4. 기기 IANA 이름 — 다음 단계(이번에 하지 않음)

- 가장 정확한 값은 기기의 IANA 시간대 이름이다(서머타임 · 여러 시간대 나라를 모두 맞힘). Android PrimJS에는 `Intl`이 없어 JS로 읽을 수 없고,
  호스트 모듈(iOS `TimeZone.current.identifier` · Android `ZoneId.systemDefault()`)이 필요하다 — **네이티브 출시**가 따른다.
- 읽게 되면 `profiles.timezone`에 저장해 D1의 1이 되게 한다. 그러면 선톡(시각 맞추기 · 조용한 시간 · `localHour`) · 기억 추출의 `localDate` ·
  스토리 알림도 함께 맞아진다 — 그 기능들은 지금 `profiles.timezone` · `last_region`만 보거나(선톡 · 기억 — 둘 다 0명이라 모두 UTC/건너뜀)
  학습 프로필 나라를 쓴다(스토리 알림). 저장은 그 기능들의 동작을 바꾸므로 따로 결정한다.
- 스토어 나라는 그 값이 없을 때의 대체로 남는다.

## 대가

- 시차 0 + 나라 모름은 여전히 UTC다.
- 스토어 나라는 계정 나라라 다른 나라로 이사한 사람에게는 틀릴 수 있다 — 기기 시차가 있으면(거의 늘) 쓰이지 않는다.
- 이미 잘못 잡힌 기록 2건(`my_story_slots`, 11-26 · 11-27 `morning`)은 고치지 않는다. 그 날짜의 창은 다시 판정되지 않고(`local_day`가 지남),
  잘못 쓴 칸은 이미 지난 아침이라 그날 낮 창이 오히려 남았다 — 사용자 손해가 없다. 기록을 `day`로 바꾸려면 같은 날 `day` 줄이 없는지 보고
  한 줄씩 고친다(운영 쓰기라 사용자 결정).

## 검증

- 단위: `_shared/companion-my-story-handler.unit.test.ts` MH2 · MH9 — Edge가 문 · 저장에 `p_region`을 넘긴다(red → green).
- 통합(embedded Postgres): `migrations/my-story-slot-timezone.integration.test.ts` TZ1 ~ TZ7 — 시간대 없음 + 시차 0 + KR → 16:30 KST `day` ·
  학습 나라 GB + 시차 +540 → `day`(운영 재현) · 시차 0 + GB = UTC · 학습 나라 · UTC 차례 · 저장 시간대 먼저 · 표(주요 시장 · 이름이 Postgres에 있음) ·
  RPC 여섯 서명 · 목록과 올리기가 같은 창. 스캐폴드(인자만, 옛 판정)에서 TZ1 · TZ2 · TZ3 · TZ6 · TZ7 red 확인.
- 앱(PR `fix/my-story-slot-timezone-app`): `lib/companion-api.my-stories.unit.test.ts` MS-S5(읽기 · 올리기에 `p_region`, 모르면 키 없음) ·
  `app/my-stories-wiring.region.integration.test.ts` MSR1 · MSR2(결선이 요금제의 스토어 나라를 싣는다, 형식이 다르면 null) — red → green.
- 기기: 탐침 번들 — Android `assembleBundled`(Pixel 8 에뮬레이터, Asia/Seoul) · iOS 시뮬레이터(iPhone 17 Pro). 위 「맥락」의 값.
