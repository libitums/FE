// 친구 스토리 줄 · 보기 · 대화 인용 문구(id, ADR-0177).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesId: FriendStoriesCopy = {
  language: "id",
  rowTitle: "Cerita",
  watchAll: "Lihat semua",
  watchAllLabel: "Lihat semua cerita",
  age: (age) =>
    age.unit === "now" ? "baru saja" : age.unit === "m" ? `${age.value} mnt` : `${age.value} j`,
  seen: "Dilihat",
  newBadge: "Baru",
  friendLabel: (name, age, seen) => `Cerita ${name}, ${age}${seen ? ", sudah dilihat" : ", baru"}`,
  unmetLabel: (name) => `Cerita ${name}, teman baru`,
  findFriends: "Cari teman",
  findFriendsLabel: "Cari teman",
  listPreview: (line) => `Cerita baru · ${line}`,
  listRowLabel: (name, line) => `${name}, cerita baru: ${line}. Membuka cerita`,
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
    newFriend: "TEMAN BARU",
    addAndReply: "Tambah teman dan balas",
    seeHowToMeet: "Cara bertemu",
  },
  reply: {
    caption: (name) => `Kamu membalas cerita ${name}`,
    storyMeta: (age) => (age === null ? "Cerita" : `Cerita · ${age}`),
    replying: (name) => `Membalas cerita ${name}`,
    removeQuote: "Hapus cerita",
    quoteLabel: (name, line) => `Cerita ${name}: ${line}`,
  },
};
