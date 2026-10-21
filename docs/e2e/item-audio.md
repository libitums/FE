# 학습 문항 음성 · 「천천히」(0.85) 재생

카탈로그 레슨의 학습 문항이 **문항 음성을 실제로 들려주는지**, 듣기 문항의 `Slow`가 **길이만 늘리고 음높이를 지키는지**, 레슨 안에서 유지되고 나가면 꺼지는지, 소리와 스크린리더 낭독이 어떻게 겹치는지를 기기에서 확인하는 **수동 절차**다.
결정은 [ADR-0080](../adr/0080-item-audio-and-slow-playback.md), 컷 · 최종 테스트의 음성은 [에피소드 음성 e2e](episode-audio.md), Android 호스트 계측은 [Android 오디오 재생 검증](android-audio-playback.md)이 진다.

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 속도 어휘(`lib/listen-pace.ts` — 0.85 한 자리 · 토글 · 이름), 재생 접점(1.0 = `play` 인자 둘 · 0.85 = `playAtRate` · 옛 호스트 = `play` · 세대 · 한 번 규칙), 12유형 문항 → 음성 매핑 · 자리표시자 · `LISTEN_BUILD` 조립, 레슨 수명 · 리셋, 이벤트 `episode_listen_item_answered` |
| ui | `Slow` 토글(이름 `Slow, on/off` · 숨김 규칙 · 동작 줄이기), 듣기 3열 · 간이 줄(재생 중 `Stop`), 듣기 훅(문항 키 자동 재생 · 다시 듣기 · 켤 때 0.85로 처음부터 · 끌 때 무동작 · 빠른 연타), 일곱 화면의 재생 시점, 듣기 대본 판정 뒤 공개 · 판정 때 대본 낭독 |
| integration | 앱을 띄워 내장 u01 · u00 레슨에서 재생 모듈 대역에 `playAtRate(…, 0.85, …)`가 닿는 것, 다음 활동까지 유지 · 나가면 1.0, 소리 없는 문항 건너뜀, 컷 · 최종은 `playAtRate` 0회 |
| 호스트 | iOS HostTests `AudioPlaybackModuleTests` AI6 ~ AI10(정규화 · 소스 무관 적용 · 메서드 다섯 · 0.85가 더 길고 `done` 한 번 · 0.85 중 `stop` · 닿지 않는 원격), Android JVM `AudioPlaybackRateTest` · 계측 AP-S1 ~ AP-S6 |

**이 문서만 보는 것**: 실제로 **들리는** 길이 비 · 음높이, 원격 · 받아 둔 파일 · 일시정지 재개에서 속도가 유지되는지, 레슨을 오가는 동안의 상태, 다른 앱 음악 덕킹, VoiceOver · TalkBack이 무엇을 읽고 소리와 어떻게 겹치는지.
Maestro 흐름은 두지 않는다 — 소리 · 음높이를 판정할 수 없다.

## 전제

