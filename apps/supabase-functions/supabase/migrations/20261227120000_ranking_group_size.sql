-- 주간 순위 그룹을 작게(사용자 결정 2026-11-22, ADR-0170 D13): 목표 25명 · 상한 30명 → 목표 15명 · 상한 18명.
-- 첫 주(2026-11-16, 1,578명) 실측: 바로 위 사람과는 평균 0.42레슨(94%가 1레슨 안)인데 3위까지는 중앙값 4레슨 · 상위 10%는 7레슨.
-- 그룹이 작아지면 3위 문턱이 낮아져 「조금만 하면 3위 안」이 된다. 이미 배정된 그룹은 그대로이고, 다음 배정부터 새 크기로 찬다.

alter table ranking.settings alter column group_target set default 15;
alter table ranking.settings alter column group_max set default 18;
-- 운영자가 바꾸지 않은 기본값일 때만 내린다.
update ranking.settings set group_target = 15, group_max = 18 where group_target = 25 and group_max = 30;
