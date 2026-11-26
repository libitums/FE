-- 지난 친구 스토리 — 엽전으로 열기(ADR-0202, 사용자 결정 2026-11-26 「기본값대로 서버 PR부터」). 친구 스토리(20261228120000) 위에 쌓는다.
-- 1. 24시간 안 스토리는 지금처럼 무료(`companion_friend_stories()` 그대로). 「지난 스토리」 = 그 인물의 최근 7일 안 스토리 중 이미 만료된 것.
-- 2. 열기: 친구 하나 단위 · 값 `settings.past_story_price`(기본 10엽전) · 연 뒤 7일 동안 그 친구의 지난 스토리(보는 시각 기준 최근 7일)를 본다.
--    「모든 인물」 요금제(`companion.has_all_characters` — Chat Plus · Premium, ADR-0162 · 20261223과 같은 기준)가 살아 있으면 무료(값 0 기록, 원장 없음).
-- 3. 친구 = 내가 말한 대화가 있는, 켜진, 숨기지 않은 인물(내 스토리 반응 대상과 같은 기준 — 20261228140000). 아니면 열 수 없다.
-- 4. 차감은 티켓 사기(20261231)와 같은 길: 지갑 잠금 → 구독분 → 지급분 → 구매분, 원장 `spend` · reason `past_stories` · ref = 요청 id.
--    같은 요청 id는 같은 결과(기록 표의 (user, request) 유일), 이미 열려 있으면 `already`(차감 없음), 잔액이 모자라면 `insufficient`(차감 없음).
-- 5. 스위치 `settings.past_stories`: off(기본) · testers · on — 친구 스토리 스위치(`stories_on`)도 켜져 있어야 한다.
-- 6. 표 `past_story_opens`: RLS 켬 · 본인 읽기 정책만, 쓰기 권한 없음(함수만). companion 스키마는 앱에 열려 있지 않다 — 앱은 RPC로만 읽는다.
-- 7. 앱 RPC(authenticated): `companion_past_stories_status(character)` · `companion_open_past_stories(character, request_id)` ·
--    `companion_list_past_stories(character)`. 시각을 받는 내부 함수(`companion.*_at(user, character, …, p_now)`)가 판정한다.
-- 응답 모양: docs/specs/past-stories.md.

alter table companion.settings
  add column if not exists past_stories text not null default 'off' check (past_stories in ('off', 'testers', 'on')),
  add column if not exists past_story_price integer not null default 10 check (past_story_price > 0);

-- ------------------------------------------------------------------ 표

create table companion.past_story_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id),
  -- 앱이 누를 때마다 만드는 id — 응답을 잃어 다시 보내도 한 번.
  request_id uuid not null,
  opened_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > opened_at),
  paid_with text not null check (paid_with in ('coins', 'subscription')),
  price integer not null check (price >= 0),
  -- 원장 줄의 ref_id(reason `past_stories`). 구독 무료면 null.
  ledger_ref text,
  unique (user_id, request_id),
  check ((paid_with = 'coins') = (ledger_ref is not null))
);
create index past_story_opens_user_idx on companion.past_story_opens (user_id, character_id, expires_at desc);

alter table companion.past_story_opens enable row level security;
revoke all on table companion.past_story_opens from public, anon, authenticated;
grant select on table companion.past_story_opens to authenticated;
grant select, insert, update, delete on table companion.past_story_opens to service_role;
create policy past_story_opens_owner_read on companion.past_story_opens
  for select to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------------ 도움 함수

create function companion.past_stories_on(p_user_id uuid)
returns boolean language sql stable as $$
  select companion.stories_on(p_user_id)
    and companion.switch_on((select past_stories from companion.settings), p_user_id)
$$;
revoke all on function companion.past_stories_on(uuid) from public;

-- 친구인가 — 내가 말한 대화가 있고, 켜진, 숨기지 않은 인물(내 스토리 반응 대상과 같은 기준).
create function companion.past_story_friend(p_user_id uuid, p_character_id text, p_now timestamptz)
returns boolean language sql stable as $$
  select exists (
    select 1 from companion.conversations cv
    join companion.characters c on c.id = cv.character_id
    where cv.user_id = p_user_id and cv.character_id = p_character_id and cv.kind = 'companion' and c.active
      and not companion.friend_hidden(p_user_id, c.persona, p_now)
      and exists (select 1 from companion.messages m where m.conversation_id = cv.id and m.role = 'user')
  )
$$;
revoke all on function companion.past_story_friend(uuid, text, timestamptz) from public;

-- 그 인물의 지난 스토리 — 최근 7일 안에 올렸고 이미 만료된 것.
create function companion.past_stories_of(p_character_id text, p_now timestamptz)
returns setof companion.stories language sql stable as $$
  select s.* from companion.stories s
  where s.character_id = p_character_id
    and s.posted_at > p_now - interval '7 days' and s.expires_at <= p_now
