# ADR-0146 — 컴패니언 스냅샷 · 음성은 Supabase가 만든다 — 표 하나 `companion.media`, 요청은 바로 pending, 생성은 Edge 백그라운드

- 상태: **제안** — 사용자 결정(2026-11-10 ~ 13)을 마이그레이션 `20261130120000_companion_snapshot_voice.sql`과 Edge Function
  `companion-snapshot` · `companion-voice`로 옮겼다. 운영 적용 2026-11-14 — SQL(SQL 편집기, 기록 미정리) · 비밀 `OPENAI_API_KEY` ·
  `ELEVENLABS_API_KEY`(실험실과 다른 키) · `companion-refs` 기준 그림 열 장 · 함수 `companion-snapshot` · `companion-voice` · `delete-account` 배포.
  앱 화면은 아직 없다. ⟨2026-11-15⟩ 앱 연결 1단계 — 메신저 서버 모드의 기존 Snapshot · Snap voice가 이 서버를 부른다(아래 「앱 연결」).
- 날짜: (채택일에 적는다)
- 다루는 축: 스냅샷 · 음성을 어디서 만들고, 어떻게 저장 · 과금 · 재사용하는가.
  **다루지 않는 것**: 앱 화면(Lynx) · 대시보드 · 출석 보상 · 엔진 고르기 실험(→ ops-dashboard 스냅샷 실험실).
- 이어받는 결정: [ADR-0117](0117-messenger-chat-turns-coins-new-friend.md) D4(무제한도 사진 · 음성은 엽전) ·
  [ADR-0131](0131-companion-schema.md) · [ADR-0133](0133-companion-public-function-access.md)(표는 `companion`, 닿는 길은 `public.companion_*`) ·
  [ADR-0140](0140-yeopjeon-launch.md) D1(음성 15 · 사진 35 · 다시 그리기 25).
- 명세: [스냅샷 · 음성](../specs/ai-companion-snapshot.md) · [API §2.9](../specs/ai-companion-api.md).

근거 표시: **[코드]** 저장소 코드 · **[사용자]** 사용자 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. **파이프라인은 대시보드에만 있었다** [코드 — ops-dashboard `companion_snap.py` · `companion_lab.py`]. 맥미니가 OpenAI · ElevenLabs를 부르고 로컬 sqlite에 저장했다. 운영 DB · Storage와 상관없다.
2. **앱이 부를 서버가 없었다** [코드]. 앱은 컴패니언 서버(Supabase Edge + `companion` 스키마)만 부른다.
3. **한 장에 1분 안팎 걸린다** [추론 — lab 실험 시간]. 요청 하나가 그만큼 붙잡혀 있으면 앱이 나가거나 끊길 때 결과를 잃는다.
4. **엽전 예약은 메시지 턴 함수 안에 들어 있었다** [코드 — `companion_begin_turn`]. 사유 칸이 없었다.

## 결정

### D1. Supabase Edge Function 둘 + 표 하나 [사용자 — 2026-11-13]

- `companion-snapshot` · `companion-voice`. 같은 핸들러(`_shared/companion-media-handler.ts`)에 kind만 다르다.
- 표 `companion.media` 하나(kind `snapshot` · `voice`). 상태 `pending` → `complete` · `blocked` · `failed`.
- 대시보드 파이프라인을 TypeScript로 옮겼다. 프롬프트 글(PROMPT_SYSTEM · PROMPT_TOOL · CHECK_SYSTEM · CHECK_TOOL · SELF_LOOK · learner_line ·
  image_prompt · with_pass)은 lab 6f082ff 그대로다. 앱에서 더한 것은 미성년자 · 나이 모름의 엄격한 규칙 줄 하나다.

### D2. 요청은 바로 pending, 생성은 백그라운드 [사용자]

- 요청 함수(`companion_media_begin`)가 판정 · 예약 · pending 행을 한 트랜잭션으로 만들고 202로 돌려준다.
- 생성은 응답 뒤 `EdgeRuntime.waitUntil`로 돈다(`chat-send`의 턴 뒤 작업과 같은 방식). 끝나면 `companion_media_finish`가 닫는다.
- 앱은 `companion_get_media`로 상태를 다시 읽는다.
- 함수가 도중에 죽으면 pending이 남는다. `media_pending_minutes`(10분)가 지나면 다음 요청 · 정리 작업이 실패로 닫고 예약을 푼다.

### D3. 엔진은 한 번, 다시 하는 것은 엔진 오류뿐 [사용자]

- 스냅샷: 프롬프트 노드(Haiku) → 이미지 편집 1회 → 검사 노드(Haiku 비전).
- 다시 하는 것: 이미지 · 음성 엔진의 연결 실패 · 시간 초과 · 408 · 409 · 429 · 5xx · 빈 결과. 한 번만.
- 다시 하지 않는 것: 엔진 안전 거절(blocked), 다른 4xx, 노드 호출 실패, 검사 탈락.
- 검사에 떨어진 그림은 Storage에 올리지 않는다.

### D4. 엽전 예약을 일반화한다 — 사유 `photo` · `voice` · `photo_redraw` [사용자]

- `credit_holds.reason`(기본 `message`)과 `companion.reserve_hold(user, reason, ref, character, amount)`.
- 사진 · 음성 예약은 `client_message_id` 자리에 media id를 넣는다. 원장 reserve 줄에 사유 · media id를 적는다.
- 덕수쌤 체험은 메시지에만 쓴다. 시험 계정도 엽전을 낸다(ADR-0117 D4 — 서버 메시지에도 시험 계정 무제한 규칙이 없다 [코드]).
- 메시지 턴(`companion_begin_turn`)은 같은 규칙을 안에 그대로 둔다. 다시 쓰면 턴 함수 전체를 또 복사해야 한다.

### D5. 저장본 재사용 · 다시 그리기 [사용자]

- 같은 메시지를 다시 누르면 저장본(무료). `again: true`만 새로 만든다 — 스냅샷 25(앞 그림이 없으면 35), 음성 15.
- 앨범에는 둘 다 남는다.

### D6. 앨범은 대화와 떨어져 산다 [사용자]

- `companion.media`는 대화 · 메시지에 외래 키를 걸지 않는다. 대화 초기화로 지워지지 않는다. 만들 때의 말풍선을 `source`에 적는다.
- 계정 삭제: 행은 `auth.users` cascade, 파일은 `delete-account`가 지운다(실패해도 계정 삭제는 계속, 남은 파일은 `companion_media_orphans`).
- 파일은 비공개 버킷 `companion-media/<user_id>/…`. 앱은 자기 토큰으로 서명 URL을 만든다(자기 폴더 읽기 정책만).

### D7. 학습자 모습은 프로필 설정 `snapshot_self` [사용자]

- `female`(기본 — 스토리 bible의 플레이어) · `male` · `hidden`(손 · 어깨만). 프롬프트 노드 입력과 이미지 프롬프트에 명시한다. 얼굴은 늘 그리지 않는다.

### D8. 기준 이미지 · voice id는 DB와 비공개 버킷 [사용자]

- 기준 이미지: 버킷 `companion-refs/<slug>-ref.png`(+ `-expressions.png`). 올리는 일은 사용자가 한다. 없으면 503 `not_configured`, 예약 없음.
- voice id · slug 순서 · 외모 메모: `companion.characters.media`(키가 아니라 id라 DB에 둔다).
- 비밀은 Edge 비밀 `OPENAI_API_KEY` · `ELEVENLABS_API_KEY`(Anthropic은 기존 키). 없으면 503 `not_configured`.

