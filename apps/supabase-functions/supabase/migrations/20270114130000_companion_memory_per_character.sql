-- 기억은 캐릭터마다(ADR-0210 D6). 모든 캐릭터가 읽던 공유 층(character_id null)의 기억을, 그 기억이 나온 대화의 캐릭터 층으로 옮긴다.
-- 한 캐릭터에게 한 말을 처음 만난 다른 캐릭터가 아는 일(「어떻게 알지?」)이 없고, 새 친구에게 자기소개 · 일상을 다시 말하는 것이 연습이 된다.
-- 추출 모델은 이제 공유 층에 쓰지 않는다(`memoryOpsFrom`이 늘 shared 거짓).
--
-- 1. 옮기기: 원본 메시지(`source_message_id`)의 대화 캐릭터 층으로. 그 층에 같은 글(공백 · 마침표 무시)이 이미 있으면 옮기지 않고 잊는다.
--    `history`에 `{ op: "move", from: "shared", to }`를 남긴다. 유저가 고친 기억도 옮긴다(글은 그대로).
-- 2. 원본 메시지가 사라진 공유 기억(그 캐릭터와의 대화를 지워 메시지가 지워짐)은 잊는다 — 대화 지우기는 그 캐릭터의 기억을 지우는 일이라
--    (20261211) 공유 층에 남아 다른 캐릭터가 계속 아는 것이 어긋남이었다.
-- 3. 원문 묶음(`companion.memory_batch`)의 기존 기억은 이 캐릭터 층만 준다(20270114120000 판에서 공유 층 조건을 뺐다).
--
-- 다시 적용해도 같은 결과다(남은 공유 기억만 다룬다). 배포 전까지 공유 층에 새로 쌓인 것도 배포 때 다시 돌리면 옮겨진다.
-- 운영에는 2026-11-27에 한 번 먼저 돌렸다(옮김 2,459 · 잊음 32).

with routed as (
  select m.id, m.user_id, m.content, c.character_id as target
  from companion.memories m
  join companion.messages msg on msg.id = m.source_message_id
  join companion.conversations c on c.id = msg.conversation_id
  where m.deleted_at is null and m.character_id is null
), duplicate as (
  select r.id from routed r
  where exists (
    select 1 from companion.memories x
    where x.user_id = r.user_id and x.character_id = r.target and x.deleted_at is null
      and regexp_replace(x.content, '[ .]', '', 'g') = regexp_replace(r.content, '[ .]', '', 'g')
  )
), forgotten as (
  update companion.memories m
  set deleted_at = now(), deleted_reason = 'forgotten',
    history = m.history || jsonb_build_array(jsonb_build_object('op', 'forget', 'reason', 'per-character move: duplicate', 'at', now()))
  where m.id in (select id from duplicate)
  returning m.id
)
update companion.memories m
set character_id = r.target,
  history = m.history || jsonb_build_array(jsonb_build_object('op', 'move', 'from', 'shared', 'to', r.target, 'at', now()))
from routed r
where m.id = r.id and r.id not in (select id from duplicate);

update companion.memories m
set deleted_at = now(), deleted_reason = 'forgotten',
  history = m.history || jsonb_build_array(jsonb_build_object('op', 'forget', 'reason', 'per-character move: source chat cleared', 'at', now()))
where m.deleted_at is null and m.character_id is null
  and not exists (select 1 from companion.messages msg where msg.id = m.source_message_id);
