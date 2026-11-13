# AI 컴패니언 — 스냅샷 · 음성

- 상태: **구현(작업 중)** — 브랜치 `feat/companion-snapshot`. 마이그레이션 `20261128120000_companion_snapshot_voice.sql`, Edge Function `companion-snapshot` · `companion-voice`.
  ⚠ 운영에는 **적용 전**이다.
- 결정: [ADR-0138](../adr/0138-companion-snapshot-voice.md). 단가는 [ADR-0137](../adr/0137-companion-credit-is-yeopjeon.md) D5.
- 원본: 운영 대시보드 플레이그라운드(ops-dashboard `companion_snap.py` · `companion_lab.py`, origin/main 6f082ff). 프롬프트 글은 그대로 옮겼다.
- 엔드포인트 · RPC 모양: [API 명세 §2.9 · §3](ai-companion-api.md). 계약 정본은 `packages/companion-contract/src/media.ts`.

## 1. 무엇인가

- **스냅샷**: 캐릭터 메시지 한 장면을 이미지 한 장으로 그린다. 웹툰 화풍.
- **음성**: 캐릭터 메시지의 한국어 대사를 mp3 하나로 읽는다.
- 둘은 서로 독립된 단건이다. 유저가 메시지의 버튼을 누를 때만 만든다.
- 이미지 안에 대사 · 말풍선을 넣지 않는다. 가게 간판 같은 짧은 배경 글자는 괜찮다.

## 2. 대상 메시지

- 통과한 캐릭터 메시지만 된다.
  - role `assistant`.
  - origin `turn` · `greeting` · `proactive`. 위기 안내(`crisis`)는 안 된다.
  - 숨김 아님(사후 검사 · 고쳐서 다시 보내기로 숨긴 것 제외).
  - status `complete`.
  - 성격대로 거절(`meta.refusal`)이 아님.
- 서버가 메시지를 직접 읽는다. 앱이 보낸 글은 믿지 않는다. 앱은 `message_id`만 보낸다.
- 남의 대화 메시지면 403 `forbidden`.
- 메시지와 같은 판정을 지난다(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간). 진행 중인 턴은 막지 않는다.

## 3. 스냅샷 파이프라인

1. **기준 이미지**: 비공개 버킷 `companion-refs`에서 읽는다.
   - 캐릭터 설정 `characters.media.refSlugs` 순서대로 `<slug>-ref.png`가 있는 첫 slug를 쓴다. `<slug>-expressions.png`가 있으면 같이 보낸다.
   - 덕수쌤은 lab 기준 `deoksu` → `duksu` → `deoksu-teacher` 순이다.
   - 하나도 없으면 503 `not_configured`(`detail.missing: "refs"`). 예약하지 않는다.
2. **프롬프트 노드**(Haiku 1회, 도구 강제): 캐릭터 이름 · 외모 메모 · 학습자 모습 · 앞 최대 4줄 · 대상 메시지 → 장면 묘사(영어) · 비율 · 배경 글자 · 안전 판단.
   - 시스템 글은 lab `PROMPT_SYSTEM` 그대로다.
   - 미성년자 · 나이 모름이면 더 엄격한 규칙(`PROMPT_MINOR_RULES`)을 붙인다. 술 · 밤 문화 · 침실 · 수영복 · 신체 접촉 등을 막는다.
   - `safety: block`이면 엔진을 부르지 않고 blocked(`prompt_blocked`).
   - 노드 호출이 실패하면 다시 하지 않고 failed(`prompt_failed`).
3. **이미지 엔진**(1회): OpenAI 이미지 편집(`/v1/images/edits`) + 기준 이미지.
   - 엔진 · 품질 · 비율은 설정 `snapshot_engine`(기본 `gpt-image-2.5-flare`) · `snapshot_quality`(`medium`) · `snapshot_aspect`(`3:2`).
   - `snapshot_aspect`가 `auto`면 프롬프트 노드가 3:2 · 1:1 중 고른다.
   - **엔진 오류일 때만 한 번 다시 한다**: 연결 실패 · 시간 초과 · 408 · 409 · 429 · 5xx · 이미지 없음.
   - 안전 거절(`moderation_blocked` 등)은 다시 하지 않고 blocked(`engine_refused`). 다른 4xx는 failed(`engine_failed`).
