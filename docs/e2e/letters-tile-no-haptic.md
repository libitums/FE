# 수동 e2e — Letters 자모 칸 켜짐 · 눌림 축소 없앰 (ADR-0169 칸 눌림 개정)

**상태: 기기 확인 실행(2026-11-21) — iOS 시뮬레이터 · Android 에뮬레이터 둘 다 통과.**

## 방법

- **임시 진입 교체 프로브**로 Letters 화면을 바로 띄웠다(로그인 · 콘텐츠 없이). 프로브는 실제 `LettersScreen` · `playAudio`를 쓰고,
  소리 주소만 닿지 않는 https 주소(`example.invalid`)로 준다 — 재생 모듈 호출까지는 실제 길이고 소리는 나지 않는다(소리 끈 확인).
  확인 뒤 프로브 · 프로브 번들(iOS `main.lynx.bundle` · `Resource`, Android `assets`)을 지우고 `index.tsx` · `project.pbxproj`를 되돌렸다.
- 진동 판단: iOS는 Lynx가 남기는 네이티브 모듈 호출 로그(`LynxModuleDarwin will invokeMethod`)에 `SoundEffectsModule`이 나오는지,
  Android는 `dumpsys vibrator`의 「Previous vibrations」 목록(앱이 `Vibrator`로 낸 진동이 남는 자리, ADR-0109)이 비어 있는지.
- 기기: iOS 시뮬레이터(iPhone 17 Pro · iOS 26.5, 이 확인용으로 만들고 지움, Debug Host + `--bundle-url=main.lynx`) ·
  Android `assembleBundled` + AVD `R6_API30`(`-read-only -no-audio`, 네트워크 끔, 확인 뒤 종료).

| id | 확인 | 기대 | iOS | Android |
| --- | --- | --- | --- | --- |
| LT-E1 | 칸 ㄱ · ㄴ · ㄷ · ㅁ · ㅏ · ㅑ · ㄱ 차례로 누름(7번) | 누를 때마다 그 칸 소리 재생 호출 | 통과 — `AudioPlaybackModule.play` 7번(가 · 나 · 다 · 마 · 아 · 야 · 가) | 통과 — `play … outcome=started` 7번, 같은 순서 · 이벤트 `played` 7번 |
| LT-E2 | 같은 7번 동안 진동 | 진동 호출 없음 | 통과 — 네이티브 호출은 `AudioPlaybackModule.play` 7 · `StorageModule` 2뿐, `SoundEffectsModule` 0 | 통과 — `dumpsys vibrator` Previous vibrations 비어 있음(누르기 전 · 뒤 같음) |
| LT-E3 | 누른 뒤 화면 | 어느 칸도 켜진 채(테두리 · 면) 남지 않음, 들은 칸 스피커만 주황 | 통과 — 6칸 스피커 주황, 칸 면 · 테두리 그대로 | 통과 — 같음 |
| LT-E4 | 칸 ㅇ을 3초 누르고 있음 → 뗌 | 누르는 동안만 연회색 면(gray-100), 크기 그대로 → 떼면 흰 면 | (시뮬레이터 탭은 짧아 Android로 봄) | 통과 — 누르는 동안 연회색 · 같은 크기, 뗀 뒤 흰 면 + 스피커 주황 |
| LT-E5 | 실행 로그의 JS 오류 | ReferenceError · TypeError · `onAppJSError` 없음 | 통과 — 없음 | 통과 — 없음(FATAL 없음) |

## 남은 것

- 실기기에서 손으로 눌러 「떨림」이 사라졌는지 사용자 확인 — 칸 경로에는 진동 호출이 원래 없었고, 이 변경은 눌림 축소 · 켜짐 면을 없앤 것이다(ADR-0169 칸 눌림 개정).
