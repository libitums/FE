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
| LA-E6 | 업로드 전(정보 파일에 letters 없음) | 칸 · 퀴즈가 소리 없이 그대로, 오류 없음 | integration LAI3 · LAI4로 확인(기기 회차는 ADR-0169 ME-E5) | 같음 |

## 남은 것

- 운영 파일을 올린 뒤(ADR-0173 D5) 실제 앱(더보기 메뉴가 고쳐진 뒤)에서 원격 주소로 ME-E6 · LA-E3를 한 번 더 — 올린 목소리를 귀로 듣는 확인 포함.
- 소리 크기 · 음질 청취, VoiceOver · TalkBack 낭독과 겹침(ADR-0173 대가)은 하지 않았다.
