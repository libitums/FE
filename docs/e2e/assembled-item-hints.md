# 조립 문항 타일 로마자 · 힌트 — 기기 확인 절차

[ADR-0153](../adr/0153-assembled-item-romanization-hint.md). Android `assembleBundled` 빌드, Pixel_8 AVD를 360×640dp(`wm size 1080x1920` · `wm density 480`)로 두고 소리를 끈 채 확인한다. 화면에 닿기 어려우면 임시 진입점(실제 문항 데이터로 활동만 그리기)을 쓰고 저장소에 남기지 않는다.

| # | 확인 | 기대 |
|---|---|---|
| H1 | 음절 조립 u00 S1-05 | 창고 타일마다 글자 위 로마자(기울임 · 흐린 색). 창고 위 오른쪽 Hint. Check 자리가 화면 안 |
| H2 | H1에서 Hint | 시트에 Hear the answer · Show the answer(정답 소리가 있을 때) |
| H3 | Show the answer | 빈 칸마다 「감 사 합 니 다」가 흐리게, 타일을 놓으면 그 칸 글자가 사라짐 |
| H4 | 문장 조립 u01 S6-04 | 조각 위 로마자, 긴 로마자(gamsahamnida.)는 같은 패딩으로 넓어짐, 작은 화면에서 답 줄 하나 |
| H5 | H4에서 Show the answer | 첫 답 줄에 「감사합니다. 안녕히 가세요.」가 흐리게 |
| H6 | 듣고 조립 u00 S2-02 첫 시도 / 다시 풀기 | 첫 시도는 로마자 · 힌트 없음, 다시 풀기에서 조각 위 로마자 |
| H7 | 글자 크기 최대(Android 글꼴 크기) | 타일 · 버튼이 잘리지 않고 Check가 화면 안 |

## 실행 기록

### 2026-11-17 — H1 ~ H7
- 빌드: `feat/assembled-item-hints`(커밋 전), `assembleBundled`. 화면은 임시 진입점이 실제 문항 데이터(수준 5 u00 S1-05 · u01 S6-04 · u00 S2-02)로 활동만 그렸다(저장소에 남기지 않음).
- 기기: Android 에뮬레이터 Pixel_8 AVD, 360×640dp(`wm size 1080x1920` · `wm density 480`). 에이전트 실행.

| # | 결과 | 관찰 |
|---|---|---|
| H1 | 통과 | 창고 7타일 위 로마자(hap · ni · yo · sa · gam · da · ha), 창고 위 오른쪽 Hint, Check 자리 화면 안 |
| H2 | 통과 | 시트: Hear the answer(주황) · Show the answer |
| H3 | 통과 | 빈 칸 다섯에 「감 사 합 니 다」가 흐리게 |
| H4 | 통과 | 조각 위 로마자, gamsahamnida.가 같은 패딩으로 넓어짐, 답 줄 하나(compact) |
| H5 | 통과 | 첫 답 줄에 「감사합니다. 안녕히 가세요.」가 흐리게 |
| H6 | 통과(다시 풀기) | 다시 풀기 판에서 조각 다섯 위 로마자(annyeonghaseyo! · cheoeumieyo! · o, · ne, · cheoeumiseyo?), 힌트 없음, 창고 2줄 |
| H7 | 통과(글꼴 1.3배) | 세 화면 모두 타일 · Hint · Check가 잘리지 않고 화면 안 |

H6의 첫 시도(로마자 없음)는 ui 테스트 SH2와 통합 경로로 확인했다(기기 캡처 없음).

### ⟨2026-11-20⟩ 듣고 조립 — 설정 따름 조각 로마자 · 판정 뒤 정답 공개(ADR-0153 ⟨2026-11-20⟩)

임시 진입점 번들(수준 5 u00 S2-02 값), iOS 시뮬레이터 iPhone 13 mini · 17 Pro Max, iOS 26.5.

| 확인 | 결과 | 관찰 |
| --- | --- | --- |
| 첫 시도 · 설정 켬(13 mini) | 통과 | 조각 다섯 위 로마자, 창고 두 줄, 답 줄 하나, Check 화면 안 |
| 첫 시도 · 설정 끔(Pro Max) | 통과 | 조각 로마자 없음, 답 줄 둘 |
| 오답 뒤 · 설정 켬(13 mini) | 통과 | 판정 조각 → 「Answer: 안녕하세요! 네, 처음이에요!」 → annyeonghaseyo! ne, cheoeumieyo! → Hello! Yes, it's my first time! → 창고 → Next, 한 화면 |
| 오답 뒤 · 설정 끔(Pro Max) | 통과 | 정답 상자 · 뜻만(로마자 없음) |
| 위 줄 | 통과 | 재생 · 다시 듣기만(천천히는 음성이 없는 진입점이라 서지 않음), 로마자가 몰리지 않음 |
