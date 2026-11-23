# Android 결제 준비 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: Android 호스트가 구독을 지금 Play 구독의 바꿈으로 사고, Play 보류 결제를 실패로 보이지 않습니다(ADR-0144 「Android 결제 준비」).
- 대상 commit: `main` 위의 `feat/android-purchases`
- 기기: 없음(Play 상품이 아직 없어 기기 확인은 `docs/e2e/android-purchases.md`로 미룸)
- OS: 없음(기기 미실행)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`, `.env.local` · 값 파일 없이(CI와 같게)

## 시나리오

- 없음. JS 변경은 호스트 구매 답 하나(`pending`)를 해석하는 `switch` 한 줄이라 화면 렌더링 경로에 새 일이 없습니다.
  호스트 변경은 구독 구매 때 RevenueCat 고객 정보를 한 번 더 읽는 것(캐시 우선, 결제 시트 앞)뿐입니다.

## 이 변경이 무엇을 건드렸나

- JS: `lib/native-purchase-bridge.ts`(`pending` → 취소처럼).
- Android: `PurchasesModule` · `PurchasesConfig`, 새 `PurchasesPlanChange` · `PurchasesStatus`(순수).

## 분석 결과

| 번들 | 앞(main 36777a53) | 뒤 | 차이 | 천장 |
| ---- | ---- | ---- | ---- | ---- |
| `main.lynx.bundle` | 5,324,085 B | 5,324,108 B | +23 B | 5,327,000 B |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 번들 차이는 `case "pending":` 한 줄(주석은 빌드에서 빠짐)입니다. 천장까지 2,892 B 남습니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: Play 상품 설정 뒤 기기 확인(AP-E1 ~ AP-E13) 때 구독 구매의 시트 열림까지 시간을 함께 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키 · 기기 id 값)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
