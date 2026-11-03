// 인도네시아어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileId: LearnerProfileCopy = {
  nameLabel: "Nama kamu",
  nameIssue: {
    empty: "Masukkan nama kamu.",
    "too-long": "Gunakan maksimal 30 karakter.",
    "forbidden-character": "Nama tidak boleh mengandung { atau }.",
  },
  countryLabel: "Negara",
  notSet: "Belum diatur",
  countryMissing: "Pilih negara kamu.",
  preview: {
    heading: { example: "Contoh", yours: "Kamu akan berkata" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "Contoh kalimat" : "Kamu akan berkata"}: ${ko} Artinya: ${en}`,
  },
  picker: {
    title: "Pilih negara",
    back: "Kembali",
    searchLabel: "Cari negara",
    clearSearch: "Hapus pencarian",
    allCountries: (count) => `${count} negara · cari dengan nama Inggris`,
    matches: (count) => `${count} hasil`,
    noMatches: "Tidak ada hasil. Periksa ejaan atau coba nama yang lebih pendek.",
    noMatchesAnnouncement: "Tidak ada hasil",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `Negara diatur ke ${en}`,
  },
  signup: {
    continue: "Lanjut",
    back: "Kembali",
    name: {
      title: "Siapa nama kamu?",
      caption: "Nama ini akan kami masukkan ke kalimat yang kamu latih",
      helper: "Kami sudah memilihkan satu nama — pakai, acak ulang, atau ketik sendiri.",
      shuffle: "Acak",
      shuffleLabel: "Pilih nama acak lainnya",
      previewHeading: "Dalam pelajaran akan terdengar seperti",
    },
    country: {
      title: "Kamu berasal dari mana?",
      caption: "Kamu akan mengatakannya saat bertemu orang dalam cerita",
      searchPlaceholder: (count) => `Cari ${count} negara`,
      allCountries: (count) => `SEMUA NEGARA · ${count}`,
      jumpTo: (letter) => `Loncat ke ${letter}`,
      jumpBar: "Loncat ke huruf",
    },
  },
  settings: {
    title: "Nama dan negara",
    body: "Dipakai dalam kalimat yang kamu latih. Perubahan berlaku mulai pelajaran berikutnya yang kamu buka.",
    submit: "Simpan",
    saved: "Tersimpan",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) =>
      `${summary}. Tersimpan di perangkat ini. Akan kami sinkronkan saat kamu kembali online.`,
  },
};
