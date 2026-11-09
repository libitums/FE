-- AI 컴패니언 — 반복 위반 단계 제재의 「성격대로 회피 → 경고」(PRD §3.11 5층)와 장기 메모리 용량 상한.
--
--   단계 제재: 입력 검사 차단 턴에 캐릭터가 자기 성격 · 말투로 거절한다. 단계는 지금 창(`settings.strike_window`) 안의 반복 위반 수가
--   정한다 — 이번 차단이 `strike_limit`번째면 일시 차단(지금처럼 SSE `guardrail_blocked` · `blocked_until`), 그 하나 앞이면 경고,
--   그보다 앞이면 회피. 세는 일은 그대로 `companion_finish_turn`이 한다(바꾸지 않는다). 이 마이그레이션은
--     · `companion_turn_status(p_user_id, p_character_id, p_now)` — 턴 시작 때 지금 위반 수 · 상한 · 기억이 가득 찼는지,
--     · 페르소나 `refusalLines` — 거절 생성이 실패하거나 출력 검사에 걸릴 때 쓰는 정해진 한 줄(단계 · 말투 단계마다)
--   을 더한다. 거절 답은 보통 assistant 메시지로 `meta.refusal`을 달아 저장한다(차단 턴이라 차감 없음 — finish가 예약을 푼다).
--
--   기억 상한: `settings.memory_cap`(유저 · 캐릭터마다, 기본 50) · `settings.shared_memory_cap`(유저의 공유 기억, 기본 30).
--   `companion_add_memories`가 상한에 닿으면 유저가 고치지 않은 가장 오래된 기억부터 지운다(`deleted_at`). 유저가 고친 기억
--   (`memories.user_edited` — `companion_update_memory`가 켠다)은 지우지 않고, 지울 것이 없으면 새 기억을 넣지 않는다(가득 참).
--   가득 참 = 그 층의 기억 수가 상한 이상이고 모두 유저가 고친 것 — 유저가 하나를 지우거나 상한을 올리면 풀린다(따로 저장하지 않는다).
--   `companion_add_memories`는 수 대신 `{ added, evicted, skipped, full }`을 돌려준다.
--   `companion_list_memories`는 배열 대신 `{ memories, count, cap, full }`을 돌려준다(앱이 아직 쓰지 않는다).
--
--   `companion_operator_set_profile` · 턴 판정 · 시작 · 끝 함수는 다시 만들지 않는다.
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261116) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.settings
  add column if not exists memory_cap integer not null default 50 check (memory_cap > 0),
  add column if not exists shared_memory_cap integer not null default 30 check (shared_memory_cap > 0);

alter table companion.memories
  add column if not exists user_edited boolean not null default false;

-- ------------------------------------------------------------------ 페르소나 — 정해진 거절 한 줄

-- 단계(deflect 회피 · warn 경고)마다 말투 단계(말투 상한까지)의 한 줄. 이 칸이 없는 캐릭터 · 말투는 코드의 기본 줄을 쓴다.
update companion.characters set persona = persona || jsonb_build_object('refusalLines', jsonb_build_object(
  'deflect', jsonb_build_object('polite', '어이쿠, 그 얘기는 오늘 수업에 없어요! 대신 퀴즈 하나 갈게요. 소 더하기 고기는?'),
  'warn', jsonb_build_object('polite', '그런 말은 우리 수업에서 안 돼요. 서로 기분 좋게 얘기해요. 다른 얘기 할까요?')
)) where id = 'duksu';

update companion.characters set persona = persona || jsonb_build_object('refusalLines', jsonb_build_object(
  'deflect', jsonb_build_object('polite', '그 얘기는 그만하고요. 밥은 먹었어요?'),
  'warn', jsonb_build_object('polite', '그런 말은 듣기 좋지 않아요. 그런 얘기는 하지 말아요. 따뜻한 차라도 한잔할래요?')
)) where id = 'yoonkyung';

update companion.characters set persona = persona || jsonb_build_object('refusalLines', jsonb_build_object(
  'deflect', jsonb_build_object(
    'polite', '음, 그 얘기는 넘어가요! 오늘 어디 가 봤어요?',
    'casual', '음, 그 얘기는 넘어가자! 오늘 어디 가 봤어?',
    'slang', '에이, 그건 패스! 오늘 어디 갔다 왔어?'
  ),
  'warn', jsonb_build_object(
    'polite', '그런 말은 좀 불편해요. 그런 얘기는 하지 말아요. 다른 얘기 해요.',
    'casual', '그런 말은 좀 불편해. 그런 얘기는 하지 말자. 다른 얘기 하자.',
    'slang', '야, 그런 말은 진짜 별로야. 그런 얘긴 그만하자. 딴 얘기 하자.'
  )
)) where id = 'mina';

