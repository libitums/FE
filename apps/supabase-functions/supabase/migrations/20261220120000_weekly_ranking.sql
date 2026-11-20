-- 주간 순위(ADR-0170, 2026-11-20 사용자 승인 시안 「(가)」).
--
-- 회원만. 시즌은 한 주(월 00:00 UTC ~ 다음 월 00:00 UTC). 그 주에 처음 점수를 얻을 때 그룹(목표 25명 · 상한 30명)에 배정한다 —
-- 같은 구간(가입 나이 × 지금까지 통과한 유닛 수)끼리. 보드 둘:
--   · lessons — 이번 주 처음 통과한 서로 다른 레슨 유닛. 사용자 평생 한 번(이미 통과했던 유닛을 다시 통과하면 0). 보상 유닛 표
--     (`companion.content_units`)에 있는 유닛만 — 앱이 임의 키를 저장해 점수를 부풀리지 못하게(ADR-0148과 같은 근거).
--     `public.learning_progress` 트리거가 센다. 저장 RPC(`save_learning_progress`)는 바꾸지 않는다.
--   · chat_words — 이번 주 메신저에서 바르게 쓴 배운 단어(`voca:`), 단어마다 주 1번. chat-send가 교정 단계 뒤
--     `ranking_record_chat_words`(서버 키)로 넣는다. 교정이 그 단어를 짚으면 세지 않고(pending) 고쳐 다시 보낼 때 센다.
--
-- **앱은 표에 직접 닿지 않는다.** 스키마 `ranking`은 RLS를 켜고 정책 없이 두며 anon · authenticated에 스키마 · 표 권한이 없다.
-- 앱은 `ranking_board` · `ranking_preferences` · `ranking_set_hidden`만 부른다. 보드에는 표시 이름(learner_profiles.name, 없으면
-- 「Learner」) · 나라 · 에피소드 번호 · 점수만 싣는다 — user id · 이메일은 싣지 않는다. 계정을 지우면 순위 행도 지워진다(CASCADE).
-- 숨긴 사람(「Hide me from ranking」)은 기록은 계속 쌓이지만 남의 목록 · 그룹 인원 · 보상에서 빠지고, 본인 보드는 `hidden`이다.
--
-- 상위 3 보상은 `ranking.settings.reward_enabled`(기본 꺼짐). 정산 `ranking_settle_week`는 `supabase/cron/ranking.sql`이 매주 월
-- 00:05 UTC에 지난주로 부른다(마이그레이션 아님 — 사람이 적용). 지급은 `companion.grant_once`(서버 지갑, ADR-0116)라 여러 번 돌아도 한 번.

create schema ranking;
revoke all on schema ranking from public;

-- 운영 설정 한 줄. 보상을 켜려면: update ranking.settings set reward_enabled = true, reward_amount = 30;
create table ranking.settings (
  id boolean primary key default true check (id),
  reward_enabled boolean not null default false,
  reward_amount integer not null default 30 check (reward_amount between 0 and 100000),
  group_target integer not null default 25 check (group_target >= 1),
  group_max integer not null default 30,
  check (group_max >= group_target)
);
insert into ranking.settings default values;

create table ranking.groups (
  id uuid primary key default gen_random_uuid(),
  week date not null check (extract(isodow from week) = 1),
  bracket text not null check (char_length(bracket) between 1 and 32),
  created_at timestamptz not null default clock_timestamp()
);
create index groups_week_bracket_idx on ranking.groups (week, bracket, created_at);

