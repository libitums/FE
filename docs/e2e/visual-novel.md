# 카페 도착 비주얼 노벨 — iOS Release 수동 e2e

## 판정 채널과 적용성

이 흐름은 브라우저 자동화가 아니라 기존 iOS Release Host에서 수행하는 수동 E2E다.
저장소 profile에는 `test.e2e` 명령과 iOS image crop·Dynamic Type·VoiceOver를 판정할
runner가 없다. 따라서 **자동 E2E: not applicable (runner/command 없음)**이며 자동 unit/UI/
integration 결과로 대체하지 않는다. 수동 iOS Release 절차는 **applicable**이다.
2026-09-10에는 Simulator에서 Release Host build·install·launch, 자산 패키징, 클릭 기반
F1–F6, 기본·최대 Dynamic Type을 실행했다. 실제 iPhone과 VoiceOver는 요청 범위에서
제외했으며 자동 계층 결과로 해당 실기기 판정을 대체하지 않는다.

## 실행 전 증거

동일한 Release 산출물로 한 회차를 수행하고 다음을 기록한다.

| 증거 | 기록 |
|---|---|
| 소스 identity (커밋 또는 재현 가능한 revision) | 미기록 — 실행 시 입력 |
| iOS Host.app SHA-256 | 미기록 — 실행 시 입력 |
| `main.lynx.bundle` SHA-256 | 미기록 — 실행 시 입력 |
| 기기·iOS·빌드 종류 | iPhone 13 mini / iPhone 17 Pro · iOS 버전 입력 · Release |
| 확인자·확인 시각(시간대 포함) | 미기록 — 실행 시 입력 |

두 기기에서 각각 기본 글자 크기와 최대 Dynamic Type을 준비한다. VoiceOver 판정은 반드시
실제 iPhone에서 수행하며 Simulator 결과로 대체하지 않는다.

## 기능 여정

완료 기록이 없는 새 앱 세션에서 시작한다. 각 행의 결과는 `통과` 또는 `실패: <관찰>`로만
기록한다.

| ID | 단계와 관찰 기준 | 결과 |
|---|---|---|
| F1 | 여정 맵에서 순서가 기존 표준 스텝 → 메신저 → 전화 → `카페에 도착한 지민` → `길 묻기`인지 확인한다. 전화 뒤, 길 묻기 앞의 `journey-map-visual-novel-cafe-arrival-visual-novel` 항목을 탭해 `visual-novel-screen`이 열리고 제목이 `카페에 도착한 지민`인지 확인한다. 진입 전후 일반 스텝·메신저·전화 상태와 `completedStepCount`가 동일해야 한다. | 통과 — Simulator Release |
| F2 | 첫 화면에서 `arrive`·`장면 1 / 3`, 배경 `cafe-exterior-day`, `jimin-neutral`, 화자 `지민`, 대사 `여기가 우리가 만나기로 한 카페예요.`를 확인한다. 명시적 `다음`만 탭해 `find`로 한 칸 진행하고, `장면 2 / 3`, `jimin-smile`, `2번 출구 오른쪽이라 금방 찾았죠?`를 확인한다. | 통과 — Simulator Release |
| F3 | `find`에서 `다음`을 탭하는 동일 전이에서만 `enter`가 나타나고 최초 완료가 기록되는지 확인한다. `장면 3 / 3` 대신 계약 표시 `이야기 완료`, 대사 `그럼 들어가서 같이 주문해 봐요.`, 완료 맵 상태를 확인한다. 첫 진입 또는 `arrive`/`find`에서는 완료가 없어야 한다. | 통과 — Simulator Release |
| F4 | `find`에서 `맵으로`로 나가 재진입한다. 미완료 진행이 마지막 도달 beat에서 재개되는지 확인한다. 완료 후 나가 재진입하면 `enter`·`이야기 완료`·완료 상태가 즉시 보여야 한다. | 통과 — Simulator Release |
| F5 | 완료 화면에서 `처음부터 보기`를 탭한다. 화면만 `arrive`로 돌아가고 완료 기록과 최원점 `enter`가 유지되는지 확인한다. replay 중 `맵으로`로 나갔다 재진입하면 `enter`·완료 상태로 돌아오며 재완료가 발생하지 않아야 한다. | 통과 — Simulator Release |
| F6 | F1 전후 및 F3/F5 후를 비교한다. 일반 스텝의 상태·열림, 메신저 완료/세션/이벤트, 전화 완료/세션/오디오가 모두 그대로인지 확인한다. 비주얼 노벨 완료가 일반 진행 수나 다른 유닛을 바꾸면 실패다. | 통과 — 맵 UI 상태 직접 확인, 이벤트·오디오는 integration 검증 |

## 자산·레이아웃·Dynamic Type (r1 — 머리 재배치, LIB-255 §2.9 · design §6.3 2회차)

