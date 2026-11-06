# 보기 로마자 · 설정 토글 — 번들 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 13 mini compact 화면 높이 · 스크롤 판정, 렌더 · 프레임 · 메모리는 재지 않았다(기기 확인은 [보기 로마자 e2e](../../e2e/choice-romanization.md) CR-E6 · CR-E7 몫).
- 기능 PR: 보기 로마자(`feat/choice-romanization`) — 한국어 보기의 한글 위 로마자 줄 · 설정 `Learning` 토글 · 세션 옵션 하나의 기기 저장 · 듣기 답 전 「로마자만」 갈래 제거. 결정은 [ADR-0108](../../adr/0108-choice-romanization.md).
- 대상 commit: `feat/choice-romanization` 결선 commit 05f6e3bc(뒤의 1c71d0ab는 낭독 문자열만 바꿨고 번들은 다시 재지 않았다) — 기준 c3afcf8a(이 브랜치가 갈라진 `origin/main`)
- 기기: 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1 — `apps/ios/Podfile.lock` 고정값
- 빌드: `pnpm build` · `pnpm size:check`(`.env.local` 없는 설정)

## 시나리오

- 결선까지 마친 commit에서 `apps/mobile/dist/main.lynx.bundle`과 `packages/ui-lynx/dist` 전체 크기를 `pnpm size:check`로 쟀다.
- ui-lynx `dist`는 앞 상한 메모의 기준 실측(556,388 bytes)과 비교했다. 앱 번들은 기준 commit을 같은 설정으로 다시 재지 않았다.

## 이 변경이 무엇을 건드렸나

- ui-lynx: `OptionSelector`의 계약 필드 `romanization` · 검증 · 접근성 이름 조립, 항목 글 묶음의 **정적 갈래 셋**(로마자만 · 뜻만 · 둘 다 — ReactLynx에서 조건부 자식이 줄마다 wrapper를 끼우므로 JSX 조건식 대신 갈래로 나눴다), 기울임 CSS 규칙 하나.
- 앱: 새 모듈 둘(`lib/session-options-storage.ts` · `app/use-session-options.ts`), 매핑 둘 · 보기 목록 · 낭독 함수 · 설정 화면 묶음 · 결선, compact CSS 두 규칙, 다섯 언어 문구 키 둘. 듣기 답 전 갈래 코드는 지웠다.
- 새 의존성 · 이미지 · 음원 · 네이티브 변경 없음.

## 분석 결과

| 대상 | 기준 | 이 변경(실측) | 상한 |
| --- | ---: | ---: | ---: |
| `apps/mobile/dist/main.lynx.bundle` | 다시 재지 않음 | 3,911.0 kB | 4,060 kB — 그대로 |
| `packages/ui-lynx/dist` | 556,388 bytes(앞 상한 메모의 기준) | 557,772 bytes(+1,384) | 556,000 → **559,000 bytes**(여유 1,228) |

- ui-lynx는 앞 상한 556,000을 1,772 bytes 넘어 상한을 559,000으로 올렸다 — 실제 기능 성장이라 사전 승인 규칙(측정값으로 올리고 보고)을 따랐다. 근거 메모는 `devtools/bundle-size/budget.json`에 있다.
- 앱 번들은 ui 구현 단계 실측 3,910.0 kB → 결선 뒤 3,911.0 kB였고 상한 안이다.

## 해석

- ui-lynx +1,384 bytes는 계약 · 검증 · 갈래 JSX · CSS · 타입 선언 · 소스맵의 합이다. 갈래 셋이 몫의 대부분이라고 보지만 파일별로 나누어 재지 않았다 — 추정이다.
- 앱 번들의 이 변경 몫은 기준 commit을 같은 설정으로 다시 재지 않아 말할 수 없다. 상한 대비 약 149 kB가 남는다.
- 측정 한계: 번들 크기만 잰 단일 회차이고 렌더 · 프레임 · 메모리 · 화면 높이는 미측정이다. 결정 2(「스크롤은 최대한 없어야」)가 13 mini compact에서 지켜지는지 — design 추정 +68pt → compact 축소 뒤 약 +48pt, 한계 682pt 대비 약 22pt 여유 — 는 이 자료로 판정할 수 없다.

## 결론과 후속

- ui-lynx `dist` 상한 556,000 → 559,000(evidence · ADR-0108 「대가」 1). 앱 번들 상한은 그대로다.
- 13 mini 시뮬레이터 compact u03 `S1-14` · `S2-04` 켬/끔 · 답 전/뒤 보기 아래 끝 y와 스크롤 유무, iPhone 15 계열 regular 1회를 재어 이 보고서의 다음 회차(02)로 남긴다(e2e CR-E6 · CR-E7).
- ui-lynx 여유가 1,228 bytes라 CR-A2 · CR-A3(SettingsCell 상태 낱말 · 값 속성) 작업은 상한을 다시 볼 가능성이 크다.
