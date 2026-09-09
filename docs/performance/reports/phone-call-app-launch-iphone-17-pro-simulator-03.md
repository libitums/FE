# 전화 유닛 번들 앱 초기 로드 — iPhone 17 Pro Simulator — 03

## 실행 조건

- 측정 일시: baseline 2026-09-09T13:10:24.684Z, candidate 2026-09-09T13:12:12.982Z
- 상태: 측정 — Release Simulator Host의 baseline·candidate 초기 load Rendering·Memory 캡처
- 기능 PR: 없음 — 보고서 작성 시점에는 PR 생성 전이다.
- 대상 commit: `b547fe51f6099f0e58bd65b0aa2bb226efa42780`
- baseline commit: `86551a91bdb313a40e87a16f047feca4f3acc0da`
- source identity: 두 commit의 clean worktree에서 생성
- dependency lock SHA-256: `eb4a92e5b0e613df09d200d2265acb145547b33fc63c6a312c671741a9a72a9a`
- 기기: 전용 iPhone 17 Pro Simulator
  (`com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro`)
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 두 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`; 같은 Host executable에 각
  commit의 제품 payload를 사용
- Node: 22.22.1
- 공통 Host executable: universal arm64/x86_64, SHA-256 `69ac2122f24de8bbcf0d167b5a5ce048b621edf2afe3313e8ed2657a3963a5e9`
- baseline payload manifest SHA-256: `272879f0bc8993ad8f072f4eb779a2df1196b3483fe4a7d37a681a7765413a7a`
- candidate payload manifest SHA-256: `138f58d49bb3c689a56e1c9984ac5fe32326ad709edfcf3677879ce7d7b8f526`
- baseline bundle: 313954 bytes, SHA-256 `0d6f920ce502469a89834a0db96dde30a2da3c25c160d6e47b06c4ec21131f5b`
- candidate bundle: 338216 bytes, SHA-256 `ea69ddda189e67a5383633959807c697dae1a07fa5faaf33e7828e1d29e87bf3`
- 전화 음원 payload: baseline 0개; candidate 3개 — SHA-256
  `5156b34e89cd7bf915c7113a636c1316a3ea9252d41085953ea04d295ed6b3db`,
  `68b590380e9114a8de5f8c9cf84b430ee2bd89a12d79e9d3be5cf5428e091157`,
  `1efd59d3b9117a7952bbe7aa568e872cb7b410f462176b5a203052edc7a149ce`
- baseline capture SHA-256: `4c2d737273713b21d82dd39dd89f5ac6ae58672c6e6e47c95e3fd40f71a8e293`
- candidate capture SHA-256: `c3d209df9cd807a562958a3be5d33fee21c27067b372fee2e9b0be0a2d31c699`
- analyzer: 대상 commit의 analyzer source, Node 22.22.1; 두 입력 모두 종료 코드 0
- 실행 회차: 03

## 시나리오

- 전제: 전용 Simulator에 조건별 Host.app을 설치하고 앱 프로세스를 종료한 상태
- 단계: runner의 같은 opt-in capture 절차로 baseline을 한 번, candidate를 한 번 실행해
  최초 bundle load와 `after-initial-load` Memory snapshot을 수집한다.
- launch 인자: `--performance-capture --bundle-url=main.lynx`
- 관찰 구간: 앱 프로세스 시작부터 최초 bundle load 및 초기 Memory snapshot 완료까지
- 전체 실행 순서: baseline 01 → candidate 01 → candidate 02 → baseline 02 → baseline 03 → candidate 03
- 제외: 전화 화면 진입·음원 재생·답장·replay 상호작용, 물리 iPhone 성능

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 45.326 ms, fcp 45.864 ms
  LoadBundle loadBundle: loadBundle 20.818 ms, parse 0.731 ms,
    loadBackground 6.378 ms, pipeline 45.340 ms, mtsRender 1.387 ms,
    resolve 0.643 ms, layout 12.494 ms, paintingUiOperationExecute 4.293 ms,
    layoutUiOperationExecute 0.641 ms

Memory
  after-initial-load [complete]: totalBytes 668976 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 616400 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 35211568 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 0 ms
```

baseline과 candidate 모두 PerformanceEntry 1건과 `after-initial-load` Memory 1건이며,
Memory 수집은 complete, instances 1/1이다.

## 비교

