-- 턴 비용 · 지난 대화(2026-11-10).
--
-- 1. 지난 대화 = 마지막 요약 뒤의 정상 메시지(`companion_begin_turn`). 전에는 최근 N개 고정 창이라 창 밖 ~ 요약 사이(최대 29개)가
--    원문에도 요약에도 없었고, 창이 매 턴 밀려 지난 대화의 캐시가 맞지 않았다. 이제 지난 대화는 요약 사이에 뒤로 붙기만 하고
--    (`companion_summary_source`의 p_keep + settings.summary_after에 닿으면 오래된 것부터 요약되어 빠진다) 앞부분이 그대로라 캐시된다.
--    p_history_limit은 요약이 계속 실패할 때의 상한이다.
-- 2. 기억 추출을 턴마다에서 몇 턴씩 묶음으로. `conversations.memory_extracted_until` 뒤의 유저 메시지가 `settings.memory_every`개
--    모이면 `companion_memory_source`가 그 메시지들을 주고, 추출 · 저장 뒤 `companion_mark_memories`가 표시를 옮긴다.
--    최근 메시지는 어차피 지난 대화로 답 모델에 들어가므로 묶어도 이 캐릭터와의 대화에는 잃는 것이 없다.

alter table companion.settings
  add column memory_every integer not null default 5 check (memory_every between 1 and 50);
alter table companion.conversations add column memory_extracted_until timestamptz;

-- ------------------------------------------------------------------ 시작: 지난 대화는 마지막 요약 뒤
-- 20261113 판에서 지난 대화 조건 한 줄(summarized_until)만 다르다.

create or replace function public.companion_begin_turn(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_history_limit integer,
  p_region text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_tier text;
  v_hold companion.credit_holds;
  v_wallet companion.credit_wallets;
  v_trial boolean := false;
  v_cost integer;
  v_left integer;
  v_take integer;
  v_bucket text;
  v_buckets jsonb := '{}'::jsonb;
  v_used integer;
  v_conversation companion.conversations;
  v_message_id uuid;
  v_speech text;
begin
  if p_text is null or char_length(p_text) not between 1 and 1000 or p_input_mode not in ('text', 'voice')
    or p_history_limit not between 0 and 100 then
    raise exception 'invalid turn' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  v_tier := companion.tier_of(p_user_id, p_now);

  -- 예약(API §6.2). 같은 메시지의 열린 · 확정된 예약이 있으면 그대로 쓴다(멱등). 지갑을 잠가 동시 차감을 막는다.
  v_wallet := companion.lock_wallet(p_user_id);
  select * into v_hold from companion.credit_holds
  where user_id = p_user_id and client_message_id = p_client_message_id and status <> 'released';
  if not found then
    v_cost := s.message_cost;
    if v_tier = 'free' and p_character_id = s.trial_character then
      insert into companion.trial_usage (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
      select used into v_used from companion.trial_usage where user_id = p_user_id and character_id = p_character_id for update;
      if v_used < s.trial_limit then
        update companion.trial_usage set used = used + 1 where user_id = p_user_id and character_id = p_character_id;
        v_trial := true;
        v_cost := 0;
      elsif v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance < v_cost then
        return jsonb_build_object('result', 'trial_exhausted', 'detail', jsonb_build_object('characterId', p_character_id));
      end if;
    end if;
    if v_cost > 0 then
      if v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance < v_cost then
        return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
          'required', v_cost, 'balance', v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance));
      end if;
      v_left := v_cost;
      foreach v_bucket in array s.bucket_order loop
        exit when v_left = 0;
        execute format('select %I from companion.credit_wallets where user_id = $1', v_bucket || '_balance') into v_take using p_user_id;
        v_take := least(v_take, v_left);
        if v_take > 0 then
          execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
            v_bucket || '_balance', v_bucket || '_balance') using v_take, p_user_id;
          v_buckets := v_buckets || jsonb_build_object(v_bucket, v_take);
          v_left := v_left - v_take;
        end if;
      end loop;
    end if;
    insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
    values (p_user_id, p_client_message_id, p_character_id, v_cost, v_buckets, v_trial)
    returning * into v_hold;
    insert into companion.credit_ledger (user_id, delta, bucket, kind, hold_id)
    select p_user_id, -value::integer, key, 'reserve', v_hold.id from jsonb_each_text(v_buckets);
  end if;

  insert into companion.conversations (user_id, character_id)
  values (p_user_id, p_character_id)
  on conflict (user_id, character_id) where kind = 'companion' do nothing;
  select * into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';

  insert into companion.relationships (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
  select speech_level into v_speech from companion.relationships where user_id = p_user_id and character_id = p_character_id;

  if nullif(p_region, '') is not null then
    insert into companion.profiles (user_id, last_region) values (p_user_id, p_region)
    on conflict (user_id) do update set last_region = excluded.last_region;
  end if;

  insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, input_mode)
  values (v_conversation.id, p_user_id, 'user', 'pending', p_client_message_id, p_text, p_input_mode)
  on conflict (user_id, client_message_id) where client_message_id is not null do update set
    status = 'pending', text = excluded.text, input_mode = excluded.input_mode, created_at = clock_timestamp()
  returning id into v_message_id;
  delete from companion.messages where reply_to = v_message_id;
  delete from companion.corrections where message_id = v_message_id;

  return jsonb_build_object(
    'result', 'ok',
    'conversationId', v_conversation.id,
    'userMessageId', v_message_id,
    'holdId', v_hold.id,
    'creditsReserved', v_hold.amount,
    'trial', v_hold.trial,
    'speechLevel', v_speech,
    'persona', (select persona from companion.characters where id = p_character_id),
    'summary', v_conversation.rolling_summary,
    'topicState', v_conversation.topic_state,
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('kind', kind, 'content', content, 'shared', character_id is null) order by created_at desc)
      from (
        select * from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at
        from companion.messages m
        where m.conversation_id = v_conversation.id and m.id <> v_message_id
          and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
          and (v_conversation.summarized_until is null or m.created_at > v_conversation.summarized_until)
        order by m.created_at desc
        limit p_history_limit
      ) h
    ), '[]'::jsonb)
  );
