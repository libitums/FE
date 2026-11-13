-- AI 컴패니언 스냅샷 · 음성(ADR-0138). 운영 대시보드 플레이그라운드(companion_snap.py)의 파이프라인을 앱이 부르는 서버 기능으로 옮긴다.
--
-- 1. 스냅샷 = 캐릭터 메시지 한 장면 → 이미지 한 장. 음성 = 캐릭터 메시지의 한국어 대사 → mp3 한 개. 서로 독립된 단건이고 유저가 누를 때만 만든다.
-- 2. 표 하나 `companion.media`(kind snapshot · voice). 요청하면 바로 pending 행을 만들고(엽전 예약) Edge Function이 백그라운드에서 만든 뒤
--    `companion_media_finish`로 닫는다. complete면 예약 확정, blocked · failed면 해제.
-- 3. 대상은 통과한 캐릭터 메시지만: role assistant, origin turn · greeting · proactive, 숨김 아님, status complete, `meta.refusal` 아님.
--    서버가 메시지를 직접 읽는다. 남의 메시지는 `forbidden`.
-- 4. 앨범은 메시지 · 대화에 외래 키를 걸지 않는다 — 대화 초기화로 지워지지 않는다. 계정 삭제는 auth.users cascade로 행이 지워지고,
--    Storage 파일은 `delete-account`가 지운다.
-- 5. 엽전: 예약 함수를 일반화한다(`companion.reserve_hold`, 사유 message · photo · voice · photo_redraw). 덕수쌤 체험은 쓰지 않는다.
--    시험 계정도 엽전을 낸다(ADR-0117 D4 「무제한도 사진 · 음성 요청은 엽전」).
-- 6. Storage 버킷 둘(비공개): `companion-media`(결과, `<user_id>/<media_id>.png|mp3`) · `companion-refs`(기준 이미지 `<slug>-ref.png` ·
--    `<slug>-expressions.png`, 사용자가 올린다). Storage가 없는 DB(통합 테스트의 embedded-postgres 등)에서는 버킷 정의를 건너뛴다.

-- ------------------------------------------------------------------ 설정 · 열

alter table companion.settings
  add column photo_cost integer not null default 35 check (photo_cost >= 0),
  add column voice_cost integer not null default 15 check (voice_cost >= 0),
  add column photo_redraw_cost integer not null default 25 check (photo_redraw_cost >= 0),
  -- 스냅샷 하루 상한(UTC 날짜, 다시 그리기 포함, pending · complete를 센다). null = 상한 없음(기본 — 엽전이 곧 한도다,
  -- 사용자 2026-11-14). 오류 폭주 · 남용 때 운영자가 숫자를 넣는 비상 스위치다.
  add column snapshot_daily_limit integer check (snapshot_daily_limit is null or snapshot_daily_limit >= 0),
  -- 이미지 엔진(OpenAI 이미지 편집 모델 이름) · 품질 · 비율. auto면 프롬프트 노드가 3:2 · 1:1 중 고른다.
  add column snapshot_engine text not null default 'gpt-image-2.5-flare' check (snapshot_engine ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,59}$'),
  add column snapshot_quality text not null default 'medium' check (snapshot_quality in ('low', 'medium', 'high')),
  add column snapshot_aspect text not null default 'auto' check (snapshot_aspect in ('3:2', '1:1', 'auto')),
  add column voice_model text not null default 'eleven_v3' check (voice_model ~ '^[a-z0-9_]{1,40}$'),
  -- pending이 이 분을 넘으면 실패로 닫고 예약을 푼다(Edge Function이 도중에 죽은 경우).
  add column media_pending_minutes integer not null default 10 check (media_pending_minutes between 1 and 120);

-- 캐릭터별 스냅샷 · 음성 설정: { voiceId, refSlugs[], look }. 키가 아니라 id라 DB에 둔다.
-- voiceId · look은 lab의 CHARACTERS(duru-curation audio/story/characters.yaml · kkachi-assets cast)에서 옮겼다.
alter table companion.characters
  add column media jsonb not null default '{}'::jsonb check (jsonb_typeof(media) = 'object');

