# 약속 확인 전화 — iOS Release 수동 e2e

## 판정 채널과 범위

이 문서는 `appointment-confirmation-phone-call`을 iOS Release Host와 실기기에서 확인하는
수동 functional·VoiceOver e2e 절차다. 실제 전화, 녹음, 음성 인식, 런타임 TTS와 물리 기기
성능 측정은 범위 밖이다.

이 문서를 작성한 시점에는 Release Host build·install·launch가 아직 완료되지 않았다. 따라서
아래 F1–F9와 V1–V5의 실제 관찰 결과는 모두 **미실행**이며, `e2e_complete`와
`performance_complete`도 모두 `false`다. 자동 테스트나 번들 빌드 성공을 수동 관찰로
대체하지 않는다.

정확한 제품 문자열과 상태 계약은 [전화 특별 유닛 스펙](../specs/phone-call-special-unit.md),
테스트 ID는 `apps/mobile/src/screens/phone-call/phone-call.contract.ts`와
`.agent-harness/work/phone-call-unit/testids.md`를 정본으로 삼는다. 이 문서에 없는 이름이나
ID를 현장에서 새로 만들지 않는다.

## 실행 전 증거 고정

한 회차는 아래 값이 모두 채워진 **동일한 Release 산출물**로만 판정한다. 값이 비었거나
서로 다른 빌드에서 왔다면 F1을 시작하지 않는다.

| 증거 | 실행 회차 기록 |
|---|---|
| 소스 identity(커밋과 작업 트리 상태 또는 동등한 재현 식별자) | 미기록 — 실행 시 입력 |
| iOS Host.app SHA-256 | 미기록 — Release Host build 미완료 |
| `main.lynx.bundle` SHA-256 | `a4c891fc3e70a5e8aea4ad85bb639369b6dbad48c323d399060e1875620e5a39` — 새 번들, Host에 설치·실행되지 않음 |
| `phone-call-confirm-01.m4a` SHA-256 | 기대값 `5156b34e89cd7bf915c7113a636c1316a3ea9252d41085953ea04d295ed6b3db`; 실행 Host 관찰값 미기록 |
| `phone-call-confirm-02.m4a` SHA-256 | 기대값 `68b590380e9114a8de5f8c9cf84b430ee2bd89a12d79e9d3be5cf5428e091157`; 실행 Host 관찰값 미기록 |
| `phone-call-confirm-03.m4a` SHA-256 | 기대값 `1efd59d3b9117a7952bbe7aa568e872cb7b410f462176b5a203052edc7a149ce`; 실행 Host 관찰값 미기록 |
| 실기기 모델 · iOS 버전 | 미기록 — 실행 시 입력 |
| 빌드 종류 | Release |
| 확인자 · 확인 시각(시간대 포함) | 미기록 — 실행 시 입력 |

세 음원 기대값은
`.agent-harness/work/phone-call-unit/audio-preparation.md`의 복사 후 SHA-256과 같다. 실행자는
준비 문서의 값을 그대로 옮기는 데서 멈추지 않고, 실제 판정 Host가 포함한 파일의 해시를
위 관찰값 슬롯에 기록한다.

### Release Host 준비 상태

문서 이관 시점에는 Release Host build·install·launch가 아직 완료되지 않았다. Host 성공
SHA도 없다. 위 번들 SHA는 Host build·install·launch 성공의 증거가 아니다.

## 고정 3턴 대조표

각 음원은 중간을 건너뛰지 않고 최소 한 번 끝까지 듣고, 들린 말과 보이는 transcript가
아래 문장과 정확히 같은지 대조한다. 음원이 끝난 뒤에만 같은 행의 답장을 누른다.

| 턴 | audio source | 지민 transcript | 답장 버튼 이름 |
|---:|---|---|---|
| 1 | `phone-call-confirm-01` | `토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?` | `네, 토요일 오후 2시에 만나요.` |
| 2 | `phone-call-confirm-02` | `카페는 2번 출구 오른쪽에 있는 곳 맞죠?` | `네, 2번 출구 오른쪽 카페예요.` |
| 3 | `phone-call-confirm-03` | `좋아요. 그럼 토요일에 봐요!` | `네, 토요일에 봐요!` |

답장 직후 다음 턴 음성이 자동으로 나오는 횟수의 기대값은 매번 `0`이다. 첫 화면 진입의
자동 재생 기대값도 `0`이다.

## functional 수동 여정

F1–F5를 완료 기록이 없는 새 앱 세션에서 순서대로 수행한 뒤 F6–F9를 수행한다. 각 행의
결과에는 `통과` 또는 `실패: <관찰>`만 기록하고, 추정은 넣지 않는다.

