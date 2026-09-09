# 전화 유닛 번들 앱 초기 로드 — iPhone 17 Pro Simulator — 02

## 실행 조건

- 측정 일시: candidate 2026-09-09T13:05:36.797Z, baseline 2026-09-09T13:07:34.461Z
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
- baseline capture SHA-256: `af4b16f57ef28f2ef27d341219587c5a46df696b3b49ed84460844abefc2a6d8`
- candidate capture SHA-256: `6abc2a6790a4924bf323f9632ce4c9b739fb349848590b57eccdd3f80f75ce38`
- analyzer: 대상 commit의 analyzer source, Node 22.22.1; 두 입력 모두 종료 코드 0
- 실행 회차: 02

## 시나리오

- 전제: 전용 Simulator에 조건별 Host.app을 설치하고 앱 프로세스를 종료한 상태
- 단계: runner의 같은 opt-in capture 절차로 candidate를 한 번, baseline을 한 번 실행해
  최초 bundle load와 `after-initial-load` Memory snapshot을 수집한다.
- launch 인자: `--performance-capture --bundle-url=main.lynx`
- 관찰 구간: 앱 프로세스 시작부터 최초 bundle load 및 초기 Memory snapshot 완료까지
- 전체 실행 순서: baseline 01 → candidate 01 → candidate 02 → baseline 02 → baseline 03 → candidate 03
- 제외: 전화 화면 진입·음원 재생·답장·replay 상호작용, 물리 iPhone 성능

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 81.262 ms, fcp 81.831 ms
  LoadBundle loadBundle: loadBundle 36.644 ms, parse 0.892 ms,
    loadBackground 22.776 ms, pipeline 81.276 ms, mtsRender 1.917 ms,
    resolve 0.846 ms, layout 25.454 ms, paintingUiOperationExecute 5.848 ms,
    layoutUiOperationExecute 0.834 ms

Memory
  after-initial-load [complete]: totalBytes 668976 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 616400 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 35621168 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 0 ms
```

baseline과 candidate 모두 PerformanceEntry 1건과 `after-initial-load` Memory 1건이며,
Memory 수집은 complete, instances 1/1이다.

## 비교

- 기준 기록: 같은 측정 세션의 baseline 02
- 번들 크기: 313954 → 338216 bytes, +24262 bytes / +7.7279%

| 항목 | baseline 02 | candidate 02 | candidate - baseline |
|---|---:|---:|---:|
| lynxFcp | 57.678 ms | 81.262 ms | +23.584 ms |
| fcp | 58.278 ms | 81.831 ms | +23.553 ms |
| loadBundle | 27.503 ms | 36.644 ms | +9.141 ms |
| parse | 0.953 ms | 0.892 ms | -0.061 ms |
| loadBackground | 13.446 ms | 22.776 ms | +9.330 ms |
| pipeline | 57.695 ms | 81.276 ms | +23.581 ms |
| mtsRender | 1.890 ms | 1.917 ms | +0.027 ms |
| resolve | 0.908 ms | 0.846 ms | -0.062 ms |
| layout | 16.122 ms | 25.454 ms | +9.332 ms |
| paintingUiOperationExecute | 5.812 ms | 5.848 ms | +0.036 ms |
| layoutUiOperationExecute | 0.910 ms | 0.834 ms | -0.076 ms |
| totalBytes | 645008 bytes | 668976 bytes | +23968 bytes |
| elementBytes | 31200 bytes | 31200 bytes | 0 bytes |
| viewBytes | 21376 bytes | 21376 bytes | 0 bytes |
| mainThreadRuntimeBytes | 592432 bytes | 616400 bytes | +23968 bytes |
| backgroundThreadRuntimeBytes | 0 bytes | 0 bytes | 0 bytes |
| appBytes | 35195184 bytes | 35621168 bytes | +425984 bytes |
| elementNodeCount | 30 nodes | 30 nodes | 0 nodes |

## 해석

회차 02는 candidate가 baseline보다 먼저 실행됐고 timing 차이의 방향은 회차 01과 반대다.
Simulator OS를 cold boot하거나 cache를 초기화하지 않았으므로 이 차이를 회귀 또는 기능
효과로 판정하지 않는다. candidate의 초기 `totalBytes`와 `mainThreadRuntimeBytes`는 회차
01과 같은 +23968 bytes지만, 초기 load에서 전화 화면·음원·답장을 실행하지 않았다.

`appBytes` 차이는 +425984 bytes이며 회차 01의 차이와 같지 않다. 전역 초기 snapshot의
변동과 제품 payload 차이가 함께 있으므로 특정 파일이나 모듈에 귀속하지 않는다. 측정 전
준비한 source app manifest를 검증했고 조건별 app 설치·새 PID launch 절차로 raw를 배정했으나,
설치 후 container 내부 hash는 회차별 재확인하지 않아 source 귀속은 실행 기록에 의존한다.
raw에는 capture UTC가 있지만 launch UTC와 capture producer version은 기록되지 않았다.

## Trace 후속 확인

- render: 초기 load analyzer 값만 확인했으며 별도 Trace는 수집하지 않았다.
- fluency: 해당 없음 — 전화 화면 상호작용을 실행하지 않았다.
- memory: 초기 snapshot 하나만 있어 실행 내 before→after·잔류 delta를 계산하지 않는다.
- NativeModule: 해당 없음 — 전화 음원 재생과 callback을 실행하지 않았다.

## 결론과 후속

- 결론: 회차 02는 초기 load와 Memory를 측정했지만 실행 순서·cache 영향을 분리하지 못해
  timing의 개선·회귀를 판정할 수 없다.
- 후속: 회차 01·03과 함께 반복 일관성을 확인하고, 전화 상호작용과 물리 기기 성능은
  별도 승인·측정 범위로 유지한다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처와 로컬 절대 경로를 포함하지 않았다.
- [x] 계정 이름, 기기 고유 식별자(UDID), 외부 URL과 NativeModule 파라미터를 포함하지 않았다.
- [x] 사용자 콘텐츠와 timing flag identifier를 포함하지 않았다.
- [x] 단일 회차 timing 차이를 성능 통과나 기능 효과로 표현하지 않았다.