end;
$$;


-- ------------------------------------------------------------------ 기억 묶음

-- 기억을 뽑을 원문: 마지막 표시(memory_extracted_until) 뒤의 정상 메시지(유저 · 캐릭터). 그 가운데 유저 메시지가 settings.memory_every개
-- 모이지 않았으면 null. 표시가 없는 오래된 대화가 한꺼번에 몰리지 않게 최근 p_limit개까지만 준다(그 앞은 건너뛴다 — 표시가 끝으로 옮겨진다).
-- 반환: { until, sourceMessageId(마지막 유저 메시지 — 저장의 멱등 키), messages: [{ role, text, segments }] }.
create function public.companion_memory_source(p_conversation_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select m.id, m.role, m.text, m.segments, m.created_at
    from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation_id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (c.memory_extracted_until is null or m.created_at > c.memory_extracted_until)
    order by m.created_at desc
    limit greatest(least(p_limit, 200), 1)
  )
  select case when count(*) filter (where role = 'user') >= (select memory_every from companion.settings) then jsonb_build_object(
    'until', max(created_at),
    'sourceMessageId', (select id from candidates where role = 'user' order by created_at desc limit 1),
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments) order by created_at)
  ) else null end
  from candidates
$$;

-- 기억 묶음을 처리했다는 표시. 뒤로만 옮긴다(작업이 두 번 돌거나 늦게 끝나도 앞으로 돌아가지 않는다).
create function public.companion_mark_memories(p_conversation_id uuid, p_until timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update companion.conversations
  set memory_extracted_until = p_until
  where id = p_conversation_id and (memory_extracted_until is null or memory_extracted_until < p_until);
$$;

revoke all on function public.companion_memory_source(uuid, integer) from public, anon, authenticated;
revoke all on function public.companion_mark_memories(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_memory_source(uuid, integer) to service_role;
grant execute on function public.companion_mark_memories(uuid, timestamptz) to service_role;