4. **검사 노드**(Haiku 비전 1회): 기준 이미지 첫 장 + 결과 → 안전 · 얼굴 일치(1~5) · 깨진 글자 · 학습자 얼굴.
   - 통과는 모델에게 묻지 않고 계산한다(lab `with_pass`): 안전 · 일치 3 이상 · 글자 깨짐 없음 · 학습자 얼굴 없음.
   - 탈락이면 blocked(`check_failed`). 검사 노드 호출 실패도 failed(`check_error`) — 검사 안 된 그림은 내보내지 않는다.
5. **저장**: 통과한 PNG만 `companion-media/<user_id>/<media_id>.png`에 그대로 올린다(C2PA 보존). 탈락한 그림은 올리지 않는다.

### 3.1 학습자 모습 `snapshot_self`

- 프로필 설정. `female`(기본) · `male` · `hidden`.
- 엔진이 성별을 마음대로 고르지 않게 프롬프트 노드 입력(`Learner look`)과 이미지 프롬프트 둘 다에 적는다. 글은 lab `SELF_LOOK` · `learner_line` 그대로다.
- 기본값이 female인 까닭: 스토리 bible의 플레이어가 여성이다.
- `hidden`은 손 · 어깨만. 머리 · 머리카락 · 뒷모습도 없다.
- 어떤 값이든 학습자 얼굴은 그리지 않는다.
- 앱: `companion_save_profile(…, p_snapshot_self)` · `companion_load_profile().snapshotSelf`. 운영: `companion_operator_set_profile(…, p_snapshot_self)`.
- 바꾸면 다음 새 스냅샷부터 적용된다. 지난 그림은 그대로다.

## 4. 음성

- ElevenLabs `eleven_v3` 1회. 엔진 오류만 한 번 다시 한다.
- 읽는 글: speech 조각만. `*행동*`과 번역은 뺀다. 공백은 하나로 줄인다(`companion.spoken_korean`).
  - 소리 낼 말이 없으면 422 `no_speech`. 600자를 넘으면 422 `too_long`.
- 감정 태그: lab 방식대로 서버가 태그를 더하지 않는다. 메시지 글에 v3 태그(`[laughs]` 등)가 있으면 그대로 간다.
- `voice_settings.speed`는 보내지 않는다. ElevenLabs 문서상 v3는 받지 않는다. **0.85배 재생은 앱이 한다.**
- 캐릭터별 voice id는 `characters.media.voiceId`(lab CHARACTERS 값). 없으면 503 `not_configured`(`detail.missing: "voice_id"`).
- 저장: `companion-media/<user_id>/<media_id>.mp3`.

## 5. 비동기

- 요청하면 바로 pending 행을 만들고 202로 돌려준다. 앱은 자리표시자를 보인다.
- 생성은 응답 뒤 백그라운드에서 돈다(`EdgeRuntime.waitUntil`). 앱을 나가도 계속 만든다.
- 앱은 `companion_get_media(p_ids, p_message_ids)`로 상태를 다시 읽는다. 대화 화면이 메시지 아래 결과를 다시 그릴 때도 같은 RPC다.
- pending이 `media_pending_minutes`(기본 10분)를 넘으면 실패(`expired`)로 보이고, 다음 요청 · 정리 작업이 닫으며 예약을 푼다.

## 6. 과금 · 상한

| 행동 | 사유(`charge`) | 설정 키 | 엽전 |
|---|---|---|---|
| 스냅샷 | `photo` | `photo_cost` | 35 |
| 스냅샷 다시 그리기 | `photo_redraw` | `photo_redraw_cost` | 25 |
| 음성(처음 · 「다시」) | `voice` | `voice_cost` | 15 |

- 요청 때 예약하고 complete면 확정, blocked · failed면 해제한다(`companion.reserve_hold` → `settle_hold` · `release_hold`).
- 차감 순서는 메시지와 같다(`bucket_order`, 기본 sub → earned → grant → paid).
- 덕수쌤 체험(`trial_limit`)은 메시지에만 쓴다. 사진 · 음성은 체험 횟수를 쓰지 않고 체험 중에도 엽전을 낸다.
- 시험 계정도 엽전을 낸다(ADR-0117 D4). 서버 메시지에도 시험 계정 무제한 규칙은 없다.
- **저장본 재사용**:
  - 스냅샷: 같은 메시지를 다시 누르면 저장본(무료). 「다시 그리기」(`again: true`)만 새로 그린다. 앞 그림이 있으면 25, 없으면(앞이 실패 · 차단) 35.
  - 음성: 같은 메시지는 저장본(무료). 「다시」(`again: true`)는 새로 만들고 15.
  - 만드는 중인 것이 있으면 그것을 돌려준다(두 번 눌러도 하나).
