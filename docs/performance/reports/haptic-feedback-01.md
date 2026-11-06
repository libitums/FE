# 학습 판정 진동(햅틱) — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 효과음 접점 `playSound(id)`가 판정 넷(`correct_answer` · `wrong_answer` · `pass_lesson` · `failed_lesson`)에서만 효과음 뒤에 호스트 `SoundEffectsModule.haptic(kind)`를 한 번 더 부르고, iOS · Android 호스트가 시스템 기본 진동을 낸다(ADR-0109).
- 대상 commit: `main`(`c3afcf8a`) 위의 `feat/haptic-feedback`
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,903.0 kB(상한 4,060.0 kB 통과). `static/image` 4,304.6 kB(상한 11,520.0 kB), ui-lynx dist 555.6 kB(상한 556.0 kB).
- 런타임: 미측정. 화면 · 렌더 경로는 바뀌지 않았고(바뀐 `.tsx` 0), 판정 1건마다 효과음 호출 옆에 동기 네이티브 호출이 하나 는다.

## 이 변경이 무엇을 건드렸나

- `lib/sound-effects.ts` — 효과음 → 진동 정책 표(`Record<SoundEffectId, HapticKind | null>`)와 조회 `hapticFor`. `playSound`는 `play(id)` 뒤에 정책이 `null`이 아니고 모듈에 `haptic`이 있을 때만 `haptic(kind)`를 1회 부른다. 상태를 쌓지 않는다.
- iOS `SoundEffectsModule.haptic` — 문자열을 `HapticFeedbackKind`로 분류한 뒤 메인 큐에서 `UINotificationFeedbackGenerator().notificationOccurred(type)`.
- Android `SoundEffectsController.haptic` — `HapticFeedbackConstant.of(kind, SDK_INT)`로 상수를 고른 뒤 메인 스레드에서 decorView `performHapticFeedback(constant)`.
- 화면 코드 · 자산 · 효과음 재생 규칙 · 권한 · 매니페스트는 바뀌지 않았다.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 진동 호출은 판정 1건(문항당 한 번 · 레슨 결과 한 번)마다 하나이고 호스트 쪽은 시스템 햅틱 API 호출 하나라 비용이 작다고 보지만, 재지 않아 수치로 말할 수 없습니다.
- 진동 모터가 거친 저가 Android에서의 체감(세기 · 길이)은 성능 수집기가 재는 축이 아니라 기기 확인(`docs/e2e/haptic-feedback.md`)의 몫이고, 그 확인도 아직 실기에서 하지 않았습니다.

## 결론과 후속

- 미측정입니다.
- 후속: 실기 확인(HF-E1 ~ E3)에서 진동이 효과음보다 눈에 띄게 늦게 느껴지면 그때 메인 큐 전달 지연을 잽니다. 그 전에는 재지 않습니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
