-- 20270115(ADR-0178 D7 개정 · ADR-0208): 친구 스토리 알림의 「하루 한 번」이 학습 자동 캠페인 발송을 세지 않게 한다(사용자 결정 A, 2026-11-27).
-- 자동 학습 푸시 빈도 실험(안 보냄 · 하루 1번 · 하루 2번)이 스토리 알림을 칸마다 다르게 막으면 두 실험이 서로를 오염시킨다.
-- - 빼는 것: 묶음 이름이 「자동 · 」(앞선 자동 캠페인, ADR-0130 D12) 또는 「빈도 · 」(빈도 실험, ADR-0208)로 시작하는 줄만.
--   이름은 Edge Function의 `seriesOf` · `frequencySeriesOf`(`_shared/push-campaign-text.ts`)와 같아야 한다 — 통합 테스트 FS18d가 그 함수로 줄을 만든다.
-- - 그대로 세는 것: 선톡 · 스토리 · 스토리 시험 · 스토리 반응, 그리고 그 밖의 모든 묶음(사람이 보내는 캠페인이 이 표에 남으면 그것도).
-- - `companion.pushed_today`와 선톡 푸시 문(`companion_proactive_push_gate`) · 반응 푸시 문은 바꾸지 않는다.

-- 학습 자동 캠페인의 묶음인가 — 스토리 알림의 하루 한 번 셈에서 뺀다.
create function companion.is_learning_campaign_series(p_series text)
returns boolean language sql immutable as $$
  select p_series like '자동 · %' or p_series like '빈도 · %'
$$;
revoke all on function companion.is_learning_campaign_series(text) from public;

-- 스토리 알림이 보는 「오늘(현지) 받은 알림」 — `companion.pushed_today(…, null)`과 같되 학습 자동 캠페인 줄은 세지 않는다.
create function companion.story_pushed_today(p_user_id uuid, p_now timestamptz)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.push_campaign_sends s
    where s.user_id = p_user_id and (s."group" = 'sent' or s.series in ('스토리', '스토리 시험'))
      and not companion.is_learning_campaign_series(s.series)
      and s.run_at >= (
        date_trunc('day', p_now at time zone coalesce(companion.user_timezone(p_user_id), 'UTC'))
          at time zone coalesce(companion.user_timezone(p_user_id), 'UTC')
      )
  )
$$;
revoke all on function companion.story_pushed_today(uuid, timestamptz) from public;

-- 알림 후보가 그 셈을 쓰게 한다. 함수 본문의 그 한 줄만 바꾼다(다른 조건은 운영 정의 그대로).
do $$
declare
  v_def text := pg_get_functiondef('public.companion_story_push_candidates(timestamptz,integer)'::regprocedure);
  v_old text := 'not companion.pushed_today(pr.user_id, p_now)';
  v_new text := 'not companion.story_pushed_today(pr.user_id, p_now)';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'companion_story_push_candidates: pushed_today call not found';
  end if;
  execute replace(v_def, v_old, v_new);
end $$;
