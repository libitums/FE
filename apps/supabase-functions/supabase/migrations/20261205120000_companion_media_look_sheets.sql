-- 스냅샷 외모 메모(`companion.characters.media.look`)를 기준 그림(kkachi-assets companion-ref-sheets-2026-11-10)에 맞춘다.
-- 덕수쌤은 옛 설정(뿔테 안경 · 빨간 나비넥타이)이 남아 있어 그림과 달리 안경을 쓴 채로 나왔다 — 시트는 안경 없이 콧수염 · 곱슬 옆머리 · 회색 답호 한복.
-- 재민은 「눈썹까지 오는 앞머리」였으나 시트는 이마가 보이게 넘긴 짧은 머리. 나머지(윤경 · 미나 · 도윤)는 시트와 맞아 그대로.
-- 프롬프트 노드는 이 메모를 「참고로만」 쓰고 기준 그림을 따르지만, 메모가 그림과 다르면 모델이 메모 쪽을 그리기도 한다. 다시 적용해도 같다.

update companion.characters
set media = jsonb_set(media, '{look}', to_jsonb(
  'Korean language teacher around 30: completely bald crown with thick curly black hair only at the sides above the ears, neat thick black moustache, straight brows, calm narrow eyes, no glasses. Grey sleeveless knee-length dapho over a cream hanbok jeogori, grey tie, thin dark cord belt with a long tassel, light-grey trousers. Friendly and dignified.'::text))
where id = 'duksu';

update companion.characters
set media = jsonb_set(media, '{look}', to_jsonb(
  '29-year-old office worker who climbs on weekends: short black hair swept up and back off the forehead, narrow calm eyes with heavy lids, thick straight brows, broad shoulders, neat clothes (white shirt with rolled sleeves, dark trousers).'::text))
where id = 'jaemin';
