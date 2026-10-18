# 성능 스모크 복구 — Podfile.lock 체크섬 · 시뮬레이터 아키텍처 하나 — iOS 시뮬레이터 — 01

## 실행 조건

- 상태: 측정 — CI 성능 스모크 1회 통과(Rendering · Memory 증거의 스키마 검증까지). 수치 비교 · baseline은 아니다(ADR-0021 D5).
- 기능 PR: 성능 스모크 복구 — `apps/ios/Podfile.lock`의 `PODFILE CHECKSUM` 갱신(#245 누락), 스모크 `xcodebuild`에 `ONLY_ACTIVE_ARCH=YES`, 스모크 워크플로의 `continue-on-error` 제거([ADR-0021](../../adr/0021-performance-report-ci-automation.md) 2026-10-18 기록)
- 대상 commit: `413b52d5`(`ci/perf-smoke-speed`) — 앱 · 호스트 코드는 main `e44d9d6d`와 같고, iOS 쪽 차이는 잠금 파일의 체크섬 한 줄이다.
- 기기: GitHub Actions `macos-26` 러너(arm64)의 스모크 전용 시뮬레이터(스모크가 만들고 지운다)
- OS: iOS 26.5(Xcode 26.5)
- Lynx SDK: 4.0.1
- 빌드: `pnpm bundle:host` → `pod install --deployment` → `xcodebuild -configuration Release -sdk iphonesimulator ONLY_ACTIVE_ARCH=YES` (`performance:capture:smoke`)
- 측정 일시: 2026-10-18(CI run 39121986867)

## 시나리오

- `performance:capture:smoke` 한 판: 호스트 번들 → 잠금 설치 → 시뮬레이터 부팅 → Release 빌드 → 설치 · `--performance-capture`로 실행 → 캡처 파일의 Rendering · Memory 증거 검증.

## 이 변경이 무엇을 건드렸나

- 앱(JS 번들)과 호스트(Swift)의 코드는 바뀌지 않았다. 잠금 파일은 체크섬만 바뀌어 설치되는 pod와 버전이 같다(`pod install` 결과 14 pods 그대로).
- 빌드 인자 `ONLY_ACTIVE_ARCH=YES`는 스모크 빌드에만 걸린다 — 측정하는 바이너리는 부팅한 시뮬레이터의 arm64 하나로 같고, x86_64 슬라이스를 만들지 않을 뿐이다. 릴리스 아카이브 · 실기 빌드는 이 인자를 쓰지 않는다.

## 분석 결과

| 단계 | 이전 통과 실행 5회(2026-10-01~13) | 이번 |
| --- | ---: | ---: |
| 시뮬레이터 준비 → Release 빌드 끝 | 31분 48초 ~ 36분 17초 | 20분 45초 |
| 실행 → 증거 검증 | 2 ~ 10초 | 4초 |
| 잡 전체 | 38 ~ 44분 | 26분 |

- 빌드가 약 40% 줄어 잡 제한(45분)까지 19분 남는다. 이전에는 같은 단계가 38~40분을 넘긴 5회가 시간 초과로 취소됐다.
- 캡처 · 검증 단계의 시간은 이전과 같은 범위다 — 이 변경이 측정 자체에 끼친 영향은 보이지 않는다.

## 제한 사항

- 단일 실행이므로 회귀 여부는 말할 수 없다. 빌드 시간은 러너 상태에 따라 흔들리므로 20분 45초를 고정값으로 읽지 않는다.
- 스모크는 캡처 파일의 증거가 있는지와 스키마만 본다 — 렌더 · 메모리 수치를 비교하지 않는다(ADR-0021 D5). 이 보고서는 성능 통과가 아니다.
- 시뮬레이터는 실기 성능과 제품 성능 예산을 대표하지 않는다.

## 결론과 후속

- 스모크가 다시 끝까지 돈다 — 2026-10-16부터 막혀 있던 CocoaPods 단계(체크섬 불일치)가 풀렸고, 빌드가 잡 제한 안에 여유 있게 든다.
- 잠금 파일 불일치는 이제 PR의 Tests 잡이 잡는다(`devtools/ios-pods` IP1). 스모크 실패는 `continue-on-error` 없이 빨간 실행으로 남는다.
- 다음 정기 실행 몇 회의 빌드 시간을 보고, 다시 35분 단계 제한에 가까워지면 그때 `DerivedData` 캐시를 검토한다.
