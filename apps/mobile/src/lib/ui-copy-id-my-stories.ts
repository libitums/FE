// 내 스토리 문구(id, ADR-0179).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => `${count} balasan`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const LIVE = "AKTIF";

export const myStoriesId: MyStoriesCopy = {
  language: "id",
  row: {
    create: "Baru",
    createLabel: "Buat cerita baru",
    mine: "Ceritamu",
    mineLabel: (count, unseen) =>
      `Ceritamu, ${replies(count)}${unseen ? ", ada balasan baru" : ""}`,
  },
  guide: {
    title: "Bagikan satu kata bahasa Korea",
    body: "Teman-temanmu di sini akan membalas — setiap cerita jadi latihan kecil bahasa Korea.",
    steps: [
      {
        title: "Pilih kata atau kartu pelajaran",
        body: "Dari kata yang kamu simpan atau dari pelajaranmu.",
      },
      {
        title: "Teman membalas sepanjang hari",
        body: "Mereka memakai katamu. Ketuk Jawab untuk melanjutkan obrolan.",
      },
      {
        title: "Hanya teman duru-mu yang melihatnya",
        body: "Orang lain tidak pernah melihatnya. Hapus kapan saja di Pengaturan › Ceritaku.",
      },
    ],
    start: "Buat cerita pertamaku",
    later: "Nanti saja",
    stepLabel: (n, title, body) => `${n}. ${title}. ${body}`,
  },
  composer: {
    title: "Cerita baru",
    close: "Tutup",
    tabsLabel: "Apa yang dibagikan",
    tab: (kind) => (kind === "word" ? "Kosakataku" : "Kartu"),
    wordsTitle: "Pilih kata yang kamu simpan",
    wordCount: (count) => `${count} kata`,
    all: "Semua",
    emptyWords: "Belum ada kata yang disimpan. Kata dari pelajaranmu akan muncul di sini.",
    emptyCards: "Selesaikan satu pelajaran untuk membagikan kartunya.",
    chipLabel: (label, on) => `${label}${on ? ", dipilih" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", dipilih" : ""}`,
    share: (ko) => `Buat kartu dengan ${ko}`,
    shareCard: "Bagikan kartu",
    posting: "Membagikan…",
    dailyLimit: "Kamu sudah cukup banyak berbagi cerita hari ini. Coba lagi besok.",
    failed: "Ceritamu gagal dibagikan. Coba lagi.",
  },
  viewer: {
    yourStory: "Ceritamu",
    kindLabel: (kind) => (kind === "word" ? "Kartu kata" : "Kartu pelajaran"),
    cardTag: (kind) => (kind === "word" ? "KOSAKATAKU HARI INI" : "KARTU PELAJARAN"),
    close: "Tutup",
    options: "Pilihan cerita",
    delete: "Hapus cerita",
    repliesTitle: "Teman memakai katamu",
    waiting: "Teman-temanmu akan membalas sepanjang hari.",
    hidden: "Teman melihat ini selama 24 jam. Sekarang hanya kamu yang melihatnya.",
    answer: (name) => `Jawab ${name}`,
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  remove: {
    title: "Hapus cerita ini?",
    body: (count) =>
      `Kartumu dan ${replies(count)} dari teman akan dihapus. Obrolan tetap menyimpan catatan “Cerita dihapus”. Ini tidak bisa dibatalkan.`,
    allTitle: "Hapus semua cerita?",
    allBody:
      "Semua ceritamu dan balasan teman akan dihapus. Obrolan tetap menyimpan catatan “Cerita dihapus”. Ini tidak bisa dibatalkan.",
    confirm: "Hapus",
    cancel: "Batal",
    failed: "Gagal menghapus. Coba lagi.",
  },
  archive: {
    entryTitle: "Ceritaku",
    entryDescription: "Kata dan kartu yang kamu bagikan",
    title: "Ceritaku",
    back: "Kembali ke Pengaturan",
    keep: "Simpan ceritaku setelah 24 jam",
    keepBody: "Teman melihat cerita selama 24 jam. Arsip ini hanya bisa kamu lihat.",
    count: (count) => `${count} cerita`,
    newest: "Terbaru dulu",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}, ${meaning}, ${date}, ${replies(count)}${live ? `, ${LIVE}` : ""}`,
    deleteOne: (date) => `Hapus cerita dari ${date}`,
    deleteToday: "Hapus cerita hari ini",
    deleteAll: "Hapus semua cerita",
    deleteAllNote: "Kartumu dan balasan teman dihapus dari server kami.",
    empty: "Belum ada cerita. Ketuk + di atas obrolanmu untuk membagikan kata.",
    today: "Hari ini",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "Kamu menjawab tentang ceritamu",
    replyingMine: "Menjawab tentang ceritamu",
    deleted: "Cerita dihapus",
    deletedLabel: "Balasan untuk cerita yang dihapus",
  },
};
