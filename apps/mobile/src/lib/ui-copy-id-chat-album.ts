// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(id, ADR-0150).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const messengerChatAlbumId: ChatAlbumCopy = {
  sidebarRow: "Album",
  sidebarDescription: "Foto dan pesan suara",
  title: (name) => `Album ${name}`,
  back: "Kembali",
  tabs: { all: "Semua", photos: "Foto", voice: "Suara" },
  day: (day) =>
    day.kind === "today"
      ? "Hari ini"
      : day.kind === "yesterday"
        ? "Kemarin"
        : `${day.day} ${MONTHS[day.month - 1] ?? ""}`,
  drawing: "Menggambar…",
  recording: "Merekam…",
  versions: (count) => `${count} versi`,
  version: (index, count) => `Versi ${index} dari ${count}`,
  pastChat: "Dari obrolan sebelumnya",
  keepNote: "Foto dan pesan suara tetap di sini walaupun kamu menghapus obrolan.",
  empty: (name) => `Foto dan pesan suara dari ${name} akan muncul di sini.`,
  loadFailed: "Album tidak bisa dimuat.",
  tryAgain: "Coba lagi",
  more: "Lihat lagi",
  photoLabel: (name, line) => (line === "" ? `Foto dari ${name}` : `Foto dari ${name}, ${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `Pesan suara dari ${name}` : `Pesan suara dari ${name}, ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "Dari obrolanmu",
  close: "Tutup",
  redraw: (price) => `Gambar ulang · ${price}`,
  recordAgain: (price) => `Rekam ulang · ${price}`,
  play: "Putar",
  pause: "Jeda",
  redrawTitle: "Gambar ulang foto ini?",
  redrawBody: (name) => `${name} akan menggambar momen ini lagi. Kedua foto tetap ada di albummu.`,
  recordTitle: "Rekam ulang?",
  recordBody: (name) => `${name} akan mengucapkan kalimat ini lagi dalam rekaman baru.`,
  confirmRedraw: (price) => `Gambar ulang dengan ${price} Yeopjeon`,
  confirmRecord: (price) => `Rekam dengan ${price} Yeopjeon`,
  balance: (coins) => `Kamu punya ${coins} Yeopjeon`,
  getCoins: "Dapatkan Yeopjeon",
  cancel: "Batal",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "Yeopjeon-mu tidak cukup.";
      case "busy":
        return photo
          ? `${name} masih mengerjakan foto lain.`
          : `${name} masih merekam pesan suara lain.`;
      case "limit":
        return "Kamu sudah mencapai batas hari ini. Coba lagi nanti.";
      case "not-eligible":
        return photo ? "Foto ini tidak bisa digambar ulang." : "Pesan suara ini tidak bisa direkam ulang.";
      default:
        return "Permintaanmu tidak terkirim. Coba lagi.";
    }
  },
  selfSection: "Tentang kamu",
  selfRow: "Kamu di foto",
  selfTitle: "Kamu di foto",
  selfBody: "Saat karakter mengirim foto, kamu bisa muncul di dalamnya. Wajahmu tidak pernah digambar.",
  selfAsk: "Kamu mau tampil seperti apa?",
  selfAskNote: "Selalu dari belakang, tanpa wajah. Ubah nanti di Pengaturan › Chats.",
  selfOptions: {
    female: { title: "Perempuan", body: "Terlihat dari belakang" },
    male: { title: "Laki-laki", body: "Terlihat dari belakang" },
    hidden: { title: "Tangan saja", body: "Hanya tangan atau bahumu" },
  },
  save: "Simpan",
};