create table ranking.members (
  week date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references ranking.groups (id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  primary key (week, user_id)
);
create index members_group_idx on ranking.members (group_id);
create index members_user_idx on ranking.members (user_id);

-- 사용자 평생 한 번 — 같은 (에피소드, 유닛)을 다시 통과하면 기본 키 충돌로 무시한다. `week`는 처음 통과한 주.
create table ranking.lesson_passes (
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id text not null,
  unit_key text not null,
  week date not null,
  passed_at timestamptz not null default now(),
  primary key (user_id, episode_id, unit_key)
);
create index lesson_passes_week_idx on ranking.lesson_passes (user_id, week);

-- 주 1번. `message_id`는 그 단어를 바르게 쓴 유저 메시지(대화를 지워도 남는 기록이라 외래 키 없음).
create table ranking.chat_words (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  expression_id text not null check (expression_id like 'voca:%'),
  message_id uuid,
  counted_at timestamptz not null default now(),
  primary key (user_id, week, expression_id)
);

create table ranking.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

create table ranking.rewards (
  week date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  board text not null check (board in ('lessons', 'chat_words')),
  rank integer not null check (rank between 1 and 3),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (week, user_id, board)
);

alter table ranking.settings enable row level security;
alter table ranking.groups enable row level security;
alter table ranking.members enable row level security;
alter table ranking.lesson_passes enable row level security;
alter table ranking.chat_words enable row level security;
alter table ranking.preferences enable row level security;
alter table ranking.rewards enable row level security;
revoke all on all tables in schema ranking from public, anon, authenticated;
grant usage on schema ranking to service_role;
grant select, insert, update, delete on all tables in schema ranking to service_role;

-- 그 시각의 주(UTC 월요일). 끝 = 시작 + 7일 00:00 UTC.
create function ranking.week_of(p_at timestamptz)
returns date language sql immutable as $$
  select date_trunc('week', p_at at time zone 'utc')::date;
$$;

-- 지금까지 통과한 콘텐츠 유닛 수(진도 구간용) — 진행 스냅숏의 catalogProgress 가운데 보상 유닛 표에 있는 것.
create function ranking.progress_units(p_user_id uuid)
returns integer language sql stable as $$
  select count(*)::integer
  from public.learning_progress lp
  cross join lateral jsonb_each(
    case when jsonb_typeof(lp.progress -> 'catalogProgress') = 'object' then lp.progress -> 'catalogProgress' else '{}'::jsonb end
  ) e
  cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
  join companion.content_units cu on cu.episode_id = e.key and cu.unit_key = u.value
  where lp.user_id = p_user_id;
$$;

-- 이번 주 그룹 배정(내부). 이미 있으면 그대로. 없으면 구간 = 가입 나이(<14일 · <60일 · 그 밖) × 진도(0~9 · 10~39 · 40+) —
-- 같은 주 · 같은 구간에서 숨기지 않은 인원이 group_target 미만이고 전체가 group_max 미만인 가장 오래된 그룹, 없으면 새 그룹.
-- 구간마다 advisory lock(트랜잭션 끝까지)으로 동시 배정이 한 그룹을 넘치게 하지 않는다. 없는 사용자면 null.
create function ranking.join_week(p_user_id uuid, p_now timestamptz)
returns uuid language plpgsql as $$
declare
  s ranking.settings;
  v_week date := ranking.week_of(p_now);
  v_group uuid;
  v_created timestamptz;
  v_units integer;
  v_bracket text;
begin
  select group_id into v_group from ranking.members where week = v_week and user_id = p_user_id;
  if found then
    return v_group;
  end if;
  select created_at into v_created from auth.users where id = p_user_id;
  if not found then
    return null;
  end if;
  v_units := ranking.progress_units(p_user_id);
  v_bracket := case
      when v_created > p_now - interval '14 days' then 'lt14d'
      when v_created > p_now - interval '60 days' then 'lt60d'
      else 'older'
    end || ':' || case when v_units < 10 then 'p0' when v_units < 40 then 'p10' else 'p40' end;
  perform pg_advisory_xact_lock(hashtext('ranking.join_week'), hashtext(v_week::text || ':' || v_bracket));
  -- 잠금을 기다리는 사이 같은 사용자가 배정됐을 수 있다.
  select group_id into v_group from ranking.members where week = v_week and user_id = p_user_id;
  if found then
    return v_group;
  end if;
  select * into s from ranking.settings;
  select g.id into v_group
  from ranking.groups g
  where g.week = v_week and g.bracket = v_bracket
    and (
      select count(*) from ranking.members m
      left join ranking.preferences p on p.user_id = m.user_id
      where m.group_id = g.id and not coalesce(p.hidden, false)
    ) < s.group_target
    and (select count(*) from ranking.members m where m.group_id = g.id) < s.group_max
  order by g.created_at, g.id
  limit 1;
  if v_group is null then
    insert into ranking.groups (week, bracket) values (v_week, v_bracket) returning id into v_group;
  end if;
  insert into ranking.members (week, user_id, group_id) values (v_week, p_user_id, v_group);
  return v_group;
end;
$$;

-- 그룹 한 보드의 순위(내부). 숨기지 않은 회원만. 점수 내림차순 → 그 점수에 먼저 닿은 순 → 이름 → 배정 순.
create function ranking.standings(p_group_id uuid, p_board text)
returns table (user_id uuid, rank integer, score integer, name text, country text, episode integer)
language sql stable as $$
  with scored as (
    select
      m.user_id,
      m.joined_at,
      case when p_board = 'lessons'
        then (select count(*) from ranking.lesson_passes lp where lp.user_id = m.user_id and lp.week = m.week)
        else (select count(*) from ranking.chat_words cw where cw.user_id = m.user_id and cw.week = m.week)
      end::integer as score,
      -- 그 점수에 닿은 시각 = 이번 주 마지막으로 점수가 오른 때. 0점이면 null(맨 뒤).
      case when p_board = 'lessons'
        then (select max(lp.passed_at) from ranking.lesson_passes lp where lp.user_id = m.user_id and lp.week = m.week)
        else (select max(cw.counted_at) from ranking.chat_words cw where cw.user_id = m.user_id and cw.week = m.week)
      end as reached_at,
      coalesce(pr.name, 'Learner') as name,
      pr.country_code as country
    from ranking.members m
    left join ranking.preferences p on p.user_id = m.user_id
    left join public.learner_profiles pr on pr.user_id = m.user_id
    where m.group_id = p_group_id and not coalesce(p.hidden, false)
  )
  select
    sd.user_id,
    (row_number() over (
      order by sd.score desc, sd.reached_at asc nulls last, sd.name collate "C", sd.joined_at, sd.user_id
    ))::integer,
    sd.score,
    sd.name,
    sd.country,
    (
      select max(substring(k.key from '^u([0-9]+)-')::integer)
      from public.learning_progress lpr
      cross join lateral jsonb_object_keys(
        case when jsonb_typeof(lpr.progress -> 'catalogProgress') = 'object' then lpr.progress -> 'catalogProgress' else '{}'::jsonb end
      ) k(key)
      where lpr.user_id = sd.user_id and k.key ~ '^u[0-9]+-'
    )
  from scored sd;
$$;

-- 레슨 점수: 새 스냅숏의 catalogProgress에서 옛 스냅숏에 없던 (에피소드, 유닛) 가운데 보상 유닛 표에 있는 것을 넣는다(평생 한 번 —
-- 충돌 무시). 하나라도 들어가면 이번 주 그룹에 배정. 비회원이던 기록을 로그인으로 들인 진행(ADR-0111)도 처음 올라온 유닛이면 센다.
create function ranking.on_learning_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_old jsonb;
  v_new jsonb := new.progress -> 'catalogProgress';
  v_added integer;
begin
  if jsonb_typeof(v_new) is distinct from 'object' then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    v_old := old.progress -> 'catalogProgress';
  end if;
  if jsonb_typeof(v_old) is distinct from 'object' then
    v_old := '{}'::jsonb;
  end if;
  insert into ranking.lesson_passes (user_id, episode_id, unit_key, week, passed_at)
  select distinct new.user_id, e.key, u.value, ranking.week_of(v_now), v_now
  from jsonb_each(v_new) e
  cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
  join companion.content_units cu on cu.episode_id = e.key and cu.unit_key = u.value
  where not coalesce(v_old -> e.key, '[]'::jsonb) @> jsonb_build_array(u.value)
  on conflict do nothing;
  get diagnostics v_added = row_count;
  if v_added > 0 then
    perform ranking.join_week(new.user_id, v_now);
  end if;
  return null;
end;
$$;
create trigger ranking_lesson_passes
  after insert or update of progress on public.learning_progress
  for each row execute function ranking.on_learning_progress();

-- 보드(앱). p_board: lessons | chat_words(그 밖은 22023). 상태 셋 — ranked(이번 주 그룹 있음) · not_joined(이번 주 아직 점수 없음) ·
-- hidden(숨김). 모양은 상태와 관계없이 같다(ranked가 아니면 groupSize 0 · rows [] · me · next null). reward는 보상이 켜졌을 때만 액수.
create function public.ranking_board(p_board text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s ranking.settings;
  v_week date := ranking.week_of(now());
  v_group uuid;
  v_state text;
  v_rows jsonb := '[]'::jsonb;
  v_size integer := 0;
  v_me_rank integer;
  v_me_score integer;
  v_next jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_board is null or p_board not in ('lessons', 'chat_words') then
    raise exception 'invalid board' using errcode = '22023';
  end if;
  select * into s from ranking.settings;
  if exists (select 1 from ranking.preferences where user_id = v_user and hidden) then
    v_state := 'hidden';
  else
    select group_id into v_group from ranking.members where week = v_week and user_id = v_user;
    v_state := case when v_group is null then 'not_joined' else 'ranked' end;
  end if;
  if v_state = 'ranked' then
    with st as (select * from ranking.standings(v_group, p_board))
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'rank', st.rank, 'name', st.name, 'country', st.country, 'episode', st.episode,
        'score', st.score, 'me', st.user_id = v_user
      ) order by st.rank), '[]'::jsonb),
      count(*),
      max(st.rank) filter (where st.user_id = v_user),
      max(st.score) filter (where st.user_id = v_user)
    into v_rows, v_size, v_me_rank, v_me_score
    from st;
    -- 바로 앞사람을 넘으려면 몇 점 더(같은 점수여도 먼저 닿은 사람이 위라 +1). 1위면 null.
    select jsonb_build_object('name', st.name, 'more', st.score - v_me_score + 1) into v_next
    from ranking.standings(v_group, p_board) st where st.rank = v_me_rank - 1;
  end if;
  return jsonb_build_object(
    'state', v_state,
    'board', p_board,
    'endsAt', to_char(v_week + 7, 'YYYY-MM-DD') || 'T00:00:00Z',
    'groupSize', v_size,
    'reward', case when s.reward_enabled and s.reward_amount > 0 then s.reward_amount end,
    'rows', v_rows,
    'me', case when v_state = 'ranked' then jsonb_build_object('rank', v_me_rank, 'score', v_me_score) end,
    'next', v_next
  );
