# 에피소드 최종 테스트 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다. 최종 테스트 화면 자체의
> 구간은 수집기가 잡지 못해 **미측정**으로 남는다.

## 실행 조건

- 측정 일시: 2026-09-28T11:51:42Z (1회차) · 11:52:10Z (2회차) · 11:52:37Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 Rendering entry와 Memory
  snapshot을 수집하고 기존 분석기로 검증했다.
- 기능 PR: 에피소드의 마지막 유닛으로 최종 테스트(말하기 · 낱말 고르기, Figma 79-6484 ·
  79-6648)를 더한 변경(이 보고서와 같은 PR)
- 대상 commit: `6b36718804ecc1df9ec7d3802915ea84b92be85e` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(1,085,875 bytes, SHA-256
  `3ec65e7f9d11323bdb0295db6342b5f05181172568ded8cad8666acbe5dd75c3`);
  `--performance-capture`로 실행. 대상 commit 이후 네이티브 코드(`apps/ios`) 변경이 없어 앞선
  보고서의 Host 빌드에 번들만 바꿔 실었다.
- 실행 회차: 01

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗이고, 표지를 본 에피소드가 없다. 시스템 글자 크기는 기본이다.
- 단계: 앞선 보고서([`episode-prologue-formats-iphone-17-pro-simulator-01.md`](episode-prologue-formats-iphone-17-pro-simulator-01.md))와
  같다. 「주문하기」 → `시작` → 표지의 `Next` → `다음 대사` 세 번 → `Check`를 누르고 맵으로
  돌아온 것을 확인한 뒤 캡처를 읽는다. **일곱 조작이 모두 닿은 회차만 센다** — 세 회차가
  모두 그렇다.
- 기준: 같은 절차 · 같은 Host로 `main`(`6b36718`) 번들을 두 회차 쟀다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

제품의 씨앗에서 최종 테스트는 잠겨 있어 제품 경로로 닿지 않는다. 최종 테스트 화면은 앞
항목을 모두 끝낸 진행으로 부팅을 잠시 바꿔 눈으로만 확인했고, 수치를 남기지 않았다.

## 이 변경이 무엇을 건드렸나

- 여정 맵의 튜토리얼 구획 끝에 최종 테스트 항목 하나(`LearningUnit` + 제목)가 선다. 같은
  구획의 다른 항목을 모두 끝내야 열린다.
- 새 화면 하나 — 서사 그림(기존 파일) 위에 문항 패널. 말하기는 호스트 음성 인식을 쓰고,
  낱말 고르기는 보기 셋과 서사의 대화 패널(`VisualNovelDialog`)이다. 판정 뒤 2.5초 타이머가
  다음 문항으로 넘긴다.
- 말하기 채점 규칙을 `lib/`로 옮겼다(동작 변경 없음).

## 분석 결과

여정 맵에 닿는 update pipeline(`libitum:navigation:journey`)이다.

| 회차        | pipeline  | layout    | paintingUiOperationExecute | 노드 |
| ----------- | --------- | --------- | -------------------------- | ---- |
| 1회차       | 33.279 ms | 14.813 ms | 6.562 ms                   | 167  |
| 2회차       | 51.500 ms | 30.478 ms | 6.638 ms                   | 167  |
| 3회차       | 42.261 ms | 20.749 ms | 7.691 ms                   | 167  |
| main 1회차  | 29.949 ms | 12.362 ms | 5.496 ms                   | 154  |
| main 2회차  | 39.315 ms | 18.315 ms | 7.554 ms                   | 154  |

같은 회차들의 나머지 값이다.

```text
Rendering
  FCP loadBundle: lynxFcp 62.036 / 71.442 / 65.173 ms

Memory (after-navigation-journey-01 [complete], 세 회차 같음)
  이 작업 트리: totalBytes 2047184, elementBytes 173680, viewBytes 111360,
    mainThreadRuntimeBytes 1762144 bytes, elementNodeCount 167 nodes
  main:        totalBytes 1962624, elementBytes 160160, viewBytes 102784,
    mainThreadRuntimeBytes 1699680 bytes, elementNodeCount 154 nodes
```

