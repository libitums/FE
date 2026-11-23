// 메신저 서버 사진 · 음성 문구(id, ADR-0146 「앱 연결」).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaId: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} tidak bisa membagikan adegan itu. Yeopjeon-mu sudah dikembalikan.`
          : `${name} tidak bisa merekam pesan itu. Yeopjeon-mu sudah dikembalikan.`;
      case "failed":
        return photo
          ? "Fotonya tidak sampai. Yeopjeon-mu sudah dikembalikan."
          : "Pesan suaranya tidak sampai. Yeopjeon-mu sudah dikembalikan.";
      case "limit":
        return until === null
          ? "Kamu sudah mencapai batas hari ini. Coba lagi nanti."
          : `Kamu sudah mencapai batas hari ini. Coba lagi setelah pukul ${until}.`;
      case "busy":
        return photo
          ? `${name} masih mengerjakan foto lain.`
          : `${name} masih merekam pesan suara lain.`;
      case "no-coins":
        return "Yeopjeon-mu tidak cukup. Tambah dulu untuk meminta lagi.";
      case "not-eligible":
        return photo
          ? "Pesan ini tidak bisa dijadikan foto."
          : "Pesan ini tidak bisa dijadikan pesan suara.";
      case "unavailable":
        return "Foto dan pesan suara belum tersedia saat ini.";
      case "sample-gift":
        return "Yang itu gratis dariku! Snapshot berikutnya memakai Yeopjeon kamu.";
      default:
        return "Permintaanmu tidak terkirim. Periksa koneksi lalu coba lagi.";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} masih mengerjakannya`;
      case "done":
        return "Sudah dikirim untuk pesan ini";
      default:
        return `Tersedia setelah pesan ${name} berikutnya`;
    }
  },
  aiLabel: "Dibuat oleh AI",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: pesan suara, ${ko}` : `${name}: pesan suara, ${ko}, ${en}`,
  listVoice: "Pesan suara",
};
