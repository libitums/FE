// 인도네시아어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogStoryFinalCopy } from "../screens/catalog-story-final/catalog-story-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CatalogUpdateNoticeCopy } from "../screens/catalog-update/catalog-update-notice.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

const unavailableTail = {
  pending: "segera hadir",
  update: "perbarui aplikasi untuk membuka",
  unavailable: "tidak tersedia",
} as const;

export const catalogUpdateNoticeId: CatalogUpdateNoticeCopy = {
  title: "Psst, ada yang baru! 👀",
  body: "Beberapa episode yang sudah kamu selesaikan mendapat tambahan konten. Tenang, progresmu aman.",
  confirm: "Oke, paham",
  dontShowAgain: "Jangan tampilkan lagi",
  checked: "dicentang",
  unchecked: "tidak dicentang",
};

export const catalogMapId: CatalogMapCopy = {
  episodeLabel: (ordinal) => `Episode ${ordinal}.`,
  coverTitle: "Pengantar episode",
  lessonTitle: (ordinal) => `Pelajaran ${ordinal}`,
  sheetHeading: (unit, title) => `${unit}: “${title}”`,
  finalTitle: "Tes akhir",
  cultureTitle: "Budaya",
  storyTitle: "Cerita",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "SEGERA HADIR",
    update: "PERLU DIPERBARUI",
    unavailable: "TIDAK TERSEDIA",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
  comingSoon: {
    title: "Segera hadir",
    body: "Kami sedang menyiapkan cerita berikutnya.",
    label: (episodeLabel) =>
      `${episodeLabel} Segera hadir. Kami sedang menyiapkan cerita berikutnya.`,
  },
};

export const catalogCoverId: CatalogCoverCopy = {
  toggleScript: {
    en: "Tampilkan romanisasi",
    roman: "Tampilkan arti",
  },
  nextCut: (ordinal, total) => `Adegan berikutnya, ${ordinal} dari ${total}`,
  finishCover: "Selesaikan pengantar",
  finishEpilogue: "Selesaikan episode",
  finishStory: "Selesaikan cerita",
  thinking: "sedang berpikir",
  episodeStart: "Episode dimulai!",
  episodeClear: "Episode tamat!",
  episodeContinue: "Bersambung…",
  skipDescription: "Kamu bisa menontonnya lagi kapan saja dari pengantar episode.",
};

export const typingId: TypingCopy = {
  instruction: "Ketik kalimat dalam bahasa Korea.",
  answerField: (typed) => `Jawabanmu: ${typed}`,
  answerFieldEmpty: "Jawabanmu, kosong",
  answerReveal: (answer) => `Jawaban: ${answer}`,
};

export const vocabCardId: VocabCardCopy = {
  instruction: "Pelajari kata ini.",
  badge: "Kata baru",
  gotIt: "Mengerti",
  runLabel: (ordinal, total) => `Kata ${ordinal} dari ${total}`,
  pronunciation: (romanization) => `Pelafalan: ${romanization}`,
  meaning: (meaning) => `Arti: ${meaning}`,
};

export const cultureCardId: CultureCardCopy = {
  instruction: "Kenali kehidupan di Korea.",
  eyebrow: "BUDAYA",
  tapToFlip: "Ketuk untuk membalik",
  flipCard: "Balik kartu",
  nextCard: "Kartu berikutnya",
  koreanBodyTitle: "Dalam bahasa Korea",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `Pelafalan: ${romanization}`,
  frontPlace: (position, total) => `Kartu budaya ${position} dari ${total}, sisi depan.`,
  backPlace: (position, total) => `Kartu budaya ${position} dari ${total}, sisi belakang.`,
  flipBackHint: "Ketuk untuk membalik kembali.",
};

export const syllableBuildId: SyllableBuildCopy = {
  instruction: "Ketuk suku kata untuk menyusun kata.",
  meaning: (meaning) => `Arti: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}, posisi ${position} dari ${slotCount}`,
  wordEmpty: (slotCount) => `Katamu, kosong, ${slotCount} suku kata`,
  word: (word) => `Katamu: ${word}`,
  usedTile: (text) => `${text}, sudah dipakai`,
};

export const readAloudId: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1
        ? "Kamu sudah mengucapkan kata itu."
        : `Kamu sudah mengucapkan semua ${total} kata.`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "pertama"를 붙이지 않습니다.
    const lead = matched === 0 ? "" : " pertama";
    return `Kamu mengucapkan ${matched}${lead} dari ${total} kata.`;
  },
  pronunciation: (romanization) => `Pelafalan: ${romanization}`,
};

export const speakWordId: SpeakWordCopy = {
  instruction: "Ucapkan kata untuk gambar ini.",
  recognitionUnavailable: "Pengenalan suara sedang tidak tersedia. Ketuk Lewati untuk lanjut.",
};

export const pairMatchId: PairMatchCopy = {
  instruction: "Ketuk sebuah kata, lalu artinya.",
  progress: (matched, total) => `${matched} / ${total} cocok`,
  progressLabel: (matched, total) => `${matched} dari ${total} pasangan cocok`,
  selected: (text) => `${text}, dipilih`,
  matched: (text, ordinal, partner) => `${text}, pasangan ${ordinal}, cocok dengan ${partner}`,
  judged: (text, partner) => `${text}, cocok dengan ${partner}`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) =>
    `Cocok: ${word}, ${meaning}. ${matched} dari ${total}.`,
  unlinked: (text) => `Belum cocok: ${text}`,
  missedPairs: (pairs) => `Pasangan yang benar: ${pairs}`,
  spokenPair: (word, meaning) => `${word}, ${meaning}.`,
};

export const wordChoicePictureId: WordChoicePictureCopy = {
  picture: (meaning) => `Gambar: ${meaning}`,
  loading: "Gambar, memuat",
  unavailable: (meaning) => `Gambar tidak tersedia. Arti: ${meaning}`,
  unavailableCaption: "Gambar tidak tersedia",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `Jawaban: ${word}, ${meaning}`
      : `Jawaban: ${word}, ${romanization}, ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalId: CatalogFinalCopy = {
  turnProgress: (n, total) => `Giliran ${n} dari ${total}`,
  replyLabel: (reply) => `Balasanmu: ${reply}`,
  replyEmpty: "Balasanmu, kosong",
  replyHint: (translation) => `Ucapkan: ${translation}`,
  correctAnswer: (answer) => `Jawaban: ${answer}`,
  answerLabel: "Jawaban",
};

export const catalogStoryFinalId: CatalogStoryFinalCopy = {
  redo: "Ulangi",
  listen: "Dengarkan",
  nextLetter: "Huruf berikutnya",
  letterLabel: (ordinal, total, state) =>
    `Huruf ${ordinal} dari ${total}, ${state.kind === "written" ? state.syllable : state.kind === "writing" ? "sedang menulis" : "kosong"}`,
  padLabel: (syllable) => `Area menulis. Telusuri ${syllable}`,
};

export const audioUnavailableId: AudioUnavailableCopy = {
  label: "Audio belum tersedia",
};
