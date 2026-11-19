-- 엽전 먼저 만나기(ADR-0162 D5) — 아직 이야기에서 못 만난 인물을 엽전으로 먼저 연다. 서버는 해금을 판정하지 않으므로
-- 이 RPC는 「값을 치렀다」는 기록과 차감만 맡고, 방 열기 · 첫 인사는 지금처럼 앱이 한다(companion-greet trigger unlock).
-- 제안 원본 docs/specs/suggested-friends-early-access.sql에서 옮김 — 원장 kind 검사에 운영의 'revoke'를 남긴다(2026-11-19).
-- 사용자 결정 2026-11-19: 이야기 인물 넷(정윤경 · 미나 · 한도윤 · 서재민) 모두 100엽전, 마감 없음.

create table companion.early_access_offers (
  character_id text primary key references companion.characters (id) on delete cascade,
  price integer not null check (price between 1 and 100000),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table companion.early_access_offers enable row level security;

create table companion.early_access_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id) on delete cascade,
  price integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, character_id)
);
alter table companion.early_access_unlocks enable row level security;

alter table companion.credit_ledger drop constraint credit_ledger_kind_check;
alter table companion.credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('grant', 'reserve', 'settle', 'release', 'expire', 'revoke', 'spend'));

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

-- 제안 목록(앱 카탈로그가 earlyAccess를 채울 곳). 끝 시각은 있을 때만 — 앱은 없으면 「LIMITED」만 보인다.
create or replace function public.companion_early_access_offers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('characterId', o.character_id, 'price', o.price, 'endsAt', o.ends_at)), '[]'::jsonb)
  from companion.early_access_offers o
  where o.active and (o.ends_at is null or o.ends_at > now());
$$;
revoke all on function public.companion_early_access_offers() from public, anon;
grant execute on function public.companion_early_access_offers() to authenticated;

insert into companion.early_access_offers (character_id, price, ends_at)
values ('yoonkyung', 100, null), ('mina', 100, null), ('doyun', 100, null), ('jaemin', 100, null)
on conflict (character_id) do nothing;
