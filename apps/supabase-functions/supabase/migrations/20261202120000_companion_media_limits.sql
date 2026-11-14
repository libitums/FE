-- AI 컴패니언 스냅샷 · 음성 상한(ADR-0146 리뷰 반영, 2026-11-14). 20261130(운영 적용됨)은 고치지 않고 여기서 바꾼다.
--
-- 1. 시도 상한: blocked · failed는 엽전을 풀고 `snapshot_daily_limit`(pending · complete)에도 안 잡히지만 엔진 비용(OpenAI 이미지 · Claude 노드 ·
--    ElevenLabs)은 이미 났다. 그날(UTC) 엔진까지 간 시도를 상태와 상관없이 센다 — 스냅샷(다시 그리기 포함) 30 · 음성 60.
--    기준 이미지 없음(`refs_missing`)은 엔진 전 실패라 세지 않는다. null = 끔.
-- 2. 연속 실패 가드: 그날 그 종류의 마지막 complete 뒤 blocked · failed(expired 포함)가 5번 이어지면 그날은 더 시도하지 않는다
--    (안전 정책에 계속 걸리는 장면을 무료로 되풀이하는 것을 막는다). null = 끔.
--    두 가드 모두 429 `attempt_limit` `{kind, reason: attempts | failures, limit, resetsAt}`, 예약 · 행 없음. 저장본(cached)은 막지 않는다.
-- 3. 음성 비상 스위치 `voice_daily_limit`(스냅샷 `snapshot_daily_limit`과 같은 모양): null = 상한 없음(기본), 0 = 음성 끔, 넘으면 429 `daily_limit`.
-- 4. `media_pending_minutes` 하한 5분: Edge 작업은 150초 안에 끝나거나 죽는다(함수 예산 140초). 만료가 그보다 짧으면 예약을 푼 뒤에
--    늦은 업로드 · 확정이 올 수 있다. 지금 값 10은 그대로 유효하다.
-- 5. `plan_turns_today`(20261129)는 사유 상관없이 예약을 셌다 — 사진 · 음성 예약이 구독자의 하루 무료 · 공정 사용(200) 메시지 상한을 먹었다.
--    메시지 예약(`reason = 'message'`)만 센다.
--
-- 기본값 근거: 스냅샷 30번 = 엽전 1,050(35 × 30)으로 상점 1,200팩에 가깝다 — 정상 사용으로는 닿지 않고, 닿아도 하루 원가가 한 유저 수 달러 안이다.
-- 음성 60번은 단가가 싸고(15) 메시지마다 누를 수 있어 두 배. 연속 실패 5번은 정상 장면이 다섯 번 연속 걸릴 일이 드물어서다.
-- 모두 `companion.settings`에서 운영자가 고친다.

-- ------------------------------------------------------------------ 설정

alter table companion.settings
  add column snapshot_daily_attempts integer default 30 check (snapshot_daily_attempts is null or snapshot_daily_attempts >= 0),
  add column voice_daily_attempts integer default 60 check (voice_daily_attempts is null or voice_daily_attempts >= 0),
  add column media_failure_streak_limit integer default 5 check (media_failure_streak_limit is null or media_failure_streak_limit >= 1),
  add column voice_daily_limit integer check (voice_daily_limit is null or voice_daily_limit >= 0);

alter table companion.settings drop constraint settings_media_pending_minutes_check;
alter table companion.settings add constraint settings_media_pending_minutes_check check (media_pending_minutes between 5 and 120);

-- ------------------------------------------------------------------ 시도 가드

