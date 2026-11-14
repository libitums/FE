# ADR-0146 — 학습 보상은 배포 콘텐츠에 있는 유닛에만 (엽전 지급 검증)

- 상태: **채택 — 서버 마이그레이션 운영 적용 전.**
- 날짜: 2026-11-14.
- 계기: 보안 리뷰 H4(확인됨) — 메신저를 모두에게 열기 전에 막아야 한다.
- 이어받는 결정: [ADR-0140](0140-yeopjeon-launch.md) D1(`companion_claim_coins` — 깬 유닛 × 5 소급) · [ADR-0131](0131-companion-schema.md)(companion 스키마 · 앱 비노출) · [ADR-0145](0145-content-level-5.md)(level-5 콘텐츠)

## 위협

`public.companion_claim_coins()`(`20261127120000_yeopjeon_launch.sql`)는 사용자 자신의 진행 스냅숏 `public.learning_progress`
(`catalogProgress ∪ coinUnits`)에 있는 (에피소드, 유닛) 문자열마다 `learning_reward`(5)를 줬다. 확인은 길이(1 ~ 64 · 1 ~ 16)뿐이었다.
`save_learning_progress`는 JSON 모양만 본다(16KB 상한). 그래서 로그인한 누구나 `{"catalogProgress": {"x1": ["a", "b", …]}}`처럼 임의 키를
저장하고 지급을 부르면 키마다 5엽전을 받는다 — 키를 바꿔 가며 되풀이하면 상한이 없다. 엽전은 컴패니언 대화에 쓰인다
(`companion_turn_gate` · `companion_begin_turn`, 한 턴 3). 즉 무료로 유료 대화를 끝없이 쓸 수 있다.

## 결정

### D1. 서버 표 `companion.content_units` — 보상 받을 수 있는 (에피소드 id, 유닛 키)
- 열: `episode_id`(`^[a-z0-9][a-z0-9-]{0,63}$`) · `unit_key`(`^[A-Za-z0-9_-]{1,16}$`, `intro` · `INT` 금지) · `added_at`. 기본 키 (episode_id, unit_key).
- 지급 ref `<uid>:<ep>:<unit>`과 같은 단위라 조인 한 번으로 거른다. 버전 · 수준 열은 없다 — 앱 진행 기록에 버전이 없고, 같은 id는 수준이 달라도 같은 유닛이다.
- **추가만 한다.** 콘텐츠에서 유닛이 빠져도 이미 깬 사용자가 있어 지우지 않는다(지우면 소급 지급에서 사라진다).
- `companion` 스키마(PostgREST 비노출), RLS 켜고 정책 없음, `public · anon · authenticated` 권한 걷음, `service_role`만. 앱은 이 표를 읽지 않는다.

### D2. 시드(마이그레이션 `20261130120000_coin_claim_valid_units.sql`) — 187행
- 버킷의 모든 매니페스트(`manifest.json` · `manifests/level-2 ~ 5.json`, 2026-11-14) 본문 74개에서 `steps[].id` 중 막간(`kind: "interlude"`)을 뺀 것 — **174행**.
  지금 배포본 level-5(generated_at 2026-11-13T04:00:00Z) 18편과 같은 집합이다(옛 수준은 그 부분집합).

  | 에피소드 | 유닛 | 행 |
  |---|---|--:|
  | u00-tutorial | S1 S2 S3 RP | 4 |
  | u01 ~ u17 (17편) | S1 ~ S8 · CULT · RP | 각 10 = 170 |