- **동시 1**: 스냅샷은 유저당 동시에 하나(409 `snapshot_in_progress`). 음성은 같은 메시지에 동시에 하나. 스냅샷과 음성은 서로 막지 않는다.
- **하루 상한**: 스냅샷 `snapshot_daily_limit`(기본 20, UTC 날짜). 다시 그리기를 포함하고 pending · complete를 센다. 넘으면 429 `daily_limit`. 음성은 상한이 없다.

## 7. 앨범

- 앨범 = complete인 스냅샷 · 음성. `companion_list_media(p_character_id, p_kind, p_before, p_limit)`, 최신부터.
- 다시 그리기를 해도 앞 그림이 남는다(행이 따로다).
- 대화 초기화를 해도 남는다. `companion.media`는 대화 · 메시지에 외래 키를 걸지 않고, 만들 때의 말풍선을 `source`에 적어 둔다.
- 계정을 삭제하면 같이 지운다.
  - 행: `auth.users` cascade.
  - 파일: `delete-account`가 admin 삭제 직전에 `companion-media/<user_id>/`를 지운다. 실패해도 계정 삭제는 계속한다(Apple 철회가 이미 끝났을 수 있다).
  - 남은 파일은 운영 조회 `companion_media_orphans(p_limit)`로 찾아 Storage API로 지운다.
- 파일은 비공개 버킷 `companion-media`에 있다. 앱은 자기 토큰으로 서명 URL을 만든다(`POST /storage/v1/object/sign/companion-media/<path>`).
  Storage 정책 `companion_media_owner_read`가 자기 폴더 읽기만 연다. 쓰기 · 지우기는 서버 키뿐이다.
- 기기 저장 · 공유는 앱 쪽 일이다.

## 8. AI 생성 표시

- 결과마다 `aiGenerated: true`, `engine`, `model`을 앱에 준다.
- 운영 메타(`meta`)에는 더 있다: 품질 · 크기 · 프롬프트 해시(엔진에 보낸 글의 SHA-256) · 재시도 수 · 걸린 시간 · 노드 사용량 · 학습자 모습 · 연령대.
- PNG는 엔진이 준 바이트 그대로 저장한다(C2PA 메타데이터 보존).

## 9. 비밀 · 설정

- Edge Function 비밀: `OPENAI_API_KEY`(스냅샷) · `ELEVENLABS_API_KEY`(음성) · `ANTHROPIC_API_KEY`(스냅샷 노드, 메시지와 같은 키).
  - 없으면 503 `not_configured` — 빠진 **이름**만 알린다. 예약하지 않는다.
  - `COMPANION_SNAPSHOT_MODEL`: 노드 모델. 기본 `claude-haiku-5-5`(lab과 같다).
- DB 설정(`companion.settings`): §6의 단가 · 상한, `snapshot_engine` · `snapshot_quality` · `snapshot_aspect` · `voice_model` · `media_pending_minutes`.
- 캐릭터 설정(`companion.characters.media`): `voiceId` · `refSlugs` · `look`(프롬프트 노드의 외모 메모, lab CHARACTERS에서 옮김).

## 10. 운영 조회

- `companion_inspect_media(p_user_id, p_limit)`: 행 전부(프롬프트 · 판정 · 메타 · 오류 · 예약 상태), 오늘 수, 설정. `p_user_id`가 null이면 모든 유저.
- `companion_media_orphans(p_limit)`: 행이 없는 `companion-media` 파일.
- 예약 정리 `companion_release_stale_holds`는 사진 · 음성 예약을 `media_pending_minutes` 전에는 건드리지 않는다(아직 그리는 중일 수 있다).

## 11. 정하지 않은 것

- 비율 기본값 3:2는 확정이 아니다. `snapshot_aspect = 'auto'`로 바꾸면 프롬프트 노드가 고른다(lab 실험실과 같다).
- 화면용 WebP 미리보기는 만들지 않는다. lab은 `cwebp`로 만들었지만 Edge 런타임에는 없다. 앱이 원본 PNG를 줄여 보인다.
- 음성 하루 상한 · 무료 횟수는 없다. 단가(15)가 남용을 막는다고 본다.
- 하루 상한의 날짜는 UTC다(다른 컴패니언 상한과 같다). 기기 지역 자정이 필요하면 바꾼다.
- 엔진 원가 실측(PRD O1)으로 단가를 다시 맞춘다.
