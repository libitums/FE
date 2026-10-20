# 결과 화면 머리 칩 오름 — Android API 30 에뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-20T11:00:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 이 회차는 학습 결과 화면의 머리 칩 오름 모션([ADR-0064](../../adr/0064-stat-motion.md) D2 · D4)이 기기에서 재생되는지를 화면 녹화로 확인한 기록이다
- 기능 PR: 없음 — 로컬 브랜치 `feat/learning-hide-header-chips`(PR 전)
- 대상 commit: `a68cd5af` (카탈로그 결과 화면에 `statBumps` · `onStatBumped` 연결 — `origin/main` `d937f3bf2a51e24dd45dd8b633885b50c204ca87` 위)
- 기기: Android 에뮬레이터 AVD `R6_API30`(arm64, google_apis), 1080 × 2340 · 440 dpi = 392.7 × 851 dp, 글자 배율 1.0, 애니메이션 배율 1
- OS: Android 11 (API 30)
- Lynx SDK: 4.0.1
- 빌드: Debug APK + 모의 Supabase 설정으로 만든 로컬 HTTP 번들(`pnpm bundle:android`, `main.lynx.bundle` 2,239,225 bytes, SHA-256 `91cd3562600ce543e1b66633b9a7f8394fef6396043ef041740351f46149b670`). 대조로 같은 APK에 `origin/main` 소스로 만든 번들을 띄웠다. 로그인은 계측 픽스처 `SignedInScreenFixtureTest`
- 실행 회차: 01

## 시나리오

- 전제: 앱 데이터를 지우고 픽스처로 로그인한다(서버 진행 불러오기 응답 켬). 진행은 측정용 임시 인자로 넣었다 — (A) 튜토리얼 표지 · 스텝 둘 끝, (B) 튜토리얼 전부 + 카탈로그 에피소드 1의 최종 테스트(`RP`) 앞까지 전부. 연속 학습이 오르는 조건은 픽스처가 `learning_streak`를 `0`, `record_learning_days`를 `1`로 답하게 해서 만들었다(오늘 첫 학습). 이 임시 변경은 저장소에 넣지 않았다.
- 단계(A): 맵 `Ordering` → `Start` → `물` · `좀` · `주세요` → `Check` → `Next` → 완료 카드에서 녹화 시작 → `See results` → 결과 화면 녹화 → `Back to map` → 연속 학습 축하 화면 `Continue`를 누르며 녹화.
- 단계(B): 맵 `Final test` → `Start` → 세 차례 낱말 타일로 답 → 마지막 `See results` 직전에 녹화 시작 → 결과 화면 녹화 → `Back to map` → 마무리 컷 셋 `Next` → 연속 학습 축하 화면 `Continue`를 누르며 녹화. 같은 (B)를 `origin/main` 번들로 한 번 더.
- 관찰 구간: `adb shell screenrecord`(6 Mbps) 6초. 이 녹화기는 화면이 바뀔 때만 프레임을 쓰므로(가변 프레임) 영상 길이가 실제 시간보다 짧다 — 프레임은 「변화가 있었다」의 증거이고 시간 축 값은 쓰지 않았다. 프레임에서 칩 줄만 잘라 시간순으로 놓았다.

## 이 변경이 무엇을 건드렸나

- `render-catalog.tsx`: 카탈로그 결과 화면(`catalog-unit-complete`)의 `LessonCompleteScreen`에 `statBumps` · `onStatBumped`를 넘긴다. 튜토리얼 결과(assessment)는 원래 연결돼 있었다.
- 그전(`origin/main`)에는 카탈로그 결과 화면의 칩이 오른 뒤 값으로 정지해 서고, 오름 표식이 남아 있다가 맵에 돌아가서야 재생됐다.

## 분석 결과

런타임 성능 값은 수집하지 않았다. 이 절에는 녹화 프레임의 관찰만 적는다.

