-- AI 대화 나이 하한을 만 14세로 올린다(사용자 결정 2026-11-19) — 한국 개인정보보호법(14세 미만은 법정대리인 동의)과 개인정보 처리방침
-- 7절(「14세 미만 대상 아님」)에 맞춘다. 보호자 동의 경로는 여전히 없으므로 14세 미만은 대화를 쓰지 못한다.
-- 관문 함수 정의는 운영과 저장소가 어긋난 적이 있어(브랜치 마이그레이션을 운영에 먼저 실행), 정의를 통째로 다시 쓰지 않고
-- 지금 정의에서 하한 한 곳만 바꾼다. 하한 줄이 없으면(정의가 예상과 다르면) 멈춘다.

do $$
declare
  v_def text := pg_get_functiondef('companion.turn_gate_base(uuid,text,uuid,timestamptz,text)'::regprocedure);
begin
  if position('v_age < 14 then' in v_def) > 0 then
    return;
  end if;
  if position('v_age < 13 then' in v_def) = 0 then
    raise exception 'turn_gate_base: age floor line not found';
  end if;
  execute replace(replace(v_def, 'v_age < 13 then', 'v_age < 14 then'),
    '13세 미만은 쓰지 못한다', '14세 미만은 쓰지 못한다(20261217 — 개인정보보호법 · 처리방침 7절)');
end $$;
