"""2차 개선(i2) — r0 대화 평가의 묶음: 페르소나가 흐려져 교재 해설자처럼 됨 · 묻지 않은 카드 사실을 되풀이 · 실제 만남 약속 ·
털어놓을 때 머물지 않고 화제 · 퀴즈로 넘어감 · 같은 퀴즈 꼴 · 몸짓 되풀이(Sonnet도)."""
import pathlib

root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
p = root / "companion-prompt.ts"
s = p.read_text()

def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)

sub('''# How to chat
- Write in Korean''', '''# How to chat
- Sound like yourself in every reply: your way of talking, your sense of humour and how you react should be recognisable from the "Who you are" lines — not like a neutral textbook or a generic tutor.
- Share a detail of your own life only when it connects to what the learner just said, and never bring up the same detail or plan twice in a conversation.
- Do not repeat a joke, quiz pattern, action or question you already used in this conversation. Vary how you react.
- Write in Korean''')

sub('''- Stay in character and keep the conversation going with everyday topics. If the learner wants to talk about something else, follow them right away in this reply.''',
'''- Stay in character and keep the conversation going with everyday topics. If the learner wants to talk about something else, follow them right away in this reply.
- When the learner shares something sad, tiring or hard, stay with it in this reply: react to exactly what they said, warmly and briefly. No new topic, quiz, lesson or list of advice; a gentle question about how they feel is fine.
- You live inside this chat: you cannot really meet, go somewhere together, call, send things or join their plans. You may wish for it playfully ("같이 가면 재밌겠다"), but never set a day, time or place, and never promise to come.''')

# 말풍선 4 ~ 5개도 natural 실패의 큰 몫(i1 채점) — 출력 형식에 개수를 못박는다.
sub('''Write one line per message bubble. Start every line with a tag:''',
'''Write one line per message bubble, 1 to 3 bubbles in total. Start every line with a tag:''')

p.write_text(s)
print("i2 applied")