$$;
revoke all on function companion.past_stories_of(text, timestamptz) from public;

-- 지금 살아 있는 열림(가장 늦게 끝나는 것), 없으면 null.
create function companion.past_story_open_of(p_user_id uuid, p_character_id text, p_now timestamptz)
returns companion.past_story_opens language sql stable as $$
  select o.* from companion.past_story_opens o
  where o.user_id = p_user_id and o.character_id = p_character_id and o.opened_at <= p_now and o.expires_at > p_now
  order by o.expires_at desc limit 1
$$;
revoke all on function companion.past_story_open_of(uuid, text, timestamptz) from public;

create function companion.past_open_json(
  p_result text, p_character_id text, p_price integer, p_open companion.past_story_opens, p_user_id uuid, p_now timestamptz
)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'result', p_result,
    'characterId', p_character_id,
    'price', p_price,
    'paidWith', p_open.paid_with,
    'openedAt', case when p_open.id is null then null else companion.story_time(p_open.opened_at) end,
    'expiresAt', case when p_open.id is null then null else companion.story_time(p_open.expires_at) end,
    'wallet', companion.wallet_json(p_user_id, p_now)
  )
$$;
revoke all on function companion.past_open_json(text, text, integer, companion.past_story_opens, uuid, timestamptz) from public;

-- ------------------------------------------------------------------ 판정 (시각 주입)

create function companion.past_stories_status_at(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  v_enabled boolean := companion.past_stories_on(p_user_id);
  v_friend boolean := v_enabled and companion.past_story_friend(p_user_id, p_character_id, p_now);
  v_open companion.past_story_opens := case when v_friend then companion.past_story_open_of(p_user_id, p_character_id, p_now) end;
  v_previews jsonb := '[]'::jsonb;
begin
  if v_friend then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'imagePath', p.image_path,
      'postedAt', companion.story_time(s.posted_at)
    ) order by s.posted_at desc, s.id), '[]'::jsonb)
    into v_previews
    from companion.past_stories_of(p_character_id, p_now) s
    join companion.story_pool p on p.id = s.pool_id;
  end if;
  return jsonb_build_object(
    'enabled', v_enabled,
    'characterId', p_character_id,
    'friend', v_friend,
    'count', jsonb_array_length(v_previews),
    'previews', v_previews,
    'open', v_open.id is not null,
    'expiresAt', case when v_open.id is null then null else companion.story_time(v_open.expires_at) end,
    'price', (select past_story_price from companion.settings),
    'subscriberFree', companion.has_all_characters(p_user_id, p_now),
    'wallet', companion.wallet_json(p_user_id, p_now)
  );
end;
$$;
revoke all on function companion.past_stories_status_at(uuid, text, timestamptz) from public;

-- 돌려주는 값: { result: 'opened' | 'already' | 'insufficient' | 'not_friend' | 'empty' | 'off', characterId, price, paidWith, openedAt, expiresAt,
--   shortBy?(insufficient), wallet }.
create function companion.open_past_stories_at(p_user_id uuid, p_character_id text, p_request_id uuid, p_now timestamptz)
returns jsonb language plpgsql as $$
declare
  v_price integer;
  v_open companion.past_story_opens;
  v_empty companion.past_story_opens;
  v_ref text := p_request_id::text;
  v_wallet companion.credit_wallets;
  v_have integer;
  v_left integer;
  v_take integer;
  v_bucket text;
