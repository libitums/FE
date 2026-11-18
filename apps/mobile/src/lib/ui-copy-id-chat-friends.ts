// 추천 친구 문구(id) — 추천 줄 · 프로필 시트 · 성인 확인 대화상자. AI 표시는 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다.

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";

export const messengerChatFriendsId: FriendsCopy = {
  profileLanguage: "id",
  stripTitle: "Teman rekomendasi",
  cardLabel: (name, job) => `${name}, ${job}, lihat profil`,
  addFriend: "Tambah teman",
  close: "Tutup",
  openProfile: (name) => `Profil ${name}`,
  ageLabel: "Usia",
  jobLabel: "Pekerjaan",
  mbtiLabel: "MBTI",
  age: (age) => {
    switch (age.kind) {
      case "years":
        return `${age.value} tahun`;
      case "decade":
        return `${age.value}-an`;
      case "range":
        return `${age.from}–${age.to} tahun`;
    }
  },
  aiLabel: "Karakter AI. Balasan ditulis oleh AI.",
  adultTitle: "Pastikan kamu sudah dewasa",
  adultBody: (name) =>
    `${name} bisa bicara dengan nada romantis, seperti pasangan. Pastikan kamu sudah dewasa (18 tahun ke atas).`,
  adultConfirm: "Saya sudah dewasa",
  adultCancel: "Nanti saja",
  unavailable: (name) => `Kamu tidak bisa mengobrol dengan ${name} sekarang.`,
};
