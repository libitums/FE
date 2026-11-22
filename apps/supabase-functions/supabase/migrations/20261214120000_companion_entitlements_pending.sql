-- 내 권한에 미뤄진 바꿈을 싣는다(ADR-0144) — 스토어는 내림 · 같은 수준 바꿈을 지금 기간 끝으로 미루고, 웹훅(PRODUCT_CHANGE)이
-- 그 줄의 pending_product_id에 다음 상품을 적는다. 앱은 이것을 몰라 2026-11-19 샌드박스에서 Premium → Unlimited Tickets 내림 뒤
-- 「언제 바뀌는지」를 보이지 못했다. 줄마다 `pendingProductId`(없으면 null)를 더할 뿐 다른 키 · 거르기 · 권한은 그대로다 —
-- 옛 앱은 모르는 키를 무시한다. 운영 정의(2026-11-19 pg_get_functiondef)와 20261129120000_subscriptions.sql이 같음을 확인하고 고쳤다.

create or replace function public.companion_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'tier', companion.tier_of(v_user, now()),
    'unlimitedTickets', companion.has_unlimited_tickets(v_user, now()),
    'entitlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entitlement, 'productId', product_id, 'store', store, 'status', status, 'willRenew', will_renew,
        'expiresAt', expires_at, 'pendingProductId', pending_product_id) order by entitlement)
      from companion.plan_entitlements
      where user_id = v_user and companion.plan_active(status, expires_at, now())
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.companion_entitlements() from public, anon;
grant execute on function public.companion_entitlements() to authenticated;
