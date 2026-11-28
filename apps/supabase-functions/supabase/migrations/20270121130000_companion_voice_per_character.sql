-- 인물별 음성 모델 · 설정(2026-11-28). 다은 채팅 음성이 프로필 견본(eleven_v4 · 세부 설정)과 다르게 들려서, 인물 `media`에
-- `voiceModel` · `voiceSettings`(camelCase: stability · similarityBoost · style)를 두면 음성 작업이 그것을 쓰게 한다.
-- 정하지 않은 인물은 지금처럼 settings의 `voice_model`(eleven_v3) · 엔진 기본 설정이다.
-- speed는 넣지 않는다 — 0.85배 재생은 앱이 하므로 서버에서 또 줄이면 겹친다(견본의 0.88은 견본 파일에만 쓴다).
--
-- 1. companion_media_begin: 20261202120000(운영 정의와 본문 같음, 2026-11-28 확인)에서 음성 작업(v_job) 한 줄만 바꾼다.
-- 2. 다은(daeun)만 eleven_v4 + 견본 설정으로 시험한다. 되돌리기는 아래 「되돌리기」.
--
-- 함수(companion-voice)를 먼저 배포한다 — 새 함수는 voiceSettings가 없는 작업도 그대로 처리하고, 옛 함수는 voiceSettings를 무시한다.

