# 생년 기기 · 서버 저장 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 생년 시트 값이 기기 · 서버 프로필에 저장되지 않던 버그(ADR-0125 「서버 결선」 적용 기록 2026-11-17).
- 대상 commit: `main` 위의 `fix/birth-year-server-save`
- 기기: 실행하지 않음
- OS: 실행하지 않음
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 번들 빌드만(`main.lynx.bundle` 4980.0 kB, 천장 5327.0 kB 안)

## 시나리오

- 없음. 화면 · 렌더 경로를 바꾸지 않고, 출처를 만들 때 RPC 한 번(`companion_load_profile`)과 생년을 고를 때 RPC 한 번(`companion_save_profile`)을 더합니다.

## 이 변경이 무엇을 건드렸나

- `apps/mobile/src/screens/messenger-chat/chat-fixture-birth-year.ts` — 생년 상태(기기 저장 · 서버 읽기 · 저장).
- `apps/mobile/src/lib/companion-api.ts` · `companion-media-api.ts` — 프로필 읽기 · 저장, 턴 · 사진 요청이 진행 중인 생년 저장을 기다림.
- `apps/mobile/src/screens/messenger-chat/chat-local-stores.ts` — 기기 저장 키 `libitum.messenger.birth-year`.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 백그라운드 스레드의 네트워크 호출 두 개와 기기 저장소 읽기 · 쓰기 한 번씩이 늘 뿐 렌더 경로는 그대로지만, 재지 않았으므로 판정하지 않습니다.
- 생년을 고른 직후 보낸 첫 턴은 저장 응답(한 번의 RPC 왕복)만큼 늦게 열립니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 시험 계정 실기기에서 생년을 고른 직후 첫 턴의 지연을 눈으로 확인합니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
