-- 웹 체험판 인식 글자 수집(ADR-0083 D19). 랜딩 체험판이 말하기 판정 뒤 공개 키(anon)로 PostgREST insert만 한다.
-- 녹음은 없고 인식기가 낸 글자만 남긴다. 사용자 식별 정보 · IP · User-Agent 원문 열은 없다.
-- session_id는 체험을 열 때마다 브라우저 메모리에서 만든 무작위 UUID다(저장소 · 쿠키에 두지 않는다).
-- 보관은 90일 — 지우는 함수는 여기, 매일 부르는 예약은 supabase/cron/trial-speech-samples-retention.sql(마이그레이션 아님).
-- 운영자는 service role(대시보드)로만 읽는다.

-- 대안 배열 검사 — 1 ~ 3개, 원소는 null 없이 1 ~ 200자. check 제약은 하위 질의를 못 쓰므로 함수로 둔다.
create function public.trial_speech_alternatives_ok(value text[]) returns boolean
  language sql immutable set search_path = '' as $$
  select coalesce(cardinality(value) between 1 and 3, false)
    and coalesce(
      (select bool_and(item is not null and char_length(item) between 1 and 200) from unnest(value) as item),
      false
    )
$$;

create table public.trial_speech_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  episode_version text not null check (char_length(episode_version) between 1 and 40),
  turn_index smallint not null check (turn_index between 0 and 9),
  expected text not null check (char_length(expected) between 1 and 200),
  alternatives text[] not null check (public.trial_speech_alternatives_ok(alternatives)),
  outcome text not null check (outcome in ('strict', 'lenient', 'incorrect')),
  similarity real not null check (similarity >= 0 and similarity <= 1),
  browser text not null check (browser in ('ios-safari', 'android-chrome', 'in-app', 'desktop', 'other')),
  locale text not null check (locale in ('en', 'ko')),
  created_at timestamptz not null default now()
);

-- 보관 삭제가 created_at으로 훑는다.
create index trial_speech_samples_created_at_idx on public.trial_speech_samples (created_at);

alter table public.trial_speech_samples enable row level security;
revoke all on table public.trial_speech_samples from anon, authenticated;
grant insert (session_id, episode_version, turn_index, expected, alternatives, outcome, similarity, browser, locale)
  on table public.trial_speech_samples to anon;
create policy trial_speech_samples_anon_insert on public.trial_speech_samples
  for insert to anon with check (outcome in ('strict', 'lenient', 'incorrect'));

-- 보관 90일 — 넘은 행을 지우고 지운 수를 돌려준다. anon · authenticated는 부를 수 없다(예약 · service role만).
create function public.purge_trial_speech_samples() returns integer
  language sql set search_path = '' as $$
  with gone as (
    delete from public.trial_speech_samples
    where created_at < now() - interval '90 days'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_trial_speech_samples() from public, anon, authenticated;
