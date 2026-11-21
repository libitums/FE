# 수동 e2e — 단어 즐겨찾기(☆) (ADR-0169 즐겨찾기 개정)

**상태: 일부 실행(2026-11-21).** 전제는 다음과 같다.
- iOS: 이 확인 전용으로 만든 시뮬레이터(iPhone 17 Pro · iOS 26.5) · Debug 호스트에 `--bundle-url=main.lynx`(내장 번들), 끝나면 종료 · 삭제.
- Android: Pixel_8 AVD `-read-only -no-audio`(다른 세션과 겹치지 않는 포트, 와이파이 끔) · `assembleBundled` · `wm density 480`(360dp).
- 비회원(「Continue without an account」)으로 시작. 소리 끔(Android는 `-no-audio`, iOS는 Mac 출력 음소거).
- 실행 로그에서 JS 오류(`ReferenceError` · `TypeError` · `onErrorOccurred`)가 없는지 본다.
- 낭독 순서 · 이름은 iOS 접근성 트리(`idb ui describe-all`, 위치 순)로 본다. VoiceOver · TalkBack으로 직접 듣는 확인은 아래 WST-A 줄.

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| WST-E1 | 레슨 첫 단어 카드 | 뜻 아래 가운데 외곽선 별(회색) · 표식 · 표제어 · 뜻 자리 그대로 | 통과(iOS · Android) |
| WST-E2 | 카드 별 누름 · 다시 누름 | 채운 주황 별 ↔ 외곽선 별, 카드 · Got it 그대로 | 통과(iOS · Android) |
| WST-E3 | 별 단 채 레슨을 나감 → 더보기 › My words | 메뉴 줄 「1 word」 · 그 단어 줄의 별이 채워져 있음 | 통과(iOS · Android) |
| WST-E4 | 칩 줄 | All · Starred · New · Review · Got it, 넘치면 가로로 밀리고 마지막 칩이 화면 끝에서 잘려 보임, Starred 누르면 별 단 줄만 | 통과(iOS · Android — Android 360dp에서는 영어도 넘쳐 스크롤) |
| WST-E5 | Starred에서 별 뗌 → All → Starred | 뗀 줄은 꺼진 별로 남음 → 칩을 바꿔 돌아오면 「No starred words yet」 안내 | 통과(iOS · Android) |
| WST-E6 | 줄 별 누름 | 별만 바뀌고 자세히로 가지 않음 · 재생 단추와 겹치지 않음 | 통과(iOS · Android) |
| WST-E7 | 앱을 끄고 다시 켬 | 별이 남아 있음(기기 저장), 카드도 저장된 상태(채운 별)로 섬 | 통과(Android 강제 종료 · iOS). iOS 시뮬레이터에서 누른 직후 바로 `simctl terminate`하면 저장소 기록이 남지 않은 적이 한 번 있다 — 12초 뒤 종료는 남음(저장소 공통, 이 기능만의 일 아님) |
| WST-E8 | 미얀마어 · 태국어 UI | 칩 줄이 넘치면 가로로 밀림 · 잘린 글자 없음 | 미실행 |
| WST-A1 | 카드 낭독 순서(iOS 접근성 트리) | New word → 안녕하세요 → Pronunciation → Meaning → 「Star 안녕하세요」(Button), 누르면 「Star 안녕하세요, selected」 | 통과(iOS 트리) |
| WST-A2 | 단어장 줄 순서(iOS 접근성 트리) | 「Play, 단어」 → 줄 본문 → 「Star 단어(, selected)」, 셋 다 같은 줄 위치 | 통과(iOS 트리 — 셋 다 y 242) |
| WST-A3 | 빈 안내 | 「No starred words yet」이 머리(Heading) | 통과(iOS 트리) |
| WST-A4 | VoiceOver · TalkBack으로 직접 듣기 — 위 순서 · 별 두 번 탭 뒤 「selected」 · Starred에서 뗀 뒤 초점이 그 별에 남음 · my · th에서 화면 밖 칩까지 스와이프로 닿고 화면 안으로 스크롤됨 · 다른 언어 음성이 한글 단어를 읽는지 | 기대대로 | 미실행 |
