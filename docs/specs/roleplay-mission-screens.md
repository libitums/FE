# 롤플레이 미션 화면 — 미리보기 · 대화 · 리포트 (초안, 스위치 뒤)

- 상태: **초안 — 가짜 출처로만 돈다.** 스위치 `ROLEPLAY_MISSION_READY = false`라 사용자에게 보이지 않는다.
- 작성: 2026-11-19. 정본 기획: [2단계 PRD](ai-companion-mission.md)(§0 불변식 · §3.3 ~ §3.8 · **§4 화면에 오는 값과 시점** · §7 · 부록 B), [ADR-0160](../adr/0160-companion-mission.md).
- 새 ADR이 없다 — 화면의 결정은 PRD §4 · §7과 ADR-0160으로 충분하고, 이 문서의 [제안]은 서버 조각과 함께 확인받는다.
- 표기: **[결정]**은 PRD · ADR이 정한 것, **[제안]**은 이 문서가 처음 내놓는 것.

## 1. 범위

| 화면 | 파일 | PRD |
|---|---|---|
| 목록의 미션 항목 | `screens/roleplay-list/*`(형태 `"mission"`) · `app/roleplay-sections.ts` | §4.1 |
| 미리보기 | `screens/roleplay-mission/MissionPreviewScreen.tsx` | §4.1 |
| 대화 | `MissionTalkScreen.tsx` · `MissionTopBar.tsx` · `MissionComposer.tsx` | §4.2 · §3.4 ~ §3.6 |
| 리포트 · 채점 실패 | `MissionReportScreen.tsx` | §3.8 · §4.3 · 부록 B |

route는 하나 — `{ name: "roleplay-mission"; missionId }`. 미리보기 → 대화 → 리포트는 판의 국면이 가른다(대본형 `roleplay-story`와 같은 방식). 셸 여백을 잡지 않는 화면(`isFullBleedScreen`)이고, 미리보기와 대화는 위가 짙은 장면이라 상태 표시줄 표지(`data-statusbar`)를 단다 — 등록부 `devtools/android-bundle/host-status-bar-icons.mjs`.

## 2. 스위치 [결정: 기본 꺼짐]

- `screens/roleplay-mission/roleplay-mission-ready.ts`의 상수. 꺼져 있으면 `useRoleplayMissions()`가 아무것도 부르지 않고 `null` — 구획 · 화면 · 이벤트가 지금 앱과 같다(통합 테스트 MI1, 단위 MR-U1).
- 켜는 길은 `setRoleplayMissionForTest({ enabled, source })`(`app/roleplay-mission-wiring.ts`) 하나 — 테스트와 개발 미리보기만 쓴다.
- 번들에는 들어간다(코드는 있고 길이 없다). 계약 패키지는 `devDependencies`로 **타입만** import한다 — zod가 번들에 들지 않는다.

## 3. 출처 포트 — `MissionSource`

`screens/roleplay-mission/roleplay-mission.contract.ts`. 화면 · 리듀서는 이 타입에만 기댄다(메신저 `ChatSource`와 같은 생각, 하지만 「방 = 캐릭터」 전제가 없어 따로 — PRD §7).

| 메서드 | 서버(나중) | 가짜(지금) |
|---|---|---|
| `list()` | `companion_list_missions()` | 계약 `missionListFixture` |
| `start(missionId)` → `started` · `rejected(code)` | `mission-start` | 6화만 시작. 잠긴 · 다른 미션은 `not_available`. 옵션 `start`로 거절 코드 고정 |
| `sendTurn(req, { onEvent, onEnd })` → 끊기 | `chat-send` + `conversation_id`(SSE) | 낱말로 목표 판정 → `start · delta · translation · correction · mission · done`(계약 스키마 · 순서 검사 통과). 옵션 `failTurnOn`이면 `error` |
| `hint(conversationId)` | `mission-hint` | 못 이룬 필수 목표부터 예시 문장, 판당 3번 |
| `finish(conversationId, abandon)` | `mission-finish` | PRD §3.7 식으로 리포트. 옵션 `grading: fail-once · fail-always`면 `grading_failed`(`refunded: true`) |

- 서버 구현은 `app/roleplay-mission-wiring.ts`의 `serverMissionSource` 자리에 붙인다(`lib/companion-api.ts` 인증 · `lib/chat-stream.ts` SSE). 운영 DB에 2단계가 오르기 전(PRD §0.9)에는 붙이지 않는다.
- 가짜의 값은 계약 fixture를 옮겨 적은 것이다(`mission-fixture.ts`) — 같은지 `mission-fake-source.unit.test.ts` MF-U1이 계약 패키지와 견준다.

