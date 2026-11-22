-- 운영 도구 에셋 수(ops-dashboard `docs/admin-contract.md` §E-A `ops_search_users`) — 「전체」 사용자 둘러보기를 사용자가 만든
-- 스냅샷(그림) · 음성 수로 거르고 정렬한다. 20261214 뒤에 적용한다. 공통 규칙(`p_actor` · 열람 기록 · `service_role`만)은 20261212 그대로다.
--
-- 바뀌는 것: `ops_search_users`
--   - 줄마다 `snapshots` · `voices` — 그 사용자의 `companion.media` 중 **완료(status = 'complete')** 인 스냅샷 · 음성 수(없으면 0).
--     막힘 · 실패 · 만드는 중은 세지 않는다(파일이 없다).
--   - `p_min_snapshots` · `p_min_voices`(0 ~ 100000, null = 조건 없음): 그 수 이상인 사용자만. 둘 다 주면 AND.
--     범위 밖은 `invalid_min_snapshots` · `invalid_min_voices`.
--   - `p_sort`에 `snapshots` · `voices`.
--   인수 꼴이 바뀌어 옛 함수를 지우고 새로 만든다 — 새 인수는 기본값이 있어 옛 호출도 그대로 된다.
--   열람 기록 detail에는 준 것만 `minSnapshots` · `minVoices`를 더한다.
--
-- 다시 적용해도 같은 결과다. 20261214를 다시 적용했다면 이 파일도 다시 적용한다(옛 인수 꼴이 돌아와 호출이 겹친다).

drop function if exists public.ops_search_users(text, text, text, boolean, text, timestamptz, timestamptz, integer, integer, text, text);

