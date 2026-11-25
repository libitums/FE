// 메신저 문구 표의 덧붙는 칸(id) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";
import { messengerChatMediaId } from "./ui-copy-id-chat-media";
import { messengerChatAlbumId } from "./ui-copy-id-chat-album";
import { messengerChatSuggestedId } from "./ui-copy-id-chat-suggested";
import { messengerChatStoriesId } from "./ui-copy-id-chat-stories";

export const messengerChatExtraId: MessengerChatExtraCopy = {
  media: messengerChatMediaId,
  album: messengerChatAlbumId,
  suggested: messengerChatSuggestedId,
  stories: messengerChatStoriesId,
  access: {
    signInTitle: "Kirim pesan ke orang yang kamu temui",
    signInBody:
      "Buat akun gratis untuk mengobrol dalam bahasa Korea dengan orang-orang dari ceritamu. Progresmu tetap tersimpan.",
    signIn: "Daftar atau masuk",
    promptTitle: "Masuk untuk mengirim pesan",
    promptBody:
      "Buat akun gratis untuk mengobrol dengan orang-orang dari ceritamu. Progresmu tetap tersimpan.",
    promptLater: "Nanti saja",
    promptKeepBody: "Buat akun gratis untuk menyimpan Yeopjeon dan tiketmu.",
  },
  pushNotice: { chatUnavailable: "Obrolan ini sedang tidak tersedia." },
  newMessages: {
    label: ({ count, latest }) =>
      latest === "photo"
        ? count === 1
          ? "Mengirim foto"
          : `Mengirim foto · ${count} baru`
        : latest === "voice"
          ? count === 1
            ? "Mengirim pesan suara"
            : `Mengirim pesan suara · ${count} baru`
          : count === 1
            ? "Pesan baru"
            : `${count} pesan baru`,
    jump: "Lompat ke pesan baru",
    latest: "Gulir ke pesan terbaru",
  },
  chatSettings: {
    entryTitle: "Obrolan",
    entryDescription: "Ide balasan, pesan dari karakter, ingatan",
    title: "Obrolan",
    back: "Kembali",
    sectionWhile: "Saat mengobrol",
    replyIdeas: "Ide balasan",
    replyIdeasBody: "Tampilkan 1–2 saran balasan setelah setiap pesan",
    sectionProactive: "Pesan dari karakter",
    proactive: "Mereka mengirim pesan lebih dulu",
    sectionAbout: "Tentang kamu",
    sharedMemories: "Yang diketahui semua karakter tentangmu",
    sharedMemoriesSummary: (count) => `${count} ingatan · dibagikan ke semua karakter`,
    footnote:
      "Setiap karakter juga mengingat hal dari obrolan denganmu. Buka obrolan dan ketuk ☰ untuk melihatnya.",
    proactiveSheet: {
      title: "Mereka mengirim pesan lebih dulu",
      body: "Kalau kamu lama tidak mengobrol, karakter bisa memulai obrolan. Tidak pernah memakai koin.",
      howOften: "Seberapa sering",
      prefs: { off: "Mati", daily1: "Sekali sehari", daily2: "Dua kali sehari" },
      preferredTime: "Waktu pilihan",
      anyTime: "Kapan saja",
      hour: (hour) => `${String(hour).padStart(2, "0")}.00`,
      quietNote:
        "Tidak ada pesan antara pukul 22.00 dan 08.00 waktumu. Jika dua kali sehari, pesan kedua datang sekitar 10 jam kemudian.",
      save: "Simpan",
      close: "Tutup",
    },
    memories: {
      titleShared: "Yang diketahui semua karakter tentangmu",
      titleCharacter: (name) => `Yang diingat ${name}`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "Ingatan penuh",
      fullBody: (name) =>
        `${name ?? "Karakter"} tidak bisa mengingat hal baru sampai kamu menghapus beberapa. Ingatan yang kamu ubah tetap disimpan.`,
      intro: (name) =>
        `${name ?? "Semua karakter"} memakainya agar obrolanmu lebih personal. Hanya kamu yang melihat daftar ini. Mengubah atau menghapus gratis.`,
      empty: (name) =>
        `Belum ada. ${name ?? "Karakter"} akan mengingat hal yang kamu ceritakan saat mengobrol.`,
      edited: "Diubah",
      edit: "Ubah ingatan",
      delete: "Hapus ingatan",
      editTitle: "Ubah ingatan",
      editHint: (name) => `${name ?? "Karakter"} akan mengingatnya persis seperti yang kamu tulis.`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "Batal",
      save: "Simpan",
      deleteTitle: "Hapus ingatan ini?",
      deleteBody: (name) => `${name ?? "Karakter"} tidak akan memakainya mulai pesan berikutnya.`,
      deleteConfirm: "Hapus",
      sidebar: (name) => `Yang diingat ${name}`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · penuh` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "Gaya koreksi",
      title: "Gaya koreksi",
      body: (name) =>
        `Cara ${name} membantu saat bahasa Koreamu ada yang salah. Kartu koreksi selalu muncul — ini mengubah cara ${name} membalas.`,
      modes: {
        separate: {
          title: "Kartu saja",
          body: (name) => `${name} tetap mengobrol. Perbaikannya ada di ✎ di bawah pesanmu.`,
        },
        natural: {
          title: "Alami di dalam balasan",
          body: (name) => `${name} memakai ungkapan yang benar dalam jawabannya, seperti teman.`,
        },
        prefix: {
          title: "Tunjukkan dulu",
          body: (name) => `${name} mengoreksi singkat, lalu melanjutkan obrolan.`,
        },
      },
      defaultTag: "bawaan",
      note: "Berlaku untuk semua karakter mulai pesan berikutnya.",
      save: "Simpan",
      close: "Tutup",
    },
  },
  feedback: {
    titles: { correction: "PERBAIKAN", better: "LEBIH ALAMI", l1_to_ko: "DALAM BAHASA KOREA" },
    sendCorrected: "Kirim yang benar",
    sendInKorean: "Kirim dalam bahasa Korea",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "Balasan bagus",
    bad: "Balasan buruk",
    goodSelected: "Balasan bagus, dipilih",
    badSelected: "Balasan buruk, dipilih",
    liked: "Kamu menyukai ini",
    flagged: "Kamu menandai ini",
    sheet: {
      title: "Apa yang salah?",
      body: (name) => `Pilih yang sesuai. Ini membantu ${name} membalas lebih baik.`,
      reasons: {
        awkward_korean: () => "Bahasa Koreanya tidak alami",
        out_of_character: (name) => `Tidak terdengar seperti ${name}`,
        too_hard: () => "Terlalu sulit untukku",
        uncomfortable: () => "Membuatku tidak nyaman",
        other: () => "Hal lain",
      },
      reportPrompt: "Mau kami periksa pesan ini?",
      report: "Laporkan",
      noteLabel: "Ceritakan lebih lanjut (opsional)",
      notePlaceholder: "Tambahkan catatan",
      send: "Kirim",
      close: "Tutup",
    },
  },
  guide: {
    cardTitle: (name) => `Halo! Aku ${name}.`,
    cardBody: "Di sini kamu mengobrol dengan teman Korea. Mulai denganku — aku bantu.",
    cardButton: (name) => `Ngobrol dengan ${name}`,
    steps: {
      ideas: "Bingung mau bilang apa? Ketuk lampu di samping kotak pesan untuk ide balasan.",
      media: "Kamu juga bisa minta foto atau pesan suara lewat tombol di atas keyboard.",
      sample:
        "Mau lihat aku lagi apa? Ketuk Snapshot dan aku kirim foto. Yang pertama gratis dariku.",
      voice:
        "Mau dengar suaraku? Ketuk Suara kilat dan aku bacakan pesan itu. Yang pertama juga gratis dariku.",
    },
    keyboard: {
      phone: {
        title:
          "Ngobrol pakai bahasamu sendiri — aku tunjukkan cara mengatakannya dalam bahasa Korea.",
        body: "Selanjutnya, coba ketik bahasa Korea sendiri.",
      },
      hangul: {
        title: "Atau ketik bahasa Korea langsung di sini dengan Tombol Hangul.",
        body: "Tidak perlu keyboard Korea. Ganti kapan saja lewat tombol di bawah kotak pesan.",
      },
    },
    next: "Berikutnya",
    done: "Mengerti",
    skip: "Lewati",
    stepOf: (step, total) => `${step} dari ${total}`,
    newTag: "Baru",
    free: "GRATIS",
  },
  launch: {
    newTag: "BARU",
    coinsTitle: "Kenalan dengan Yeopjeon, koin obrolanmu",
    coinsBody:
      "Yeopjeon adalah koin untuk mengobrol dengan teman Korea-mu. Ini yang sudah kamu kumpulkan.",
    fromEpisodes: "Dari episode yang sudah kamu selesaikan",
    launchBonus: "Bonus peluncuran",
    balance: "Saldomu",
    perLesson: "Setiap pelajaran yang pertama kali kamu selesaikan menambah 5.",
    gotIt: "Mengerti",
    chatTitle: "Kirim pesan ke teman yang kamu temui",
    chatBody:
      "Siapa pun yang kamu temui di episode bisa jadi teman ngobrol. Selesaikan lebih banyak episode untuk bertemu lebih banyak orang.",
    met: "Sudah kenal",
    now: "Sekarang",
    episode: (order) => `Ep ${order}`,
    metCount: (met, total) => `${met} dari ${total} teman sudah kamu temui`,
    prices: "Pesan 3 · suara 15 · foto 35",
    later: "Nanti",
    start: "Mulai mengobrol",
  },
  remote: {
    noCredits: (name) => `Kredit untuk mengobrol dengan ${name} sudah habis.`,
    notAvailable: (name) => `Kamu belum bisa mengobrol dengan ${name}.`,
    sendFailed: "Pesan tidak terkirim. Coba lagi.",
    replyFailed: (name) => `${name} belum bisa membalas sekarang.`,
    cantReply: (name) => `${name} tidak bisa membalas itu. Coba katakan dengan cara lain.`,
    rateLimited: "Kamu mengirim terlalu cepat. Tunggu sebentar, lalu kirim lagi.",
    updateRequired: "Perbarui aplikasi untuk terus mengobrol.",
    serverError: "Ada masalah di pihak kami. Coba lagi nanti.",
    signedOut: "Kamu telah keluar, jadi pesan ini tidak terkirim.",
    notSent: "Tidak terkirim",
    sendAgain: "Kirim lagi",
    unsentTitle: "Pesan tidak terkirim",
    unsentDescription: "Kirim lagi atau hapus.",
    deleteUnsent: "Hapus",
    cancel: "Batal",
    recovering: "Mengambil sisa balasan…",
    stalled: "Balasan tidak selesai.",
    refresh: "Muat ulang",
    loadFailedTitle: "Obrolan tidak bisa dimuat",
    loadFailedBody: "Periksa koneksimu, lalu coba lagi.",
    loadFailedNew: "Pesan baru tidak bisa dimuat.",
    tryAgain: "Coba lagi",
  },
};
