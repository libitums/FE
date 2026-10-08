# 서사 배경 애니메이션을 감싸는 상자로 옮긴 뒤 튜토리얼 프롤로그 첫 장면 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-05T08:07:45Z ~ 08:10Z
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 설치하고 성능 캡처 모드로 **dev 서버의 playground 번들**(튜토리얼 프롤로그)을
  읽혀 초기 load의 Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 세션에서 이 변경 직전의 서사 배경 두 파일로
  바꿔 같은 수집을 반복했습니다.
- 기능 PR: Android에서 효과음 · 대사 오디오 · 서사 배경 그림이 빠지던 결함을 고친 변경(이 보고서와 같은 PR,
  [ADR-0045](../../adr/0045-android-host-audio-assets.md)). iOS에 닿는 것은 서사 배경의 마크업 · CSS뿐입니다.
- 대상 commit: `cb7dc6cdc05d62a6bdcf5205fca204ca2c303de3`
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만들고 끝에 삭제한 기기)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Host는 Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6. 번들은 내장 `main.lynx`가 아니라 `pnpm dev`(Rspeedy 개발
  서버)의 `playground.lynx.bundle`을 `--performance-capture`와 로컬 dev 서버 주소의 `--bundle-url`로 읽었습니다. playground의 첫 화면을 로컬에서만
  `tutorial-prologue`로 바꿨고(커밋하지 않고 되돌림) 개발 서버는 끝에 껐습니다.
- 실행 회차: 01 — 이번 변경 3회 · 직전 3회를 한 기록에 둡니다(같은 세션 · 같은 기기에서 나란히 잰 대조라 나누지 않았습니다).

## 시나리오

- 전제: 시뮬레이터에서는 로그인을 지날 수단이 없어(소셜 로그인만 보이고 개발용 세션 주입이 없습니다) Release 내장 번들로는 서사 화면에 닿지
  못합니다. 그래서 dev 전용 playground로 튜토리얼 「Before We Land」 프롤로그를 첫 화면으로 띄웠습니다(e2e 절차
  [E7](../../e2e/android-assets.md)과 같은 경로).
- 단계: 앱 종료 → 성능 캡처 모드로 실행 → 조작 없이 12초 → 스크린샷 → 캡처 파일을 `performance:report` 분석기로 읽음 → 앱 종료. 이것을
  이번 변경에서 3회 한 뒤, `NarrativeBackground.tsx` · `narrative-background.css` 두 파일만 직전 commit(`3c2ca6df`)의 내용으로 바꿔
  (dev 서버가 다시 빌드한 번들에 옛 클래스 이름이 들어 있고 새 이름이 없는 것을 확인) 같은 단계를 3회 했습니다. 끝에 두 파일을 되돌렸습니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 12초 시점 스크린샷은 여섯 회 모두 비행기 창
  그림과 첫 독백이 서 있었고, 이번 변경과 직전의 화면은 눈으로 구별되지 않았습니다.

⚠ **이 시나리오는 첫 장면(S1, 처음 마운트 · crossfade)만 봅니다.** 그림이 하나라 이전 그림 상자가 없고, 장면 전환(`imagination` · `reality`)에서
상자 둘이 동시에 도는 구간, 확대 애니메이션이 도는 동안의 프레임은 이 캡처에 없습니다.

## 이 변경이 무엇을 건드렸나

`NarrativeBackground`가 그림(`<image>`)을 `<view class="narrative-background-motion…">`로 감싸고, 그림에 걸던 다섯 애니메이션 클래스를
상자로 옮겼습니다(선택자 이름만 `-image-*` → `-motion-*`, 키프레임 · 시간 · easing 값은 그대로). 장면마다 새 그림 상자 하나, 전환 중에는 이전
그림 상자 하나가 늘어납니다. JS 상태 · 타이머 · 이벤트는 바뀌지 않았습니다. 효과음 · 오디오 변경은 Android 호스트에만 있습니다.

## 분석 결과

여섯 회 모두 캡처 레코드 둘(Rendering entry 하나 · Memory snapshot 하나), 분석기 종료 코드 0, snapshot `complete`(instances 1/1)입니다.