| ID | 절차와 관찰 기준 | 결과 |
|---|---|---|
| F1 | 여정 맵에서 `약속 확인 메시지` → `약속 확인 전화` → `길 묻기` 순서를 확인한다. `journey-map-phone-call-appointment-confirmation-phone-call` 항목을 열고, 화면 진입만으로 음성이 재생되지 않아 자동 재생 횟수가 `0`인지 확인한다. 첫 화면은 `약속 확인 전화`, `지민`, `통화 준비`, 첫 transcript, `통화 시작`을 보이며 transcript 수는 1이다. | 미실행 |
| F2 | `통화 시작`을 누른다. `상대방이 말하는 중`과 `다시 듣기`가 보이고 답장은 아직 없는지 확인한다. 재생 중 `다시 듣기`를 한 번 눌러 첫 음원이 즉시 처음부터 다시 시작하고, 이전 재생과 겹치지 않는지 듣는다. 다시 시작한 음원을 끝까지 한 번 완전 청취하고 첫 transcript와 대조한다. 종료 뒤 `답장할 차례`와 첫 답장 하나가 나타나는지 확인한다. | 미실행 |
| F3 | 첫 답장을 누른다. transcript가 지민/나/지민 순서의 3개가 되고 조작 이름이 `듣기`인지 확인한다. 아무 조작 없이 기다려 다음 음성 자동 재생 횟수가 `0`인지 확인한다. `듣기`를 눌러 둘째 음원 재생 중 `맵으로`를 누른다. 앱 음성이 즉시 멈추고 맵 항목이 완료로 바뀌지 않는지 확인한다. | 미실행 |
| F4 | 전화 항목에 다시 진입한다. 미완료 세션이 첫 transcript 1개, `통화 준비`, `통화 시작`으로 초기화되고 자동 재생 횟수가 `0`인지 확인한다. | 미실행 |
| F5 | 세 턴마다 `통화 시작` 또는 `듣기`를 누르고 음원을 끝까지 한 번 완전 청취한다. 들린 대사와 transcript를 고정 3턴 대조표에 맞춘 뒤, 음원이 끝나 `답장할 차례`가 된 다음에만 해당 답장을 누른다. 첫째·둘째 답장 직후 transcript 수는 각각 3·5이고 다음 자동 재생은 각각 `0`이어야 한다. | 미실행 |
| F6 | 셋째 답장을 누른 직후에만 `통화 완료`가 되고 transcript가 지민/나 세 쌍, 총 6개인지 확인한다. `처음부터 보기`가 보이는지 확인한 뒤 `맵으로`로 나가 전화 항목의 이름이 `약속 확인 전화, 완료됨`으로 바뀌는지 확인한다. | 미실행 |
| F7 | 완료 항목에 재진입한다. `통화 완료`, transcript 6개, `처음부터 보기`가 즉시 보이고 음성이 자동 재생되지 않는지 확인한다. | 미실행 |
| F8 | `처음부터 보기`를 눌러 첫 transcript 1개와 `통화 시작`으로 돌아간다. `통화 시작`을 누르고 재생 도중 `맵으로`를 눌러 음성이 즉시 멈추는지 확인한다. 맵의 `약속 확인 전화, 완료됨`이 유지되고, 다시 진입했을 때 완료 상태와 transcript 6개가 복원되는지 확인한다. | 미실행 |
| F9 | F1 전과 F6 후의 일반 다섯 스텝 상태 및 메신저 항목 상태를 비교한다. 맵 순서는 계속 `첫 인사` → `이름 묻기` → `주문하기` → `약속 잡기` → `약속 확인 메시지` → `약속 확인 전화` → `길 묻기`여야 한다. 새 앱 세션의 일반 상태는 앞에서부터 `done`, `done`, `current`, `locked`, `locked`이고 메신저는 `available`이며, 전화 완료 뒤에도 각각 같아야 한다. 전화 완료가 `completedStepCount`나 메신저 완료 여부를 바꾸면 실패다. | 미실행 |

F2의 다시 듣기는 한 턴의 재생 재시작을 확인하는 절차이고, F5의 완전 청취 3회는 콘텐츠와
자산을 판정하는 절차다. 둘을 한 번의 부분 청취로 합치지 않는다.

## VoiceOver 수동 여정

동일한 Release Host를 실기기에서 실행하고 VoiceOver를 켠다. Simulator나 정적/UI 테스트는
이 판정을 대체하지 않는다. 자동 announcement나 임의 focus 이동은 기대하지 않는다.

