# PostHog 분석 전송 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 기존 이벤트 sink 여섯을 PostHog(`@posthog/core` 1.55.2, background 스레드 전용)로
  잇는 변경(이 보고서와 같은 PR)
- 대상 commit: main `8470d5c` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터 — 화면과 전송만 확인했습니다(Debug 호스트 앱 내장 번들).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`입니다. Release Host는 빌드하지 않았습니다.

## 시나리오

- 번들 크기: main(`8470d5c`)과 이 작업 트리를 각각 `pnpm build`로 빌드해
  `apps/mobile/dist/main.lynx.bundle` 크기를 비교했습니다.
- 화면 확인: 키 없는 빌드와 합성 키(`phc_…`, 전송 대상을 로컬 수집 서버로 바꾼 임시 빌드)
  빌드에서 여정 맵 → 설정 탭 → 자동 재생 토글을 눈으로 확인했습니다. 수치를 남기지 않았습니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 셋(`lib/analytics-config.ts` · `lib/analytics-events.ts` · `lib/posthog-client.ts`)과
  서드파티 의존 `@posthog/core`.
- 제품 진입점(`app/index.tsx`)의 sink 여섯 — 메인 스레드는 여전히 `null`이고 background만
  PostHog sink를 받습니다.
- 이벤트마다 background 스레드에서 요청 한 건(`flushAt: 1`).

## 분석 결과

| 번들                  | 크기            |
| --------------------- | --------------- |
| main (`8470d5c`)      | 1,128,358 bytes |
| 이 작업 트리          | 1,198,319 bytes |
| 차                    | +69,961 bytes   |

모바일 번들 상한을 1,171,000에서 1,259,000 bytes로 올렸습니다(`devtools/bundle-size/budget.json`).
렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 이벤트마다 background 스레드에서 JSON 직렬화와 요청 한 건이 생깁니다.
  sink는 이벤트 핸들러에서만 불리고 메인 스레드 번들에는 SDK가 없어 첫 화면 렌더에는 영향이
  없을 것으로 보지만, 근거는 코드 구조뿐입니다.
- 번들 증가의 대부분은 `@posthog/core`의 `PostHogCore`입니다. 패키지 index 대신
  `dist/posthog-core.mjs`로 별칭해 쓰지 않는 모듈(약 167 kB)을 뺐습니다.

## 결론과 후속

- 번들 +69,961 bytes, 새 상한 안. 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 실기(Release Host)에서 이벤트가 몰리는 흐름(스페셜 유닛 열기 · 완료)의 background
  스레드 부하를 잽니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 프로젝트 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
