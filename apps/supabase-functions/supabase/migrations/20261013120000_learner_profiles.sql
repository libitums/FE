-- 학습자 프로필: 레슨 문장에 들어가는 이름과 나라(ADR-0035와 같은 틀의 셋째 표). 계정에 묶여 기기를 바꿔도 이어지고,
-- 계정을 지우면 함께 지워진다(CASCADE).
--
-- **앱은 표에 직접 닿지 않는다.** RLS를 켜고 정책 없이 두며 앱 역할의 표 권한도 걷는다 — 앱은 아래 RPC 둘만 부른다.
-- **이름과 나라는 개인정보다 — 분석 · 로그에 남기지 않는다.**
-- 이름과 나라는 둘 다 있어야 저장된다(프로필이 없으면 행이 없다). 나라는 형식(대문자 두 글자)만 보고 목록은 모른다 —
-- 목록은 앱 릴리스와 함께 바뀌는 표시 데이터라, 모르는 코드는 그 사용자 자신의 행에만 영향을 준다.

create table public.learner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 1 ~ 30 코드 포인트. 앞뒤 공백 없음. 중괄호(치환 틀과 겹침) · 제어 문자 · 줄 구분자 없음. 한글 · 라틴 · 악센트는 받는다.
  name text not null check (
    char_length(name) between 1 and 30
    and name = btrim(name)
    and name !~ '[{}\u0001-\u001F\u007F-\u009F  ]'
  ),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;
revoke all on table public.learner_profiles from anon, authenticated;

-- 행이 없으면 null.
create function public.load_learner_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', name, 'countryCode', country_code)
  from public.learner_profiles
  where user_id = auth.uid();
$$;

-- 이름은 공백(스페이스 · 탭) 연속을 한 칸으로, 앞뒤 공백을 걷어 저장한다. 두 열을 통째로 덮어쓴다.
create function public.save_learner_profile(p_name text, p_country_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  v_name := nullif(btrim(regexp_replace(coalesce(p_name, ''), '[ \t]+', ' ', 'g')), '');
  if v_name is null
    or p_country_code is null
    or char_length(v_name) > 30
    or v_name ~ '[{}\u0001-\u001F\u007F-\u009F  ]'
    or p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'invalid learner profile' using errcode = '22023';
  end if;
  insert into public.learner_profiles (user_id, name, country_code, updated_at)
  values (auth.uid(), v_name, p_country_code, now())
  on conflict (user_id) do update
    set name = excluded.name, country_code = excluded.country_code, updated_at = now();
end;
$$;

revoke all on function public.load_learner_profile() from public, anon;
revoke all on function public.save_learner_profile(text, text) from public, anon;
grant execute on function public.load_learner_profile() to authenticated;
grant execute on function public.save_learner_profile(text, text) to authenticated;
