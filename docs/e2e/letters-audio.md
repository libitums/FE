# 수동 e2e — 글자 소리 (ADR-0173)

**상태: 기기 확인 실행(2026-11-20) — 검증용 파일로.** 운영 소리 파일은 아직 없다(목소리 결정 대기, ADR-0173 D3).

## 방법

- 운영 버킷에 쓰지 않으려고 **검증용 41개**(`letters-audio-build.mjs --engine say --voice Yuna`, 배포 불가 · 커밋 안 함)를 기기의
  **받아 둔 콘텐츠 파일 자리**(`content-files/audio/letters/<로마자>.m4a`)에 넣었다. 앱의 주소 해석(`localOrRemoteUrl`)이 받아 둔 파일을 먼저 쓰므로
  재생 모듈까지 실제 길을 지난다(원격 https 재생은 레슨 음성과 같은 네이티브 길 — ADR-0060).
- 지금 main은 기기에서 더보기 메뉴 카드가 보이지 않아(다른 작업이 고치는 중) **임시 진입 교체 프로브**로 Letters · 합치기 퀴즈를 바로 띄웠다.
  프로브는 실제 화면 · `letterAudioSourceOf` · `playAudio`를 쓰고, 음성 정보 파일만 「letters 항목이 있다」고 답한다(업로드 뒤 상태 흉내).
  확인 뒤 프로브 · 프로브 번들을 지웠다(`git diff -- apps/mobile/src/app/index.tsx` = 0).
- 소리는 들을 수 없어 재생 로그로 판단했다 — iOS: Lynx 모듈 호출 · `AVPlayer` · `FigFilePlayer` 재생 보고. Android: 프로브의 재생 결과 · 완료 시간 · `dumpsys audio` 오디오 포커스.
- 기기: iOS 시뮬레이터(iPhone 17 Pro, 이 확인용으로 만들고 지움) · Android `assembleBundled` + AVD `R6_API30`(`-read-only`, 포트 5572, 루트로 파일 넣음).

