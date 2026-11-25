# 수동 e2e — 끝낸 레슨 단어 채움 (ADR-0169 끝낸 레슨 단어 채움 개정)

**상태: 실행(2026-11-25) — iOS · Android 모두 통과.** 전제는 다음과 같다.

- 「끝낸 레슨이 있는데 단어장이 빈」 설치를 만든다 — 단어장 기능 전에 레슨을 끝낸 사람 · 재설치한 회원과 같은 상태다.
  - 고치기 전 번들: origin/main 결선(이 브랜치의 `AppSession` · `learning-trail-port`를 main 것으로 되돌림). 비회원 미전송 진행 `libitum.progress.pending.guest`에
    u00 전부 · u01-water `intro · S1 · S2`를 심고 `libitum.wordbook.guest`를 지운다 — iOS는 탐침(커밋하지 않음, 비회원 진입 다음 실행에 `guest-progress-store`가 읽기 전에 한 번 심음),
    Android는 이 확인 동안만 `bundled`에 `debuggable true`를 넣어 `run-as`로 `duru-storage.xml`에 직접 심었다(debuggable이면 개발 서버 주소를 읽으므로 `--es bundle-url`로
    `adb reverse`한 로컬 주소의 번들을 띄움).
  - 고친 번들: 이 브랜치 그대로(탐침 없음). 탐침 번들 위에 덮어 깔아 저장소를 이어받는다.
- iOS: 이 확인 전용 시뮬레이터(iPhone 17 Pro · iOS 26.5) · Debug 호스트에 `--bundle-url=main.lynx`(내장 번들). 번들을 바꿀 때는 설치된 앱 안의 `main.lynx.bundle`만 바꾸고 다시 띄운다.
- Android: Pixel_8 AVD `-read-only -no-audio`(다른 세션과 겹치지 않는 포트) · `assembleBundled`.
- 비회원(「Continue without an account」)으로 시작. 앱 설정에서 소리를 끈다. 끝나면 시뮬레이터 · 에뮬레이터를 끈다.
- 기대 단어 수는 그 기기의 카탈로그(내려받은 콘텐츠)를 따른다 — 이번 실행은 Ep 0 둘 + Ep 1 여섯 = 8(내장 카탈로그만이면 7). 카탈로그에 단어가 없는 ref는 줄에서 빠진다(D4).

| id | 확인 | 기대 | 결과 |
|---|---|---|---|
| WBF-E1 | 고치기 전 번들 · 진행을 심은 뒤 → 지도 | u00 레슨이 끝남(체크)으로 섬 · 트로피 1 | 통과(iOS · Android) |
| WBF-E2 | 고치기 전 번들 · 더보기 › My words (red) | 메뉴 줄 「0 words · 0 to review」 · 「No words yet」 — 보고와 같은 증상 | 재현(iOS · Android) |
| WBF-E3 | 고친 번들로 바꿔 켬 → 더보기 › My words | 메뉴 줄 「8 words · 0 to review」 · 줄 8개 모두 New(안녕하세요 · 감사합니다 · 물 · 봉투 · 카드 · 현금 · 영수증 · 주스) | 통과(iOS · Android) |
| WBF-E4 | 채운 단어(물)에 별 → 앱을 다시 켬 | 별이 남음(채움이 기존 줄을 덮지 않음) · 단어 수 8 그대로(두 번 더하지 않음) | 통과(iOS · Android) |

실행 로그에 JS 오류(`ReferenceError` · `TypeError`)는 없었다(Android `onErrorOccurred`는 번들 주소를 찾던 앞 시도의 내려받기 실패뿐).
