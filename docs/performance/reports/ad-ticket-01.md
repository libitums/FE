# 광고 보고 티켓 1장(앱) — 01

## 실행 조건

- 측정 일시: 2026-11-27T16:30:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace) 수치는 수집하지 않았다. 번들 · 앱 크기만 로컬 빌드 한 번씩 잰다
- 기능 PR: `feat/ad-ticket-app`
- 대상 commit: `feat/ad-ticket-server` 위의 변경(origin/main e433427a 기준)
- 기기: iOS 시뮬레이터(iPhone 17 Pro) · Android 에뮬레이터(Pixel 8 AVD, 읽기 전용) — 화면 확인만, 계측 없음
- OS: iOS 26.5 · Android(에뮬레이터 이미지)
- Lynx SDK: 4.0.1
- 빌드: 로컬 `rspeedy build`(.env.local 없음, CI와 같은 설정) — `main.lynx.bundle` 5,794,961 bytes, 천장 6,180,000 안. 변경 전 값은 CI의 「Build and bundle size」 보고로 확인
- 실행 회차: 01

## 시나리오

- 단계: 티켓 0장에서 새 레슨 → 「Out of tickets」 → 광고 줄(A1) → 불러오는 중(A2) → Google 테스트 광고 → 닫음 → 지급 확인(서버 흉내) → 받음(A3) · 오늘 다 씀(A4) · 광고 없음(A5).
- 하지 않은 것: 프레임 시간 · 메모리 계측, 실기기 확인, 실제 AdMob 광고 단위 · SSV 콜백.

## 이 변경이 무엇을 건드렸나

- 대화상자가 설 때만: 서버 상태 RPC 한 번 + PostHog 플래그 요청 한 번(사용자마다 10분 기억). 호스트 광고 모듈이 없으면(값 파일 없음) 요청 0건.
- 광고를 닫은 뒤 지급 확인 RPC를 1 · 1.5 · 2 · 3 · 4 · 5 · 5초 간격으로 최대 7번.
- 네이티브 SDK(Google Mobile Ads)가 앱에 더해진다 — 아래 크기.

## 분석 결과

| 항목 | 변경 전 | 변경 뒤 | 차이 |
|---|---|---|---|
| Android `assembleBundled` APK 다운로드 크기(apkanalyzer) | 29,903,369 B | 31,738,793 B | +1,835,424 B(약 +1.8 MB) |
| Android APK 파일 | 57,627,275 B | 59,567,239 B | +1,939,964 B |
| iOS Release(arm64) 링크된 AdMob 코드(링크 맵) | — | 2,903,716 B(+UMP 40,425 B) | 설치 크기 약 +2.9 MB |
| iOS 다운로드(추정) | — | — | 약 +0.8 ~ 1.2 MB(실행 파일 gzip 비율 28%를 적용한 추정, App Store 수치 아님) |

## 해석

- 측정 한계: iOS는 변경 전 빌드를 따로 짓지 않고 링크 맵에서 AdMob 몫만 셌다. App Store Connect의 「앱 크기」 보고로 다시 확인한다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다.
- 후속: 스토어 빌드 뒤 App Store Connect · Play Console의 다운로드 크기로 다시 잰다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키 · 광고 ID)을 싣지 않았습니다.
