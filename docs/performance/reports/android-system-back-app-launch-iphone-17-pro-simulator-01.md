# Android 시스템 뒤로가기 연결 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-05T03:34:03Z
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: Android 시스템 뒤로가기를 앱 내비게이션에 연결하는 변경(이 보고서와 같은 PR,
  [ADR-0043](../../adr/0043-android-system-back.md))
- 대상 commit: `0e8624c263e8b2759979a01cce929085412512e4`
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6
- 실행 회차: 01

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 처음 설치했습니다. 저장된 로그인 토큰이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드 → 설치 → 성능 캡처 모드로
  실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고 Host를 종료합니다.
  `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로 밟았습니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 9초 뒤
  화면이 온보딩 첫 스텝인 것을 스크린샷으로 확인했습니다.

⚠ **이 시나리오에서 뒤로가기는 한 번도 일어나지 않습니다.** iOS 호스트에는 `SystemBackModule`이 없고
`systemBackPressed` 이벤트를 쏘는 쪽도 없습니다. 이 캡처가 지나는 것은 이 변경이 **초기 로드에 얹은 것**뿐입니다.

## 이 변경이 무엇을 건드렸나

Android 시스템 뒤로가기(◁ · 가장자리 스와이프)를 앱의 「보이는 닫기」와 같은 길에 연결했습니다. 공유 JS에
더해진 것은 두 가지입니다.

- `apps/mobile/src/app/use-system-back.ts`: `AppSession`이 전역 이벤트 리스너 하나를 등록하고, 마운트 때
  `SystemBackModule.ready`를 한 번 부릅니다. iOS에는 이 모듈이 없어 호출은 `unavailable`로 떨어집니다.
- 화면 · 층 29곳의 `useScreenBack`/`useLayerBack` 등록: 마운트 때 모듈 수준 스택에 함수 하나를 올리고 언마운트
  때 내립니다.

iOS에서 사용자가 보는 동작은 바뀌지 않습니다. 번들에 코드가 더해졌으므로 영향 시나리오는 **앱 실행(초기 로드)**
입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 46.212 ms, fcp 46.762 ms
  LoadBundle loadBundle: loadBundle 17.746 ms, parse 4.383 ms,
    loadBackground 20.747 ms, pipeline 46.221 ms, mtsRender 7.453 ms,
    resolve 1.362 ms, layout 0.043 ms,
    paintingUiOperationExecute 2.842 ms, layoutUiOperationExecute 0.394 ms

Memory
  after-initial-load [complete]: totalBytes 2072352 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 2063040 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 50071808 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 3 ms
```

캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는 종료 코드 0으로 끝났습니다.

## 비교

- 기준 기록: **없음.** 이 변경의 직전 commit(`444fcfd6`)을 같은 조건으로 잰 기록이 없습니다.
- 참고 기록: [같은 commit 5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md)
  — 같은 시나리오(새 설치 → 온보딩 첫 스텝)이지만 대상 commit이 `5024e62e`로, 이 변경의 직전 commit보다
  105 commit 앞입니다.

| 값 | 참고 기록(5회차) | 이번 |
|---|---|---|
| 초기 `pipeline` | 65.932 ~ 78.572 ms(폭 12.640 ms) | 46.221 ms |
| `parse` | 2.195 ~ 3.338 ms | 4.383 ms |
| `mainThreadRuntimeBytes` | 1,286,208 bytes(5회차 모두 같음) | 2,063,040 bytes |
| `elementNodeCount` | — | 6 nodes |

- 차이: `mainThreadRuntimeBytes`가 참고 기록보다 776,832 bytes 큽니다. **이 차이를 이 변경에 귀속할 수 없습니다** —
  두 기록 사이에 이 변경 말고 105 commit이 더 있고, Xcode도 다릅니다(이번 26.6). 초기 `pipeline`은 참고 기록의
  최솟값보다 19.711 ms 작습니다. 이것도 같은 이유로 이 변경의 효과로 읽지 않습니다.

## 해석

이번 실행에서 초기 `pipeline`은 46.221 ms, `parse`는 4.383 ms였고 element node는 6개(스플래시)였습니다. 첫 paint
직후 memory query는 Lynx 귀속 2,072,352 bytes를 반환했습니다.

**단일 실행이고 직전 commit의 측정이 없다는 한계가 있어, 이 변경이 초기 로드를 느리게 했는지 · 메모리를 늘렸는지는
이 자료로 판정할 수 없습니다.** 참고 기록이 보여 주듯 렌더 시간은 같은 commit에서도 12.6 ms 폭으로 흔들리므로
한 회차의 `pipeline` 값은 방향을 말해 주지 않습니다. 메모리는 같은 번들이면 흔들리지 않는 값이라 commit 사이의 차이를
실제 차이로 읽을 수 있지만, 이번에는 비교할 직전 commit의 값이 없습니다.

코드로 말할 수 있는 것은 여기까지입니다: 초기 로드 경로에 더해진 것은 리스너 등록 하나와 `unavailable`로 끝나는
NativeModule 조회 한 번이고, 스플래시 · 온보딩 첫 스텝이 올리는 등록은 스택 push 몇 번입니다. **그 비용이 실제로
얼마인지는 이 기록이 재지 않았습니다.**

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 다른 iOS · 기기에서의
결과를 일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 화면 전환마다 일어나는 등록 · 해제의 비용은 이 캡처가 지나지 않습니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: `after-initial-load` 하나뿐입니다. 화면을 오가며 스택이 push/pop될 때의 잔류는 이 기록 밖입니다.
- NativeModule: iOS에서는 `SystemBackModule`이 없어 `ready` 호출이 native에 닿지 않습니다. Android에서의
  `ready` · `respond` 호출 비용과 누름 → 응답 왕복 시간은 재지 않았습니다(iOS 수집기의 범위 밖입니다).

## 결론과 후속

- 결론: 시스템 뒤로가기 연결이 들어간 대상 commit에서 iOS 초기 load를 한 회차 수집했습니다(초기 `pipeline`
  46.221 ms · `mainThreadRuntimeBytes` 2,063,040 bytes). 직전 commit의 측정이 없어 이 변경의 영향은 이 기록으로
  판정되지 않습니다.
- 후속: 이 변경의 메모리 영향을 가리려면 직전 commit `444fcfd6`을 같은 Xcode · 같은 시나리오로 한 번 재어
  `mainThreadRuntimeBytes`를 나란히 놓습니다. Android의 누름 → 응답 왕복 시간은 Android 수집 경로가 생긴 뒤에 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
