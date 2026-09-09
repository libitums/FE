# 메신저 번들 앱 초기 로드 — iPhone 17 Pro Simulator — 02

## 실행 조건

- 측정 일시: candidate 2026-09-09T13:01:01.332+09:00, baseline 비교 2026-09-09T13:08:06.039+09:00
- 상태: 측정 — Release Simulator Host의 baseline·candidate 초기 load Rendering·Memory 캡처
- 기능 PR: 없음 — 아직 PR이 생성되지 않았다.
- 대상 commit: `cf3cd9e49c680d6a90512524365c7371973d2922` 기반 dirty candidate
- source identity: tracked diff SHA-256 `5117e97ca2e243a055be194ba0fadf560dba1481264fd74a0b24fd3d3ccf2538`, untracked path manifest SHA-256 `63baff543ca9a8225366316f652a10f2ce4bd8e214867a159d8f86564ed68697`
- production source manifests: baseline tracked `56e89584595f2ebfab1b372ecf76cb50e24a83e9b8050ced95899bf38887873`; candidate tracked `11716792d94036daea7eec42dab12d7bad7764c497a911dc7d84d399697ab4cb`, untracked `9d7d1a70d5488cca78d77e88d54fb0b2f7d23e06a15868b9c314a0a5ce84f746`
- dependency lock SHA-256: `eb4a92e5b0e613df09d200d2265acb145547b33fc63c6a312c671741a9a72a9a`
- 기기: iPhone 17 Pro Simulator
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`; baseline Host.app 복사본의 `main.lynx.bundle`만 candidate bundle로 교체
- 공통 Host executable: universal arm64/x86_64, SHA-256 `69ac2122f24de8bbcf0d167b5a5ce048b621edf2afe3313e8ed2657a3963a5e9`
- baseline bundle: 289403 bytes, SHA-256 `988bab9a85296a5b0ebed8ba46fa7f5cb8a1eb774932a33cb2926b6a8be866e2`
- candidate bundle: 313946 bytes, SHA-256 `a7ce525783870495462eb4b4c137ef74ff8a40eefe5aed3791589a75fdd43598`
- baseline capture SHA-256: `94b215faa8e1e3c96b3d8aa06cbebd2e02054269fa3990caf77300c6244a9154`
- candidate capture SHA-256: `85dc1600d170b851a38491c613273eb27f4ba64dd4fa9da5f2892a4dde90338e`
- 실행 회차: 02

## 시나리오

- 전제: 전용 Simulator에 조건별 Host.app을 설치하고 앱 프로세스를 종료한 상태
- 단계: `--performance-capture --bundle-url=main.lynx`로 한 번 실행하고 초기 load의 Rendering entry와 `after-initial-load` Memory snapshot이 생성될 때까지 기다린다.
- 관찰 구간: 앱 프로세스 시작부터 최초 bundle load 및 초기 Memory snapshot 완료까지
- 전체 실행 순서: baseline 01 → candidate 01 → candidate 02 → candidate 03 → baseline 02 → baseline 03
- 제외: 메신저 진입·선택·메시지 진행 등 상호작용, 물리 iPhone 측정

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 99.615 ms, fcp 100.136 ms
  LoadBundle loadBundle: loadBundle 63.220 ms, parse 6.703 ms, loadBackground 17.363 ms,
    pipeline 99.622 ms, mtsRender 5.434 ms, resolve 4.660 ms, layout 34.915 ms,
    paintingUiOperationExecute 8.277 ms, layoutUiOperationExecute 1.707 ms

Memory
  after-initial-load [complete]: totalBytes 644992 bytes, elementBytes 31200 bytes,
    viewBytes 21376 bytes, mainThreadRuntimeBytes 592416 bytes,
    backgroundThreadRuntimeBytes 0 bytes, appBytes 34638128 bytes,
    elementNodeCount 30 nodes; status completed; instances 1/1; collection 0 ms
```

candidate Memory snapshot은 `after-initial-load`이며 수집 상태가 complete이고 필수 범주
누락이 없다. baseline 02도 같은 label, complete, instances 1/1 조건을 만족했다. 각 실행의
snapshot이 하나뿐이므로 실행 내 before→after memory delta는 계산하지 않는다.

## 비교

- 기준 기록: 저장소 등록 없음 — 같은 측정 세션의 baseline 회차 02와 직접 비교
- 번들 크기: baseline 289403 bytes → candidate 313946 bytes
- 번들 크기 차이: +24543 bytes / +8.4806%

