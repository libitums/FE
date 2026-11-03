// 인도네시아어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode · 로그인 실패).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈입니다(임시 문구).
export const onboardingId: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "dengan",
      titleEmphasis: "Cerita",
      body: "Ikuti momen sehari-hari dalam sebuah cerita\ndan belajar bahasa Korea sambil jalan.",
    },
    1: {
      title: "Latih",
      titleEmphasis: "Bahasa Korea",
      body: "Latih percakapan nyata dan\ncek hasil belajar dengan kuis singkat.",
    },
    2: {
      title: "Hanya",
      titleEmphasis: "5 menit",
      body: "Unit harian yang singkat cocok dengan harimu.\nSelesaikan satu unit hanya dalam lima menit.",
    },
  },
  next: "Berikutnya",
  getStarted: "Mulai",
  progress: (ordinal, total) => `Langkah ${ordinal} dari ${total}`,
  storyChat: {
    staff: "Staf",
    welcome: "Selamat datang! Sedang mencari sesuatu?",
    sunscreen: "Apakah ada tabir surya?",
    thisWay: "Ada, lewat sini.",
  },
  quiz: { replay: "Putar ulang", stop: "Berhenti", play: "Putar" },
  unit: {
    title: "Belanja di toko kosmetik",
    meta: "Unit 1 · 5 menit",
    status: { active: "Belajar", clear: "Selesai" },
  },
};

export const languageSelectId: LanguageSelectCopy = {
  title: "Pilih Bahasa",
  caption: "Pilih bahasa yang ingin kamu gunakan",
};

// 제목 · 안내 · 큰 제목은 자리표입니다(디자인 문구 확정 전).
export const journeyEntryId: JourneyEntryCopy = {
  title: "Perjalananmu menanti",
  display: "Mulai ceritamu",
  caption: "Jelajahi Seoul, temui orang baru, dan belajar bahasa Korea sambil jalan.",
  notice: "Beberapa gambar dalam layanan ini dibuat menggunakan teknologi AI",
  start: "Mulai",
};

export const loginId: LoginCopy = {
  method: {
    phone: "Lanjut",
    google: "Hubungkan dengan Google",
    apple: "Masuk dengan Apple",
    facebook: "Hubungkan dengan Facebook",
  },
  heading: {
    visible: {
      title: "Masuk atau Daftar dengan nomor telepon kamu",
      caption: "Masukkan nomor telepon kamu untuk melanjutkan",
    },
    hidden: { title: "Masuk atau Daftar", caption: "Pilih cara kamu ingin melanjutkan" },
  },
  countryCode: (name, dialCode) => `Kode negara, ${name} ${dialCode}`,
  phoneNumber: "Nomor telepon",
  or: "atau",
  countrySheetTitle: "Pilih negara",
  legal: {
    lead: "Dengan mendaftar, kamu menyetujui",
    termsOfUse: "Ketentuan Penggunaan",
    and: "&",
    privacyPolicy: "Kebijakan Privasi",
  },
};

export const verificationCodeId: VerificationCodeCopy = {
  title: "Kode verifikasi OTP",
  sentTo: "Kode verifikasi telah dikirim ke",
  digit: (ordinal, total) => `Digit ${ordinal} dari ${total}`,
  resendHint: "Belum menerima kode?",
  resend: "Kirim ulang",
  submit: "Lanjut",
};

export const authFailureId: AuthFailureCopy = {
  network: "Tidak dapat terhubung. Periksa koneksi kamu lalu coba lagi.",
  unavailable: "Terjadi kesalahan. Silakan coba lagi.",
  unconfigured: "Fitur masuk belum tersedia saat ini.",
  "rate-limited": "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  rejected: "Kami tidak dapat mengirim kode ke nomor ini. Periksa nomornya lalu coba lagi.",
  "invalid-code": "Kode salah atau sudah kedaluwarsa.",
  "sign-in-incomplete": "Proses masuk belum selesai. Silakan coba lagi.",
  unsupported: "Opsi masuk ini tidak tersedia di perangkat ini.",
};
