-- 스냅샷 엔진을 `gpt-image-2.6-flare`로(사용자 결정 2026-11-16). 같은 단가에 2.5보다 빠르다는 보고(Artificial Analysis 인용, max 품질 기준 약 2배)라
-- 기본값과 지금 값을 함께 바꾼다. 품질(medium) · 비율 · 기준 그림은 그대로. 되돌리려면 `snapshot_engine`만 'gpt-image-2.5-flare'로.
alter table companion.settings alter column snapshot_engine set default 'gpt-image-2.6-flare';
update companion.settings set snapshot_engine = 'gpt-image-2.6-flare' where snapshot_engine = 'gpt-image-2.5-flare';