| 항목 | baseline 02 | candidate 02 | candidate - baseline |
|---|---:|---:|---:|
| lynxFcp | 66.690 ms | 99.615 ms | +32.925 ms |
| fcp | 67.163 ms | 100.136 ms | +32.973 ms |
| loadBundle | 35.994 ms | 63.220 ms | +27.226 ms |
| parse | 2.897 ms | 6.703 ms | +3.806 ms |
| loadBackground | 11.819 ms | 17.363 ms | +5.544 ms |
| pipeline | 66.702 ms | 99.622 ms | +32.920 ms |
| mtsRender | 3.817 ms | 5.434 ms | +1.617 ms |
| resolve | 2.447 ms | 4.660 ms | +2.213 ms |
| layout | 17.490 ms | 34.915 ms | +17.425 ms |
| paintingUiOperationExecute | 7.472 ms | 8.277 ms | +0.805 ms |
| layoutUiOperationExecute | 1.005 ms | 1.707 ms | +0.702 ms |
| totalBytes | 610512 bytes | 644992 bytes | +34480 bytes |
| elementBytes | 31200 bytes | 31200 bytes | 0 bytes |
| viewBytes | 21376 bytes | 21376 bytes | 0 bytes |
| mainThreadRuntimeBytes | 557936 bytes | 592416 bytes | +34480 bytes |
| backgroundThreadRuntimeBytes | 0 bytes | 0 bytes | 0 bytes |
| appBytes | 34883888 bytes | 34638128 bytes | -245760 bytes |
| elementNodeCount | 30 nodes | 30 nodes | 0 nodes |

- candidate 실행 순서 관측: 회차 01→02에서 lynxFcp 111.834→99.615 ms, loadBundle 80.766→63.220 ms, pipeline 111.846→99.622 ms, layout 56.657→34.915 ms
- 판정: 회차 02 차이와 candidate 순서상 감소 모두 실행 순서와 Simulator cache 영향을 분리하지 못했으므로 개선·회귀 근거가 아니다.

## 해석

비교 설계는 동일한 unsigned Release Simulator Host executable을 고정하고 JS bundle만
교체하므로 메신저 JS 증분이 포함된 bundle의 공통 초기 load만 다룬다. candidate bundle은
24543 bytes(+8.4806%) 더 크지만, 정적 증가율로 렌더링 시간이나 메모리 변화를 추정하지
않는다.

각 실행은 앱 프로세스를 종료한 뒤 다시 시작한 cold process launch다. Simulator OS cache가
cold임은 보장하지 않았다. candidate 01·02가 연속 실행되어 timing이 감소한 현상에는
warm cache 또는 실행 순서 효과가 섞일 수 있다. 또한 baseline 02는 candidate 01·02·03
뒤에 실행되어 회차 번호가 같아도 순서 위치가 다르다. 실행 번호는 보고서 대응 번호일
뿐 시간 인접 matched pair가 아니다. 세 회차 모두에서 candidate Memory가 baseline보다
34480~34640 bytes 크게 관측됐지만, 이는 Lynx global memory query의 Simulator 초기
snapshot이며 실기 전체 메모리나 메신저 상호작용 메모리로 해석하지 않는다. 회차 02의
양수 timing 차이를 회귀로, candidate 순서상 감소를 개선으로 일반화하지 않는다.

candidate working tree의 `apps/ios/Host.xcodeproj/project.pbxproj` 차이는 공통 Host에
반영하지 않았으므로 네이티브 프로젝트 영향은 미측정이다. 메신저 상호작용과 물리 기기
성능도 측정 범위 밖이다.

## Trace 후속 확인

- render: 해당 없음 — 이번 자동 범위는 초기 load analyzer 결과이며 Trace를 수집하지 않았다.
- fluency: 해당 없음 — 스크롤·메신저 상호작용을 측정하지 않았다.
- memory: 양쪽 초기 `after-initial-load` snapshot을 비교했지만 각 실행 내 잔류 delta는 확인하지 않았다.
- NativeModule: 해당 없음 — NativeModule 상호작용을 측정하지 않았다.

## 결론과 후속

- 결론: 동일 Host의 회차 02 baseline·candidate 관측값을 확보했지만 실행 순서와 cache 효과를 분리하지 못해 성능 방향을 판정할 수 없다.
- 후속: 예산이나 교차 실행 설계 요구가 생기기 전에는 추가 pass/fail 판정을 만들지 않는다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 포함하지 않았다.
- [x] 공개 보고서에 timing flag identifier를 옮기지 않았다.
- [x] 단일 회차와 순서상 감소를 baseline 확정이나 성능 통과로 표현하지 않았다.
