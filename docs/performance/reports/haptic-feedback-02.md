# 학습 판정 진동 2판 — Android `Vibrator` · 앱 설정 끄기 — 미측정 — 02

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: Android 판정 진동을 `Vibrator` 한 번 파형으로 바꿔 시스템 터치 진동 설정과 상관없이 내고, 설정 `Learning` 묶음에 `Vibration` 토글(기본 켬)을 더한다. `playSound`는 진동이 붙는 id에서만 저장된 진동 설정을 읽는다(ADR-0109 D3 2판 · D4).
- 대상 commit: `main`(`2c1257c9`) 위의 `feat/haptic-ignore-system-setting`
- 기기: 측정 기기 없음. 동작 확인만 Galaxy A52s(One UI, API 34) bundled 빌드에서 했다(진동 기록 `dumpsys vibrator_manager`).
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 CI 설정 빌드(`.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,949.7 kB(상한 4,060.0 kB 통과, 같은 설정의 `main` 3,948.3 kB 대비 약 +1.4 kB — 토글 줄 · 다섯 언어 문구 · 저장 읽기). `static/image` 4,304.6 kB(상한 11,520.0 kB), ui-lynx dist 557.8 kB(상한 559.0 kB, 변경 0).
- 런타임: 미측정. 설정 목록에 셀이 하나 늘고, 판정 1건마다 동기 저장소 읽기(`StorageModule.get`)가 하나 는다.

## 이 변경이 무엇을 건드렸나

- `lib/session-options.ts` · `lib/session-options-storage.ts` — 세션 옵션 `vibration`(기본 켬)과 기기 저장 키 `libitum.session-option.vibration`, 지금 값을 읽는 `storedVibrationEnabled()`.
- `lib/sound-effects.ts` — 진동이 붙는 id에서만 `storedVibrationEnabled()`를 읽고, 끔이면 `haptic`을 건너뛴다. 효과음은 그대로.
- 설정 화면 — `Learning` 묶음에 기존 `SettingsCell` 토글 하나가 는다(새 부품 0).
- Android `SoundEffectsController.haptic` — decorView `performHapticFeedback` 대신 `Vibrator.vibrate(createWaveform(…, -1), AudioAttributes)`. 매니페스트에 `VIBRATE`.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 늘어난 일은 설정 화면의 셀 하나와 판정 1건당 동기 저장소 읽기 하나라 작다고 보지만, 재지 않아 수치로 말할 수 없습니다.
- 진동 파형의 체감(정답 1회 · 오답 2회가 구별되는가)은 성능 수집기가 재는 축이 아니라 기기 확인(`docs/e2e/haptic-feedback.md`)의 몫이고, 바꾼 파형은 아직 사람이 손으로 확인하지 않았습니다 — 한계입니다.

## 결론과 후속

- 미측정입니다.
- 후속: 판정 화면에서 진동이 소리보다 늦게 느껴지거나 저장소 읽기가 탭 처리 측정(`performance:capture`)에 보이면 그때 값을 메모리에 들고 있는 결선으로 바꿉니다. 그 전에는 재지 않습니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
