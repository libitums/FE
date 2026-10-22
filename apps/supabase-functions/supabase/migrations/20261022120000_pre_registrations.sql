-- 웹 체험판(`/try/`) 완료 화면의 이메일 사전 등록(랜딩 ADR-0081 r2). 출시 소식만 보낸다 — 계정과 무관하다.
--
-- **랜딩은 공개 키(anon)로 PostgREST insert만 한다.** RLS를 켜고 anon에 insert 정책 하나, 표 권한은 세 열의 insert뿐 —
-- 읽기 · 고치기 · 지우기 · id · created_at 지정은 권한 오류다. authenticated(앱 사용자)는 표에 닿지 않는다.
-- 운영자는 대시보드(service role)로 읽는다.
-- **email은 개인정보다 — 분석 · 로그에 남기지 않는다.** 같은 email(대소문자 · 앞뒤 공백 무시)은 한 번만 —
-- 고유 충돌(23505)은 PostgREST가 409로 내고, 랜딩은 그것도 완료로 보인다(등록 여부를 남에게 알리지 않음).

create table public.pre_registrations (
  id bigint generated always as identity primary key,
  -- 소문자 · 앞뒤 공백 없음(아래 트리거가 맞춘다). 공백 · @ 없는 앞, @, 점 하나 이상, 끝 두 글자 이상 · 254자 이하.
  email text not null check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
  ),
  locale text not null check (locale in ('en', 'ko')),
  source text not null default 'web-trial' check (source in ('web-trial')),
  created_at timestamptz not null default now(),
  constraint pre_registrations_email_key unique (email)
);

-- insert 앞에서 소문자 · 앞뒤 공백을 맞춘다 — 클라이언트도 하지만 정본은 DB다.
create function public.normalize_pre_registration_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger pre_registrations_normalize_email
  before insert on public.pre_registrations
  for each row execute function public.normalize_pre_registration_email();

revoke all on function public.normalize_pre_registration_email() from public, anon, authenticated;

alter table public.pre_registrations enable row level security;
revoke all on table public.pre_registrations from anon, authenticated;
grant insert (email, locale, source) on table public.pre_registrations to anon;

create policy pre_registrations_anon_insert
  on public.pre_registrations
  for insert
  to anon
  with check (source = 'web-trial');
