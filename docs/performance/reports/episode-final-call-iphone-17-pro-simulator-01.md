# 통화 최종 테스트 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 통화 최종 테스트 화면
> 자체의 구간은 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T12:08:06Z (1회차) · 12:08:33Z (2회차) · 12:09:00Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 서사가 통화인 에피소드의 최종 테스트(Figma 79-6043)를 더하고, 통화 화면의 가운데를
  공용 컴포넌트로 올린 변경(이 보고서와 같은 PR)
- 대상 commit: `50fb6d7e326b890122144c3a1a06b6b259d80e90`(최종 테스트 PR) 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(1,097,285 bytes, SHA-256
  `334895465dd2f88b2b5357bdbd72ca96a3b68354e32f5dfbd1b3d366e0f6b484`);
  `--performance-capture`로 실행. 네이티브 코드 변경이 없어 앞선 보고서의 Host 빌드에 번들만
  바꿔 실었다.
- 실행 회차: 01

## 시나리오

- 전제 · 단계: [`episode-final-test-iphone-17-pro-simulator-01.md`](episode-final-test-iphone-17-pro-simulator-01.md)와
  같다. 「주문하기」 → `시작` → 표지의 `Next` → `다음 대사` 세 번 → `Check`를 누르고 맵으로
  돌아온 것을 확인한 뒤 캡처를 읽는다. **일곱 조작이 모두 닿은 회차만 센다** — 세 회차가
  모두 그렇다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

제품에는 서사가 통화인 에피소드가 없어 통화 최종 테스트는 제품 경로로 닿지 않는다. 화면은
부팅 상태를 잠시 바꿔(`episodeFinalTestFor` 주입) 눈으로만 확인했고, 수치를 남기지 않았다.

## 이 변경이 무엇을 건드렸나

- 새 화면 하나 — 통화 화면(통화 상대 · 시계 · 상대 대사) 위로 내 차례마다 흰 말하기 카드가
  올라온다. 상대 대사는 3초 타이머로, 판정 뒤는 2.5초 타이머로 넘어간다.
- 서사 통화 화면의 가운데(통화 상대 묶음 · 말풍선 · 시계)를 `components/CallCaller.tsx`로
  옮겼다. 서사 통화의 모양 · 동작은 그대로다.
- 최종 테스트 두 화면의 말하기 결선을 `useFinalSpeech.ts`로 모았다(동작 변경 없음).
- 여정 맵을 그리는 경로는 바뀌지 않았다.

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차  | pipeline  | layout    | paintingUiOperationExecute | 노드 |
| ----- | --------- | --------- | -------------------------- | ---- |
| 1회차 | 46.011 ms | 27.841 ms | 6.373 ms                   | 167  |
| 2회차 | 40.607 ms | 19.939 ms | 6.801 ms                   | 167  |
| 3회차 | 27.849 ms | 12.366 ms | 5.487 ms                   | 167  |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 86.878 / 61.372 / 61.793 ms

Memory (after-navigation-journey-01 [complete], 세 회차 같음)
  totalBytes 2062224, elementBytes 173680, viewBytes 111360,
  mainThreadRuntimeBytes 1777184 bytes, elementNodeCount 167 nodes
```

번들 크기다. 둘 다 `pnpm bundle:host`로 빌드했다.

| 번들                          | 크기            |
| ----------------------------- | --------------- |
| 최종 테스트 PR (`50fb6d7`)    | 1,085,875 bytes |
| 이 작업 트리                  | 1,097,285 bytes |
| 차                            | +11,410 bytes   |

측정 당시 상한(1,108,000 bytes) 안이었다. 이 PR을 main(최종 테스트 PR 병합 · #141 · #142 포함,
`621c2df`) 위로 옮긴 뒤의 `pnpm build` 번들은 1,126,965 bytes이고, 최종 테스트 PR이 올린 상한
1,171,000 bytes 안이다. 옮긴 뒤 다시 재지는 않았다 — 늘어난 몫은 main의 다른 변경이고 이 PR의
코드는 그대로다.

**통화 최종 테스트 화면의 구간은 수집되지 않았다.** 그 전이에는 timing flag가 없어 pipeline
entry가 생기지 않는다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

## 비교

- 기준 기록: [`episode-final-test-iphone-17-pro-simulator-01.md`](episode-final-test-iphone-17-pro-simulator-01.md)
  — 같은 기기 · 같은 절차의 최종 테스트 PR 빌드. pipeline 33.3~51.5 ms, 노드 167.
- 차이: 노드 수 · `elementBytes` · `viewBytes`가 같다 — 맵에 더한 것이 없다.
  `mainThreadRuntimeBytes`는 1,762,144 → 1,777,184 bytes(+15,040)로 번들이 커진 만큼 늘었다.
  pipeline 27.8~46.0 ms는 기준 범위와 겹친다. 예산 판정이 아니다.

## 해석

- 맵 첫 착지는 기준과 같은 범위이고, 이 변경이 맵의 경로를 건드리지 않았다는 것과 맞는다.
- **이 기록이 말하지 못하는 것**: 통화 최종 테스트 화면은 제품 경로에 없어 재지 않았다. 대사
  타이머 · 시계 · 음성 인식이 함께 도는 동안의 비용도 재지 않았다. 단일 기기 시뮬레이터 기록이다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 통화 최종 테스트로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 1초 시계와 카드가 오르내리는 동안의 프레임을 재지 않았다.
- memory: 탭 전환 직후 snapshot만 있다.
- NativeModule: 말하기 차례가 `SpeechRecognitionModule`을 부른다. 시뮬레이터에서 인식을
  돌리지 않아 미측정이다.

## 결론과 후속

- 결론: 맵 첫 착지는 기준과 같은 범위이고 노드 수가 같다. 번들 +11,410 bytes로 상한 안이다.
- 후속: 통화 서사 에피소드가 제품에 들어오는 변경에서 통화 최종 테스트 화면에 timing flag를
  붙여 다시 잰다. 아직 이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
