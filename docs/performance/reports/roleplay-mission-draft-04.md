# 롤플레이 미션 — 스위치가 꺼진 release에서 미션 코드 가지치기 — 04

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 스위치(`ROLEPLAY_MISSION_READY`)가 꺼져 있어 사용자 화면 · 렌더 경로는 바뀌지 않는다.
- 기능 PR: 스위치가 꺼진 release 번들에서 미션 화면 · 문구 · CSS · 가짜를 통째로 뺌 — 빌드 상수 `__ROLEPLAY_MISSION_IN_BUNDLE__`(`lynx.config.ts`의 `defineDCE`, dev이거나 스위치가 켜졌을 때 true)와 부수 효과 없는 입구 둘(`app/roleplay-mission-entry.ts` · `screens/roleplay-mission/roleplay-mission-list-entry.ts`). 미션 문구는 문구표(`UiCopy`)에서 빼 `useMissionCopy`로(ADR-0193 · 번들 천장 ADR-0149).
- 대상 commit: 이 보고서와 같은 브랜치 `feat/companion-mission-app-v2`의 HEAD(비교 기준은 main f8b4f242와 서버 브랜치 끝 2e2b24e7, 가지치기 전은 서버 브랜치를 합친 7085aa1b)
- 기기: 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(release) 산출 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음 — CI와 같은 설정). 네 커밋을 같은 작업 트리 · 같은 명령으로 차례로 빌드했다.
- 측정 일시: 2026-11-26

## 시나리오

- 번들 크기: main · 서버 끝 · 가지치기 전 · 이 변경을 같은 방법으로 빌드해 비교했다. 미션 코드가 빠졌는지는 release 번들을 글자로 찾아 봤다 — 「Did I hear that right」 · 「Report ready」 · `mission-talk` · `mission-report-badge` · 「Mission ·」가 이 변경 뒤 0건.

## 분석 결과

| 번들(이 환경, CI 설정) | 크기 | main 대비 |
| --- | ---: | ---: |
| main f8b4f242 | 6,188,570 bytes | — |
| 서버 브랜치 끝 2e2b24e7 | 6,188,570 bytes | 0 |
| 가지치기 전 — 서버를 합친 7085aa1b | 6,344,331 bytes | +155,761 |
| 상수 export로 가린 시도(모듈 사이에서 접히지 않음) | 6,352,943 bytes | +164,373 |
| 이 변경 | **6,188,952 bytes** | **+382** |
| 천장(`budget.json`, ADR-0149) | 6,180,000 bytes | — |

- **이 환경에서는 main 자체가 천장을 넘는다**(6,188,570 > 6,180,000, `size:check` 실패). 조율자가 알려 준 CI 값은 6,178.6 kB라 이 환경과 약 10 kB 차이가 난다 — CI와 로컬의 차이로 보고, **차이**로 판단했다: 이 변경은 main 대비 +382 bytes(목록 항목 형태 · 배지 칸, 라우트 이름 · 구획 붙이기의 빈 가지, 대기 판 규칙 함수 하나).
- 지연 적재(lazy bundle)는 쓰지 않았다 — 이 저장소에 선례가 없고(동적 import · `lazy` 0건), Lynx의 lazy bundle은 호스트가 추가 번들을 받아 오는 길이 필요해 `apps/ios` · `apps/android` 밖에서 끝낼 수 없다. 빌드 상수 가지치기는 탐침 화면(ADR-0171)이 이미 쓰는 길이다.
- 모듈 사이의 `export const`(예: `__DEV__ || ROLEPLAY_MISSION_READY`)로 가리면 번들러가 접지 못해 미션 코드가 그대로 남았다(+164 kB). 그래서 `defineDCE`로 글자를 바꿔 넣는다.

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 스위치를 켜면(`ROLEPLAY_MISSION_READY = true`) 미션 코드 전체(약 +156 kB)가 다시 든다 — 그때는 천장 결정 또는 지연 적재가 필요하다.

## 결론과 후속

- 스위치가 꺼진 release는 main과 거의 같다(+382 bytes). 이 환경의 `size:check` 실패는 main에서도 같은 값으로 난다.
- 스위치를 켤 때: 미션 route의 지연 적재(호스트 지원 필요) 또는 천장 결정. 음성 계약의 `missionSttFailure`를 값으로 import하므로, 서버 출처를 붙일 때 계약 패키지의 zod가 번들에 끌려오지 않는지 확인한다.
