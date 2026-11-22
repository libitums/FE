# ADR-0176: 입장 선택 — 기초부터 / 바로 입장 · 알림 권한은 첫 스토리 뒤

- 상태: **채택 — 사용자 결정**(2026-11-22, 시안 확인 뒤 「진행」). 브랜치 `feat/entry-basics-choice`.
- 날짜: 2026-11-22
- **사용자 요청**: 「튜토리얼 시작하기 전에 입장하기 부분 … 기초부터 풀고가기랑 바로 입장하기 두개 선택할 수 있게 해주고 레터부터 잡고
  시작하고 그 뒤로 바로 가이드 기반 스토리 시작」 · 「jump 버튼은 brand.primary로」 · 「준비 완료 화면 새롭게 디자인」.
- 개정하는 결정: [ADR-0034](0034-server-push-notifications.md) D4(새 가입자의 알림 질문 시점).
- 적용 기록: [ADR-0007](0007-app-internals-state-routing-data-errors.md) D1(저장 예외 하나) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트 셋).
- 이어받는 결정: [ADR-0169](0169-more-menu-letters-wordbook.md) D2 · D3(자모표 · 합치기 퀴즈) ·
  [ADR-0173](0173-letters-audio.md)(글자 소리) · [ADR-0081](0081-tutorial-as-catalog-episode.md)(첫 유닛 안내 = u00 표지).

## 맥락

- 여정 입장은 단추 하나(Start)였다. 한글을 처음 보는 사람도 바로 한국어 문장이 나오는 스토리로 들어갔다.
- Letters와 합치기 퀴즈는 더보기 메뉴 안에 있어 첫 실행에서는 닿지 않는다.
- Start 직후 `syncPushDevice({ ask: true })`가 시스템 창을 띄워 첫 유닛 안내(「Tap to start your lesson!」)를 덮었다.

## 결정

### D1. 여정 입장에 길이 둘이고, 둘 다 기존 첫 유닛 안내로 모인다

```text
여정 입장 ─┬─ Jump into the story ────────────────────────────────┐
           └─ Learn the basics first → ① 글자 → ② 합치기 → ③ 준비 완료 ─┴→ enterApp → 지도 · 첫 유닛 안내 → Intro 스토리
                                          └ Skip ─┴ Skip → enterApp
```

- route 셋(`entry-basics-letters` · `-compose` · `-ready`)은 진입 스택에 쌓인다. 바텀 내비는 `enterApp` 전에는 없다.
- 뒤로 · 시스템 뒤로는 한 칸이다. 합치기로 돌아오면 첫 문제부터다(진행을 저장하지 않는다). 준비 완료에는 보이는 뒤로 · Skip이 없다(시안).
- 떠나는 동작은 화면이 서 있는 동안 한 번이다(`useLeaveOnce`) — 빠른 두 번 탭이 완주 이벤트를 두 번 내지 않는다.
- 기초 도중에 앱을 끄면 다음 실행은 여정 입장을 다시 보이지 않고 바로 지도다(세션 · 손님 표식으로 켜는 기존 규칙 그대로).
  이때 `entry_completed`는 나지 않는다.
- 여정 입장을 건너뛰는 기존 회원([ADR-0069](0069-returning-learner-login.md))은 그대로다.

### D2. 기초는 어디에도 세지 않는다

- 활동 수 · 티켓 · 엽전 · 스트릭 · 단어장에 쓰지 않는다. 활동으로 세면 첫 유닛 안내가 꺼진다.
- `lettersOpened`도 켜지 않는다 — 여섯 자만 봤으므로 Letters 추천은 살아 있어야 한다.
- `letters_cell_tapped` · `letters_quiz_*`도 내지 않는다(더보기 › Letters의 사용량이 섞이지 않게). 기초의 측정은 D6이다.

### D3. 글자 여섯 · 합치기 세 문제는 있는 것을 쓴다

