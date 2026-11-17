-- 대화 비우기(ADR-0156): 학습자가 채팅 설정의 「Clear chat」으로 한 인물과의 대화를 처음부터 다시 시작한다.
-- 지우는 것: 그 인물과의 대화(`conversations` 행 → 메시지 · 교정 · 평가 · 신고는 외래 키 cascade), 그 인물만의 기억(`memories`의
--   character_id = 그 인물 — 공유 기억(character_id null)은 다른 인물도 읽는 학습자 프로필이라 남긴다), 친밀도 · 말투 단계(`relationships`).
-- 남기는 것: 엽전 지갑 · 예약(`credit_holds`) · 체험 사용량(`trial_usage` — 덕수쌤 무료 20통을 다시 받지 않게), 앨범(`companion.media`는
--   대화에 외래 키가 없어 남고 「From a past chat」으로 보인다, ADR-0146 · 0150), 일시 차단 · 고지 상태(계정 단위).
-- 진행 중인 턴(보류된 유저 메시지, `pending_timeout` 안)이 있으면 지우지 않고 `busy` — 턴 마무리가 사라진 메시지를 찾다 실패하지 않게.
-- 여러 번 불러도 같다(이미 비었으면 그대로 `cleared`).

create or replace function public.companion_clear_chat(p_character_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_character_id is null or not exists (select 1 from companion.characters where id = p_character_id) then
    raise exception 'unknown character' using errcode = '22023';
  end if;

  select id into v_conversation from companion.conversations
  where user_id = v_user and character_id = p_character_id and kind = 'companion'
  for update;
  if v_conversation is not null and exists (
    select 1 from companion.messages
    where conversation_id = v_conversation and role = 'user' and status = 'pending'
      and created_at >= now() - companion.pending_timeout()
  ) then
    return jsonb_build_object('status', 'busy');
  end if;

  delete from companion.conversations where user_id = v_user and character_id = p_character_id and kind = 'companion';
  delete from companion.memories where user_id = v_user and character_id = p_character_id;
  delete from companion.relationships where user_id = v_user and character_id = p_character_id;
  return jsonb_build_object('status', 'cleared');
end;
$$;

revoke all on function public.companion_clear_chat(text) from public, anon;
grant execute on function public.companion_clear_chat(text) to authenticated;