end;
$$;

create function public.ranking_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'hidden', coalesce((select p.hidden from ranking.preferences p where p.user_id = auth.uid()), false)
  );
end;
$$;

create function public.ranking_set_hidden(p_hidden boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_hidden is null then
    raise exception 'invalid hidden' using errcode = '22023';
  end if;
  insert into ranking.preferences (user_id, hidden, updated_at) values (auth.uid(), p_hidden, now())
  on conflict (user_id) do update set hidden = excluded.hidden, updated_at = now();
  return jsonb_build_object('hidden', p_hidden);
end;
$$;

-- 채팅 단어 기록(chat-send, 서버 키). p_counted = 바르게 쓴 배운 단어, p_pending = 교정이 짚은 배운 단어. `voca:`가 아니거나 표현 표에
-- 없는 id는 버린다(각 앞 50개까지). 돌려주는 것: counted = 이번에 새로 센 id(입력 차례), pending = 이번 주에 아직 안 센 짚힌 id,
-- weekTotal = 이번 주 센 단어 수. 새로 셌으면 이번 주 그룹에 배정.
create function public.ranking_record_chat_words(
  p_user_id uuid, p_message_id uuid, p_counted text[], p_pending text[], p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date;
  v_id text;
  v_added integer;
  v_counted text[] := '{}';
  v_pending text[] := '{}';
begin
  if p_user_id is null or p_now is null or not isfinite(p_now) then
    raise exception 'invalid chat words' using errcode = '22023';
  end if;
  v_week := ranking.week_of(p_now);
  for v_id in
    select x.id from unnest((coalesce(p_counted, '{}'::text[]))[1:50]) with ordinality x(id, n)
    where x.id like 'voca:%' and exists (select 1 from companion.expressions e where e.id = x.id)
    order by x.n
  loop
    insert into ranking.chat_words (user_id, week, expression_id, message_id, counted_at)
    values (p_user_id, v_week, v_id, p_message_id, p_now)
    on conflict do nothing;
    get diagnostics v_added = row_count;
    if v_added > 0 then
      v_counted := v_counted || v_id;
    end if;
  end loop;
  for v_id in
    select x.id from unnest((coalesce(p_pending, '{}'::text[]))[1:50]) with ordinality x(id, n)
    where x.id like 'voca:%' and exists (select 1 from companion.expressions e where e.id = x.id)
      and not exists (
        select 1 from ranking.chat_words cw
        where cw.user_id = p_user_id and cw.week = v_week and cw.expression_id = x.id
      )
    order by x.n
  loop
    if not v_id = any (v_pending) then
      v_pending := v_pending || v_id;
    end if;
  end loop;
  if cardinality(v_counted) > 0 then
    perform ranking.join_week(p_user_id, p_now);
  end if;
  return jsonb_build_object(
    'counted', to_jsonb(v_counted),
    'pending', to_jsonb(v_pending),
    'weekTotal', (select count(*) from ranking.chat_words cw where cw.user_id = p_user_id and cw.week = v_week)
  );
end;
$$;

-- 주 정산(cron, 서버 키). 보상이 꺼졌으면 아무것도 안 하고 0. 켜졌으면 그 주 그룹마다 · 보드마다 1~3위(점수 > 0, 숨김 제외)에
-- `companion.grant_once(…, 'ranking', '주:보드:사용자')` + `ranking.rewards`. 여러 번 돌아도 한 번만 준다. 돌려주는 값 = 이번에 준 수.
create function public.ranking_settle_week(p_week date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s ranking.settings;
  v_group uuid;
  v_board text;
  v_row record;
  v_granted integer := 0;
begin
  if p_week is null or not isfinite(p_week) or extract(isodow from p_week) <> 1 then
    raise exception 'invalid week' using errcode = '22023';
  end if;
  select * into s from ranking.settings;
  if not s.reward_enabled or s.reward_amount <= 0 then
    return 0;
  end if;
  for v_group in select g.id from ranking.groups g where g.week = p_week order by g.created_at, g.id loop
    foreach v_board in array array['lessons', 'chat_words'] loop
      for v_row in
        select st.user_id, st.rank from ranking.standings(v_group, v_board) st
        where st.rank <= 3 and st.score > 0
        order by st.rank
      loop
        if companion.grant_once(
          v_row.user_id, s.reward_amount, 'ranking', p_week::text || ':' || v_board || ':' || v_row.user_id::text
        ) then
          insert into ranking.rewards (week, user_id, board, rank, amount)
          values (p_week, v_row.user_id, v_board, v_row.rank, s.reward_amount)
          on conflict do nothing;
          v_granted := v_granted + 1;
        end if;
      end loop;
    end loop;
  end loop;
  return v_granted;
end;
$$;

revoke all on function ranking.week_of(timestamptz) from public;
revoke all on function ranking.progress_units(uuid) from public;
revoke all on function ranking.join_week(uuid, timestamptz) from public;
revoke all on function ranking.standings(uuid, text) from public;
revoke all on function ranking.on_learning_progress() from public;
revoke all on function public.ranking_board(text) from public, anon;
revoke all on function public.ranking_preferences() from public, anon;
revoke all on function public.ranking_set_hidden(boolean) from public, anon;
revoke all on function public.ranking_record_chat_words(uuid, uuid, text[], text[], timestamptz) from public, anon, authenticated;
revoke all on function public.ranking_settle_week(date) from public, anon, authenticated;
grant execute on function public.ranking_board(text) to authenticated;
grant execute on function public.ranking_preferences() to authenticated;
grant execute on function public.ranking_set_hidden(boolean) to authenticated;
grant execute on function public.ranking_record_chat_words(uuid, uuid, text[], text[], timestamptz) to service_role;
grant execute on function public.ranking_settle_week(date) to service_role;
