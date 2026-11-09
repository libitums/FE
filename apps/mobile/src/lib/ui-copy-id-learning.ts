// 인도네시아어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningId: ListeningCopy = {
  instruction: "Pilih arti kalimat tersebut.",
  playback: { pause: "Jeda", resume: "Lanjutkan", play: "Putar" },
  playFromStart: "Putar dari awal",
  slow: "Pelan",
  playAgain: "Putar lagi",
  stop: "Berhenti",
};

export const wordChoiceId: WordChoiceCopy = {
  instruction: "Pilih kata yang cocok.",
  culture: {
    sceneInstruction: "Apa yang kamu katakan?",
    feedbackTitle: {
      scene: { correct: "Balasan bagus!", incorrect: "Belum tepat" },
      question: { correct: "Benar!", incorrect: "Belum tepat" },
    },
  },
};

export const sentenceOrderId: SentenceOrderCopy = {
  instruction: "Lengkapi percakapan.",
  placedChip: (text, position) => `${text}, posisi ${position}`,
  dialogueSpeaker: { counterpart: "Lawan bicara", me: "Kamu" },
  dialogueTurn: (speaker, position, text) => `${speaker}, giliran ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}, giliran ${position}, kosong`,
  dialogueLine: {
    me: (text) => `Ucapanmu: ${text}`,
    counterpart: (text) => `Ucapan lawan bicara: ${text}`,
  },
};

export const speakingId: SpeakingCopy = {
  instruction: "Bacakan kalimat dengan lantang.",
  speak: "Bicara",
  stopSpeaking: "Berhenti bicara",
  tryAgain: "Coba lagi",
  dictationDisabled:
    "Siri atau Dikte sedang nonaktif. Aktifkan Pengaturan > Umum > Papan Ketik > Aktifkan Dikte, lalu coba lagi.",
  tapToContinue: "Ketuk layar untuk lanjut",
  recognitionUnavailable: "Pengenalan suara sedang tidak tersedia. Ketuk Lewati untuk lanjut.",
};

export const assessmentId: AssessmentCopy = {
  activity: "Penilaian",
  verdict: { passed: "Lulus", failed: "Belum lulus" },
  itemTitle: (ordinal) => `Soal ${ordinal}`,
  announcement: (verdict) => `Hasil penilaian, ${verdict === "passed" ? "lulus" : "belum lulus"}`,
};

export const lessonCompleteId: LessonCompleteCopy = {
  rewardCoins: (count) => `Hadiah, ${count} koin`,
  grade: (grade) => `Nilai ${grade}`,
  gradeName: (grade) => grade,
  outcome: { passed: "Pelajaran selesai", failed: "Pelajaran belum lulus" },
  mistakes: (count) => (count === 0 ? "tanpa kesalahan" : `${count} kesalahan`),
  skippedSuffix: (count) => (count === 0 ? "" : `, ${count} soal dilewati`),
  nextLesson: "Pelajaran berikutnya",
  nextFinal: "Tes akhir",
  continueStory: "Lanjutkan cerita",
  title: {
    perfect: "PELAJARAN SEMPURNA!",
    complete: "PELAJARAN SELESAI!",
    failed: "PELAJARAN GAGAL",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0
      ? "KAMU TIDAK MELAKUKAN KESALAHAN DI PELAJARAN INI"
      : `KAMU MELAKUKAN ${mistakeCount} KESALAHAN DI PELAJARAN INI`,
  streakLabel: (days) => `Beruntun ${days} hari`,
  rewardLabel: (count) => `+ ${count} HADIAH`,
  tryAgain: "Coba lagi",
  review: {
    soClose: "SEDIKIT LAGI!",
    fixedOf: (fixed, total) => `KAMU MEMPERBAIKI ${fixed} DARI ${total} KESALAHAN`,
    dotsLabel: (fixed, total) => `Diperbaiki ${fixed} dari ${total} kesalahan`,
    neededMore: (count) =>
      `Kamu perlu ${count} jawaban benar lagi. Ulangi pelajarannya \u2014 sekarang pasti lebih mudah.`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideId: LearningItemGuideCopy = {
  "sentence-order": {
    title: "Kali ini hanya satu kepingan",
    description:
      "Biasanya kamu menyusun beberapa kepingan. Kali ini hanya ada satu, jadi ketuk kepingan itu, lalu ketuk Periksa.",
  },
  "activity-vocab-card": {
    title: "Kata baru",
    description: "Dengarkan katanya dan lihat artinya. Ketuk Berikutnya jika sudah siap.",
  },
  "activity-word-choice": {
    title: "Pilih satu",
    description: "Pilih jawaban yang cocok, lalu ketuk Periksa.",
  },
  "activity-listening": {
    title: "Dengarkan dulu",
    description: "Ketuk pengeras suara untuk mendengar lagi. Lalu pilih yang kamu dengar.",
  },
  "activity-syllable-build": {
    title: "Susun katanya",
    description: "Ketuk blok suku kata secara berurutan untuk membentuk kata. Lalu ketuk Periksa.",
  },
  "activity-sentence-order": {
    title: "Susun urutannya",
    description:
      "Ketuk potongan secara berurutan untuk membentuk kalimat. Ketuk lagi untuk mengembalikannya.",
  },
  "activity-culture-card": {
    title: "Catatan budaya",
    description: "Tips singkat tentang kehidupan di Korea. Baca, lalu ketuk Berikutnya.",
  },
};
