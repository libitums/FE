// 인도네시아어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroId: EpisodeIntroCopy = {
  guide: {
    map: "Ketuk untuk memulai pelajaran!",
    continue: "Ketuk di mana saja untuk melanjutkan",
  },
  skipDialog: {
    title: "Lewati ceritanya?",
    description: "Jika dilewati, cerita episode ini tidak akan muncul lagi.",
    skip: "Lewati",
    keepWatching: "Terus tonton",
  },
};

export const messengerId: MessengerCopy = {
  keyboard: {
    shift: "Shift",
    shiftOn: "Shift, aktif",
    backspace: "Hapus",
    period: "Titik",
    space: "Spasi",
    questionMark: "Tanda tanya",
  },
};

export const visualNovelId: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `Adegan ${ordinal} / ${total}`,
};

export const roleplayId: RoleplayCopy = {
  title: "Bermain peran",
  form: { story: "Bermain peran" },
  viewAll: "Lihat semua",
  viewAllLabel: (sectionLabel) => `Lihat semua, ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "Latihan situasi serupa",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} Bermain peran Plus, latihan situasi serupa dengan episode ini`,
  plusDialogTitle: "Bermain peran Plus",
  lockedSection: (name) =>
    `${name}, terkunci, selesaikan episode ini di perjalananmu untuk membukanya`,
  premiumLock: { episode: "terkunci", payment: "Khusus Plus" },
  premiumNotice: (itemTitle) => `“${itemTitle}” adalah bermain peran Plus. Plus belum tersedia.`,
};

export const storyMessengerId: StoryMessengerCopy = {
  back: "Kembali ke peta",
  typing: (speaker) => `${speaker} sedang mengetik`,
  replyTitle: "Kamu mau membalas apa?",
  closeReply: "Tutup",
  send: "Kirim",
  composerPlaceholder: "Pesan",
  finish: "Selesaikan cerita",
};

export const storyIntroId: StoryIntroCopy = {
  overline: (ordinal) => `CERITA · EPISODE ${ordinal}`,
  back: "Kembali ke peta",
  skip: "Lewati",
  start: "Mulai",
  skipDialog: {
    title: "Lewati ceritanya?",
    description: "Kamu bisa menontonnya lagi kapan saja dari peta.",
    skip: "Lewati",
    keepWatching: "Terus tonton",
  },
};

export const storyCallId: StoryCallCopy = {
  incoming: "Panggilan masuk",
  answer: "Jawab",
  connecting: "Menghubungkan…",
  callEnded: (clock) => `Panggilan berakhir · ${clock}`,
  me: "Saya",
  mute: "Bisukan",
  speaker: "Speaker",
  end: "Akhiri",
  back: "Kembali ke peta",
  finish: "Selesaikan cerita",
};