## 버린 대안

- **요청 하나에 끝까지(동기)** — 1분 가까이 붙잡힌다. 앱이 나가면 결과를 잃고, 예약이 붙잡힌 채 남는다.
- **작업 큐 표 + pg_cron 작업자** — 확실하지만 움직이는 부분이 늘고 처음 결과가 cron 주기만큼 늦다. `waitUntil` + 시간 초과 정리로 충분하다고 본다 [추론]. 실패가 잦으면 다시 본다.
- **스냅샷 · 음성 표를 따로** — 상태 · 예약 · 앨범 · 정리 규칙이 같다. 칸 몇 개만 다르다.
- **검사에 떨어진 그림도 저장(운영 검토용)** — 유저에게 보이지 않을 그림이 남는다. 운영은 판정 · 프롬프트로 본다.
- **앱이 보낸 메시지 글로 만들기** — 남의 글 · 고친 글로 그릴 수 있다. 서버가 메시지를 직접 읽는다.

## 대가

- `waitUntil`은 함수 수명 안에서만 돈다. 이미지 엔진이 수명보다 오래 걸리면 실패로 닫힌다(예약은 풀린다) [추론 — Edge 수명은 플랜마다 다르다].
- Storage 파일과 DB 행은 한 트랜잭션이 아니다. 닫기 전에 정리된 작업이 올린 파일은 고아가 될 수 있다 — `companion_media_orphans`로 찾는다.
- 화면용 WebP를 만들지 않는다(Edge에 `cwebp`가 없다). 앱이 원본 PNG를 줄여 보인다.

## 재검토 조건

- 엔진 · 품질을 실험실 결과로 정하면 설정만 바꾼다. 비율은 `auto`(3:2 · 1:1 중 프롬프트 노드가 고름, 사용자 2026-11-14).
- 원가 실측으로 단가(35 · 25 · 15)가 바뀌면 설정 키만 바꾼다.
- 백그라운드 실패(`expired`)가 잦으면 작업 큐로 옮긴다.
- 하루 상한은 기본 없음(엽전이 한도, 사용자 2026-11-14). 오류 폭주 · 남용이 보이면 `snapshot_daily_limit`에 숫자를 넣고, 음성도 같은 스위치를 더한다.

## 적용 기록 / 리뷰 반영

### 2026-11-14 운영 적용

- SQL `20261130120000_companion_snapshot_voice.sql`을 SQL 편집기로 적용했다. **`supabase_migrations.schema_migrations`에는 기록되지 않았다** —
  다음 `supabase db push` 전에 `supabase migration repair --status applied 20261130120000`으로 기록한다.
- 비밀 `OPENAI_API_KEY` · `ELEVENLABS_API_KEY`, `companion-refs` 기준 그림, 함수 `companion-snapshot` · `companion-voice` · `delete-account` 배포.

### 2026-11-14 리뷰 반영 — 마이그레이션 `20261202120000_companion_media_limits.sql` + Edge 코드

20261130은 운영에 적용돼 고치지 않는다. DB 변경은 모두 새 마이그레이션이다(열린 PR의 `20261201120000_coin_claim_valid_units.sql` 다음).

1. **[High] 유료 호출 누수 — 시도 상한 · 연속 실패 가드** [코드]. blocked · failed는 엽전을 풀고 `snapshot_daily_limit`(pending · complete)에도
   안 잡히는데 엔진 비용은 이미 났다 — 안전 정책에 걸리는 장면을 무료로 끝없이 돌릴 수 있었다.
   - `companion.media_attempt_gate`: 그날(UTC) 엔진까지 간 시도를 상태와 상관없이 센다(`refs_missing`만 뺀다).
     설정 `snapshot_daily_attempts` 30(다시 그리기 포함) · `voice_daily_attempts` 60. 그날 마지막 complete 뒤 blocked · failed가
     `media_failure_streak_limit` 5번 이어지면 그날은 그 종류를 그만.
   - 429 `attempt_limit` `{kind, reason: attempts | failures, limit, resetsAt}` — `usage_time_limit` · `daily_limit`와 같은 `{error, detail}` 모양.
     예약 · 행 없음. 저장본(cached)은 막지 않는다. 계약 `MEDIA_ERRORS`에 더했다.
   - 기본값 근거 [추론]: 스냅샷 30번 = 엽전 1,050(상점 1,200팩 수준)이라 정상 사용으로는 닿지 않고, 닿아도 한 유저의 하루 원가가 작다.
     음성은 단가가 싸고 메시지마다 누를 수 있어 두 배. 정상 장면이 다섯 번 연속 걸릴 일은 드물다. 셋 다 설정에서 고치고 `null`이면 끈다.
   - 대가: 엔진 장애가 길면 성실한 유저도 그날 5번 실패 뒤 막힌다. 장애 때 운영자가 `media_failure_streak_limit`을 올리거나 끈다.
2. **[Medium] 제한 시간이 Edge 실행 상한을 넘었다** [코드]. 이미지 300초 × 2 · 텍스트 90초 × 2 vs 이 저장소의 상한 150초
   (`supabase/cron/companion.sql`). 작업이 도중에 죽으면 pending이 만료 정리로 닫히고, 만료가 짧으면 예약을 푼 뒤 늦은 업로드가 올 수 있었다.
   - `_shared/companion-media-budget.ts`: 요청 받은 때부터 140초(10초 여유) 예산. 단계마다 `min(단계 상한, 남은 시간 − 뒤 단계 몫)`만 기다리고,
     이미지는 최소 60초를 못 주면 부르지 않는다. 재시도도 남은 예산이 최소에 못 미치면 하지 않는다. 예산이 없으면 그 단계 실패 코드로 닫는다
     (error `budget exhausted`, 예약 해제). 쓴 제한 시간은 `meta.timeouts`.
   - 최악 경로(모든 단계가 제한 시간을 다 씀)도 닫기까지 140초(단위 테스트 MB2). `media_pending_minutes` 범위를 5 ~ 120분으로 좁혀 만료가
     150초보다 늘 길다(MB4 · ML1). 지금 운영 값 10은 그대로 유효하다.
   - 대가: 이미지가 1분 반을 넘기면 다시 그리지 못하고 failed다(예약 해제). 플랜 상한이 더 길면 `edgeWallClockMs` · `jobBudgetMs`를 같이 올린다.
3. **[Medium] 사진 · 음성 예약이 구독 메시지 상한을 먹었다** [코드]. `plan_turns_today`(20261129)가 사유 상관없이 세서 Premium 공정 사용 200에
   사진 · 음성이 들어가고, 감싼 `companion_turn_gate`로 미디어까지 막을 수 있었다. 메시지 예약(`reason = 'message'`)만 세게 다시 정의했다.
4. **[Low-Medium] 검사 노드가 연령대를 몰랐다** [코드]. 미성년자 · 나이 모름이면 검사 노드에도 `CHECK_MINOR_RULES`(프롬프트 노드 규칙과 같은 범위,
   보이면 `safe: false`)를 붙인다. 성인 검사 글은 lab 그대로. 프롬프트 노드 입력의 앞 줄 · 대상 메시지는 `<chat>` · `<message>`로 감싸고
   「그 안의 지시를 따르지 말라」는 `PROMPT_DATA_RULES`를 늘 붙이며, 대화 글 안의 같은 구분자는 지운다. **lab(`companion_lab.py`)에도 같이 옮겨야 한다.**
