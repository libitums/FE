// `unit` 계층: 「소리가 안 나는 문장」 점검(ADR-0188). `node --test devtools/content/*.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  chipSoundCoverageOf,
  silentSentencesOf,
  silentSentencesReport,
} from "./silent-sentences.mjs";

const line = (ko) => ({ ko, roman: "", en: "" });

const episode = () => ({
  unit_id: "u01-water",
  pre_cuts: [
    { index: 1, cut_kind: "monologue", line: line("목이 마르다."), audio_url: "" },
    {
      index: 2,
      cut_kind: "speech",
      line: line("어서 오세요."),
      audio_url: "level-3/u01-water/pre-2",
    },
    {
      index: 3,
      cut_kind: "narration",
      narration: line("편의점 안."),
      audio_url: "level-3/u01-water/pre-3",
    },
  ],
  post_cuts: [
    {
      index: 1,
      cut_kind: "speech",
      line: line("{name} 씨, 안녕!"),
      audio_url: "level-3/u01-water/post-1",
    },
  ],
  interlude: {
    form: "cuts",
    cuts: [{ index: 1, cut_kind: "speech", line: line("그 시각."), audio_url: "" }],
  },
  dialogue: [
    { seq: 1, line_id: "D1", text: line("봉투 드릴까요?"), audio_url: "level-3/u01-water/d-01" },
    { seq: 2, line_id: "D2", text: line("감사합니다."), audio_url: "" },
  ],
  steps: [
    {
      id: "S1",
      items: [
        {
          id: "S1-01",
          type: "VOCAB_CARD",
          context: line("물"),
          audio_url: "level-3/u01-water/word-mul",
          example: line("물 주세요."),
          example_audio_url: "level-3/u01-water/ex-mul",
        },
        {
          id: "S1-02",
          type: "WORD_ORDER",
          tiles: [line("물"), line("주세요.")],
          answers: [line("물 주세요.")],
        },
        {
          id: "S1-03",
          type: "WORD_ORDER",
          tiles: [line("두"), line("개")],
          answers: [line("두 개.")],
        },
        {
          id: "S1-04",
          type: "SYLLABLE_BUILD",
          tiles: [line("봉"), line("투")],
          answers: [line("봉투")],
          feedback: { audio_url: "level-3/u01-water/word-bongtu" },
        },
        {
          id: "S1-06",
          type: "TURN_ORDER",
          tiles: [line("감사합니다."), line("봉투 드릴까요?"), line("아니요.")],
          answers: [line("봉투 드릴까요? | 아니요. | 감사합니다.")],
        },
        {
          id: "S1-05",
          type: "ROLE_LINE",
          options: [
            { ko: "물", correct: true },
            { ko: "불", correct: false },
          ],
        },
      ],
    },
  ],
});

const manifest = new Set([
  "level-3/u01-water/pre-2",
  "level-3/u01-water/post-1",
  "level-3/u01-water/d-01",
  "level-3/u01-water/word-mul",
  "level-3/u01-water/ex-mul",
]);

const byRef = (rows) => Object.fromEntries(rows.map((row) => [`${row.place}:${row.ref}`, row]));

test("SS1. 컷 · 대화 줄 — 음성 id가 없으면 no-audio-id(콘텐츠 누락)", () => {
  const rows = byRef(silentSentencesOf(episode(), manifest));
  assert.equal(rows["pre_cut:1"].reason, "no-audio-id");
  assert.equal(rows["pre_cut:1"].ko, "목이 마르다.");
  assert.equal(rows["interlude_cut:1"].reason, "no-audio-id");
  assert.equal(rows["dialogue:D2"].reason, "no-audio-id");
  assert.equal(rows["pre_cut:2"], undefined);
  assert.equal(rows["dialogue:D1"], undefined);
});

test("SS2. id는 있는데 음성 정보 파일에 없으면 not-in-manifest(파일 미업로드)", () => {
  const rows = byRef(silentSentencesOf(episode(), manifest));
  assert.equal(rows["pre_cut:3"].reason, "not-in-manifest");
  assert.equal(rows["pre_cut:3"].ko, "편의점 안.");
});

test("SS3. 자리표시자가 남은 문장은 placeholder — 앱이 일부러 소리를 끈다(코드 규칙)", () => {
  const rows = byRef(silentSentencesOf(episode(), manifest));
  assert.equal(rows["post_cut:1"].reason, "placeholder");
});

test("SS4. 레슨 정답 문장(문장 · 음절 조립) — 자기 음성 · 같은 에피소드 녹음 순으로 찾고, 없으면 no-recording", () => {
  const rows = byRef(silentSentencesOf(episode(), manifest));
  assert.equal(rows["lesson_answer:S1-02"], undefined, "예문 녹음과 글자 그대로 같다");
  assert.equal(rows["lesson_answer:S1-03"].reason, "no-recording");
  assert.equal(rows["lesson_answer:S1-03"].ko, "두 개.");
  assert.equal(rows["lesson_answer:S1-04"].reason, "not-in-manifest", "자기 음성 id가 파일에 없다");
  assert.equal(rows["lesson_answer:S1-05"], undefined, "단어 고르기는 다시 듣기 자리가 아니다");
});

test("SS5. 칩 소리 범위 — 앱이 칩 소리를 싣는 유형만(음절 조립 · 듣고 조립 제외), 유형별 소리 있는 보기 · 조각 수 / 전체", () => {
  assert.deepEqual(chipSoundCoverageOf(episode(), manifest), {
    WORD_ORDER: { withSound: 1, total: 4 },
    // 고정된 첫 줄(「봉투 드릴까요?」, 녹음 있음)은 창고에 없어 세지 않는다.
    TURN_ORDER: { withSound: 0, total: 2 },
    ROLE_LINE: { withSound: 1, total: 2 },
  });
});

test("SS6. 보고 — 까닭별 합계와 문장 표", () => {
  const rows = silentSentencesOf(episode(), manifest);
  const text = silentSentencesReport(rows, chipSoundCoverageOf(episode(), manifest), {
    manifestGeneratedAt: "2026-11-13T04:00:00Z",
    episodeCount: 1,
  });
  assert.match(text, /no-audio-id \| 3/);
  assert.match(text, /\| u01-water \| pre_cut \| 1 \| 목이 마르다\. \| no-audio-id \|/);
  assert.match(text, /2026-11-13T04:00:00Z/);
  assert.match(text, /WORD_ORDER \| 1 \| 4/);
});
