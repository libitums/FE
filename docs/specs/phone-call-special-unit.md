# 약속 확인 전화 특별 유닛 스펙

상태: 요구사항 승인 및 계약 고정 완료, 제품 구현 전

## 1. 목적

사용자가 지민의 약속 확인 음성을 직접 재생해 듣고 정해진 답장으로 3턴 대화를
완주한다. 기존 모바일 Lynx Host 지원 범위를 유지하며 브라우저 화면이나 새 OS 하한을
추가하지 않는다.

## 2. 요구사항 슬롯

| 슬롯 | 고정 내용 |
|---|---|
| `goal` | 수동 재생하는 약속 확인 전화 3턴을 정해진 답장으로 완주 |
| `target` | 기존 앱 사용자와 기존 mobile Lynx Host 지원 범위 |
| `design_ref` | ADR-0014의 토큰 소비 규칙과 ADR-0015의 내장 요소·CSS 규칙 |
| `scope_in` | 전화 특별 항목, 고정 3턴, 로컬 임시 음원, 수동 듣기·다시 듣기, 완료·재진입·replay, 접근 가능한 transcript |
| `scope_out` | 실제 전화·녹음·인식·서버·AI·런타임 TTS·pause·상세 오류 UI·telemetry·영속 저장 |
| `acceptance_criteria` | 아래 10개 기준 |
| `measurement` | 없음. 이벤트, sink, API를 만들지 않음 |

필수 슬롯 7/7이 채워졌고 미승인 추론과 미해결 모순은 없다.

## 3. 배치와 불변 조건

- 기술 ID는 `appointment-confirmation-phone-call`, 제목은 `약속 확인 전화`다.
- 기존 메신저 `appointment-confirmation` 바로 뒤, 일반 `directions` 앞에 둔다.
- 비공개 맵 순서는 `standard(첫 네 스텝) → messenger → phone-call → standard(directions)`다.
- `journeySteps`의 기존 다섯 일반 스텝과 순서는 변하지 않는다.
- 전화 완료는 별도 `completedPhoneCallUnitIds` 메모리 상태가 소유한다.
- `completedStepCount`, 일반 `done/current/locked`, 메신저 완료·이벤트 계약은 변하지 않는다.
- App 재시작 뒤 전화 완료는 초기화된다. API와 영속 저장은 없다.

## 4. 고정 콘텐츠

상대 ID/이름은 `jimin`/`지민`이다.

| 순서 | turn ID | 지민 transcript | reply ID | 정해진 답장 | audio source |
|---:|---|---|---|---|---|
| 0 | `confirm-time` | 토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠? | `confirm-time-reply` | 네, 토요일 오후 2시에 만나요. | `phone-call-confirm-01` |
| 1 | `confirm-place` | 카페는 2번 출구 오른쪽에 있는 곳 맞죠? | `confirm-place-reply` | 네, 2번 출구 오른쪽 카페예요. | `phone-call-confirm-02` |
| 2 | `goodbye` | 좋아요. 그럼 토요일에 봐요! | `goodbye-reply` | 네, 토요일에 봐요! | `phone-call-confirm-03` |

제품 데이터의 단일 정본은 구현 단계의 `screens/phone-call/phone-call.ts`에 한 번만
두고 `getPhoneCallConversation(): PhoneCallConversation`으로 읽는다. 현재 전화 콘텐츠는
하나뿐이므로 ID 인자를 받거나 복수 버전을 추상화하지 않는다.
음원은 extensionless source에 대응하는 bundle `.m4a` 세 개이며, 각 지민 transcript를
기존 로컬 `say` + `afconvert` Yuna 흐름의 입력으로 사용한다. 앱 런타임 TTS가 아니다.

## 5. 상태와 순수 로직 계약

세션 상태는 다음 discriminated union이다.

- `ready(turnIndex)`: 아직 현재 음원 재생을 요청하지 않은 상태
- `playing(turnIndex)`: 현재 재생 요청이 진행 중인 상태
- `reply-ready(turnIndex)`: 현재 고정 답장 하나를 선택할 수 있는 상태
- `completed`: 세 번째 답장을 완료한 상태

