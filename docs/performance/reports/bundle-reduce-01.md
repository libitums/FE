# 앱 번들 줄이기 — 01

## 실행 조건

- 측정 일시: 2026-11-26T22:15:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 번들 크기와 층별 구성만 쟀다
- 기능 PR: 앱 번들 줄이기(브랜치 `perf/bundle-reduce` — 메인 스레드는 첫 화면만 그림, ADR-0149 「줄인 기록 1」)
- 대상 commit: `origin/main` `f8b4f242` 위의 변경
- 기기: iPhone 17 Pro 시뮬레이터(iOS 26.5) · Android 에뮬레이터 Pixel 8(`assembleBundled`) — 동작 확인만, 계측 없음
- OS: iOS 26.5 · Android 에뮬레이터(Pixel 8 AVD)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(.env.local 없음 — CI와 같은 설정), 층별 분석은 같은 빌드를 `DEBUG=rspeedy`로 지어 중간 산출물(`dist/.rspeedy/main`)의 소스맵으로 바이트를 모듈에 나눔
- 실행 회차: 01

## 시나리오

- 측정: 변경 전후를 같은 조건으로 두 번 지어 `main.lynx.bundle`을 비교했다. 층별 표는 변경 전 DEBUG 빌드의 소스맵 귀속이다.
- 기기 확인(두 플랫폼, 손님 계정): 앱 시작(스플래시 → 온보딩) → 로그인 화면 → 이름 · 나라 · 언어(Android는 베트남어) → 여정 입구 → 여정 지도 →
  에피소드 표지 → 레슨 1 → 메신저 목록 → 대화방 → 대화 설정 → 설정. 로그에서 `onAppJSError` · `Snapshot not found` · `FATAL EXCEPTION`을 셌다.
- 하지 않은 것: 스토리(친구 · 내 스토리)는 회원 전용이라 손님으로 열지 못했다 — 해당 그리기 틀은 아래 `size:snapshots` 검사가 대신 확인한다.
  프레임 시간 · 메모리 · 첫 실행 시간 계측은 하지 않았다.

## 분석 결과

### 층별 구성(변경 전, 로컬 6,188 kB)

| 층 | 크기 | 비고 |
|---|--:|---|
| background JS | 3,428 kB | 에피소드 JSON 1,440 · 여덟 언어 문구 655 · 화면 575 · app 173 · lib 145 · PostHog 67 · ui-lynx 53 · 아이콘 43 · React 런타임 34 · zod 25 · episode-core 24 |
| main-thread JS | 1,631 kB | 화면 컴포넌트 586 · 그리기 틀(컴파일러 생성) 563 · app 130 · lib 87 · 영어 문구 80 · ui-lynx 59 · React 런타임 45 · 아이콘 43 |
| CSS | 622 kB | 화면 298(메신저 155) · ui-lynx 87 · components 38 · app 29 · 토큰 16 |
| 나머지(템플릿 인코딩) | 약 500 kB | — |

### 큰 덩어리 상위 20(변경 전)

| # | 덩어리 | 층 | 크기 |
|--:|---|---|--:|
| 1 | 내장 에피소드 JSON 11편(`content/episodes`) | background | 1,440 kB |
| 2 | 여덟 언어 화면 문구(`lib/ui-copy-*`, my 122 · th 103 · ja 65 · vi 62 · es 57 · zh-TW 57 · id 54 · en 51 · 공용 73) | background | 655 kB |
| 3 | 화면 컴포넌트 코드(스플래시 밖 포함) | main-thread | 586 kB |
| 4 | 화면 컴포넌트 코드 | background | 575 kB |
| 5 | 그리기 틀 정의(snapshot create · update) | main-thread | 563 kB |
| 6 | CSS 전체 | css | 622 kB |
| 7 | `src/app` 결선 | background · main | 173 · 130 kB |
| 8 | `src/lib` | background · main | 145 · 87 kB |
| 9 | 영어 문구표(ADR-0031 D8) | main-thread | 80 kB |
| 10 | PostHog core(별칭 뒤) | background | 67 kB |
| 11 | ui-lynx JS | 두 스레드 | 59 · 53 kB |
| 12 | `data-testid` 동적 갱신 함수 583개 | main-thread | 46 kB |
| 13 | React 런타임 | 두 스레드 | 45 · 34 kB |
| 14 | `@libitums/icons` SVG 문자열 | 두 스레드 | 43 · 43 kB |
| 15 | zod | background | 25 kB |
| 16 | episode-core | background | 24 kB |
| 17 | 나라 이름표 `login-countries` | 두 스레드 | 15 · 15 kB |
| 18 | 로그인 로고 SVG `login-logos` | 두 스레드 | 15 · 15 kB |
| 19 | 컴패니언 인물표 `companion-friends-roster` | 두 스레드 | 12 · 12 kB |
| 20 | 음성 샘플표 · 언어 깃발 SVG | 두 스레드 | 8 · 6 kB(스레드마다) |

### 레버별 판정

