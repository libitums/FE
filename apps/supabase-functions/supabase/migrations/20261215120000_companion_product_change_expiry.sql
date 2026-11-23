-- 곧바로 올림 뒤 옛 줄이 남던 문제(ADR-0144, 2026-11-19 07:53 운영 실측) — Unlimited Tickets → Premium 올림은 스토어가 곧바로 바꾸지만
-- PRODUCT_CHANGE를 pending으로만 적어, 옛 Tickets 줄이 원래 만료(07:58:45)까지 활성 · pending=Premium으로 남았다. RevenueCat의
-- PRODUCT_CHANGE는 옛 상품의 만료(expiration_at_ms)를 싣는다: 곧바로 바뀌는 올림 · 같은 수준 바꿈은 바뀐 시각(07:53:45 · 07:23:45 ·
-- 00:58:19 …), 미뤄진 내림은 기간 끝(07:28:45 · 07:58:38). 그 값으로 줄의 만료를 앞당기기만 한다 — 바뀐 곳은 product_change의
-- expires_at 한 줄이다. 운영 정의(2026-11-19 prosrc 해시)와 20261129120000_subscriptions.sql이 같음을 확인하고 고쳤다.

create or replace function public.companion_apply_store_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := p_event->>'id';
  v_action text := p_event->>'action';
  v_event_at timestamptz := coalesce((p_event->>'eventAt')::timestamptz, now());
  v_expires timestamptz := (p_event->>'expiresAt')::timestamptz;
  v_user uuid;
  v_candidate text;
  v_product companion.store_products;
  v_row companion.plan_entitlements;
  v_outcome text;
  v_to uuid;
  v_ref text;