begin
  if p_request_id is null then
    raise exception 'request id required' using errcode = '22004';
  end if;
  select past_story_price into v_price from companion.settings;

  -- 지갑을 먼저 잠근다 — 같은 사람의 겹친 요청은 줄을 서고, 둘째는 첫째의 기록을 본다.
  perform companion.lock_wallet(p_user_id);

  -- 같은 요청 id: 그 기록 그대로(스위치 · 친구 판정이 그 사이 바뀌어도 같은 답).
  select * into v_open from companion.past_story_opens where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_open.character_id <> p_character_id then
      raise exception 'request id already used for another character' using errcode = '22023';
    end if;
    return companion.past_open_json('opened', p_character_id, v_open.price, v_open, p_user_id, p_now);
  end if;

  if not companion.past_stories_on(p_user_id) then
    return companion.past_open_json('off', p_character_id, v_price, v_empty, p_user_id, p_now);
  end if;
  if not companion.past_story_friend(p_user_id, p_character_id, p_now) then
    return companion.past_open_json('not_friend', p_character_id, v_price, v_empty, p_user_id, p_now);
  end if;
  if not exists (select 1 from companion.past_stories_of(p_character_id, p_now)) then
    return companion.past_open_json('empty', p_character_id, v_price, v_empty, p_user_id, p_now);
  end if;

  v_open := companion.past_story_open_of(p_user_id, p_character_id, p_now);
  if v_open.id is not null then
    return companion.past_open_json('already', p_character_id, v_price, v_open, p_user_id, p_now);
  end if;

  -- 구독자(「모든 인물」 요금제): 값 0 기록, 원장 없음.
  if companion.has_all_characters(p_user_id, p_now) then
    insert into companion.past_story_opens (user_id, character_id, request_id, opened_at, expires_at, paid_with, price)
    values (p_user_id, p_character_id, p_request_id, p_now, p_now + interval '7 days', 'subscription', 0)
    returning * into v_open;
    return companion.past_open_json('opened', p_character_id, 0, v_open, p_user_id, p_now);
  end if;

  select * into v_wallet from companion.credit_wallets where user_id = p_user_id;
  v_have := coalesce(v_wallet.sub_balance, 0) + coalesce(v_wallet.grant_balance, 0) + coalesce(v_wallet.paid_balance, 0);
  if v_have < v_price then
    return companion.past_open_json('insufficient', p_character_id, v_price, v_empty, p_user_id, p_now)
      || jsonb_build_object('shortBy', v_price - v_have);
  end if;

  -- 턴 예약 · 먼저 만나기 · 티켓과 같은 순서로 뺀다: 구독분 → 지급분 → 구매분.
  v_left := v_price;
  foreach v_bucket in array array['sub', 'grant', 'paid'] loop
    exit when v_left = 0;
    execute format('select least(%I, $1) from companion.credit_wallets where user_id = $2', v_bucket || '_balance')
      into v_take using v_left, p_user_id;
    if v_take > 0 then
      execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_take, p_user_id;
      insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
      values (p_user_id, -v_take, v_bucket, 'spend', 'past_stories', v_ref);
      v_left := v_left - v_take;
    end if;
  end loop;

  insert into companion.past_story_opens (user_id, character_id, request_id, opened_at, expires_at, paid_with, price, ledger_ref)
  values (p_user_id, p_character_id, p_request_id, p_now, p_now + interval '7 days', 'coins', v_price, v_ref)
  returning * into v_open;
  return companion.past_open_json('opened', p_character_id, v_price, v_open, p_user_id, p_now);
end;
$$;
revoke all on function companion.open_past_stories_at(uuid, text, uuid, timestamptz) from public;

-- 돌려주는 값: { result: 'ok' | 'locked' | 'off', expiresAt, stories } — stories는 `companion_friend_stories()`의 줄과 같은 모양(freeReply는 늘 false).
create function companion.list_past_stories_at(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  v_open companion.past_story_opens;
begin
  if not companion.past_stories_on(p_user_id) then
    return jsonb_build_object('result', 'off', 'expiresAt', null, 'stories', '[]'::jsonb);
  end if;
  if companion.past_story_friend(p_user_id, p_character_id, p_now) then
    v_open := companion.past_story_open_of(p_user_id, p_character_id, p_now);
  end if;
  if v_open.id is null then
    return jsonb_build_object('result', 'locked', 'expiresAt', null, 'stories', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'result', 'ok',
    'expiresAt', companion.story_time(v_open.expires_at),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'characterId', s.character_id,
        'postedAt', companion.story_time(s.posted_at),
        'expiresAt', companion.story_time(s.expires_at),
        'imagePath', p.image_path,
        'line', jsonb_build_object('ko', p.line_ko, 'roman', p.line_roman, 'meaning', p.meaning),
        'word', p.word,
        'replies', p.replies,
        -- 만료된 스토리라 첫 답장 무료가 없다(`companion_claim_story_reply`가 expired로 돌려준다).
        'freeReply', false
      ) order by s.posted_at desc, s.id)
      from companion.past_stories_of(p_character_id, p_now) s
      join companion.story_pool p on p.id = s.pool_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function companion.list_past_stories_at(uuid, text, timestamptz) from public;

-- ------------------------------------------------------------------ 앱 RPC

create function companion.require_user()
returns uuid language plpgsql stable as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return v_user;
end;
$$;
revoke all on function companion.require_user() from public;

create function public.companion_past_stories_status(p_character_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select companion.past_stories_status_at(companion.require_user(), p_character_id, now())
$$;

create function public.companion_open_past_stories(p_character_id text, p_request_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select companion.open_past_stories_at(companion.require_user(), p_character_id, p_request_id, now())
$$;

create function public.companion_list_past_stories(p_character_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select companion.list_past_stories_at(companion.require_user(), p_character_id, now())
$$;

revoke all on function public.companion_past_stories_status(text) from public, anon;
revoke all on function public.companion_open_past_stories(text, uuid) from public, anon;
revoke all on function public.companion_list_past_stories(text) from public, anon;
grant execute on function public.companion_past_stories_status(text) to authenticated;
grant execute on function public.companion_open_past_stories(text, uuid) to authenticated;
grant execute on function public.companion_list_past_stories(text) to authenticated;