## 4. 판의 상태 — `missionSessionReducer`

`screens/roleplay-mission/mission-session.ts`(순수). 턴의 SSE는 메신저 턴 리듀서 `applyTurnEvent`로 접고, 그 리듀서가 모르는 `mission` 이벤트만 여기서 읽는다.

```
preview ─start-requested→ starting ─started→ talking ─send→ awaiting ─(done · mission.ended=null)→ talking
   ↑            └─start-rejected→ preview(startError)          └─(error · 끊김)→ talking(내 줄 failed)
   │                                                           └─(done · mission.ended≠null)→ ended
   │   talking · awaiting ─abandoned→ abandoned(목록으로)      ended ─grading-requested(자동)→ grading
   └──reset── report ←finished(graded)── grading ─finished(grading_failed) · finish-failed→ grading-failed
                                                     grading-failed ─grading-requested(다시 시도)→ grading
```

- 목표는 한 번 이루면 되돌리지 않는다 · 정의에 없는 id는 버린다(PRD §3.4). 남은 턴은 줄기만 한다.
- 성공은 필수 목표 달성만으로(`requiredGoalsDone`, PRD §0.7) — 화면은 서버의 `outcome`을 그대로 그린다.
- 힌트: `hint-requested → hint-received(hintsLeft · hintsUsed+1) | hint-unavailable(hintsLeft = 0)`, 보내면 펼친 카드가 접힌다.
- 늦게 온 이벤트 · 국면 밖 동작은 같은 참조를 돌려준다(MS-U13).
- 결선 훅 `use-mission-session.ts`가 출처를 부르고, `ended`가 되면 채점을 스스로 부른다(「마무리 대사 뒤 자동으로」 PRD §3.6).

## 5. 화면 · test id

test id 정본은 `screens/roleplay-mission/mission-test-ids.ts`(접두 `roleplay-mission-`). 메신저 부품을 그대로 쓴 곳은 그쪽 id가 붙는다 — 교정 카드 `messenger-chat-fix-card`, 보내지 못한 글 `messenger-chat-unsent` · `messenger-chat-unsent-retry`.

| 화면 | 구성 | 주요 test id |
|---|---|---|
| 목록 항목 | 대본형 카드와 같은 `RoleplayCard`. 둘째 줄 `Mission · 4 goals · Best 73`(기록이 없으면 끝 생략). 잠김은 구획이 집니다(그 에피소드를 끝내면 열림) | `roleplay-list-item-mission-<missionId>` · `-form-` · `-lock-` |
| 미리보기 | 롤플레이 미리보기의 틀(장면 · 머리 · 알약 · 다이얼로그 · 주 버튼) + 목표 판 · 값 줄 · 거절 안내. 목표 판만 스크롤해 시작 버튼은 늘 화면 안 | `-preview` · `-preview-back` · `-preview-title` · `-preview-chips` · `-preview-goals` · `-preview-price` · `-preview-error`(`data-code`) · `-preview-start` |
| 대화 위 띠 | 장면 그림(그늘 아래) · 그만두기 · 제목 · 남은 턴 · 목표 체크리스트(필수/선택 알약, 큰 글자에서는 스크롤) | `-talk`(`data-phase`) · `-talk-quit` · `-talk-title` · `-turns-left` · `-goal-<id>`(`data-done`, 낭독 「글, required/optional, done/not done」) |
| 대화 가운데 | `ChatLog` · `ChatIncomingRow` · `ChatTextBubble` · `ChatTypingRow` · `CorrectionCard` · `UnsentMessage`. 받는 중인 말풍선은 흐르는 대로. 끝 · 채점 중 줄 | `-log` · `-line-<id>` · `-typing` · `-status` |
| 힌트 카드 | 한국어 · 로마자 · 뜻 · 감점 안내, `Use this`(입력 칸을 채움) · `Close hint` | `-hint-card` · `-hint-use` · `-hint-close` |
| 입력 줄 | 위: 힌트 단추(`Hint · n left`) · 안내(듣는 중 · 말하기 불가). 아래: 마이크 · 글 칸 · 보내기. 마이크가 받아 적은 글은 그대로 보낸다(`input_mode: voice`) | `-composer` · `-hint-button`(`data-enabled`) · `-composer-note` · `-mic`(`data-listening`) · `-input` · `-send`(`data-enabled`) |
| 그만두기 확인 | ui-lynx `Dialog` — `Quit` · `Keep going`. 리포트 없이 목록으로, 값은 돌려주지 않는다(PRD §3.6) | `-quit-dialog` · `ui-lynx-dialog-action-quit` · `-cancel` |
| 리포트 | 결과 · 점수 · 최고 기록 / 목표 n/N · 목표 표현 n/N · 정확도 · 힌트 / 고친 문장 · 다시 해 볼 표현 · 총평. 단추 묶음은 스크롤 밖 | `-report` · `-report-outcome`(`data-outcome`) · `-report-score` · `-report-best` · `-report-goal-<id>` · `-report-expression-<id>` · `-report-accuracy` · `-report-hints` · `-report-corrections` · `-report-retry` · `-report-summary` · `-report-play-again` · `-report-exit` |
| 채점 실패 | 「We couldn't score this」 · 저장됐다는 안내 · (돌려줬으면) 환불 안내 · `Try again`. 다시 채점 중이면 같은 자리에 채점 중 | `-report-failed` · `-report-retry-grading` |

