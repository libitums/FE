# Android 빌드 4 — `Array.at` 제거 · 미디어 볼륨 고정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 갤럭시에서 난 `n.at is not a function`과 볼륨 키가 벨소리를 움직이는 문제를 고치고 Android `versionCode`를 3 → 4로 올리는 변경(이 보고서와 같은 PR)
- 대상 commit: `main` 위의 `fix/android-build-4`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: `pnpm bundle:android` — 번들에서 `.at(` 호출이 사라졌는지만 확인했습니다.

## 시나리오

- 없음. 바뀐 것은 마지막 문항을 읽는 식 하나와 볼륨 키가 가리키는 스트림이라 잴 시나리오가 없습니다.

## 이 변경이 무엇을 건드렸나

- `WordChoiceScreen.tsx`: `questions.at(-1)` → `questions[questions.length - 1]`. Android의 PrimJS에는 `Array.prototype.at`이 없어 낱말 고르기 화면에서 예외가 났습니다(iOS JSC에는 있음).
- `apps/mobile` · `packages/ui-lynx` · `packages/episode-core`의 `tsconfig.json` `lib`을 `ES2022` → `ES2021`로. ES2022 표준 라이브러리(`Array.prototype.at` · `Object.hasOwn` 등)를 타입 검사에서 막습니다. `any`로 흐르는 값은 잡지 못합니다.
- 테스트 세 곳의 `Object.hasOwn`을 `in`으로.
- `MainActivity.onCreate`: `setVolumeControlStream(AudioManager.STREAM_MUSIC)`. 재생 중이 아닐 때도 볼륨 키가 미디어 볼륨을 움직입니다.
- `versionCode` 3 → 4와 이를 고정한 테스트 두 곳 · `apps/android/README.md` 표.

## 분석 결과

| 번들   | 크기                                  |
| ------ | ------------------------------------- |
| `main` | 사실상 변경 없음 — 식 하나만 바뀜     |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 바뀐 식은 같은 값을 읽고, 볼륨 스트림 지정은 그리기와 무관하므로 성능이 달라질 이유가 없지만 재지 않았습니다.

## 결론과 후속

- 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 없음.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
