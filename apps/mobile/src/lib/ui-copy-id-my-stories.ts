// 내 스토리 문구(id, ADR-0194).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";
import { storyPhotoId } from "./ui-copy-story-photo";

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
    next: "Cerita berikutnya",
    nextLabel: (time) => `Cerita berikutnya dibuka pukul ${time}`,
  },
  guide: {
    title: "Bagikan satu kata bahasa Korea",
    body: "Teman-temanmu di sini akan membalas — setiap cerita jadi latihan kecil bahasa Korea.",
    steps: [
      { title: "Pilih kata", body: "Dari kata yang kamu simpan." },
      {
        title: "Teman membalas dalam satu jam",
        body: "Balasan mereka muncul di obrolan masing-masing teman.",
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
    emptyWords: "Belum ada kata yang disimpan. Kata dari pelajaranmu akan muncul di sini.",
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", dipilih" : ""}`,
    posting: "Membagikan…",
    dailyLimit: "Kamu sudah cukup banyak berbagi cerita hari ini. Coba lagi besok.",
    windowUsed: (time) =>
      time === null
        ? "Kamu sudah membagikan cerita di waktu ini."
        : `Kamu sudah membagikan cerita di waktu ini. Cerita berikutnya dibuka pukul ${time}.`,
    failed: "Ceritamu gagal dibagikan. Coba lagi.",
    checkLimit: "Kamu sudah cukup banyak mencoba hari ini. Coba lagi besok.",
    invalid: "Cerita ini tidak bisa dibagikan. Coba ubah dulu.",
  },
  viewer: {
    yourStory: "Ceritamu",
    kindLabel: (kind) => (kind === "word" ? "Kartu kata" : "Kartu pelajaran"),
    textLabel: "Cerita teks",
    cardTag: (kind) => (kind === "word" ? "KOSAKATAKU HARI INI" : "KARTU PELAJARAN"),
    close: "Tutup",
    options: "Pilihan cerita",
    delete: "Hapus cerita",
    replied: (count) => (count === 0 ? "Belum ada balasan" : `${count} teman membalas`),
    seenBy: (count) => `Dilihat ${count}`,
    seenByLabel: (count) => `Dilihat oleh ${count} teman`,
    openChat: "Buka obrolan",
    openChatLabel: (name) => `Buka obrolan dengan ${name}`,
    saved: "Balasan disimpan di obrolan masing-masing teman.",
    waiting: "Teman biasanya membalas dalam satu jam.",
    waitingBody:
      "Kami akan memberitahumu. Balasan muncul di sini dan di obrolan masing-masing teman.",
    noFriendsTitle: "Tambahkan teman untuk mendapat balasan",
    noFriendsBody: "Mulai mengobrol dengan seseorang dulu — lalu dia akan melihat ceritamu.",
    findFriends: "Cari teman",
    hidden: "Teman melihat ini selama 24 jam. Sekarang hanya kamu yang melihatnya.",
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
    swipeUp: "Geser ke atas untuk melihat balasan",
    noViews: "Belum ada yang melihat",
    showReplies: "Lihat balasan",
  },
  window: {
    title: (slot) =>
      `Kamu sudah membagikan cerita ${slot === "morning" ? "pagi" : slot === "day" ? "siang" : "malam"} ini`,
    body: (time) =>
      `Satu cerita setiap pagi, siang, dan malam. Cerita berikutnya dibuka pukul ${time}.`,
    slot: (slot) => (slot === "morning" ? "Pagi" : slot === "day" ? "Siang" : "Malam"),
    range: (start, end) => `${start} – ${end}`,
    time: (hour, minute) => `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")}`,
    shared: "Dibagikan",
    missed: "Terlewat",
    open: "Terbuka sekarang",
    opens: (time) => `Dibuka ${time}`,
    slotLabel: (slot, range, state) => `${slot}, ${range}, ${state}`,
    ok: "Oke",
    close: "Tutup",
  },
  photo: storyPhotoId,
  start: {
    title: "Cerita baru",
    close: "Tutup",
    camera: "Kamera",
    background: "Latar",
    recent: "Foto terbaru",
  },
  editor: {
    label: "Editor cerita",
    back: "Kembali",
    colors: "Warna latar",
    color: (background) =>
      background === "orange"
        ? "Oranye"
        : background === "green"
          ? "Hijau"
          : background === "blue"
            ? "Biru"
            : "Ungu",
    colorLabel: (name, on) => `${name}${on ? ", dipilih" : ""}`,
    text: "Teks",
    words: "Kata",
    share: "Bagikan ke teman",
    posting: "Membagikan…",
    hintOne: "Tambahkan satu kata untuk membagikannya.",
    hintOneText: "Tambahkan kata atau tulis satu kalimat untuk membagikannya.",
    hintMove: "Seret untuk memindahkan, cubit untuk mengubah ukuran.",
    stickerLabel: (ko, meaning) => `${ko}, ${meaning}`,
    remove: (ko) => `Hapus ${ko}`,
    textBlocked: "Teks ini tidak bisa dibagikan. Coba kata lain.",
  },
  textEntry: {
    label: "Teks cerita, bahasa Korea atau Inggris",
    help: "Korea atau Inggris — kami bantu",
    done: "Selesai",
    colors: "Warna teks",
    color: (textColor) =>
      textColor === "brown"
        ? "Cokelat"
        : textColor === "black"
          ? "Hitam"
          : textColor === "white"
            ? "Putih"
            : "Oranye",
    colorLabel: (name, on) => `${name}${on ? ", dipilih" : ""}`,
    editLabel: (ko) => `Ubah teks: ${ko}`,
  },
  add: {
    title: "Tambahkan kata",
    hint: "Ketuk kata untuk menaruhnya. Maksimal 8 per cerita.",
    hintOne: "Ketuk kata untuk menaruhnya.",
  },
  quiz: {
    free: "Jawaban kuis gratis",
    freeAnswer: "Gratis · jawaban kuis",
    lastTry: "Gratis · kesempatan terakhir",
    correct: (name) => `Benar! Kamu dan ${name} jadi lebih akrab`,
  },
  remove: {
    title: "Hapus cerita ini?",
    body: (count) =>
      `Kartumu dan ${replies(count)} di dalamnya akan dihapus. Pesan di obrolanmu tetap ada, dengan catatan “Cerita dihapus”. Ini tidak bisa dibatalkan.`,
    allTitle: "Hapus semua cerita?",
    allBody:
      "Semua ceritamu dan balasan di dalamnya akan dihapus. Pesan di obrolanmu tetap ada, dengan catatan “Cerita dihapus”. Ini tidak bisa dibatalkan.",
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
    deleteAllNote: "Kartumu dan balasan di dalamnya dihapus dari server kami.",
    empty: "Belum ada cerita. Ketuk + di atas obrolanmu untuk membagikan kata.",
    today: "Hari ini",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "Kamu menjawab tentang ceritamu",
    reacted: "Membalas ceritamu",
    deleted: "Cerita dihapus",
    deletedLabel: "Balasan untuk cerita yang dihapus",
  },
};
