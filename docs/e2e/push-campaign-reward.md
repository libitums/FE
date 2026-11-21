# 수동 e2e — 푸시 캠페인 보상 (ADR-0175)

서버 마이그레이션 · `send-push` 배포 전에는 실제 발송으로 확인할 수 없다. 기기 확인은 시뮬레이터 `xcrun simctl push` · AVD `adb`로 누른 알림을 흉내 내고,
claim 응답은 커밋하지 않는 임시 프로브로 대신한다.

| id | 확인 | 기대 |
|---|---|---|
| PR-E1 | 콘솔 1단계 「눌러 들어오면 주는 보상」 = 엽전 100 · 기한 48 → 대상 계산 | 미리보기에 「엽전 100 · 발송 뒤 48시간 안에 받기」, 보낼 사람 · 대조군 수는 보상 없음일 때와 같음 |
| PR-E2 | 보내기 확인창 | 「보상: 엽전 100 · …」 줄, 숫자 확인은 그대로 |
| PR-E3 | (운영 적용 뒤) 시험 계정이 든 작은 캠페인 발송 | `push_campaign_reward_recipients`에 보낸 그룹만, 대조군 없음 |
| PR-E4 | 엽전 보상 알림을 눌러 앱 켜기(콜드 스타트) · 앱이 켜진 채 누르기 | 지도에서 모달(GIFT · 「Your gift is here!」 · 주머니 · +0 → +100) → Got it이면 머리 칩으로 날아감 |
| PR-E5 | 무제한 티켓 24시간 보상 알림 | 모달(무한 기호 · 티켓 톡 · 「24h」) → Got it이면 곧바로 닫힘, 머리 티켓 칩이 주황 무제한 칩, 누르면 「24 hours left」 카드 |
| PR-E6 | 같은 알림 다시 누르기 · 대조군 계정 · 기한 지난 뒤 | 아무 화면 없음(이벤트 `push_reward_failed`만) |
| PR-E7 | 튜토리얼 표지 전(활동 0) 계정 | 첫 유닛 안내 동안 모달 없음, 첫 활동 뒤 지도에서 모달 |
| PR-E8 | 엽전 출시 모달이 남은 기존 회원 | 푸시 보상 모달 먼저, 닫은 뒤 출시 모달 |
| PR-E9 | 로그아웃(손님) 상태로 보상 알림 누르기 | 아무 화면 없음, `push_reward_failed { reason: guest }` |
| PR-E10 | 동작 줄이기 | 모달이 처음부터 최종 값, Got it이면 날지 않고 닫힘 |
| PR-E11 | VoiceOver / TalkBack | 제목 머리글, 금액 줄 「+100 Yeopjeon」 · 「Unlimited tickets. 24 hours left」 |
| PR-E12 | 결과 탭 | 「보상 받음 N / 보낸 그룹」 |

## 실행 기록
- 2026-11-21 — iPhone 17 Pro 시뮬레이터(iOS 26.5, 전용 기기 · 끝나고 삭제) · Android AVD Pixel_8(`-read-only -no-audio`, `assembleBundled`, 네트워크 끔), `.env.local` 없는 빌드.
  서버 마이그레이션이 운영에 없어 claim 응답은 **커밋하지 않은 임시 프로브**(손님을 로그인처럼 · claim 대역 · 첫 유닛 안내 조건 끔)로 대신했다. 프로브 번들 · APK · 복사한 설정 파일은 지웠다.
  - iOS: 실제 알림 경로 — `xcrun simctl push`(목적지 `{ kind: "journey-map", campaignId }`)로 배너를 띄우고 눌러 호스트 `didReceive` → `takeOpened` → claim → 모달까지.
    - PR-E4 통과: 엽전 모달(GIFT · 「Your gift is here!」 · 주머니 · +100) → Got it이면 칩으로 날아가 칩 0 → 140(대역 잔액).
    - PR-E5 통과: 티켓 모달(무한 기호 · 티켓 · 「24h」 · 「Start any lesson without a ticket.」), 모달이 서는 순간 머리 칩이 무제한 칩, Got it 뒤 칩을 누르면 「24 hours left · Ends Nov 22 · 24 of 24 hours」 카드 · Got it.
  - Android: 탭 Activity가 내보내지 않은(exported=false) 것이라 adb로 부를 수 없고(루트 없는 이미지), 프로브가 누름 신호를 직접 냈다. 캠페인 id를 옮기는 호스트 칸은 JVM 테스트 `PushTargetJsonTest.carriesRewardCampaignId`가 지킨다.
    - PR-E5 통과(화면 동일). uiautomator 트리에 기간 카드 한 문장 「24 hours left. Ends Nov 22. 24 of 24 hours」 · 안내 문장 · 「Got it」이 각각 노드로 잡힘(접근성 점검 Major 2의 `flatten={false}` 확인).
    - 프로브가 첫 유닛 안내 조건을 끈 상태에서는 안내 강조가 모달 위로 올라왔다 — ADR-0175 D7(안내가 켜진 동안 모달을 미룸)이 막는 그 겹침이다.
  - 실행 로그(iOS `log stream` · Android logcat)에 JS 오류 · FATAL 없음.
  - 미실행: PR-E1 · E2 · E12(콘솔을 운영 데이터에 띄우지 않음 — 콘솔 단위 테스트 PC-RW · PC-IO10이 대신), PR-E3 · E6(운영 적용 뒤), PR-E7 · E8(통합 테스트 PR-I5 · I7이 순서를 지킴), PR-E9(통합 PR-I6), PR-E10(ui PR-UI3), PR-E11(스크린리더 실청취).
- 스크린샷: 커밋하지 않음(PR 본문에 경로).
