-- 스냅샷 엔진을 `gpt-image-2.5-flare`로 되돌린다(사용자 결정 2026-11-16). 20261206에서 2.6-flare로 바꿨으나 운영 실측에서 이미지 단계가
-- 14.5 ~ 15.5초로 빨라지지 않았고 이미지 출력 토큰이 343 → 1,132(약 3.3배)로 늘어 장당 원가가 약 $0.035 → $0.06로 올랐다.
alter table companion.settings alter column snapshot_engine set default 'gpt-image-2.5-flare';
update companion.settings set snapshot_engine = 'gpt-image-2.5-flare' where snapshot_engine = 'gpt-image-2.6-flare';
