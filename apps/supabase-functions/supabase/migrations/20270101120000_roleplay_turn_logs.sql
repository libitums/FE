-- 롤플레이 턴 로그(ADR-0161). 대본형 롤플레이의 말하기 시도마다 한 줄 — 들었는가 · 못 들은 까닭 · 넘겼는가 ·
-- 인식기가 낸 글자 · 판정. **녹음은 없다.** 기기 내장 음성 인식이 쓸 만한지, 서버 음성 인식 · 발음 평가를 어디에
-- 붙일지를 데이터로 보려는 것이다.
--
-- **앱은 표에 직접 닿지 않는다.** RLS를 켜고 정책 없이, 앱 역할의 표 권한도 걷는다 — 앱은 `log_roleplay_turns`만 부른다.
-- 운영자는 대시보드(service role)로 읽는다. 계정을 지우면 함께 지워진다.
-- 보관은 1년 — 지우는 함수는 여기, 매일 부르는 예약은 supabase/cron/roleplay-turn-logs-retention.sql(마이그레이션 아님).

create table public.roleplay_turn_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 한 판(끝까지 마쳤거나 중간에 나간 한 번)을 묶는 값이다. 서버가 묶음마다 새로 만든다.
  play_id uuid not null,
  episode_id text not null check (char_length(episode_id) between 1 and 64 and episode_id ~ '^[A-Za-z0-9._:-]+$'),
  -- scripted = 정해진 대사를 말하는 지금의 롤플레이. free는 자유 미션의 자리다(아직 보내는 곳이 없다).
  mode text not null check (mode in ('scripted', 'free')),
  turn_index smallint not null check (turn_index between 0 and 199),
  -- 그 턴 안에서 1부터 세는 기록 번호(다시 말하기 · 실패 뒤 넘김이 뒤 번호를 받는다).
  attempt smallint not null check (attempt between 1 and 200),
  outcome text not null check (outcome in ('heard', 'unavailable', 'skipped')),
  fail_reason text check (fail_reason in ('blocked', 'dictation-off', 'failed')),
  -- 빈 글자(듣고도 못 읽음)도 관측이다.
  recognized_text text check (char_length(recognized_text) <= 200),
  verdict text check (verdict in ('correct', 'incorrect')),
  hint_shown boolean not null,
  platform text not null check (platform in ('ios', 'android')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  app_build integer not null check (app_build >= 0),
  ui_language text not null check (ui_language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$'),
  os_version text check (char_length(os_version) between 1 and 32),
  created_at timestamptz not null default now(),
  -- 글자 · 판정은 들었을 때만, 까닭은 들을 수 없었을 때만 있다.
  constraint roleplay_turn_logs_heard_shape check (
    (outcome = 'heard' and recognized_text is not null and verdict is not null)
    or (outcome <> 'heard' and recognized_text is null and verdict is null)
  ),
  constraint roleplay_turn_logs_reason_shape check ((outcome = 'unavailable') = (fail_reason is not null))
);

-- 보관 삭제가 created_at으로 훑고, 빈도 제한이 사용자별 최근 줄을 센다.
create index roleplay_turn_logs_created_at_idx on public.roleplay_turn_logs (created_at);
create index roleplay_turn_logs_user_created_at_idx on public.roleplay_turn_logs (user_id, created_at desc);

alter table public.roleplay_turn_logs enable row level security;
revoke all on table public.roleplay_turn_logs from anon, authenticated;

-- 한 판의 기록을 한 번에 남긴다. 남긴 줄 수를 돌려준다.
-- p_batch = { episodeId, mode, platform, appVersion, appBuild, uiLanguage, osVersion?, turns: [ { turnIndex, attempt,
--   outcome, reason?, heard?, verdict?, hintShown } … ] }. 줄은 1 ~ 200개. 값이 하나라도 틀리면 묶음 전체가 실패한다.
-- 한 사용자가 1시간에 60판을 넘게 남기지 못한다 — 반복 전송을 막는다.
create function public.log_roleplay_turns(p_batch jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_play uuid := gen_random_uuid();
  v_turns jsonb;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_batch is null or jsonb_typeof(p_batch) <> 'object' then
    raise exception 'batch must be an object' using errcode = '22023';
  end if;
  v_turns := p_batch -> 'turns';
  if v_turns is null or jsonb_typeof(v_turns) <> 'array'
    or jsonb_array_length(v_turns) not between 1 and 200 then
    raise exception 'turns must be an array of 1 to 200 rows' using errcode = '22023';
  end if;
  if (
    select count(distinct play_id) from public.roleplay_turn_logs
    where user_id = v_user and created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'too many roleplay logs' using errcode = 'P0001';
  end if;

  insert into public.roleplay_turn_logs (
    user_id, play_id, episode_id, mode, turn_index, attempt, outcome, fail_reason, recognized_text, verdict,
    hint_shown, platform, app_version, app_build, ui_language, os_version
  )
  select
    v_user,
    v_play,
    p_batch ->> 'episodeId',
    p_batch ->> 'mode',
    (turn ->> 'turnIndex')::smallint,
    (turn ->> 'attempt')::smallint,
    turn ->> 'outcome',
    turn ->> 'reason',
    turn ->> 'heard',
    turn ->> 'verdict',
    (turn ->> 'hintShown')::boolean,
    p_batch ->> 'platform',
    p_batch ->> 'appVersion',
    (p_batch ->> 'appBuild')::integer,
    p_batch ->> 'uiLanguage',
    nullif(btrim(p_batch ->> 'osVersion'), '')
  from jsonb_array_elements(v_turns) as turn;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.log_roleplay_turns(jsonb) from public, anon;
grant execute on function public.log_roleplay_turns(jsonb) to authenticated;

-- 보관 1년 — 넘은 줄을 지우고 지운 수를 돌려준다. anon · authenticated는 부를 수 없다(예약 · service role만).
create function public.purge_roleplay_turn_logs() returns integer
  language sql set search_path = '' as $$
  with gone as (
    delete from public.roleplay_turn_logs
    where created_at < now() - interval '1 year'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_roleplay_turn_logs() from public, anon, authenticated;