-- 필터 찾기 · 둘러보기. 조건은 모두 AND, 정렬은 p_sort · p_dir(기본 가입 최신순). total은 limit · offset 전 수. 열람 기록 detail = 받은 필터.
-- 줄 = UserRow + snapshots · voices(완료된 스냅샷 · 음성 수).
create or replace function public.ops_search_users(
  p_actor text,
  p_query text default null,
  p_country text default null,
  p_tester boolean default null,
  p_tier text default null,
  p_joined_after timestamptz default null,
  p_joined_before timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0,
  p_sort text default 'created_at',
  p_dir text default 'desc',
  p_min_snapshots integer default null,
  p_min_voices integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_query text := nullif(btrim(p_query), '');
  v_sort text := coalesce(p_sort, 'created_at');
  v_dir text := coalesce(p_dir, 'desc');
  v_default boolean;
  v_uuid uuid;
  v_pattern text;
  v_total integer;
  v_items jsonb;
begin
  if v_query is not null and char_length(v_query) not between 2 and 200 then
    raise exception 'invalid_query' using errcode = '22023';
  end if;
  if p_country is not null and p_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country' using errcode = '22023';
  end if;
  if p_tier is not null and p_tier not in ('free', 'chat_plus', 'premium', 'unlimited_tickets') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  if p_offset is null or p_offset not between 0 and 100000 then
    raise exception 'invalid_offset' using errcode = '22023';
  end if;
  if p_min_snapshots is not null and p_min_snapshots not between 0 and 100000 then
    raise exception 'invalid_min_snapshots' using errcode = '22023';
  end if;
  if p_min_voices is not null and p_min_voices not between 0 and 100000 then
    raise exception 'invalid_min_voices' using errcode = '22023';
  end if;
  if v_sort not in ('created_at', 'last_sign_in_at', 'email', 'balance', 'country', 'snapshots', 'voices') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;
  if v_dir not in ('asc', 'desc') then
    raise exception 'invalid_dir' using errcode = '22023';
  end if;
  v_default := v_sort = 'created_at' and v_dir = 'desc';
  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_uuid := v_query::uuid;
  elsif v_query is not null then
    v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with media_counts as (
    select
      md.user_id,
      (count(*) filter (where md.kind = 'snapshot'))::integer as snapshots,
      (count(*) filter (where md.kind = 'voice'))::integer as voices
    from companion.media md
    where md.status = 'complete'
    group by md.user_id
  ),
  matched as (
    select
      u.id,
      u.created_at,
      u.last_sign_in_at,
      lower(u.email) as email,
      w.sub_balance + w.grant_balance + w.paid_balance as balance_raw,
      coalesce(lp.country_code, cp.last_region) as country,
      coalesce(mc.snapshots, 0) as snapshots,
      coalesce(mc.voices, 0) as voices
    from auth.users u
    left join public.learner_profiles lp on lp.user_id = u.id
    left join companion.profiles cp on cp.user_id = u.id
    left join companion.credit_wallets w on w.user_id = u.id
    left join media_counts mc on mc.user_id = u.id
    where (v_query is null or (v_uuid is not null and u.id = v_uuid)
        or (v_pattern is not null and (u.email ilike v_pattern or lp.name ilike v_pattern)))
      and (p_country is null or coalesce(lp.country_code, cp.last_region) = p_country)
      and (p_tester is null or coalesce(u.raw_app_meta_data->>'duru_tester' = 'true', false) = p_tester)
      and (p_joined_after is null or u.created_at >= p_joined_after)
      and (p_joined_before is null or u.created_at < p_joined_before)
      and (p_tier is null or ops.tier_of(u.id) = p_tier)
      and (p_min_snapshots is null or coalesce(mc.snapshots, 0) >= p_min_snapshots)
      and (p_min_voices is null or coalesce(mc.voices, 0) >= p_min_voices)
  ),
  -- 잔액은 UserRow처럼 지갑이 없으면 0(빈 값이 아니다).
  ranked as (
    select m.id, m.snapshots, m.voices, row_number() over (order by
      case when v_sort = 'created_at' and v_dir = 'asc' then m.created_at end asc nulls last,
      case when v_sort = 'created_at' and v_dir = 'desc' then m.created_at end desc nulls last,
      case when v_sort = 'last_sign_in_at' and v_dir = 'asc' then m.last_sign_in_at end asc nulls last,
      case when v_sort = 'last_sign_in_at' and v_dir = 'desc' then m.last_sign_in_at end desc nulls last,
      case when v_sort = 'email' and v_dir = 'asc' then m.email end asc nulls last,
      case when v_sort = 'email' and v_dir = 'desc' then m.email end desc nulls last,
      case when v_sort = 'balance' and v_dir = 'asc' then coalesce(m.balance_raw, 0) end asc nulls last,
      case when v_sort = 'balance' and v_dir = 'desc' then coalesce(m.balance_raw, 0) end desc nulls last,
      case when v_sort = 'country' and v_dir = 'asc' then m.country end asc nulls last,
      case when v_sort = 'country' and v_dir = 'desc' then m.country end desc nulls last,
      case when v_sort = 'snapshots' and v_dir = 'asc' then m.snapshots end asc nulls last,
      case when v_sort = 'snapshots' and v_dir = 'desc' then m.snapshots end desc nulls last,
      case when v_sort = 'voices' and v_dir = 'asc' then m.voices end asc nulls last,
      case when v_sort = 'voices' and v_dir = 'desc' then m.voices end desc nulls last,
      m.id) as rn
    from matched m
  )
  select
    (select count(*)::integer from ranked),
    coalesce((
      select jsonb_agg(ops.user_row(x.id) || jsonb_build_object('snapshots', x.snapshots, 'voices', x.voices) order by x.rn)
      from (select id, snapshots, voices, rn from ranked order by rn limit p_limit offset p_offset) x
    ), '[]'::jsonb)
  into v_total, v_items;

  perform ops.log(v_actor, 'view', 'search_users', null, jsonb_strip_nulls(jsonb_build_object(
    'query', v_query, 'country', p_country, 'tester', p_tester, 'tier', p_tier,
    'joinedAfter', p_joined_after, 'joinedBefore', p_joined_before, 'limit', p_limit, 'offset', p_offset,
    'sort', case when not v_default then v_sort end, 'dir', case when not v_default then v_dir end,
    'minSnapshots', p_min_snapshots, 'minVoices', p_min_voices)));
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

revoke all on function public.ops_search_users(text, text, text, boolean, text, timestamptz, timestamptz, integer, integer, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.ops_search_users(text, text, text, boolean, text, timestamptz, timestamptz, integer, integer, text, text, integer, integer)
  to service_role;
