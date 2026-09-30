# 민서 전화 프로필 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-30T17:51:25+09:00
- 상태: 측정 — 전화 화면을 직접 마운트한 격리 진입점의 초기 렌더링과 메모리 1회
- 기능 PR: [민서 프로필 전용 이미지로 교체 #182](https://github.com/libitums/FE/pull/182)
- 대상 commit: `d35487ca70cacd7cc46bc0160267deccfcb08f56`
- 기기: iPhone 17 Pro, Apple Silicon iOS Simulator
- OS: iOS 26.5, 호스트 macOS 26.5.1
- Lynx SDK: 4.0.1 — 저장소 Podfile.lock 기준
- 빌드: 설치된 Debug Host의 복사본에 Rspeedy production 모드의 격리 화면 번들과 정적
  이미지를 넣어 별도 앱 식별자로 실행. 네이티브 Host는 이번 commit에서 재빌드하지 않았다.
- 실행 회차: 01

## 시나리오

1. 해당 commit의 `PhoneCallScreen`과 `getPhoneCallConversation()`을 사용한다.
2. 로컬에서만 앱 진입점을 `GlobalPropsProvider`와 `.app` 셸 아래 전화 화면을 직접
   마운트하도록 임시 교체한다. `completionStatus="available"`을 전달하고 종료·완료
   콜백은 무동작으로 둔다. 제품과 동일한 토큰·컴포넌트 CSS를 가져온다.
3. `pnpm --filter @libitums/mobile build`로 격리 번들을 만든 뒤 원래 진입점을 복구한다.
   임시 진입점은 커밋하지 않는다.
4. 기존 Host와 분리한 측정용 앱에 번들과 `Resource/static`을 포함하고
   `--performance-capture --bundle-url=main.lynx`로 한 번 실행한다.
5. 최초 화면 로드와 `after-initial-load` 메모리 수집 완료까지 관찰한다. 전화 시작이나
   답장 입력은 하지 않는다. 수집 파일은 저장소의 `performance:report` 분석기로 검증한다.
6. 시뮬레이터 화면에서 새 프로필 이미지가 원형 틀에 로드되고 얼굴과 어깨가 표시됨을 확인한다.

## 분석 결과

| 항목 | 측정값 |
| --- | ---: |
| lynxFcp | 142.995 ms |
| fcp | 143.352 ms |
| LoadBundle | 57.899 ms |
| parse | 3.764 ms |
| loadBackground | 7.901 ms |
| pipeline | 143.020 ms |
| MTS render | 6.751 ms |
| resolve | 5.772 ms |
| layout | 28.520 ms |
| painting UI operation | 7.432 ms |
| layout UI operation | 3.072 ms |

최초 로드 뒤 메모리 수집은 completed, instance 1/1, 수집 시간 1 ms였다.

| 메모리 항목 | 측정값 |
| --- | ---: |
| totalBytes | 618,928 bytes |
| elementBytes | 48,880 bytes |
| viewBytes | 28,928 bytes |
| mainThreadRuntimeBytes | 541,120 bytes |
| backgroundThreadRuntimeBytes | 0 bytes |
| appBytes | 38,095,176 bytes |
| elementNodeCount | 47 nodes |

새 JPEG는 512×512, 99,907 bytes다. 격리 진입점으로 바꾸기 전에 검증한 제품 번들은
1,342,393 bytes이며, 관련 UI 테스트 19개와 모바일 production 빌드가 완료되었다.

## 해석

단일 시뮬레이터 실행이며 변경 전 동일 조건의 비교 측정이 없다. 성능 개선·회귀 여부나
실기 성능을 판정할 수 없다. FCP는 이미지 디코딩 완료 시간을 따로 측정한 값이 아니다.
메모리는 최초 로드 직후 한 번만 수집했으므로 잔류 증가와 누수도 판정할 수 없다.
backgroundThreadRuntimeBytes의 0은 수집 결과 그대로이며 JS 런타임 비용이 없다는 뜻이 아니다.

격리 번들은 제품 전체 탐색 경로를 생략하므로 제품의 콜드 스타트 수치로 일반화하지 않는다.
기반 main의 연락처 표기는 Jimin이며 민서 이름 변경은 별도 작업이다. 원래 App의 safe-area
처리도 재현하지 않아 화면 상단 여백은 이 확인의 대상이 아니다. 프로필 리소스와 해당 화면의
223×223 원형 크롭만 시각적으로 확인했다. 네이티브 Host 재빌드도 생략했으므로 제품 Release
Host의 성능 판정 근거로 사용할 수 없다.

## Trace 후속 확인

- render: 초기 로드 단계 수치만 수집했다. 이미지 디코딩 구간과 업데이트 trace는 미측정이다.
- fluency: 스크롤·통화 조작 구간을 실행하지 않아 프레임 유창성은 미측정이다.
- memory: before/peak/after 비교와 Allocations·Leaks 검사는 수행하지 않았다.
- NativeModule: 음성 재생을 실행하지 않아 호출 지연과 정리 동작은 측정 대상 밖이다.

## 결론과 후속

- 새 프로필이 원형 프레임에 표시됨을 확인하고, 같은 화면의 초기 렌더링과 완전한 메모리
  스냅샷을 1회 수집했다. 성능 예산 판정은 하지 않았다.
- 성능 비교가 필요하면 동일한 Release Host·제품 진입 경로로 변경 전후를 반복 측정하고
  이미지 디코딩과 before/peak/after 메모리를 추가 확인한다.

## 정제 확인

- 원본 JSON/NDJSON과 화면 캡처를 커밋하지 않았다.
- 로컬 절대 경로, 계정 이름, 기기 식별자와 원시 timestamp 끝점을 제거했다.
- 단일 격리 측정을 제품 성능 통과 또는 비교 기준으로 주장하지 않았다.
