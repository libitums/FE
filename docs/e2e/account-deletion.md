# 계정 삭제 · 로그아웃 — iOS 수동 e2e

`account-deletion.e2e.test.ts`로 옮길 흐름이다. 자동 E2E는 not applicable(runner/command 없음) —
이 문서를 세우는 것이 이 계층의 「테스트」다([README](README.md)). 계약은
`.agent-harness/work/account-deletion/spec.md`, 셈하는 자리는 같은 폴더 `test-plan.md` §5이고 이 문서는 그
절차 사본이다. 그 폴더는 추적되지 않으므로 저장소에 남는 근거는 이 흐름을 세운 PR과 ADR이 진다.

## 범위

설정 화면 끝의 **「Account actions」 묶음**(`Sign out` · `Delete account`)이 실제 호스트 앱에서 —
확인 대화상자 · 로그아웃 뒤의 온보딩 복귀 · 삭제의 진행 · 실패 안내 · VoiceOver 낭독 — 계약대로 서는지,
그리고 **함수 배포 · 시크릿 뒤에만** 되는 서버 쪽 결말(Supabase 사용자 · `app_user` 행 삭제 · Apple 토큰 철회)이
실제로 일어나는지를 본다.

두 부류로 나눈다. **A는 함수를 배포하지 않아도 시뮬레이터에서 지난다. B는 함수 배포와 시크릿이 있어야만 지난다.**
B를 못 돌리는 동안 A만 통과시켜도 앱 쪽 계약(대화상자 · 실패 안내 · 취소 · 로그아웃)은 판정된다 — 서버 결말은
B가 풀릴 때까지 **미판정**이며 A의 통과로 대신하지 않는다.

**관찰할 수 없는 것**: 분석 이벤트의 새 익명 ID · 대기열 폐기는 [분석 이벤트 e2e](analytics.md)의 Live events
절차를 같은 방식으로 따로 본다(여기서 행을 더하지 않는다). 그 밖의 앱 쪽 분기(`session-expired` ·
`apple-unconfirmed` · 403 등)는 integration 테스트가 대역으로 진다.

## 전제

공통 전제는 [README](README.md)를 따른다. 여기서 더하는 것만 적는다.

- **자체 호스트 앱**(Debug 또는 Release)에서 확인한다. 테스트 번호 · 토큰 · 키 · 시크릿 값은 **이 문서 · 실행 기록에
  적지 않는다**(번호와 코드는 [진입 흐름](entry-flow.md) 「전제」를 따른다).