| 레버 | 예상 절감 | 위험 | 일의 양 | 판정 |
|---|--:|---|---|---|
| **메인 스레드는 첫 화면만 그림**(`__BACKGROUND__` 분기 한 줄 + ui-lynx 메인 스레드 부수 효과 규칙) | **−442 kB(실측)** | 낮음 — 그려지는 첫 화면이 같고, 틀 · worklet 등록 검사가 CI에서 돔 | 작음 | **넣음** |
| 메인 스레드에 남은 데이터 표(나라 이름 · 로고 · 인물표 · 음성 · 깃발 · 파서 등) 추가 분기 | 약 −50 ~ −130 kB | 낮음 ~ 중간(결선 · AppSession 곳곳이 값으로 import, 메모 「background-only 결선」) | 중간 | 제안(다음 PR) |
| AppSession의 머리 · 바 · 겹침 층 분기 | 약 −20 ~ −40 kB(추정) | 낮음 ~ 중간 | 작음 | 제안 |
| release에서 `data-testid` 빼기 | 메인 약 −46 kB + 틀 · background 몫 | 중간 — Android 호스트 계측 테스트가 `testid`로 찾음, 대체 필요 | 중간 | 제안(사용자 결정) |
| 에피소드 JSON의 앱이 읽지 않는 필드 빌드 때 빼기 | 약 −12 kB | 중간 — 디코더 변경과 어긋나면 조용히 깨짐 | 중간 | 제안 |
| 내장 에피소드를 줄이거나 원격으로(ADR-0056) | 최대 −1,440 kB | 큼 — 오프라인 첫 실행 · 결정 사항 | 큼 | 제안만(구조 변경, 사용자 결정) |
| 문구를 언어별로 나눠 원격 · 지연 로드 | 최대 약 −570 kB | 큼 — 첫 화면 문구 · ADR-0031 | 큼 | 제안만(브리프상 구현 금지) |
| 화면 lazy 분할 | — | 큼 — #593 시험에서 분할 하나에 +104 ~ 113 kB | 큼 | 하지 않음(같은 실수 반복) |
| `extractStr` | — | 큼 — ADR-0169 D8: 런타임 ReferenceError | — | 하지 않음 |
| 중복 패키지 dedup | 0 | — | — | 해당 없음(두 스레드 중복은 구조, 패키지 중복 없음) |
| mangle · eval 오염 | 0 | — | — | 해당 없음(모듈 접두 이름 남은 흔적 없음) |
| CSS 쓰이지 않는 선택자 정리 | 미측정 | 중간 — 동적 클래스 이름 | 큼 | 제안(따로 조사) |

### 넣은 것의 결과

| 대상 | 변경 전(`f8b4f242`, 로컬) | 변경 뒤(로컬) | 증감 |
|---|--:|--:|--:|
| `main.lynx.bundle` | 6,188,570 B | 5,746,503 B | **−442,067 B** |
| `main-thread.js`(DEBUG 중간 산출물) | 1,631,327 B | 1,222,503 B | −408,824 B |
| `background.js` · `main.css` | 3,428,162 · 622,519 B | 같음 | 0 |
| 그리기 틀 · worklet 등록 | 1,156 · 8 | 1,156 · 8 | 빠진 것 0 |

- CI 값(PR #642, main `f2bffc5e` 대비): 6,179.3 kB → **5,747.5 kB(−431.7 kB)**, 천장까지 432.5 kB. 천장 6,180,000 B는 그대로다.
- 기기: iOS · Android 모두 위 시나리오에서 `onAppJSError` · `Snapshot not found` · `FATAL EXCEPTION` 0건. iOS 로그의 `DestroyLayoutNodeBeforeRemoveFromParent`
  (레이아웃 노드 해제 순서 경고)는 화면 전환마다 나오는 엔진 로그다 — 같은 흐름의 변경 전 대조는 이번에 하지 못했다.

## 해석

- 메인 스레드는 첫 프레임만 그리는데(ADR-0031 D8) 번들에는 모든 화면의 컴포넌트 코드가 실려 있었다. 첫 프레임은 늘 스플래시라 나머지는 실행되지 않는
  코드였다. 분기 한 줄로 이 몫이 빠졌다. 그리기 틀 정의(563 kB)는 background가 보내는 패치를 메인 스레드가 그리는 데 필요해 남는다 — 이것이 남은
  메인 스레드의 대부분이다.
- 과거 시도와의 차이: #609 · #630의 `"background only"`는 함수 · 층 하나씩이라 −2 ~ −3 kB였고, 그리기 틀이 있는 컴포넌트를 막으면 틀이 남아 역효과였다.
  이번은 화면 갈림 한 자리에서 막아 컴포넌트 함수 본문 전체가 빠지고, 틀은 남는 것이 맞다.
- 위험의 자리는 「패키지가 `sideEffects`로 모듈을 통째로 버려 틀 등록까지 사라지는 것」 하나였고, 실제로 ui-lynx 설정 칸(틀 8개)에서 났다 — 설정 화면을
  여는 순간 멈췄을 것이다. 메인 스레드 규칙으로 막고, `pnpm size:snapshots`가 매 PR에서 다시 본다.
- 측정 한계: 첫 실행 시간 · 메모리는 재지 않았다. 메인 스레드 코드가 약 25% 줄어 저사양 기기의 메인 스레드 파싱 시간이 줄 것으로 보지만 수치는 없다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다. 크기는 −442 kB(로컬)로, 천장 아래 여유는 CI 기준 약 0.7 kB에서 432.5 kB가 된다.
- 후속 제안(우선순위): ① 메인 스레드에 남은 데이터 표 · AppSession 겹침 층 분기(약 −70 ~ −170 kB, 낮음 ~ 중간 위험) ② release `data-testid` 정리(사용자 결정)
  ③ 에피소드 JSON 미사용 필드 ④ 내장 에피소드 · 문구 원격화는 구조 결정이라 사용자 결정.
- 다음에 화면을 더할 때: 메인 스레드 번들은 그 화면 코드가 늘지 않는다. 늘어나는 것은 background · CSS · 그리기 틀이다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
