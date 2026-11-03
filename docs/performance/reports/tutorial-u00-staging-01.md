# 내장 튜토리얼 staging 판 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 내장 튜토리얼(u00)을 staging 판(3단계 · 키보드 받아쓰기 없음 · 번역표 포함)으로 바꾸고, 내장 그림 15장을 level-3/ 경로의 staging 그림으로 바꾼다(사용자 결정 2026-11-03).
- 대상 commit: `main` 위의 `feat/tutorial-u00-staging`
- 기기: 측정 기기 없음. 화면은 Android 실기(Galaxy A52s)에서 걸어 봤습니다(측정 아님).
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-03

## 시나리오

- 번들 크기: CI 설정 빌드 main.lynx.bundle 3,284.8 kB(상한 3,480.0 kB 통과). 내장 그림은 장수가 같고 파일만 바뀌었습니다.
- 런타임: 미측정.

## 이 변경이 무엇을 건드렸나

- content/episodes/u00-tutorial.json 본문 교체(+ vi · id 번역표)
- assets/content/level-3/images 그림 15장(옛 u00 그림 15장 대신)
- bundled-content-images.ts 표 키를 level-3/images/…로

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 런타임 값을 재지 않아 렌더링 · 메모리에 대해서는 말할 수 없습니다.

## 결론과 후속

- 미측정입니다.
- 후속: 버킷 audio/level-3/ 업로드 뒤 튜토리얼 소리 확인.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