- 로그인 상태는 계정 종류별로 따로 만든다. 같은 세션 하나이므로 종류에 따라 시작점만 다르다.
  - **전화번호 계정**: 새 설치 → 진입 흐름(T1~T7) → 팀 공유 테스트 번호. Apple · 함수와 무관하다. A의 기본 계정.
  - **Apple 계정**: Sign in with Apple 기능이 켜진 Host 빌드 · 실기. 제공자 설정이 풀려 있어야 로그인이 지난다
    ([ADR 보류 표](../adr/README.md#보류-표)). A의 E8(취소)과 B의 E10 · E13이 쓴다.
  - **Google · Facebook 계정**: 제공자 설정이 풀려 있어야 한다. B의 E9가 쓴다.
- **삭제는 되돌릴 수 없다** — 삭제 행(B)은 **테스트 계정으로만** 돌리고, 한 번 삭제한 계정은 다시 쓸 수 없다고
  본다(같은 계정을 다시 만들려면 새로 가입한다). 확인 전에 화면의 계정이 테스트 계정인지 본다.
- **설정 화면 경로**: 하단 탭 `Settings` → 목록 맨 끝의 `Account actions` 묶음(`Account` · `Learning` 다음).
- 기록은 행마다 결과 · 날짜 · 빌드를 적는다. 한 항목이라도 어긋나면 `실패: <관찰>`로 적는다.

### 식별 요소(자동화 이관용)

| 무엇 | testid · 속성 |
|---|---|
| 묶음 행 | `ui-lynx-settings-group-item-sign-out` · `ui-lynx-settings-group-item-delete-account` |
| 실패 문구 | `settings-screen-account-error` |
| 대화상자 래퍼 | `settings-screen-sign-out-dialog` · `settings-screen-delete-dialog` |
| 대화상자 | `ui-lynx-dialog` · `-title` · `-description` |
| 대화상자 액션 | `ui-lynx-dialog-action-sign-out` · `-stay` · `-delete` · `-keep` |
| 상태 | 로딩 `ui-lynx-button`의 `data-loading="true"` · 비활성 `data-disabled="true"` · 취소 경로 `ui-lynx-dialog`의 `data-cancelactionid`(로딩 동안 **없음**) |

### 문구(영어 UI의 정본 값)

| 자리 | 값 |
|---|---|
| 로그아웃 대화상자 | 제목 `Sign out?` · 액션 `Sign out` · `Stay signed in` |
| 삭제 대화상자 | 제목 `Delete your account?` · 설명 `Your account and learning progress will be permanently deleted. This can't be undone.` · 액션 `Delete account` · `Keep account` |
| 실패 — 연결 | `Couldn't delete your account. Check your connection and try again.` |
| 실패 — 그 밖 | `Couldn't delete your account. Please try again.` |

## A. 함수 배포 없이 시뮬레이터에서 확인하는 것

증거는 **접근성 트리 · 화면 스크린샷**이다. 시뮬레이터(iPhone 17 Pro)로 충분하다 — VoiceOver 낭독(E2)과 Apple
시트(E8)만 실기에서 사람이 판정한다.

### E1 — 설정의 「Account actions」 묶음 표시

- **전제**: 전화번호 계정으로 로그인된 상태, 설정 탭.
- **절차**: 1. 하단 탭 `Settings`를 연다. 2. 목록 맨 끝까지 스크롤한다.
- **기대**: 기존 `Account` · `Learning` 묶음 **다음, 목록 끝**에 묶음이 서고 행 둘이 `Sign out` → `Delete account`
  순서로 있다. 둘 다 오른쪽 화살표(navigation)이고 파괴 전용 색(빨강)이 없다. `settings-screen-account-error`는 없다.
  375pt 폭에서 하단 탭이 묶음을 가리지 않는다. 큰 글씨(Dynamic Type 최대)에서도 행 제목이 잘리지 않는다.
- **증거**: 스크롤 끝 스크린샷(기본 · 375pt · 큰 글씨 각 1장) · 접근성 트리 발췌.
- **대응**: test-plan E10(레이아웃 절반) · E1의 진입점.

### E2 — VoiceOver 이름 · 순서

- **전제**: **실기** · VoiceOver 켬 · 전화번호 계정 설정 탭.
- **절차**: 1. 묶음으로 스와이프한다. 2. `Sign out` 행 → 대화상자를 열어 제목부터 취소까지 스와이프한다. 3. `Delete
  account` 행 → 대화상자를 열고 같은 순서로 읽는다. 4. 대화상자가 떠 있는 동안 뒤 화면(제목 · 목록 · 전역 머리)으로
  스와이프를 시도한다.
- **기대**: 행 이름 `Sign out` · `Delete account`(button). 묶음 이름 `Account actions`는 **읽히지 않는다** — `SettingsGroup`의
  이름은 테스트 손잡이일 뿐 낭독 요소가 아니다(접근성 검토 W3, 세 묶음 모두 같다). 대화상자는 **제목(header) →
  설명(삭제만) → 확인 → 취소** 순서이고, 대화상자 동안 뒤 본문 · 머리가 읽히지 않는다
  (`accessibility-elements-hidden`). **하단 탭 바는 대화상자 동안에도 읽힌다** — ADR-0016 D9-3(탭 바는 겹침 레이어가
  가리지 않는다)이라 격리 실패가 아니다. iOS에는 「뒤로가기 = 취소」 경로가 없다 — 취소는 취소 버튼뿐이다. 실제 낭독
  문구를 한 줄씩 기록한다.
- **증거**: 낭독 기록(줄마다 인식한 문구) 또는 화면 녹화.
- **대응**: test-plan E8의 앞 절반(로딩 중 `Delete account, loading`은 E7 · E11이 본다).

### E3 — 로그아웃 → 온보딩, 뒤로가기, 취소

- **전제**: 전화번호 계정, 설정 탭.
- **절차**: 1. `Sign out` 행을 누른다. 2. 대화상자 `Sign out?`에서 `Stay signed in`을 누른다. 3. 다시 `Sign out` →
  대화상자의 `Sign out`을 누른다. 4. 로그인 화면에서 뒤로가기를 누른다.
- **기대**: 2단계는 대화상자가 닫히고 설정이 그대로다(계정 · 세션 그대로). 3단계는 스피너 · 대기 없이 **곧장**
  로그인 화면이 선다(스택 `[온보딩, 로그인]`). VoiceOver를 켰다면 `You're signed out.`가 한 번 들린다(삭제면
  `Your account was deleted.` — 접근성 검토 W2). 4단계는 온보딩으로 간다. 이전 사람의 진행 · 알림 · 옵션이 새 세션에
  보이지 않는다(로그인 뒤 여정 맵이 처음 상태). UI 언어는 영어 그대로다.
- **증거**: 단계별 스크린샷 · 접근성 트리(로그인 화면 요소).
- **대응**: test-plan E1 앞 절반.

### E4 — 로그아웃 뒤 재실행에서 세션 없음 유지

- **전제**: E3 직후(로그아웃한 상태).
- **절차**: 1. 앱을 완전히 종료한다. 2. 재실행한다.
- **기대**: 스플래시 뒤 **온보딩**이 선다(세션 없음 — 여정 맵으로 가지 않는다). 크래시 0. 언어는 영어 그대로.
  전화번호로 다시 로그인하면 새 세션이 선다.
- **증거**: 재실행 화면 스크린샷.
- **대응**: test-plan E1 뒤 절반.

### E5 — 오프라인 로그아웃

- **전제**: 전화번호 계정, 설정 탭. **비행기 모드**를 켠다.
- **절차**: 1. `Sign out` → 대화상자의 `Sign out`. 2. 앱을 종료 · 재실행한다. 3. 비행기 모드를 끈다.
- **기대**: 1단계는 E3과 **같은 결말이 즉시** — 스피너 · 지연 · 오류 문구 0. 2단계는 온보딩. 3단계 이후에도 옛 세션으로
  들어가지 않는다(서버 세션 끊기는 시작만 하고 기다리지 않으므로 서버 쪽 결과와 무관하다).
- **증거**: 1단계 화면 녹화(지연 없음이 보이게) · 재실행 스크린샷.
- **대응**: test-plan E2.

### E6 — 삭제 확인 대화상자

- **전제**: 전화번호 계정, 설정 탭.
- **절차**: 1. `Delete account` 행을 누른다. 2. 대화상자를 읽는다. 3. `Keep account`를 누른다. 4. 다시 열고 대화상자
  밖(Scrim)이나 뒤로가기를 시도한다.
- **기대**: 대화상자는 제목 `Delete your account?` + 설명(위 문구표 그대로, 되돌릴 수 없음이 읽힌다) + [`Delete
  account`, `Keep account`] 순서. 확인 액션은 앱의 다른 대화상자와 같은 brand 색(파괴 전용 색 없음).
  `Keep account`는 대화상자만 닫고 화면 · 세션 그대로. 이 단계에서는 **요청도 Apple 시트도 나가지 않는다**.
  `ui-lynx-dialog`에 `data-cancelactionid`가 있다(로딩 전).
- **증거**: 대화상자 스크린샷 · 접근성 트리.
- **대응**: test-plan E8의 대화상자 절반 · E10(설명 · 라벨 잘림 없음, 375pt · 큰 글씨 포함).

### E7 — 함수 미배포 상태에서 삭제 실패 안내

- **전제**: 대상 Supabase 프로젝트에 **`delete-account` 함수가 배포되지 않았거나** 호출이 실패하는 상태. 전화번호
  계정(Apple 시트가 서지 않는다). 함수가 배포된 프로젝트라면 이 행은 「해당 없음(함수 배포됨)」으로 적고 건너뛴다.
- **절차**: 1. `Delete account` → 대화상자의 `Delete account`. 2. 진행 중 화면을 본다. 3. 실패 뒤 화면을 본다.
  4. 같은 행을 다시 눌러 본다. 5. 비행기 모드를 켜고 1~3을 반복한다.
- **기대**: 2단계는 **대화상자가 선 채** `Delete account` 액션이 로딩(스피너, `data-loading="true"`), `Keep account`는
  비활성(`data-disabled="true"`), 로딩 동안 `data-cancelactionid` 없음 — 이 동안 탭 · 뒤로가기가 무시된다. 3단계는 대화상자가
  닫히고 묶음 **아래**에 `settings-screen-account-error`가 `Couldn't delete your account. Please try again.`로
  뜬다. 계정 · 세션 그대로(설정 탭 이동 · 재실행해도 로그인 상태). 4단계는 문구가 지워지고 대화상자가 다시 선다.
  5단계는 문구가 `…Check your connection and try again.`이다. 문구가 뜨는 순간 VoiceOver가 그 문구를 낭독한다(실기).
- **증거**: 진행 중 · 실패 뒤 스크린샷 · 접근성 트리 · (실기) 낭독 기록. 함수가 없으므로 서버 쪽 관찰은 없다.
- **대응**: test-plan E6 · E8(로딩 `Delete account, loading`) · E10(실패 문구가 셀 제목 시작선과 맞음) · E7의 「그 밖」
  문구 절반(함수 로그 확인은 B의 E12).

### E8 — Apple 시트 취소

- **전제**: **Apple 계정**으로 로그인된 실기 · Sign in with Apple 기능이 켜진 Host 빌드. 함수 배포 여부와 무관하다
  (시트는 요청보다 앞이다).
- **절차**: 1. `Delete account` → 대화상자의 `Delete account`. 2. Apple 시트가 서면 **취소**한다.
- **기대**: 시트가 대화상자 위에 선다. 취소하면 대화상자가 **로딩 전 상태로 돌아간다**(두 액션 다시 활성, 문구 · VoiceOver
  낭독 0). 계정 · 세션 그대로이고 서버 요청이 나가지 않는다.
- **증거**: 시트 취소 직후 스크린샷 · 접근성 트리.
- **대응**: test-plan E5.

## B. 함수 배포 · 시크릿 뒤에만 되는 것

**전제(전 행 공통)**: `delete-account` 함수 배포 · 시크릿 등록(Supabase 서비스 키와 Apple 키 · 팀 · 클라이언트 값 —
**사용자 몫**, `apps/supabase-functions/README.md`) · Sign in with Apple 기능이 켜진 Host 빌드 · 실기(iOS) ·
Supabase 대시보드 접근 · 테스트 계정(Google 하나 · Facebook 하나 · Apple 하나 — 삭제할 것이므로 일회용).
값은 어디에도 적지 않는다. 이 전제가 풀리기 전에는 B 전체가 **미실행 · 미판정**이다.

### E9 — Google · Facebook 계정 삭제

- **전제**: Google(또는 Facebook) 계정으로 로그인된 테스트 계정. 대시보드에서 그 사용자와 `app_user`(BE 진행 기록) 행을
  미리 캡처해 둔다.
- **절차**: 1. 설정 → `Delete account` → 대화상자의 `Delete account`. 2. 진행을 본다. 3. 대시보드를 새로고침한다.
  4. 앱을 종료 · 재실행한다. (Facebook도 같은 절차로 한 번 더.)
- **기대**: Apple 시트 **없음**. 진행 중 확인 액션 로딩 → 곧 로그인 화면(스택 `[온보딩, 로그인]`)으로 복귀. 대시보드에서
  **사용자가 없고 `app_user` 행도 없다**(CASCADE). 재실행하면 온보딩(세션 없음). 같은 계정으로 다시 로그인하면 새 사용자로
  가입된다.
- **증거**: 로그인 복귀 스크린샷 · 대시보드 삭제 전후 캡처(사용자 표 · `app_user` 조회).
- **대응**: test-plan E3.

### E10 — Apple 재인증 삭제 · appleid.apple.com 철회

- **전제**: Apple 계정으로 로그인된 테스트 계정. 대시보드 캡처 · iOS 설정 → Apple ID → **Sign in with Apple** 목록에
  앱이 보이는 상태.
- **절차**: 1. `Delete account` → 확인. 2. Apple 시트가 서면 Face ID(또는 암호)로 확인한다. 3. 로그인 화면을 본다.
  4. 대시보드를 새로고침한다. 5. iOS 설정 → Apple ID → Sign in with Apple(또는 appleid.apple.com의 「로그인 및 보안」 →
  Apple로 로그인)의 앱 목록을 새로고침한다.
- **기대**: 확인 뒤에야 시트가 서고(대화상자는 뒤에 로딩 상태로 남는다), 시트를 통과하면 로그인 화면으로 복귀한다.
  대시보드에서 사용자 · `app_user` 행 **없음**. **앱이 Sign in with Apple 목록에서 사라진다(철회)**. 시트 없이 삭제되는
  경로는 없다.
- **증거**: 시트 · 복귀 스크린샷 · 대시보드 캡처 · Apple ID 목록 전후 캡처.
- **대응**: test-plan E4.

### E11 — 삭제 중 진행 표시(서버 응답 대기)

- **전제**: E9 또는 E10을 도는 동안 함께 본다(별도 계정 불필요).
- **절차**: 삭제 확인 뒤 응답이 오기까지 화면을 관찰한다.
- **기대**: 응답을 기다리는 동안 **대화상자가 선 채** 확인 액션이 로딩(`Delete account, loading`), 취소 비활성, 뒤로가기 ·
  Scrim 무시. 응답이 오면(성공) 로그인 화면으로 간다. (A의 E7이 실패 쪽을 같은 요소로 본다.)
- **증거**: 로딩 중 스크린샷 · VoiceOver 낭독(`Delete account, loading`).
- **대응**: test-plan E8의 로딩 절반.

### E12 — Apple 시크릿 누락 배포에서 Apple 삭제 실패

- **전제**: **Apple 시크릿만 빠진** 배포(다른 시크릿은 있음) · Apple 계정. 이 배포는 일부러 만든 것이므로 확인 뒤 시크릿을
  복원한다. 만들 수 없으면 「미판정」으로 적는다.
- **절차**: 1. Apple 계정으로 `Delete account` → 확인 → 시트 통과. 2. 화면을 본다. 3. Supabase 함수 로그를 본다.
- **기대**: 대화상자가 닫히고 `Couldn't delete your account. Please try again.`, 계정 · 세션 그대로(대시보드에
  사용자 있음). 함수 로그에 `server_misconfigured`가 남고 **토큰 · 사용자 ID가 로그에 없다**.
- **증거**: 실패 스크린샷 · 로그 발췌(민감 값 가림).
- **대응**: test-plan E7.

### E13 — 같은 Apple ID 재가입 시 동의 화면

- **전제**: E10을 통과해 삭제된 Apple 테스트 계정 · **같은 Apple ID**.
- **절차**: 1. 로그인 화면에서 Apple 로그인으로 같은 Apple ID로 다시 가입한다. 2. 시트를 본다.
- **기대**: 철회가 됐다면 Apple이 **처음 가입하는 것처럼 동의 화면을 다시 띄운다**(이름 · 이메일 공유 선택 — 철회 전에는
  바로 지나갔다). 가입 뒤 새 사용자가 대시보드에 생기고 옛 진행은 없다(온보딩 · 여정이 처음 상태).
- **증거**: 시트 스크린샷 · 대시보드 새 사용자 캡처.
- **대응**: test-plan E4(철회 확인의 뒷면).

## 실행 기록

계정 종류 · 배포 상태를 환경 칸에 적는다. 값(번호 · 토큰 · 키)은 적지 않는다.

| 환경 | 빌드 | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | E10 | E11 | E12 | E13 | 확인자 · 확인 시각 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| iOS Simulator(iPhone 17 Pro) · Debug 호스트 · 함수 미배포 · 전화번호 계정 | `b29dfe8` + 로컬 전화 로그인 노출(커밋 안 함) | 통과 — 402pt 기본 글씨(375pt · 큰 글씨 미확인) | 미실행 — 실기 전용 | 통과 — 취소 · 확인 → 로그인, 뒤로 → 온보딩 | 통과 — 재실행 → 온보딩 | 미실행 — 시뮬레이터 네트워크 차단 수단 없음(integration IA3가 대신) | 통과(기본 글씨) — 제목 · 설명 · Delete account · Keep account, 본문 접근성 트리에서 빠짐. **실패(가장 큰 글씨 AX5)**: 삭제 대화상자가 화면을 넘친다 — 제목이 상태바 밑, 설명 끝 잘림, 두 버튼 겹침(ui-lynx Dialog 높이 상한 · 스크롤 없음, 접근성 검토 W4 — 모든 Dialog 공통, 후속). 로그아웃 대화상자는 AX5에서도 들어간다 | 통과 — 그 밖 문구 「Couldn't delete your account. Please try again.」, 설정 유지 · 세션 유지(연결 문구 경우는 미확인) | 미실행 — 실기 전용 | 미실행 — B | 미실행 — B | 미실행 — B | 미실행 — B | 미실행 — B | 루트 · 2026-09-30 |
| iPhone 실기(375pt 폭 기기 포함) · VoiceOver · 함수 미배포 | 미기록 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 — B | 미실행 — B | 미실행 — B | 미실행 — B | 미실행 — B | 미기록 — 실행 시 입력 |
| iPhone 실기 · 함수 배포 · 시크릿 등록 | 미기록 | — | — | — | — | — | — | — | — | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미기록 — 실행 시 입력 |
| iPhone 13 mini · 함수 배포(v6 — 서버 키 형식 보완 #176 포함) · 시크릿 등록 · 계정 공급자 미기록 | main `8fb4b429` Release(개발 서명) | — | — | — | — | — | — | — | — | **통과(E9 또는 E10 — 어느 공급자였는지 기록 없음)** — 설정 → Delete account → 로그인 화면. 서버: 함수 로그 `status 204`, `auth.users`에서 그 사용자 없음, `push_devices` 행도 CASCADE로 없음 | 위와 같음 | 미실행 | 미실행 | 미실행 | 루트 에이전트 · 사용자 · 2026-09-30 16:53 KST |
