// 태국어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 제목은 영어처럼 「앞말 + 강조어」 둘로 나뉩니다 — 강조어가 뒤에 와야 자연스러운 어순으로 골랐습니다.
export const onboardingTh: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "เรียนผ่าน",
      titleEmphasis: "เรื่องราว",
      body: "ติดตามช่วงเวลาในชีวิตประจำวัน\nแล้วเรียนภาษาเกาหลีไปพร้อมกัน",
    },
    1: {
      title: "ฝึก",
      titleEmphasis: "ภาษาเกาหลี",
      body: "ฝึกบทสนทนาจริง\nและทบทวนสิ่งที่เรียนด้วยควิซสั้น ๆ",
    },
    2: {
      title: "แค่",
      titleEmphasis: "5 นาที",
      body: "บทเรียนสั้น ๆ ทุกวัน เข้ากับตารางของคุณ\nเรียนจบหนึ่งบทได้ในห้านาที",
    },
  },
  getStarted: "เริ่มต้นใช้งาน",
  progress: (ordinal, total) => `ขั้นที่ ${ordinal} จาก ${total}`,
  storyChat: {
    friend: "Doyun",
    atStore: "ตอนนี้อยู่หน้าร้านสะดวกซื้อ อยากได้อะไรดื่มไหม",
    water: "ฝากซื้อน้ำเปล่าให้ขวดหนึ่งหน่อยนะ!",
    onMyWay: "ได้เลย เดี๋ยวไปถึงแล้ว!",
  },
  quiz: { replay: "ฟังอีกครั้ง", stop: "หยุด", play: "เล่น" },
  unit: {
    title: "ช้อปปิ้งที่ร้านเครื่องสำอาง",
    meta: "บทที่ 1 · 5 นาที",
    status: { active: "กำลังเรียน", clear: "เรียนจบแล้ว" },
  },
};

export const languageSelectTh: LanguageSelectCopy = {
  title: "เลือกภาษา",
  caption: "เลือกภาษาที่คุณต้องการใช้",
  preview: {
    question: "คุณได้ยินอะไร",
    meaning: "ขอบคุณ",
  },
};

export const journeyEntryTh: JourneyEntryCopy = {
  title: "การเดินทางรอคุณอยู่",
  display: "เริ่มเรื่องราว",
  caption: "เพิ่งรู้จักฮันกึลเหรอ มารู้จักตัวอักษรสักหน่อยก่อนถึงโซล",
  notice: "รูปภาพบางส่วนในบริการนี้สร้างขึ้นด้วยเทคโนโลยี AI",
  basics: "เรียนพื้นฐานก่อน",
  basicsDetail: "6 ตัวอักษร 3 เสียง แล้วเข้าเรื่อง",
  story: "เข้าเรื่องเลย",
  firstSteps: {
    progress: (current, total) => `ขั้นที่ ${current} จาก ${total}`,
    lettersTitle: "รู้จักตัวอักษรแรกของคุณ",
    lettersLead: "พยัญชนะกับสระรวมกันเป็นเสียงหนึ่งพยางค์",
    lettersHear: "แตะตัวอักษรเพื่อฟังเสียง",
    lettersNext: "ลองประกอบดู",
    readyTitle: "คุณอ่านภาษาเกาหลีได้แล้ว!",
    readyMeaning: "“เธอก็ไปเหรอ”",
    readyBody: "เรื่องราวของคุณในโซลกำลังจะเริ่มขึ้น",
    readyGo: "อื้ม ไปกัน!",
  },
};

export const loginTh: LoginCopy = {
  guest: "ใช้ต่อโดยไม่มีบัญชี",
  method: {
    phone: "ดำเนินการต่อ",
    google: "ดำเนินการต่อด้วย Google",
    apple: "ลงชื่อเข้าใช้ด้วย Apple",
    facebook: "ดำเนินการต่อด้วย Facebook",
  },
  heading: {
    visible: {
      title: "เข้าสู่ระบบหรือสมัครด้วยหมายเลขโทรศัพท์",
      caption: "กรอกหมายเลขโทรศัพท์เพื่อดำเนินการต่อ",
    },
    hidden: { title: "เข้าสู่ระบบหรือสมัครสมาชิก", caption: "เลือกวิธีที่คุณต้องการดำเนินการต่อ" },
  },
  countryCode: (name, dialCode) => `รหัสประเทศ, ${name} ${dialCode}`,
  phoneNumber: "หมายเลขโทรศัพท์",
  or: "หรือ",
  countrySheetTitle: "เลือกประเทศ",
  legal: {
    lead: "เมื่อดำเนินการต่อ แสดงว่าคุณยอมรับ",
    termsOfUse: "ข้อกำหนดการใช้งาน",
    and: "และ",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
  },
  // 수단 사용 불가 안내 대화상자(ADR-0111 개정 2).
  unavailable: {
    title: (method) => `ลงชื่อเข้าใช้ด้วย ${method} ไม่ได้ชั่วคราว`,
    description:
      "เรากำลังย้ายวิธีลงชื่อเข้าใช้นี้ไปยังระบบใหม่ ระหว่างนี้โปรดดำเนินการต่อด้วย Google หรือใช้ต่อโดยไม่มีบัญชี",
    descriptionWithoutGuest: "เรากำลังย้ายวิธีลงชื่อเข้าใช้นี้ไปยังระบบใหม่ ระหว่างนี้โปรดดำเนินการต่อด้วย Google",
    close: "ปิด",
  },
};

export const verificationCodeTh: VerificationCodeCopy = {
  title: "รหัสยืนยัน OTP",
  sentTo: "ส่งรหัสยืนยันไปที่",
  digit: (ordinal, total) => `หลักที่ ${ordinal} จาก ${total}`,
  resendHint: "ไม่ได้รับรหัสใช่ไหม",
  resend: "ส่งอีกครั้ง",
  submit: "ดำเนินการต่อ",
};

export const authFailureTh: AuthFailureCopy = {
  network: "เชื่อมต่อไม่ได้ ตรวจสอบเครือข่ายแล้วลองอีกครั้ง",
  unavailable: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
  unconfigured: "ยังลงชื่อเข้าใช้ไม่ได้ในขณะนี้",
  "rate-limited": "คุณลองหลายครั้งเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง",
  rejected: "ส่งรหัสไปยังหมายเลขนี้ไม่ได้ ตรวจสอบหมายเลขโทรศัพท์แล้วลองอีกครั้ง",
  "invalid-code": "รหัสไม่ถูกต้องหรือหมดอายุแล้ว",
  "sign-in-incomplete": "ลงชื่อเข้าใช้ไม่สำเร็จ โปรดลองอีกครั้ง",
  unsupported: "อุปกรณ์นี้ไม่รองรับวิธีลงชื่อเข้าใช้นี้",
};
