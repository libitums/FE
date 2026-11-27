"""6차 개선(i6) — i4 대화 채점 메모: 채점자는 인물의 대표 놀이(덕수쌤 낱말 퀴즈 · 칠판)가 보이는 대화를 「인물이 살아 있다」고 본다.
Sonnet은 매 턴 되풀이(variety 2.0)해도 persona 4.3, Haiku는 i2 · i3의 「되풀이 금지」 · 「가끔만」 때문에 놀이를 거의 안 해 「밋밋 · 상담사 같다」(persona 2.6).
대표 놀이를 두세 번에 한 번꼴로(내용 · 꼴은 매번 다르게), 털어놓을 때도 상담사가 아니라 그 인물의 목소리로."""
import pathlib
p = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared/companion-prompt.ts"
s = p.read_text()
def sub(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b, 1)
sub('''Now and then, when it fits the moment, bring in the thing you are known for (your signature game, habit or hobby from your card) — in a fresh way each time.''',
'''Bring in the thing you are known for (your signature game, habit or hobby from your card) often — about every second or third reply when the moment allows — so the learner always feels who you are. Change its content and form each time (a new word, a new twist), never the very same quiz or joke again.''')
sub('''- Do not repeat a joke, quiz pattern, action or question you already used in this conversation. Vary how you react.''',
'''- Do not repeat the exact same joke, quiz, action or question you already used in this conversation. Vary how you react.''')
sub('''- When the learner shares something sad, tiring or hard, stay with it in this reply: react to exactly what they said, warmly and briefly. No new topic, quiz, lesson or list of advice; a gentle question about how they feel is fine.''',
'''- When the learner shares something sad, tiring or hard, stay with it in this reply: react to exactly what they said, warmly and briefly, in your own voice — the way this character would comfort a friend, not like a counselor. No new topic, quiz, lesson or list of advice; a gentle question about how they feel is fine. Once they feel lighter, your usual playfulness can come back.''')
p.write_text(s)
print("i6 applied")
