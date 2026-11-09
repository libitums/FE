-- AI 컴패니언 — ops-dashboard 「문서」 화면용 운영 조회 둘과 덕수쌤의 반말 피드백 규칙.
--
--   `companion_inspect_characters()` — 캐릭터마다 페르소나 카드 전체(프롬프트가 쓰는 칸 그대로) · 말투 상한 · 활성 · 순서.
--   `companion_inspect_settings()`   — 설정 한 행(`companion.settings`)을 JSON으로.
--   둘 다 `service_role`만, 읽기만(다른 `companion_inspect_*`와 같은 권한). `companion-eval?docs=1`이 부른다.
--
--   덕수쌤(선생님): 존댓말 관계에서 학습자가 반말을 쓰면 피드백이 「더 나은 표현」이 아니라 「교정」이다(2026-11-09 결정).
--   페르소나 칸 `banmalFeedback`(`correction` | 없으면 `better`)으로 두어 다른 캐릭터도 데이터로 바꿀 수 있다.
--
-- 기존 컴패니언 마이그레이션 여섯(20261108 ~ 20261113) 뒤에 적용한다.

update companion.characters
set persona = persona || jsonb_build_object('banmalFeedback', 'correction')
where id = 'duksu';

create function public.companion_inspect_characters()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ch.id,
    'bibleVersion', ch.bible_version,
    'active', ch.active,
    'sortOrder', ch.sort_order,
    -- 말투 단계 계산(`companion_finish_turn`)과 같은 기본값.
    'maxSpeechLevel', coalesce(ch.persona->>'maxSpeechLevel', 'slang'),
    'persona', ch.persona
  ) order by ch.sort_order, ch.id), '[]'::jsonb)
  from companion.characters ch
$$;

create function public.companion_inspect_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(s) - 'id' from companion.settings s
$$;

revoke all on function public.companion_inspect_characters() from public, anon, authenticated;
revoke all on function public.companion_inspect_settings() from public, anon, authenticated;
grant execute on function public.companion_inspect_characters() to service_role;
grant execute on function public.companion_inspect_settings() to service_role;