update companion.characters set media = jsonb_build_object(
  'voiceId', 'WW9FljMgKZtSNvBwgs3R',
  'refSlugs', jsonb_build_array('deoksu', 'duksu', 'deoksu-teacher'),
  'look', 'Korean language teacher in his 30s: bald crown with one lock of front hair, horn-rimmed glasses, red bow tie, friendly comic expression.'
) where id = 'duksu';
update companion.characters set media = jsonb_build_object(
  'voiceId', 'ah4r1hZOydd3XWlHOm3Y',
  'refSlugs', jsonb_build_array('yoonkyung'),
  'look', '69-year-old Korean woman who runs a small shop in Ikseon-dong: short silver-grey bob, thin angular glasses, small frame, thin knit or shirt with a cardigan and a dark apron, warm eye wrinkles.'
) where id = 'yoonkyung';
update companion.characters set media = jsonb_build_object(
  'voiceId', 'xi3rF0t7dg7uN2M0WUhr',
  'refSlugs', jsonb_build_array('mina'),
  'look', 'Woman in her mid-20s traveling in Korea: honey dark-blonde wavy hair below the collarbone, almond eyes with grey-blue irises, distinct brows, casual clothes. Attractive face, no body emphasis.'
) where id = 'mina';
update companion.characters set media = jsonb_build_object(
  'voiceId', 'rCm09Tf1yMYbOyCRLDyB',
  'refSlugs', jsonb_build_array('doyun'),
  'look', '22-year-old idol trainee who works at a cafe: dark brown hair, big round playful eyes with light brown irises, bright energetic expression.'
) where id = 'doyun';
update companion.characters set media = jsonb_build_object(
  'voiceId', 'hBLOHZ3ct4ofaRNnBHcs',
  'refSlugs', jsonb_build_array('jaemin'),
  'look', '29-year-old office worker who climbs on weekends: black heavy hair with bangs touching the brows, narrow calm eyes with heavy lids, thick straight brows, neat clothes.'
) where id = 'jaemin';

-- 스냅샷에 그릴 학습자 뒷모습. 엔진이 성별을 마음대로 고르지 않게 프롬프트에 명시한다. 기본 female(스토리 bible의 플레이어).
-- hidden이면 손 · 어깨만.
alter table companion.profiles
  add column snapshot_self text not null default 'female' check (snapshot_self in ('female', 'male', 'hidden'));

-- 예약 사유. 기존 예약은 메시지다. 사진 · 음성 예약은 client_message_id 자리에 media id를 넣는다.
alter table companion.credit_holds
  add column reason text not null default 'message' check (reason in ('message', 'photo', 'voice', 'photo_redraw'));

-- ------------------------------------------------------------------ 표

create table companion.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id),
  -- 대화 · 메시지에 외래 키를 걸지 않는다(대화 초기화 뒤에도 앨범에 남는다).
  conversation_id uuid,
  message_id uuid not null,
  kind text not null check (kind in ('snapshot', 'voice')),
  status text not null default 'pending' check (status in ('pending', 'complete', 'blocked', 'failed')),
  charge text not null check (charge in ('photo', 'photo_redraw', 'voice')),
  -- 예약한 엽전. 앱에 보이는 값은 complete · pending이면 이 값, blocked · failed면 0(해제).
  cost integer not null check (cost >= 0),
  hold_id uuid,
  -- 만들 때의 메시지 말풍선(앨범이 대화 초기화 뒤에도 장면 글을 보이게).
  source jsonb not null default '[]'::jsonb,
  -- 음성: 읽은 한국어 대사.
  text text,
  storage_path text,
  mime text,
  bytes integer check (bytes is null or bytes >= 0),
  aspect text check (aspect is null or aspect in ('3:2', '1:1')),
  -- 스냅샷: 프롬프트 노드 결과 · 검사 노드 판정.
  prompt jsonb,
  verdict jsonb,
  -- { aiGenerated, engine, model, quality, size, promptHash, retries, ms, usage } — 운영 조회용. 앱에는 aiGenerated · engine · model만.
  meta jsonb not null default '{}'::jsonb,
  -- 앱에 보이는 실패 코드(prompt_blocked · engine_refused · check_failed · engine_failed · prompt_failed · check_error ·
  -- refs_missing · storage_failed · expired)와 운영용 자세한 글.
  failure text,
  error text,
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  check ((status = 'complete') = (storage_path is not null))
);
-- 스냅샷은 유저당 동시에 하나. 음성은 같은 메시지에 동시에 하나.
create unique index media_snapshot_pending_uniq on companion.media (user_id) where kind = 'snapshot' and status = 'pending';
create unique index media_voice_pending_uniq on companion.media (user_id, message_id) where kind = 'voice' and status = 'pending';
create index media_album_idx on companion.media (user_id, character_id, created_at desc);
create index media_message_idx on companion.media (message_id, kind, created_at desc);