- 기준 기록: 같은 측정 세션의 baseline 03
- 번들 크기: 313954 → 338216 bytes, +24262 bytes / +7.7279%

| 항목 | baseline 03 | candidate 03 | candidate - baseline |
|---|---:|---:|---:|
| lynxFcp | 47.504 ms | 45.326 ms | -2.178 ms |
| fcp | 47.984 ms | 45.864 ms | -2.120 ms |
| loadBundle | 21.580 ms | 20.818 ms | -0.762 ms |
| parse | 0.774 ms | 0.731 ms | -0.043 ms |
| loadBackground | 6.694 ms | 6.378 ms | -0.316 ms |
| pipeline | 47.514 ms | 45.340 ms | -2.174 ms |
| mtsRender | 1.436 ms | 1.387 ms | -0.049 ms |
| resolve | 0.693 ms | 0.643 ms | -0.050 ms |
| layout | 12.716 ms | 12.494 ms | -0.222 ms |
| paintingUiOperationExecute | 4.625 ms | 4.293 ms | -0.332 ms |
| layoutUiOperationExecute | 0.710 ms | 0.641 ms | -0.069 ms |
| totalBytes | 645008 bytes | 668976 bytes | +23968 bytes |
| elementBytes | 31200 bytes | 31200 bytes | 0 bytes |
| viewBytes | 21376 bytes | 21376 bytes | 0 bytes |
| mainThreadRuntimeBytes | 592432 bytes | 616400 bytes | +23968 bytes |
| backgroundThreadRuntimeBytes | 0 bytes | 0 bytes | 0 bytes |
| appBytes | 35047728 bytes | 35211568 bytes | +163840 bytes |
| elementNodeCount | 30 nodes | 30 nodes | 0 nodes |

## 해석

세 회차 모두 candidate의 초기 `totalBytes`와 `mainThreadRuntimeBytes`가 baseline보다
23968 bytes 컸고 element·view·background runtime·node count는 같았다. 이는 같은 전역
초기 snapshot의 반복 관측이지만, 전화 화면 진입과 음원 재생을 실행하지 않았으므로 전화
상호작용의 peak·잔류 memory나 NativeModule 비용을 설명하지 않는다.

timing 차이는 회차 01에서 크게 음수, 회차 02에서 양수, 회차 03에서 작게 음수였다.
전체 실행 순서가 완전한 무작위 교차가 아니고 Simulator OS를 cold boot하거나 cache를
초기화하지 않았으므로 개선·회귀 방향을 판정하지 않는다.
세 회차에는 cache와 실행 순서를 통제하지 못한 측정 한계가 있으며, candidate 초기 load
성능의 개선 또는 회귀를 판정할 수 없다.

측정 전 준비한 source app manifest를 검증했고 조건별 app 설치·새 PID launch 절차로 raw를
배정했으나, 설치 후
container 내부 hash는 회차별 재확인하지 않아 source 귀속은 실행 기록에 의존한다. raw에는
capture UTC가 있지만 launch UTC와 capture producer version은 기록되지 않았다.

## Trace 후속 확인

- render: 초기 load analyzer 값만 확인했으며 별도 Trace는 수집하지 않았다.
- fluency: 해당 없음 — 전화 화면 상호작용을 실행하지 않았다.
- memory: 초기 snapshot 하나만 있어 실행 내 before→after·잔류 delta를 계산하지 않는다.
- NativeModule: 해당 없음 — 전화 음원 재생과 callback을 실행하지 않았다.

## 결론과 후속

- 결론: 초기 Memory 차이는 세 회차에서 반복됐지만 timing 방향은 일관되지 않았고, 이
  기록만으로 성능 개선·회귀나 전화 상호작용 비용을 판정할 수 없다.
- 후속: 초기 load와 별개로 전화 진입·세 음원 재생·답장·완료·replay 구간을 계측하려면
  timing identifier, snapshot 시점과 실기 포함 여부를 먼저 승인한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처와 로컬 절대 경로를 포함하지 않았다.
- [x] 계정 이름, 기기 고유 식별자(UDID), 외부 URL과 NativeModule 파라미터를 포함하지 않았다.
- [x] 사용자 콘텐츠와 timing flag identifier를 포함하지 않았다.
- [x] 세 회차 관측을 성능 통과나 예산 판정으로 표현하지 않았다.