구현 scaffold는 다음 순수 함수를 제공한다.

| 함수 | 고정 시그니처와 결과 |
|---|---|
| `getPhoneCallConversation()` | 제품 코드 한 곳의 고정 `PhoneCallConversation`을 반환 |
| `initialPhoneCallSessionState(status)` | available은 ready(0), completed는 completed |
| `phoneCallSessionReducer(state, action)` | 아래 전이표를 적용하고 유효하지 않은 action은 같은 참조 |
| `visiblePhoneCallEntries(conversation, state)` | 현재 지민 대사까지와 이미 누른 답장; completed는 6개 |
| `currentPhoneCallTurn(conversation, state)` | completed 외 현재 turn |
| `currentPhoneCallReply(conversation, state)` | reply-ready에서만 현재 reply, 나머지는 null |
| `phoneCallStatusLabel(state)` | 통화 준비 / 상대방이 말하는 중 / 답장할 차례 / 통화 완료 |
| `phoneCallPlayLabel(state)` | 첫 ready는 통화 시작, 다음 ready는 듣기, playing/reply-ready는 다시 듣기, completed는 null |
| `phoneCallExitOutcome(state)` | completed만 completed, 나머지는 incomplete |
| `completePhoneCallUnit(ids, id)` | 없으면 한 번 추가, 이미 있으면 같은 참조 |
| `phoneCallCompletionStatus(ids, id)` | 포함 여부를 completed/available로 반환 |

전이는 다음과 같다.

- ready 또는 reply-ready의 `play`는 playing으로 간다.
- playing의 다시 듣기는 `stopAudio()` 뒤 같은 source를 다시 요청하며 playing을 유지한다.
- 현재 요청의 callback은 `audio-settled`를 보내 reply-ready로 간다.
- `playAudio`가 즉시 `unavailable`을 반환하면 `audio-unavailable`로 reply-ready에 가서
  transcript만으로 답장을 계속할 수 있게 한다. 재생 성공으로 표시하거나 상세 오류 UI를
  만들지는 않는다.
- reply-ready의 `reply`는 다음 turn의 ready로 가며, 셋째 답장만 completed로 간다.
- completed의 `replay`는 ready(0)으로 간다. 완료 ID는 제거하지 않는다.

첫 진입의 visible entry 수는 1, 각 답장 뒤 다음 turn에서는 3과 5, 완료에서는 6이다.
미완료 상태에서 화면을 나갔다 다시 들어오면 ready(0), 완료 뒤 재진입하면 6개 전체와
완료 상태를 보인다.

## 6. 오디오 경계

- 화면 진입과 turn 변경만으로 재생하지 않는다.
- 기존 `playAudio(source, onFinished)`와 `stopAudio()`만 사용한다.
- `started`는 playing을 유지하고 callback을 기다린다.
- `unavailable`은 callback이 오지 않으므로 위의 transcript-only 전이를 즉시 적용한다.
- 기존 helper가 세대 번호로 오래된 callback을 무시한다. 화면은 별도 중복 token을
  만들지 않고, 다시 듣기와 unmount/이탈 때 `stopAudio()`를 호출한다.
- callback은 정상 종료와 파일/재생 실패를 구분하지 못하므로 성공 메시지나 오류 판정을
  파생하지 않는다.
- pause/resume와 상세 오류 상태가 필요하면 native 결과 타입과 테스트를 별도 승인한다.

## 7. 컴포넌트 계약

`phone-call.contract.ts`가 고정한 단순 props를 사용한다.

| 컴포넌트 | 책임 |
|---|---|
| `PhoneCallMapItem` | available/completed 맵 표면과 선택 ID 전달 |
| `PhoneCallScreen` | 화면 수명의 세션, 오디오 경계, transcript, 완료 전이 조정 |

transcript, 오디오·답장·replay 버튼은 `PhoneCallScreen` 내부 표면으로 유지하며 별도
public 컴포넌트나 props 계약으로 고정하지 않는다.

