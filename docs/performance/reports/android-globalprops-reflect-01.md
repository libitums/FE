# Android globalProps 읽기에서 Reflect.get 빼기 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: `appVersionFrom` · `viewport-metrics`가 globalProps를 `Reflect.get` 대신 속성으로 읽습니다. Android 메인 스레드 첫 렌더가 `not an object`로 버려지던 것을 고칩니다(Sentry DURU-ANDROID-A · 9, 이 보고서와 같은 PR).
- 대상 commit: `main` 위의 `fix/android-globalprops-reflect`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: `pnpm build`로 번들 크기만 확인했습니다.

## 시나리오

- 없음. 화면 · 상호작용은 바뀌지 않습니다. Android 냉시작의 메인 스레드 첫 렌더가 더는 실패하지 않는 것이 기대 효과지만 재지 않았습니다.

## 이 변경이 무엇을 건드렸나

- `apps/mobile/src/lib/app-version.ts` · `viewport-metrics.ts`의 globalProps 읽기 한 줄씩과 단위 테스트(AV5 · V4).
- 네이티브 코드 · 콘텐츠는 바뀌지 않았습니다.

## 분석 결과

| 번들   | 크기                                          |
| ------ | --------------------------------------------- |
| `main` | 3,226,682 B — 변경 전과 거의 같음           |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: Android에서 첫 렌더를 버리고 백그라운드가 다시 그리던 일이 없어져 첫 화면이 빨라질 수 있지만, 기기에서 재지 않았으므로 판정하지 않습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 다음 Android 빌드에서 Sentry DURU-ANDROID-A가 새 release로 다시 나오지 않는지 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
