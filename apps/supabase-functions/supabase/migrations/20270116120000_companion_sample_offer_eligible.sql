-- 예시 제안은 받을 수 있는 사람에게만(메신저 가이드 점검 2, ADR-0146 개정 「가이드 점검 2: 예시 제안은 받을 수 있는 사람에게만」).
--
-- 제안 RPC `companion_sample_snapshot_offer`는 「예시가 켜져 있고 그 종류를 만든 적이 없음」만 봤다. 그런데 받기 RPC
-- (`companion_claim_sample_snapshot`, 20270113 판)는 14세 미만 · 일시 차단이면 `not_offered`, 그 대화에 쓸 수 있는 첫 인사가 없으면
-- `not_eligible`로 거절한다. 그래서 받을 수 없는 사람에게 안내가 「무료 예시」 단계를 세우고, 누르면 회색 「지금은 쓸 수 없음」 줄이 섰다.
-- 배포된 빌드는 거절을 「본 것」으로 적지 않아 방에 들어올 때마다 같은 단계가 다시 섰다(앱 수정은 별도 PR — 거절도 본 것으로 적음).
--
-- 바꾸는 것(제안 RPC 하나, 인자 · 돌려주는 모양 `{ available, voice }`는 그대로):
-- 1. 받기와 같은 막음 — 14세 미만(나이를 밝힌 미성년 가운데 14세 미만) · 일시 차단 중이면 둘 다 false.
-- 2. 그 인물과의 대화(kind companion)에 첫 인사(origin greeting 가운데 가장 먼저 만든 것)가 있고 `media_eligible`(숨김 · 실패 · 거절 아님)일
--    때만 제안한다 — 받기가 붙일 곳과 같다. 대화가 없거나 첫 인사가 없으면 둘 다 false.
-- 3. 그 밖은 전과 같다(예시가 켜져 있고 그 종류의 행이 하나도 없을 때). 요금제 · 잔액은 보지 않는다.
-- 받기 RPC는 바꾸지 않는다(제안과 받기 사이에 막힐 수 있으므로 받기의 확인은 그대로 둔다).
--
-- 옛 빌드: 같은 함수를 부르므로 적용하는 순간부터 받을 수 없는 사람에게 예시 단계가 서지 않는다.

create or replace function public.companion_sample_snapshot_offer(p_character_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile companion.profiles;
  v_greeting companion.messages;
  v_none constant jsonb := jsonb_build_object('available', false, 'voice', false);
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- 받기와 같은 막음 — 대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)은 예시도 받지 못한다.
  select * into v_profile from companion.profiles where user_id = v_user;
  if companion.age_band(v_profile.birth_year, now()) = 'minor'
    and extract(year from now())::integer - v_profile.birth_year < 14 then
    return v_none;
  end if;
  if exists (
    select 1 from companion.moderation_state ms where ms.user_id = v_user and ms.blocked_until > now()
  ) then
    return v_none;
  end if;
  -- 받기가 붙일 곳 — 그 인물과의 대화의 첫 인사. 없거나 쓸 수 없으면 제안하지 않는다.
  select m.* into v_greeting
  from companion.messages m
  join companion.conversations c on c.id = m.conversation_id
  where c.user_id = v_user and c.character_id = p_character_id and c.kind = 'companion'
    and m.user_id = v_user and m.origin = 'greeting'
  order by m.created_at, m.id
  limit 1;
  if not found or not companion.media_eligible(v_greeting) then
    return v_none;
  end if;
  return jsonb_build_object(
    'available', companion.sample_snapshot_available(v_user, p_character_id),
    'voice', companion.sample_voice_available(v_user, p_character_id)
  );
end;
$$;
revoke all on function public.companion_sample_snapshot_offer(text) from public, anon;
grant execute on function public.companion_sample_snapshot_offer(text) to authenticated;
