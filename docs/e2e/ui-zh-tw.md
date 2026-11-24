# 대만 중국어(번체) 화면 문구 — iOS · Android 수동 e2e

[ADR-0185](../adr/0185-ui-traditional-chinese-taiwan.md)의 기기 확인 절차다. 자동 E2E 러너는 없다([README](README.md)).
글꼴은 `.app-lang-zh-tw`가 번체 시스템 글꼴을 Duru Sans 앞에 둔다 — **자형(문장부호 ，。 위치) · 한글과 섞인 줄의 높이 · 잘림**을 눈으로 본다.

## 전제

- iOS: 새 시뮬레이터(iPhone 13 mini, 375pt), 기기 언어 `zh-Hant-TW`(`AppleLanguages`) — 권한 창 언어를 보려고. 끝나면 지운다.
- Android: `assembleBundled`, read-only AVD(`-no-audio`), 앱 언어 `cmd locale set-app-locales <패키지> --locales zh-TW`(시스템 로캘은 production 이미지라 못 바꿈). 끝나면 `emu kill`.
- 비회원 「Continue without an account」 흐름. 앱은 기기 언어를 읽지 않는다 — 언어는 온보딩 언어 단계에서 고른다(ADR-0185 D3).
- 앱 소리를 끄고 진행한다(설정에 소리 스위치가 없으면 소리 나는 단계 — 레슨 · 말하기 — 를 피한다).

## 절차

| id | 시작점 → 행동 | 관찰할 최종 결과 |
|---|---|---|
| ZT-E1 | 새 설치 → Get started → Continue without an account → 이름 · 나라 → 언어 단계에서 `Traditional Chinese · 繁體中文` | 「中」 배지 · 라벨이 보이고, 고르는 즉시 단추가 「繼續」 |
| ZT-E2 | 계속 → 여정 입장 화면 | 제목 · 설명 · 단추 두 개가 대만 중국어, 설명 문장의 ，。가 칸 가운데(대만 자형) |
| ZT-E3 | 「直接進入故事」 → (iOS) 추적 허용 창 | 시스템 창의 앱 문구가 번체(`zh-Hant.lproj`) |
| ZT-E4 | 여정 맵 · 가입 보상 카드 · 머리 칩 | 「序章」 · 「第1課」 · 안내 말풍선 · 카드 문구 번체, 잘림 없음 |
| ZT-E5 | 엽전 칩 → 상점 | 팩 수 `1,200` · `3,000`, 「最划算」 알약 · 구매 단추 잘림 없음 |
| ZT-E6 | 더보기 → 설정 · 字母(Letters) | 메뉴 · 설정 줄 · Letters 제목 · 안내 번체 |
| ZT-E7 | 聊天 탭 · 排行榜 탭 | 안내 말풍선(한글 인물 이름과 섞인 줄) 높이 고름, 비회원 순위 안내 번체 |
| ZT-E8 | 序章 → 이야기 첫 장면 | 머리 「第0集 · 第1幕 / 共7幕」 번체, 대사 뜻 줄은 영어 원문(콘텐츠 번역 없음 — 정상) |

## 기록

| id | 결과 | 날짜 · 빌드 |
|---|---|---|
| ZT-E1 ~ E8 | iOS 통과 | 2026-11-24 · `feat/zh-tw`(main a7c4a7e6 위), iPhone 13 mini 시뮬레이터 iOS 26.5, Debug + `--bundle-url=main.lynx` |
| ZT-E1 · E2 · E4 ~ E7 | Android 통과 — 단 **ZT-E2 자형 실패**: ，。가 왼쪽 아래(대만 자형 아님). 읽기 · 잘림 문제는 없음 | 같은 날 · Pixel 8 AVD(API 37) `assembleBundled` |

남은 것: Android 대만 자형(ADR-0185 남은 일) · 레슨 문제 화면 · 마이크 · 음성 인식 권한 창(말하기 단계 — 문구는 IL4가 봄) · 알림 채널 이름(AL1이 봄) ·
요금제 칩(구독 계정) · VoiceOver · TalkBack 낭독(영어 접미사 — ADR-0185 표) · 나라 이름(버킷 `country-names/zh-TW.json` 올린 뒤).
