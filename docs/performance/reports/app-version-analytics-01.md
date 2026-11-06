# 분석 이벤트의 앱 버전 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 모든 PostHog 이벤트에 호스트 globalProps `appVersion`에서 읽은 `platform` · `appVersion` · `appBuild`를 싣고, `identify`가 같은 셋을 사람 속성 `$set`으로 보낸다(ADR-0110). 네이티브 · 화면 변경 0.
- 대상 commit: `main`(`c3afcf8a`) 위의 작업 브랜치 `feat/app-version-analytics`
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,903.3 kB(상한 4,060.0 kB 통과, 같은 날 같은 워크트리의 직전 측정 3,903.0 kB → +0.3 kB). `static/image` 4,304.6 kB(상한 11,520.0 kB), ui-lynx dist 555.6 kB(상한 556.0 kB).
- 런타임: 미측정. 화면 · 렌더 경로는 바뀌지 않았고(바뀐 `.tsx` 0), PostHog 이벤트 하나마다 background 스레드의 동기 객체 읽기(`lynx.__globalProps`)가 하나, 식별 한 번마다 `$set` 객체 하나가 는다. 네이티브 호출은 늘지 않는다.

## 이 변경이 무엇을 건드렸나

- `lib/app-version-properties.ts`(새, 순수) — `appVersionFrom`으로 좁힌 버전을 문자열 셋으로 바꾸는 변환과 `lynx.__globalProps` 조회. 던지지 않고 모르면 셋 모두 `unknown`. 상태 · 캐시를 쌓지 않는다.
- `lib/posthog-client.ts` `createAnalyticsSession` — sink가 쓰는 클라이언트가 capture 직전에 `readAppVersionProperties()`를 `readNetworkProperties()` 앞에 펼친다(이벤트 필드가 뒤 — 이벤트 필드가 이김). `identify`는 같은 셋을 `$set`으로 함께 보낸다. `reset`은 그대로.
- 화면 코드 · 네이티브 · 계약 타입 · 이벤트 이름 · 권한 · 매니페스트는 바뀌지 않았다.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 이벤트는 사용자당 하루 수십 건이고 추가 작업은 `typeof` 검사 · 속성 읽기 몇 번 · 객체 할당 하나(수백 ns 수준으로 봄)라 JSON 직렬화 · 전송보다 자릿수 여럿 작다고 보지만, 재지 않아 수치로 말할 수 없습니다.
- 본문에 이벤트당 약 60 B(`"platform":"android","appVersion":"1.2.0","appBuild":"12"`)가 더 실립니다 — 전송량 영향은 측정하지 않았고 데이터 요금 관점의 판정은 이 기록이 하지 않습니다.
- 단일 빌드의 번들 수치이고, 저가 기기의 JIT 없는 엔진에서 캐시 없는 반복 읽기가 어떤 비용인지는 이 기록으로 일반화할 수 없습니다.

## 결론과 후속

- 미측정입니다.
- 후속: 배포 1 ~ 2주 뒤 PostHog에서 `appVersion` 분포를 보고, `unknown` 비율이 옛 Explorer · 테스트 환경 비율보다 크면 호스트 globalProps 읽기를 다시 본다. 런타임 비용은 ADR-0105의 기기 측정 통로에서 이벤트 송출이 기준 밖으로 잡힐 때만 잰다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
