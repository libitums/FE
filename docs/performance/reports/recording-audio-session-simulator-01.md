# 녹음 뒤 오디오 세션 복원 — iOS Simulator — 01

## 실행 조건
- 측정 일시: 2026-09-30, Asia/Seoul.
- 상태: 미측정 — 네이티브 기능 검증이며 성능 수치는 측정하지 않았습니다.
- 대상 commit: f9c10bb67a35f75ff04d308ca573d4daa6d50108 위 codex/audio-session-restoration 작업 트리. 선행 PR #191을 포함합니다.
- 기기: 개발용 Mac, iPhone 17 Pro 시뮬레이터.
- OS: iOS Simulator 26.5, Xcode 26.6 (17F113).
- Lynx SDK: iOS Host 4.0.1, ReactLynx 0.125.0.
- 빌드: Host Debug XCTest, Rspeedy production 번들. 실행 회차 01.

## 시나리오
말하기가 공유 오디오 세션을 `.record`/`.measurement`로 바꾼 뒤 입력을 멈춥니다.
최종 인식 결과를 기다리기 전에 녹음 전 카테고리·모드·옵션을 복원하고 기존 재생 모듈로
번들 음원을 재생합니다. 시작 실패·비활성화 실패·반복 정리도 검증합니다.

## 분석 결과
- 배포 전 점검에서 `.record`로 설정한 뒤 `setActive(false)`만 호출해도 카테고리가
  `.record`, 모드가 `.measurement`로 남는 것을 시뮬레이터에서 재현했습니다.
- 녹음 종료·인식 오류·엔진 시작 실패는 입력을 멈춘 뒤 같은 설정 복원 경로를 지납니다.
  활성화 실패는 즉시 복원합니다. 마지막 인식 결과와 타임아웃은 재생 중인 세션을 다시 끄지 않습니다.
- 활성화에는 빈 옵션을 사용하고 `.notifyOthersOnDeactivation`은 비활성화할 때만 사용합니다.
- 새 네이티브 회귀 테스트 9건, HostTests 전체 49건 통과. 실제 AVAudioSession에서
  `.soloAmbient`/`.default`/빈 옵션 복원을 확인하고 `AudioPlaybackModule`의 `greeting-1`
  재생이 `AVPlayerItem.didPlayToEndTimeNotification`과 단일 완료 콜백까지 도달했습니다.
- 전체 `pnpm verify`와 `pnpm bundle:host` 통과. 모바일 번들은 1,383,096 bytes로
  선행 PR #191과 동일합니다. 기존 1,384,000 bytes 예산을 유지합니다.

## 해석
측정 한계: 시뮬레이터의 실제 AVAudioSession 설정과 번들 재생 완료를 확인하는 테스트이며,
실제 마이크 입력이나 음성 인식 결과, 스피커 가청성, Bluetooth 라우팅, 전화 인터럽트는
검증하지 않습니다. 성능 trace·메모리·입력 지연은 미측정이며 성능 기준선으로 쓰지 않습니다.

[Apple의 카테고리 설명](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/AudioSessionCategoriesandModes/AudioSessionCategoriesandModes.html)에 따르면
`.record`는 입력만 허용하고 기본 `.soloAmbient`는 출력과 무음 스위치 정책을 제공합니다.
[활성화 설명](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/ConfiguringanAudioSession/ConfiguringanAudioSession.html)을 기준으로
녹음 종료 시 비활성화와 설정 복원을 구분했습니다.

## 결론과 후속
녹음 카테고리가 다음 듣기까지 남는 경로를 수정했습니다. 실기 Release에서 말하기 → 듣기,
녹음 중 화면 이탈 → 듣기, 다시듣기·일시정지·재개를 확인해야 합니다.
절차는 `docs/e2e/speech-probe.md`의 녹음 뒤 재생 회귀 항목에 기록했습니다.
