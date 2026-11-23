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
   호스트 `AudioPlaybackModule`로 0.85배 재생한다(두 호스트 모두 https 원격 재생을 이미 받는다 — 호스트 변경 없음). 길이를 모르므로 길이 글자를 그리지 않는다.
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