- ㄱ ㄴ ㄷ / ㅏ ㅓ ㅗ — 로마자 · 소리 id는 `lib/letters/jamo.ts`의 값이다.
- 합치기는 Letters › Practice와 같은 순수 상태(`lib/letters/compose-quiz.ts`) · 훅(`useComposeQuiz`) ·
  부품(`ComposeQuizParts`)이다. 바깥 틀만 다르다(레슨 껍데기의 나가기 확인 · Hint 없음, 마지막은 Continue).
- **소리가 없으면 약속하지 않는다.** 여섯 소리가 다 있을 때만 「Tap a letter to hear it」를 붙인다. 없는 칸은 스피커가 비활성이고
  낭독 이름에 그 사실이 붙으며, 흐름은 막히지 않는다. 버킷에 파일과 정보 파일이 올라오면 코드 변경 없이 들린다(ADR-0173 D5).

### D4. 준비 완료는 방금 만든 세 글자가 문장이 되는 순간이다

- 가 · 너 · 도 → `너 도 가` + `?`. 「가」가 위로 넘어간다(0.4 s 멈춤 + 1 s). 그 뒤 제목 · 뜻 · 비행기가 나타나고 문장을 한 번 낭독한다.
- 「너도 가?」는 친구 사이 반말이라 일곱 언어의 뜻도 친근한 말투이고, 단추(「Yes, let’s go」)는 그 물음에 답하는 말이다.
- 단추는 처음부터 눌린다. 동작 줄이기면 처음부터 끝 모습이다.
- 그림은 새로 만들지 않는다 — 매니페스트 `u00-tutorial`의 `cover`를 지도와 같은 주소 해석으로 쓴다. 없으면 그림만 빠진다.
- 바탕은 그림 바탕색 `#FEFEFE`다. 토큰(white · background-primary)을 쓰면 네모 경계가 보여 이 한 곳만 값을 적는다.

### D5. 새 가입자의 알림 권한은 첫 스토리 뒤에 한 번 묻는다

- 때: 표지 스토리를 **끝내거나 · 건너뛰거나 · 나와** 지도로 돌아온 뒤, 지도가 한가하고(겹침 · 보상 모달 · 업데이트 안내 · 상점 없음)
  완료 연출(1.2 s)이 끝났을 때.
- 표식 `libitum.push-prompt.<userId>` = `pending`을 **로그인 성공 뒤 기존 회원 판정 전에** 적는다. 입장 시점에 적으면 기초 도중에 앱을 끈
  사람은 다음 실행이 여정 입장을 건너뛰어 영영 묻지 않는다.
- 다시 켰을 때: 활동 기록이 있으면 지도에서 묻고, 없으면 첫 유닛 안내가 다시 서므로 스토리를 다시 기다린다.
- 표식은 기존 회원 판정을 **기다리기 전에** 적고, 기존 회원으로 판정되면 지운다 — 판정을 기다리는 동안 꺼져도 묻는 차례가 남는다.
  계정을 지우면 함께 지운다.
- 묻기가 끝난 뒤 표식을 지운다. 다만 Android 호스트는 창을 띄우기 전에 「물었음」을 기록하므로, 창이 뜬 채로 꺼지면 다시 뜨지 않는다.
- **겹치지 않는다**: 닫을 겹(모달 · 시트)이 열려 있거나 Letters 추천이 기다리는 중이면 미루고, 묻는 동안 다른 안내 · 머리가 저절로 여는 연속 모달 · 설문은 서지 않는다.
- 입장 때는 `syncPushDevice({ ask: false })` — 이미 허용한 기기는 바로 토큰을 올린다.

