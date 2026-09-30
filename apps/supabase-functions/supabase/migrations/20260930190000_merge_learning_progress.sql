-- 학습 진행은 단조 증가한다. 완료 목록은 합집합, 스텝·장면은 최댓값, 완료한 비주얼 노벨은 완료를 유지한다.
-- 기존 마이그레이션은 보존하고 저장 RPC만 교체한다(ADR-0035).

-- RPC 내부에서만 사용하는 순수 함수. 알려진 진행 필드는 검증하고, 유닛 ID는 앱 버전별로 제한하지 않는다.
create function public.merge_learning_progress_v1(p_saved jsonb, p_incoming jsonb)
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
  if p_saved#>>'{visualNovel,status}' = 'completed'
    or p_incoming#>>'{visualNovel,status}' = 'completed' then
    merged := jsonb_set(merged, '{visualNovel}', '{"status":"completed","beatIndex":2}'::jsonb);
  else
    merged := jsonb_set(merged, '{visualNovel}', jsonb_build_object(
      'status', 'active',
      'beatIndex', greatest(
        (p_saved#>>'{visualNovel,beatIndex}')::integer,
        (p_incoming#>>'{visualNovel,beatIndex}')::integer
      )
    ));
  end if;
  return merged;
end;
$$;

revoke all on function public.merge_learning_progress_v1(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.save_learning_progress(p_progress jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.learning_progress as saved (user_id, progress, updated_at)
  values (auth.uid(), public.merge_learning_progress_v1(p_progress, p_progress), now())
  on conflict (user_id) do update
    -- 별도 SELECT에서 읽은 스냅숏이 아닌, 충돌 행을 잠근 뒤의 최신 값과 합친다.
    -- 최초 INSERT가 겹치거나 이전 요청이 늦게 도착해도 앞서 저장된 진행을 보존한다.
    set progress = public.merge_learning_progress_v1(saved.progress, excluded.progress),
        updated_at = now();
  -- 합친 결과에도 기존 표의 16 KiB CHECK가 적용되며, 초과하면 문장 전체가 롤백된다.
end;
$$;

revoke all on function public.save_learning_progress(jsonb) from public, anon;
grant execute on function public.save_learning_progress(jsonb) to authenticated;
