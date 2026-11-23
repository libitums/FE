-- 학습 티켓을 엽전으로 사기(사용자 결정 2026-11-23): 「Get more tickets」 한 번 = 티켓 1장 = 엽전 20(설정 `ticket_price`).
-- 하루 한 장 무료 지급은 없앤다(앱). 서버는 엽전만 뺀다 — 티켓 원장은 앱(기기)이 들고 진행 스냅숏으로 합친다(learning-tickets).
-- 요청 id(앱이 누를 때마다 새로 만듦)로 한 번만 뺀다 — 응답을 잃어 다시 보내도 두 번 빠지지 않는다.

alter table companion.settings add column if not exists ticket_price integer not null default 20
  check (ticket_price > 0);

create or replace function public.companion_buy_ticket(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := auth.uid();
  v_price integer;
  v_ref text := p_request_id::text;
  v_wallet companion.credit_wallets;
  v_have integer;
  v_left integer;
  v_take integer;
  v_bucket text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_request_id is null then
    raise exception 'request id required' using errcode = '22004';
  end if;
  select ticket_price into v_price from companion.settings;

  -- 지갑을 먼저 잠근다 — 같은 요청이 겹쳐 와도 둘째는 첫째가 끝난 뒤 「already」를 본다.
  perform companion.lock_wallet(v_user);
  if exists (
    select 1 from companion.credit_ledger
    where user_id = v_user and kind = 'spend' and reason = 'ticket' and ref_id = v_ref
  ) then
    return jsonb_build_object('result', 'already', 'price', v_price,
      'wallet', companion.wallet_json(v_user, now()));
  end if;

  select * into v_wallet from companion.credit_wallets where user_id = v_user;
  v_have := coalesce(v_wallet.sub_balance, 0) + coalesce(v_wallet.grant_balance, 0)
    + coalesce(v_wallet.paid_balance, 0);
  if v_have < v_price then
    return jsonb_build_object('result', 'short', 'price', v_price, 'shortBy', v_price - v_have,
      'wallet', companion.wallet_json(v_user, now()));
  end if;

  -- 턴 예약 · 먼저 만나기와 같은 순서로 뺀다: 구독분 → 지급분 → 구매분.
  v_left := v_price;
  foreach v_bucket in array array['sub', 'grant', 'paid'] loop
    exit when v_left = 0;
    execute format('select least(%I, $1) from companion.credit_wallets where user_id = $2', v_bucket || '_balance')
      into v_take using v_left, v_user;
    if v_take > 0 then
      execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_take, v_user;
      insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
      values (v_user, -v_take, v_bucket, 'spend', 'ticket', v_ref);
      v_left := v_left - v_take;
    end if;
  end loop;

  return jsonb_build_object('result', 'bought', 'price', v_price,
    'wallet', companion.wallet_json(v_user, now()));
end;
$$;

revoke all on function public.companion_buy_ticket(uuid) from public, anon;
grant execute on function public.companion_buy_ticket(uuid) to authenticated;
