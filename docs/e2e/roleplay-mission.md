# 수동 e2e — 롤플레이 미션 화면 QA (가짜 출처, 스위치 뒤)

미션 화면(미리보기 · 대화 · 리포트 · 목록 배지)을 **개발 빌드의 가짜 출처**로 끝까지 돈다. 결정 · 명세: [ADR-0193](../adr/0193-companion-mission.md) ·
[화면 명세](../specs/roleplay-mission-screens.md)(§12 대본형과 맞춤) · [파이프라인 문서](../specs/ai-companion-mission-pipeline.md) §6 · §10. 마이크 권한은
[ADR-0206](../adr/0206-mic-permission-flow.md)과 같은 흐름이다(대본형 [마이크 권한 e2e](mic-permission.md)와 같은 시트).
ui · integration(`MissionTalk*.ui` · `MissionFeedbackCard.ui` · `MissionReportScreen.ui` · `App.roleplay-mission`)이 같은 흐름을 대역으로 이미 본다 — 여기서는
**실제 호스트 위의 모양 · 시스템 권한 창 · 설정 앱 왕복 · 좁은 화면 · 큰 글자**를 본다.

## 준비

- **「공통 전제」(로그인)를 따르지 않는다** — 비회원 개발 빌드에서 본다. 미션 스위치는 꺼진 채 커밋돼 있고 롤플레이 구획은 에피소드 진행으로 잠겨 있어,
  커밋하지 않는 로컬 패치를 붙인다: `git apply <patch>`(① `ROLEPLAY_MISSION_READY = true` ② `roleplaySectionsOf`가 모든 구획을 연다). 끝나면 `git apply -R <patch>`.
  패치 위치는 작업 보고에 적는다(저장소에 넣지 않음).
- 개발 빌드(`__DEV__`)여야 가짜 출처 · 가짜 기기가 붙는다(`app/roleplay-mission-dev-fakes.ts`). release 빌드는 스위치가 켜져도 출처가 비어 목록이 비고 시작이 거절된다.
- **가짜의 한계**: 녹음은 소리를 받지 않고(누른 시간만 잼) 받아 적기는 정해진 차례로 돌려준다. 재생은 소리가 나지 않고 1.2초 동안 「재생 중」 표시만 바뀐다.
  마이크 권한 시트 · 시스템 창 · 설정 열기는 **실제 호스트**(`SpeechRecognitionModule`)다.
- 권한 미요청 만들기: iOS 시뮬레이터 `xcrun simctl privacy <udid> reset microphone com.libitum.host` · `reset speech-recognition`, 사전 안내 「본 적 있음」(기기 키
  `libitum.mic-primer-seen`)까지 지우려면 앱을 지우고 다시 설치한다. 거부 만들기: 시스템 창에서 「허용 안 함」.
- 소리 설정 · 자동 재생 스위치는 기기에 남는다(`mission-autoplay-storage.ts`) — 항목마다 시작 상태를 적는다.
- 선택자: Maestro는 **보이는 문구 · 접근성 이름**으로 찾는다(ADR-0037 D6 — `data-testid`는 네이티브 트리에 오지 않음). 아래 「요소」 칸은 보이는 문구(접근성 이름)와
  vitest용 test id(`roleplay-mission-` 접두는 줄여 `-…`)를 함께 적는다.

## 가짜 출처 요약 — 어떤 입력이 무엇을 만드나

| 미션 | 목록 | 목표(필수 ★) | 이루는 낱말(글에 들어 있으면) | 교정 | 턴 · 힌트 |
|---|---|---|---|---|---|
| 1화 「Pay at the convenience store」(u01-water) | 열림 | ★ bag · ★ pay · receipt · ask | bag: 봉투 · 괜찮아요 · 필요 없어요 / pay: 카드 · 현금 / receipt: 영수증 / ask: 따뜻한 · 보리차 · 있어요? | 「봉투 안 필요해요」 → 더 나은 표현(봉투는 괜찮아요) · 「카드으로」 → 고치기(카드로) | 8턴 · 힌트 3 |
| 6화 「Order a coffee」(u06-cafe) | 열림 · 최고 73 · 「Report ready」 | ★ order · ★ pay · stay · price | order: 주세요 · 한 잔 · 아메리카노 · 라떼 · 커피 / pay: 카드 · 현금 · 계좌 / stay: 가지고 가 · 포장 · 여기서 / price: 얼마 | 「가지고 가요」 → 더 나은 표현(포장이요) · 「카드으로」 → 고치기 | 10턴 · 힌트 3 |
| 2화 「Locked mission example」(u02-checkin) | 잠김 예시 | — | 시작하면 거절 | — | — |

