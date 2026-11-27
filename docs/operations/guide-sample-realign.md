# 운영 절차 — 어긋난 가이드 무료 예시 행을 첫 인사로 옮기기 (이슈 #648)

> **실행하지 않은 절차서다.** 운영 DB(`wgwnitgyotyvixozwrzu`) 쓰기이므로 사용자가 따로 정한 뒤에만 돌린다.
> 서버 수정(마이그레이션 `20270113120000_companion_sample_greeting_target.sql`, ADR-0146 개정 ⟨2026-11-27⟩)은 **새로 받는** 예시만 바르게 한다.
> 이 절차는 그 전에 이미 응답 · 선톡에 붙은 행을 다룬다.

## 무엇이 어긋났나

- `companion.media`의 `charge = 'sample'` 행 가운데 `message_id`가 첫 인사(origin `greeting`)가 아닌 것.
- 그 행의 `source`는 응답 글이라 앨범 · 말풍선 자막(`media_json.line`)이 응답 문장인데, 실제 소리 · 사진은 첫 인사의 고정 파일이다.
- 2026-11-27 SELECT 집계(이 PR 작성 때): turn 1,020(사진 500 · 음성 520) · proactive 13(6 · 7) · 메시지 지워짐 14(7 · 7). 이슈 본문의 1,022건 뒤에도 늘었다 —
  서버 수정이 적용될 때까지 계속 는다. **서버 수정을 먼저 적용하고 나서** 이 절차를 돌린다(뒤에 다시 생기지 않게).
- 엽전 영향 없음(모두 cost 0, 예약 없음).

## 하는 일

1. 백업 표를 뜬다(대상 행 전체).
2. 첫 인사가 있는 대화의 행: `message_id` → 그 대화의 첫 인사, `source` → 첫 인사의 segments.
3. 대상 메시지가 지워진 행(14행): 고치지 않는다. 대부분 대화 초기화로 대화째 지워져 붙을 첫 인사가 없다. 앨범에는 「지난 대화」(`fromPastChat`)로 남는다.
   필요하면 따로 정한다(아래 「남는 것」).

사용자가 이미 본 화면 순서가 바뀐다 — 다시 읽으면 사진 · 음성이 응답 아래에서 첫 인사 아래로 간다.

## 0. 미리 보기 (SELECT만)

```sql
select coalesce(msg.origin, 'deleted') as target, m.kind,
  count(*) as rows,
  count(g.id) as with_greeting
from companion.media m
left join companion.messages msg on msg.id = m.message_id
left join lateral (
  select g.id from companion.messages g
  where g.conversation_id = m.conversation_id and g.user_id = m.user_id and g.origin = 'greeting'
    and companion.media_eligible(g)
  order by g.created_at, g.id limit 1
) g on true
where m.charge = 'sample' and msg.origin is distinct from 'greeting'
group by 1, 2 order by 1, 2;
```

`deleted` 줄의 `with_greeting`이 0이고, turn · proactive 줄은 `rows = with_greeting`이어야 한다. 다르면 멈추고 원인을 본다.

## 1. 백업 표

```sql
create table companion.media_sample_realign_backup_20261127 as
select m.*, now() as backed_up_at
from companion.media m
left join companion.messages msg on msg.id = m.message_id
where m.charge = 'sample' and msg.origin is distinct from 'greeting';

alter table companion.media_sample_realign_backup_20261127 enable row level security;
revoke all on companion.media_sample_realign_backup_20261127 from public, anon, authenticated;

select count(*) from companion.media_sample_realign_backup_20261127; -- 0번의 rows 합과 같아야 한다
```

## 2. 고치기 (한 트랜잭션)

```sql
begin;

with target as (
  select b.id as media_id, g.id as greeting_id, g.segments
  from companion.media_sample_realign_backup_20261127 b
  join lateral (
    select g.id, g.segments from companion.messages g
    where g.conversation_id = b.conversation_id and g.user_id = b.user_id and g.origin = 'greeting'
      and companion.media_eligible(g)
    order by g.created_at, g.id limit 1
  ) g on true
)
update companion.media m
set message_id = t.greeting_id,
    source = coalesce(t.segments, '[]'::jsonb)
from target t
where m.id = t.media_id
  and m.charge = 'sample';
-- 바뀐 행 수 = 0번의 turn + proactive rows 합. 다르면 rollback.

-- 확인: 첫 인사가 아닌 곳에 붙은 sample 행은 지워진 메시지의 것만 남는다.
select coalesce(msg.origin, 'deleted') as target, count(*)
from companion.media m left join companion.messages msg on msg.id = m.message_id
where m.charge = 'sample' and msg.origin is distinct from 'greeting'
group by 1;

commit; -- 위 확인이 맞을 때만. 아니면 rollback;
```

## 3. 확인

- 앨범(`companion_list_media`)에서 옮긴 행의 `line.ko`가 첫 인사 문장이다.
  ```sql
  select companion.media_json(m)->'line'->>'ko' as line, count(*)
  from companion.media m
  where m.id in (select id from companion.media_sample_realign_backup_20261127)
  group by 1 order by 2 desc limit 5;
  ```
- 음성 행: `media.text`(녹음 문장)와 `line.ko`가 같다.

## 되돌리기

```sql
update companion.media m
set message_id = b.message_id, source = b.source
from companion.media_sample_realign_backup_20261127 b
where m.id = b.id;
```

백업 표는 확인이 끝나고 일정 기간(예: 2주) 뒤 사용자가 지운다: `drop table companion.media_sample_realign_backup_20261127;`

## 남는 것

- 메시지가 지워진 14행 — 대화가 지워졌으면 붙일 곳이 없다. 그대로 두거나(앨범에 남음) 지우는 것은 사용자 결정. 지우면 그 계정은 다시 예시를 제안받는다
  (`sample_*_available`은 같은 종류의 행이 하나도 없을 때만 참 — 그 종류를 따로 만든 적이 없으면 참이 된다).
