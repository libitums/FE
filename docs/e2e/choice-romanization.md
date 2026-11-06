# 보기 로마자 — 기기 확인

결정은 [ADR-0108](../adr/0108-choice-romanization.md)(보기 로마자 · 설정 토글 · 기기 저장 키)이 진다. 자동 테스트(unit · ui · integration)는 대상 유형 판정 · `choiceRomanizations` 정렬 · 줄의 DOM 순서 · 토글 → 저장 → 문항 표시 결선 · 낭독 이름 문자열 · compact 규칙의 CSS 선언을 지킨다.
**13 mini compact에서 실제로 스크롤 없이 들어가는지(높이) · 실제 서체 · VoiceOver/TalkBack이 실제로 읽는 소리 · 강제 종료 뒤 저장 유지 · 최대 글꼴에서의 접힘**은 기기에서만 판정한다 — 테스트 환경에는 레이아웃 측정도 스크린리더도 없다.
항목 정본은 작업 `choice-romanization`의 `test-plan.md` e2e 표(CR-E1 ~ CR-E10), 계약은 `spec.md`(결정 1 ~ 3 · §3), 시각 값은 `design.md`다. 이 문서는 **절차**다.

## 준비

- 빌드: 이 기능이 든 Debug 호스트 + `--bundle-url=main.lynx`(로컬 번들). **구현 전 빌드**(기능 병합 직전 main)도 한 벌 준비해 「구현 전과의 차이」를 비교한다.
- 기기: iPhone 13 mini 시뮬레이터(compact — CR-E6 · CR-E8), iPhone 15 계열 시뮬레이터(regular — CR-E7), Android 에뮬레이터(CR-E9, 읽기 전용 · 포트 5556). VoiceOver는 실기 권장, TalkBack은 에뮬레이터.
- 새로 설치(저장 키 없음 = 설정 **켬** 기본)로 시작한다: `xcrun simctl uninstall booted com.libitum.host` 뒤 설치. 로그인된 상태가 필요하면 [진입 흐름](entry-flow.md)을 한 번 통과한다.
- 문항 위치: 여정 맵 → 에피소드 `u03` → 해당 레슨. 대상 문항은 REPLY_SELECT 「안녕하세요. 이름이 뭐예요?」 · LISTEN_SELECT · MIN_PAIR_AB · `S1-14`(「저는 이틀 먼저 왔는데 2주 있을 거예요.」 묶음) · `S2-04` · CULTURE_CHECK · TRANSLATE_TO_EN.
- 저장 키는 `libitum.session-option.show-choice-romanization`(`"on"` / `"off"`, 기기 범위). iOS `StorageModule`은 `UserDefaults.standard`에 앞 `libitum.`을 **하나 더** 붙인다 — 실제 키는 `libitum.libitum.session-option.show-choice-romanization`이다. 읽기: `xcrun simctl spawn booted defaults export com.libitum.host - | plutil -p -`(저장 위치 절차는 `docs/conventions/workflow.md` 자체 호스트 앱 절).
- 판정: 스크린숏 · 화면 녹화 · Accessibility Inspector(발화 글자) · VoiceOver/TalkBack 실청취 · 보기 아래 끝 y 실측(성능 보고서에 기록).
- **자동 테스트와 겹치지 않는다**: 줄의 존재 · 순서 · 낭독 이름의 문자열은 ui · integration이 이미 지킨다. 여기서는 그 결과가 **기기에서 실제로 그렇게 그려지고 들리는가**만 본다.

## 항목