**머리 구조가 바뀌었다.** 나가기(`맵으로`)가 더 이상 화면 위에 절대 배치되지 않고, 메신저·전화와
같은 모양으로 머리 행의 **첫 흐름 자식**이 됐다. 제목과 진행은 나가기 옆의 제목 묶음
(`visual-novel-header-text`) 안에 세로로 서고, 제목의 고정 여백(`calc(spacing-96 +
spacing-16)`)은 지워졌다. 이 절의 관찰 기준은 그 새 머리를 기준으로 한다.

**D1 상당 판정 — 두 기기 모두 AX5까지 겹침 0.** Dynamic Type을 기본에서 최대(AX5,
`accessibility-extra-extra-extra-large`)까지 올리며 여정에서 연 화면의 나가기 `맵으로`와
제목 · 진행 글자의 겹침을 본다. **두 기기(iPhone 13 mini · iPhone 17 Pro) 모두 AX5까지 겹침이
0인지를 판정한다** — `roleplay-list.md`의 D1과 같은 조건, 같은 구조(design §6.3.3의 기하 — 흐름
형제는 서로를 침범하지 않고, 나가기는 줄지 않고, 제목은 나가기 반대쪽으로만 줄바꿈한다)이고 두
경로 공통이므로 여정 쪽이 롤플레이 쪽(`목록으로`, 네 글자)보다 여유가 크다(design §6.3.3 표 —
`맵으로`는 세 글자). 나가기는 머리 행의 첫 자리에 서고 눌리는지도 함께 확인한다. 결과는 `통과`
또는 `실패: <기기 · 배율 · 관찰>`만 쓴다.

**배경 crop·focal point·캐릭터·대사 패널 재확인.** 머리가 자라거나 줄어든 만큼 장면 셸의
세로 크기가 바뀌므로(design §6.3.5 — 기본 배율에서 머리 49 → 81로 자라 장면 셸이 줄고, 최대
배율에서는 머리가 낮아져 장면 셸이 커진다) 아래 항목을 새 머리에서 **다시 확인한다**:

- 배경(`visual-novel-background-cafe-exterior-day`)이 화면에 맞게 중앙 focal point
  `(0.5, 0.44)`를 유지하는 3:5 crop인지, 중요한 간판/단서가 중앙 인물 영역이나 dialogue
  overlay에 잘리지 않는지.
- 캐릭터가 같은 크기·발 위치·의상/identity로 보이고 neutral→smile pose가 정확히 바뀌는지 —
  장면 셸이 줄어드는 기본 배율에서 캐릭터가 화면에서 조금 내려오거나(폭이 크기를 정할 때)
  작아지는지(높이가 크기를 정할 때) 확인한다.
- 대사 패널(바닥 기준 절대 배치)이 자리는 그대로이되 캐릭터 아랫부분을 이전보다 조금 더
  덮는지(기본 배율) 확인한다.

각 이미지가 로드되기 전 또는 로드 오류를 별도 회차로 유도해 확인한다. 실패한 layer만
숨고 token fallback 면·대사·현재 action은 즉시 유지되며 조작 가능해야 한다. 배경 PNG는
1290×2150 sRGB RGB/RGBA이고 모든 pixel alpha가 255, 캐릭터 PNG 두 개는 1536×2048 sRGB
RGBA이며 배경 완전 투명이어야 한다. 가장자리의 premultiplied black/white fringe, 반투명
배경 잔여물, 잘못된 embedded color profile이 없어야 한다. 네트워크나 runtime 이미지 생성
요청이 관찰되면 실패다.

기본 및 최대 Dynamic Type에서 모든 대사와 `다음`/`맵으로`/`처음부터 보기`에 도달하고,
텍스트가 잘리거나 고정 액션을 가리지 않는지 확인한다. 두 기기 모두 결과를 별도로 적는다.

## VoiceOver 여정 (r1 — 기대 순서 변경, LIB-255 §2.9.3)

실제 iPhone에서 VoiceOver를 켜고 화면을 처음부터 한 손가락 순회한다. **기대 순서가 바뀌었다
— `맵으로` → 제목 → 진행 → `지민, <현재 대사>` 한 접근성 단위 → 현재 action.** 나가기가 먼저
읽힌다(메신저·전화와 같은 순서, r1). 기본·최대 배율의 순서를 **둘 다** 적는다 — VoiceOver는
프레임 위치로 순회하므로 가로 행에서 순서가 뒤집힐 수 있다(ADR-0023 규칙 3의 이유,
`docs/e2e/sentence-order.md`). 이 화면의 안 B(제목 묶음 top이 나가기 top보다
`spacing-12` 아래, 어느 배율에서도 유지)는 기본·최대 배율 모두 DOM 순서(`맵으로` → 제목 →
진행)와 낭독 순서가 같은 것을 전제로 한다 ⟨코드 판단⟩ — 실기로 확인한다.