alter table companion.media enable row level security;
revoke all on table companion.media from public, anon, authenticated;
grant select, insert, update, delete on table companion.media to service_role;

-- ------------------------------------------------------------------ Storage

do $storage$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('companion-media', 'companion-media', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg']),
      ('companion-refs', 'companion-refs', false, 20971520, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
  end if;
  -- 앱은 자기 폴더(`<user_id>/…`)의 결과만 읽고 서명 URL을 만든다. 쓰기 · 지우기는 서버 키(Edge Function)만. 기준 이미지는 앱이 읽지 못한다.
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists companion_media_owner_read on storage.objects';
    execute $policy$
      create policy companion_media_owner_read on storage.objects for select to authenticated
      using (bucket_id = 'companion-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $policy$;
  end if;
end;
$storage$;

-- ------------------------------------------------------------------ 도우미

-- 엽전 예약(일반화). 메시지 턴(`companion_begin_turn`)은 같은 규칙을 함수 안에 그대로 두고, 사진 · 음성이 이 함수를 쓴다.
-- 지갑을 잠그고 bucket_order대로 뺀다. 덕수쌤 체험은 쓰지 않는다(메시지에만). 원장 reserve 줄에 사유와 ref(media id)를 적는다.
create function companion.reserve_hold(p_user_id uuid, p_reason text, p_ref_id uuid, p_character_id text, p_amount integer)
returns jsonb language plpgsql as $$
declare
  s companion.settings;
  v_balance integer;
  v_left integer;
  v_take integer;
  v_bucket text;
  v_buckets jsonb := '{}'::jsonb;
  v_hold companion.credit_holds;
begin
  if p_reason not in ('message', 'photo', 'voice', 'photo_redraw') or p_amount is null or p_amount < 0 or p_ref_id is null then
    raise exception 'invalid hold' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  perform companion.lock_wallet(p_user_id);
  v_balance := (companion.wallet_balances(p_user_id)->>'balance')::integer;
  if v_balance < p_amount then
    return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object('required', p_amount, 'balance', v_balance));
  end if;
  v_left := p_amount;
  foreach v_bucket in array s.bucket_order loop
    exit when v_left = 0;
    v_take := least(companion.bucket_balance(p_user_id, v_bucket), v_left);
    if v_take > 0 then
      perform companion.move_bucket(p_user_id, v_bucket, -v_take);
      v_buckets := v_buckets || jsonb_build_object(v_bucket, v_take);
      v_left := v_left - v_take;
    end if;
  end loop;
  insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial, reason)
  values (p_user_id, p_ref_id, p_character_id, p_amount, v_buckets, false, p_reason)
  returning * into v_hold;
  insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id, hold_id)
  select p_user_id, -value::integer, key, 'reserve', p_reason, p_ref_id::text, v_hold.id from jsonb_each_text(v_buckets);
  return jsonb_build_object('result', 'ok', 'holdId', v_hold.id, 'amount', v_hold.amount, 'buckets', v_buckets);
end;
$$;
revoke all on function companion.reserve_hold(uuid, text, uuid, text, integer) from public;

-- 캐릭터가 소리 내 말하는 한국어: speech 조각만, `*행동*`과 번역은 뺀다(lab의 spoken_korean과 같다).
create function companion.spoken_korean(p_segments jsonb)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    coalesce(string_agg(regexp_replace(coalesce(t.e->>'text', ''), '\*[^*]*\*', ' ', 'g'), ' ' order by t.ord), ''),
    '\s+', ' ', 'g'))
  from jsonb_array_elements(case when jsonb_typeof(p_segments) = 'array' then p_segments else '[]'::jsonb end) with ordinality as t(e, ord)
  where coalesce(t.e->>'kind', 'speech') = 'speech'
