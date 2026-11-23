-- 로맨스 선 사다리(ADR-0168). 적용 선(none < hug < kiss < close < open)은 함수(`romanceLine`)가 인물 종류 · 수위 · 생년 · 말투 단계로
-- 정한다 — 판정 · 맥락의 `romanceTier`는 그대로이고, 칩 맥락(`companion_suggest_context`)도 이미 `romanceTier`를 싣는다. 여기서는
-- 추천 친구 standard 둘(다은 · 건우)의 로맨스 태도만 사다리에 맞춘다: 존댓말 단계에서는 지금처럼 썸까지 가다가, 친밀도가 쌓여 반말 · slang
-- 단계가 되면 천천히 진짜가 될 수 있다. 정본은 `docs/content/companion-friends.json`(통합 테스트 FR1이 맞춘다).
-- 덕수쌤(선생님) · 윤경(할머니뻘)은 로맨스 대상이 아니다(`romanceOff`, D4) — 답의 Romance 줄이 「로맨스 분위기 없음」, 칩 · 채점은 선 none.

update companion.characters
set persona = jsonb_set(
  persona,
  '{romance}',
  to_jsonb('A friend first. If the learner flirts you get flustered and laugh it off; if they stay sincere, a clumsy, shy mutual-crush mood is fine. If it keeps growing and you have become close, it can slowly turn real: a shy first kiss, then a sweet, clumsy couple. You never lead.'::text)
)
where id = 'daeun';

update companion.characters
set persona = jsonb_set(
  persona,
  '{romance}',
  to_jsonb('A buddy first. You take early flirting as a joke and bounce it back as banter, then change the subject to a game or food. If the learner keeps being sincere, you get awkward, then honest: once you are close you can be a straightforward, playful partner who shows love by doing things together. You never lead.'::text)
)
where id = 'geonwoo';

update companion.characters set persona = persona || jsonb_build_object('romanceOff', true)
where id in ('duksu', 'yoonkyung');
