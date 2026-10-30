# 앱 버전 표시 · 강제 업데이트 정책 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 설정 끝 버전 줄 · 정책 파일 받기 · 스플래시 판정 · 강제 업데이트 화면 · 호스트 `AppUpdateModule`(이 보고서와 같은 PR, ADR-0086)
- 대상 commit: `main` 위의 `app-version-and-forced-update`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: 하지 않음 — 측정용 번들을 따로 짓지 않았습니다.

## 시나리오

- 앱 시작: 매니페스트 앞에 작은 JSON(`app-policy.json`) 요청 하나가 늘었습니다(직렬 — 에피소드 받기가 그만큼 늦게 시작).
- 스플래시가 나가는 순간: 저장소 읽기 한 번 + 순수 판정.
- 설정 화면: 텍스트 요소 하나.

## 이 변경이 무엇을 건드렸나

- 새 모듈 `lib/app-version.ts` · `app-policy.ts` · `app-policy-refresh.ts` · `app-update.ts`, 새 화면 `screens/update-required/`, 결선 `entry-wiring.ts` · `use-episode-content-refresh.ts`.
- 호스트: globalProps `appVersion` 한 번, 모듈 `AppUpdateModule` 등록(iOS · Android).

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| `main.lynx.bundle` | `pnpm size:check` 결과를 PR 검증 로그가 든다(여기 재지 않음) |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 시작 경로에 요청 하나가 직렬로 더해졌고(정책 JSON ~100 B), 응답이 늦으면 에피소드 받기 시작이 그만큼 늦습니다 — 스플래시 체류(로고 2.4초 + 최대 3초)에는 영향이 없을 것으로 보지만 근거가 아닙니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 다음 기기 측정 때 앱 시작부터 첫 매니페스트 요청까지의 시간을 이전 보고서와 견줍니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
