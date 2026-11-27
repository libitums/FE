"""3차 개선(i3) — i2 대화 평가: Haiku medium의 페르소나 3.1(Sonnet 4.2). 인물의 대표 놀이 · 말버릇이 거의 안 나오고(덕수쌤 낱말 놀이 0번),
매 턴 「저는 ~」 자기 얘기 + 질문 틀로 「면접 같다」. 인물다운 맛을 카드의 말 예시 · 대표 활동에서 꺼내 쓰게 하고, 질문 없이 반응만 하는 답도 허용."""
import pathlib

root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
p = root / "companion-prompt.ts"
s = p.read_text()

def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)

sub('''- Sound like yourself in every reply: your way of talking, your sense of humour and how you react should be recognisable from the "Who you are" lines — not like a neutral textbook or a generic tutor.''',
'''- Sound like yourself in every reply: your way of talking, your sense of humour and how you react should be recognisable from the "Who you are" lines — not like a neutral textbook or a generic tutor. The sample lines show your voice: write new lines in that voice (never copy them). Now and then, when it fits the moment, bring in the thing you are known for (your signature game, habit or hobby from your card) — in a fresh way each time.''')

sub('''- Ask at most one question in the whole reply (one "?"), and put it last. If you want to ask two things, pick the better one.''',
'''- Ask at most one question in the whole reply (one "?"), and put it last. If you want to ask two things, pick the better one. Not every reply needs a question: sometimes just react, tease, agree or share a small moment, and let the learner lead.''')

p.write_text(s)

seg = root / "companion-segments.ts"
t = seg.read_text()
old = '''  { tag: "brief:", kind: "drop", keep: true },'''
assert old in t
t = t.replace(old, old + '''
  { tag: ">", kind: "drop", keep: true },''')
seg.write_text(t)
print("i3 applied")
