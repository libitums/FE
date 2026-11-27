"""5차 개선(i5) — i4 정적 채점: 확인 목록(i1 「Check before you send」)을 답에 써 버리는 누수(「Wait — I must keep 해요체 everywhere」 ·
「Let me redo that cleanly」, 기준선 Sonnet도 「Wait, that state is malformed…」). 확인은 속으로만, 출력 형식에 메타 금지, 하니스에서 자기 수정 줄을 버린다."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
p = root / "companion-prompt.ts"
s = p.read_text()
old = '`# Check before you send\\n'
assert old in s, "check section"
s = s.replace(old, '`# Before you send (check silently in your head — never write this check, a correction or a note about the rules)\\n', 1)
old2 = '''Write nothing else: no markdown, no quotes around lines, no translations.'''
assert old2 in s
s = s.replace(old2, old2 + ''' Never write notes to yourself, self-corrections ("wait", "let me redo"), English commentary or rule names: if a line is wrong, just write the right line.''', 1)
p.write_text(s)
seg = root / "companion-segments.ts"
t = seg.read_text()
old3 = '''  { tag: ">", kind: "drop", keep: true },'''
assert old3 in t
t = t.replace(old3, old3 + '''
  // 자기 수정 · 메타 줄(2026-11-28 평가 — Haiku 「Wait — I must keep 해요체…」 · 「Let me redo that cleanly」, Sonnet 「Wait, that state is malformed…」).
  { tag: "Wait", kind: "drop", keep: true },
  { tag: "Let me", kind: "drop", keep: true },
  { tag: "Note:", kind: "drop", keep: true },
  { tag: "(Note", kind: "drop", keep: true },''', 1)
seg.write_text(t)
test = root / "companion-segments.unit.test.ts"
u = test.read_text()
old4 = '''    // 학습자에게 보일 평범한 중괄호 글은 그대로 speech.'''
assert old4 in u
u = u.replace(old4, '''    // 자기 수정 · 메타 줄도 버린다(태그가 붙어 와도).
    expect(
      collectSegments(split(["@speech 반가워요!\\nWait — I must keep 해요체 everywhere.\\nLet me redo that cleanly.\\n@speech 어디에서 왔어요?"])),
    ).toEqual([
      { kind: "speech", text: "반가워요!" },
      { kind: "speech", text: "어디에서 왔어요?" },
    ]);
''' + old4, 1)
test.write_text(u)
print("i5 applied")
