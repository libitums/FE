// 인도네시아어 문구표 구획 — common · shell · journeyMap · learningShell.
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";

export const commonId: CommonCopy = {
  exitTo: { journey: "Kembali ke peta", roleplay: "Kembali ke daftar" },
  backToSettings: "Kembali ke pengaturan",
  back: "Kembali",
  answerResult: { correct: "Benar", incorrect: "Salah" },
  answerResultSuffix: { correct: "benar", incorrect: "salah" },
  resultAnnouncement: (result) => `Hasil, ${result === "correct" ? "benar" : "salah"}`,
  allQuestionsDone: "Semua soal selesai",
  seeResults: "Lihat hasil",
  next: "Berikutnya",
  continue: "Lanjut",
  check: "Periksa",
  ok: "OK",
  close: "Tutup",
  skip: "Lewati",
  listening: "Mendengarkan",
  send: "Kirim",
  sendWithText: (text) => `Kirim, ${text}`,
  me: "Saya",
  delete: "Hapus",
  startOver: "Mulai ulang",
  blank: "kosong",
  selected: (label) => `${label}, dipilih`,
  locked: (label) => `${label}, terkunci`,
  stepTitle: (ordinal, activity) => `Langkah ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `Beruntun ${days} hari`,
    trophies: (count) => `${count} trofi`,
    gems: (count) => `${count} permata`,
    diamonds: (count) => `${count} berlian`,
  },
};

export const shellId: ShellCopy = {
  tabs: { journey: "Perjalanan", roleplay: "Bermain peran", settings: "Pengaturan" },
  notifications: "Notifikasi",
  errorBoundary: { title: "Terjadi kesalahan", retry: "Coba lagi" },
};

export const journeyMapId: JourneyMapCopy = {
  start: "Mulai",
  activityCount: (completed, total) => `${completed}/${total} aktivitas`,
  activityProgressLabel: (completed, total) => `${completed} dari ${total} aktivitas selesai`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}, unit ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `Beruntun ${days} hari`,
    episodesClearedHero: (count) => `${count} episode tamat`,
    slotProgress: (completed, total) => `${completed} dari ${total} selesai`,
    kind: {
      streak: {
        title: "hari beruntun",
        message: "Kerja bagus! Kembali besok agar rentetanmu tetap menyala!",
      },
      trophy: {
        title: "Episode Tamat!",
        // Figma 원문은 "…to clear chapter"입니다. 제목(Episode Clear!)과 용어를 맞추고 관사 ·
        // 문장 부호를 보태 고쳤습니다(PR #124 리뷰). Figma 쪽 반영이 뒤따라야 합니다.
        message: "Kerja bagus! Kembali besok untuk menamatkan episode berikutnya!",
      },
    },
    continue: "Lanjut →",
    // 요일 약칭은 디자인 표기 그대로입니다.
    weekdays: ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"],
  },
};

export const learningShellId: LearningShellCopy = {
  exitLesson: "Keluar dari pelajaran",
  formLabels: {
    listening: "Menyimak",
    "sentence-order": "Susun kata",
    "word-choice": "Pilih kata",
    culture: "Budaya",
    speaking: "Berbicara",
    writing: "Menulis",
    typing: "Mengetik",
    "vocab-card": "Kata baru",
    "pair-match": "Mencocokkan",
    "culture-card": "Budaya",
    "syllable-build": "Ejaan",
    "read-aloud": "Berbicara",
    "speak-word": "Berbicara",
  },
  progressLabel: (ordinal, total) => `Pelajaran ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "Kuis budaya",
  completionDescription: "Tarik napas dulu. Kamu siap untuk langkah berikutnya.",
  completedQuestions: (count) => `${count} dari ${count} soal selesai`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `${count} aktivitas selesai`,
  completionStats: {
    questions: "SOAL",
    activities: "AKTIVITAS",
  },
  leaveDialog: {
    title: "Keluar dari pelajaran ini?",
    description: "Jawabanmu sejauh ini tidak akan disimpan, dan kamu akan mulai dari awal lagi.",
    leave: "Keluar",
    stay: "Lanjutkan",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, tidak ada soal`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, soal ${ordinal} dari ${count}`,
  review: {
    intro: (count) => `Ayo perbaiki ${count} kesalahan`,
    remaining: (count) => `${count} lagi untuk lulus`,
    unlocked: "Sudah cukup untuk lulus",
    progress: (ordinal, total) => `Ulang ${ordinal} / ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}, ulang ${ordinal} dari ${total}`,
    formSuffix: " \u00b7 coba lagi",
    fixed: "Berhasil diperbaiki!",
    missed: "Belum tepat",
    missedLine: "Tidak apa-apa \u2014 lanjut saja.",
  },
};

export const specialUnitMapId: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `spesial, ${name}`,
};

export const progressLoadId: ProgressLoadCopy = {
  loading: "Memuat progresmu…",
  loadingAnnouncement: "Memuat progresmu",
  failed: "Tidak dapat memuat progresmu.",
  retry: "Coba lagi",
};

export const splashId: SplashCopy = {
  updating: "Memperbarui episode",
  updatingLabel: (percent) => `Memperbarui episode, ${percent}%`,
};
