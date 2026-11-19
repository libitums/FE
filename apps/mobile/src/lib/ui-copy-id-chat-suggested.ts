// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(id, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedId: SuggestedFriendsCopy = {
  language: "id",
  rowTitle: "Kenalan dengan teman baru",
  seeAll: "Lihat semua",
  seeAllLabel: "Lihat semua teman",
  newLabel: (name) => `${name}, teman baru`,
  lockedLabel: (name, episode) => `${name}, bertemu di Episode ${episode}`,
  earlyLabel: (name, episode, price) =>
    `${name}, bertemu di Episode ${episode} atau chat sekarang dengan ${price} koin`,
  sheetLabel: (name) => `${name}, profil`,
  newBadge: "BARU",
  startChatting: "Mulai chat",
  notNow: "Nanti saja",
  meetIn: (episode) => `Kamu akan bertemu di Episode ${episode}`,
  lockedInfo: (name) =>
    `Selesaikan ceritanya untuk bertukar nomor — ${name} akan mengirim pesan duluan.`,
  chatNow: (price) => `Chat sekarang · ${price}`,
  earlyButtonLabel: (price, left) =>
    `Chat sekarang dengan ${price} koin, penawaran terbatas${left === null ? "" : `, sisa ${left.days} hari ${left.hours} jam`}`,
  launchSpecial: (name) => `Spesial peluncuran · kenalan dengan ${name} lebih awal`,
  limited: "TERBATAS",
  limitedUntil: (days, hours) => `TERBATAS · ${days}h ${hours}j`,
  added: (name) => `${name} ditambahkan ke chat kamu`,
  addFailed: (name) => `Gagal menambahkan ${name}. Coba lagi.`,
  profile: {
    age: (years) => `${years} tahun`,
    ageDecade: (decade) => `${decade}-an`,
    ageRange: (from, to) => `${from}–${to} tahun`,
    facts: (parts) => parts.join(" · "),
    close: "Tutup",
    openProfile: (name) => `${name}, lihat profil`,
    voice: {
      hear: "Dengar suara",
      pause: "Jeda",
      resume: "Lanjutkan",
      loading: "Memuat…",
      unavailable: "Contoh suara tidak tersedia",
      label: (name) => `Dengar suara ${name}`,
    },
    adult: {
      title: "Sebelum menambahkan teman ini",
      body: (name) =>
        `${name} mungkin berbicara dengan nada romantis seperti pasangan. Pastikan kamu sudah dewasa.`,
      confirm: "Saya sudah dewasa",
      cancel: "Lewati",
    },
  },
  directory: {
    title: "Cari teman",
    back: "Kembali",
    all: "Semua",
    fromStory: "Dari ceritamu",
    sectionStory: "DARI CERITAMU",
    sectionNew: "TEMAN BARU",
    chat: "Chat",
    chatLabel: (name) => `Chat dengan ${name}`,
    added: "Ditambahkan",
    addedLabel: (name) => `${name}, sudah ada di chat kamu`,
    earlyLabel: (name, price) => `Kenalan dengan ${name} lebih awal dengan ${price} koin`,
    locked: (episode) => `Ep. ${episode}`,
    lockedLabel: (name, episode) => `${name}, bertemu di Episode ${episode}`,
    meetIn: (episode) => `Bertemu di Episode ${episode}`,
    moreComing: "Teman lainnya segera hadir",
    chipLabel: (label, selected) => (selected ? `${label}, dipilih` : label),
  },
};
