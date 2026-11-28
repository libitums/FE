// 태국어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileTh: LearnerProfileCopy = {
  language: "th",
  nameLabel: "ชื่อของคุณ",
  nameIssue: {
    empty: "กรอกชื่อของคุณ",
    "too-long": "ไม่เกิน 30 ตัวอักษร",
    "forbidden-character": "ชื่อต้องไม่มี { หรือ }",
  },
  countryLabel: "ประเทศ",
  notSet: "ยังไม่ได้ตั้งค่า",
  countryMissing: "เลือกประเทศของคุณ",
  preview: {
    heading: { example: "ตัวอย่าง", yours: "คุณจะพูดว่า" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "ประโยคตัวอย่าง" : "คุณจะพูดว่า"}: ${ko} ความหมาย: ${en}`,
  },
  picker: {
    title: "เลือกประเทศ",
    back: "ย้อนกลับ",
    searchLabel: "ค้นหาประเทศ",
    clearSearch: "ล้างการค้นหา",
    allCountries: (count) => `${String(count)} ประเทศ · ค้นหาด้วยชื่อภาษาอังกฤษ`,
    matches: (count) => `${String(count)} รายการ`,
    noMatches: "ไม่พบผลลัพธ์ ตรวจสอบการสะกดหรือลองใช้ชื่อที่สั้นลง",
    noMatchesAnnouncement: "ไม่พบผลลัพธ์",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `เลือกประเทศแล้ว: ${en}`,
  },
  signup: {
    continue: "ดำเนินการต่อ",
    back: "ย้อนกลับ",
    name: {
      title: "คุณชื่ออะไร",
      caption: "เราจะใส่ชื่อของคุณในประโยคที่คุณฝึก",
      helper: "เราเลือกชื่อไว้ให้แล้ว — ใช้ชื่อนี้ สุ่มใหม่ หรือพิมพ์เองก็ได้",
      shuffle: "สุ่มชื่อ",
      shuffleLabel: "สุ่มชื่ออื่น",
      previewHeading: "ในบทเรียนจะได้ยินแบบนี้",
    },
    country: {
      title: "คุณมาจากที่ไหน",
      caption: "คุณจะได้พูดประโยคนี้เมื่อพบผู้คนในเรื่องราว",
      searchPlaceholder: (count) => `ค้นหาจาก ${String(count)} ประเทศ`,
      allCountries: (count) => `ทุกประเทศ · ${String(count)}`,
      jumpTo: (letter) => `ไปที่ตัวอักษร ${letter}`,
      jumpBar: "ข้ามไปยังตัวอักษร",
    },
    birthYear: {
      title: "คุณเกิดปีไหน",
      caption: "เราใช้ข้อมูลนี้เพื่อให้แอปเหมาะกับอายุของคุณ ไม่มีใครเห็นข้อมูลนี้",
    },
  },
  settings: {
    title: "ชื่อและประเทศ",
    body: "ใช้ในประโยคที่คุณฝึก การเปลี่ยนแปลงจะมีผลตั้งแต่บทเรียนถัดไปที่คุณเปิด",
    submit: "บันทึก",
    saved: "บันทึกแล้ว",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) => `${summary} บันทึกไว้ในอุปกรณ์นี้แล้ว เราจะซิงค์เมื่อคุณกลับมาออนไลน์`,
  },
};
