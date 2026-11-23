-- 예시 스냅샷 — 안내에서 무료로 한 장(사용자 결정 2026-11-23, ADR-0146 「추가 — 안내에서 무료 예시 한 장」).
-- 최근 7일 채팅한 1,220명 가운데 스냅샷을 써 본 사람은 38명(3.1%)이다. 방 안내가 사진 단추를 가리키고, 누르면 미리 올려 둔 그 인물의
-- 사진 한 장을 값 없이 · 기다림 없이 준다. 서버가 맡는 것:
-- 1. 표 `companion.media_samples` — 인물 → 버킷 경로(`companion-media`의 `samples/…`) · 비율 · 켬.
-- 2. 받은 사진은 보통 스냅샷과 같은 `companion.media` 행이다(charge 'sample' · cost 0 · complete) — 대화 · 앨범에 그대로 남는다.
--    엽전 예약 · 원장과 무관하다(엔진을 부르지 않는다). 인물마다 계정당 한 번. 스냅샷 행이라 그날의 하루 상한 · 시도 상한 집계에는
--    한 장으로 잡힌다(운영 값: 하루 상한 없음 · 시도 30 — 영향은 30번 중 한 번).
--    대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)은 받지 못한다. 요금제 · 잔액은 보지 않는다(엽전이 0이어도 받는다).
-- 3. 앱 RPC `companion_sample_snapshot_offer(p_character_id)` → { available } — 그 인물의 예시가 켜져 있고 이 계정이 스냅샷을 한 번도
--    만든 적이 없을 때만. `companion_claim_sample_snapshot(p_message_id)` → { result, media? }.
-- 4. Storage: 앱이 `companion-media/samples/…`를 읽고 서명할 수 있게 한다(자기 폴더 읽기 정책에 더함). 쓰기 · 지우기는 서버 키만.
--    계정 삭제는 `<user_id>/` 폴더만 지워 예시 파일은 남는다.
-- 예시 파일은 운영자가 Storage에 올리고 이 표에 한 줄 넣는다(마이그레이션이 올리지 않는다).

create table companion.media_samples (
  character_id text primary key references companion.characters (id),
  storage_path text not null check (storage_path ~ '^samples/[a-z0-9-]+\.(png|jpg|jpeg|webp)$'),
  aspect text not null default '3:2' check (aspect in ('3:2', '1:1')),
  mime text not null default 'image/png',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table companion.media_samples enable row level security;
revoke all on table companion.media_samples from public, anon, authenticated;
grant select, insert, update, delete on table companion.media_samples to service_role;

alter table companion.media drop constraint media_charge_check;
alter table companion.media add constraint media_charge_check
  check (charge in ('photo', 'photo_redraw', 'voice', 'sample'));
-- 인물마다 계정당 한 번.
create unique index media_sample_uniq on companion.media (user_id, character_id) where charge = 'sample';

do $storage$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists companion_media_sample_read on storage.objects';
    execute $policy$
      create policy companion_media_sample_read on storage.objects for select to authenticated
      using (bucket_id = 'companion-media' and (storage.foldername(name))[1] = 'samples')
    $policy$;
  end if;
end;
$storage$;

-- 이 계정에게 그 인물의 예시를 줄 수 있는가(내부). 예시가 켜져 있고, 스냅샷 행이 하나도 없다(만드는 중 · 실패 포함 — 눌러 본 사람).
create function companion.sample_snapshot_available(p_user_id uuid, p_character_id text)
returns boolean language sql stable as $$
  select exists (select 1 from companion.media_samples s where s.character_id = p_character_id and s.active)
    and not exists (select 1 from companion.media m where m.user_id = p_user_id and m.kind = 'snapshot')
$$;
revoke all on function companion.sample_snapshot_available(uuid, text) from public;

create function public.companion_sample_snapshot_offer(p_character_id text)
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
  return jsonb_build_object('available', companion.sample_snapshot_available(auth.uid(), p_character_id));
end;
$$;
revoke all on function public.companion_sample_snapshot_offer(text) from public, anon;
grant execute on function public.companion_sample_snapshot_offer(text) to authenticated;

-- 돌려주는 값: { result: 'ok' | 'already' | 'message_not_found' | 'forbidden' | 'not_eligible' | 'no_sample' | 'not_offered', media? }
create function public.companion_claim_sample_snapshot(p_message_id uuid)
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
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
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
  -- 대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)은 예시도 받지 못한다 — 메시지의 관문과 같은 두 조건만 본다. 요금제 · 잔액은
  -- 보지 않는다(값이 없는 사진이라 엽전이 0이어도 받는다).
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
  select * into v_sample from companion.media_samples where character_id = v_character and active;
  if not found then
    return jsonb_build_object('result', 'no_sample');
  end if;

  -- 지갑 잠금으로 같은 사람의 요청을 한 줄로 세운다(스냅샷 요청과 같은 잠금 — 두 번 눌러도 한 장).
  perform companion.lock_wallet(v_user);
  select * into v_media from companion.media
  where user_id = v_user and character_id = v_character and charge = 'sample';
  if found then
    return jsonb_build_object('result', 'already', 'media', companion.media_json(v_media));
  end if;
  if not companion.sample_snapshot_available(v_user, v_character) then
    return jsonb_build_object('result', 'not_offered');
  end if;

  insert into companion.media (
    user_id, character_id, conversation_id, message_id, kind, status, charge, cost,
    source, storage_path, mime, aspect, meta, finished_at
  ) values (
    v_user, v_character, v_msg.conversation_id, p_message_id, 'snapshot', 'complete', 'sample', 0,
    coalesce(v_msg.segments, '[]'::jsonb), v_sample.storage_path, v_sample.mime, v_sample.aspect,
    jsonb_build_object('aiGenerated', true, 'sample', true), now()
  ) returning * into v_media;
  return jsonb_build_object('result', 'ok', 'media', companion.media_json(v_media));
end;
$$;
revoke all on function public.companion_claim_sample_snapshot(uuid) from public, anon;
grant execute on function public.companion_claim_sample_snapshot(uuid) to authenticated;

-- 운영 조회(고아 파일): 예시 파일(`samples/…`)은 누가 받기 전에는 media 행이 없다 — 고아로 내놓지 않는다(지우면 모든 예시가 빈 사진이 된다).
create or replace function public.companion_media_orphans(p_limit integer)
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
        and o.name not like 'samples/%'
        and not exists (select 1 from companion.media m where m.storage_path = o.name)
      order by o.name limit $1
    ) x
  $q$ into v using greatest(1, least(coalesce(p_limit, 100), 1000));
  return v;
end;
$$;
revoke all on function public.companion_media_orphans(integer) from public, anon, authenticated;
grant execute on function public.companion_media_orphans(integer) to service_role;
