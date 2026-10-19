# 진동(무음) 모드에서도 학습 음원 재생 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처를 돌리지 않았다. 이 변경은 iOS 오디오 세션 카테고리 설정뿐이라 Lynx 렌더 경로와 JS 번들이 바뀌지 않는다.
- 기능 PR: #200 수정 — `PlaybackAudioSession`(앱 시작 `.playback` + `.mixWithOthers`, 학습 음원 동안 `.duckOthers`), 재생 모듈의 `beginVoice` · `endVoice` 호출, `AppDelegate`의 `configureDefault`([ADR-0017](../../adr/0017-host-native-capabilities-and-audio.md) D3 2026-10-18 정정)
- 대상 commit: 이 보고서와 같은 PR의 `fix/ios-silent-mode-audio` 브랜치 HEAD
- 기기: iPhone 17 Pro 시뮬레이터(HostTests 84건 실행) — 시뮬레이터에는 무음 스위치가 없어 무음 동작 자체는 실기 확인 몫이다([듣기 e2e](../../e2e/listening.md) C1~C6)
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: `xcodebuild test -scheme Host`(Debug, 시뮬레이터)
- 측정 일시: 2026-10-18

## 시나리오

- HostTests 전체 84건: 새 `PlaybackAudioSessionTests` 5건(PS1~PS5)과 녹음 세션 · 재생 · 효과음 · 음성 인식 테스트.

## 이 변경이 무엇을 건드렸나

- 오디오 세션 카테고리 · 옵션과 활성화 시점만 바뀐다. 재생 객체(AVPlayer · AVAudioPlayer), 번들 · 자산, JS 쪽 `lib/audio.ts`는 그대로다.
- 학습 음원 재생 시작 · 끝에 세션 활성화 · 비활성화 호출이 하나씩 더해진다(메인 큐).

## 분석 결과

- 렌더 · 메모리 수치는 없다(미측정). HostTests 84건 통과.

## 제한 사항

- 시뮬레이터에는 무음 스위치가 없어 이 보고서는 무음 모드 동작의 증거가 아니다 — 실기 확인이 필요하다.
- 세션 활성화 · 비활성화가 재생 시작 지연에 끼치는 영향은 재지 않았다. 단일 확인이고 일반화할 수 없다.

## 결론과 후속

- 실기 iPhone에서 듣기 e2e C1~C6(무음 재생 · 다른 앱 소리 줄이기와 복귀 · 녹음 뒤 재생 · 백그라운드 복귀)을 확인한다.
