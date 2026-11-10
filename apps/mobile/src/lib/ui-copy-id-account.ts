// 인도네시아어 문구표 구획 — 계정 · 기타(notifications ~ coinShop).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  CoinShopCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

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
    episodeRow: (n, d, t) => `Episode ${n}: ${d} dari ${t} pelajaran`,
    episodeRowComplete: (n) => `Episode ${n}: selesai`,
    downloadRest: (n) => `Unduh sisa Episode ${n}`,
    confirm: {
      title: "Unduh dengan data seluler?",
      description:
        "Mengunduh semua episode bisa memakai banyak data. Kamu juga bisa menunggu Wi-Fi.",
      download: "Unduh sekarang",
      cancel: "Batal",
      restDescription: (n) =>
        `Sisa Episode ${n} diunduh dengan data seluler. Kamu juga bisa menunggu Wi-Fi.`,
    },
  },
  sessionOption: {
    "auto-play-audio": "Putar otomatis",
    "show-transcript": "Tampilkan transkrip",
    "show-choice-romanization": "Romanisasi pada pilihan",
    vibration: "Getar",
  },
  sessionOptionDescription: {
    "show-choice-romanization":
      "Tampilkan cara membaca tiap jawaban berbahasa Korea dalam teks kecil di atasnya.",
    vibration: "Bergetar saat jawabanmu benar atau salah dan saat mengetik di keyboard.",
  },
  optionState: { on: "aktif", off: "nonaktif" },
  action: {
    "sign-in": "Masuk",
    "sign-out": "Keluar",
    "delete-account": "Hapus akun",
  },
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

export const coinShopId: CoinShopCopy = {
  title: "Yeopjeon",
  subtitle: "Koin kuningan Korea kuno",
  balanceLabel: "Kamu punya",
  balance: (_count, display) => `Kamu punya ${display} koin`,
  pickTitle: "Pilih kantong",
  pickCaption: "Dapatkan koin dari pelajaran, atau tambah di sini.",
  packName: { bundle: "Untaian koin", pouch: "Kantong koin", big: "Kantong besar" },
  coinsUnit: "KOIN",
  packAmount: (_count, display) => `${display} koin`,
  bonus: (display) => `+${display} bonus`,
  bestValue: "PALING HEMAT",
  buy: (price) => `Beli seharga ${price}`,
  storeNote: "Ditagihkan ke akun toko aplikasimu.",
  openShop: (count) => `${count} koin, tambah koin`,
  notice: {
    title: "Pembayaran segera hadir",
    description: "Pembelian koin belum tersedia. Silakan cek kembali nanti.",
  },
};

export const downloadSheetId: DownloadSheetCopy = {
  askTitle: (n) => `Unduh Episode ${n}?`,
  askDescription:
    "Gambar dan audio episode ini belum ada di ponselmu. Mengunduh akan memakai data seluler.",
  size: (size) => `Sekitar ${size}`,
  downloadNow: "Unduh sekarang",
  onWifi: "Unduh saat Wi-Fi",
  wifiOnlyTitle: (n) => `Episode ${n} diunduh saat Wi-Fi`,
  wifiOnlyDescription:
    "Kamu memilih Hanya Wi-Fi di Pengaturan. Pakai data seluler sekali ini saja, buka tanpa gambar dan audio, atau ubah pengaturan.",
  ok: "OK",
  offlineTitle: "Kamu sedang offline",
  offlineDescription: (n) =>
    `Episode ${n} belum diunduh. Episode ini akan diunduh saat kamu online lagi.`,
  openAnyway: "Tetap buka",
  close: "Tutup",
  askUnitTitle: (l) => `Unduh ${l}?`,
  askUnitDescription:
    "Gambar dan audio pelajaran ini belum ada di ponselmu. Mengunduh akan memakai data seluler.",
  rows: {
    common: "Gambar dan audio bersama",
    allLessons: "Semua pelajaran di episode ini",
    otherLessons: "Pelajaran lainnya",
    status: { done: "Ada di ponselmu", pending: "Diunduh sekarang", wifi: "Lewat Wi-Fi" },
  },
  askHint: "Kamu akan ditanya setiap kali. Ubah di Pengaturan › Unduhan.",
  wifiOnlyUnitTitle: (l) => `${l} diunduh saat Wi-Fi`,
  mobileDataOnce: "Pakai data seluler sekali ini",
  openWithout: "Buka tanpa gambar dan audio",
  changeSetting: "Ubah pengaturan",
  offlineUnitDescription: (l) =>
    `${l} belum diunduh. Pelajaran ini akan diunduh saat kamu online lagi.`,
  offlineHint: "Gambar tampil sebagai warna polos dan soal mendengarkan dilewati.",
  allCleared: {
    title: "Kamu sudah menyelesaikan semua cerita di sini",
    description: "Mungkin ada episode baru. Sambungkan ke internet, nanti kami cek untukmu.",
    offline: "Kamu sedang offline",
    lastChecked: (d) =>
      d === null
        ? "Belum pernah dicek"
        : d === 0
          ? "Terakhir dicek hari ini"
          : d === 1
            ? "Terakhir dicek kemarin"
            : `Terakhir dicek ${d} hari lalu`,
    checkNow: "Cek sekarang",
    later: "Nanti",
    autoNote: "Kami juga akan mengecek otomatis saat kamu online lagi.",
    offlineHint: "Kami akan mengecek begitu kamu tersambung.",
  },
};
