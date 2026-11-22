-- 운영 도구 판정 메시지(ops-dashboard `docs/admin-contract.md` §F) — 사용자 상세 「신고 · 판정」에서 판정마다 어떤 메시지였는지 본다.
-- 20261214 뒤에 적용한다. 공통 규칙(`p_actor` · 열람 기록 · `service_role`만)은 20261212 그대로다.
--
-- 새 RPC: `ops_user_moderation(p_actor, p_user, p_limit, p_before)` — 판정(allow 빼고 block · crisis · hide) 최신순 한 쪽.
--   판정마다 걸린 사용자 메시지(`message`)와 그 턴의 캐릭터 답(`reply`)을 붙인다.
--   턴 저장 RPC는 판정을 사용자 메시지(`v_user.id`)에 단다. 캐릭터 답에 단 판정이 와도 같은 모양이 되게
--   답이면 `reply_to`로 사용자 메시지를 찾고, 사용자 메시지면 `reply_to`로 그 답(여럿이면 가장 늦은 것)을 찾는다.
--   글은 2000자에서 자른다. 메시지가 지워졌거나 없으면 null.
--   한 턴의 판정은 같은 시각에 들어가 `p_before`로 넘기면 갈라질 수 있다 — 쪽 끝 시각과 같은 판정은 다 넣는다(그래서 limit보다 많을 수 있다).
--   열람 기록 `view` · `user_moderation`(대화 열람처럼 메시지 내용을 보는 일이다).
--
-- 다시 적용해도 같은 결과다.

-- 판정 한 쪽. items 최신순, hasMore = 이 쪽보다 옛 판정이 더 있다.
create or replace function public.ops_user_moderation(
  p_actor text, p_user uuid, p_limit integer default 50, p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_cut timestamptz;
  v_items jsonb;
  v_more boolean;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  -- 쪽 끝 시각. 이 시각까지(같은 시각 포함) 넣는다.
  select min(e.created_at) into v_cut
  from (
    select created_at from companion.moderation_events
    where user_id = p_user and action <> 'allow' and (p_before is null or created_at < p_before)
    order by created_at desc
    limit p_limit
  ) e;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'at', e.created_at, 'stage', e.layer, 'category', e.category, 'action', e.action,
      'messageId', e.message_id, 'characterId', c.character_id,
      'message', case when um.id is not null then jsonb_build_object(
        'id', um.id, 'role', um.role, 'text', left(um.text, 2000), 'status', um.status, 'at', um.created_at) end,
      'reply', case when am.id is not null then jsonb_build_object(
        'id', am.id, 'status', am.status, 'hidden', am.hidden, 'segments', am.segments, 'at', am.created_at) end)
    order by e.created_at desc, e.id), '[]'::jsonb)
  into v_items
  from companion.moderation_events e
  left join companion.messages m on m.id = e.message_id
  left join companion.conversations c on c.id = m.conversation_id
  left join companion.messages um on um.id = case when m.role = 'assistant' then m.reply_to else m.id end and um.role = 'user'
  left join lateral (
    select * from companion.messages a
    where (m.role = 'assistant' and a.id = m.id)
      or (m.role = 'user' and a.reply_to = m.id and a.role = 'assistant')
    order by a.created_at desc
    limit 1
  ) am on true
  where e.user_id = p_user and e.action <> 'allow' and e.created_at >= v_cut
    and (p_before is null or e.created_at < p_before);

  v_more := v_cut is not null and exists (
    select 1 from companion.moderation_events
    where user_id = p_user and action <> 'allow' and created_at < v_cut
  );

  perform ops.log(v_actor, 'view', 'user_moderation', p_user, jsonb_strip_nulls(jsonb_build_object(
    'limit', p_limit, 'before', p_before)));
  return jsonb_build_object('items', v_items, 'hasMore', v_more);
end;
$$;

revoke all on function public.ops_user_moderation(text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_user_moderation(text, uuid, integer, timestamptz) to service_role;
