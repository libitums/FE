# 한국어 자판 크기 · 눌림 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았다.
- 기능 PR: 한국어 자판(`MessengerKeyboard`) — 화면 폭을 쓰는 10칸 격자 · 틈 없는 칸 터치 · touchstart 입력과 tap 대체 · 눌림 · 말풍선 · 힌트 · 지우기 반복 · 키 진동 `key`([ADR-0112](../../adr/0112-keyboard-touch-input.md))
- 대상 commit: `main`(`eef07089`) 위의 작업 브랜치
- 기기: 측정 기기 없음. 동작 확인만 iOS 시뮬레이터 · Android AVD에서 했다([기기 확인](../../e2e/keyboard-touch.md))
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-09

## 시나리오

- 번들 크기: 같은 설정으로 `main`(`eef07089`)을 임시 워크트리에서 빌드해 비교했다.
- 런타임: 미측정. 키를 누를 때마다 background에서 상태 갱신(눌림 켬 · 끔) 두 번 · 키 31개 다시 그리기 · 타이머 하나 · 네이티브 호출 하나(`haptic("key")`)가 는다.

## 이 변경이 무엇을 건드렸나

- 새 순수 모듈 셋(`keyboard-layout` · `key-press-gate` · `key-repeat`) · 자판 컴포넌트 재구성 · CSS 규칙 · 인라인 지우기 아이콘 · 다섯 언어 문구 두 줄(진동 설명 바뀜 · 쉼표 라벨 삭제).
- 호스트: iOS impact 생성기 하나 · Android 진동 경로 하나(새 클래스 `HapticKindRoute`). 의존성 · 이미지 · 음원 · 권한 변경 없음.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| `main` CI 설정 실측 | 3,964,995 bytes |
| 이 변경 — CI 설정 | 3,976,822 bytes (+11,827) |

- `main.lynx.bundle` 3,976.8 / 4,060.0 kB · `static/image` 4,304.6 / 11,520.0 kB · ui-lynx dist 557.8 / 559.0 kB — 셋 다 상한 안. 상한은 그대로 둔다.

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다. 특히 저사양 실기의 연타 반응(키당 다시 그리기 둘)은 [기기 확인](../../e2e/keyboard-touch.md) KT-E11에서 본다.

## 결론과 후속

- 연타 지연이 실기에서 보이면 눌림 표시를 칸 단위 컴포넌트로 나눠 다시 그리기 범위를 줄인다.
