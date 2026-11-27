-- 예시 사진 · 음성은 그 대화의 첫 인사에 붙는다(이슈 #648, ADR-0146 개정 ⟨2026-11-27⟩ 「예시의 자리는 첫 인사」).
--
-- 예시 파일(`companion.media_samples`)은 덕수쌤 첫 인사에 맞춰 미리 만든 고정 파일이다. 그런데 받기 RPC가 받은 `p_message_id`를 그대로
-- 믿어, 앱이 가장 최근 캐릭터 메시지(학습자 답 뒤의 응답 · 선톡)를 보내면 거기에 sample 행을 넣었다 — 자막(`source` → `media_json.line`)은
-- 응답 글인데 소리 · 사진은 첫 인사의 것이 됐다(운영 2026-11-27 집계 564명 · 1,022건). 배포된 빌드(Android 1.6.x · 1.7.0, iOS 1.3.x · 1.4.0)는
-- 앱 수정 전까지 계속 최근 메시지를 보낸다.
--
-- 바꾸는 것(받기 RPC 하나, 인자 · 돌려주는 모양은 그대로):
-- 1. 받은 메시지는 「어느 대화인지」와 권한(내 것인가 · 인물의 말인가)만 정한다. 실제로 붙는 곳은 그 대화의 첫 인사(origin greeting,
--    가장 먼저 만든 것)다. 받은 메시지가 첫 인사면 지금과 같다.
-- 2. `source`도 첫 인사의 segments — 자막과 소리 · 사진이 맞는다.
-- 3. 그 대화에 쓸 수 있는 첫 인사가 없으면(지워짐 · 숨김 · 실패) 받지 않는다 — `not_eligible`(앱은 「지금은 쓸 수 없음」 줄). 다른 메시지로
--    대신 붙이지 않는다: 예시는 첫 인사 문장으로 만든 것이라 다른 글에 붙이면 같은 어긋남이 다시 생긴다. 제안은 꺼지지 않는다(행이 없으므로).
-- 4. 돌려주는 `media.messageId`(`media_json`이 원래 싣는 칸)가 실제로 붙은 메시지다. 지금 빌드는 그 자리에서는 보낸 메시지 아래에 놓고,
--    다시 읽을 때 서버 행의 `messageId`(첫 인사) 아래로 간다. 새 앱은 이 칸으로 바로 자리를 맞춘다.
-- 계정당 한 번(인물 · 종류마다) · 무료(cost 0) · 막는 조건(14세 미만 · 일시 차단) · 순서는 그대로다.
--
-- 이미 어긋난 행은 고치지 않는다 — 정리 절차는 docs/operations/guide-sample-realign.md(사용자가 따로 정한다).

create or replace function public.companion_claim_sample_snapshot(p_message_id uuid, p_kind text default 'snapshot')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_msg companion.messages;
  v_greeting companion.messages;
  v_character text;
  v_sample companion.media_samples;
  v_media companion.media;
  v_profile companion.profiles;
  v_offered boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_kind is null or p_kind not in ('snapshot', 'voice') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  select * into v_msg from companion.messages where id = p_message_id;
  if not found then
    return jsonb_build_object('result', 'message_not_found');
  end if;
  if v_msg.user_id <> v_user then
    return jsonb_build_object('result', 'forbidden');
  end if;
  if not companion.media_eligible(v_msg) then
    return jsonb_build_object('result', 'not_eligible');
  end if;
  select character_id into v_character from companion.conversations where id = v_msg.conversation_id;
  -- 대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)은 예시도 받지 못한다. 요금제 · 잔액은 보지 않는다.
  select * into v_profile from companion.profiles where user_id = v_user;
  if companion.age_band(v_profile.birth_year, now()) = 'minor'
    and extract(year from now())::integer - v_profile.birth_year < 14 then
    return jsonb_build_object('result', 'not_offered');
  end if;
  if exists (
    select 1 from companion.moderation_state ms where ms.user_id = v_user and ms.blocked_until > now()
  ) then
    return jsonb_build_object('result', 'not_offered');
  end if;
  select * into v_sample from companion.media_samples
  where character_id = v_character and kind = p_kind and active;
  if not found then
    return jsonb_build_object('result', 'no_sample');
  end if;

  -- 지갑 잠금으로 같은 사람의 요청을 한 줄로 세운다(두 번 눌러도 하나).
  perform companion.lock_wallet(v_user);
  select * into v_media from companion.media
  where user_id = v_user and character_id = v_character and kind = p_kind and charge = 'sample';
  if found then
    return jsonb_build_object('result', 'already', 'media', companion.media_json(v_media));
  end if;
  v_offered := case p_kind
    when 'voice' then companion.sample_voice_available(v_user, v_character)
    else companion.sample_snapshot_available(v_user, v_character)
  end;
  if not v_offered then
    return jsonb_build_object('result', 'not_offered');
  end if;

  -- 붙는 곳은 그 대화의 첫 인사다(받은 id는 대화를 고르는 데만 쓴다). 대화 초기화는 대화 행째 지우므로 대화마다 첫 인사는 하나다.
  select * into v_greeting from companion.messages
  where conversation_id = v_msg.conversation_id and user_id = v_user and origin = 'greeting'
  order by created_at, id
  limit 1;
  if not found or not companion.media_eligible(v_greeting) then
    return jsonb_build_object('result', 'not_eligible');
  end if;

  insert into companion.media (
    user_id, character_id, conversation_id, message_id, kind, status, charge, cost,
    source, text, storage_path, mime, aspect, meta, finished_at
  ) values (
    v_user, v_character, v_greeting.conversation_id, v_greeting.id, p_kind, 'complete', 'sample', 0,
    coalesce(v_greeting.segments, '[]'::jsonb), v_sample.text, v_sample.storage_path, v_sample.mime, v_sample.aspect,
    jsonb_build_object('aiGenerated', true, 'sample', true), now()
  ) returning * into v_media;
  return jsonb_build_object('result', 'ok', 'media', companion.media_json(v_media));
end;
$$;
revoke all on function public.companion_claim_sample_snapshot(uuid, text) from public, anon;
grant execute on function public.companion_claim_sample_snapshot(uuid, text) to authenticated;
