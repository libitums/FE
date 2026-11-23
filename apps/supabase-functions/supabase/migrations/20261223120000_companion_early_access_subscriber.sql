-- 구독자는 이야기 인물을 모두 연다(사용자 결정 2026-11-22) — 요금제 카드의 「Chat with every character」가 약속한 것.
-- 서버는 해금을 판정하지 않으므로(20261213) 여기서 맡는 것은 「먼저 만나기」 길뿐이다: 이미 나간 앱(iOS 1.2.0)은 못 만난 이야기
-- 인물에 엽전 100 단추를 그리는데, 「모든 인물」 요금제(`companion.plans.all_characters` — Chat Plus · Premium)가 살아 있는
-- 사람이 그 단추를 누르면 엽전을 빼지 않고 연다. 새 앱은 구독자에게 그 단추 대신 「Start chatting」을 그려 이 RPC를 부르지 않는다.
-- 구독이 끝난 뒤에도 이미 연 인물은 그대로다(앱이 방을 열어 둠 — 되잠그지 않는다).

create function companion.has_all_characters(p_user_id uuid, p_now timestamptz)
returns boolean language sql stable as $$
  select exists (
    select 1 from companion.plan_entitlements e
    join companion.plans p on p.id = e.entitlement
    where e.user_id = p_user_id and p.all_characters and companion.plan_active(e.status, e.expires_at, p_now)
  )
$$;
revoke all on function companion.has_all_characters(uuid, timestamptz) from public;

-- 값 0 기록을 받게 한다(구독자).
alter table companion.early_access_unlocks add constraint early_access_unlocks_price_check check (price >= 0);

-- 돌려주는 값: { result: 'unlocked' | 'already' | 'short' | 'no_offer', shortBy?, wallet }
create or replace function public.companion_unlock_early(p_character_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_offer companion.early_access_offers;
  v_wallet companion.credit_wallets;
  v_left integer;
  v_take integer;
  v_bucket text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into v_offer from companion.early_access_offers
  where character_id = p_character_id and active and (ends_at is null or ends_at > now());
  if v_offer.character_id is null then
    return jsonb_build_object('result', 'no_offer');
  end if;
  -- 지갑을 먼저 잠근다 — 같은 사람이 두 번 눌러도 둘째는 첫째가 끝난 뒤 「already」를 본다.
  perform companion.lock_wallet(v_user);
  if exists (select 1 from companion.early_access_unlocks where user_id = v_user and character_id = p_character_id) then
    return jsonb_build_object('result', 'already', 'wallet', companion.wallet_json(v_user, now()));
  end if;

  -- 구독자(「모든 인물」 요금제): 값을 치르지 않고 연다. 기록의 값은 0 — 원장에는 아무것도 남기지 않는다.
  if companion.has_all_characters(v_user, now()) then
    insert into companion.early_access_unlocks (user_id, character_id, price) values (v_user, p_character_id, 0);
    return jsonb_build_object('result', 'unlocked', 'wallet', companion.wallet_json(v_user, now()));
  end if;

  select * into v_wallet from companion.credit_wallets where user_id = v_user;
  if coalesce(v_wallet.sub_balance, 0) + coalesce(v_wallet.grant_balance, 0) + coalesce(v_wallet.paid_balance, 0) < v_offer.price then
    return jsonb_build_object(
      'result', 'short',
      'shortBy', v_offer.price - (coalesce(v_wallet.sub_balance, 0) + coalesce(v_wallet.grant_balance, 0) + coalesce(v_wallet.paid_balance, 0)),
      'wallet', companion.wallet_json(v_user, now())
    );
  end if;

  -- 턴 예약과 같은 순서로 뺀다: 구독분 → 지급분 → 구매분.
  v_left := v_offer.price;
  foreach v_bucket in array array['sub', 'grant', 'paid'] loop
    exit when v_left = 0;
    execute format('select least(%I, $1) from companion.credit_wallets where user_id = $2', v_bucket || '_balance')
      into v_take using v_left, v_user;
    if v_take > 0 then
      execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_take, v_user;
      insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
      values (v_user, -v_take, v_bucket, 'spend', 'early_access', v_user::text || ':' || p_character_id);
      v_left := v_left - v_take;
    end if;
  end loop;

  insert into companion.early_access_unlocks (user_id, character_id, price) values (v_user, p_character_id, v_offer.price);
  return jsonb_build_object('result', 'unlocked', 'wallet', companion.wallet_json(v_user, now()));
end;
$$;
revoke all on function public.companion_unlock_early(text) from public, anon;
grant execute on function public.companion_unlock_early(text) to authenticated;
