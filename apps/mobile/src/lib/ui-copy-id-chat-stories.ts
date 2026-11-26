// 친구 스토리 줄 · 보기 · 대화 인용 문구(id, ADR-0178).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesId: FriendStoriesCopy = {
  language: "id",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: ", ",
  labelSeparator: ": ",
  rowTitle: "Cerita",
  watchAll: "Lihat semua",
  watchAllLabel: "Lihat semua cerita",
  age: (age) =>
    age.unit === "now" ? "baru saja" : age.unit === "m" ? `${age.value} mnt` : `${age.value} jam`,
  seen: "Dilihat",
  newBadge: "Baru",
  friendLabel: (name, age, seen) => `Cerita ${name}, ${age}${seen ? ", sudah dilihat" : ", baru"}`,
  unmetLabel: (name) => `Cerita ${name}, teman baru`,
  findFriends: "Cari teman",
  findFriendsLabel: "Cari teman",
  viewer: {
    label: (name) => `Cerita ${name}`,
    progress: (index, count) => `Cerita ${index} dari ${count}`,
    pause: "Jeda",
    play: "Putar",
    close: "Tutup",
    previous: "Cerita sebelumnya",
    next: "Cerita berikutnya",
    photoLabel: (name) => `Foto dari ${name}`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — Simpan kata`,
    saveWordLabel: (ko, meaning) => `Simpan ${ko}, ${meaning}, ke Kosakataku`,
    saved: (ko) => `${ko} tersimpan di Kosakataku`,
    freeReply: "Balasan pertama gratis",
    replyPlaceholder: (name) => `Balas ${name}…`,
    replyChipLabel: (text) => `Balas: ${text}`,
    send: "Kirim",
    sent: "Terkirim",
    sentLabel: (name) => `Terkirim ke ${name}`,
    openChat: "Buka obrolan",
    sendFailed: "Gagal mengirim. Coba lagi.",
    coinsShort: "Koin tidak cukup",
    newFriend: "TEMAN BARU",
    addAndReply: "Tambah teman dan balas",
    profile: (name) => `Profil ${name}`,
  },
  reply: {
    caption: (name) => `Kamu membalas cerita ${name}`,
    storyMeta: (age) => (age === null ? "Cerita" : `Cerita · ${age}`),
    replying: (name) => `Membalas cerita ${name}`,
    removeQuote: "Lepas kutipan",
  },
};
