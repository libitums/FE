-- 답 프롬프트의 기억 고르기(ADR-0210 D7 · D8). 20270103 판(`companion_turn_intimacy`)의 `companion.begin_turn_base`에서 'memories'만 바꿨다.
--
-- D7. 지난 대화 창 안의 메시지에서 뽑은 기억은 넣지 않는다. 그 원문이 창(마지막 요약 뒤 메시지)에 그대로 있어 중복이고, 넣으면 기억 묶음
--     (유저 말 5개마다)이 돌 때마다 system의 학습자 칸이 바뀌어 지난 대화까지의 캐시가 깨진다 — 운영 3일(2026-11-24 ~ 27) 5분 안에 이어진
--     턴의 큰 캐시 쓰기 615번 중 492번이 직전 턴 뒤 새 기억 때문이었다. 원문이 요약으로 창 밖에 나가면 그때 들어간다(요약으로 학습자 칸이
--     어차피 바뀌는 턴이라 따로 깨지지 않는다). 다른 대화(지운 대화 등)의 기억은 늘 들어간다.
-- D6. 이 캐릭터 층만 읽는다(공유 층 없음, 20270114130000).
-- D8. 넣는 기억 수 `settings.memory_prompt_limit`을 캐릭터 층 상한과 같은 50으로 — 화면의 `n / 50`이 실제로 아는 것과 같게.
--
-- 다시 적용해도 같은 결과다.

update companion.settings set memory_prompt_limit = 50 where memory_prompt_limit = 30;

create or replace function companion.begin_turn_base(
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
  v_conversation companion.conversations;
  v_message_id uuid;
  v_speech text;
  v_intimacy integer;
  v_persona jsonb;
  v_window_start timestamptz;
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
    if v_tier = 'free' then
      if companion.trial_left(p_user_id) > 0 then
        insert into companion.trial_usage (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
        update companion.trial_usage set used = used + 1 where user_id = p_user_id and character_id = p_character_id;
        v_trial := true;
        v_cost := 0;
      elsif s.trial_limit > 0 and v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance < v_cost then
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
  select speech_level, intimacy into v_speech, v_intimacy from companion.relationships where user_id = p_user_id and character_id = p_character_id;

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

  select persona into v_persona from companion.characters where id = p_character_id;
  -- 지난 대화 창(아래 'history')의 가장 오래된 메시지. 이 창 안의 메시지에서 뽑은 기억은 원문이 창에 그대로 있어 넣지 않는다.
  select min(h.created_at) into v_window_start from (
    select m.created_at from companion.messages m
    where m.conversation_id = v_conversation.id and m.id <> v_message_id
      and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (v_conversation.summarized_until is null or m.created_at > v_conversation.summarized_until)
    order by m.created_at desc
    limit p_history_limit
  ) h;
  return jsonb_build_object(
    'result', 'ok',
    'conversationId', v_conversation.id,
    'userMessageId', v_message_id,
    'holdId', v_hold.id,
    'creditsReserved', v_hold.amount,
    'trial', v_hold.trial,
    'speechLevel', v_speech,
    'intimacy', coalesce(v_intimacy, 0),
    'persona', v_persona,
    'romanceTier', companion.romance_tier(p_user_id, v_persona, p_now),
    'summary', v_conversation.rolling_summary,
    'topicState', v_conversation.topic_state,
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('kind', mm.kind, 'content', mm.content, 'shared', false) order by mm.created_at desc)
      from (
        select x.* from companion.memories x
        where x.user_id = p_user_id and x.deleted_at is null and x.character_id = p_character_id
          and not exists (
            select 1 from companion.messages src
            where src.id = x.source_message_id and src.conversation_id = v_conversation.id
              and src.created_at >= v_window_start
          )
        order by x.created_at desc limit s.memory_prompt_limit
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
