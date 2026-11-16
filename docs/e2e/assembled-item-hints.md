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
