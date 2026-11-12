-- AI 컴패니언 — 추천 답변 칩을 그대로 보낸 메시지는 피드백을 건너뛴다.
--
--   앱이 칩을 탭해 고치지 않고 보내면 `chat-send` 요청에 `from_suggestion: true`를 싣는다. 서버는 글이 마지막 캐릭터 메시지에 저장된 칩
--   하나와 (앞뒤 공백을 걷고) 똑같을 때만 피드백 모델을 부르지 않고 카드 `{ status: 'skipped', reason: 'suggestion', … }`을 보내고 저장한다.
--   칩을 고쳐 보냈거나 직접 입력했으면 보통처럼 피드백한다.
--     · `companion.corrections.status`에 'skipped'를 더한다(kind는 그대로 null).
--     · `companion.correction_json`이 카드의 `reason`을 돌려준다(있을 때만).
--     · `companion_turn_status`가 `latestSuggestions`(마지막 캐릭터 메시지의 칩 글, 없으면 빈 배열)를 더 돌려준다 — 같은 인수.
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261120) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.corrections drop constraint if exists corrections_status_check;
alter table companion.corrections
  add constraint corrections_status_check check (status in ('ok', 'none', 'unavailable', 'skipped'));

-- SSE `correction` 데이터와 같은 카드(20261116) + `reason`(건너뛴 카드만).
create or replace function companion.correction_json(c companion.corrections)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'userMessageId', c.message_id,
    'status', c.status,
    'kind', c.kind,
    'original', coalesce(
      c.card->>'original',
      (select m.text from companion.messages m where m.id = c.message_id),
      ''
    ),
    'corrected', case when c.card is not null then c.card->'corrected' else to_jsonb(c.l1_to_ko->>'text') end,
    'items', coalesce(
      case when jsonb_typeof(c.card->'items') = 'array' then c.card->'items' end,
      c.items,
      '[]'::jsonb
    ),
    'better', case
      when c.card is not null then case when jsonb_typeof(c.card->'better') = 'object' then c.card->'better' else 'null'::jsonb end
      when c.better is not null then jsonb_build_object(
        'text', c.better->>'text',
        'meaning', coalesce(c.better->>'meaning', ''),
        'explanation', coalesce(c.better->>'explanation', '')
      )
      else 'null'::jsonb
    end,
    'meaning', case
      when c.card is not null then c.card->'meaning'
      else to_jsonb(c.l1_to_ko->>'meaning')
    end
  ) || case when c.status = 'skipped' and c.card ? 'reason' then jsonb_build_object('reason', c.card->'reason') else '{}'::jsonb end
$$;
revoke all on function companion.correction_json(companion.corrections) from public;

create or replace function public.companion_turn_status(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'strikes', coalesce((
      select case when ms.window_started_at is not null and ms.window_started_at >= p_now - s.strike_window then ms.strikes else 0 end
      from companion.moderation_state ms where ms.user_id = p_user_id
    ), 0),
    'strikeLimit', s.strike_limit,
    'memoryFull', (companion.memory_layer_status(p_user_id, p_character_id)->>'full')::boolean
      or (companion.memory_layer_status(p_user_id, null)->>'full')::boolean,
    -- 마지막 캐릭터 메시지(`companion_suggest_context`의 latest와 같은 기준)에 저장된 칩의 글.
    'latestSuggestions', coalesce((
      select jsonb_agg(item->>'text')
      from (
        select m.suggestions from companion.messages m
        join companion.conversations c on c.id = m.conversation_id
        where c.user_id = p_user_id and c.character_id = p_character_id and c.kind = 'companion'
          and m.role = 'assistant' and not m.hidden and m.status in ('complete', 'crisis')
        order by m.created_at desc limit 1
      ) latest
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(latest.suggestions->'items') = 'array' then latest.suggestions->'items' else '[]'::jsonb end
      ) item
      where jsonb_typeof(item->'text') = 'string'
    ), '[]'::jsonb)
  )
  from companion.settings s
$$;
revoke all on function public.companion_turn_status(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_turn_status(uuid, text, timestamptz) to service_role;
