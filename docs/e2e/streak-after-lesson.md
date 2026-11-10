# 연속 학습은 일반 학습을 끝내야 오른다 (ADR-0035 U2 개정 2026-11-09)

표지(스페셜 유닛 — 표지 · 프롤로그 컷)만 끝낸 날은 연속 학습의 하루가 아니다. 레슨 · 문화 · 막간 · 최종 테스트를 끝내야 오늘을 적고, 일수가 오르면 「N day streak」 모달이 뜬다.

전제: 처음 설치(또는 앱 데이터 지움) — 연속 0일. 비회원 또는 새 계정.

## 구현 전과의 차이

| 자리 | 전 | 후 |
| --- | --- | --- |
| 튜토리얼 표지 · 컷을 마치고 「Episode start!」 배너가 닫힌 뒤 | 「1 day streak」 모달 → 닫으면 지도 | 바로 지도. 머리 칩 `0` |
| 레슨 1 결과에서 맵으로 | (이미 1일이라) 모달 없음 | 「1 day streak」 모달, 닫으면 칩 0 → 1 |

## 절차

| # | 단계 | 관찰 |
| --- | --- | --- |
| SL-E1 | 1. 온보딩 → 비회원 → 이름 · 나라 · 언어 → `Start` 2. 지도의 표지(`Episode 0. Intro`) → `Next` 3. 컷 7장을 넘기고 `Finish intro` | 배너 `Episode start!`가 닫히면 **곧장 지도**다. `journey-stat-modal-streak`(「1 day streak」) 없음. 머리 연속 칩 낭독 「0-day streak」 |
| SL-E2 | 4. 지도의 `Episode 0. Lesson 1` → `Start` 5. 레슨을 끝까지 풀고 결과 화면에서 `Back to map` | 결과 화면 머리 칩이 「1-day streak」로 오른다(ADR-0064). 맵으로 돌아오면 `journey-stat-modal-streak`이 뜨고 값이 `1` |
| SL-E3 | 6. 모달을 닫고 같은 날 레슨 2를 끝내고 `Back to map` | 모달 없음(이미 오늘 한 날). 칩 1 그대로 |

결과 화면에서 `Next lesson`으로 바로 다음 레슨에 들어가는 길은 보지 않았다 — 모달이 언제 뜨는지(다음 맵 복귀)는 이 변경 전과 같은 규칙이다(ADR-0064).

## 실행 기록

- **2026-11-09 · iOS 시뮬레이터(iPhone 17 Pro, iOS 26.5) · 브랜치 `fix/streak-not-on-cover` 번들(분석 환경 development) · 비회원 — SL-E1 · SL-E2 · SL-E3 통과.** SL-E1: 배너 뒤 곧장 지도, 칩 `0`, 모달 없음. SL-E2: 레슨 1 PERFECT → 결과 칩 `1-day streak` → `Back to map` → 「1 day streak」 모달. SL-E3: 레슨 2 → 맵, 모달 없음 · 칩 1. Android · 로그인 계정 회차는 미실행.