문구는 문구표 `roleplayMission`(`lib/ui-copy-roleplay-mission*.ts`, ADR-0031) — 영어가 정본, es · ja · id · vi는 번역 초안(원어민 검수 필요). 상대역 호칭 · 목표 표현 · 대사(한국어)는 학습 내용이라 서버 값 그대로 그린다.

## 6. 분석 이벤트 [제안 — 아직 보내지 않는다]

PRD §9 M10이 FE에 맡긴 것. 스위치 뒤 초안이라 **결선하지 않았다**(이벤트 계약 · PostHog 카탈로그를 이름이 정해진 뒤 한 번에 고친다). 대사 · 학습자 글은 싣지 않는다(ADR-0029 D14).

| 이름 | 언제 | 속성(문자열 · 불리언) |
|---|---|---|
| `roleplay_mission_opened` | 미리보기가 섬 | `missionId` · `unlocked` · `priceSource`(`free`/`credits`) |
| `roleplay_mission_started` | `mission-start` 성공 | `missionId` · `chargeSource` · `credits` |
| `roleplay_mission_start_rejected` | 시작 거절 | `missionId` · `code` |
| `roleplay_mission_hint_used` | 힌트를 받음 | `missionId` · `hintsLeft` |
| `roleplay_mission_finished` | 리포트를 받음 | `missionId` · `outcome` · `endReason` · `totalScore` · `turnsUsed` · `hintsUsed` |
| `roleplay_mission_grading_failed` | 채점 실패 | `missionId` · `refunded` |
| `roleplay_mission_abandoned` | 그만두기 확인 | `missionId` · `turnsUsed` |

## 7. 디자인 확인 필요 (임시 구성)

시안이 없어 기존 부품 · 토큰 · 간격을 옮겨 그렸다. 아래는 디자인이 확정할 자리다.

1. **목표 체크리스트**(위 띠) — 흰 테두리 원 + 이루면 주황 원에 체크, 필수/선택 알약(흰 16% 면). 새로 그린 모양이다.
2. **위 띠 전체** — 장면 그림을 띠 높이로 자르고 그늘(gray-950 → 72%)을 덮었다. 그림을 띠에 얼마나 보일지, 띠 높이 상한(목표 셋 줄 높이 뒤 스크롤)이 적당한지.
3. **입력 줄** — 메신저 입력 줄의 값(알약 칸 · 둥근 40 단추)에 마이크(회색 원, 듣는 중 주황)와 위 줄의 힌트 글 단추를 더했다. 마이크를 칸 왼쪽에 둘지 · 대본형처럼 큰 마이크로 둘지.
4. **힌트 카드** — 입력 줄 위 회색 카드(배경 secondary · radius lg)에 단추 둘. 감점 안내 문구의 위치.
5. **끝 · 채점 중** — 로그 끝 회색 한 줄뿐(움직임 없음). 축하 · 로딩 모션이 필요한지(ADR-0053).
6. **리포트** — 밝은 면 세로 목록. 점수는 accent-metric 글꼴, 줄 값은 이루면 정답 초록. 부록 B의 「✅ ⬜」 아이콘 줄 · 원형 점수 등 시각 요소는 넣지 않았다. 대화 전문 다시 보기(PRD §3.8 · M11)와 지난 리포트 목록은 없다.
7. **미리보기의 목표 판** — 알약과 같은 짙은 72% 면. 값 줄(무료 / 엽전 · 잔액)과 거절 안내는 흰 · 보조색 글 한 줄.
8. **목록 카드** — 대본형 카드와 같은 그림 · 모양이라 둘이 구별되지 않는다(둘째 줄 낱말만 다르다). 미션 표지(배지 등)가 필요한지.
9. **채점 실패 화면** — 리포트 화면 자리에 제목 · 안내 두 줄. 아이콘 · 그림이 없다.