- [공통 전제](README.md#공통-전제) — 자체 호스트 앱, 로그인된 상태.
- iOS: iPhone 17 Pro 시뮬레이터(실기라면 무음 스위치와 무관하게 들려야 한다 — ADR-0017 D3 ⟨2026-10-18⟩). `pnpm bundle:host` 뒤 Debug 호스트 + `--bundle-url=main.lynx`(다른 작업 트리의 3000 포트를 피한다) 또는 Release([README 「자동화」](README.md#ios)). **빌드 commit · 설정을 회차에 적는다.**
- Android: API 35 이상 에뮬레이터(`ANDROID_HOME` · 전용 에뮬레이터), 이 브랜치의 Debug APK.
- `apps/mobile/.env.local`에 Supabase 값이 있어야 음성 주소가 만들어진다(없으면 소리 있는 문항이 소리 없는 문항과 같은 길로 간다). 새 작업 트리에는 이 파일이 없다 — 메인 체크아웃에서 복사한다. 값은 기록에 적지 않는다.
- 콘텐츠: 내장 u01 · u00. 음성은 첫 온라인 실행에서 받는다(받아 둔 파일 — `<data>/Library/Application Support/content-files/audio/…`).
- 녹화: iOS `xcrun simctl io booted recordVideo <파일>.mov`, Android `adb shell screenrecord`. 길이 비는 녹화 파형 · 타임스탬프로 잰다(같은 음성 id를 1.0 · 0.85로 한 번씩).

### 호스트 로그를 어디서 보나

- **Android**: `adb logcat -s AudioPlayback` — 재생 실패는 `W`로 남는다(`Rejected audio source …` · `Audio playback error …` · `Cannot open audio source` · **`Cannot set playback speed`**). 마지막 줄이 보이면 0.85 요청이 1.0으로 났다는 뜻이다(ADR-0080 D3).
  원격이 닿지 않으면 MediaPlayer가 연결을 약 30초 다시 시도한 뒤 `done`이 온다 — 그동안 화면은 멈추지 않는다.
- **iOS**: `xcrun simctl spawn booted log stream --predicate 'process == "Host"'`(실기는 Console.app에서 기기 · 프로세스 `Host`). 재생 모듈은 오디오 세션 실패만 `NSLog`로 남긴다(`Playback audio session … failed`) — 속도 설정 실패 로그는 없다.
- 요청이 나갔는지(원격)는 Supabase 대시보드 로그(`edge_logs`)의 `content/audio/` 경로로 본다([에피소드 음성 e2e](episode-audio.md) 「전제」). **요청이 나간 것은 들린 것이 아니다.**

## 관찰 항목 — 청음 · 상태 (EU1 ~ EU7)

통과·실패는 `통과` / `실패: <관찰>` / `판정 불가: <이유>` / `미확인`으로만 적는다.

| id | 조건 · 단계 | 관찰(통과 조건) |
|---|---|---|
| EU1 | iOS. u01 레슨의 듣기 문항(`LISTEN_SELECT`) → 자동 재생(1.0)을 끝까지 → `Slow`(`listening-prompt-slow`) → 다시 듣기(`listening-prompt-replay`). 비행기 모드(받아 둔 파일)로 같은 순서를 반복 | 0.85 길이 ≈ 1.18배(녹화), **음높이가 같다**(귀 — 목소리가 낮아지지 않는다). 원격 · `file://` 둘 다. `Slow`를 켜는 순간 0.85로 처음부터 다시 난다 |
| EU2 | Android 에뮬레이터. EU1과 같음 + 0.85 재생 중 일시정지 → 재개 | EU1과 같은 결과. 재개 뒤에도 0.85, 일시정지 중 저절로 재생되지 않는다. logcat에 `Cannot set playback speed`가 없다 |
| EU3 | 두 기기. `Slow` 켬 → 다음 듣기 문항 · 다음 활동(받아쓰기 · 대답 고르기) → 나가기 → 같은 레슨 다시 → 레슨 끝 → 컷 · 최종 테스트 | 레슨 안에서는 켜진 채 다음 문항 자동 재생도 0.85, 나갔다 들어오면 `Slow, off`, 컷 · 최종은 1.0 |
| EU4 | VoiceOver · TalkBack 켬 + 다른 앱 음악 재생 → 토글에 초점 → 두 번 탭 → 0.85 재생 | 0.85 동안 음악이 줄고 끝나면 돌아온다(1.0과 같음). TalkBack 낭독 때 멈춤 · 이음이 1.0과 같다 |
| EU5 | 두 기기. `WORD_ORDER` · `SPEAK_WORD` 판정 | 정답 효과음과 정답 음성(1.0 한 번)의 겹침이 학습을 막지 않는지(귀) — 막는다면 ADR-0080 재검토 조건 3 |
| EU6 | iOS 시뮬레이터. 성능 측정 3회(레슨 시작 → 첫 문항 첫 그리기 · 문항 첫 그리기 → 재생 호출 · `Slow` 탭 → `playAtRate` 호출) | 성능 보고서에 중앙값 · 예산 대비 — 이 문서는 절차만 진다 |
| EU7 | 옛 호스트(main 빌드 호스트 + 이 번들, 가능하면) | 듣기 문항에 `Slow`가 없다 · 소리 1.0 · Lynx 오류 없음 |
| EU8 | u00 `S2` · `S7`(온라인 · 음성 받은 뒤) | `S2`는 듣기 화면으로 서고 처음엔 대본이 없다 → 고르면 대본(한국어 · 로마자)이 선다. `S7`은 문장 순서 화면에 상대 말풍선 자리 재생 줄(대본 없음) — 빈 레슨이 아니다 |
| EU8b | u00 `S2` · `S7`(오프라인 첫 설치 · 음성 못 받음) | `S2`는 대본(한국어 · 로마자)과 보기가 처음부터 보이는 소리 없는 듣기 화면(재생 · 천천히 조작 없음)이고 답해도 소리가 나지 않는다. `S7`은 건너뛰어져 빈 레슨이다(v4 — 받은 파일만 소리, ADR-0080 「대가」 4). 음성을 받은 뒤 새로 연 레슨부터 EU8 모양이다 |
| EU9 | u00 · u01 받아쓰기(`DICTATION`) · 대답 고르기(`REPLY_SELECT`) · 따라 읽기(`SHADOW`)의 간이 줄 | 서면 한 번 자동 재생, 재생 중 단추가 `Stop`(일시정지 아이콘)이고 누르면 즉시 멈춘 뒤 `Play again`. 받아쓰기는 로마자 · 뜻 단서가 그대로 보인다 |

## 관찰 항목 — 스크린리더 (BA1 · BA4 ~ BA6)

판정 낭독 · 효과음 · 문항 음성의 **겹침**은 코드로 판정할 수 없다. 겹침이 학습을 해친다고 판정되면 조치(ADR-0080 재검토 조건 3 · 6), 받아들이면 그 결과를 ADR-0080 적용 기록에 플랫폼별로 적는다.

| id | 조건 · 단계 | 관찰 · 기록 |
|---|---|---|
| BA1 | VO · TalkBack. 간이 줄 다시 듣기(`word-choice-listen-again` 등)에 초점 → 두 번 탭 | 이름이 **한 번만** 들린다(`Play again, button`), 두 번 탭이 재생을 일으킨다. 재생 중 다시 초점 → `Stop, button` |
| BA2 | VO · TalkBack. 대본 표시 꺼짐(초기값)으로 듣기 문항에서 보기를 고름 | 판정 순간 「Correct.(또는 Incorrect.) <한국어 대본>. <로마자>」가 **한 번** 들린다. 설정에서 「대본 표시」를 켜면 지금 공지 그대로(대본 낭독 없음) |
| BA4 | VO 오디오 덕킹 켬 / 끔 · TalkBack. 문장 순서 · 낱말 말하기 각 1문항 판정 | `기록: <들린 그대로>` — 판정 낭독이 정답 음성을 줄이거나(VO 덕킹) 섞이거나 · 정답 음성이 조각나는가(TalkBack — 일시 포커스 손실 = 멈춤) |
| BA5 | VO. 따라 읽기 녹음 중 간이 줄 다시 듣기를 누름 | `기록: <들린 그대로>` — 인식 결과 낭독과 문장 음성이 겹치는가, 두 번 탭 직전 VO의 「Play again」이 녹음에 들어가는가 |
| BA6 | VO · TalkBack. `Slow` 두 번 탭(켜기 · 끄기) | 두 번 탭 뒤 새 상태 `Slow, on` / `Slow, off`가 다시 읽히는가(켤 때는 0.85 재생과 겹친다). 안 읽히면 ADR-0080 재검토 조건 6 |
| BA7 | 큰 글자(접근성 크기 최대) | 듣기 3열의 끝 슬롯이 「✓ Slow」를 한 줄로 담는다 · 재생 원이 가운데 그대로 |

## 결과

- 아직 없다. 2026-10-21 사용자 폰(iPhone 13 mini)에 설치한 빌드에서 「`Slow` 글자가 보이지 않는다」는 보고가 있었고(시뮬레이터 iPhone 17 Pro · 13 mini에서는 보임) 재현 중이다. 같은 설치에서 본 「u00 `S2` 대본에 답 노출」은 대본을 답한 뒤에만 보이게 해 고쳤다(ADR-0080 D13).
- 호스트 테스트(이 문서 밖, 2026-10-21): iOS `AudioPlaybackModuleTests` 11/11, Android JVM 통과 · 계측 `AudioPlaybackModuleTest` 22/22 — 실행법은 [Android 오디오 재생 검증](android-audio-playback.md).
