-- 기억 다듬기(ADR-0210). 기억을 뽑을 원문(`companion.memory_batch`, 20261123 판)에 마지막 메시지의 학습자 현지 날짜 `localDate`를 더한다 —
-- 운영 기억의 약 5%가 「내일 아침 7시에 첫 수업」처럼 상대 시간을 그대로 담아 다음 날이면 틀린 기억이 됐다. 추출 모델이 이 날짜로
-- 「내일 · 다음 주 · 어제」를 날짜로 바꿔 적는다. 현지 시간대는 선톡 판정(20261226)과 같은 순서로 찾는다 — 프로필 시간대 → 접속 지역 →
-- 학습 프로필의 나라, 모두 없으면 UTC. 기존 기억은 이 캐릭터 층만 준다(공유 층 없음, ADR-0210 D6 — 20270114130000).
--
-- 20261123 뒤에 적용한다. 다시 적용해도 같은 결과다.

create or replace function companion.memory_batch(p_conversation_id uuid, p_limit integer, p_min_user integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select m.id, m.role, m.text, m.segments, m.created_at, m.meta->>'inputSource' as input_source
    from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation_id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (c.memory_extracted_until is null or m.created_at > c.memory_extracted_until)
    order by m.created_at desc
    limit greatest(least(p_limit, 200), 1)
  )
  select case when count(*) filter (where role = 'user') >= greatest(p_min_user, 1) then jsonb_build_object(
    'until', max(created_at),
    -- 마지막 메시지의 학습자 현지 날짜(시간대를 모르면 UTC) — 추출 모델이 「내일 · 다음 주」를 날짜로 바꿔 적는다(ADR-0210 D3).
    'localDate', to_char(max(created_at) at time zone coalesce(
      (select coalesce(p.timezone, companion.default_timezone(p.last_region)) from companion.profiles p
        join companion.conversations cc on cc.user_id = p.user_id where cc.id = p_conversation_id),
      companion.country_timezone((select lp.country_code from public.learner_profiles lp
        join companion.conversations cc on cc.user_id = lp.user_id where cc.id = p_conversation_id)),
      'UTC'), 'YYYY-MM-DD'),
    'sourceMessageId', (select id from candidates where role = 'user' order by created_at desc limit 1),
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments, 'inputSource', input_source) order by created_at),
    'existing', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'content', e.content,
        'shared', e.character_id is null, 'userEdited', e.user_edited) order by e.created_at), '[]'::jsonb)
      from (
        select mm.* from companion.memories mm
        join companion.conversations c on c.id = p_conversation_id
        where mm.user_id = c.user_id and mm.deleted_at is null and mm.character_id = c.character_id
        order by mm.created_at desc limit 100
      ) e
    )
  ) else null end
  from candidates
$$;
revoke all on function companion.memory_batch(uuid, integer, integer) from public;
