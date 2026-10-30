# 시험 계정 추적 제외(PostHog · Airbridge) — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 시험 계정이면 PostHog · Airbridge로 보내지 않는 변경(이 보고서와 같은 PR, ADR-0085 D4)
- 대상 commit: `main` 위의 `feat/tester-no-tracking`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: 하지 않음 — 측정용 번들을 따로 짓지 않았습니다.

## 시나리오

- 없음. 이벤트를 보낼 때 모듈 값 하나를 읽는 분기와, 표시가 바뀔 때만 호스트 메서드를 한 번 부르는 변경입니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 `lib/tester-tracking.ts`, 진입점 `app/index.tsx`의 sink · 식별 감싸기, `app/use-tester-access.ts`의 effect 한 줄.
- 호스트 `AirbridgeEventsModule.setTrackingEnabled`(iOS · Android)와 SDK 시작 옵션 `setAutoStartTrackingEnabled`.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| `main.lynx.bundle` | 재지 않음 — 코드 몇 줄 증가 |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 렌더 경로에 더한 것은 effect 안의 함수 호출 하나(값이 같으면 바로 돌아옴)라 작을 것으로 보지만 근거가 아닙니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 다음 기기 측정 때 맵 렌더 시간을 이전 보고서와 견줍니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
