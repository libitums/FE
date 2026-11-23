-- 예시 음성 — 안내의 스냅샷 다음 단계에서 미리 만든 음성 하나(사용자 결정 2026-11-23, ADR-0146 「추가 — 안내에서 무료 예시 음성」).
-- 덕수쌤의 첫 인사는 모든 사용자에게 같은 문장이다(최근 3일 824개 대화 모두 「안녕하세요! 덕수쌤이에요. 한국어나 한국 문화에 대해
-- 궁금한 게 있으면 언제든지 물어봐요.」). 그 문장을 읽은 음성 파일 하나를 올려 두고, 안내가 음성 단추를 가리켜 누르면 그대로 준다.
-- 예시 스냅샷(20261229)과 같은 길을 쓴다:
-- 1. `companion.media_samples`에 종류(`kind` snapshot · voice)와 읽은 글(`text`)을 더한다. 인물 · 종류마다 한 줄.
-- 2. 받은 음성은 보통 음성과 같은 `companion.media` 행(kind voice · charge 'sample' · cost 0 · complete). 인물 · 종류마다 계정당 한 번.
-- 3. 제안 RPC가 `voice`를 더 돌려준다 — 음성 예시가 켜져 있고 이 계정이 음성을 한 번도 만든 적이 없을 때만.
-- 4. 받기 RPC가 종류(`p_kind`, 기본 snapshot)를 받는다 — 종류를 넘기지 않는 앞 빌드는 그대로 스냅샷을 받는다.

alter table companion.media_samples
  add column kind text not null default 'snapshot' check (kind in ('snapshot', 'voice')),
  add column text text,
  alter column aspect drop not null,
  drop constraint media_samples_pkey,
  add primary key (character_id, kind),
  drop constraint media_samples_storage_path_check,
  add constraint media_samples_storage_path_check
    check (storage_path ~ '^samples/[a-z0-9-]+\.(png|jpg|jpeg|webp|mp3)$'),
  -- 스냅샷은 비율이, 음성은 읽은 글이 있어야 한다.
  add constraint media_samples_shape_check check (
    (kind = 'snapshot' and aspect is not null) or (kind = 'voice' and aspect is null and text is not null)
  );

drop index companion.media_sample_uniq;
create unique index media_sample_uniq on companion.media (user_id, character_id, kind) where charge = 'sample';

create or replace function companion.sample_snapshot_available(p_user_id uuid, p_character_id text)
returns boolean language sql stable as $$
  select exists (
      select 1 from companion.media_samples s
      where s.character_id = p_character_id and s.kind = 'snapshot' and s.active
    )
    and not exists (select 1 from companion.media m where m.user_id = p_user_id and m.kind = 'snapshot')
$$;

-- 음성 예시를 줄 수 있는가(내부). 예시가 켜져 있고, 음성 행이 하나도 없다(만드는 중 · 실패 포함 — 눌러 본 사람).
create function companion.sample_voice_available(p_user_id uuid, p_character_id text)
returns boolean language sql stable as $$
  select exists (
      select 1 from companion.media_samples s
      where s.character_id = p_character_id and s.kind = 'voice' and s.active
    )
    and not exists (select 1 from companion.media m where m.user_id = p_user_id and m.kind = 'voice')
$$;
revoke all on function companion.sample_voice_available(uuid, text) from public;

create or replace function public.companion_sample_snapshot_offer(p_character_id text)
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
    'available', companion.sample_snapshot_available(auth.uid(), p_character_id),
    'voice', companion.sample_voice_available(auth.uid(), p_character_id)
  );
end;
$$;

-- 돌려주는 값은 앞과 같다: { result: 'ok' | 'already' | 'message_not_found' | 'forbidden' | 'not_eligible' | 'no_sample' | 'not_offered', media? }
drop function public.companion_claim_sample_snapshot(uuid);
create function public.companion_claim_sample_snapshot(p_message_id uuid, p_kind text default 'snapshot')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_msg companion.messages;
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

  insert into companion.media (
    user_id, character_id, conversation_id, message_id, kind, status, charge, cost,
    source, text, storage_path, mime, aspect, meta, finished_at
  ) values (
    v_user, v_character, v_msg.conversation_id, p_message_id, p_kind, 'complete', 'sample', 0,
    coalesce(v_msg.segments, '[]'::jsonb), v_sample.text, v_sample.storage_path, v_sample.mime, v_sample.aspect,
    jsonb_build_object('aiGenerated', true, 'sample', true), now()
  ) returning * into v_media;
  return jsonb_build_object('result', 'ok', 'media', companion.media_json(v_media));
end;
$$;
revoke all on function public.companion_claim_sample_snapshot(uuid, text) from public, anon;
grant execute on function public.companion_claim_sample_snapshot(uuid, text) to authenticated;
