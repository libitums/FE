// 인도네시아어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryId: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)} dialog`,
  withCounterpart: (name) => `dengan ${name}`,
  previewBody: (name) =>
    `Mainkan adegan ini bersama ${name}. Jawab setiap dialog dengan suara keras.`,
  start: "Mulai bermain peran",
  lineProgress: (ordinal, total) => `Dialog ${String(ordinal)} / ${String(total)}`,
  me: "Saya",
  speak: "Bicara",
  stop: "Berhenti",
  listening: "Mendengarkan… Ketuk lagi jika sudah selesai.",
  showHint: "Lihat petunjuk",
  hint: (translation) => `Ucapkan: ${translation}`,
  cantSpeak: "Tidak bisa bicara sekarang",
  great: "Bagus",
  notQuite: "Belum tepat",
  youSaid: (heard) => `Kamu mengucapkan: ${heard}`,
  heardNothing: "Aku tidak menangkapnya.",
  unavailable: "Fitur bicara sedang tidak tersedia. Kamu bisa melewati dialog ini.",
  blocked:
    "Izinkan Mikrofon dan Pengenalan Ucapan untuk aplikasi ini di Pengaturan, atau lewati dialog ini.",
  permissionTitle: "Aktifkan mikrofon",
  permissionBody:
    "Bermain peran dilakukan dengan berbicara. Izinkan Mikrofon dan Pengenalan Ucapan untuk aplikasi ini di Pengaturan.",
  openSettings: "Buka Pengaturan",
  notNow: "Nanti saja",
  unsupportedTitle: "Fitur bicara tidak tersedia",
  unsupportedBody:
    "Pengenalan ucapan sedang tidak tersedia di perangkat ini. Kamu tetap bisa memainkan adegannya dan melewati setiap dialog.",
  startAnyway: "Tetap mulai",
  retryHeard: "Aku tidak menangkapnya. Ketuk mikrofon dan coba lagi.",
  playAgain: "Main lagi",
};
