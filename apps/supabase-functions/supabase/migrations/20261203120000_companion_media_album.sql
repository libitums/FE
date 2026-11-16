-- 앨범 칸(ADR-0150 — 미디어 2단계): 앱 결과 한 건(`companion.media_json`)에 두 칸을 더한다.
-- 1. `line {ko, en}` — 만들 때 저장한 말풍선(`media.source`)의 말. 말(speech) 조각의 한국어를 이어 붙이고 번역도 이어 붙인다.
--    말 조각이 없으면(지문만) 지문을 쓴다. 앨범 칸 · 사진 보기 · 음성 시트가 「그때의 말」로 보인다.
-- 2. `fromPastChat` — 그 메시지가 더는 없다(대화 초기화로 지워짐, D6). 앱은 「From a past chat」을 달고 다시 만들기를 숨긴다
--    (`companion_media_begin`이 메시지를 찾지 못해 거절한다).
-- `companion_list_media` · `companion_get_media` · 시작 · 마침의 응답이 모두 이 함수를 쓴다 — 함수 하나만 바꾼다.

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
    'fromPastChat', not exists (select 1 from companion.messages msg where msg.id = m.message_id)
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