create or replace function public.companion_media_begin(p_user_id uuid, p_message_id uuid, p_kind text, p_again boolean, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_msg companion.messages;
  v_character text;
  v_existing companion.media;
  v_running uuid;
  v_gate jsonb;
  v_band text;
  v_self text;
  v_cfg jsonb;
  v_text text;
  v_charge text;
  v_cost integer;
  v_media_id uuid := gen_random_uuid();
  v_hold jsonb;
  v_media companion.media;
  v_refs text[] := array[]::text[];
  v_slug text;
  v_job jsonb;
  v_count integer;
  v_attempt jsonb;
begin
  if p_kind not in ('snapshot', 'voice') then
    raise exception 'invalid media kind' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  select * into v_msg from companion.messages where id = p_message_id;
  if not found then
    return jsonb_build_object('result', 'message_not_found');
  end if;
  if v_msg.user_id <> p_user_id then
    return jsonb_build_object('result', 'forbidden');
  end if;
  if not companion.media_eligible(v_msg) then
    return jsonb_build_object('result', 'not_eligible');
  end if;
  select character_id into v_character from companion.conversations where id = v_msg.conversation_id;

  -- 지갑을 먼저 잠근다 — 같은 유저의 요청을 한 줄로 세워 동시 1 · 하루 상한 · 시도 가드 · 저장본 판정이 겹치지 않게.
  perform companion.lock_wallet(p_user_id);
  perform companion.expire_stale_media(p_user_id, p_now);

  -- 이 메시지에서 만드는 중인 것이 있으면 그것, 「다시」가 아니면 저장본. 상한과 상관없다(엔진을 부르지 않는다).
  select * into v_existing from companion.media
  where user_id = p_user_id and message_id = p_message_id and kind = p_kind and status = 'pending'
  order by created_at desc limit 1;
  if not found and not coalesce(p_again, false) then
    select * into v_existing from companion.media
    where user_id = p_user_id and message_id = p_message_id and kind = p_kind and status = 'complete'
    order by created_at desc limit 1;
  end if;
  if v_existing.id is not null then
    return jsonb_build_object('result', 'ok', 'cached', true, 'media', companion.media_json(v_existing));
  end if;

  -- 메시지와 같은 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간). 진행 중인 턴은 막지 않는다.
  v_gate := public.companion_turn_gate(p_user_id, v_character, gen_random_uuid(), p_now, null);
  if v_gate->>'result' not in ('ok', 'turn_in_progress') then
    return jsonb_build_object('result', v_gate->>'result') || case when v_gate ? 'detail' then jsonb_build_object('detail', v_gate->'detail') else '{}'::jsonb end;
  end if;
  select coalesce(v_gate->>'ageBand', companion.age_band(p.birth_year, p_now)), coalesce(p.snapshot_self, 'female')
  into v_band, v_self
  from (select 1) one left join companion.profiles p on p.user_id = p_user_id;
  v_band := coalesce(v_band, 'unknown');
  v_self := coalesce(v_self, 'female');
  select media into v_cfg from companion.characters where id = v_character;

  if p_kind = 'voice' then
    v_text := companion.spoken_korean(v_msg.segments);
    if v_text = '' then
      return jsonb_build_object('result', 'no_speech');
    end if;
    if char_length(v_text) > 600 then
      return jsonb_build_object('result', 'too_long', 'detail', jsonb_build_object('chars', char_length(v_text), 'max', 600));
    end if;
    if coalesce(v_cfg->>'voiceId', '') = '' then
      return jsonb_build_object('result', 'not_configured', 'detail', jsonb_build_object('missing', 'voice_id'));
    end if;
    -- 음성 비상 스위치(0 = 끔).
    if s.voice_daily_limit is not null then
      select count(*) into v_count from companion.media
      where user_id = p_user_id and kind = 'voice' and status in ('pending', 'complete')
        and created_at >= ((p_now at time zone 'utc')::date)::timestamp at time zone 'utc';
      if v_count >= s.voice_daily_limit then
        return jsonb_build_object('result', 'daily_limit', 'detail', jsonb_build_object('limit', s.voice_daily_limit));
      end if;
    end if;
    v_attempt := companion.media_attempt_gate(p_user_id, 'voice', p_now);
    if v_attempt is not null then
      return v_attempt;
    end if;
    v_charge := 'voice';
    v_cost := s.voice_cost;
    -- 인물이 `media.voiceModel` · `media.voiceSettings`를 정해 두면 그것을 쓴다(없으면 settings의 voice_model · 엔진 기본 설정).
    v_job := jsonb_build_object(
      'voiceId', v_cfg->>'voiceId',
      'model', coalesce(nullif(v_cfg->>'voiceModel', ''), s.voice_model),
      'text', v_text)
      || case when jsonb_typeof(v_cfg->'voiceSettings') = 'object'
           then jsonb_build_object('voiceSettings', v_cfg->'voiceSettings') else '{}'::jsonb end;
  else
    select id into v_running from companion.media
    where user_id = p_user_id and kind = 'snapshot' and status = 'pending' limit 1;
    if v_running is not null then
      return jsonb_build_object('result', 'snapshot_in_progress', 'detail', jsonb_build_object('mediaId', v_running));
    end if;
    select count(*) into v_count from companion.media
    where user_id = p_user_id and kind = 'snapshot' and status in ('pending', 'complete')
      and created_at >= ((p_now at time zone 'utc')::date)::timestamp at time zone 'utc';
    if s.snapshot_daily_limit is not null and v_count >= s.snapshot_daily_limit then
      return jsonb_build_object('result', 'daily_limit', 'detail', jsonb_build_object('limit', s.snapshot_daily_limit));
    end if;
    v_attempt := companion.media_attempt_gate(p_user_id, 'snapshot', p_now);
    if v_attempt is not null then
      return v_attempt;
    end if;
    -- 기준 이미지: refSlugs 순서대로 `<slug>-ref.png`가 있는 첫 slug, 있으면 `<slug>-expressions.png`도.
    if to_regclass('storage.objects') is not null then
      for v_slug in select value from jsonb_array_elements_text(
        case when jsonb_typeof(v_cfg->'refSlugs') = 'array' then v_cfg->'refSlugs' else jsonb_build_array(v_character) end
      ) loop
        execute 'select array_agg(name order by name desc) from storage.objects where bucket_id = ''companion-refs'' and name = any ($1)'
        into v_refs using array[v_slug || '-ref.png', v_slug || '-expressions.png'];
        exit when v_refs is not null and (v_slug || '-ref.png') = any (v_refs);
        v_refs := array[]::text[];
      end loop;
    end if;
    if coalesce(cardinality(v_refs), 0) = 0 then
      return jsonb_build_object('result', 'not_configured', 'detail', jsonb_build_object('missing', 'refs'));
    end if;
    if coalesce(p_again, false) and exists (
      select 1 from companion.media where user_id = p_user_id and message_id = p_message_id and kind = 'snapshot' and status = 'complete'
    ) then
      v_charge := 'photo_redraw';
      v_cost := s.photo_redraw_cost;
    else
      v_charge := 'photo';
      v_cost := s.photo_cost;
    end if;
    v_job := jsonb_build_object(
      'characterName', coalesce((select persona->>'name' from companion.characters where id = v_character), v_character),
      'look', coalesce(v_cfg->>'look', ''),
      'ageBand', v_band,
      'snapshotSelf', v_self,
      'segments', v_msg.segments,
      -- 앞 최대 4줄(오래된 것부터).
      'context', coalesce((
        select jsonb_agg(jsonb_build_object('role', c.role, 'text', c.text, 'segments', c.segments) order by c.created_at)
        from (
          select m.role, m.text, m.segments, m.created_at from companion.messages m
          where m.conversation_id = v_msg.conversation_id and m.created_at < v_msg.created_at
            and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
          order by m.created_at desc limit 4
        ) c
      ), '[]'::jsonb),
      'refs', to_jsonb(v_refs),
      'engine', s.snapshot_engine,
      'quality', s.snapshot_quality,
      'aspect', s.snapshot_aspect
    );
  end if;

  v_hold := companion.reserve_hold(p_user_id, v_charge, v_media_id, v_character, v_cost);
  if v_hold->>'result' <> 'ok' then
    return v_hold;
  end if;
  insert into companion.media (id, user_id, character_id, conversation_id, message_id, kind, charge, cost, hold_id, source, text, meta)
  values (v_media_id, p_user_id, v_character, v_msg.conversation_id, p_message_id, p_kind, v_charge, v_cost, (v_hold->>'holdId')::uuid,
    coalesce(v_msg.segments, '[]'::jsonb), v_text, jsonb_build_object('aiGenerated', true, 'ageBand', v_band))
  returning * into v_media;
  return jsonb_build_object(
    'result', 'ok',
    'cached', false,
    'media', companion.media_json(v_media),
    'holdId', v_hold->>'holdId',
    'job', v_job || jsonb_build_object('mediaId', v_media.id, 'userId', p_user_id, 'characterId', v_character)
  );
end;
$$;


-- create or replace는 권한을 그대로 둔다. 20261202120000과 같게 다시 적어 둔다.
revoke all on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) to service_role;

update companion.characters
set media = media || jsonb_build_object(
  'voiceModel', 'eleven_v4',
  'voiceSettings', jsonb_build_object('stability', 0.4, 'similarityBoost', 0.8, 'style', 0.45))
where id = 'daeun';

-- 되돌리기(다은만 원래대로):
--   update companion.characters set media = media - 'voiceModel' - 'voiceSettings' where id = 'daeun';
