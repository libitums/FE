# 새 에피소드 형식 ③(따라 읽기 · 그림 보고 말하기와 권한 흐름) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 새 두 활동의 첫 렌더 타이밍 표식(`libitum:navigation:learning-read-aloud` · `…-speak-word`)은 재지 않았습니다.
- 기능 PR: 새 에피소드 형식 지원 ③ — 말하기 두 학습형(`read-aloud` · `speak-word`), 공유 인식 결선 훅 · 마이크 부품, 그림 로드 순수 규칙 승격, 통과 분모 · 이벤트 속성 `skippedCount`(이 보고서와 같은 PR, [ADR-0064](../../adr/0064-episode-format-speaking.md))
- 대상 commit: `c3b03d000587978521f9db0be5a48cb182b4ae0a`(`feat/episode-format-speaking`의 `c3b03d00` — 구현 · 테스트 · 접근성 수정까지 든 마지막 commit). 문서 단계가 이 commit의 패치 없는 깨끗한 작업 트리에서 다시 빌드해 잰 값입니다. 기준은 직전 실측(`budget.json` note — 새 에피소드 형식 ②의 운영 설정 2,092,803 bytes)입니다.
- 기기: iPhone 17 Pro 시뮬레이터 — 화면 확인(e2e)은 `02161638` 운영 설정 번들로 한 회차 돌았고([말하기 화면 e2e](../../e2e/episode-format-speaking.md)), 성능 캡처는 하지 않았습니다.
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle` · `packages/ui-lynx/dist`(Node 22.23.2), 판정은 `pnpm size:check`. 같은 commit에서 두 번 — **CI 설정**(`apps/mobile/.env.local` 없음)과 **운영 설정**(`.env.local` 있음).
- 측정 일시: 2026-10-16(문서 단계)

## 시나리오

- 번들 크기: 직전 실측(2,092,803 bytes)과 이 commit의 `main.lynx.bundle`을 두 설정으로 비교했습니다.
- ui-lynx 산출물 · 이미지 폴더: `pnpm size:check`의 kB 값으로 상한과 비교했습니다.
- 스레드 중복: 내장 JSON의 고유 문자열 하나(u01 문화 카드 제목 로마자 `kadeuro gyesanhagi`)와 새 문구 하나(`You said all `)가 운영 설정 번들에 몇 번 나오는지 셌습니다.

## 이 변경이 무엇을 건드렸나

- 메인 · 백그라운드 두 스레드에 실리는 것: 새 활동 둘(`ReadAloudActivity` · `SpeakWordActivity`)과 부품(`ReadAloudSentence` · `SpeakWordPicture` · `SpeechWaves`), 순수 모듈(따라 읽기 · 그림 보고 말하기 리듀서 · 조작 표 · 걸음 · 낭독 문자열,
  인식 결말 분류 `speech-attempt`, 보이는 조각 `speakingChunks`, 그림 로드 전이 `picture-load`)과 CSS 셋, 결선 훅 둘(`use-speech-attempt` · `use-speak-word-picture`), 매핑 `catalog-speech-map`, 계획 · 결선(통과 분모 · 이벤트 `skippedCount`) · 렌더 갈래, 문구 둘(`readAloud` · `speakWord`).
- 내장 데이터 · 의존성 · 이미지 · 음원의 변화는 없습니다(`package.json` · 잠금 파일 · `apps/mobile/content/` 변화 0). 네이티브 · 인식 접점(`lib/speech-recognition*`) 변화도 0입니다.

## 분석 결과

| 번들                                         | 크기                            |
| -------------------------------------------- | ------------------------------- |
| 직전(`budget.json` note의 직전 실측)         | 2,092,803 bytes                 |
| 이 commit — CI 설정(`.env.local` 없음)       | 2,133,402 bytes                 |
| 이 commit — 운영 설정(`.env.local` 있음)     | 2,133,591 bytes                 |
| 직전 대비 차(운영 설정)                      | +40,788 bytes (+1.95 %)         |
| 계약 예측                                    | 약 +34,000 ~ 46,000 bytes       |
| 옛 상한 → 새 상한(`budget.json`)             | 2,094,000 → 2,135,000 bytes     |
| 상한 대비(운영 설정)                         | 1,409 bytes 여유                |

| 그 밖의 산출물 | 크기                                     |
| -------------- | ---------------------------------------- |
| ui-lynx dist   | 510.1 kB(상한 513.0 kB 안, 변화 없음)    |
| 이미지 폴더    | 8,688.2 kB(상한 11,520.0 kB 안, 변화 없음) |

- **증가분은 전부 코드입니다** — 위 「두 스레드에 실리는 것」의 몫이고, 항목별로 쪼개 재지 않았습니다.
- **계약 예측 범위 안입니다**(운영 설정 기준, 예측 중앙 약 +40 kB). 계약이 정한 「+8 kB 이상 벗어나면 올리기 전에 원인을 본다」에 걸리지 않아 사전 승인 규칙(두 설정 중 큰 값을 kB로 올림 + 빌드 변동 여유 1 kB)대로 상한을 올렸습니다. 근거는 `budget.json` note가 집니다.
- 운영 설정이 CI 설정보다 189 bytes 큽니다 — 앞선 기록의 「약 +189」와 같습니다.
- 스레드 중복: 내장 JSON의 고유 문자열(`kadeuro gyesanhagi`)이 **1번** 나옵니다 — 내장 JSON이 메인 스레드로 새지 않았습니다. 새 문구 `You said all `은 2번(두 스레드) 나옵니다 — 문구표의 기존 모양과 같습니다.

## 해석

- 화면 둘 · 부품 셋 · 결선 훅 둘 · 매핑 하나가 든 변경으로 +41 kB는 새 에피소드 형식 ②(화면 둘, +45 kB) · 3d-1(화면 셋, +58.7 kB)과 같은 크기 단위입니다. 화면 모듈이 메인 스레드에 이중으로 실린 흔적(내장 JSON 중복)은 없었습니다.
- 런타임: 새 활동은 레슨 안에서만 서고 맵 · 부팅 경로에 새 계산이 없습니다 — 계획이 단계마다 두 유형을 더 매핑할 뿐입니다 [추론]. 그림 보고 말하기의 그림은 단어 선택 그림 문항과 같은 버킷 경로 · 6초 시한입니다. 재지 않았습니다.
- 측정 한계: 런타임은 미측정이라 새 두 활동의 첫 렌더 · 인식 시작까지의 지연 · 메모리에 대해서는 아직 판정할 수 없습니다. 번들 수치도 설정별 단일 빌드입니다.

## 결론과 후속

- 결론: 이 commit의 `main.lynx.bundle`은 CI 설정 2,133,402 · 운영 설정 2,133,591 bytes이고, 직전 대비 +40,788 bytes는 전부 새 화면 · 결선 · 매핑 코드입니다. 상한은 2,135,000 bytes입니다.
- 후속: 따라 읽기 · 그림 보고 말하기의 첫 렌더 타이밍과 `Speak` → 듣는 중까지의 지연, 메모리는 재지 않았습니다. 병합 직전에 main이 앞서 있으면 그 위에서 번들을 다시 잽니다.

## 제한 사항

- 번들 빌드 표본은 설정별 1회입니다. 항목별 바이트 분해(화면 · 결선 · 매핑 · CSS)는 하지 않았습니다.
- 직전 값 2,092,803은 `budget.json` note에서 옮긴 값이고 이 단계에서 직전 commit을 다시 빌드하지 않았습니다.
- 런타임 · 메모리는 미측정입니다.
