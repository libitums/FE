# ADR-0131 — AI 컴패니언의 표는 `companion` 스키마에 둔다 (기존 `public` 표는 건드리지 않는다)

- 상태: **제안** — FE 팀 리뷰 대기. M0 마이그레이션(`20261108120000_companion_foundation.sql`)이 이미 이 결정대로 쓰였고, 운영 DB에는 SQL 편집기로 적용돼 있다(2026-11-12 확인 — `companion` 표 23 · `public.companion_*` 함수 55, `schema_migrations` 미기록. 기록 맞추기는 통합 PR 뒤).
- 날짜: (채택일에 적는다)
- 다루는 축: 컴패니언 기능의 DB 표가 **어느 스키마에 사는가**, 기존 표(`learner_profiles` 등)와 **어떻게 잇는가**.
  **다루지 않는 것**: 표에 닿는 길(→ [ADR-0133](0133-companion-public-function-access.md)) · 표의 칸 하나하나(→ [API 명세 §7](../specs/ai-companion-api.md)) · 학습 데이터 자체의 정본(콘텐츠 버킷 그대로).
- 이어받는 결정: [ADR-0059](0059-learner-profile.md)(학습자 프로필은 그대로 — 컴패니언은 읽지도 고치지도 않는다).

근거 표시: **[코드]** 저장소 코드 · **[사용자]** 사용자 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. **기존 표는 전부 `public`에 있고, RLS를 켜고 앱 역할의 권한을 걷은 채 RPC로만 열려 있다** [코드 — `20261013120000_learner_profiles.sql` 등]. 표 이름이 곧 PostgREST 경로가 되는 스키마다.
2. **컴패니언은 표가 많고 성격이 다르다** [코드 — API 명세 §7]. 대화 · 메시지 · 기억 · 크레딧 원장 · 사용량 · 신고 · 안전 판정 · 학습 표현 사본이 M0 ~ M4에 걸쳐 들어온다. 학습 앱의 표와 이름이 겹치기 쉽고(`profiles`, `messages`), 수명(대화 보존 기간) · 삭제 규칙(계정 삭제 연쇄)도 다르다.
3. **기획 위키 초안은 `learner_profiles`에 칸을 더하자고 적었다** [위키 — 어긋남 3번]. 그러면 학습 앱이 쓰는 표에 컴패니언의 변경이 섞이고, 컴패니언을 걷을 때 학습 앱 표를 다시 고쳐야 한다.
4. **학습 표현의 정본은 콘텐츠 버킷의 에피소드 JSON이다** [코드 — ADR-0035 `catalogProgress`]. 서버 함수가 대화 중에 「이 학습자가 배운 표현」을 찾으려면 DB에 사본이 있어야 한다.

## 결정

### D1. 컴패니언의 표는 전부 `companion` 스키마에 만든다

- `create schema companion` — `public`에 대한 기본 권한을 걷고(`revoke all … from public`), `usage`는 `service_role`에게만 준다.
- 표마다 RLS를 켜고 정책은 두지 않는다. `anon` · `authenticated`의 권한은 걷는다 — 앱 역할로는 표가 **보이지도 않는다**.
- **PostgREST에 노출하지 않는다**(대시보드 「Exposed schemas」에 넣지 않는다). 그래서 `/rest/v1/` 경로로 닿을 길이 처음부터 없다.

### D2. 기존 `public` 표는 바꾸지 않는다

- 컴패니언이 필요로 하는 학습자 값(나이 · 모국어 · 피드백 방식)은 `companion.profiles`에 따로 둔다 — `learner_profiles`에 칸을 더하지 않는다.
- 기존 표에 대한 외래 키는 `auth.users(id) on delete cascade` 하나로 잇는다. 계정 삭제는 기존 흐름([ADR-0032](0032-account-sign-out-and-deletion.md)) 그대로 컴패니언 행까지 지운다.
- 학습 진행(`catalogProgress`)은 서버 함수가 **읽기만** 한다(API 명세 §3.3 `companion_learning_context`).

### D3. 학습 표현은 `companion.expressions` · `companion.expression_units`에 사본으로 둔다

- 정본은 버킷의 에피소드 JSON이다. 배포 스크립트(`devtools/companion-expressions/`)가 스냅숏 SQL을 만들고, 운영자가 `companion.sync_expressions`로 넣는다.
- id 접두사는 콘텐츠에 실제로 있는 다섯(`voca` · `expr` · `patt` · `gram` · `nume`)이다.

## 버린 대안

- **`public`에 `companion_` 접두사 표로 만든다** — 이름 충돌은 피하지만 표가 PostgREST 경로에 그대로 서고, 권한 실수 한 줄이 곧 공개 노출이다. 스키마 단위로 걷는 쪽이 실수 여지가 작다.
- **`learner_profiles`에 칸을 더한다**(위키 초안) — 맥락 3. 학습 앱 표의 변경과 섞인다.
- **별도 Supabase 프로젝트** — 인증 · 학습 진행을 읽으려면 프로젝트 사이 신뢰가 필요하고, 운영 대상이 둘이 된다.

## 대가

- 스키마가 노출되지 않으니 **대시보드의 Table editor · 자동 API 문서로는 안 보인다**. 조회는 SQL 편집기나 서버용 함수로 한다.
- 마이그레이션마다 `companion.` 접두사와 권한 줄을 빠짐없이 써야 한다 — 통합 테스트 CF1 ~ CF11이 앱 역할로 표에 못 닿는 것을 본다.

## 재검토 조건

- 컴패니언을 걷거나(기능 종료) 학습 앱과 표를 합쳐야 할 요구가 생기면(예: 학습 화면이 대화 기록을 직접 그린다) 다시 본다.
- 운영자가 표를 직접 봐야 하는 일이 주 1회를 넘으면, 조회용 서버 함수나 운영 대시보드 쪽 길을 정한다(PRD 열린 질문 — playground).