| ID | 절차와 관찰 기준 | 결과 |
|---|---|---|
| V1 | 맵의 미완료 항목은 정확히 `약속 확인 전화`, 완료 항목은 정확히 `약속 확인 전화, 완료됨`으로 읽히며 둘 다 button 역할인지 확인한다. | 미실행 |
| V2 | 전화 화면 제목 `약속 확인 전화`가 header 역할, `맵으로`가 button 역할로 읽히는지 확인한다. 본문 포커스가 제목 → `지민` → 현재 상태 → 시간순 transcript → 현재 동작 순서로 이동하는지 확인하고, `맵으로`에도 도달할 수 있어야 한다. 포커스가 사라지거나 갇히거나 임의로 점프하지 않는지 기록한다. | 미실행 |
| V3 | 오디오 조작이 상태에 따라 정확히 `통화 시작`, `듣기`, `다시 듣기`라는 이름과 button 역할을 갖는지 확인한다. 세 답장은 고정 3턴 대조표의 문장 그대로 button 역할로 읽히고, 완료 조작은 `처음부터 보기`라는 이름과 button 역할인지 확인한다. | 미실행 |
| V4 | transcript가 시간순으로 각각 `지민, <지민 transcript>`와 `나, <답장>`이라는 정확한 이름과 text 역할로 한 번씩 읽히는지 확인한다. 1·3·5·6개로 늘어날 때 기존 항목이 중복 발화되거나 현재 포커스를 잃지 않는지 기록한다. | 미실행 |
| V5 | VoiceOver를 켠 채 오디오 조작을 활성화해 세 앱 음원을 각각 끝까지 듣는다. VoiceOver의 조작 이름·상태·transcript 발화와 앱 음성이 함께 사용 가능하고, 앱 음성이 겹쳐 재생되거나 조작 뒤 포커스가 사라지지 않는지 확인한다. `다시 듣기`와 재생 중 `맵으로`도 각각 재시작·즉시 정지로 동작하는지 확인한다. | 미실행 |

## 회차 결과 기록

| 환경 | Host SHA-256 | bundle SHA-256 | F1–F9 | V1–V5 | 비고 |
|---|---|---|---|---|---|
| 실기기 · iOS 미기록 · Release | 미기록 | `a4c891fc3e70a5e8aea4ad85bb639369b6dbad48c323d399060e1875620e5a39` | 미실행 | 미실행 | Host build·install·launch 미완료 |

`e2e_complete: false`. 실기 관찰자가 위 시작 증거를 모두 채우고 F1–F9와 V1–V5를 실제로
통과시키기 전에는 이 값을 `true`로 해석하지 않는다.

## 자동 검증과 상태 경계

`.agent-harness/work/phone-call-unit/evidence.yaml`은 계약 고정 시점의 **frozen snapshot**이다.
그 파일의 `runtime_behavior_changed: false`, `implementation_complete: false`,
`tests_complete: false`, `e2e_complete: false`는 당시 상태를 보존한 값이며, 현재 구현의 최종
상태와 섞거나 덮어쓰지 않는다.

별도의 최종 자동 검증 증거는
`.agent-harness/work/phone-call-unit/full-verify-03.log`이다. runner가 기록한 종료값 `0`을
보존하며, 그 한 회차의 실제 로그는 다음을 보인다.

- unit: 19 files, 484 tests passed
- UI: 27 files, 473 tests passed
- integration: 8 files, 87 tests passed
- report-policy: 49 tests passed
- format check, typecheck, lint: 명령 완료
- Lynx bundle build: 성공, `dist/main.lynx.bundle` 338.2 kB
- performance report policy gate: 통과

이 결과는 정적·자동 계층과 Lynx 번들 빌드의 결과다. 미완료 iOS Release Host
build·install·launch와 미실행 functional·VoiceOver 관찰을 통과로 바꾸지 않는다.

## 성능 상태

`performance_complete: false`. 물리 기기 성능은 이 절차의 범위 밖이며 전화 유닛에 대해
수집한 성능 측정은 `0`건이다. 현재
`docs/performance/reports/messenger-bundle-app-launch-iphone-17-pro-simulator-01.md`부터
`03.md`까지의 세 보고서는 메신저 번들 초기 로드에만 해당한다. 전화 유닛의 baseline,
회귀 없음, 실기 성능 통과 근거로 재사용하지 않는다. `performance:reports:gate` 통과는 보고서
정책 게이트 통과일 뿐 전화 성능 측정 완료가 아니다.
