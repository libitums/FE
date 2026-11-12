-- AI 컴패니언 M2 피드백: 유저 메시지마다 교정 · 더 나은 표현 · 「한국어로는」을 저장하고 메시지 목록에 붙인다(PRD §3.5 · §3.6, API §4 correction).
-- 피드백 방식(separate · natural · prefix)은 프로필 값이고, 판정(gate)이 돌려줘 그 턴의 프롬프트를 정한다.

create table companion.corrections (
  message_id uuid primary key references companion.messages (id) on delete cascade,
  status text not null check (status in ('ok', 'none', 'unavailable')),
  kind text check (kind is null or kind in ('correction', 'better', 'l1_to_ko')),
  items jsonb check (items is null or jsonb_typeof(items) = 'array'),
  better jsonb check (better is null or jsonb_typeof(better) = 'object'),
  l1_to_ko jsonb check (l1_to_ko is null or jsonb_typeof(l1_to_ko) = 'object'),
  created_at timestamptz not null default now(),
  check ((status = 'ok') = (kind is not null))
);
alter table companion.corrections enable row level security;
revoke all on table companion.corrections from public, anon, authenticated;
grant select, insert, update, delete on table companion.corrections to service_role;

-- SSE `correction` 데이터와 같은 모양(없는 칸은 빠진다).
create function companion.correction_json(c companion.corrections)
returns jsonb language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'userMessageId', c.message_id,
    'status', c.status,
    'kind', c.kind,
    'items', c.items,
    'better', c.better,
    'l1ToKo', c.l1_to_ko
  ))
$$;
revoke all on function companion.correction_json(companion.corrections) from public;

create or replace function companion.message_json(m companion.messages)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'role', m.role,
    'origin', m.origin,
    'status', companion.visible_status(m.status, m.created_at, now()),
    'hidden', m.hidden,
    'text', case when m.role = 'user' then m.text end,
    'inputMode', m.input_mode,
    'segments', case when m.hidden then '[]'::jsonb else m.segments end,
    'notice', case when m.notice_kind is null then null else jsonb_build_object('kind', m.notice_kind) end,
    'feedback', case when m.role = 'user' then (
      select companion.correction_json(c) from companion.corrections c where c.message_id = m.id
    ) end,
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
$$;
