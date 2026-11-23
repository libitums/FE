-- 스냅샷 v2m(ADR-0179): 장면 설계(플랜) + 미리 합친 기준 그림. 시작 RPC(`companion_media_begin`)는 그대로 두고, Edge Function이
-- v2m으로 그릴 때만 부르는 작은 서버용 함수를 더한다.
--
-- 1. `companion_snapshot_v2_context(user, character)` — 시험 계정 여부(`COMPANION_SNAPSHOT_PIPELINE=v2m-test`) + 이 유저 × 인물의
--    최근 v2m 계획 6개(다양성 — 같은 구도 · 각도 · 표정 · 장소를 되풀이하지 않게). 계획은 `companion.media.prompt`에 이미 남는다.
-- 2. 새 옷 후보: 장면 설계가 옷장에 없는 옷을 고르면 그 사진은 글로만 그리고, 후보는 여기에 기록만 한다. 운영 대시보드가 이틀에 한 번
--    새벽에 모아 의상 그림을 그리고(사람이 채택), 채택된 옷은 다음 묶음에 들어간다. 대화 글이나 유저 id는 남기지 않는다(옷 설명뿐).

create table if not exists companion.snapshot_outfit_candidates (
  id bigint generated always as identity primary key,
  character_id text not null,
  name text,
  description text not null check (char_length(description) between 1 and 300),
  outfit_change text not null check (outfit_change in ('weather', 'activity', 'occasion', 'home', 'work')),
  media_id uuid references companion.media (id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  result text check (result is null or char_length(result) <= 200)
);
create index if not exists snapshot_outfit_candidates_pending
  on companion.snapshot_outfit_candidates (created_at) where processed_at is null;
alter table companion.snapshot_outfit_candidates enable row level security;
-- 정책 없음: 서버 키(service_role)만 읽고 쓴다.

create or replace function public.companion_snapshot_v2_context(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tester', coalesce((
      select u.raw_app_meta_data->>'duru_tester' = 'true' from auth.users u where u.id = p_user_id
    ), false),
    'recent', coalesce((
      select jsonb_agg(r.prompt order by r.created_at desc)
      from (
        select m.prompt, m.created_at from companion.media m
        where m.user_id = p_user_id and m.character_id = p_character_id and m.kind = 'snapshot'
          and m.status = 'complete' and m.prompt->>'pipeline' = 'v2m'
        order by m.created_at desc
        limit 6
      ) r
    ), '[]'::jsonb)
  )
$$;

create or replace function public.companion_snapshot_outfit_candidate(
  p_character_id text, p_name text, p_description text, p_outfit_change text, p_media_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into companion.snapshot_outfit_candidates (character_id, name, description, outfit_change, media_id)
  select p_character_id, left(nullif(trim(p_name), ''), 40), left(trim(p_description), 300), p_outfit_change, p_media_id
  where nullif(trim(p_description), '') is not null
    and p_outfit_change in ('weather', 'activity', 'occasion', 'home', 'work')
$$;

-- 운영 대시보드 크론(이틀에 한 번 새벽): 아직 처리하지 않은 후보를 오래된 것부터 · 처리했다고 표시.
create or replace function public.companion_snapshot_outfit_candidates_pending(p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'characterId', c.character_id, 'name', c.name, 'description', c.description,
    'outfitChange', c.outfit_change, 'createdAt', c.created_at
  ) order by c.created_at), '[]'::jsonb)
  from (
    select * from companion.snapshot_outfit_candidates
    where processed_at is null
    order by created_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) c
$$;

create or replace function public.companion_snapshot_outfit_candidates_mark(p_ids bigint[], p_result text)
returns integer
language sql
security definer
set search_path = ''
as $$
  with done as (
    update companion.snapshot_outfit_candidates
    set processed_at = now(), result = left(p_result, 200)
    where id = any (p_ids) and processed_at is null
    returning 1
  )
  select count(*)::integer from done
$$;

revoke all on function public.companion_snapshot_v2_context(uuid, text) from public, anon, authenticated;
revoke all on function public.companion_snapshot_outfit_candidate(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.companion_snapshot_outfit_candidates_pending(integer) from public, anon, authenticated;
revoke all on function public.companion_snapshot_outfit_candidates_mark(bigint[], text) from public, anon, authenticated;
grant execute on function public.companion_snapshot_v2_context(uuid, text) to service_role;
grant execute on function public.companion_snapshot_outfit_candidate(text, text, text, text, uuid) to service_role;
grant execute on function public.companion_snapshot_outfit_candidates_pending(integer) to service_role;
grant execute on function public.companion_snapshot_outfit_candidates_mark(bigint[], text) to service_role;
