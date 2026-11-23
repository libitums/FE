// 태국어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

// 달 이름 표입니다(`Intl` 없이 — Android PrimJS). 연도는 받은 서력 그대로 씁니다(불기로 바꾸지 않음).
const monthsTh = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const monthsShortTh = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const ticketsTh: TicketsCopy = {
  ticketsLeft: (count) => `เหลือ ${String(count)} ตั๋ว`,
  unlimited: "ตั๋วไม่จำกัด",
  unlimitedLine: "ไม่ใช้ตั๋ว · ไม่จำกัด",
  noTicketNeeded: "ไม่ต้องใช้ตั๋ว",
  unlimitedModal: {
    guestPass: "บัตรผ่านแขก",
    guestMessage: "ทุกบทเรียนและบทบาทสมมติเปิดให้ใช้\nในบัญชีนี้",
    gotIt: "เข้าใจแล้ว",
    renewsOn: "ต่ออายุวันที่",
    endsOn: "สิ้นสุดวันที่",
    memberSince: (date) => `เป็นสมาชิกตั้งแต่ ${date}`,
    endsDate: (date) => `สิ้นสุด ${date}`,
    daysLeft: (days) => `เหลือ ${String(days)} วัน`,
    dayProgress: (left, total) => `${String(left)}/${String(total)} วัน`,
    hoursLeft: (hours) => `เหลือ ${String(hours)} ชั่วโมง`,
    hourProgress: (left, total) => `${String(left)}/${String(total)} ชั่วโมง`,
    activeMessage: "เริ่มทุกบทเรียนได้โดยไม่ต้องใช้ตั๋ว",
    endingMessage: "หลังจากนั้น บทเรียนจะกลับมาใช้ตั๋วอีกครั้ง\nความคืบหน้าของคุณยังอยู่ครบ",
    manage: "จัดการการสมัครสมาชิก",
    keep: "ใช้แบบไม่จำกัดต่อ",
    date: (d) => `${String(d.day)} ${monthsTh[d.month - 1] ?? ""} ${String(d.year)}`,
    shortDate: (d) => `${String(d.day)} ${monthsShortTh[d.month - 1] ?? ""}`,
  },
  modal: {
    title: () => "ตั๋วที่เหลือ",
    nextTicketIn: "ตั๋วใบถัดไปในอีก",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `ตั๋วพร้อมใช้ ${String(available)} จาก ${String(total)} ใบ`
        : `ตั๋วพร้อมใช้ ${String(available)} จาก ${String(total)} ใบ, ใบถัดไปในอีก ${nextClock}`,
    slotReady: "พร้อม",
    message: "แต่ละบทเรียนใช้ตั๋วหนึ่งใบ\nตั๋วที่ใช้แล้วจะคืนมาเมื่อผ่านไป 1 ชั่วโมง",
  },
  getMore: "รับตั๋ว 1 ใบ",
  getMoreLabel: (price) => `รับตั๋ว 1 ใบด้วย ${String(price)} เหรียญ`,
  moreNotice: {
    bought: "เพิ่มตั๋ว 1 ใบแล้ว",
    short: (more) => `เหรียญไม่พอ ต้องการอีก ${String(more)} เหรียญ`,
    full: "ตั๋วของคุณเต็มแล้ว",
    signIn: "เข้าสู่ระบบเพื่อใช้เหรียญ",
    failed: "รับตั๋วไม่สำเร็จ โปรดลองอีกครั้ง",
  },
  outOfTickets: {
    title: "ตั๋วหมดแล้ว",
    untilNext: "จนถึงตั๋วใบถัดไป",
    clockLabel: (clock) => `อีก ${clock} จะได้ตั๋วใบถัดไป`,
    message: "ต้องใช้ตั๋วหนึ่งใบเพื่อเริ่มบทเรียนนี้\nตั๋วแต่ละใบจะคืนมาเมื่อผ่านไป 1 ชั่วโมง",
    startLesson: "เริ่มบทเรียน",
    backToMap: "กลับไปที่แผนที่",
  },
  startCost: "ใช้ 1 ตั๋ว",
};