번들 크기다. 둘 다 `pnpm bundle:host`로 빌드했다.

| 번들                 | 크기            |
| -------------------- | --------------- |
| main (`6b36718`)     | 1,055,145 bytes |
| 이 작업 트리         | 1,085,875 bytes |
| 차                   | +30,730 bytes   |

상한(1,108,000 bytes) 안이라 조정하지 않았다.

⟨갱신⟩ 그 뒤 main이 `80faa11`(손글씨 탐침 #141 · 메신저 타이핑 테스트 #142)로 가서 1,084,745 bytes가
됐고, 이 변경을 합치면 1,115,485 bytes(+30,740)로 상한을 넘어 1,171,000 bytes로 올렸다
(`devtools/bundle-size/budget.json`의 note). 이 변경이 더하는 양은 위 측정과 같다(+30.7 kB).

**최종 테스트 화면의 구간은 수집되지 않았다.** 그 전이에는 timing flag가 없어 pipeline
entry가 생기지 않는다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

## 비교

- 노드 수 154 → 167(+13)은 맵에 선 최종 테스트 항목 하나의 몫이다 — 이 변경이 맵에 더한
  것은 그 항목뿐이다. `elementBytes` +13,520 · `viewBytes` +8,576도 같은 몫이다.
- `mainThreadRuntimeBytes` +62,464 bytes는 번들이 커진 만큼 로드된 코드가 늘었다는 것으로
  읽는다.
- pipeline은 이 작업 트리 33.3~51.5 ms, main 29.9~39.3 ms다. 2회차(51.5 ms)가 main 범위보다
  높고, 그 몫은 거의 layout(30.5 ms)이다. 1 · 3회차는 main 범위와 겹친다. 맵 경로가 같은 이
  PR의 이전 빌드를 같은 절차로 쟀을 때는 25.0~43.3 ms였다 — 이 시뮬레이터의 흔들림이 10 ms를
  넘는다는 앞선 보고서들의 관찰과 맞는다. 노드 수가 같은 세 회차 가운데
  하나만 튄 값이라 변경의 효과로 읽지 않지만, 판정할 근거도 아니다. 예산 판정이 아니다.

## 해석

- 여정 맵 첫 착지는 세 회차 중 둘이 main과 같은 범위이고, 늘어난 노드 · 메모리는 새 항목
  하나와 커진 번들로 설명된다.
- **이 기록이 말하지 못하는 것**: 최종 테스트 화면은 제품 경로에서 잠겨 있어 재지 않았다.
  전체 화면 그림 둘의 디코딩 비용과 음성 인식 중의 비용도 재지 않았다. 단일 기기 시뮬레이터
  기록이다.

## Trace 후속 확인

- render: 여정 맵 첫 착지의 mtsRender → resolve → layout → UI operation → paint는
  기록했다. 최종 테스트로 가는 update는 미수집이고 Trace도 수집하지 않았다.
- fluency: 미측정 — 문항 전환과 판정 뒤 색 전환을 프레임 단위로 재지 않았다.
- memory: 탭 전환 직후 snapshot만 있다. 최종 테스트 화면 뒤의 값은 재지 않았다.
- NativeModule: 말하기 문항이 `SpeechRecognitionModule`을 부른다. 시뮬레이터에서 인식을
  돌리지 않아 미측정이다.

## 결론과 후속

- 결론: 맵 첫 착지는 세 회차 중 둘이 main과 같은 범위이고(하나는 layout이 튄 51.5 ms), 노드
  +13 · 번들 +30,730 bytes. main 갱신 뒤 합친 번들이 상한을 넘어 상한을 올렸다(위 ⟨갱신⟩).
- 후속: 최종 테스트 화면에 timing flag를 붙이고, 실기기에서 음성 인식을 포함해 다시 잰다.
  아직 이슈가 없다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
