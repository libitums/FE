-- 선톡 푸시(ADR-0127의 서버 쪽, 사용자 결정 2026-11-22). 선톡이 저장되면 그 사람에게 알림을 보낸다 — 발송 · 대조군 · 미리보기 A/B는
-- Edge Function(`_shared/companion-proactive-push.ts`)이 하고, 여기는 스위치와 그 함수가 읽는 문 하나뿐이다.
-- 1. 출시 스위치 `settings.proactive_push`: off(아무도, 기본) · testers(시험 계정만) · on(모두). `friends_mode`와 같은 값이다.
-- 2. `companion_proactive_push_gate(p_user_id)` → { mode, tester, hasDevice }. 서버 역할만 부른다.

alter table companion.settings
  add column if not exists proactive_push text not null default 'off' check (proactive_push in ('off', 'testers', 'on'));

create function public.companion_proactive_push_gate(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mode', (select proactive_push from companion.settings),
    'tester', companion.is_tester(p_user_id),
    'hasDevice', exists (select 1 from public.push_devices d where d.user_id = p_user_id)
  )
$$;
revoke all on function public.companion_proactive_push_gate(uuid) from public, anon, authenticated;
grant execute on function public.companion_proactive_push_gate(uuid) to service_role;