update companion.characters set persona = persona || jsonb_build_object('refusalLines', jsonb_build_object(
  'deflect', jsonb_build_object(
    'polite', '아하, 그 얘기는 패스할게요! 요즘 어떤 노래 들어요?',
    'casual', '아하, 그 얘기는 패스! 요즘 무슨 노래 들어?'
  ),
  'warn', jsonb_build_object(
    'polite', '그런 말은 좀 속상해요. 그런 얘기는 안 했으면 좋겠어요. 다른 얘기 해요!',
    'casual', '그런 말은 좀 속상해. 그런 얘기는 안 했으면 좋겠어. 다른 얘기 하자!'
  )
)) where id = 'doyun';

update companion.characters set persona = persona || jsonb_build_object('refusalLines', jsonb_build_object(
  'deflect', jsonb_build_object('polite', '그 얘기는 넘어갈게요. 오늘은 뭐 했어요?'),
  'warn', jsonb_build_object('polite', '그런 말은 좀 아닌 것 같아요. 그런 얘기는 그만해요. 다른 얘기 해요.')
)) where id = 'jaemin';

-- ------------------------------------------------------------------ 내부 도우미 (companion 스키마, 노출 안 됨)

-- 한 층(p_character_id null = 공유 기억)의 기억 수 · 상한 · 가득 참. 가득 참은 상한 이상이고 지울 수 있는(유저가 고치지 않은) 기억이 없을 때.
create or replace function companion.memory_layer_status(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'count', x.count,
    'cap', x.cap,
    'full', x.count >= x.cap and x.unedited = 0
  )
  from (
    select
      count(*)::integer as count,
      count(*) filter (where not m.user_edited)::integer as unedited,
      (select case when p_character_id is null then s.shared_memory_cap else s.memory_cap end from companion.settings s) as cap
    from companion.memories m
    where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from p_character_id
  ) x
$$;
revoke all on function companion.memory_layer_status(uuid, text) from public;

-- ------------------------------------------------------------------ 서버용 (service_role)

-- 턴 시작 때 한 번: 지금 창 안의 반복 위반 수(창이 지났으면 0) · 상한, 이 캐릭터 기억 또는 공유 기억이 가득 찼는지.
-- 단계(회피 · 경고 · 일시 차단)는 `chat-send`가 이번 차단을 더한 수로 고른다 — 세는 일은 `companion_finish_turn`이 한다.
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
      or (companion.memory_layer_status(p_user_id, null)->>'full')::boolean
  )
  from companion.settings s
$$;

