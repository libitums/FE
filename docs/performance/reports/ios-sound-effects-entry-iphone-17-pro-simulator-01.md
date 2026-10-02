# iOS 효과음 진입 화면 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-02T17:05:00+09:00
- 상태: 측정 — Release Host의 첫 Lynx 화면을 한 번 캡처했다.
- 기능 PR: [iOS 효과음 연결 #215](https://github.com/libitums/FE/pull/215)
- 대상 commit: `41c7f25bd82cfa00d791163a739f5bdfa555c937` 위에 리뷰 수정 작업 트리를 적용했다. 측정 빌드는 아래 번들 SHA-256으로 식별한다.
- 기기: iPhone 17 Pro 시뮬레이터 (`Duru Sound E2E`)
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Release / iphonesimulator / arm64 / `CODE_SIGNING_ALLOWED=NO`; 내장 `main.lynx.bundle` 1,380,390 bytes, SHA-256 `8392d7609e50952cc1532bc5fda39b1146c37c17598be456f6d2653ce9dbfe93`. 설치한 Host 앱의 번들과 바이트 동일하다. 효과음 MP3 8개의 원본 파일 합계는 635,112 bytes다.
- 실행 회차: 01

## 시나리오

- 전제: 최신 작업 트리의 Release Host를 별도 시뮬레이터에 설치한다. 앱의 첫 화면이 뜨기 전 상태에서 시작한다.
- 단계: Host를 `--performance-capture`와 내장 `main.lynx`로 실행하고 첫 화면이 안정될 때까지 조작하지 않는다. 로컬 수집 파일을 저장소의 분석 CLI로 해석한다.
- 관찰 구간: `loadBundle` 시작부터 첫 paint까지, 첫 화면 직후 전역 메모리 snapshot까지다. 이후 별도로 실행한 Maestro 진입 흐름은 이 캡처의 관찰 구간에 넣지 않았다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 48.212 ms, fcp 48.690 ms
  LoadBundle loadBundle: loadBundle 25.335 ms, parse 12.971 ms,
    loadBackground 15.285 ms, pipeline 48.220 ms,
    mtsRender 8.515 ms, resolve 1.073 ms, layout 0.028 ms,
    paintingUiOperationExecute 1.468 ms, layoutUiOperationExecute 0.519 ms

Memory
  after-initial-load [complete]: totalBytes 4,450,264 bytes,
    elementBytes 6,240 bytes, viewBytes 2,392,136 bytes,
    mainThreadRuntimeBytes 2,051,888 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 50,120,936 bytes,
    elementNodeCount 6 nodes; instances 1/1; collection 2 ms
```

번들 크기는 같은 브랜치의 리뷰 전 기록(1,380,375 bytes)보다 15 bytes 크다. 이번 리뷰에서 바뀐 JS 액션 분기와 함께 다시 만든 결과다. `pnpm size:check`의 1,412,000-byte 상한 안에 있다. 이 상한 검사는 번들 크기만 확인한다.

## 비교

- 기준 기록: 같은 초기 화면·빌드 조건으로 측정한 리뷰 전 캡처가 없다.
- 차이: 위 15 bytes는 빌드 산출물 크기의 차이다. 시작 시간·메모리 변화량은 계산하지 않는다.

## 해석

이번 단일 시뮬레이터 실행에서는 첫 화면의 Lynx FCP와 메모리를 관측했다. 효과음 재생은 이 관찰 구간에 없으므로 버튼 탭부터 오디오 출력까지의 지연, 여러 소리의 동시 재생 비용, 실제 기기에서의 메모리 증가는 **미측정**이다. 이 수치만으로 소리 추가에 따른 성능 개선이나 퇴행을 판정할 수 없다. 번들 크기 검사와 효과음 재생 동작 검증은 별개의 결과다.

## Trace 후속 확인

- render: Trace는 수집하지 않았다. 최초 load의 parse와 MTS render는 분석 CLI 수치로만 확인했다.
- fluency: 스크롤 조작이 없어 해당 없음.
- memory: 첫 화면 직후 한 snapshot만 있어 peak·잔류 메모리는 알 수 없다.
- NativeModule: 소리 재생 호출의 시간 구간은 수집하지 않았다. 후속 실기기 검증에서 버튼·정오 판정·완료음의 출력 지연과 중첩을 따로 확인할 필요가 있다.

## 결론과 후속

- 결론: 효과음이 포함된 Release Host의 첫 화면에서 FCP 48.690 ms와 앱 메모리 50,120,936 bytes를 한 번 관측했다. 이 값은 성능 기준선이나 회귀 판정이 아니다.
- 후속: 실제 기기에서 효과음 출력 지연과 연속 탭의 체감 품질을 측정한다. 별도 iOS XCTest는 서로 다른 두 효과음의 동시 재생과 `stopAll()` 중단을 확인한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] 앱 호출 URL, NativeModule 파라미터, 사용자 콘텐츠를 포함하지 않았다.
- [x] 사용자·콘텐츠 식별 가능한 timing flag를 포함하지 않았다.
- [x] 단일 측정을 기준선이나 성능 통과로 표현하지 않았다.