- **역사적 id도 유효로 둔다** — 내장 콘텐츠의 git 이력에서만 보이는 id **13행**: `u00-tutorial` S4 ~ S13(카탈로그 u00 첫 판, 2026-10-22 #296 ~ 10-26 #315 무렵)과
  `u01-water` · `u02-checkin` · `u03-mina` S9(초기 내장판). 옛 앱 · 옛 판에서 실제로 깰 수 있었고, 지급 함수는 `catalogProgress`를 소급하므로 그때 깬 사용자의
  정당한 보상이다. 보안 목표는 「존재한 적 없는 id 거부」이고 이 13칸(최대 65엽전)은 상한이 정해진 작은 집합이다.
- 그래서 사용자 한 명이 받을 수 있는 학습 보상 총량은 187 × 5 = **935엽전**으로 묶인다.

### D3. 지급 함수
- `companion_claim_coins()`는 진행 스냅숏의 후보를 `companion.content_units`와 **조인**한 쌍에만 준다. 그 밖은 그대로 — 사용자별 멱등 ref,
  출시 보너스 100(`uid:2026-11`), 반환 `{learning, bonus, wallet}`, 로그인 필수, intro · INT 제외.
- **한 호출 지급 상한(cap)은 두지 않는다.** 표가 총량을 이미 묶고, cap은 정당한 소급 지급을 여러 호출로 나눌 뿐이다.

### D4. 표를 최신으로 유지
- `node devtools/content/content-units-sql.mjs --base https://<ref>.supabase.co/storage/v1/object/public/content/`(또는 `--content <dir>`)가 모든 매니페스트의
  모든 본문에서 보상 유닛을 모아 멱등 `insert … on conflict do nothing` 한 문장을 낸다. 순수 부분은 `devtools/content/content-units.mjs`(unit 테스트 CU-U1 ~ U5).
- **새 에피소드 · 새 유닛을 올리면 매니페스트를 올린 뒤 이 SQL을 운영 DB에 적용한다**([콘텐츠 계약 §13 규칙 11](../specs/episode-content-json-contract.md)).
  빠뜨리면 새 유닛을 깬 사용자가 그 유닛의 엽전을 받지 못한다(기록은 남아 있어 적용 뒤 다음 지급 호출 때 소급된다 — 잃지는 않는다).
- 순서는 「매니페스트 올림 → SQL 적용」이어도 「SQL 먼저」여도 된다. 행이 먼저 있어도 아무도 그 유닛을 깰 수 없을 뿐이다.

## 이미 위조 키로 받은 엽전

지금 운영에서 지급 함수를 부를 수 있었던 것은 테스터 계정뿐이다(메신저 · 엽전이 테스터에게만 열려 있음). 이 마이그레이션은 **회수하지 않는다** —
회수는 잔액이 음수가 되거나 이미 쓴 대화와 엇갈릴 수 있어 사람이 보고 정한다. 적용 뒤 아래 감사 질의로 확인한다(**이 작업에서 실행하지 않았다**).

```sql
-- 표에 없는 유닛으로 지급된 learning 원장 행 — 사용자별 건수 · 액수
select l.user_id, u.email, count(*) as forged_grants, sum(l.delta) as forged_coins,
       min(l.created_at) as first_at, max(l.created_at) as last_at
from companion.credit_ledger l
join auth.users u on u.id = l.user_id
where l.kind = 'grant' and l.reason = 'learning'
  and not exists (
    select 1 from companion.content_units cu
    where l.ref_id = l.user_id::text || ':' || cu.episode_id || ':' || cu.unit_key
  )
group by l.user_id, u.email
order by forged_coins desc;
```

건이 있으면 사용자 결정으로 처리한다(예: 같은 액수의 음수 원장 행 — 지금 `kind` check에서 가장 가까운 것은 `expire`(bucket `grant`, reason `forged_learning`) — 과
지갑 `grant_balance` 차감을 한 트랜잭션으로. 원장 합 = 지갑을 지키고, 이미 대화에 써서 잔액이 모자라면 0까지만 깎는다). 이 질의는 서버 테스트 CV-S8이 같은 문장으로 돌려 본다.

## 버린 대안

1. **`save_learning_progress`에서 검증** — 저장 단계에서 모르는 키를 거부. 저장은 지급과 무관한 동기화(여러 기기 병합 · 옛 앱)라 거부하면 옛 판 기록 ·
   아직 표에 없는 새 유닛 기록이 사라지거나 저장 전체가 실패한다. 돈이 걸린 곳은 지급이므로 지급에서 거르는 것이 가장 좁다. 저장의 거짓 키는 무해하다.
2. **서버 측 레슨 완료 이벤트로 지급** — 앱이 유닛을 끝낼 때 서버에 완료를 보내고 그 기록만 믿는 방식. 앱이 결과를 스스로 판정하므로 완료 이벤트도
   클라이언트가 보내는 주장일 뿐이다(지금 위협과 같은 수준). 막을 수 있는 것은 「존재하지 않는 유닛」뿐이고 그것은 이 표가 한다. 소급(엽전 제도 전에
   깬 유닛) · 오프라인 학습도 깨진다.
3. **`companion.expression_units`(표현 ↔ 유닛)로 판정** — 문항 `ref`가 있는 유닛만 실리고, 동기화가 전체 지우고 다시 넣기라 옛 id가 사라진다.
4. **에피소드 JSON을 지급 때 버킷에서 읽기** — DB 함수가 HTTP를 부르게 되고, 콘텐츠 장애가 지급 장애가 된다.

## 대가 · 남는 위험

- 실제로 있는 유닛은 깨지 않고도 받을 수 있다 — 진행 스냅숏에 187개 키를 모두 적으면 935엽전. 앱이 학습 결과를 스스로 판정하는 구조의 한계이고,
  막으려면 서버 채점이 필요하다(범위 밖). 상한이 있어 「무한」은 막았다.
- 새 콘텐츠를 올릴 때 SQL 적용을 빠뜨리면 그 유닛의 지급이 늦어진다(D4 — 잃지는 않음).

## 운영 적용 (사용자)

1. 마이그레이션 `apps/supabase-functions/supabase/migrations/20261130120000_coin_claim_valid_units.sql`을 적용한다(20261127 엽전 출시가 먼저 적용돼 있어야 한다).
2. 확인: `select count(*) from companion.content_units;` → 187.
3. 위 감사 질의를 돌려 결과를 본다.

## 테스트

- unit CU-U1 ~ U5(`devtools/content/content-units.unit.test.mjs`) — 순수 함수 · 마이그레이션 시드 ⊇ 내장 콘텐츠 · 187행.
- 서버 CV-S1 ~ S8(`coin-claim-valid-units.integration.test.ts`, 임베디드 postgres) — 위조 키 0 · 섞이면 실제만 · 시드 모양 · 역사적 id · 앱 역할 접근 불가 · 멱등 추가 · 2,000키 성능 · 감사 질의.
  기존 YL1 ~ YL6(엽전 출시)은 픽스처가 실제 유닛이라 그대로 통과.
- ui · 앱 integration · e2e: 해당 없음(앱 변경 없음).
