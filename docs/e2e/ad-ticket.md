# 광고 보고 티켓 1장 — 수동 E2E (ADR-0209)

자동 러너가 없는 부분(실제 광고 SDK · Google SSV 콜백 · 실기기)을 사람이 확인한다. 운영 DB · 운영 함수에는 요청하지 않는다.

## 준비

- 값 파일(gitignore): iOS `apps/ios/Config/AdMob.local.xcconfig`, Android `apps/android/app/admob.properties` — 각 `.example`을 복사하면 Google 공식
  **테스트 ID**다. 실제 ID는 운영 빌드에서만.
- 시작 전 기기 · 시뮬레이터의 소리를 끈다. 끝나면 시뮬레이터 · 에뮬레이터를 끈다.
- 로그인 · 티켓 0장 · 실험군이 필요하다. 개발 중에는 서버 · 플래그를 흉내 내는 탐침 진입(커밋하지 않음)으로 대화상자만 띄워도 된다 —
  `useAdTicket`의 `client` · `flag` · `userId`만 바꾸고 광고 불러오기 · 보여 주기는 호스트 실제 모듈을 쓴다.

## 절차

| # | 단계 | 기대 |
|---|---|---|
| AT-E1 | 「Out of tickets」 | 선택지 맨 위 「Watch a short ad · +1 ticket · 2 left today · Free」(A1) |
| AT-E2 | 광고 줄 누름 | 줄 안에서만 「Loading ad…」(A2), 엽전 · Back to map은 그대로 |
| AT-E3 | 테스트 광고를 끝까지(「Reward granted」) → 닫기 | 「Getting your ticket…」 → 서버 지급 확인 → 「You got a ticket」 · 링 1 · 「Thanks for watching. 1 ad ticket left today.」 · Start lesson(A3) |
| AT-E4 | 오늘 2번 다 씀 | 흐린 줄 「Used 2 of 2 today · back tomorrow」, 누르지 않음(A4) |
| AT-E5 | 광고 없음(네트워크 끊기 · no fill) | 줄 대신 「No ad is available right now…」(A5), 횟수 그대로, 1분 뒤 줄 다시 |
| AT-E6 | 광고 일찍 닫기 | 지급 확인 없이 줄 다시(실패 안내 없음) |
| AT-E7 | 값 파일 없이 빌드 | 앱이 정상으로 뜨고(샘플 앱 ID) 광고 줄이 없다, 요청 0건 |
| AT-E8 | 대조군 · 서버 스위치 off · 구독자 · 가입 24시간 안 · 비회원 | 광고 줄 없음 |
| AT-E9 | (운영 적용 뒤) 실제 광고 단위 + SSV URL | Supabase 로그 `admob_ssv` 200 `granted` 한 줄 |

## 기록 ⟨2026-11-27⟩

- iOS 시뮬레이터(iPhone 17 Pro) · Android 에뮬레이터(Pixel 8, `assembleBundled`): AT-E1 ~ AT-E5 · AT-E7 통과 — 테스트 광고 실제 재생 · 「Reward granted」 뒤 닫기,
  지급은 서버 흉내(운영 요청 없음).
- iOS: `GADApplicationIdentifier`가 비면 SDK가 앱이 뜰 때 죽였다(GADInvalidInitializationException) → 기본값을 Google 샘플 앱 ID로 두고 광고 단위를 스위치로 삼았다.
