-- 스냅샷 진행 단계 · 비율 먼저(ADR-0146 개정 2026-11-23, 사용자 결정 — 기다리는 동안 UX 「단계 표시」 · 「비율 맞춘 자리표시자」).
-- 사진 한 장은 기준 그림 · 장면 구상(프롬프트 노드, 약 3초) → 그리기(약 15초) → 저장이다. 장면 구상이 끝나면 Edge Function이
-- `companion_media_stage`로 단계 `drawing`과 프롬프트 노드가 고른 비율을 이 행에 적는다 — 전에는 비율이 완성 때만 적혔다.
-- 앱은 만드는 중(pending) 결과의 `stage`(preparing | drawing) · `stageAt`(그 단계가 시작된 시각)으로 상태 줄 · 진행 막대를, `aspect`로
-- 자리표시자 상자 비율을 맞춘다. 끝나면(complete · blocked · failed · 시간 초과) `stage` · `stageAt`은 null.
-- `media_json`은 20261207 판에 `stage` · `stageAt` 두 칸만 더했다.

alter table companion.media add column if not exists stage text check (stage in ('drawing'));
alter table companion.media add column if not exists stage_at timestamptz;

create or replace function companion.media_json(m companion.media)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'characterId', m.character_id,
    'messageId', m.message_id,
    'kind', m.kind,
    'status', case when x.expired then 'failed' else m.status end,
    'charge', m.charge,
    'cost', case when m.status in ('pending', 'complete') and not x.expired then m.cost else 0 end,
    'path', m.storage_path,
    'mime', m.mime,
    'aspect', m.aspect,
    'failure', case when x.expired then 'expired' else m.failure end,
    'aiGenerated', true,
    'engine', m.meta->>'engine',
    'model', m.meta->>'model',
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'finishedAt', case when m.finished_at is null then null else to_char(m.finished_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'line', jsonb_build_object('ko', l.ko, 'en', l.en),
    'fromPastChat', not exists (select 1 from companion.messages msg where msg.id = m.message_id),
    'previewPath', case when m.status = 'pending' and not x.expired then m.preview_path end,
    'stage', case when m.status = 'pending' and not x.expired then coalesce(m.stage, 'preparing') end,
    'stageAt', case when m.status = 'pending' and not x.expired
      then to_char(coalesce(m.stage_at, m.created_at) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  )
  from (select m.status = 'pending' and m.created_at < now() - make_interval(mins => (select media_pending_minutes from companion.settings)) as expired) x,
  lateral (
    select
      coalesce(string_agg(seg->>'text', ' ' order by ord) filter (where seg->>'text' <> ''), '') as ko,
      coalesce(string_agg(seg->>'translation', ' ' order by ord) filter (where coalesce(seg->>'translation', '') <> ''), '') as en
    from jsonb_array_elements(case when jsonb_typeof(m.source) = 'array' then m.source else '[]'::jsonb end) with ordinality as s(seg, ord)
    where seg->>'kind' = case
      when exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(m.source) = 'array' then m.source else '[]'::jsonb end) e
        where e->>'kind' = 'speech'
      ) then 'speech' else 'action' end
  ) l
$$;
revoke all on function companion.media_json(companion.media) from public;

-- 단계 적기(서버 전용). 아직 만드는 중일 때만. 비율은 3:2 · 1:1만. 돌려주는 값 `{result: ok | not_pending}`.
create or replace function public.companion_media_stage(p_media_id uuid, p_stage text, p_aspect text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_stage is distinct from 'drawing' then
    raise exception 'invalid stage' using errcode = '22023';
  end if;
  if p_aspect is not null and p_aspect not in ('3:2', '1:1') then
    raise exception 'invalid aspect' using errcode = '22023';
  end if;
  update companion.media
  set stage = p_stage, stage_at = now(), aspect = coalesce(p_aspect, aspect)
  where id = p_media_id and status = 'pending';
  if not found then
    return jsonb_build_object('result', 'not_pending');
  end if;
  return jsonb_build_object('result', 'ok');
end;
$$;
revoke all on function public.companion_media_stage(uuid, text, text) from public, anon, authenticated;
grant execute on function public.companion_media_stage(uuid, text, text) to service_role;
