// 태국어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryTh: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)} บทพูด`,
  withCounterpart: (name) => `กับ ${name}`,
  previewBody: (name) => `เล่นฉากนี้กับ ${name} พูดคำตอบแต่ละประโยคออกเสียง`,
  start: "เริ่มบทบาทสมมติ",
  lineProgress: (ordinal, total) => `ประโยคที่ ${String(ordinal)} จาก ${String(total)}`,
  me: "ฉัน",
  speak: "พูด",
  stop: "หยุด",
  listening: "กำลังฟัง… พูดจบแล้วแตะอีกครั้ง",
  yourLine: "ประโยคของคุณ",
  hearIt: "ฟังเสียง",
  showKorean: "ดูภาษาเกาหลี",
  showHint: "ดูคำใบ้",
  hint: (translation) => `ลองพูดว่า: ${translation}`,
  cantSpeak: "ตอนนี้พูดไม่ได้",
  great: "เยี่ยม",
  notQuite: "ยังไม่ถูกนัก",
  youSaid: (heard) => `คุณพูดว่า: ${heard}`,
  heardNothing: "ฟังไม่ค่อยชัด",
  unavailable: "ตอนนี้ใช้การพูดไม่ได้ คุณข้ามประโยคนี้ได้",
  blocked: "อนุญาตไมโครโฟนและการรู้จำเสียงพูดให้แอปนี้ในการตั้งค่า หรือข้ามประโยคนี้",
  permissionTitle: "เปิดไมโครโฟน",
  permissionBody: "บทบาทสมมติต้องพูดออกเสียง อนุญาตไมโครโฟนและการรู้จำเสียงพูดให้แอปนี้ในการตั้งค่า",
  openSettings: "เปิดการตั้งค่า",
  notNow: "ไว้ทีหลัง",
  unsupportedTitle: "ใช้การพูดไม่ได้",
  unsupportedBody: "ขณะนี้อุปกรณ์นี้ไม่รองรับการรู้จำเสียงพูด คุณยังดูฉากและข้ามทีละประโยคได้",
  startAnyway: "เริ่มเลย",
  retryHeard: "ฟังไม่ค่อยชัด แตะไมโครโฟนแล้วลองอีกครั้ง",
  playAgain: "เล่นอีกครั้ง",
};