| id | 행동 | 기대 |
| --- | --- | --- |
| CR-E1 | 새로 설치 · iOS 시뮬레이터 · u03 REPLY_SELECT 「안녕하세요. 이름이 뭐예요?」를 연다 | 보기 셋마다 한글 **위**에 작고 muted한 기울임 로마자 한 줄이 있다(수용 기준 1). 한글 보기는 그대로 · 설정을 만지지 않았는데 줄이 있다(기본 켬). 스크린숏 `ios-choice-romanization-reply-select.png` |
| CR-E2 | u03 LISTEN_SELECT · MIN_PAIR_AB를 연다. 소리가 나는 문항(받아 둔 음성)으로 — **답하기 전** 스크린숏, 보기를 고른 뒤 스크린숏 | 답 전: 제시 카드는 **재생 줄만**(구분선 · 로마자 · 한글 대본 없음), 보기에는 로마자 줄이 있다. 답한 뒤: 제시문 대본(한글 + 로마자)이 서고 보기 로마자는 그대로(수용 기준 2) |
| CR-E3 | TRANSLATE_TO_EN 문항을 연다. 버킷 판에 로마자가 빈 타일이 있는 CLOZE 문항이 있으면 그것도 연다 | 영어 보기에는 줄이 없다 · 빈 타일의 보기만 줄이 없고 나머지 보기는 있다. 줄이 없는 보기가 위로 당겨지거나 빈 줄이 남지 않는다(수용 기준 3) |
| CR-E4 | 설정 탭 › `Learning` 그룹 맨 위 `Romanization on choices`를 **끈다** → 대상 문항 몇 개를 연다 → 앱 강제 종료(`xcrun simctl terminate booted com.libitum.host`) → 재실행 → 같은 문항 → 설정에서 다시 **켠다** → 같은 문항 | 끄면 대상 문항 어디에도 줄이 없다 · 재실행 뒤에도 끔 상태(설정 셀 꺼짐, 문항 줄 없음) · 켜면 줄이 돌아온다(수용 기준 4). 끄는 즉시 저장 키 값 `"off"`, 켜면 `"on"`(위 `defaults export`) |
| CR-E5 | VoiceOver(iOS) · TalkBack(Android)를 켜고 보기와 설정 셀을 훑는다. 켬 / 끔 / 보기를 고른 뒤 각각 | 켬: 보기가 `한글, Pronunciation: 로마자`로 **한 정지**에 읽힌다(로마자 줄이 따로 정지하지 않음, 뜻이 있으면 `한글, Pronunciation: 로마자, 뜻` — UI 언어별 접두는 그 언어의 `readAloud.pronunciation` 문구). 고른 뒤 판정 접미사가 끝에 붙는다. 끔: 구현 전과 같은 한글만. 설정 셀은 제목 · 설명 · 상태를 읽는다 — 상태 낱말이 영어(`on` / `off`)인 것은 **알려진 한계**(실패로 보지 않고 들린 그대로 기록)(수용 기준 5) |
| CR-E6 | **iPhone 13 mini · compact** · 설정 켬 · u03 `S1-14`(「저는 이틀 먼저 왔는데 2주 있을 거예요.」 묶음)와 `S2-04`를 **답 전 · 답한 뒤** 각각 연다 | **스크롤 없이** 보기 넷과 아래 버튼이 모두 화면 안(결정 2 · 수용 기준 6). 로마자 줄이 caption(11/16)으로 줄고 글 묶음 줄 사이가 0이다. 넘치면 스크롤 안전망으로 닿되 잘리지 않음을 적고 **실패로 보고**한다. 보기 아래 끝 y를 실측해 성능 보고서에 옮긴다 |
| CR-E7 | iPhone 15 계열 · regular · CR-E6과 같은 두 문항 | 보기와 버튼이 화면 안 · 로마자는 body-s(12/18)로 compact보다 크다 |
| CR-E8 | iOS 최대 Dynamic Type(접근성 최대 글꼴) · CULTURE_CHECK 세 줄 보기(로마자 · 한글 · 뜻) | 로마자 · 한글 · 뜻이 잘리지 않고 줄바꿈으로 접히며 스크롤 안전망 안에 든다 |
| CR-E9 | Android 에뮬레이터에서 CR-E1 · CR-E4 | 같은 결과 · 강제 종료(`adb shell am force-stop com.libitum.host`) 뒤에도 끔 유지 |
| CR-E10 | **조건부** — PR #386(로마자 글꼴) 병합 뒤에만. 병합 전에는 「해당 없음」 | 보기 로마자 줄이 제시문 로마자와 **같은 글꼴**(Duru Roman)로 그려진다. 같은 화면 스크린숏 한 장에서 두 줄의 글자 모양을 비교 |

## 구현 전과의 차이

「구현 전」 빌드와 「이 기능」 빌드를 같은 조건으로 돌려 어긋나는지 본다. 구현 전 빌드에서 이 표의 「이 기능」 열이 보이면 빌드를 잘못 설치한 것이다.

| id | 구현 전 빌드 | 이 기능 빌드 |
| --- | --- | --- |
| CR-E1 | 보기에 한글만 — 로마자 줄 없음 | 보기 셋마다 한글 위 로마자 줄 |
| CR-E2 | 답 전 제시 카드에 「로마자만」 줄이 설 수 있었다(옛 `beforeAnswer` 갈래), 보기 로마자 없음 | 답 전 제시는 재생 줄만, 보기에 로마자 · 답한 뒤 대본 규칙은 그대로 |
| CR-E3 | 영어 보기 줄 없음 | 같음(회귀 그물) · 빈 타일만 줄 없음 |
| CR-E4 | 설정에 이 토글이 없다 | `Learning` 맨 위 토글 · 끔이 재실행을 넘는다(기기 저장). 설정 화면의 켬/끔 줄은 이것 하나다 — 자동 재생 · 대본 표시는 화면에 줄이 없다(코드 상수) |
| CR-E5 | 보기 이름 = 한글만 | 켬: `한글, Pronunciation: 로마자[, 뜻][, 판정]` · 끔: 한글만 |
| CR-E6 | 로마자 줄이 없어 높이 여유가 있었다 | 줄이 더해진 높이가 13 mini compact에서 스크롤 없이 드는지가 판정 대상 |
| CR-E10 | 해당 없음 | #386 병합 뒤 보기 줄이 제시문 로마자와 같은 글꼴 |

## 실행 기록

회차마다 한 줄을 더한다. 확인자 · 기기 · 빌드를 적는다. 닿지 못한 것은 통과가 아니라 **미실행**으로 적는다.

| 날짜 | 빌드 | 기기 | 항목 | 결과 | 확인자 |
| --- | --- | --- | --- | --- | --- |
| — | — | — | CR-E1 ~ CR-E10 | **미실행** | — |
