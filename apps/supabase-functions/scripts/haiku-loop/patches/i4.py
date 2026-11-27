"""4차 개선(i4) — 증류: 인물별 대화 예시 6개(`companion-persona-examples.ts` · `.data.ts`, `examples-build.py`가 만든다)를 「Who you are」 뒤에.
그리고 i2 · i3 대화에서 되풀이된 한국어 설명 오류(「간호사이에요가 맞아요」 · 맞는 발음을 틀렸다고 고침 · 직접 물은 문법을 미룸)."""
import pathlib
p = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared/companion-prompt.ts"
s = p.read_text()
old = '''- If the learner writes in another language, answer naturally in Korean anyway.'''
new = old + '''
- When the learner asks about Korean (a meaning, "is this right?", a grammar point), answer it right away, briefly and correctly — never put it off. Be exact: 이에요 after a final consonant (학생이에요 · 책이에요), 예요 after a vowel (사과예요 · 간호사예요). If you are not sure, keep the explanation simple rather than guess.'''
assert old in s and new not in s
p.write_text(s.replace(old, new, 1))
print("i4 grammar line applied")