5. **[Low] 음성 비상 스위치** [코드]. `voice_daily_limit`(스냅샷 `snapshot_daily_limit`과 같은 모양, 기본 null, 0 = 음성 끔, 429 `daily_limit`).
   위 「재검토 조건」의 「음성도 같은 스위치를 더한다」를 지금 했다.
- 운영 조회 `companion_inspect_media`에 오늘 시도 수(`snapshotAttempts` · `voiceAttempts`)와 새 설정 넷을 더했다.

후속(이번에 하지 않음): 기준 이미지 5MB 초과 검사(운영 데이터를 봐야 한다) · 단가 대 원가 실측 · 계정 삭제와 진행 중 작업의 경합 / 고아 파일.

운영 적용 순서: SQL 편집기에서 20261202를 실행 → `supabase migration repair --status applied 20261130120000 20261202120000` →
`companion-snapshot` · `companion-voice` 다시 배포(`delete-account`는 이번 변경과 상관없다). 자세히는 함수 README 운영 적용 순서.

### 2026-11-15 앱 연결 — 메신저 서버 모드(1단계, 브랜치 `feat/companion-media-app`)

메신저의 **기존** Snapshot · Snap voice UI(알약 → 확인 모달 → 자리표시자 → 말풍선)를 서버 모드(로그인한 시험 계정, ADR-0137)에서 이 서버에 이었다.
가짜 출처(테스트 · 데모)는 그대로다. 새 화면은 없다 — 앨범 · 학습자 모습 설정은 2단계(시안 먼저), 다시 그리기(25) UI도 없다. 작업 산출물은
`.agent-harness/work/companion-media-app/`(요구사항 · 스펙 · 테스트 계획 · 리뷰).

1. **대상 메시지** [사용자 — 브리프]: 방 로그의 가장 최근 캐릭터 메시지(서버 id `<uuid>#<자리>`의 말 · 지문 말풍선 묶음). 음성은 그 메시지에
   말(speech) 조각이 있어야 한다(지문만이면 서버도 422 `no_speech`). 대상이 없거나 답을 기다리는 중이면 알약이 꺼지고(흐림 · 낭독에 까닭),
   같은 종류가 만드는 중이면(사진은 방 안 어디든 — 서버가 유저당 하나만 그림) · 그 메시지에 이미 결과가 있으면 꺼진다. 거절 · 숨김 · 위기는 앱이
   모른다 — 서버 422가 회색 줄로 온다 [코드].
2. **흐름** [코드]: 누르면 곧바로 자리표시자 → `POST companion-snapshot|companion-voice {message_id}` → 202면 pending 추적, 200 cached면 곧바로 결과.
   상태는 `companion_get_media(p_ids)`를 40초까지 2초마다, 60초까지 5초 · 90초까지 10초 · 120초까지 15초, 뒤로 30초마다(2026-11-17 개정 — 아래)(방이 열려 있을 때만, 방마다 한 줄). 방을 나가면 멈추고,
   다시 열면 `companion_get_media(p_message_ids)`로 로그의 캐릭터 메시지 결과를 다시 놓는다(앱을 껐다 켜도 같다). 앱 쪽 상한 11분(서버 만료 10분 + 1분).
   연결 실패 · 5xx면 메시지 id로 한 번 물어 서버가 받았으면 그대로 이어 간다(두 번 내지 않음).
3. **결과 · 파일** [코드]: 사진은 `POST /storage/v1/object/sign/companion-media/<path> {expiresIn: 86400}`의 서명 URL(하루 — 방을 다시 열면 새로),
   3:2(240 × 160) · 1:1(200 × 200) 상자와 「AI-generated」 캡션(§8의 `aiGenerated`를 화면에 보임). 음성은 대상 메시지의 한국어 · 번역을 그대로 싣고
   호스트 `AudioPlaybackModule`로 0.85배 재생한다(⟨2026-11-24⟩ 상수는 「천천히」(0.7)와 갈린 `CHAT_VOICE_PLAYBACK_RATE` — [ADR-0082](0082-item-audio-and-slow-playback.md) 「정정 ⟨2026-11-24⟩」; 두 호스트 모두 https 원격 재생을 이미 받는다 — 호스트 변경 없음). 길이를 모르므로 길이 글자를 그리지 않는다.
4. **오류 → 회색 줄** [코드]: 402 엽전 부족 · 409 만드는 중 · 429 상한(`resetsAt` 또는 다음 UTC 자정을 기기 시각으로) · 422/404/403 forbidden 대상 아님 ·
   403/503/400/401/405 지금 못 씀 · blocked · failed(엽전 돌아옴) · 요청 실패. 5개 언어.
5. **엽전** [코드]: 서버 모드에서는 앱 지갑에서 빼지 않는다. 202 · 결과 뒤 `companion_get_wallet`(sub + grant + paid)을 읽어 엽전 출시 결선의
   `acceptServerBalance`로 머리 칩에 넣고, 메신저 지갑은 머리 칩 값을 따른다(`AppSession` 동기화를 `notices.coinCount`로 — 방 · 모달 · 목록이 같은 수).
6. **이벤트** [코드]: `chat_media_completed {characterId, media, outcome: complete | blocked | failed | refused}`(surface chat) — 앱이 pending을 본 결과 ·
   요청 거절마다 한 번. `chat_media_requested`는 그대로.
7. **`MESSENGER_MEDIA_READY`는 false 그대로** [추론]: 흐름은 unit · ui · App 통합 테스트로 끝까지 돌지만, 실서버 · 기기 확인(사진 1분 생성, 실제 재생,
   Android 원격 mp3)을 아직 못 봤다. 켜면 방 코치마크에 사진 · 음성 단계가 선다 — e2e `docs/e2e/companion-media-app.md`를 본 뒤 한 줄 바꾼다.

대가: 길이 표시가 없는 음성 · 하루짜리 서명 URL(방을 하루 넘게 열어 두면 그림이 풀리지 않을 수 있음 — 다시 열면 새로) · 기록 첫 쪽(30) 밖 메시지의
결과는 방에 다시 놓지 않는다(앨범 2단계).

## 개정 (2026-11-17) — 다시 읽기 간격

- 운영 실측: 사진은 서버에서 약 17초(기준 이미지 · 프롬프트 2.4초 동시, 이미지 14초, 올리기 0.7초)에 끝났는데, 앱은 누적 2 · 5 · 10 · 15 · **25**초에 읽어 약 8초 늦게 보였다.
- 간격을 끝나는 구간에 맞춘다(`chat-media-rules.ts` `POLL_DELAYS_MS`): 40초까지 2초(20번) → 60초까지 5초(4번) → 90초까지 10초(3번) → 120초까지 15초(2번) → 30초.
- 끝난 뒤 보기까지: 17초 사진 25초 → 18초, 4초 음성 5초 → 4초. 읽는 횟수: 17초 5번 → 9번, 60초 8번 → 24번, 상한 11분까지 약 48번. 가벼운 조회(`companion_get_media`)라 받아들인다.
- 서버가 끝남을 밀어 주는 길(SSE · 실시간)은 없다 — 만들면 다시 읽기를 줄일 수 있다(이번에는 하지 않음).
- 테스트: CM-U7a(간격) · CM-U7c(끝난 뒤 2초 안) · CM-U7d(횟수 상한).