```text
(A) 튜토리얼 결과 PERFECT LESSON! · 연속 학습 0 → 1                          재생됨
    프레임 순서: 정지 0 → 불꽃 아이콘 커짐 · 숫자 0이 위로 밀림 → 칩 면이 주황으로 차고 숫자 1
                → 빛 띠가 왼쪽에서 오른쪽으로 지나감(여러 프레임) → 정지 1
    배지 「1 Day Streak」가 같은 화면에 섬
    증거: docs/e2e/evidence/android-result-chip-bump-tutorial-streak-frames.png

(B) 카탈로그 최종 테스트 결과 PERFECT LESSON! · 연속 학습 0 → 1 · 트로피 1 → 2   재생됨
    두 칩이 같은 프레임대에서 오름(굴림 중 두 숫자가 반쯤 걸린 프레임, 두 칩에 빛 띠) → 정지 1 · 2
    증거: docs/e2e/evidence/android-result-chip-bump-catalog-final-frames.png

결과 → 맵 복귀 (A · B 모두)                                                 다시 굴리지 않음
    맵 칩이 1 · 2로 정지해 서고, 변하는 프레임은 맵 자동 스크롤뿐
    증거: docs/e2e/evidence/android-result-chip-bump-map-after-frames.png (B)

대조 origin/main, (B)와 같은 조작
    결과 화면: 칩이 처음부터 1 · 2로 정지 — 오름 없음
    맵 복귀: 칩이 0 · 1로 섰다가 1 · 2로 굴러감 — 맵에서 뒤늦게 재생
    증거: docs/e2e/evidence/android-result-chip-bump-catalog-final-base-frames.png ·
          docs/e2e/evidence/android-result-chip-bump-map-after-base-frames.png
```

## 비교

- 기준 기록: 없음 — 성능 기준 기록은 없다. 동작 비교는 같은 APK · 같은 진행 · 같은 조작으로 띄운 `origin/main` 번들 한 번이다.
- 차이: 카탈로그 결과 화면에서 오름이 재생되고(전: 없음), 맵 복귀 때의 뒤늦은 재생이 사라졌다(전: 맵에서 0 · 1 → 1 · 2).

## 해석

- 튜토리얼 · 카탈로그 결과 화면 모두에서 칩 오름이 재생되고, 한 번 재생한 뒤에는 맵에서 다시 굴리지 않는다 — 「표식은 재생할 때까지 남고 한 번 재생하면 지운다」가 기기에서 성립한다.
- `origin/main`의 맵 복귀 대조에서 칩이 오르기 전 값(0 · 1)으로 섰다가 굴러갔다. 결과 화면에서 이미 1 · 2를 본 사용자에게는 숫자가 내려갔다 다시 오르는 것으로 보였을 것이다 — 이번 수정이 없앤 모습이다.
- 한계: 단일 회차 · 에뮬레이터 한 대 · 글자 배율 1.0 · 애니메이션 배율 1만 봤다. 연속 학습은 픽스처의 임시 응답으로 만든 조건이고 실제 서버의 연속 학습 계산이 아니다. 녹화가 가변 프레임이라 모션의 길이 · 매끄러움(프레임 간격)은 판정할 수 없다. 동작 줄이기 분기, 카탈로그 레슨 하나로 연속 학습만 오르는 경우, iOS는 이번에 보지 않았다. 런타임 성능 값이 없으므로 이 기록은 성능 기준선이나 회귀 통과의 증거가 아니다.

## Trace 후속 확인

- render: 해당 없음 — Trace를 수집하지 않았다.
- fluency: 해당 없음 — 가변 프레임 녹화라 프레임 간격을 잴 수 없다. 프레임 수만 보면 끊김 없이 이어졌다.
- memory: 해당 없음 — 수집하지 않았다.
- NativeModule: 해당 없음 — 관찰 구간에서 이 변경과 관련된 호출이 없다.

## 결론과 후속

- 결론: AVD `R6_API30`의 Debug 빌드(`a68cd5af`)에서 튜토리얼 · 카탈로그 최종 테스트의 결과 화면이 연속 학습 · 트로피 칩 오름을 재생하고, 맵에 돌아가면 다시 굴리지 않는다. `origin/main`에서는 카탈로그 결과 화면에 오름이 없고 맵에서 뒤늦게 재생된다.
- 후속: 동작 줄이기 분기와 iOS 같은 화면, 카탈로그 일반 레슨의 연속 학습 오름은 별도 회차에서 본다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다.