begin
  if v_id is null or v_action is null then
    raise exception 'invalid store event' using errcode = '22023';
  end if;
  insert into companion.store_events (id, type, action, app_user_id, environment, product_id, event_at, payload)
  values (v_id, coalesce(p_event->>'type', ''), v_action, p_event->'userIds'->>0,
    coalesce(p_event->>'environment', 'production'), p_event->>'productId', v_event_at, p_event)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('outcome', 'duplicate', 'userId', null);
  end if;

  for v_candidate in select jsonb_array_elements_text(coalesce(p_event->'userIds', '[]'::jsonb)) loop
    if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into v_user from auth.users where id = v_candidate::uuid;
      exit when v_user is not null;
    end if;
  end loop;

  if v_action = 'record' then
    v_outcome := 'recorded';
  elsif v_action = 'transfer' then
    for v_candidate in select jsonb_array_elements_text(coalesce(p_event->'transferredTo', '[]'::jsonb)) loop
      if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_to from auth.users where id = v_candidate::uuid;
        exit when v_to is not null;
      end if;
    end loop;
    if v_to is null then
      v_outcome := 'unknown_user';
    else
      for v_row in
        select * from companion.plan_entitlements
        -- uuid 꼴만 골라 uuid로 견줍니다 — 열을 text로 바꾸면 기본 키 색인을 못 탑니다(리뷰 #434).
        where user_id in (
          select element::uuid
          from jsonb_array_elements_text(coalesce(p_event->'transferredFrom', '[]'::jsonb)) as element
          where element ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
          and user_id <> v_to
      loop
        insert into companion.plan_entitlements as t (user_id, entitlement, product_id, store, environment, status, will_renew,
          period_started_at, expires_at, pending_product_id, source_event_id, last_event_at)
        values (v_to, v_row.entitlement, v_row.product_id, v_row.store, v_row.environment, v_row.status, v_row.will_renew,
          v_row.period_started_at, v_row.expires_at, v_row.pending_product_id, v_id, greatest(v_row.last_event_at, v_event_at))
        on conflict (user_id, entitlement) do update set
          product_id = excluded.product_id, store = excluded.store, status = excluded.status, will_renew = excluded.will_renew,
          period_started_at = excluded.period_started_at, expires_at = excluded.expires_at, source_event_id = v_id,
          last_event_at = excluded.last_event_at, updated_at = now()
        where t.expires_at is not null and (excluded.expires_at is null or excluded.expires_at > t.expires_at);
        delete from companion.plan_entitlements where user_id = v_row.user_id and entitlement = v_row.entitlement;
      end loop;
      v_user := v_to;
      v_outcome := 'transferred';
    end if;
  elsif v_user is null then
    v_outcome := 'unknown_user';
  else
    select * into v_product from companion.store_products
    where product_id = p_event->>'productId' or product_id = split_part(p_event->>'productId', ':', 1)
    order by (product_id = p_event->>'productId') desc limit 1;
    v_ref := 'rc:' || coalesce(p_event->>'transactionId', v_id);
    if v_product.product_id is null then
      v_outcome := 'unknown_product';
    elsif v_product.kind = 'coins' then
      if v_action = 'coins' then
        v_outcome := case when public.companion_grant_credits(v_user, 'paid', v_product.coins + v_product.bonus_coins,
          'purchase', v_ref, null) then 'coins_granted' else 'coins_duplicate' end;
      elsif v_action = 'refund' then
        v_outcome := case when exists (
            select 1 from companion.credit_ledger where kind = 'revoke' and reason = 'refund' and ref_id = v_ref
          ) then 'coins_duplicate'
          when companion.revoke_coins(v_user, v_product.coins + v_product.bonus_coins, v_ref) then 'coins_revoked'
          else 'refund_unrecovered' end;
      else
        v_outcome := 'unknown_product';
      end if;
    elsif v_action not in ('activate', 'uncancel', 'cancel', 'refund', 'billing_issue', 'expire', 'product_change') then
      v_outcome := 'unknown_product';
    else
      select * into v_row from companion.plan_entitlements where user_id = v_user and entitlement = v_product.plan_id for update;
      if found and v_row.last_event_at > v_event_at then
        v_outcome := 'stale';
      elsif v_action = 'activate' then
        insert into companion.plan_entitlements as t (user_id, entitlement, product_id, store, environment, status, will_renew,
          period_started_at, expires_at, source_event_id, last_event_at)
        values (v_user, v_product.plan_id, v_product.product_id, p_event->>'store', coalesce(p_event->>'environment', 'production'),
          'active', true, coalesce((p_event->>'purchasedAt')::timestamptz, v_event_at), v_expires, v_id, v_event_at)
        on conflict (user_id, entitlement) do update set
          product_id = excluded.product_id, store = excluded.store, environment = excluded.environment, status = 'active',
          will_renew = true, period_started_at = excluded.period_started_at, expires_at = excluded.expires_at,
          pending_product_id = null, source_event_id = v_id, last_event_at = v_event_at, updated_at = now();
        perform companion.grant_plan_coins(v_user, now());
        v_outcome := 'activated';
      elsif not found then
        v_outcome := 'unknown_entitlement';
      else
        update companion.plan_entitlements set
          status = case v_action
            when 'uncancel' then 'active' when 'cancel' then 'cancelled' when 'refund' then 'revoked'
            when 'billing_issue' then 'billing_issue' when 'expire' then 'expired' else status end,
          will_renew = case v_action when 'uncancel' then true when 'cancel' then false when 'refund' then false
            when 'expire' then false else will_renew end,
          expires_at = case v_action
            when 'refund' then least(coalesce(expires_at, v_event_at), v_event_at)
            when 'billing_issue' then coalesce((p_event->>'graceExpiresAt')::timestamptz, expires_at)
            when 'expire' then least(coalesce(expires_at, v_expires, v_event_at), coalesce(v_expires, v_event_at))
            -- 옛 상품의 만료 — 곧바로 바뀌는 올림 · 같은 수준 바꿈은 바뀐 시각으로 앞당겨 오고, 미뤄진 내림은 기간 끝 그대로 온다.
            -- 앞당기기만 한다(늘리지 않음). 없으면 그대로.
            when 'product_change' then least(expires_at, coalesce(v_expires, expires_at))
            else expires_at end,
          pending_product_id = case when v_action = 'product_change' then p_event->>'newProductId' else pending_product_id end,
          source_event_id = v_id, last_event_at = v_event_at, updated_at = now()
        where user_id = v_user and entitlement = v_product.plan_id;
        v_outcome := case v_action
          when 'uncancel' then 'uncancelled' when 'cancel' then 'cancelled' when 'refund' then 'revoked'
          when 'billing_issue' then 'billing_issue' when 'expire' then 'expired' else 'product_change_recorded' end;
      end if;
    end if;
  end if;

  update companion.store_events set outcome = v_outcome, user_id = v_user where id = v_id;
  return jsonb_build_object('outcome', v_outcome, 'userId', v_user);
end;
$$;

revoke all on function public.companion_apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function public.companion_apply_store_event(jsonb) to service_role;