-- 턴 뒤 추출한 기억을 넣는다. 같은 원본 메시지에서 두 번 넣지 않고(작업이 두 번 돌아도 결과가 같다), 같은 층에 이미 있는 글도 넣지 않는다.
-- 층(공유 · 이 캐릭터)이 상한에 닿으면 유저가 고치지 않은 가장 오래된 기억부터 지우고, 지울 것이 없으면 넣지 않는다(full).
-- p_items: [{ kind: 'fact' | 'event', content, shared: boolean }]. 반환: { added, evicted, skipped, full }.
drop function if exists public.companion_add_memories(uuid, text, uuid, jsonb);
create function public.companion_add_memories(p_user_id uuid, p_character_id text, p_source_message_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  r record;
  v_layer text;
  v_cap integer;
  v_count integer;
  v_victim uuid;
  v_added integer := 0;
  v_evicted integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid memories' using errcode = '22023';
  end if;
  if p_source_message_id is not null and exists (
    select 1 from companion.memories where source_message_id = p_source_message_id
  ) then
    return jsonb_build_object('added', 0, 'evicted', 0, 'skipped', 0, 'full', false);
  end if;
  select * into s from companion.settings;
  for r in
    select e.item->>'kind' as kind, left(btrim(e.item->>'content'), 500) as content,
      coalesce((e.item->>'shared')::boolean, false) as shared
    from jsonb_array_elements(p_items) with ordinality as e(item, n)
    where jsonb_typeof(e.item) = 'object' and e.item->>'kind' in ('fact', 'event')
      and coalesce(btrim(e.item->>'content'), '') <> ''
    order by e.n
  loop
    v_layer := case when r.shared then null else p_character_id end;
    v_cap := case when r.shared then s.shared_memory_cap else s.memory_cap end;
    -- 같은 층의 동시 추가가 상한을 함께 넘기지 않게 층마다 잠근다(트랜잭션 끝에 풀린다).
    perform pg_advisory_xact_lock(hashtextextended('companion.memories:' || p_user_id::text || ':' || coalesce(v_layer, ''), 0));
    -- 같은 층에 같은 글이 이미 있으면 넣지 않는다 — 같은 말을 여러 번 해도 기억은 하나.
    continue when exists (
      select 1 from companion.memories m
      where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer
        and lower(btrim(m.content)) = lower(r.content)
    );
    select count(*) into v_count from companion.memories m
    where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer;
    while v_count >= v_cap loop
      select m.id into v_victim from companion.memories m
      where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer and not m.user_edited
      order by m.created_at, m.id
      limit 1;
      exit when v_victim is null;
      update companion.memories set deleted_at = now() where id = v_victim;
      v_evicted := v_evicted + 1;
      v_count := v_count - 1;
      v_victim := null;
    end loop;
    if v_count >= v_cap then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into companion.memories (user_id, character_id, kind, content, source_message_id)
    values (p_user_id, v_layer, r.kind, r.content, p_source_message_id);
    v_added := v_added + 1;
  end loop;
  return jsonb_build_object('added', v_added, 'evicted', v_evicted, 'skipped', v_skipped, 'full', v_skipped > 0);
end;
$$;

-- 운영 조회(M3)에 유저가 고친 기억 표시와 층마다 수 · 상한 · 가득 참을 더한다.
create or replace function public.companion_inspect_memory(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'characterId', character_id, 'kind', kind, 'content', content,
        'userEdited', user_edited, 'deleted', deleted_at is not null, 'createdAt', created_at) order by created_at desc)
      from companion.memories
      where user_id = p_user_id and (character_id = p_character_id or character_id is null)
    ), '[]'::jsonb),
    'capacity', jsonb_build_object(
      'character', companion.memory_layer_status(p_user_id, p_character_id),
      'shared', companion.memory_layer_status(p_user_id, null)
    ),
    'summary', (select rolling_summary from companion.conversations
      where user_id = p_user_id and character_id = p_character_id and kind = 'companion'),
    'relationship', (select jsonb_build_object('intimacy', intimacy, 'speechLevel', speech_level)
      from companion.relationships where user_id = p_user_id and character_id = p_character_id),
    'moderation', (select jsonb_build_object('strikes', strikes, 'blockedUntil', blocked_until)
      from companion.moderation_state where user_id = p_user_id)
  )
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated)

-- 한 층(p_character_id null = 공유 기억)의 기억과 수 · 상한 · 가득 참. 가득 차면 앱이 「기억이 가득 찼어요 — 정리해 주세요」를 보인다.
create or replace function public.companion_list_memories(p_character_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'characterId', character_id, 'kind', kind, 'content', content, 'userEdited', user_edited,
        'createdAt', to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) order by created_at desc)
      from companion.memories
      where user_id = auth.uid() and deleted_at is null and character_id is not distinct from p_character_id
    ), '[]'::jsonb)
  ) || companion.memory_layer_status(auth.uid(), p_character_id);
end;
$$;

-- 유저가 고친 기억은 상한에 닿아도 저절로 지우지 않는다.
create or replace function public.companion_update_memory(p_memory_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_content is null or char_length(btrim(p_content)) not between 1 and 500 then
    raise exception 'invalid memory' using errcode = '22023';
  end if;
  update companion.memories set content = btrim(p_content), user_edited = true
  where id = p_memory_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'memory not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.companion_turn_status(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_add_memories(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.companion_inspect_memory(uuid, text) from public, anon, authenticated;
grant execute on function public.companion_turn_status(uuid, text, timestamptz) to service_role;
grant execute on function public.companion_add_memories(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.companion_inspect_memory(uuid, text) to service_role;
revoke all on function public.companion_list_memories(text) from public, anon;
revoke all on function public.companion_update_memory(uuid, text) from public, anon;
grant execute on function public.companion_list_memories(text) to authenticated;
grant execute on function public.companion_update_memory(uuid, text) to authenticated;
