-- 사용자 피드백(ADR-0036). 설정의 「Send feedback」과 에피소드 끝 설문이 같은 표에 쌓인다. 계정을 지우면 함께 지워진다.
--
-- **앱은 표에 직접 닿지 않는다.** RLS를 켜고 정책 없이, 앱 역할의 표 권한도 걷는다 — 앱은 `submit_feedback`만 부른다.
-- 운영자는 대시보드(service role)로 읽는다.

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('general', 'episode')),
  rating smallint not null check (rating between 1 and 5),
  message text check (message is null or char_length(message) between 1 and 1000),
  -- 앱 버전 · 에피소드 ID 같은 맥락이다. 개인정보를 싣지 않는다.
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 2048),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;

-- 한 사용자가 1분에 5건을 넘게 보내지 못한다 — 실수로 여러 번 누르거나 반복 전송을 막는다.
create function public.submit_feedback(
  p_kind text,
  p_rating smallint,
  p_message text,
  p_context jsonb
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
  if (
    select count(*) from public.feedback
    where user_id = auth.uid() and created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'too many feedback submissions' using errcode = 'P0001';
  end if;
  insert into public.feedback (user_id, kind, rating, message, context)
  values (auth.uid(), p_kind, p_rating, nullif(btrim(p_message), ''), coalesce(p_context, '{}'::jsonb));
end;
$$;

revoke all on function public.submit_feedback(text, smallint, text, jsonb) from public, anon;
grant execute on function public.submit_feedback(text, smallint, text, jsonb) to authenticated;