$$;
revoke all on function companion.spoken_korean(jsonb) from public;

-- 스냅샷 · 음성을 만들 수 있는 메시지인가(통과한 캐릭터 메시지).
create function companion.media_eligible(m companion.messages)
returns boolean language sql immutable as $$
  select m.role = 'assistant' and m.origin in ('turn', 'greeting', 'proactive') and not m.hidden and m.status = 'complete'
    and coalesce(m.meta->>'refusal', '') <> 'true'
$$;
revoke all on function companion.media_eligible(companion.messages) from public;

-- 앱에 보이는 상태: 시간이 지난 pending은 failed(expired)로 보인다(정리 작업이 곧 닫는다).
create function companion.media_json(m companion.media)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'characterId', m.character_id,
    'messageId', m.message_id,
    'kind', m.kind,
    'status', case when x.expired then 'failed' else m.status end,
    'charge', m.charge,
    'cost', case when m.status in ('pending', 'complete') and not x.expired then m.cost else 0 end,
    'path', m.storage_path,
    'mime', m.mime,
    'aspect', m.aspect,
    'failure', case when x.expired then 'expired' else m.failure end,
    'aiGenerated', true,
    'engine', m.meta->>'engine',
    'model', m.meta->>'model',
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'finishedAt', case when m.finished_at is null then null else to_char(m.finished_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  )
  from (select m.status = 'pending' and m.created_at < now() - make_interval(mins => (select media_pending_minutes from companion.settings)) as expired) x
$$;
revoke all on function companion.media_json(companion.media) from public;

-- 시간이 지난 pending을 failed(expired)로 닫고 예약을 푼다. p_user_id가 null이면 모든 유저. 닫은 수.
create function companion.expire_stale_media(p_user_id uuid, p_now timestamptz)
returns integer language plpgsql as $$
declare
  v record;
  v_count integer := 0;
begin
  for v in select id, hold_id from companion.media
    where status = 'pending' and (p_user_id is null or user_id = p_user_id)
      and created_at < p_now - make_interval(mins => (select media_pending_minutes from companion.settings))
    for update skip locked loop
    update companion.media set status = 'failed', failure = 'expired', error = 'pending timed out', finished_at = p_now where id = v.id;
    if v.hold_id is not null then
      perform companion.release_hold(v.hold_id);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function companion.expire_stale_media(uuid, timestamptz) from public;

-- ------------------------------------------------------------------ 서버용 (service_role) — Edge Function이 부른다

-- 요청 하나. 결과:
--   ok(cached false) — pending 행을 만들고 엽전을 예약했다. `job`이 백그라운드 작업의 입력이다.
--   ok(cached true)  — 이 메시지의 저장본(또는 만드는 중인 행)을 그대로 돌려준다. 차감 없음. 음성은 「다시」(p_again)가 아니면 저장본,
--                      스냅샷은 「다시 그리기」(p_again)가 아니면 저장본.
--   message_not_found · forbidden(남의 메시지) · not_eligible · no_speech · too_long · not_configured(detail.missing voice_id · refs) ·
--   snapshot_in_progress(detail.mediaId) · daily_limit(detail.limit) · insufficient_credits(detail.required · balance) ·
--   그리고 `companion_turn_gate`의 판정 코드(not_available · age_restricted · temporarily_blocked · usage_time_limit · invalid_session).
create function public.companion_media_begin(p_user_id uuid, p_message_id uuid, p_kind text, p_again boolean, p_now timestamptz)
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

  -- 지갑을 먼저 잠근다 — 같은 유저의 요청을 한 줄로 세워 동시 1 · 하루 상한 · 저장본 판정이 겹치지 않게.
  perform companion.lock_wallet(p_user_id);
  perform companion.expire_stale_media(p_user_id, p_now);

  -- 이 메시지에서 만드는 중인 것이 있으면 그것, 「다시」가 아니면 저장본.
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

