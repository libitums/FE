# 온보딩 밀기 · 자동 넘김 · Get started · 도윤 첫 스텝 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 온보딩 스텝을 밀기 · 4초 자동 넘김으로 넘기고, 모든 스텝의 버튼을 「Get started」(곧바로 로그인)로 바꾸며, 첫 스텝 그림을 도윤 · 편의점 앞 골목으로 바꿉니다(ADR-0159).
- 대상 commit: `main` 위의 `feat/onboarding-doyun-autoplay`
- 기기: Android 에뮬레이터(Pixel 8)에서 실행 확인만 했습니다(측정 없음).
- OS: Android(측정 없음)
- Lynx SDK: 4.0.1
- 빌드: `assembleBundled` 실행 확인만 — 측정용 캡처는 하지 않았습니다.

## 시나리오

- 없음(미측정). 스텝마다 타이머 하나(4초)와 배경 스레드 터치 핸들러 둘이 더해집니다. 새 애니메이션 · 새 렌더 경로는 없습니다.

## 이 변경이 무엇을 건드렸나

- `screens/onboarding/`(화면 · 순수 로직 · 첫 스텝 카드 · CSS), `lib/entry-flow.ts`(이벤트 타입), `app/entry-wiring.ts` · `render-entry-screen.tsx`(이벤트 sink), 문구표 다섯 언어.
- 그림: `assets/story/story-background.png`(924 kB) · `story-character.png`(424 kB)를 지우고 `assets/onboarding/convenience-store-alley.webp`(69 kB) · `doyun.webp`(47 kB, 알파)를 넣었습니다.

## 분석 결과

| 번들 | main | 이 브랜치 | 증감 |
| --- | --- | --- | --- |
| `main.lynx.bundle` | 5,048,546 B | 5,049,987 B | +1.4 kB |
| `static/image`(du) | 4,292 kB | 3,088 kB | −1,204 kB |

- 천장(ADR-0149) 통과: `main.lynx.bundle` 5050.0 kB / 5327.0 kB, `static/image` 3100.2 kB / 4766.0 kB. 천장은 올리지 않았습니다.

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 번들 크기만 비교했고 렌더링 · 메모리는 재지 않았으므로 판정하지 않습니다. 첫 스텝 그림 바이트는 줄었습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 출시 뒤 `entry_screen_viewed(onboarding)` → `(login)` 전환율과 `onboarding_started.step` 분포를 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
