// 메신저 서버 사진 · 음성 문구(th, ADR-0146 「앱 연결」).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaTh: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} แชร์ภาพนั้นไม่ได้ คืน Yeopjeon ให้คุณแล้ว`
          : `${name} อัดข้อความนั้นไม่ได้ คืน Yeopjeon ให้คุณแล้ว`;
      case "failed":
        return photo
          ? "ส่งรูปภาพไม่สำเร็จ คืน Yeopjeon ให้คุณแล้ว"
          : "ส่งข้อความเสียงไม่สำเร็จ คืน Yeopjeon ให้คุณแล้ว";
      case "limit":
        return until === null
          ? "คุณใช้ครบจำนวนของวันนี้แล้ว โปรดลองใหม่ภายหลัง"
          : `คุณใช้ครบจำนวนของวันนี้แล้ว โปรดลองใหม่หลัง ${until}`;
      case "busy":
        return photo ? `${name} ยังทำรูปอื่นอยู่` : `${name} ยังอัดข้อความเสียงอื่นอยู่`;
      case "no-coins":
        return "Yeopjeon ของคุณไม่พอ เติมเพิ่มแล้วขอใหม่อีกครั้ง";
      case "not-eligible":
        return photo ? "ข้อความนี้ทำเป็นรูปภาพไม่ได้" : "ข้อความนี้ทำเป็นข้อความเสียงไม่ได้";
      case "unavailable":
        return "ตอนนี้ยังใช้รูปภาพและข้อความเสียงไม่ได้";
      default:
        return "ส่งคำขอไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} ยังทำอยู่`;
      case "done":
        return "ส่งให้ข้อความนี้แล้ว";
      default:
        return `ใช้ได้หลังข้อความถัดไปของ ${name}`;
    }
  },
  aiLabel: "สร้างโดย AI",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: ข้อความเสียง, ${ko}` : `${name}: ข้อความเสียง, ${ko}, ${en}`,
  listVoice: "ข้อความเสียง",
};
