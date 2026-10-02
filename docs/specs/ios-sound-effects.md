# iOS 효과음 `/change` 계약

## 요구사항

- `/Users/sehyun/Documents`의 효과음 중 8개 MP3를 iOS 호스트에 포함한다. `perfect_lesson`은 사용하지 않고 제거한다. Android 호스트와 번들에는 넣지 않는다.
- 버튼, 정오 판정, 활동·레슨 완료, 수신 통화와 통화 수락에 해당하는 소리를 화면 사건에 연결한다.
- 반복 렌더나 이미 답한 보기의 재탭으로 소리가 중복되지 않는다.
- 효과음은 기존 대사·듣기 재생기를 대체하거나 중지하지 않는다. 벨은 받기·나가기·백그라운드에서 멈춘다.
- iOS 모듈이 없는 Android·테스트 환경에서는 조용히 무동작한다.

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
