-- 스냅샷 중간 그림 미리보기(사용자 결정 2026-11-16 — 부분 이미지 스트리밍 한 장). 이미지 엔진이 다 그리기 전에 흐릿한 중간 그림을 보내면
-- Edge Function이 `companion-media/<user_id>/<media_id>.preview.png`로 올리고 `companion_media_preview`로 이 행에 적는다. 앱은 만드는 중(pending)
-- 결과의 `previewPath`가 생기면 그 그림을 흐리게 먼저 보이고(자기 폴더라 지금 읽기 정책 그대로), 완성되면 `path`로 바꾼다.
-- 끝나면(complete · blocked · failed · 시간 초과) `previewPath`는 null이고 파일은 Edge Function이 지운다.
-- `media_json`은 20261203 판에 `previewPath` 한 칸만 더했다.

alter table companion.media add column if not exists preview_path text;

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
    'previewPath', case when m.status = 'pending' and not x.expired then m.preview_path end
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

-- 미리보기 적기(서버 전용). 아직 만드는 중이고 경로가 그 유저 폴더일 때만. 돌려주는 값 `{result: ok | not_pending}`.
create or replace function public.companion_media_preview(p_media_id uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v companion.media;
begin
  if p_path is null or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.preview\.png$' then
    raise exception 'invalid preview path' using errcode = '22023';
  end if;
  update companion.media set preview_path = p_path
  where id = p_media_id and status = 'pending' and p_path like user_id::text || '/%'
  returning * into v;
  if not found then
    return jsonb_build_object('result', 'not_pending');
  end if;
  return jsonb_build_object('result', 'ok');
end;
$$;
revoke all on function public.companion_media_preview(uuid, text) from public, anon, authenticated;
grant execute on function public.companion_media_preview(uuid, text) to service_role;