| 묻는 자리 | 전 | 이 결정 |
|---|---|---|
| 새 가입자의 여정 입장 | 즉시 | **첫 스토리 뒤** |
| 기존 회원 로그인 → 지도(ADR-0069 D6) | 즉시 | 그대로 |
| 손님의 로그인 성공(ADR-0111 D6) | 즉시 | 그대로 |
| 설정 › Notifications | 미요청이면 즉시 | 그대로 |
| 부팅 · 토큰 갱신 | 묻지 않음 | 그대로 — 표식 없는 기존 계정은 갑자기 묻지 않는다 |

iOS의 추적 허용(ATT, [ADR-0079](0079-ios-tracking-authorization.md) D2)은 이 결정의 범위 밖이라 지도에 처음 들어설 때 그대로 묻는다.

### D6. 이벤트 셋

| 이벤트 | 속성 | 때 |
|---|---|---|
| `entry_path_selected` | `path`: `basics` · `story` | 단추를 누름 |
| `entry_basics_step_completed` | `step`: `letters` · `compose` · `ready` | 그 걸음의 다음 단추 |
| `entry_basics_skipped` | `step`: `letters` · `compose` | Skip |

`entry_completed`(Airbridge 가입 완료)는 속성 없이 실제 `enterApp` 때 한 번 그대로다. `entry_screen_viewed.screen`에 화면 셋이 더해진다.

### D7. 색 · 글자

- 「바로 입장」은 brand.primary 면에 흰 글자 19px bold다(사용자 결정). 3.02:1이라 큰 글자(14pt bold = 18.67px) 기준으로만 통과한다 —
  **크기나 굵기를 줄이지 않는다.** 맞는 글자 토큰이 없어 크기만 값을 적는다. 시스템 글자 배율이 1보다 작으면 이 기준 밑으로 내려간다.
- 기초 화면 안에서만 더 진하게 한다(비텍스트 3:1 · 글 4.5:1): 단계 막대 · ▶ 아이콘은 brand.strong(▶는 Letters › Practice도 같은 부품이라 함께),
  + · =는 fg-neutral-muted, 빈 칸 경계는 fg-neutral-subtle, 판정은 배지 대신 feedback `-text` 글(낱말 · 효과음은 같다).
- 입장 화면의 글자 묶음은 어두운 면을 스스로 진다 — 작은 기기 · 큰 글꼴에서 가운데로 밀려도 읽히게.
- AI 그림 고지는 남기고 gray.600(어두운 면 위 8:1)으로 올린다.

## 버린 대안

- B안 선택 카드(`Cards.dc.html`) — 사용자가 A안을 골랐다.
- 지도 · 안내를 건너뛰고 바로 스토리 — 두 길 모두 기존 안내를 지난다는 결정과 어긋난다.
- 기초를 활동 · 레슨으로 기록 — 첫 유닛 안내가 꺼지고 스트릭 · 보상이 움직인다.
- 「활동이 있고 권한이 미요청」이면 누구나 묻기 — 세션으로 켜는 기존 계정에게 갑자기 창이 뜬다.

## 대가

- 첫 스토리 전에 떠난 사람에게는 알림을 보낼 수 없다.
- 가입 완료 수(`entry_completed`)는 기초 도중 이탈만큼 줄 수 있다. 단계 이벤트로 어디서 떠나는지 본다.
- 합치기 부품이 `components/`로 올라와 Letters › Practice와 입장 전 기초가 같이 바뀐다.

## 검사

- unit: `entry-basics` EB1 ~ EB4 · `entry-path-wiring` EP1 ~ EP8 · `push-prompt` PP1 ~ PP9.
- ui: `EntryBasics*Screen` BL · BC · BR · `entry-basics.a11y` BA1 ~ BA8 · `JourneyEntryScreen` JE-U1 ~ U9 · JE-A1.
- unit(더): `back-handler` BH0 · `account-wiring.progress-cache` AW1b.
- integration: `App.entry-basics.integration.test.tsx` EBI1 ~ EBI21 · `AppHeader` AH-H1.
- 기기: [입장 선택 e2e](../e2e/entry-basics.md).
