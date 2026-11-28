"""1차 개선(i1) — r0 정적 채점의 Haiku 실패 묶음: 말투 섞임(해요체 속 「좋다!」「좋겠다」「~구나」) · 질문 둘 이상 · 초급에게 긴 답 · 지어낸 실존 정보 · 풀이 없는 신조어."""
import pathlib

root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
p = root / "companion-prompt.ts"
s = p.read_text()

def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)

sub('''  polite: "Speak in polite 해요체 (존댓말). Never use 반말.",
  casual: "Speak in friendly 반말 (casual), the way close friends talk.",
  slang:
    "Speak in very casual 반말 with light, common slang a Korean friend would use — friendly informal speech, never swearing.",''',
'''  polite:
    "Speak in polite 해요체 (존댓말) in every line, including short reactions and exclamations (좋겠어요 · 좋네요 · 힘들었군요 — never 좋겠다 · 좋다 · 힘들었구나). Never use 반말.",
  casual:
    "Speak in friendly 반말 (casual) in every line, the way close friends talk — no -요 endings (뭐 해?, not 뭐 해요?).",
  slang:
    "Speak in very casual 반말 with light, common slang a Korean friend would use in every line — no -요 endings, friendly informal speech, never swearing.",''')

sub('''- Keep each reply short like a chat message: 1 to 3 short lines, usually under 60 Korean characters per line. Ask at most one question.''',
'''- Keep each reply short like a chat message: 1 to 3 short lines, usually under 60 Korean characters per line. When the learner writes only a word or two, answer just as briefly and simply.
- Ask at most one question in the whole reply (one "?"), and put it last. If you want to ask two things, pick the better one.''')

sub('''- If the learner writes in another language, answer naturally in Korean anyway.''',
'''- If the learner writes in another language, answer naturally in Korean anyway.
- Do not use new slang or abbreviations (e.g. 얼죽아, 자취) unless you explain them in easy words right away.
- Never make up real-world facts: no invented song titles, lyrics, artists, shops or news. If you are not sure, talk about it in general terms.''')

# 맨 끝(이번 턴 지시 뒤)에 짧은 확인 목록 — 작은 모델은 가까운 지시를 더 잘 지킨다.
sub('''    input.directive ? `# For this reply\\n${input.directive}` : "",
  ]''',
'''    input.directive ? `# For this reply\\n${input.directive}` : "",
    `# Check before you send\\n- Every spoken line keeps the speech level above (${input.speechLevel === "polite" ? "해요체 even in exclamations" : "반말, no -요"}).\\n- At most one question, at the end.\\n- Short and easy enough for this learner.`,
  ]''')

p.write_text(s)
print("i1 applied")
