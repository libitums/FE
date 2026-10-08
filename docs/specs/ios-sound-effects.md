# iOS 효과음 `/change` 계약

## 요구사항

- 제공된 효과음 중 8개 MP3를 `apps/ios/Host/sfx/`에 포함한다. `perfect_lesson`은 사용하지 않고 제거한다. Android 호스트와 번들에는 넣지 않는다. (2026-10-05 Android로 이관했다 — [Android 호스트 이관](#android-호스트-이관-2026-10-05))
- 버튼, 정오 판정, 활동·레슨 완료, 수신 통화와 통화 수락에 해당하는 소리를 화면 사건에 연결한다.
- 반복 렌더나 이미 답한 보기의 재탭으로 소리가 중복되지 않는다.
- 효과음은 기존 대사·듣기 재생기를 대체하거나 중지하지 않는다. 벨은 받기·나가기·백그라운드에서 멈춘다.
- iOS 모듈이 없는 Android·테스트 환경에서는 조용히 무동작한다. (2026-10-05부터 Android에도 모듈이 있다 — 무동작은 모듈이 없는 Explorer·테스트 환경뿐이다)

## 계약

| 자산 | 사건 |
| --- | --- |
| `button` | 온보딩 다음·뒤로·시작, 하단 탭, 여정 레슨 시작, 문화 퀴즈 시작, 일반 학습의 단어 칩 넣기·빼기와 진행·나가기·듣기·녹음·건너뛰기 버튼 |
| `correct_answer`, `wrong_answer` | 정오 판정 표시 |
| `lesson_complete` | 활동의 모든 문항 완료 안내 |
| `pass_lesson`, `failed_lesson` | 레슨 결과 화면의 통과(퍼펙트 포함)·미통과 |
| `ring_bell`, `accept_call` | 수신 화면과 수락 |

Lynx의 `SoundEffectsModule`은 `play(id)`와 `stopRing()`만 제공한다. 식별자는 위 표의 값만 허용한다. `AudioPlaybackModule`의 API와 세션 설정은 바꾸지 않는다. 일반 버튼음은 즉시 판정음이 뒤따르는 확인·보기 탭에는 붙이지 않는다.

## 테스트 계획

1. **Unit red→green:** JS 접점에서 iOS 모듈 호출, 없는 모듈에서 무동작, 잘못된 ID 거부를 검증한다. 네이티브에서는 자산 목록·누락 처리·벨 재생 중지 계약을 검증한다.
2. **UI red→green:** 정오 배지, 활동 완료, 레슨 결과, 문화 퀴즈 보기가 정확한 ID를 한 번 요청하는지 검증한다.
3. **Integration red→green:** 통화 수신→수락·이탈에서 벨 정지와 수락 효과, 학습의 최종 판정→완료 소리 순서를 검증한다.
4. **E2E red→green:** iOS Release 호스트에 실제 자산이 포함되고 Maestro가 진입 흐름을 통과하는지 검증한다. 온보딩 버튼 탭이 `button` 효과 호출로 이어지는 것은 UI 테스트가 확인한다. Maestro 접근성 트리만으로는 소리 자체를 판정할 수 없으므로 네이티브 자산·재생 검증 결과도 함께 기록한다.

## 실행 증거

- Unit: iOS 네이티브 모듈 호출 테스트 red→green, 6개 통과.
- UI: 정오 판정·완료 7개, 레슨 시작 1개, 하단 탭·문화 퀴즈 시작 2개, 온보딩 1개를 각 red→green으로 확인.
- Integration: 수신·수락·이탈 3개를 red→green으로 확인.
- 전체 모바일 회귀: unit 1,380개, UI 1,140개, integration 415개 통과. 모바일 타입 검사·린트·포맷 검사·번들 크기 검사 통과. 로그인용 공개 Supabase 설정을 포함한 최종 Lynx 번들은 1,412,309 bytes이고 예산은 1,413,000 bytes다.
- 최초 iOS Release arm64 빌드 통과. `.app/sfx/`에 9개 MP3와 1,412,309-byte Lynx 번들이 들어 있었다. 네이티브 XCTest 2개 통과: 당시 9개 전부 번들 조회·디코딩·`AVAudioPlayer.play()` 성공, 허용 ID 제한.
- 초기 `Duru E2E` 회차는 작업 트리의 `.env.local`이 없어 로그인 화면까지만 통과했다. 원래 체크아웃의 공개 Supabase URL·키 두 값만 작업 트리의 무시 파일에 넣어 재빌드했고, 실제 번들·설치 앱에 두 값이 포함된 것을 값 노출 없이 검증했다. 사용자 인증 완료 뒤 앱의 여정 화면으로 돌아온 것도 확인했다.
- iOS 26.5 별도 `Duru Sound E2E` 시뮬레이터에서 최종 Release 앱의 Maestro `e2e/entry-flow.yaml` 통과: 온보딩의 `Next` 두 번과 `Get started` 뒤 로그인 화면 확인. 사용자 인증 중인 시뮬레이터는 이 재실행에서 건드리지 않았다.
- Maestro는 오디오 파형을 판정하지 않는다. 학습 정오 판정·레슨 결과의 실제 청음은 이번 자동 회차의 범위 밖이다. 해당 사건의 JS 호출은 UI 테스트, 각 MP3의 실제 재생 시작은 네이티브 XCTest가 확인한다.

## 퍼펙트·일반 학습 버튼 후속 변경

- 퍼펙트 결과는 `pass_lesson`을 재생한다. `perfect_lesson` ID와 iOS MP3를 제거해 허용 자산은 8개다.
- 문장 만들기 단어 칩의 배치·해제, 학습 진행·나가기, 듣기 재생·다시 듣기, 말하기 녹음·건너뛰기·재시도, 쓰기 건너뛰기에 `button`을 사용한다. 채점 직후에는 `correct_answer` 또는 `wrong_answer`가 단독으로 난다.
- UI red→green에서 퍼펙트 통과음, 학습 진행 버튼, 단어 칩, 듣기 조작을 확인했다. 문장 만들기 integration은 `button` → `correct_answer` → `button` → `lesson_complete` 호출 순서를 확인했다.
- 당시 전체 모바일 회귀: unit 1,380개, UI 1,145개, integration 416개 통과. 타입 검사·변경 파일 린트·포맷 검사·번들 크기 검사 통과. `06e1475d` 기준 번들은 1,412,776 bytes로 당시 1,413,000-byte 예산 안이었다.
- 당시 iOS Release arm64 빌드 통과. `.app/sfx/`에는 8개 MP3만 있고 `perfect_lesson.mp3`는 없다. 네이티브 XCTest 2개가 모든 허용 자산의 조회·디코딩·재생 시작과 ID 제한을 확인했다.
- 별도 `Duru Sound E2E` 시뮬레이터에서 Maestro 진입 흐름 통과. 기존 로그인 세션이 있는 `Duru E2E`에는 데이터 초기화 없이 최종 앱을 설치·실행했고 여정 화면 복귀를 확인했다. Maestro는 학습 효과음의 실제 청음을 판정하지 않는다.

## PR 리베이스 검증

- 최신 `main`(`c49a8209`)에 리베이스했다. 모바일 unit 1,382개, UI 1,142개, integration 425개가 통과했고 타입 검사·린트·포맷 검사도 통과했다.
- 새 기준에서 번들은 1,380,375 bytes로 기존 1,412,000-byte 예산 안이다. 따라서 이 PR에는 번들 예산 증액을 포함하지 않는다.
- 리베이스한 iOS Release arm64 빌드에 8개 MP3가 들어 있고 네이티브 XCTest 2개와 별도 시뮬레이터의 Maestro `e2e/entry-flow.yaml`이 통과했다.

## Android 호스트 이관 (2026-10-05)

Android 호스트에도 같은 이름의 `SoundEffectsModule`이 있다. JS(`lib/sound-effects.ts`)와 소비 화면의 호출 시점은 바뀌지 않았다 — 위 계약표가
두 플랫폼에 그대로 적용된다. 자산은 `apps/ios/Host/sfx/`가 단일 출처이고, Android 빌드가 변형마다 `assets/sfx/`로 무압축 복사한 뒤 산출물을
검사해 빠지면 실패한다. 결선 · 산출물 검사 · 포커스 결정과 근거는 [ADR-0045](../adr/0045-android-host-audio-assets.md), 에뮬레이터 절차와 결과는
[Android 효과음 · 대사 오디오 · 서사 배경](../e2e/android-assets.md)에 있다.

### iOS 대조표

| 항목 | iOS (`apps/ios/Host/SoundEffectsModule.swift`) | Android (`apps/android/app/src/main/java/com/libitum/host/SoundEffects*.java`) |
| --- | --- | --- |
| 메서드 | `play(id)` · `stopRing()` — 반환 · 콜백 없음 | 같음 |
| 허용 id | `SoundEffectAsset` 8개 | `SoundEffectAsset` 8개 — 같은 문자열. 정확히 같을 때만 받는다 |
| 모르는 id | 무시, 던지지 않음 | 같음(로그도 없음) |
| 음량 | 자산별 상수 | 같은 값(`button` 0.25 · 판정 0.5 · 레슨 결과 0.55 · `ring_bell` 0.35 · `accept_call` 0.4) |
| 플레이어 | 효과음마다 `AVAudioPlayer` | 짧은 효과음 7개는 `SoundPool`(동시 7), `ring_bell`은 `MediaPlayer` |
| 미리 읽기 | 모듈 생성 때 8개 | `MainActivity.onCreate`에서 8개 로드 시작. 로드 전 요청은 로드가 끝날 때 한 번 재생 |
| 같은 효과음 연속 | 멈추고 처음부터 | 그 효과음의 이전 스트림을 멈추고 처음부터 |
| 다른 효과음끼리 | 겹친다 | 겹친다 |
| `ring_bell` | 무한 반복. 이미 울리면 무시 | `setLooping(true)`. 이미 울리면 무시 |
| `stopRing()` | 벨만 멈추고 처음으로 | 벨만 `pause` + `seekTo(0)`. 안 울리면 무동작 |
| 백그라운드 | 전부 멈춤, 복귀 시 재개 없음 | `MainActivity.onStop` → 전부 멈춤, 복귀 시 재개 없음 |
| 대사 재생기와의 관계 | 분리, 서로 멈추지 않음 | 분리, 서로 멈추지 않음 — 아래 차이 1 |
| 재생 실패 | — | logcat 태그 `SoundEffects`의 `W`(`Cannot load sound effect …` · 벨 플레이어 오류) |

### 의도된 차이

아래 넷은 고치지 않고 기록한다. 둘째 줄부터는 후속 판단 대상이다.

1. **효과음은 오디오 포커스를 요청하지 않는다 — 대사를 멈추지 않으려고.** Android 대사(`AudioPlaybackController`)는 `AUDIOFOCUS_GAIN_TRANSIENT`를
   쥐고 `LOSS_TRANSIENT_CAN_DUCK`에 일시정지한다. 같은 앱의 효과음이 포커스를 요청하면 대사가 멈춰 위 「효과음은 대사·듣기 재생기를 중지하지
   않는다」가 깨진다. 그래서 다른 앱 음악 위에서는 섞여 난다(iOS 기본 카테고리는 다른 앱 오디오를 끊는다). 속성은 `USAGE_MEDIA` ·
   `CONTENT_TYPE_SONIFICATION`이다.
2. **무음 스위치 대신 미디어 볼륨을 따른다.** Android에는 iOS 무음 스위치가 없다. 대사가 이미 미디어 볼륨이라 효과음도 미디어 볼륨을 따른다 —
   볼륨 버튼 하나로 대사와 효과음이 같이 움직인다. 벨 소리 모드(무음 · 진동)는 효과음을 끄지 않는다.
3. **접근성 — 수신 벨은 TalkBack 낭독 중에도 낮아지지 않는다.** Android 자동 덕킹은 포커스를 가진 앱에만 걸리는데 벨은 포커스를 쥐지 않는다(차이 1).
   TalkBack이 「오디오 덕킹」으로 `MAY_DUCK` 포커스를 요청해도 14초 벨이 낭독과 같은 크기로 반복된다. 낭독을 끊지는 않는다(가림이지 끊김이
   아니다). **기본 설정에서는 iOS와 같고**(VoiceOver 오디오 덕킹이 꺼져 있으면 iOS도 겹친다), 사용자가 덕킹을 켰을 때만 갈린다 — iOS는 벨까지
   낮추고 Android는 낮추지 않는다. 벨은 받기 · 나가기 · 시스템 뒤로가기(`useScreenBack` → `stopRing`) · 백그라운드로 멈추므로 WCAG 2.1 1.4.2
   Audio Control은 충족한다. 바꾸려면 벨만 `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`을 쥐는 안이 있다([ADR-0045](../adr/0045-android-host-audio-assets.md) 재검토 조건).
4. **접근성 — Android에서는 TalkBack 낭독 때마다 대사가 일시정지했다가 이어진다.** 효과음이 아니라 대사(`AudioPlaybackModule`)의 동작이지만 같은
   포커스 축이라 여기 적는다. 대사는 포커스를 `GAIN_TRANSIENT`로 요청하고(`CONTENT_TYPE_SPEECH` · `setWillPauseWhenDucked(true)`), TalkBack 낭독이
   `LOSS_TRANSIENT_CAN_DUCK`을 보내면 멈췄다가 `GAIN`에 이어 재생한다. iOS는 기본 카테고리라 VoiceOver와 섞여 난다. 그동안 **자막 타이핑은 타이머로
   계속 진행돼 음성보다 앞설 수 있고**, 완료 콜백을 기다리는 화면은 낭독 시간만큼 늦게 넘어간다(내용 손실은 없다). 이 상황은 이번에 Android에서
   대사가 처음 실제로 재생되면서 생겼다 — 그 전에는 Android 패키지에 대사 자산이 없었다. 「TalkBack을 켜면 음성이 끊기는 버그」로 보고
   `setWillPauseWhenDucked(false)`로 바꿔도 `CONTENT_TYPE_SPEECH`라 시스템이 덕킹 대신 일시정지를 보낸다.

차이 3 · 4는 코드와 Android 플랫폼의 공개 동작으로 추론한 것이고 TalkBack을 켜고 들어 확인하지 않았다 — 절차는
[Android 효과음 · 대사 오디오 · 서사 배경](../e2e/android-assets.md)의 T1 · T2(미실행)다.

### Android 검증

- JUnit `SoundEffectAssetTest`(id · 경로 · 음량 · 반복 · 원본 파일 8개와 1:1) · `SoundEffectsSessionTest`(로드 전 요청 · 벨 상태 · 멈춤).
- 계측 `SoundEffectsModuleTest` 5건: 8개 자산 열기 · 준비, 모르는 id와 무동작 `stopRing`, 벨 시작 한 번과 `stopRing`, 짧은 효과음이 벨을 건드리지 않고 `stopAll`이 멈춤.
- 에뮬레이터: AAB 분할 설치에서 8개 id 전부 플레이어 시작 기록과 짝(E2 · E3 · E4), 벨 21초 반복 뒤 받기에 `paused`, 홈 1.0초 뒤 `paused`(E8).
  청음은 하지 않았다.