## 8. 테스트

| 계층 | 파일 | 무엇 |
|---|---|---|
| unit | `mission-session.unit.test.ts` | 국면 전이 · mission 이벤트 접기 · 목표 되돌리지 않음 · 끝 · 실패 · 힌트 · 채점 · 늦은 이벤트 |
| unit | `mission-fake-source.unit.test.ts` | 계약 fixture와 같은 값 · 계약 스키마 · 턴 순서 · 부록 B 73점 · 턴 상한 · 힌트 · 가지 고르기 · 끊기 |
| unit | `app/roleplay-mission-routing.unit.test.ts` | 스위치 기본 꺼짐 · 구획에 붙이기 · 카드 둘째 줄 · route · 값 줄 |
| ui | `MissionTalkScreen.ui.test.tsx` · `MissionReportScreen.ui.test.tsx` | 국면별 렌더 · 접근성 이름 · 보내기 · 마이크 · 힌트 · 그만두기 · 리포트 · 채점 실패 · 미리보기 |
| integration | `app/App.roleplay-mission.integration.test.tsx` | 스위치 꺼짐 = 항목 없음, 목록 → 미리보기 → 대화 → 리포트 → 다시 하기 / 목록, 그만두기, 채점 실패 → 다시 시도, 엽전 부족 |

수동 흐름은 [e2e](../e2e/roleplay-mission.md) — 스위치를 켠 개발 빌드에서.

## 9. 남은 일

- 서버 출처(`serverMissionSource`) — 계약 그대로 붙이고, 같은 ui · integration 테스트를 서버 대역으로 한 벌 더.
- 분석 이벤트(§6) 결선 · 지난 리포트 목록(`companion_list_mission_results`) · 대화 전문 다시 보기.
- 시작 전 말하기 권한 확인(대본형 미리보기의 권한 모달) — 지금은 마이크를 누를 때 묻고, 거부면 입력 줄 안내만 선다.
- 번들 — 스위치가 꺼져 있어도 +122 kB가 든다([성능 기록](../performance/reports/roleplay-mission-draft-01.md)). 가짜 출처 · fixture를 개발 빌드에만 두기, 번역 초안의 지연 적재를 서버 출처 전에 본다.
- 판 도중 앱을 떠났다 돌아오는 경우(이어 하기 없음, PRD §0.6) — 지금은 route가 내려가면 판이 그대로 방치되고 서버 정리 작업이 닫는다.

## 10. v2 — 서버 계약 2026-11-23 반영(ADR-0177, 파이프라인 문서 §10)