- 필수를 다 이루면 「Mission success!」 카드(한 판에 한 번), 모든 목표를 이루면 판이 저절로 닫히고 채점 → 리포트.
- 마이크를 누를 때마다 받아 적기 차례(미션마다 따로, 끝나면 처음부터):
  - 편의점: ① 「봉투는 괜찮아요.」 바로 보냄 → ② 「카드로 할게요.」 확인(Did I hear that right?) → ③ 못 들음 → ④ 「receipt please」 한국어 아님 → ⑤ 붐빔 → ⑥ 서버 무응답 → ⑦ 「따뜻한 물 있어요?」 바로 보냄.
  - 카페: ① 「아이스 아메리카노 한 잔 주세요.」 바로 보냄 → ② 「가지고 가요.」 확인 → ③ 「카드로 할게요.」 바로 보냄.
- QA 낱말(영문, 글 칸에 넣는다): **`#fail`** 이 든 글은 처음 한 번 보내기에 실패(같은 글을 다시 보내면 성공), **`#gradefail`** 을 한 번이라도 보낸 판은 첫 채점이 실패(다시 시도하면 리포트).
- 값 줄: 하루 무료 0 · 5 Yeopjeon · 잔액 42(가짜는 차감하지 않음).

## 목록 · 미리보기

| id | 확인 | 가짜로 만드는 법 | 기대 · 요소 |
|---|---|---|---|
| RM-L1 | 미션 항목이 대본형 항목 아래 선다 | 패치 + 롤플레이 탭 → Episode 1 · 6 · 2 구획 | 카드 둘째 줄 「Mission · 4 goals」(카페는 「· Best 73」) · `roleplay-list-item-mission-<id>` |
| RM-L2 | 채점 대기 배지 | 앱을 새로 띄워 롤플레이 탭 | 카페 카드에 「Report ready」(`-report-ready-u06-cafe`) → 누르면 미리보기 없이 「Scoring…」 뒤 리포트, 목록으로 돌아오면 배지 없음 |
| RM-P1 | 미리보기 구성 | 편의점 카드를 누름 | 장면 · 제목 「Pay at the convenience store」 · 알약(with 편의점 점원 · 8 turns) · 목표 넷(Required/Optional) · 값 줄 「5 Yeopjeon · You have 42」 · 「Start mission」(`-preview-start`) |
| RM-P2 | 잠긴 미션 | 2화 「Locked mission example」 → Start mission | 「This mission isn't open yet. Finish the episode first.」(`-preview-error`, `data-code="not_available"`), 대화로 가지 않음 |
| RM-P3 | 뒤로 | 미리보기 왼쪽 위 뒤로 · 시스템 뒤로 | 목록으로 |

## 대화

