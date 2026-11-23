# extractStr 끔 — 01

## 실행 조건

- 측정 일시: 2026-11-20T21:05:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 번들 크기와 중간 산출 JS 차이만 쟀다
- 기능 PR: 브랜치 `fix/extract-str-flag`
- 대상 commit: `origin/main` `7195e723` 위의 변경
- 기기: 측정 기기 없음 — 빌드만(기기 확인은 오류 로그 · 화면 문구만, `docs/e2e/extract-str-flag.md`)
- OS: 해당 없음(빌드는 macOS)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(.env.local 없음 — CI와 같은 설정), JS 비교는 `DEBUG=rspeedy` 중간 산출
- 실행 회차: 01

## 시나리오

- 같은 소스를 세 설정으로 빌드: (가) `origin/main`(`extractStr: true`), (나) `extractStr` 끔만, (다) 끔 + `react:json-parse` 규칙을 두 스레드에(이 변경).
- 하지 않은 것: 첫 실행 시간 · 프레임 · 메모리 계측.

## 이 변경이 무엇을 건드렸나

- 빌드 설정만. main-thread `processData`에서 `_EXTRACT_STR` 분기가 빠진다(실행마다 나던 ReferenceError 2번이 없어짐).

## 분석 결과

| 대상 | (가) origin/main | (나) 끔만 | (다) 이 변경 |
|---|--:|--:|--:|
| `main.lynx.bundle` | 5,835,191 B | 5,938,132 B(+102,941, 천장 5,850,000 B 초과) | 5,835,126 B(−65) |
| `static/image` | 3,100.2 kB | 같음 | 같음 |
| `packages/ui-lynx/dist` | 570.0 kB | 같음 | 같음 |

중간 산출 JS 비교((가) ↔ (다)): `background.js`는 파일 해시 · 디버그 메타데이터 해시만 다르다. `main-thread.js`는 `processData` 안
`c=__EXTRACT_STR_IDENT_FLAG__,i={...u,_EXTRACT_STR:c}` → `i=u` 하나만 다르다(−51 B). 문자열 리터럴 · 문구는 바이트 단위로 같다.

## 해석

- `extractStr`가 줄이던 약 103 kB는 문자열 공유가 아니라 `.json`을 객체 리터럴로 내는 규칙(`JSONParse: false`)이 background에도 걸린 몫이었다.
  같은 규칙만 남기면 크기는 그대로이고 오류는 없어진다.
- 측정 한계: 런타임 값은 재지 않았다. JSON 생성 방식은 PR #526 이후 출시 후보 번들과 같아 런타임 차이는 `processData` 예외 처리 비용(실행마다 2번)이 빠지는 것뿐이다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다.
- 후속: `@lynx-js/react-rsbuild-plugin`을 올릴 때 `react:json-parse` 규칙 이름이 그대로인지(XS-I2), 업스트림이 식별자를 정의하는지(XS-U3) 본다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