-- 백그라운드 작업의 끝. p_status complete면 예약 확정, blocked · failed면 해제. 이미 닫힌 행(시간 초과로 정리됨 등)은 바꾸지 않고 closed.
-- p_result: { path, mime, bytes, aspect, prompt, verdict, meta, failure, error }.
create function public.companion_media_finish(p_media_id uuid, p_status text, p_result jsonb, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v companion.media;
begin
  if p_status not in ('complete', 'blocked', 'failed') then
    raise exception 'invalid media status' using errcode = '22023';
  end if;
  if p_status = 'complete' and coalesce(p_result->>'path', '') = '' then
    raise exception 'complete media needs a path' using errcode = '22023';
  end if;
  select * into v from companion.media where id = p_media_id for update;
  if not found then
    raise exception 'media not found' using errcode = 'P0002';
  end if;
  if v.status <> 'pending' then
    return jsonb_build_object('result', 'closed', 'media', companion.media_json(v));
  end if;
  update companion.media set
    status = p_status,
    storage_path = case when p_status = 'complete' then p_result->>'path' end,
    mime = case when p_status = 'complete' then p_result->>'mime' end,
    bytes = case when p_status = 'complete' then (p_result->>'bytes')::integer end,
    aspect = nullif(p_result->>'aspect', ''),
    prompt = case when jsonb_typeof(p_result->'prompt') = 'object' then p_result->'prompt' end,
    verdict = case when jsonb_typeof(p_result->'verdict') = 'object' then p_result->'verdict' end,
    meta = meta || case when jsonb_typeof(p_result->'meta') = 'object' then p_result->'meta' else '{}'::jsonb end
      || jsonb_build_object('aiGenerated', true),
    failure = case when p_status = 'complete' then null else coalesce(nullif(p_result->>'failure', ''), 'engine_failed') end,
    error = left(p_result->>'error', 500),
    finished_at = p_now
  where id = p_media_id
  returning * into v;
  if v.hold_id is not null then
    if p_status = 'complete' then
      perform companion.settle_hold(v.hold_id);
    else
      perform companion.release_hold(v.hold_id);
    end if;
  end if;
  return jsonb_build_object('result', 'ok', 'media', companion.media_json(v),
    'balance', (companion.wallet_balances(v.user_id)->>'balance')::integer);
end;
$$;

-- 닫히지 않은 예약 정리(20261112 판 + 사진 · 음성). 사진 · 음성 예약은 media_pending_minutes보다 젊으면 건드리지 않는다(아직 그리는 중일 수 있다).
create or replace function public.companion_release_stale_holds(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold record;
  v_count integer := 0;
  v_media interval := make_interval(mins => (select media_pending_minutes from companion.settings));
begin
  for v_hold in select id, user_id, client_message_id, reason from companion.credit_holds
    where status = 'open' and created_at < now() - case when reason = 'message' then p_older_than else greatest(p_older_than, v_media) end loop
    perform companion.release_hold(v_hold.id);
    if v_hold.reason = 'message' then
      update companion.messages set status = 'failed'
      where user_id = v_hold.user_id and client_message_id = v_hold.client_message_id and status = 'pending';
    else
      update companion.media set status = 'failed', failure = 'expired', error = 'stale hold released', finished_at = now()
      where hold_id = v_hold.id and status = 'pending';
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated)

-- 앨범: 다 만든 것만(complete), 최신부터. p_character_id · p_kind가 null이면 전부. p_before 커서, p_limit 1 ~ 50.
create function public.companion_list_media(p_character_id text, p_kind text, p_before timestamptz, p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := coalesce(p_limit, 30);
  v_items jsonb;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if v_limit not between 1 and 50 or (p_kind is not null and p_kind not in ('snapshot', 'voice')) then
    raise exception 'invalid media page' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(companion.media_json(x) order by x.created_at desc), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select * from companion.media m
    where m.user_id = auth.uid() and m.status = 'complete'
      and (p_character_id is null or m.character_id = p_character_id)
      and (p_kind is null or m.kind = p_kind)
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc
    limit v_limit + 1
  ) x;
  if v_count > v_limit then
    v_items := v_items - v_limit;
  end if;
  return jsonb_build_object('items', v_items, 'hasMore', v_count > v_limit);
end;
$$;

-- 상태 조회: 내 media id 또는 메시지 id로(대화 화면이 메시지 아래 결과 · 자리표시자를 다시 그릴 때). 최신부터 100개까지, 모든 상태.
create function public.companion_get_media(p_ids uuid[], p_message_ids uuid[])
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
  if coalesce(cardinality(p_ids), 0) + coalesce(cardinality(p_message_ids), 0) > 100 then
    raise exception 'too many ids' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(companion.media_json(x) order by x.created_at desc)
    from (
      select * from companion.media m
      where m.user_id = auth.uid() and (m.id = any (coalesce(p_ids, array[]::uuid[])) or m.message_id = any (coalesce(p_message_ids, array[]::uuid[])))
      order by m.created_at desc limit 100
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 프로필(20261118 판 + snapshotSelf).
create or replace function public.companion_load_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'birthYear', birth_year,
    'ageSource', age_source,
    'l1', l1,
    'feedbackMode', feedback_mode,
    'proactivePref', proactive_pref,
    'proactiveHour', proactive_hour,
    'timezone', timezone,
    'replySuggestions', reply_suggestions,
    'snapshotSelf', snapshot_self
  )
  from companion.profiles
  where user_id = auth.uid();
$$;

drop function public.companion_save_profile(integer, text, text, text, text, integer, text, boolean);
-- 20261118 판 + p_snapshot_self(female · male · hidden). null인 인수는 그 열을 바꾸지 않는다.
create function public.companion_save_profile(
  p_birth_year integer,
  p_age_source text,
  p_l1 text,
  p_feedback_mode text,
  p_proactive_pref text default null,
  p_proactive_hour integer default null,
  p_timezone text default null,
  p_reply_suggestions boolean default null,
  p_snapshot_self text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if (p_birth_year is null) <> (p_age_source is null)
    or (p_birth_year is not null and (
      p_birth_year < 1900 or p_birth_year > extract(year from now())::integer
    ))
    or (p_age_source is not null and p_age_source not in ('self', 'social', 'store_signal'))
    or (p_l1 is not null and p_l1 !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$')
    or (p_feedback_mode is not null and p_feedback_mode not in ('separate', 'natural', 'prefix'))
    or (p_snapshot_self is not null and p_snapshot_self not in ('female', 'male', 'hidden'))
    or not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id, birth_year, age_source, l1, feedback_mode, updated_at)
  values (auth.uid(), p_birth_year, p_age_source, p_l1, p_feedback_mode, now())
  on conflict (user_id) do update set
    birth_year = coalesce(excluded.birth_year, companion.profiles.birth_year),
    age_source = coalesce(excluded.age_source, companion.profiles.age_source),
    l1 = coalesce(excluded.l1, companion.profiles.l1),
    feedback_mode = coalesce(excluded.feedback_mode, companion.profiles.feedback_mode),
    updated_at = now();
  update companion.profiles set
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end,
    reply_suggestions = coalesce(p_reply_suggestions, reply_suggestions),
    snapshot_self = coalesce(p_snapshot_self, snapshot_self)
  where user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------------ 운영 (service_role)

-- 20261118 판 + snapshotSelf.
create or replace function public.companion_inspect_testers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', u.id,
    'email', u.email,
    'ageBand', companion.age_band(p.birth_year, now()),
    'birthYear', p.birth_year,
    'l1', p.l1,
    'region', p.last_region,
    'feedbackMode', p.feedback_mode,
    'proactivePref', coalesce(p.proactive_pref, 'daily1'),
    'proactiveHour', p.proactive_hour,
    'timezone', p.timezone,
    'replySuggestions', coalesce(p.reply_suggestions, true),
    'snapshotSelf', coalesce(p.snapshot_self, 'female')
  ) order by u.email), '[]'::jsonb)
  from auth.users u
  left join companion.profiles p on p.user_id = u.id
  where u.raw_app_meta_data->>'duru_tester' = 'true'