boolean 모드 props, compound context, ref, render prop, audio port prop, telemetry prop을
추가하지 않는다. 고정된 작은 화면은 명시적 variant와 discriminated state로 표현한다.

## 8. 맵·내비게이션 연결 경계

계약 파일은 향후 연결할 `PhoneCallJourneyUnitContract`,
`PhoneCallJourneyMapItemContract`, `PhoneCallNavigationScreenContract`를 별도
타입으로 내보낸다. 이번 고정 단계에서는 기존 `JourneyUnit`과 `Screen` union을 확장하지
않는다. 런타임 데이터가 없는 상태에서 discriminant만 먼저 늘리면 기존 App의 exhaustive
분기가 깨지므로, 실제 맵 데이터·App 화면 분기·완료 메모리를 추가하는 구현 단계에서
한 단위로 연결한다.

## 9. 접근성 및 테스트 ID

- 제목 `약속 확인 전화`는 header 역할로 읽힌다.
- 맵 항목, 오디오, 답장, replay, 나가기 조작은 정확한 이름과 button 역할을 가진다.
- 읽기 순서는 제목 → 지민 → 상태 → transcript 시간순 → 현재 동작이다.
- transcript는 오디오 사용 가능 여부와 관계없이 항상 보인다.
- 자동 accessibility announcement와 임의 focus 이동을 추가하지 않는다.
- 정적/UI 테스트는 이름·역할·순서를 검증하지만 음성과 화면 읽기의 실제 충돌 부재를
  자동으로 통과했다고 주장하지 않는다.

테스트 ID 정본은 타입의 `PhoneCallTestId`와
`.agent-harness/work/phone-call-unit/testids.md`다.

## 10. 수용 기준

1. 전화 항목은 메신저 뒤, directions 앞에 있고 언제든 열 수 있다.
2. 첫 진입은 지민, 통화 준비, 첫 transcript, 통화 시작을 보이며 자동 재생하지 않는다.
3. 통화 시작·듣기·다시 듣기만 현재 source의 재생을 요청하고 이탈은 stop한다.
4. callback 전에는 답장할 수 없고 callback 뒤 현재 답장 하나만 제공한다.
5. 고정 3턴 순서를 지키며 셋째 답장 탭에서만 완료를 한 번 기록한다.
6. 미완료 재진입, 완료 재진입, replay가 5절의 상태 계약을 따른다.
7. 일반 여정과 기존 메신저 완료·이벤트 계약은 변하지 않는다.
8. 현재 오디오 API 위에서 성공·오류 메시지를 만들지 않고 transcript 경로를 유지한다.
9. 이름·button/header 역할과 읽기 순서를 UI 테스트로 고정한다.
10. 제외 범위 기능과 이벤트·API·영속 저장이 추가되지 않는다.

## 11. 구현 및 검증 분해

1. 순수 데이터·상태 helper와 unit red/green.
2. 화면 컴포넌트와 UI red/green.
3. 맵·navigation·App 완료 메모리 연결과 integration red/green.
4. 로컬 임시 음원 생성 및 bundle source 확인.
5. 타입체크·lint·build·manual E2E 문서 절차 확인.

계층별 red 기대와 test ID는 비공개 작업 증거에 기록한다. 물리 기기 성능 측정은 하지
않으며, 이 문서는 제품 구현이나 E2E 완료를 뜻하지 않는다.

## 12. 계약 차이와 문서 영향

- 추가: 전화 ID, 고정 콘텐츠 literal, 세션·action, 컴포넌트 props, 테스트 ID,
  향후 맵·내비게이션 통합 형태.
- 변경/삭제: 기존 공개 타입과 런타임 동작 없음.
- 구현 시 문서 영향: `docs/screens.md`, `docs/adr/0024-journey-units-and-special-unit-placement.md`,
  `docs/adr/README.md` 및 새 `docs/e2e/phone-call.md`를 실제 동작과 함께 갱신한다.

이 스펙과 타입 계약을 바꾸려면 제품 선택을 다시 승인하고 contract-diff를 갱신해야 한다.
