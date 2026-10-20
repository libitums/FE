-- 학습 티켓 원장(`tickets`: { refillAtMs, grantedMs, grantDay })을 검증하고 필드마다 큰 값으로 합친다.
-- 원장의 세 값은 모두 앱에서 단조 증가한다 — 쓰면 refillAtMs가 늘고, 무료로 받으면 grantedMs · grantDay가 는다.
-- 그래서 필드별 최댓값이 「남은 장수가 적은 쪽」이면서 받은 1장을 잃지 않는 병합이다(앱 `mergeTicketLedgers`와 같다).
-- 나머지 필드의 검증 · 병합은 20261012120000과 같다. 추가분은 「tickets」 표시 주석 두 곳뿐이다.
-- 옛 앱 · 가득 찬 원장은 이 키를 보내지 않는다 — 들어온 쪽에 없으면 저장된 값이 그대로 남는다.

create or replace function public.merge_learning_progress_v1(p_saved jsonb, p_incoming jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  snapshot jsonb;
  field text;
  steps numeric;
  merged jsonb;
  ids jsonb;
  catalog jsonb;
  episode text;
  ticket_field text;
  list_fields constant text[] := array[
    'completedEpisodeIntroIds', 'completedMessengerUnitIds',
    'completedPhoneCallUnitIds', 'completedEpisodeFinalIds'
  ];
begin
  foreach snapshot in array array[p_saved, p_incoming] loop
    if jsonb_typeof(snapshot) is distinct from 'object'
      or snapshot->'version' is distinct from '1'::jsonb
      or octet_length(snapshot::text) > 16384 then
      raise exception 'invalid learning progress snapshot' using errcode = '22023';
    end if;
    if jsonb_typeof(snapshot->'completedStepCount') is distinct from 'number' then
      raise exception 'invalid completed step count' using errcode = '22023';
    end if;
    steps := (snapshot->>'completedStepCount')::numeric;
    if steps < 0 or steps <> trunc(steps) or steps > 9007199254740991 then
      raise exception 'invalid completed step count' using errcode = '22023';
    end if;
    foreach field in array list_fields loop
      if jsonb_typeof(snapshot->field) is distinct from 'array' then
        raise exception 'invalid completed unit list' using errcode = '22023';
      end if;
      if exists (
        select 1 from jsonb_array_elements(snapshot->field) as item(value)
        where jsonb_typeof(value) <> 'string' or value = '""'::jsonb
      ) then
        raise exception 'invalid completed unit id' using errcode = '22023';
      end if;
    end loop;
    if (
      jsonb_typeof(snapshot->'visualNovel') = 'object' and (
        (snapshot#>>'{visualNovel,status}' = 'active'
          and snapshot#>'{visualNovel,beatIndex}' in ('0'::jsonb, '1'::jsonb))
        or (snapshot#>>'{visualNovel,status}' = 'completed'
          and snapshot#>'{visualNovel,beatIndex}' = '2'::jsonb)
      )
    ) is not true then
      raise exception 'invalid visual novel progress' using errcode = '22023';
    end if;
    -- catalogProgress: 선택. 있으면 { 비어 있지 않은 키: 비어 있지 않은 문자열 배열 }.
    if snapshot ? 'catalogProgress' then
      if jsonb_typeof(snapshot->'catalogProgress') is distinct from 'object' then
        raise exception 'invalid catalog progress' using errcode = '22023';
      end if;
      if exists (
        select 1 from jsonb_each(snapshot->'catalogProgress') as entry(key, value)
        where key = '' or jsonb_typeof(value) <> 'array'
      ) or exists (
        select 1 from jsonb_each(snapshot->'catalogProgress') as entry(key, value),
          jsonb_array_elements(value) as item(unit)
        where jsonb_typeof(unit) <> 'string' or unit = '""'::jsonb
      ) then
        raise exception 'invalid catalog progress' using errcode = '22023';
      end if;
    end if;
    -- tickets: 선택. 있으면 { refillAtMs · grantedMs: 0 이상 안전 정수, grantDay: '' 또는 YYYY-MM-DD }.
    if snapshot ? 'tickets' then
      if jsonb_typeof(snapshot->'tickets') is distinct from 'object'
        or jsonb_typeof(snapshot#>'{tickets,grantDay}') is distinct from 'string'
        or (snapshot#>>'{tickets,grantDay}' <> ''
          and snapshot#>>'{tickets,grantDay}' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
        raise exception 'invalid learning tickets' using errcode = '22023';
      end if;
      foreach ticket_field in array array['refillAtMs', 'grantedMs'] loop
        if jsonb_typeof(snapshot->'tickets'->ticket_field) is distinct from 'number'
          or (snapshot->'tickets'->>ticket_field)::numeric < 0
          or (snapshot->'tickets'->>ticket_field)::numeric
            <> trunc((snapshot->'tickets'->>ticket_field)::numeric)
          or (snapshot->'tickets'->>ticket_field)::numeric > 9007199254740991 then
          raise exception 'invalid learning tickets' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;

  merged := p_saved || p_incoming;
  merged := jsonb_set(merged, '{completedStepCount}', to_jsonb(greatest(
    (p_saved->>'completedStepCount')::numeric,
    (p_incoming->>'completedStepCount')::numeric
  )));
  foreach field in array list_fields loop
    select coalesce(jsonb_agg(id order by id collate "C"), '[]'::jsonb) into ids
    from (
      select distinct value collate "C" as id
      from jsonb_array_elements_text((p_saved->field) || (p_incoming->field)) as item(value)
    ) as unique_ids;
    merged := jsonb_set(merged, array[field], ids);
  end loop;
  -- v1의 추가 메타데이터는 보존하고 진행을 나타내는 두 필드만 단조 증가시킨다.
  merged := jsonb_set(merged, '{visualNovel}', (p_saved->'visualNovel') || (p_incoming->'visualNovel'));
  if p_saved#>>'{visualNovel,status}' = 'completed'
    or p_incoming#>>'{visualNovel,status}' = 'completed' then
    merged := jsonb_set(merged, '{visualNovel,status}', '"completed"'::jsonb);
    merged := jsonb_set(merged, '{visualNovel,beatIndex}', '2'::jsonb);
  else
    merged := jsonb_set(merged, '{visualNovel,status}', '"active"'::jsonb);
    merged := jsonb_set(merged, '{visualNovel,beatIndex}', to_jsonb(greatest(
      (p_saved#>>'{visualNovel,beatIndex}')::integer,
      (p_incoming#>>'{visualNovel,beatIndex}')::integer
    )));
  end if;
  -- catalogProgress: 둘 다 없으면 키를 만들지 않는다(기존 결과와 바이트 동일). 있으면 키별 합집합, 원소는 C 정렬.
  if p_saved ? 'catalogProgress' or p_incoming ? 'catalogProgress' then
    catalog := '{}'::jsonb;
    for episode in
      select key from jsonb_each(coalesce(p_saved->'catalogProgress', '{}'::jsonb))
      union
      select key from jsonb_each(coalesce(p_incoming->'catalogProgress', '{}'::jsonb))
    loop
      select coalesce(jsonb_agg(id order by id collate "C"), '[]'::jsonb) into ids
      from (
        select distinct value collate "C" as id
        from jsonb_array_elements_text(
          coalesce(p_saved#>array['catalogProgress', episode], '[]'::jsonb)
          || coalesce(p_incoming#>array['catalogProgress', episode], '[]'::jsonb)
        ) as item(value)
      ) as unique_ids;
      catalog := jsonb_set(catalog, array[episode], ids);
    end loop;
    merged := jsonb_set(merged, '{catalogProgress}', catalog);
  end if;
  -- tickets: 둘 다 있으면 필드마다 큰 값. 하나만 있으면 `||`가 이미 그것을 남겼다. 둘 다 없으면 키가 없다.
  if p_saved ? 'tickets' and p_incoming ? 'tickets' then
    merged := jsonb_set(merged, '{tickets}', jsonb_build_object(
      'refillAtMs', greatest(
        (p_saved#>>'{tickets,refillAtMs}')::numeric, (p_incoming#>>'{tickets,refillAtMs}')::numeric),
      'grantedMs', greatest(
        (p_saved#>>'{tickets,grantedMs}')::numeric, (p_incoming#>>'{tickets,grantedMs}')::numeric),
      'grantDay', greatest(
        (p_saved#>>'{tickets,grantDay}') collate "C", (p_incoming#>>'{tickets,grantDay}') collate "C")
    ));
  end if;
  return merged;
end;
$$;

revoke all on function public.merge_learning_progress_v1(jsonb, jsonb) from public, anon, authenticated;