$$;

drop function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean);
-- 20261118 판 + p_snapshot_self.
create function public.companion_operator_set_profile(
  p_user_id uuid, p_birth_year integer, p_clear_age boolean, p_l1 text, p_feedback_mode text, p_region text,
  p_proactive_pref text default null, p_proactive_hour integer default null, p_timezone text default null,
  p_reply_suggestions boolean default null, p_snapshot_self text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  if not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone)
    or (p_snapshot_self is not null and p_snapshot_self not in ('female', 'male', 'hidden')) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id) values (p_user_id) on conflict do nothing;
  update companion.profiles set
    birth_year = case when p_clear_age then null else coalesce(p_birth_year::smallint, birth_year) end,
    age_source = case when p_clear_age then null when p_birth_year is not null then 'self' else age_source end,
    l1 = coalesce(p_l1, l1),
    feedback_mode = coalesce(p_feedback_mode, feedback_mode),
    last_region = case when p_region = '' then null else coalesce(p_region, last_region) end,
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end,
    reply_suggestions = coalesce(p_reply_suggestions, reply_suggestions),
    snapshot_self = coalesce(p_snapshot_self, snapshot_self),
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- 운영 조회: 스냅샷 · 음성 행 전부(프롬프트 · 판정 · 메타 · 오류 · 예약 상태)와 오늘(UTC) 수. p_user_id가 null이면 모든 유저.
create function public.companion_inspect_media(p_user_id uuid, p_limit integer)
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
        and status in ('pending', 'complete') and created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc')
    ),
    'settings', (select jsonb_build_object('photoCost', photo_cost, 'voiceCost', voice_cost, 'photoRedrawCost', photo_redraw_cost,
      'snapshotDailyLimit', snapshot_daily_limit, 'snapshotEngine', snapshot_engine, 'snapshotQuality', snapshot_quality,
      'snapshotAspect', snapshot_aspect, 'voiceModel', voice_model, 'mediaPendingMinutes', media_pending_minutes) from companion.settings),
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