| 회차 | `pipeline` | `parse` | `mtsRender` | `layout` | `elementNodeCount` | `elementBytes` | `mainThreadRuntimeBytes` | `viewBytes` | `totalBytes` |
|---|---|---|---|---|---|---|---|---|---|
| 이번 변경 1 (설치 뒤 첫 실행) | 56.512 ms | 4.026 ms | 22.581 ms | 16.851 ms | 47 | 48,880 | 6,896,464 | 24,448 | 6,969,792 |
| 이번 변경 2 | 40.822 ms | 3.054 ms | 21.297 ms | 9.954 ms | 47 | 48,880 | 6,896,464 | 4,690,048 | 11,635,392 |
| 이번 변경 3 | 41.353 ms | 2.868 ms | 20.514 ms | 9.929 ms | 47 | 48,880 | 6,896,464 | 4,690,048 | 11,635,392 |
| 직전 1 | 40.013 ms | 3.013 ms | 20.899 ms | 9.678 ms | 46 | 47,840 | 6,896,096 | 4,690,048 | 11,633,984 |
| 직전 2 | 39.469 ms | 2.851 ms | 20.299 ms | 9.861 ms | 46 | 47,840 | 6,896,096 | 4,690,048 | 11,633,984 |
| 직전 3 | 43.376 ms | 2.697 ms | 21.106 ms | 9.964 ms | 46 | 47,840 | 6,896,096 | 4,690,048 | 11,633,984 |

바이트 단위는 bytes입니다. `backgroundThreadRuntimeBytes`는 여섯 회 모두 0입니다.

## 비교

- 기준: 같은 세션 · 같은 Host · 같은 시뮬레이터에서 서사 배경 두 파일만 직전 commit으로 되돌린 3회(위 「직전」). 그 밖의 번들 내용은 같습니다.
- **element node가 46 → 47(+1), `elementBytes`가 +1,040 bytes, `mainThreadRuntimeBytes`가 +368 bytes**입니다. 세 회씩 모두 같은 값이라 회차
  흔들림이 아니고, 첫 장면에서 늘어나는 요소가 새 그림 상자 하나인 것과 맞습니다. 이 차이는 이 변경에 귀속합니다.
- `viewBytes`(따라서 `totalBytes`)는 둘째 회부터 양쪽이 4,690,048 bytes로 같습니다. 이번 변경 1회차만 24,448 bytes인데, 새 시뮬레이터에 설치한
  뒤 첫 실행이라 수집 시점에 그림 디코드가 끝나지 않았던 것으로 보이며 확인하지 않았습니다. 이 회차는 비교에서 뺐습니다.
- 렌더 시간: 첫 회를 뺀 이번 변경 두 회(`pipeline` 40.8 · 41.4 ms)는 직전 세 회(39.5 ~ 43.4 ms)의 폭 안에 있습니다. 회차가 적어 차이의 방향을
  말할 수 없습니다.

## 해석

이 기록의 수치는 **dev 번들**에서 나왔습니다. dev 번들은 압축 · 최적화되지 않았고 HMR 런타임과 playground 셸이 얹혀 있어, 같은 화면을 Release
내장 번들로 띄운 값과 크기 · 시간이 다릅니다 — 절대값을 다른 보고서의 앱 실행 수치와 나란히 놓지 않습니다. 이 보고서에서 쓸 수 있는 것은 같은
dev 번들 조건에서 두 파일만 바꾼 **차이**입니다.

그 차이는 첫 장면에서 element 하나(약 1 kB)와 main thread runtime 368 bytes입니다. 렌더 시간의 변화는 회차가 적어(첫 회 제외 2회 대 3회) 판정할 수
없습니다. 장면 전환 구간(상자 둘)과 애니메이션 중 프레임은 재지 않았습니다.

수치의 분산, 실제 기기 체감, Release 내장 번들에서의 값, Android에서의 결과(이 변경이 그림을 보이게 만든 플랫폼입니다), 다른 iOS · 기기에서의
결과를 일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. 첫 장면 초기 load만 봤습니다.
- fluency: 미측정 — 6초 확대 drift와 `imagination` · `reality` 전환(이전 그림 상자 · 새 그림 상자 · 베일이 함께 도는 구간)의 프레임은 이 캡처가
  재지 않습니다. 애니메이션 대상이 그림에서 같은 크기의 상자로 옮겨 합성 비용이 달라졌는지는 Trace로만 볼 수 있습니다.
- memory: `after-initial-load` 하나뿐입니다. 전환 중 최대치는 재지 않았습니다.
- NativeModule: 해당 없음 — iOS에서 이 변경은 NativeModule을 더하거나 바꾸지 않았습니다.

## 결론과 후속

- 결론: 서사 배경 애니메이션을 감싸는 상자로 옮긴 대상 commit에서 iOS 튜토리얼 프롤로그 첫 장면의 초기 load를 dev 번들로 3회, 같은 조건의 직전
  상태를 3회 수집했습니다. 첫 장면 element node +1(46 → 47) · `elementBytes` +1,040 bytes · `mainThreadRuntimeBytes` +368 bytes가 결정적으로
  나타났고, 렌더 시간은 같은 폭 안에 있어 판정하지 않았습니다.
- 후속: Release 내장 번들로 서사 화면에 닿는 경로(시뮬레이터 세션 주입)가 생기면 같은 장면을 그 조건으로 다시 잽니다. 전환 구간의 프레임은
  Trace로 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