| id | 확인 | 가짜로 만드는 법 | 기대 · 요소 |
|---|---|---|---|
| RM-T1 | 시작 · 진입 대사 · 자동 재생 | Start mission(자동 재생 켬) | 위 띠(장면 · 「Quit mission」 · 제목 · 「8 turns left」 · 목표 넷), 진입 대사 「봉투 드릴까요?」 + 번역, 다시 듣기 단추(「Play again」)가 1.2초 동안 재생 중 색 |
| RM-T2 | 글 보내기 · 목표 체크 | 「봉투는 괜찮아요」 입력 → 보내기(「Send」) | 내 말풍선 → 입력 중 → 점원 「네. 삼천 원입니다. 결제는 어떻게…」, bag 체크(낭독 「…, required, done」) · 「7 turns left」 |
| RM-T3 | 더 나은 표현 카드 | 「봉투 안 필요해요」 보내기 | 내 말풍선 아래 카드: ✓ 초록 표 · 「MORE NATURAL」 · 점선 상자 「봉투는 괜찮아요」(로마자 · 바뀐 낱말 주황 밑줄) · 까닭 한 줄(`-better-card`) |
| RM-T4 | 고치기 카드 | 「카드으로 할게요」 보내기 | ✕ 표 · 빨간 「FIX」 · 상자 「카드로 할게요」(「카드로」 밑줄) · 「카드으로 → 카드로 · After a vowel…」(`-fix-card`). 대본형 오답 패널과 같은 표 · 상자 모양인지 |
| RM-T5 | 성공 카드 · 계속하기 | bag · pay를 이룬 뒤(RM-T2 · T4) | 「Mission success!」(✓ 머리) · Keep going / Finish. Keep going → 카드가 닫히고 입력 줄 위 「Finish」 글 단추, 위 띠 「· Mission success」 |
| RM-T6 | 끝내기 | 성공 카드 Finish 또는 글 단추 Finish | 「Scoring your conversation…」 → 리포트 |
| RM-T7 | 모든 목표로 닫힘 | 이어서 「따뜻한 물 있어요?」 → 「영수증 주세요」 | 점원 보리차 답 → 마무리 「감사합니다. 안녕히 가세요.」 · 「Mission complete!」 줄 → 채점 → 리포트 |
| RM-T8 | 힌트 | 「Hint · 3 left」(`-hint-button`) | 흰 패널: 「Try saying」 · 정답 상자(봉투는 괜찮아요. · bongtuneun gwaenchanayo. · I don't need a bag.) · 「Each hint takes 5 points.」 · 「Hear it」 · Use this / Close hint. 「Hint · 2 left」 |
| RM-T9 | 힌트 쓰기 · 듣기 | Hear it → Use this | Hear it 누르면 1.2초 재생 중(`-hint-listen` `data-play`), Use this면 입력 칸에 예문, 카드 닫힘. 세 번 쓰면 힌트 단추 잠김 |
| RM-T10 | 음성 — 바로 보냄 | 마이크(「Speak」) → 1초 넘게 → 다시 누름(「Stop」) | 녹음 중 고리 진해짐 · 「Listening… 0:01」 → 「Transcribing…」 → 받아 적은 글이 바로 보내짐(편의점 ①) |
| RM-T11 | 음성 — 확인 | 두 번째 녹음 | 입력 칸에 「카드로 할게요.」 + 「Did I hear that right?」, 마이크 낭독 「Try again」. 보내면 음성 턴, 마이크를 누르면 다시 녹음 — **「Say it again」 글 단추가 없어야 한다**(마이크 하나) |
| RM-T12 | 음성 실패 안내 | 셋째 · 넷째 · 다섯째 · 여섯째 녹음 | ③ 「We couldn't hear you. Try again or type.」 ④ 「That didn't sound like Korean. Try again?」(입력 칸에 영어) ⑤ 「Too many requests right now…」 ⑥ 「Speech recognition isn't responding. Try again or type.」 — 매번 마이크 「Try again」, 턴 줄지 않음 |
| RM-T13 | 짧은 녹음 | 마이크를 0.4초 안에 두 번 | 「Hold on a bit longer and try again.」 · 서버로 보내지 않음(받아 적기 차례가 넘어가지 않음) |
| RM-T14 | 끊고 말하기 · 한 번에 한 목소리 | 재생 중(다시 듣기 직후) 마이크 · 녹음 중 다시 듣기 | 마이크를 누르면 재생 표시가 멈추고 녹음, 녹음 중 다시 듣기는 재생하지 않음. 앱을 홈으로 보냈다 오면 녹음이 버려지고 마이크 「Speak」 |
| RM-T15 | 자동 재생 스위치 | 위 띠 스위치(「Auto-play, On」) 끔 → 글 보내기 | 새 점원 말이 재생 중 표시로 바뀌지 않음, 다시 듣기는 됨. 앱을 다시 띄워도 꺼진 채(기기 기억), 다시 켜 둔다 |
| RM-T16 | 턴 상한 | 새 판에서 목표 낱말 없는 글(예: 「음」) 8번 | 「봉투 필요하세요?」로 되묻다가 8번째에 「죄송합니다, 뒤에 손님이…」 · 「Out of turns」 → 채점 → 실패 리포트 |
| RM-T17 | 그만두기(필수 전) | 「Quit mission」 → 확인 | 「Quit this mission?」 · 「You won't get a report, and this play still counts.」 · Quit / Keep going. Quit → 목록 |
| RM-T18 | 그만두기(필수 뒤) | 성공 뒤 Quit mission | 「Finish this mission?」 → Finish → 채점 → 리포트. 시스템 뒤로도 같은 확인 |
| RM-T19 | 전송 실패 | `봉투 괜찮아요 #fail` 보내기 | 내 말풍선이 보내지 못함 표시(`messenger-chat-unsent`) → 누르면 다시 보내 성공, 목표 체크 |
| RM-T20 | 카페도 끝까지 | 6화 카드 → Start → 마이크 세 번 | ① 주문 바로 보냄 → ② 「가지고 가요.」 확인 → 보내면 MORE NATURAL 카드 → ③ 결제 → 성공 카드 |

## 리포트

| id | 확인 | 가짜로 만드는 법 | 기대 · 요소 |
|---|---|---|---|
| RM-R1 | 성공 리포트 구역 순서 | RM-T7까지 간 편의점 판(봉투 안 필요해요 · 카드으로 할게요 포함) | 히어로(「Mission complete」 · 점수 · 「Your best」 · 결과 한 줄) → 목표 4/4 → 목표 표현 → 정확도 · 힌트 → How your score adds up → What went well(봉투 답 인용) → Key corrections(카드으로 → 카드로) → Sounds more natural(봉투) → 다시 해 볼 표현 → Feedback → Next challenge · Play again · Back to list |
| RM-R2 | 못 이룬 목표의 tip | 필수만 이루고 Finish(편의점: 봉투 · 결제만) | 「You could have said」에 영수증 · 다른 물건 예문 |
| RM-R3 | 실패 리포트 | RM-T16 | 「Mission failed」 · 못 이룬 필수의 tip · 실패 결과 한 줄 |
| RM-R4 | 채점 실패 · 다시 시도 | 판에서 `봉투 괜찮아요 #gradefail` 를 보내고 필수를 이룬 뒤 Finish | 「We couldn't score this」 · 저장 안내 · 「We gave back what you paid for this play.」 · Try again(`-report-retry-grading`) → 채점 중 → 리포트 |
| RM-R5 | 다시 하기 · 최고 기록 | 리포트 Play again → 미리보기 → 다시 끝냄 / Back to list | 미리보기로 돌아감, 목록 카드의 「Best」가 높은 점수로 |

## 마이크 권한(ADR-0206과 같은 시트)

| id | 확인 | 가짜로 만드는 법 | 기대 · 요소 |
|---|---|---|---|
| RM-M1 | 사전 안내는 처음 마이크를 누를 때 | 권한 미요청 + 새 설치 → 대화에서 마이크 | 「Time to speak Korean」 시트(`mic-permission-sheet` `data-sheet="prime"`) · Allow microphone · Not now — skip speaking. 시작(Start mission) 때는 서지 않음 — 대본형(Start)과 다른 점 |
| RM-M2 | 허용 | Allow microphone → 시스템 창 허용(iOS는 음성 인식 창도) | 시트 닫힘 · 저절로 녹음하지 않음 → 마이크를 누르면 녹음 |
| RM-M3 | Not now | (새 설치) Not now | 시트만 닫힘, 글 입력 그대로. 다시 누르면 안내 없이 녹음(가짜 기기는 시스템 창을 띄우지 않음) |
| RM-M4 | 거부 시트 · 설정 열기 | Allow → 시스템 창 거부, 또는 거부된 채 마이크 | 「Microphone is off」 · Open Settings · Continue without speaking, 입력 줄 위 「Allow microphone access in Settings to speak.」. Open Settings → 이 앱 설정 화면 |
| RM-M5 | 설정에서 켜고 돌아옴 | 설정에서 마이크 · 음성 인식 허용 → 앱으로 | Android: 시트가 닫히고 마이크를 누르면 녹음. iOS: 앱이 다시 뜨면 미션을 다시 열어 확인(ADR-0206 한계) |
| RM-M6 | Continue without speaking | 거부 시트에서 | 시트 닫힘, 다시 마이크를 눌러도 시트 없이 안내만, 글로 계속 |

## 좁은 화면 · 긴 문구 · 큰 글자

| id | 확인 | 만드는 법 | 기대 |
|---|---|---|---|
| RM-A1 | 좁은 화면 | iPhone SE(3세대) 시뮬레이터로 RM-T1 ~ T8 | 입력 줄(마이크 48 · 칸 · 보내기)이 한 줄, 힌트 · 성공 카드가 입력 줄을 밀어내지 않음, 목표 띠는 스크롤 |
| RM-A2 | 큰 글자 | `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large` | 위 띠 목표판이 커지지 않고 스크롤, 교정 카드 · 정답 상자 글이 잘리지 않고 줄바꿈, 리포트 단추 묶음이 화면 안 |
| RM-A3 | 긴 문구 | 앱 언어를 Burmese · Thai로(설정) | 「Hint · n left」 · 받아 적기 안내 · 시트 단추가 잘리지 않음(번역은 초안) |
| RM-A4 | 긴 내 글 | 80자쯤 되는 한국어 글 + 「카드으로」 | 내 말풍선 · 고치기 카드가 줄바꿈되고 로그가 마지막으로 내려감 |
| RM-A5 | 낭독 | VoiceOver로 마이크 · 교정 카드 · 목표 | 마이크 「Speak」→ 녹음 중 「Stop」→ 실패 뒤 「Try again」, 교정 카드는 한 요소(제목 · 고친 문장), 목표 「…, required, not done」 |

## 가짜로 만들 수 없는 것(ui 테스트가 봄)

- 30초 상한 자동 멈춤(MV-UI4) · 녹음 뒤 기기 쪽 실패 「Something went wrong while listening. Try again.」(MM-UI5) · 녹음 장치 없음으로 마이크 꺼짐(MM-UI5) · 합성 실패(MV-UI6) · 시작 거절의 다른 코드(엽전 부족 등, `MissionPreviewScreen` 테스트).
- 실제 소리 · 실제 받아 적기 · 값 차감 — 서버 출처 · 호스트 녹음 모듈이 붙은 뒤의 몫.

## 실행 기록

(아직 없음 — 첫 회차를 여기에 적는다.)