- 정본: 서버 브랜치의 [파이프라인 문서](ai-companion-mission-pipeline.md) §10 「앱 인계」 · §6 음성 · §11 결정, [ADR-0177](../adr/0177-companion-mission.md). 참고 구현은 대시보드 「미션 플레이어」.
- **계속하기 / 끝내기** — `mission` 이벤트의 `requiredDone`이 참이고 `ended`가 null이면 「Mission success!」 카드(Keep going / Finish, 한 판에 한 번 — `successPrompt`), 카드를 닫으면 입력 줄 위 힌트 옆에 Finish 글 단추, 위 띠의 남은 턴 뒤에 「· Mission success」. 끝내기 = 국면 `ended` · 끝 이유 `finish` → 결선이 `mission-finish`(`abandon` 없이).
- **성공 뒤 그만두기 = 끝내기** — 대화상자 문구가 「Finish this mission?」으로 바뀌고 확인하면 채점 → 리포트. 필수 전이면 지금처럼 리포트 없이 나감.
- **채점 대기 판** — 목록의 `pendingReports`에 이 미션의 판이 있으면 route를 열 때 미리보기 대신 곧장 `mission-finish` → 채점 중 → 리포트(`pending-opened`). 목록 카드의 「Report ready」 표시는 미션 쪽 부품까지 만들었다 — 규칙 `mission-report-ready.ts`(`missionReportBadgeOf`), 부품 `MissionReportReadyBadge.tsx`(준비됨 · 채점 중). 롤플레이 목록 화면(`screens/roleplay-list/`)은 다른 화면이라 붙이지 않았다 — 붙일 자리: `MissionRoleplayItem`에 표시 칸, `app/roleplay-sections.ts`의 `withMissionItems`에서 채움, `RoleplayCard.tsx`의 둘째 줄 아래에 부품, 카드 접근성 이름에 `missionReportBadgeText` 덧붙임. 개발 미리보기의 가짜 출처는 대기 판 하나를 둔다.
- **교정 카드 둘** — 고치기(`correction` · `l1_to_ko`)는 메신저 연필 카드 그대로, 더 나은 표현(`better`)은 같은 카드를 `.mission-better`로 감싸 다른 바탕 · 점선 테두리 · 흐린 제목.
- **리포트 순서** — 히어로(+ 결과 한 줄) → 목표 → You could have said → 목표 표현 → 정확도 · 힌트 → How your score adds up → What went well → Key corrections → Sounds more natural → 고친 문장(고치기 중 Key corrections에 없는 것) → 다시 해 볼 표현 → 총평 → Next challenge. (선택) 칸이 없으면(옛 결과 행) 그 구역을 그리지 않는다(`MissionReportExtras.tsx`).
- **음성** — 기기 음성 인식(`useSpeechAttempt`)을 쓰지 않는다. 포트 둘: 기기 `MissionAudioDevice`(녹음 16kHz WAV · 30초 상한 · 레벨, 주소 재생 · 멈춤 — **호스트 모듈 자리, 지금은 가짜** `mission-fake-voice.ts`)와 서버 `MissionSource.transcribe` · `speak`(제안 엔드포인트 `mission-stt` · `mission-tts`). 마이크는 눌러 시작 · 눌러 끝, 0.4초 미만은 버림, 받아 적은 글은 서버 `autoSend`가 참이면 바로 보내고 아니면 입력 칸 + 「Did I hear that right?」(한국어가 아니면 다른 안내) · 「Say it again」. 상대역 말(진입 대사 포함)은 새 메시지마다 한 번 자동 재생, 말풍선마다 다시 듣기, 마이크를 누르면 재생을 멈춤, 힌트 카드에 예문 듣기. 판이 끝나거나 그만두기 확인을 띄우면 녹음을 버린다. 순수 규칙 `mission-voice.ts`, 결선 `use-mission-voice.ts`.
- **문구** — 새 칸은 `RoleplayMissionCopy.extra`(`ui-copy-roleplay-mission-extra*.ts`). 영어는 문서의 확정 문구(`voice.transcribing` 「Transcribing…」만 새로 씀), es · ja · id · vi · th · my는 번역 초안(원어민 검수 필요). 합치며 비어 있던 th · my의 미션 문구 전체도 초안으로 채웠다.
- **아직 없음** — 실제 녹음 · 재생 호스트 모듈과 서버 출처 · 음성 엔드포인트, 앱이 백그라운드로 갈 때 재생 멈춤(호스트 이벤트 없음), 자동 재생 끄기 설정, 첫 말 조각에서 합성 시작(지금은 턴이 닫힐 때 — 서버가 답을 한꺼번에 보내 차이가 작다).

| 계층 | 파일(v2에서 더함) | 무엇 |
|---|---|---|
| unit | `mission-session-continue.unit.test.ts` | 성공 카드 한 번 · 계속하기 · 끝내기 · 성공 뒤 그만두기(답 기다림 중 포함) · 옛 이벤트 · 채점 대기 판 |
| unit | `mission-voice.unit.test.ts` | `autoSend` 판단 · 녹음 · 받아 적기 · 상한 안내 · 재생 상태 · 시간 표시 |
| ui | `MissionTalkVoice.ui.test.tsx` | 확인 · 한국어 아님 · 실패 안내 넷 · 30초 상한 · 자동 재생 · 다시 듣기 · 끊고 말하기 · 합성 실패 · 힌트 듣기 · 그만두기 때 녹음 버림 |
| ui | `MissionTalkScreen.ui.test.tsx` · `MissionReportScreen.ui.test.tsx`(더함) | 성공 카드 · Finish 글 단추 · 성공 뒤 대화상자 · 끝 줄 · 교정 카드 둘 · 리포트 새 구역 · 옛 결과 행 |
| integration | `App.roleplay-mission.integration.test.tsx`(더함) | 성공 카드 → 끝내기 → 리포트, 성공 뒤 그만두기, 채점 대기 판, 음성 한 턴 |