## 추가 ⟨2026-11-22⟩ — 대기 말풍선의 글을 단계로 [사용자]

- **사용자 결정 2026-11-22**: 사진 · 음성을 기다리는 동안 같은 한 줄만 보여 멈춘 것처럼 보였다(운영 2026-11-17 ~ 22: 사진 중간값 18.9초 · 느린 10% 21.8초 · 최대 26.3초,
  음성 중간값 4.0초). 보이는 글을 단계로 나눈다 — 사진 넷(0 · 5 · 11 · 17초: picking a moment → taking the picture → choosing the best shot → Almost there),
  음성 둘(0 · 2.5초: recording a voice message → sending it).
- 서버는 진행 단계를 주지 않는다 — 앱이 기다린 시간으로 넘긴다(`media-pending-stage.ts`). 마지막 단계는 도착할 때까지 남아, 오래 걸려도 틀린 말이 되지 않는다.
- 시작 시각은 **기기 시계로만** 잡는다(리뷰 #541) — 대기 줄이 처음 놓일 때 기기 시계를 `startedAt`으로 싣고, 자리표시자가 서버 줄로 바뀌어도(id · `at`이 서버 것) 그 값을 넘긴다. 방을 나갔다 들어와도 그만큼 지난 단계에서 선다. 줄의 `at`은 서버 방에서 서버 시계라 쓰지 않는다(기기 시계가 어긋나면 단계가 틀린다). 앱을 다시 켜 서버에서 대기 중인 것을 처음 발견하면 그때부터 센다. 말풍선이 설 때 「이미 기다린 시간」을 한 번 정하고(시작 시각이 앞날이면 0) 그 뒤로는 타이머가 불릴 때마다 흐른 시간을 더한다 — 기다리는 중에 시계가 뒤로 가도 멈추지 않고(타이머가 기다린 만큼으로 친다) 늦어지는 것이 쌓이지 않는다. 응답 전에 같은 대상에 다시 요청해도 처음 요청한 때부터 센다. 다시 읽기 상한(11분)은 따로 잰다(`tracked.since`). 시연용 가짜 방은 음성이 2.5초에 도착해 둘째 문구가 거의 보이지 않는다 — 문구 시각은 운영 실측에 맞춘다.
- 낭독 줄(`accessibility-label`)은 단계와 상관없이 지금 한 줄(`list.sendingPhoto` · `list.recordingVoice`) 그대로다 — 스크린리더가 단계마다 다시 읽지 않게.
- 문구는 일곱 언어(en · es · id · ja · vi · th · my) — 원어민 검수 전. 번들 천장은 그대로다(#542로 번들이 줄어 이 변경은 천장 안에 든다 — 처음 올렸던 천장 변경은 뺐다).
- 테스트: `media-pending-stage.unit.test.ts` MPS-U1 ~ U5 · `chat-remote-send.unit.test.ts` CM-U20 · `chat-media-rules.unit.test.ts` CM-U6a · `chat-media-rules.unit.test.ts` CM-U6c · `chat-remote-media.unit.test.ts` CM-U9a · CM-U11c · `ui-copy-chat-pending.unit.test.ts` MPS-C1 · `ChatMediaBubbles.ui.test.tsx` MC-UI21 · MC-UI22 · `ui-copy-en.unit.test.ts`.

## 추가 ⟨2026-11-23⟩ — 앱의 기준은 기다린 시간, 서버 단계는 문구를 앞으로만 당긴다 [사용자]

- **계기**: 대기 문구 단계(위 「추가 ⟨2026-11-22⟩」)는 앱이 기다린 시간으로 추정한다. 같은 날 서버가 실제 단계 · 비율을 알려 주는 개정(브랜치 `feat/companion-snapshot-stage`, PR #551 — 머지 보류)이 따로 정해져, 두 결정이 같은 말풍선에서 만난다. 사용자 결정 2026-11-23: 둘을 합친다.
- **규칙 ⟨리뷰 #552로 고침⟩**: 기준은 늘 **기다린 시간**(요청한 때부터 0 · 5 · 11 · 17초)이고, 서버 단계는 문구를 **앞으로만** 당긴다 — `drawing`이면 적어도 둘째 문구(「taking the picture…」). `preparing`은 문구를 묶지 않는다. 처음에는 「`preparing`이면 첫 문구에 머물고 `drawing`을 처음 본 때부터 다시 센다」로 했으나, 다시 읽기 간격이 40초 뒤 늘어나 첫 문구에 오래 멈출 수 있고, 늦게 온 응답이 문구를 뒤로 돌리며, 방을 나갔다 들어오면 거의 끝난 사진이 둘째 문구부터 다시 세는 문제가 있어 바꿨다. `stage`가 없으면(옛 서버 · 가짜 방 · 음성) 시간 추정만 쓴다. 문구는 새로 만들지 않는다.
- **비율**: 대기 행에 `aspect`가 있으면(그리기 시작부터) 자리표시자 상자를 도착할 사진과 같은 크기(3:2 240 × 160 · 1:1 200 × 200)로 맞춘다 — 선 채로 비율이 도착해도 확실히 바뀌게 그 요소의 인라인 스타일로 건다. 없으면 지금 상자(180 × 240). 상자 크기는 대기 중에 한 번 바뀌어 목록이 그때 한 번 움직인다(도착할 때 대신).
- **앞으로만**: 대기 줄은 한 번 실은 「그리는 중」과 비율을 낮은 단계 · 빈 단계의 행이 와도 지우지 않는다(다시 읽기 · 요청 응답 · 다시 열기 모두).
- **다시 읽기**: 지금 간격 그대로다(처음 40초는 2초, 그 뒤 늘어남). 아직 만드는 중인 행의 단계 · 비율이 놓인 줄과 달라졌을 때만 대기 줄을 고친다(시작 시각은 넘긴다).
- **넣지 않은 것**: 진행 막대(서버 쪽 「앱 인계」의 선택 항목), 서버 `stageAt`(서버 시계라 쓰지 않는다 — 기기 시계만), 서버 단계 전용 문구(「장면을 구상하는 중…」 · 「그리는 중…」).
- **순서**: 이 앱 변경은 서버 개정 없이도 안전하다(칸이 없으면 지금처럼 보인다). 서버 개정이 배포되면 그때부터 실제 단계를 따른다.
- **테스트**: `companion-media-parse.unit.test.ts` CM-U1d · `chat-media-rules.unit.test.ts` CM-U6d ~ U6f · `chat-remote-media.unit.test.ts` CM-U9d · `ChatMediaBubbles.ui.test.tsx` MC-UI23.

## 추가 ⟨2026-11-23⟩ — 안내에서 무료 예시 한 장 [사용자]

- **계기**: 최근 7일 채팅한 1,220명 가운데 스냅샷을 써 본 사람은 38명(3.1%), 음성은 127명(10.4%)이다. 방 안내의 사진 · 음성 단계는 서버 연결 전에 꺼 둔 채(`MESSENGER_MEDIA_READY = false`)였고, 사진은 엽전 35에 약 19초를 기다려야 해 무엇인지 모르는 채로 먼저 쓰기 어렵다.
- **사용자 결정 2026-11-23**(시안 https://claude.ai/artifact/3m6hGsXV8NdHKXrFUuZvjs): 덕수쌤 방 안내가 사진 알약을 가리키고(고리 · 가격 자리에 「FREE」), 누르면 결제 확인 없이 **미리 올려 둔 예시 사진**을 준다. 받은 사진은 대화 · 앨범에 남는다. 안내를 이미 본 사람에게도 사진을 써 본 적이 없으면 그 단계만 「New」로 한 번 보인다.
- **예시 사진**: 실제 생성기로 덕수쌤의 첫 인사 메시지에서 만든 3:2 한 장(「내 모습」 숨김 — 학습자는 손만 보인다. 모든 사용자에게 같은 한 장이라 성별이 드러나지 않게). 실제 사용자가 만든 사진은 쓰지 않는다. 후보: https://claude.ai/artifact/Tx4u28fEgfAfUseFF8CcGN
- **서버**(마이그레이션 `20261229120000_companion_media_sample.sql`): 표 `companion.media_samples`(인물 → 버킷 경로 `samples/…` · 비율 · 켬), 앱 RPC `companion_sample_snapshot_offer(p_character_id)` → `{ available }`(예시가 켜져 있고 이 계정에 스냅샷 행이 하나도 없을 때), `companion_claim_sample_snapshot(p_message_id)` → `{ result, media? }`. 받은 사진은 보통 스냅샷과 같은 `companion.media` 행이다(`charge = 'sample'` · `cost 0` · complete) — 엽전 예약 · 원장 · 하루 상한과 무관하고, 인물마다 계정당 한 번. Storage는 `companion-media/samples/`를 로그인한 사용자가 읽을 수 있게 정책을 더했다(쓰기 · 지우기는 서버 키만. 계정 삭제는 `<user_id>/` 폴더만 지운다).
- **앱**: 안내 단계 `sample`(`roomGuideSteps`) — 새 사용자는 chat · ideas 뒤에, 이미 본 사람은 그 단계만. 서버가 제안할 때만 선다(첫 인사가 온 뒤 한 번 묻는다). 사진 알약을 누르면 대기 말풍선이 적어도 1.5초 섰다가 예시 사진으로 바뀌고, 회색 한 줄(「이번 것은 무료, 다음부터는 엽전」)이 붙는다. Skip은 받지 않고 끝낸다. 예시 단계까지 갔으면(받았든 넘겼든) 기기에 `snapshot`을 본 것으로 적어 다시 권하지 않는다.
- **운영 순서**: 마이그레이션 적용 → 예시 파일을 `companion-media/samples/duksu-guide-01.png`에 올림 → `companion.media_samples`에 한 줄. 표에 줄이 없으면 제안이 꺼져 앱은 지금처럼 보인다(앱을 먼저 내도 안전).
- **넣지 않은 것**: 음성 예시, 덕수쌤이 아닌 인물의 예시(안내가 덕수쌤 방에만 선다), 여러 장 돌려 보이기.
- **리뷰 반영 ⟨#554⟩**: (1) 받기는 대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)을 막는다 — 요금제 · 잔액은 보지 않는다(엽전 0이어도 받는다). (2) 예시 단계를 본 것으로 적는 때는 **받은 뒤**(또는 Skip) — 받기에 실패하면 다음에 방에 올 때 다시 권한다. (3) 서버가 주지 않기로 한 경우는 「연결 확인」이 아니라 「지금은 쓸 수 없음」 줄. (4) 「만드는 중」 대기는 방의 타이머로 걸어, 방이 비워져도 대기 줄이 남지 않는다. (5) 알약을 거듭 눌러도 한 번만 받는다. (6) 안내는 서버 답이 온 뒤에 서서 도중에 단계 수가 바뀌지 않고, 「예시 없음」 답은 그 실행 동안 기억해 방을 열 때마다 묻지 않는다. (7) 운영의 고아 파일 조회가 `samples/`를 내놓지 않는다. (8) 예시 단계만 뜬 경우 완료 이벤트의 `part`는 `snapshot`. 쓰이지 않게 된 `guideSteps` · `MESSENGER_MEDIA_READY`를 지웠다.
- **한계**: 일곱 언어 문구는 원어민 검수 전. 기기 확인 전. 예시를 받은 메시지에서 「다시 만들기」를 하면 다시 그리기 값(25)이 든다. 예시 행은 스냅샷 행이라 그날의 시도 상한(운영 30) 집계에 한 장으로 잡힌다.
- **테스트**: 서버 `companion-media-sample.integration.test.ts` MS1 ~ MS8. 앱 `companion-media-parse.unit.test.ts` CM-U4a · U4b, `companion-media-api.unit.test.ts` CM-U8s, `messenger-guide.unit.test.ts` MG-U9, `chat-remote-media.unit.test.ts` CM-U30 ~ U33, `MessengerGuide.sample.ui.test.tsx` MG-UI10 ~ UI14.

## 추가 ⟨2026-11-23⟩ — 안내에서 무료 예시 음성 [사용자]

- **사용자 결정 2026-11-23**: 방 안내의 스냅샷 단계 다음에 음성 단계를 붙인다 — 음성 단추를 가리키고, 누르면 미리 만들어 둔 음성을 그대로 준다.
- **무엇을 주나**: 덕수쌤의 첫 인사는 모든 사용자에게 같은 문장이다(최근 3일 824개 대화 모두 「안녕하세요! 덕수쌤이에요. 한국어나 한국 문화에 대해 궁금한 게 있으면 언제든지 물어봐요.」). 그 문장을 읽은 음성 파일 하나를 버킷 `companion-media/samples/`에 두고, 첫 인사 메시지의 음성으로 준다 — 글과 소리가 맞는다.
- **서버(20261230)**: `companion.media_samples`에 종류(`kind` snapshot · voice) · 읽은 글(`text`)을 더하고 인물 · 종류마다 한 줄. 제안 RPC가 `voice`를 더 돌려준다(음성 예시가 켜져 있고 그 계정이 음성을 한 번도 만든 적이 없을 때). 받기 RPC는 종류(`p_kind`, 기본 snapshot)를 받는다 — 종류를 넘기지 않는 앞 빌드는 그대로 스냅샷. 받은 음성은 보통 음성과 같은 media 행(kind voice · charge sample · cost 0)이고 사진 예시와 따로 한 번씩 받는다. 막는 조건(14세 미만 · 일시 차단)은 사진과 같다.
- **앱**: 단계 `voice`, 기기 기록 `voice`. 사진 알약을 누르면 사진을 받는 동안 안내가 음성 단계로 넘어가고, 음성 알약에 고리 · FREE가 선다. 누르면 결제 확인 없이 음성 대기 줄 → 음성 말풍선 → 「이번 것은 무료」 줄. 사진 · 음성은 따로 제안 · 따로 기록이라, 음성을 써 본 계정에는 사진 단계만, 사진을 이미 본 기기에는 음성 단계만 「New」로 뜬다. 처음 온 사용자는 4단계(chat → ideas → 사진 → 음성).
- **테스트**: 서버 `companion-media-sample.integration.test.ts` MS9 ~ MS11. 앱 `messenger-guide.unit.test.ts` MG-U10, `companion-media-parse.unit.test.ts` CM-U4a, `companion-media-api.unit.test.ts` CM-U8s, `chat-remote-media.unit.test.ts` CM-U34, `MessengerGuide.sample.ui.test.tsx` MG-UI15 · UI16.
- **한계**: 일곱 언어 문구는 원어민 검수 전. 기기 확인 전(음성 알약을 가리키는 꼬리 위치 포함). 첫 인사 문장이 바뀌면 예시 음성 파일과 표의 글도 함께 바꿔야 한다.

## 개정 ⟨2026-11-27⟩ — 예시 대상 [사용자]

- **계기(이슈 #648)**: 예시 사진 · 음성은 덕수쌤 **첫 인사에 맞춘 고정 파일**인데, 앱이 받기 대상을 유료와 같은 규칙(로그의 **가장 최근** 캐릭터 메시지)으로 골랐다. 가이드 도중 학습자가 한 번이라도 답하면 예시가 그 응답에 붙어, 자막(대상 글)은 응답이고 소리 · 사진은 첫 인사가 됐다. 운영 기준 564명 · 1,022건(예시를 받은 사람의 63%).
- **사용자 결정 2026-11-27**: 앱만 고치고, 서버(받기 RPC가 대상을 확인하지 않음)와 이미 어긋난 기록은 이슈 #648에서 다룬다.
- **대상**: 무료 예시의 대상은 그 방의 **첫 인사**(서버 `origin` greeting) 메시지다(`sampleTargetOf`). 서버 기록이 첫 인사를 알려 주지 않거나 로그에 없으면 그 방의 첫 캐릭터 메시지, 그것도 없으면(음성은 그 메시지에 말 조각이 없을 때도) 그 예시를 제안하지 않는다(예시 단계가 서지 않음). 첫 인사 id는 기록(`historyFrom` → `greetingId`, 처음 나오는 origin greeting · 숨김 제외)과 방을 열 때 받은 첫 인사 · 해금 선톡에서 방에 적는다. **유료 사진 · 음성의 대상 규칙(가장 최근)은 그대로다.**
- **결과 줄의 자리**: 대기 줄 · 결과 줄 · 「이번 것은 무료」 줄은 첫 인사 바로 아래(그 대상의 앞 결과 줄 뒤)에 선다 — 대화가 이어졌으면 로그 가운데다. 그래서 예시 줄은 「내가 보낸 것」으로 세지 않아 끝으로 내리지 않고(`jumpKeyOf`의 `skip`), 「새 메시지 ↓」 알약으로도 세지 않는다.
- **화면 밖일 때 — 고른 방법: 기본 (a), 위로 읽는 중이면 (b)**:
  - (a) 끝을 보던 중(끝 48px 안)이면 그 줄로 **가운데 맞춤 부드러운 스크롤**(`scrollIntoView`, 움직임 줄이기면 점프)을 하고 끝 따라가기를 멈춘다 — 대기 줄이 설 때 한 번, 결과로 바뀔 때 한 번. 앞 예시로 옮긴 뒤 10초 안이면 「옮겨 둔 채」로 보아 다음 예시(이어지는 음성)도 그 줄로 옮긴다 — 자리 알림으로 지우지 않는다(사진이 그려지며 내용 높이가 바뀌어도 알림이 와, 기기 iOS에서 보이는 자리인데 알약이 섰다).
  - (b) 위로 읽는 중이면 대기 줄로는 끌어가지도 알리지도 않고, 결과가 오면 「새 메시지 ↓」 알약(#601) 자리에 **「Photo arrived above ↑」 · 「Voice message arrived above ↑」** 알약을 세운다. 누르면 그 줄로 옮기고 사라진다. 그 뒤 내가 보내면 사라진다.
  - 근거: 학습자는 예시 알약을 막 누른 참이라 결과를 보려고 기다린다 — 끝을 보던 사람에게 알약을 한 번 더 누르게 하는 것은 군더더기이고, 위로 읽는 사람을 끌어가면 읽던 자리를 잃는다(#406 리뷰 #4의 「끌어내리지 않음」과 같은 원칙). 대기 줄에는 알리지 않는 것은 1.5초 뒤 결과가 곧 오기 때문이다. 버린 대안: 늘 (a) — 읽던 자리를 잃음. 늘 (b) — 끝을 보던 대부분이 한 번 더 눌러야 함. 끝으로 내림(예전) — 결과가 화면 밖 위에 남음.
- **입력 줄**: 가이드 중 입력 줄은 지금처럼 열어 둔다(ADR-0190).
- **이미 어긋난 기록**: 손대지 않는다. 다시 읽을 때 응답 아래에 선 옛 예시는 그 자리에 그대로 보인다(이슈 #648).
- **테스트**: `chat-sample-target.unit.test.ts` GS-U1 ~ U6, `companion-parse.unit.test.ts` GS-U7, `chat-jump-key.unit.test.ts` JK-U7, `ui-copy-chat-pill.unit.test.ts` GS-C1, `ChatLog.reveal.ui.test.tsx` GS-UI1 ~ UI3, `use-new-message-pill.sample.ui.test.tsx` GS-UI4 ~ UI8, `MessengerGuide.sample-target.integration.test.tsx` GS-I1 ~ I4.
- **한계**: 「위에 도착」 일곱 언어 문구는 원어민 검수 전. 앞 예시로 옮긴 뒤 10초 안에 학습자가 스스로 위로 올렸어도 다음 예시 줄로 한 번 더 옮긴다. 서버가 아직 대상을 확인하지 않으므로, 이 수정 전 빌드는 계속 최근 메시지를 보낸다(이슈 #648).

## 개정 (2026-11-23) — 진행 단계 · 비율을 먼저 알린다

- **사용자 결정**(2026-11-23): 사진을 기다리는 동안의 UX 가운데 「단계 표시 · 예상 시간」과 「자리표시자 비율 맞추기」만 넣는다(캐릭터의 먼저 한마디 ·
  장면 한 줄 미리 보기는 넣지 않음). 중간 그림은 지금 엔진(2.5-flare 편집)이 보내지 않아(2026-11-21 플레이그라운드 실측 0장) 이것으로 대신한다.
  **이 저장소의 몫은 서버와 결정 기록이다 — 앱 화면은 아래 「앱 인계」.**
- 실측(2026-11-16 ~ 20 운영): 기준 그림 약 0.5초 · 장면 구상(프롬프트 노드) 약 3초 — 둘은 동시 — → 그리기 약 13 ~ 17초 → 저장 약 0.4초.
- **서버**(마이그레이션 `20270104120000_companion_media_stage.sql` ⟨2026-11-24 번호 바꿈 — 20261228120000은 친구 스토리가 씀⟩):
  - `companion.media`에 `stage`(null | `drawing`) · `stage_at`. 서버 전용 `companion_media_stage(p_media_id, p_stage, p_aspect)` — pending일 때만,
    단계는 `drawing`만, 비율은 3:2 · 1:1. `{result: ok | not_pending}`.
  - Edge Function은 장면 구상이 끝나고 이미지 엔진을 부르기 직전에 단계 `drawing`과 고른 비율을 적는다(`companion-media-preview.ts` `start`).
    기다리지 않는다 — 그리기를 늦추지 않고, 실패해도 그림은 계속 만든다. 프롬프트 노드가 막으면(blocked) 적지 않는다.
  - `media_json`(= `companion_get_media` · `companion_list_media`): pending이면 `stage`(`preparing` → `drawing`) · `stageAt`(그 단계가 시작된 시각,
    `preparing`은 만든 시각), 끝나면 둘 다 null. 비율 `aspect`는 이제 `drawing`부터 적혀 있다(전에는 완성 때). 음성은 늘 `preparing`이다.
  - 계약: `packages/companion-contract` `media.ts`의 `stage` · `stageAt`(선택 · nullable), JSON Schema 두 개. 옛 서버에는 칸이 없다.

### 앱 인계 (메신저 서버 모드 — 진행 단계 · 비율) — ⟨2026-11-24⟩ 앱은 #552로 이미 반영

- 앱은 위 「추가 ⟨2026-11-23⟩ — 앱의 기준은 기다린 시간, 서버 단계는 문구를 앞으로만 당긴다」대로 만들었다(#552 머지). 아래는 처음 인계안 —
  진행 막대 · 서버 단계 전용 문구 · `stageAt`은 그 결정에서 넣지 않았다. 이 서버 개정이 배포되면 앱은 `drawing`에서 문구를 앞당기고 `aspect`로 상자를 맞춘다.

- 만드는 중인 사진의 상태 줄을 `stage`로 바꾼다: `preparing` → 「장면을 구상하는 중…」, `drawing` → 「그리는 중…」. 칸이 없으면(옛 서버) 지금 문구.
- 진행 막대(선택): `stageAt`부터 단계별 보통 시간(구상 약 3초 · 그리기 약 15초)으로 채우고, 끝에 닿으면 멈춰 기다린다(거꾸로 가거나 100%를 넘지 않는다).
  시간은 서버가 주지 않는다 — 실측이 바뀌면 앱 상수를 고친다.
- 자리표시자 상자: pending 결과에 `aspect`가 있으면 그 비율(3:2 · 1:1)로, 없으면 지금 상자. 완성 사진과 같은 상자라 도착할 때 목록이 튀지 않는다.
- 다시 읽기는 지금 간격(2초)으로 충분하다 — 단계는 시작 3초쯤 한 번 바뀐다.

## 개정 (2026-11-27) — 예시의 자리는 첫 인사 (이슈 #648, 서버) [사용자 요청 · 기본값은 에이전트]

- **문제**: 예시 사진 · 음성은 덕수쌤 첫 인사에 맞춰 미리 만든 고정 파일인데, 받기 RPC가 받은 `p_message_id`를 그대로 믿었다. 앱은 가장 최근 캐릭터 메시지를
  보내므로 학습자가 한 번이라도 답하면 응답(turn) · 선톡에 붙었고, `source`(→ `media_json.line`, 자막)는 응답 글 · 소리와 사진은 첫 인사 것이 됐다.
  운영 2026-11-27 집계 564명 · 1,022건(이슈 본문), 엽전 영향 없음. 배포된 빌드(Android 1.6.x · 1.7.0, iOS 1.3.x · 1.4.0)는 앱 수정 전까지 계속 최근 메시지를 보낸다.
- **결정 — 바꿔 붙이기**(마이그레이션 `20270113120000_companion_sample_greeting_target.sql`, 함수 `companion_claim_sample_snapshot(p_message_id, p_kind)`만 바꿈):
  - 받은 메시지는 대화와 권한만 정한다 — 없으면 `message_not_found`, 남의 것이면 `forbidden`, 인물의 말이 아니면 `not_eligible`(전과 같다).
  - 실제로 붙는 곳은 그 대화의 **첫 인사**(origin `greeting` 가운데 가장 먼저 만든 것)이고, `source`도 첫 인사의 segments다. 받은 것이 첫 인사면 전과 같다.
  - 돌려주는 모양은 그대로(`{ result, media? }`). `media.messageId`(원래 있던 칸)가 실제로 붙은 메시지다 — 새 앱은 이것으로 자리를 맞춘다.
    지금 빌드는 그 칸을 받은 자리 놓기에 쓰지 않으므로 깨지지 않는다(받은 자리에서는 보낸 메시지 아래, 다시 읽으면 첫 인사 아래).
  - 계정당 한 번(인물 · 종류마다), 무료(cost 0), 막는 조건(14세 미만 · 일시 차단), `media_eligible` 규칙은 그대로다. 이미 받았으면 `already`가 먼저다.
- **기본값(에이전트) — 첫 인사가 없는 대화는 거절**: 첫 인사가 지워졌거나 쓸 수 없으면(숨김 · 실패) `not_eligible`(앱은 「지금은 쓸 수 없음」 줄)이고
  행을 만들지 않는다(제안은 남는다). 버린 대안 「그 대화의 첫 캐릭터 메시지에 붙이기」 — 예시는 첫 인사 문장으로 만든 파일이라 다른 글에 붙이면
  같은 어긋남이 다시 생긴다. 대화 초기화는 대화 행째 지우고 새 대화에 첫 인사를 다시 거므로 정상 흐름에서는 거의 생기지 않는다(운영: 첫 인사 없는 대화 7개 · 둘 이상인 대화 0개).
- **넣지 않은 것**: 이미 어긋난 행 정리 — 운영 쓰기라 절차서만 둔다(`docs/operations/guide-sample-realign.md`, 백업 표 → 고치기 → 되돌리기, 실행은 사용자 결정).
  앱의 대상 고르기(`mediaTargetOf` 대신 첫 인사)는 별도 앱 PR.
- **운영 적용**: 머지 뒤 사용자 승인으로 `20270113120000` 적용(함수 교체만, 표 변경 없음). 앱과 순서 무관 — 지금 빌드 · 새 빌드 모두 이 함수로 바르게 저장된다.
- **테스트**: 서버 `companion-media-sample.integration.test.ts` MS12 ~ MS17(응답 · 선톡 id → 첫 인사, 첫 인사 그대로, 첫 인사 없음, 계정당 한 번, 사진 · 음성, 남의 대화).

## 개정 (2026-11-27) — 매체 하나는 한 줄 (가이드 예시 두 장, Refs #648) [에이전트]

- **문제**: 「가이드에서 예시 사진이 두 장 보인다」. 운영 DB에는 중복 행이 없다(sample 행은 (사람 · 인물 · 종류)마다 하나). 앱의 결과 줄 id가
  `<대상>~<종류>~<media id>`라, **같은 매체**를 서버가 다른 메시지에 붙였다고 알려 오면 옛 대상 아래 줄이 남은 채 새 대상 아래 줄이 하나 더 섰다.
  방을 다시 열 때(`resume`이 서버 행의 `messageId`로 줄을 놓음) 두 장이 된다. 생기는 곳:
  - 배포된 빌드(1.6.x · 1.7.0, iOS 1.3.x · 1.4.0)가 가이드 도중 답한 뒤 예시를 받음 — 앱은 응답 아래 놓고, 서버(위 개정)는 첫 인사에 붙임.
  - 같은 앱 실행 중 운영 정리(응답 → 첫 인사로 옮긴 1,040행)를 지나 방을 다시 엶.
  - 새 빌드에서도 앱이 고른 대상과 서버가 붙인 곳이 다를 때(기록이 첫 인사를 표시하지 않은 방 등).
  앱을 다시 켜면 앱 전용 줄이 사라져 한 장으로 돌아온다.
- **결정**: 줄을 놓을 때 같은 종류 · 같은 media id(uuid)인데 대상이 다른 줄을 먼저 뺀다(`chat-media-relocate.ts` `withoutMovedCopies`, `put` 한 곳).
  자리표시자(`req`) · 회색 줄(`x번호`)은 매체가 아니라 건드리지 않는다. 예시 받기는 응답의 `media.messageId`가 로그에 있고 앱이 고른 대상과 다르면
  곧바로 그 아래에 놓는다(`placedSampleTarget`) — 다시 읽을 때 서버 줄과 같은 id라 움직이지 않는다.
- **한계**: 배포된 빌드는 앱 코드로 고칠 수 없다(그 방을 나갔다 다시 열면 두 장, 앱을 다시 켜면 한 장). 서버로도 막을 수 없다 — 옛 앱은 응답의 `messageId`를 보지 않는다.
- **테스트**: `chat-media-relocate.unit.test.ts` GD-U1 ~ U4, `chat-sample-target.unit.test.ts` GD-U5 · U6, `chat-remote-sample.moved.unit.test.ts`
  GD-U7 ~ U9, `MessengerGuide.sample-target.integration.test.tsx` GD-I1 · I2. 기기: `docs/e2e/messenger-guide.md` MG-E14.

## 개정 (2026-11-27) — 가이드 점검 1 ~ 4: 막힘 · 거절 · 첫 쪽 밖의 첫 인사 · 단계 문구 (앱) [사용자 「진행」 · 첫 쪽 밖 처리는 에이전트 기본값]

- **1. 예시 단계에서 입력이 막히면 갇힘**: 예시 단계에 글을 보냈다가 서버가 막음(나이 · 일시 차단 · 이용 시간, ADR-0125)을 돌려주면 입력 줄이 상태 줄로
  바뀌어 사진 알약이 사라지는데, 안내 막은 「Snapshot을 누르세요」로 남고 시스템 뒤로가기는 안내가 삼켰다(머리줄 뒤로 단추는 막 아래).
  **결정**: 입력이 막힌 동안 방 안내를 숨긴다(`useRoomGuide`의 `shown`에 `inputBlock === null`). 숨으면 막 · 뒤로가기 삼키기가 함께 사라져 뒤로가기가 방을 나간다.
  끝내지 않고 숨기는 까닭: 막힘이 풀리면(이용 시간 · 일시 차단) 같은 단계로 돌아와야 예시를 받을 수 있고, 「본 것」으로 적지 않는다. 막힘이 풀리지 않는 나이
  막힘은 안내가 계속 숨어 있다. 「건너뛸 수 없음」(2026-11-23)은 막히지 않은 방에서만 지킨다.
- **2. 받을 수 없는 사용자에게 예시를 제안**: 제안 RPC는 「받은 적 없음」만 보고, 받기 RPC는 14세 미만 · 일시 차단 · 첫 인사 없음이면 거절했다. 거절은
  「봤음」으로 적히지 않아 방에 올 때마다 같은 단계 · 회색 「not available」 줄이 다시 섰다.
  **앱 결정**: 받기 결과를 받음 · 거절 · 못 물음(`SampleClaimOutcome`)으로 가르고, **거절도 본 것으로 적는다** — 서버가 고쳐지기 전에도 반복이 멈춘다.
  못 물음(연결 · 방 없음)은 지금처럼 다음에 다시 권한다. 서버 제안 함수를 받기와 같은 조건으로 맞추는 것은 별도 서버 PR(`fix/guide-sample-offer-server`).
- **3. 첫 쪽 밖의 첫 인사**: 방을 열 때 읽는 기록은 최근 30개(`HISTORY_PAGE`)이고, 앱은 더 오래된 쪽을 읽지 않는다. 대화가 30개를 넘으면 첫 인사가 로그에 없어
  예시 대상이 「불러온 범위의 첫 캐릭터 말」이 됐고, 서버는 첫 인사에 붙여(위 개정) 그 자리에서는 엉뚱한 말 아래, 다시 열면 대화에서 사라졌다(첫 인사가 로그에 없어
  `resume`이 그 행을 묻지 않음).
  **결정(에이전트 기본값) — 첫 인사가 로그 밖이면 예시를 제안하지 않는다**: 기록 응답의 `hasMore`(서버가 이미 싣는 칸)를 `RemoteHistory.hasMore` → 방의
  `olderHidden`으로 적고, 앞부분을 읽지 않은 방에서 첫 인사가 로그에 없으면 `sampleTargetOf`가 null — 예시 단계가 서지 않고 받기를 부르지 않는다. 앞부분까지 다 읽은
  방(`hasMore` false)은 지금처럼 첫 캐릭터 메시지로 대신한다(서버가 첫 인사로 바꿔 붙이고 `placedSampleTarget`이 자리를 맞춤). 서버 변경은 없다.
  - 누가 해당하나: 예시 기능 전에 덕수쌤과 15번 넘게 주고받았고 사진(또는 음성)을 써 본 적 없는 사람. 안내의 목적(무엇인지 모르는 기능을 처음 써 보게)보다
    「다시 열면 사라지는 무료 사진」이 더 나쁘다고 보았다.
  - 버린 대안: (a) 첫 인사를 따로 받아 와 로그 맨 위에 끼우기 — 30개 사이가 비어 이어진 대화처럼 보이고, RPC · 병합 규칙이 늘어난다. (b) 기록 응답에 첫 인사 id만
    싣기 — 대상은 맞아도 줄을 둘 메시지가 로그에 없어 같은 문제가 남는다. (c) 최근 캐릭터 말에 붙이기 — 예시 파일은 첫 인사 문장으로 만든 것이라 #648의 어긋남이 다시 생긴다.
  - 재검토: 대화 기록 위로 더 읽기(페이지)를 넣으면, 첫 인사가 로드될 때 제안을 다시 묻게 바꾼다.
- **4. 단계 문구가 단추 이름과 다름**: es · id · ja · my · th · vi의 사진 단계 문구가 영어 「Snapshot」을 그대로 써, 기능 줄 알약 이름(`features.snapshot`)과 달랐다.
  **결정**: 여덟 언어 모두 알약 이름을 그대로 쓴다(Instantánea · Foto kilat · スナップ写真 · ဓာတ်ပုံ · ภาพถ่าย · Ảnh chụp nhanh). 음성 단계는 이미 맞았다. 원어민 검수 전.
- **옛 빌드**: 1 · 3 · 4는 앱 수정이라 옛 빌드는 그대로다. 2의 반복은 서버 제안 함수가 적용되면 옛 빌드에서도 멈춘다(제안 자체가 꺼짐).
- **테스트**: `ui-copy-chat-guide-names.unit.test.ts` GA-C1, `chat-sample-target.unit.test.ts` GA-U1, `companion-parse.unit.test.ts` GA-U2,
  `chat-remote-media.unit.test.ts` CM-U31 ~ U34(GA-U3, 결과 셋), `chat-remote-sample.moved.unit.test.ts` GA-U4 · U5, `MessengerGuide.audit.ui.test.tsx` GA-UI1 ~ UI3,
  `MessengerGuide.sample-target.integration.test.tsx` GA-I1. 기기: `docs/e2e/messenger-guide.md` MG-E15 ~ E17.
