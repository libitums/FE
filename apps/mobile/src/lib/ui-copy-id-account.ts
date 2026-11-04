// 인도네시아어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";

export const notificationsId: NotificationsCopy = {
  title: "Notifikasi",
  emptyTitle: "Belum ada notifikasi",
  emptyBody: "Kami akan memberi tahu kamu di sini saat ada yang baru.",
  deleteLabel: (message) => `${message}, hapus`,
  destination: {
    "roleplay-list": "Lihat daftar bermain peran",
  },
};

export const settingsId: SettingsCopy = {
  title: "Pengaturan",
  group: { account: "Akun", learning: "Belajar", accountActions: "Tindakan akun" },
  nav: {
    profile: "Profil pengguna",
    "learner-profile": "Nama dan negara dalam pelajaran",
    language: "Bahasa",
    download: "Unduhan",
    notifications: "Notifikasi",
    feedback: "Kirim masukan",
    "privacy-policy": "Kebijakan Privasi",
    "terms-of-use": "Ketentuan Penggunaan",
  },
  downloads: {
    title: "Unduhan",
    caption: "Pilih kapan gambar dan audio diunduh.",
    mobileDataHeading: "Unduh dengan data seluler",
    policy: { ask: "Tanya setiap kali", always: "Selalu unduh", "wifi-only": "Hanya Wi-Fi" },
    offlineHeading: "Offline",
    downloadAll: "Unduh semua untuk offline",
    downloadAllCaption: "Gambar dan audio semua episode, agar kamu bisa belajar tanpa koneksi.",
    downloadAllStarted: "Sedang mengunduh di latar belakang. Kamu bisa terus belajar.",
    downloaded: (size) => `Sudah diunduh: ${size}`,
    confirm: {
      title: "Unduh dengan data seluler?",
      description:
        "Mengunduh semua episode bisa memakai banyak data. Kamu juga bisa menunggu Wi-Fi.",
      download: "Unduh sekarang",
      cancel: "Batal",
    },
  },
  sessionOption: { "auto-play-audio": "Putar otomatis", "show-transcript": "Tampilkan transkrip" },
  optionState: { on: "aktif", off: "nonaktif" },
  action: { "sign-out": "Keluar", "delete-account": "Hapus akun" },
  signOutDialog: { title: "Keluar?", confirm: "Keluar", cancel: "Tetap masuk" },
  deleteDialog: {
    title: "Hapus akun kamu?",
    description:
      "Akun dan kemajuan belajar kamu akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    confirm: "Hapus akun",
    cancel: "Simpan akun",
  },
  deleteFailure: {
    network: "Akun kamu tidak dapat dihapus. Periksa koneksi kamu lalu coba lagi.",
    other: "Akun kamu tidak dapat dihapus. Silakan coba lagi.",
  },
  exitAnnouncement: { "signed-out": "Kamu telah keluar.", deleted: "Akun kamu telah dihapus." },
  version: (name, build) => `Versi ${name} (${build})`,
};

export const appUpdateId: AppUpdateCopy = {
  title: "Perbarui Duru untuk melanjutkan",
  description:
    "Versi Duru ini tidak lagi didukung. Dapatkan versi terbaru dari toko aplikasi agar bisa terus belajar.",
  update: "Perbarui",
  failure:
    "Toko aplikasi tidak dapat dibuka. Silakan perbarui Duru dari App Store atau Google Play.",
};

export const feedbackId: FeedbackCopy = {
  title: "Kirim masukan",
  ratingQuestion: "Bagaimana Duru sejauh ini?",
  ratingOption: {
    1: "Kurang bagus",
    2: "Bisa lebih baik",
    3: "Lumayan",
    4: "Bagus",
    5: "Suka sekali",
  },
  messageLabel: "Ada hal lain yang ingin kamu sampaikan? (opsional)",
  send: "Kirim",
  sent: "Terima kasih! Masukan kamu sudah kami terima.",
  failed: "Masukan kamu tidak dapat dikirim. Silakan coba lagi.",
  survey: {
    title: "Bagaimana episode ini?",
    description: (episodeTitle) =>
      `Kamu telah menyelesaikan ${episodeTitle}. Ceritakan pendapat kamu.`,
    skip: "Nanti saja",
  },
};

export const profileId: ProfileCopy = {
  notProvided: "Belum diisi",
  learningLanguage: "Korea",
  title: "Profil pengguna",
  itemLabel: {
    name: "Nama",
    "learning-language": "Bahasa yang dipelajari",
    email: "Email",
    phone: "Nomor telepon",
  },
};

export const gemPurchaseId: GemPurchaseCopy = {
  packAmount: (_count, display) => `${display} permata`,
  balance: (_count, display) => `Kamu punya ${display} permata`,
  paymentMethod: "Metode pembayaran",
  notice: {
    title: "Pembayaran segera hadir",
    description: "Pembayaran permata belum tersedia. Silakan cek kembali nanti.",
  },
};