배경과 캐릭터 이미지는 장식으로 순회되지 않아야 한다. 제목은 header, 조작은 button 역할과
계약 이름으로 읽혀야 하며 `맵으로` → 제목 → 진행 → 현재 대사·`다음`의 순서가 beat 전환에도
유지되어야 한다. `find`에서 `다음`을 활성화해 `enter`가 처음 나타나는 순간 `이야기 완료`가
한 번만 announcement 되고 자동 focus 이동은 없어야 한다. 완료 후 순회로 마지막 대사를 다시
들을 수 있고 replay/재진입에서 완료 announcement가 다시 나지 않는지 기록한다.

## 회차 결과와 증거 캡처

| 환경 | Host / bundle SHA-256 | F1–F6 | 자산/crop/fallback | Dynamic Type | VoiceOver | 비고 |
|---|---|---|---|---|---|---|
| iPhone 13 mini · iOS 미기록 · Release | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 실행 시 입력 |
| iPhone 17 Pro · iOS 미기록 · Release | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 실행 시 입력 |

캡처에는 맵 순서와 상태, 각 beat의 화면/대사, 완료·replay 재진입, Dynamic Type 최대 화면,
fallback 상태를 포함하고 파일명에 기기·OS·revision을 넣는다. VoiceOver는 화면 캡처만으로
증명하지 말고 announcement와 순서를 실행 기록(필요 시 오디오/관찰 로그)으로 남긴다.

`test-design.e2e.suite: completed`

## 2026-09-10 Simulator 보충 회차

> **주석(LIB-255 r1, 2026-09-15).** 이 회차는 옛 머리 모양(나가기 절대 배치 + 제목 고정 여백
> `calc(spacing-96 + spacing-16)`)을 관측한 것이다. 그 모양은 LIB-255 r1(design §6.3 2회차 ·
> spec §2.9)로 바뀌었다 — 나가기가 머리 행의 첫 흐름 자식이 되고 고정 여백은 지워졌다. 아래
> 기록·값은 그대로 두고(이력), 새 머리에서의 판정은 위 「자산·레이아웃·Dynamic Type」·
> 「VoiceOver 여정」 절과 「회차 결과와 증거 캡처」 표의 새 회차가 진다.

| 증거 | 기록 |
|---|---|
| 소스 identity | `a866aa9b26add2d4810064fbd0a8ef40b8772f8a` 위 `LIB-254/visual-novel-unit` 미커밋 변경 |
| 환경 | iPhone 17 Pro Simulator · iOS 26.5 · Release · Xcode 26.6 |
| Host 실행 파일 SHA-256 | `4643fcaa2294ef542aab791c08ece64a8b0102194f0357e39eaaa87ebfb3a43b` |
| `main.lynx.bundle` SHA-256 | `41b0adf1dc016b914d7ad8aee14c445c4cf6e3822822649918c00594d0b8a5a1` — source/Host.app 일치 |
| 임시 PNG | 세 파일 모두 source → `dist/static/image` → `Host.app/Resource/static/image` SHA-256 일치 |
| Native Host tests | 7 passed, 0 failed |
| Release build/install/launch | 통과 |
| 기본 Dynamic Type | 통과 · F1–F6 전체 여정과 자산 렌더링 확인 |
| 최대 Dynamic Type | 통과 · `accessibility-extra-extra-extra-large`에서 세 beat의 제목·진행·대사·액션·이미지 확인 |
| F1–F6 클릭 수동 여정 | 통과 — Release Simulator에서 맵 순서, beat 전이, 완료, 재개, replay, 다른 유닛 격리 확인 |
| VoiceOver | 제외 — 실제 iPhone 전용 판정 |

Release 패키징 smoke에서 `main.lynx.bundle`은 `static/image/*.png` 세 경로를 참조했지만 기존
Host resources에 `Resource/static/`이 없고 scene URL에도 Lynx iOS의 `Resource/` 접두사가
없다는 결함을 발견했다. `bundle:host`가 산출물의 `static/`을 `Resource/static/` 아래로
복사하고 Xcode Host target이 폴더를 resource로 포함하며 artwork resolver가 `Resource/`
URL을 내도록 고친 뒤, Release `Host.app` 안 세 PNG의 해시 일치를 확인했다.

최대 Dynamic Type 회차에서 제목과 `맵으로`의 겹침, 대사·액션 영역 잘림을 발견했다.
제목 여백과 대사 영역의 viewport 기반 최대 높이를 조정한 뒤 세 beat를 다시 확인해 제목,
진행, 전체 대사, 현재 action과 이미지가 겹치거나 잘리지 않는 것을 확인했다.

`requested_scope_complete: true` — 실기기·VoiceOver를 제외한 Simulator Release 수동 범위와
자동 검증을 완료했다.

`e2e_complete: false` — 원래 문서가 요구하는 실제 iPhone·VoiceOver 회차는 요청 범위에서
제외되어 실행하지 않았다.

`changed-files: docs/e2e/visual-novel.md`

`applicability: automated e2e not applicable (no runner/command); Simulator Release packaging and F1–F6 passed; physical-device VoiceOver excluded from requested scope`
