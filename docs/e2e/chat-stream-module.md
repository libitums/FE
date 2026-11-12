# 수동 e2e — 호스트 SSE 모듈 `ChatStreamModule` (ADR-0124)

이 모듈을 부르는 화면은 아직 없다. 임시 진입점(확인 화면)으로 앱 결선 `chatStreamClient()`를 직접 부르고, 로컬 SSE 서버로 다섯 경우를 본다. **확인이 끝나면 확인 화면 · 확인 번들을 지운다**(`git diff -- apps/mobile/src/app` = 0, `dist`는 다시 빌드).

## 준비

1. 로컬 SSE 서버(포트 8787, `0.0.0.0`) — 경로 다섯:
   - `/sse`: `event: delta` 블록 셋(「안녕하세요」 · 「저는 미나예요」 · 「오늘 뭐 했어요?」)을 0.7초 간격으로, **각 블록을 한글 첫 글자 바이트 가운데에서 두 번에 나눠** 보낸다. 뒤에 `: ping`, 마지막 `event: done`.
   - `/err`: 401, 본문 `{"error":"invalid_session","retryable":false}`.
   - `/idle`: 머리와 `: ping` 하나 뒤 아무것도 보내지 않는다.
   - `/hang`: 연결은 받고 머리를 보내지 않는다.
2. 확인 화면: `src/app/index.tsx`의 `root.render`를 잠시 확인 화면으로 바꾼다. 확인 화면은 A `/sse` · B `/err` · C `/sse`(첫 이벤트에서 `cancel`) · E `/hang` · D `/idle`을 차례로 열고 `open` · `#seq` · `END` 줄을 경과 ms와 함께 그리고 `console.log`로도 남긴다. `.env.local`을 치우고 `npx rspeedy build`.
3. iOS: 이 브랜치의 Host.app(`xcodebuild`)을 설치하고 앱 컨테이너에 확인 번들을 넣어 `--bundle-url=main.lynx`로 띄운다. 서버 주소 `127.0.0.1:8787`.
4. Android: `assembleDebug`(디버그만 평문 http 허용) · 읽기 전용 에뮬레이터(`-read-only -port 5556`). 번들은 `python3 -m http.server 8788`로 내주고 `--es bundle-url http://10.0.2.2:8788/main.lynx.bundle`. SSE는 `adb reverse tcp:8787 tcp:8787` 뒤 `127.0.0.1:8787`.

## 항목

| id | 확인 | 기대 |
|---|---|---|
| CS-E1 | iOS 시뮬레이터에서 A ~ E | A: `open 200` → `#0` · `#1` · `#2`가 **약 0.7초 간격으로 따로** 도착, 한글 온전, ping(`#3`)은 보이지 않음, `#4 done` → `END complete`. B: `open 401` → `END http-error` + 본문. C: `#0` 뒤 `END cancelled` 한 번, 그 뒤 이벤트 없음. D: `open 200` → **약 30초 뒤** `END timeout-idle`. E: `open` 없이 **약 10초 뒤** `END timeout-connect` |
| CS-E2 | Android 에뮬레이터에서 A ~ E | CS-E1과 같다 |
| CS-E3 | 실기기(iOS · Android) LTE에서 실제 `chat-send` | 서버가 들어온 뒤(재검토 조건 2) |

## 실행 기록

### 2026-11-11 — CS-E1 · CS-E2 통과

- **CS-E1** iPhone 17 Pro 시뮬레이터(iOS 26.5), 이 브랜치 Host.app:
  `A open 200 +136 · #0 +225 · #1 +912 · #2 +1613 · #4 done +2514 · END complete +2526` /
  `B open 401 +9 · END http-error {"error":"invalid_session","retryable":false} +9` /
  `C open 200 +5 · #0 +104 · END cancelled +105` /
  `D open 200 +6 · END timeout-idle +30011`. 한글 셋 모두 온전(바이트 가운데에서 나눠 보냄).
- **CS-E2** Pixel_8 에뮬레이터(읽기 전용), `assembleDebug`:
  `A open 200 +60 · #0 +162 · #1 +860 · #2 +1561 · #4 done +2461 · END complete +2461` /
  `B open 401 +29 · END http-error +29` / `C #0 +106 · END cancelled +107` / `D END timeout-idle +30009`.
- 확인 화면 · 확인 번들은 지웠다. 이 회차는 E(`timeout-connect`)를 재지 않았다.

### 2026-11-11 (2회차, 리뷰 반영 뒤) — CS-E1 · CS-E2 통과, E 추가

리뷰 C1: Android가 머리 대기를 OkHttp `readTimeout`(30초)에 맡겨 10초 계약을 어겼다 → 스트림마다 10초 타이머를 두었다. 확인용 `/hang`(E)을 더했다.

- **CS-E1** iOS: `A #0 +142 · #1 +826 · #2 +1527 · END complete +2434` / `B END http-error +6` / `C END cancelled +103` / **`E END timeout-connect +10449`** / `D END timeout-idle +30470`.
- **CS-E2** Android: `A #0 +131 · #1 +832 · #2 +1532 · END complete +2433` / `B END http-error +4` / `C END cancelled +105` / **`E END timeout-connect +10004`** / `D END timeout-idle +30010`.
