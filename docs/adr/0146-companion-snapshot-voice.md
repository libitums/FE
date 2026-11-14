# ADR-0146 — 컴패니언 스냅샷 · 음성은 Supabase가 만든다 — 표 하나 `companion.media`, 요청은 바로 pending, 생성은 Edge 백그라운드

- 상태: **제안** — 사용자 결정(2026-11-10 ~ 13)을 마이그레이션 `20261130120000_companion_snapshot_voice.sql`과 Edge Function
  `companion-snapshot` · `companion-voice`로 옮겼다. ⚠ 운영에는 **적용 전**이다(SQL · 비밀 · 버킷 업로드 · 배포는 사용자가 한다).
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