| id | 확인 | 기대 | iOS | Android |
|---|---|---|---|---|
| LA-E1 | 칸 ㄱ · ㅑ(Android는 ㅁ · ㅈ도) 누름 | `play(file://…/audio/letters/ga.m4a)` 등 그 칸의 소리 · 스피커 주황 | 통과 — ga · ya, AVPlayer AAC 모노 재생 보고 | 통과 — ga · ya · ma · ja `outcome=started`, 끝까지 재생 596 ~ 851 ms 뒤 완료, 포커스 요청 → 반납 |
| LA-E2 | 합치기 퀴즈 ㄱ + ㅓ(틀림) | 오답 효과음만, 음절 재생 없음 | 통과 — `wrong_answer`, 재생 호출 없음 | 통과 — 같음 |
| LA-E3 | Try again → ㄱ + ㅏ(맞힘) | 정답 효과음 뒤 틈을 두고 「가」 한 번(기기 회차 때 틈 900 ms — 그 뒤 레슨과 같은 800 ms로 맞춤, unit CQ17 · ui CS3) | 통과 — `correct_answer` 16.485 → `play ga` 17.388(+903 ms) | 통과 — 07.748 → 08.653(+905 ms), 733 ms 재생 뒤 완료 |
| LA-E4 | Next → ㄴ + ㅏ(틀림) → Try again → ㄴ + ㅓ | 틀림은 무음, 맞힘 뒤 「너」 | 통과 — `correct_answer` 41.650 → `play neo` 42.553(+903 ms) | (2라운드는 iOS만) |
| LA-E5 | 실행 로그의 JS 오류 | ReferenceError · TypeError · 1101 없음 | 통과 — 없음 · 오디오 세션 실패 로그 없음 | 통과 — 없음(FATAL 없음. 프로브가 화면을 갈아 끼울 때 Lynx 네이티브 레이아웃 로그 `DestroyLayoutNodeBeforeRemoveFromParent`만) |
| LA-E6 | **(개정 2026-11-24)** 정보 파일에 letters가 없음 · 정보 파일 자체가 없음(첫 실행 · 오프라인) | 칸은 자모 내장 녹음, 퀴즈 ▶ · 정답 뒤 음절은 음절 내장 녹음으로 소리가 남, 오류 없음(전에는 「퀴즈는 소리 없이」 — 음절 녹음을 싣기 전) | integration LAI3 · LAI4 · LAI6으로 확인, 기기는 LA-E7(운영 정보 파일 letters 0항목) | 같음 |
| LA-E7 | **(개정 2026-11-24 ⟨음절 녹음 앱 내장⟩ — 아래 줄이 지금 기대값. 앞 회차 「회색 ▶」 결과는 그 아래 줄에 남김)** 프로브 없이 실제 앱 · 운영 정보 파일(letters 0항목), 게스트 시작 → 입장 전 기초 › 합치기, 더보기 › Letters › Practice | ▶가 단추(이름 「Play」), 누르면 `play(hangul-s-ga)` → 앱 안 `audio/hangul-s-ga.m4a`. ㄱ + ㅏ 맞힘 → `correct_answer` 뒤 약 0.8 s에 `hangul-s-ga` 한 번. 2 · 3라운드 ▶는 `hangul-s-neo` · `hangul-s-do`. JS 오류 없음 | 통과 — iPhone 17 Pro 시뮬레이터(iOS 26.5, Debug Host `--bundle-url=main.lynx`, 이 확인용으로 만들고 지움). 기초: ▶ AX `Button` 「Play」, `play hangul-s-ga` → `Host.app/audio/hangul-s-ga.m4a`(AVPlayer 0.6249 s), `correct_answer` 39.638 → `play hangul-s-ga` 40.440(+802 ms). Letters: 같은 단추 · ▶ ga, 정답 뒤 +802 ms ga, Next 뒤 ▶ `hangul-s-neo` → 앱 안 파일. JS 오류 0 | 통과 — `assembleBundled`(APK 안 `assets/audio/hangul-s-*` 3개, 21,115 B) + AVD Pixel_8(`-read-only -no-audio`, 포트 5584). 기초: ▶ `content-desc` 「Play」 · `clickable=true`, ▶ ga · MediaPlayer 열고 약 0.7 s 뒤 놓음, `correct_answer` 33.483 → `play hangul-s-ga` 34.284(+801 ms), 2라운드 ▶ neo, 3라운드 ▶ do. 재생 오류(`Rejected` · `Cannot open` · `playback error`) · JS 오류 0. Letters 화면은 Android에서 보지 않았다(같은 포트 · 같은 결선, integration LAI3 · LAI6) |
| (이전 LA-E7, 2026-11-24 #573) | 음절 녹음이 없을 때 | 「Make “ga”」의 ▶가 회색, 이름 「Play, sound not available yet」 · 비활성 | 통과(당시) — 지금은 세 라운드에 내장 녹음이 있어 나타나지 않는다(ui CS19 ~ CS22가 포트 null일 때를 지킴) | 통과(당시) |

## 남은 것

- 운영 파일을 올린 뒤(ADR-0173 D5) 실제 앱(더보기 메뉴가 고쳐진 뒤)에서 원격 주소로 ME-E6 · LA-E3를 한 번 더 — 올린 목소리를 귀로 듣는 확인 포함.
- 소리 크기 · 음질 청취, VoiceOver · TalkBack 낭독과 겹침(ADR-0173 대가)은 하지 않았다.
- 음절 녹음 가 · 너 · 도가 정말 그 음절인지 귀로 듣기 — LA-E7 회차는 재생 호출 · 파일 해석 · 재생 길이까지만 봤다(시뮬레이터 · `-no-audio` 에뮬레이터, 들은 사람 없음). 간접 비교는 ADR-0173 ⟨2026-11-24 — 합치기 퀴즈 음절도 앱 내장 녹음⟩.
- 스크린리더 회차(접근성 감사 Minor, 2026-11-24): TalkBack · VoiceOver에서 ▶에 초점 → 「Play, 버튼」 → 두 번 탭으로 음절 재생, 정답 뒤 「Correct」 낭독과 0.8 s 뒤 음절이 둘 다 알아들리는지.
  음절 녹음을 실어 이 겹침이 이제 정답마다 일어난다(ADR-0173 대가 — 낭독에 음절을 넣는 후속 문구는 아직).
- Android 2라운드 정답 뒤 음절은 이 회차에 보지 못했다 — Next를 틈(0.8 s) 안에 눌러 설계대로 걷혔다(ui CS13).