-- 그날(UTC) 이 종류의 시도 상한 · 연속 실패 가드. 걸리면 `attempt_limit` 결과, 아니면 null.
create function companion.media_attempt_gate(p_user_id uuid, p_kind text, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  s companion.settings;
  v_day timestamptz := ((p_now at time zone 'utc')::date)::timestamp at time zone 'utc';
  v_limit integer;
  v_attempts integer;
  v_last_complete timestamptz;
  v_streak integer;
  v_resets text := to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
begin
  select * into s from companion.settings;
  v_limit := case when p_kind = 'voice' then s.voice_daily_attempts else s.snapshot_daily_attempts end;
  if v_limit is not null then
    select count(*) into v_attempts from companion.media
    where user_id = p_user_id and kind = p_kind and created_at >= v_day and failure is distinct from 'refs_missing';
    if v_attempts >= v_limit then
      return jsonb_build_object('result', 'attempt_limit', 'detail', jsonb_build_object(
        'kind', p_kind, 'reason', 'attempts', 'limit', v_limit, 'resetsAt', v_resets));
    end if;
  end if;
  if s.media_failure_streak_limit is not null then
    select max(created_at) into v_last_complete from companion.media
    where user_id = p_user_id and kind = p_kind and status = 'complete' and created_at >= v_day;
    select count(*) into v_streak from companion.media
    where user_id = p_user_id and kind = p_kind and status in ('blocked', 'failed')
      and failure is distinct from 'refs_missing'
      and created_at >= v_day and created_at > coalesce(v_last_complete, '-infinity'::timestamptz);
    if v_streak >= s.media_failure_streak_limit then
      return jsonb_build_object('result', 'attempt_limit', 'detail', jsonb_build_object(
        'kind', p_kind, 'reason', 'failures', 'limit', s.media_failure_streak_limit, 'resetsAt', v_resets));
    end if;
  end if;
  return null;
end;
$$;
revoke all on function companion.media_attempt_gate(uuid, text, timestamptz) from public;

-- ------------------------------------------------------------------ 요청 (20261130 판 + 음성 하루 상한 · 시도 가드)

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
    v_job := jsonb_build_object('voiceId', v_cfg->>'voiceId', 'model', s.voice_model, 'text', v_text);
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

-- ------------------------------------------------------------------ 구독 하루 메시지 수 (20261129 판 + 메시지 예약만)

-- 그날(UTC) 메시지 턴 수 — 요금제 무료로 연 것 · 전부(해제된 예약은 빼고). 사진 · 음성 예약(reason photo · voice · photo_redraw)은 세지 않는다.
create or replace function companion.plan_turns_today(p_user_id uuid, p_now timestamptz, out free_used integer, out total integer)
language sql stable as $$
  select (count(*) filter (where plan_free))::integer, count(*)::integer
  from companion.credit_holds
  where user_id = p_user_id and status <> 'released' and reason = 'message'
    and created_at >= ((p_now at time zone 'utc')::date)::timestamp at time zone 'utc'
    and created_at < (((p_now at time zone 'utc')::date + 1)::timestamp at time zone 'utc')
$$;

-- ------------------------------------------------------------------ 운영 조회 (20261130 판 + 시도 수 · 새 설정)

create or replace function public.companion_inspect_media(p_user_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'today', jsonb_build_object(
      'snapshot', (select count(*) from companion.media where (p_user_id is null or user_id = p_user_id) and kind = 'snapshot'
        and status in ('pending', 'complete') and created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc'),
      'voice', (select count(*) from companion.media where (p_user_id is null or user_id = p_user_id) and kind = 'voice'
        and status in ('pending', 'complete') and created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc'),
      -- 시도 상한이 세는 수(모든 상태, refs_missing 제외).
      'snapshotAttempts', (select count(*) from companion.media where (p_user_id is null or user_id = p_user_id) and kind = 'snapshot'
        and failure is distinct from 'refs_missing' and created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc'),
      'voiceAttempts', (select count(*) from companion.media where (p_user_id is null or user_id = p_user_id) and kind = 'voice'
        and failure is distinct from 'refs_missing' and created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc')
    ),
    'settings', (select jsonb_build_object('photoCost', photo_cost, 'voiceCost', voice_cost, 'photoRedrawCost', photo_redraw_cost,
      'snapshotDailyLimit', snapshot_daily_limit, 'snapshotEngine', snapshot_engine, 'snapshotQuality', snapshot_quality,
      'snapshotAspect', snapshot_aspect, 'voiceModel', voice_model, 'mediaPendingMinutes', media_pending_minutes,
      'snapshotDailyAttempts', snapshot_daily_attempts, 'voiceDailyAttempts', voice_daily_attempts,
      'mediaFailureStreakLimit', media_failure_streak_limit, 'voiceDailyLimit', voice_daily_limit) from companion.settings),
    'items', coalesce((
      select jsonb_agg(companion.media_json(m) || jsonb_build_object(
        'userId', m.user_id, 'conversationId', m.conversation_id, 'storedStatus', m.status, 'reservedCost', m.cost,
        'source', m.source, 'text', m.text, 'bytes', m.bytes, 'prompt', m.prompt, 'verdict', m.verdict, 'meta', m.meta,
        'error', m.error, 'holdId', m.hold_id, 'holdStatus', h.status
      ) order by m.created_at desc)
      from (
        select * from companion.media where p_user_id is null or user_id = p_user_id
        order by created_at desc limit greatest(1, least(coalesce(p_limit, 50), 500))
      ) m
      left join companion.credit_holds h on h.id = m.hold_id
    ), '[]'::jsonb)
  )
$$;

-- `create or replace`는 권한을 그대로 두지만, 새 DB에서도 같게 다시 적는다.
revoke all on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_inspect_media(uuid, integer) from public, anon, authenticated;
grant execute on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) to service_role;
grant execute on function public.companion_inspect_media(uuid, integer) to service_role;
