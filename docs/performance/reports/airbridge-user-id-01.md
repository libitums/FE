# Airbridge 사용자 ID 연결 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 저장된 세션의 사용자가 바뀔 때마다 Airbridge `setUserID` · `clearUser`를 부릅니다(ADR-0090, 이 보고서와 같은 PR).
- 대상 commit: `main` 위의 `feat/airbridge-user-id`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` · `pnpm size:check`로 번들 크기만 확인했습니다.

## 시나리오

- 없음. 화면 · 상호작용은 바뀌지 않습니다. 렌더 뒤 effect에서 토큰을 한 번 해석하고, 사용자가 바뀔 때만 호스트를 한 번 부릅니다.

## 이 변경이 무엇을 건드렸나

- `apps/mobile/src/lib/airbridge-user.ts`(신규) · `app/use-tester-access.ts`의 effect 한 줄 · 계약 타입.
- 호스트: iOS `AirbridgeEvents(Module).swift` · Android `AirbridgeEvents(Module).java`에 메서드 둘. 콘텐츠는 바뀌지 않았습니다.

## 분석 결과

| 번들   | 크기                             |
| ------ | -------------------------------- |
| `main` | 3,226,924 B — 예산 3,480.0 kB 안 |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: effect에서 JWT payload를 한 번 더 해석하는 비용이 늘지만, 기기에서 재지 않았으므로 판정하지 않습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 출시 뒤 Airbridge Real-time Logs에서 User ID가 실리는지 봅니다(e2e 시나리오 F).

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