-- 운영 조회: `companion-media`에 있으나 media 행이 없는 파일(계정 삭제 때 Storage 지우기가 실패했거나, 닫기 전에 정리된 작업이 올린 것).
-- 지우기는 Storage API로 한다(SQL로 storage.objects를 지우지 않는다).
create function public.companion_media_orphans(p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if to_regclass('storage.objects') is null then
    return '[]'::jsonb;
  end if;
  execute $q$
    select coalesce(jsonb_agg(x.name order by x.name), '[]'::jsonb) from (
      select o.name from storage.objects o
      where o.bucket_id = 'companion-media'
        and not exists (select 1 from companion.media m where m.storage_path = o.name)
      order by o.name limit $1
    ) x
  $q$ into v using greatest(1, least(coalesce(p_limit, 100), 1000));
  return v;
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_media_finish(uuid, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_release_stale_holds(interval) from public, anon, authenticated;
revoke all on function public.companion_inspect_media(uuid, integer) from public, anon, authenticated;
revoke all on function public.companion_media_orphans(integer) from public, anon, authenticated;
revoke all on function public.companion_inspect_testers() from public, anon, authenticated;
revoke all on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean, text) from public, anon, authenticated;
grant execute on function public.companion_media_begin(uuid, uuid, text, boolean, timestamptz) to service_role;
grant execute on function public.companion_media_finish(uuid, text, jsonb, timestamptz) to service_role;
grant execute on function public.companion_release_stale_holds(interval) to service_role;
grant execute on function public.companion_inspect_media(uuid, integer) to service_role;
grant execute on function public.companion_media_orphans(integer) to service_role;
grant execute on function public.companion_inspect_testers() to service_role;
grant execute on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean, text) to service_role;
revoke all on function public.companion_list_media(text, text, timestamptz, integer) from public, anon;
revoke all on function public.companion_get_media(uuid[], uuid[]) from public, anon;
revoke all on function public.companion_save_profile(integer, text, text, text, text, integer, text, boolean, text) from public, anon;
grant execute on function public.companion_list_media(text, text, timestamptz, integer) to authenticated;
grant execute on function public.companion_get_media(uuid[], uuid[]) to authenticated;
grant execute on function public.companion_save_profile(integer, text, text, text, text, integer, text, boolean, text) to authenticated;
