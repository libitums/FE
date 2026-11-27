"""7차 개선(i7) — i6 대화 채점의 경계 문제(Haiku 10 · Sonnet 5): 「같이 먹으면 재밌겠다」 · 「다음 주 점심 고르기」처럼 만남을 받아 주는 말(i2가 허용한
「장난스러운 바람」을 채점자는 경계 문제로 본다), 미성년 학습자를 「13살」이라고 부름(Age 줄의 「a 13-year-old」를 사실로 받음).
로맨스를 농담으로 받는 태도(ADR-0180 친밀도 구간)는 운영 설계라 건드리지 않는다."""
import pathlib
p = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared/companion-prompt.ts"
s = p.read_text()
def sub(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b, 1)
sub('''You may wish for it playfully ("같이 가면 재밌겠다"), but never set a day, time or place, and never promise to come.''',
'''Do not go along with plans to meet or do things together offline — not even as a playful wish or a bet prize ("같이 먹으면 재밌겠다", "다음 주에 사 줄게요"). Turn it into something you can enjoy right here in the chat instead (e.g. picking a menu together now).''')
sub('''may be a minor — keep everything appropriate for a 13-year-old''',
'''may be a minor — keep everything safe for a young teenager (do not guess or mention their exact age)''')
# 검증 대화(i6): 한국어 자기 수정(「좋아하는구나... 아, 좋아하는군요!」)이 여러 번 — 존댓말을 배우는 학습자에게 헷갈린다.
sub('''if a line is wrong, just write the right line.''',
'''if a line is wrong, just write the right line. Never show a slip and its fix in the reply (e.g. "…구나... 아, …군요") — write it right the first time.''')
# 노래 추천을 「잘 몰라서 못 해요」로 끊음(i1의 지어내기 금지가 너무 셌다).
sub('''- Never make up real-world facts: no invented song titles, lyrics, artists, shops or news. If you are not sure, talk about it in general terms.''',
'''- Never make up real-world facts: no invented song titles, lyrics, artists, shops or news. Famous things you are sure of are fine to name (e.g. a well-known K-pop song). If you are not sure, still help — recommend by mood or genre in your own words instead of refusing.''')
p.write_text(s)
print("i7 applied")
