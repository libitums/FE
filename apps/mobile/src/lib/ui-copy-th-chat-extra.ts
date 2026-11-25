// 메신저 문구 표의 덧붙는 칸(th) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";
import { messengerChatMediaTh } from "./ui-copy-th-chat-media";
import { messengerChatAlbumTh } from "./ui-copy-th-chat-album";
import { messengerChatSuggestedTh } from "./ui-copy-th-chat-suggested";
import { messengerChatStoriesTh } from "./ui-copy-th-chat-stories";
import { myStoriesTh } from "./ui-copy-th-my-stories";

export const messengerChatExtraTh: MessengerChatExtraCopy = {
  media: messengerChatMediaTh,
  album: messengerChatAlbumTh,
  suggested: messengerChatSuggestedTh,
  stories: messengerChatStoriesTh,
  myStories: myStoriesTh,
  access: {
    signInTitle: "แชทกับคนที่คุณได้พบ",
    signInBody: "สร้างบัญชีฟรีเพื่อแชทภาษาเกาหลีกับตัวละครในเรื่องราวของคุณ ความคืบหน้าของคุณจะยังอยู่ครบ",
    signIn: "สมัครหรือเข้าสู่ระบบ",
    promptTitle: "เข้าสู่ระบบเพื่อส่งข้อความ",
    promptBody: "สร้างบัญชีฟรีเพื่อแชทกับตัวละครในเรื่องราวของคุณ ความคืบหน้าของคุณจะยังอยู่ครบ",
    promptKeepBody: "สร้างบัญชีฟรีเพื่อเก็บ Yeopjeon และตั๋วของคุณไว้",
    promptLater: "ไว้ทีหลัง",
  },
  pushNotice: { chatUnavailable: "ตอนนี้แชทนี้ใช้งานไม่ได้" },
  newMessages: {
    label: ({ count, latest }) =>
      latest === "photo"
        ? count === 1
          ? "ส่งรูปภาพมา"
          : `ส่งรูปภาพมา · ใหม่ ${count} ข้อความ`
        : latest === "voice"
          ? count === 1
            ? "ส่งข้อความเสียงมา"
            : `ส่งข้อความเสียงมา · ใหม่ ${count} ข้อความ`
          : count === 1
            ? "ข้อความใหม่"
            : `ข้อความใหม่ ${count} ข้อความ`,
    jump: "ไปที่ข้อความใหม่",
    latest: "เลื่อนไปข้อความล่าสุด",
  },
  replyToast: {
    dismiss: "ปิด",
    more: (count) => `+${count}`,
    spoken: (name, preview, more) =>
      `ข้อความใหม่จาก ${name}: ${preview}` + (more > 0 ? ` และอีก ${more} รายการ` : ""),
  },
  pushAsk: {
    title: (name) => `รับการแจ้งเตือนเมื่อ ${name} ส่งข้อความมาไหม?`,
    body: "บางครั้งเราจะทักไปก่อน — ประมาณวันละครั้ง ช่วงเย็น",
    turnOn: "เปิด",
    notNow: "ไว้ทีหลัง",
    on: (name) => `เปิดการแจ้งเตือนแล้ว — ${name} ทักมาเมื่อไหร่จะแจ้งให้รู้`,
  },
  chatSettings: {
    entryTitle: "แชท",
    entryDescription: "คำตอบแนะนำ ข้อความจากตัวละคร ความทรงจำ",
    title: "แชท",
    back: "กลับ",
    sectionWhile: "ระหว่างแชท",
    replyIdeas: "คำตอบแนะนำ",
    replyIdeasBody: "แสดงคำตอบแนะนำ 1–2 ข้อหลังแต่ละข้อความ",
    sectionProactive: "ข้อความจากตัวละคร",
    proactive: "ตัวละครทักมาก่อน",
    sectionAbout: "เกี่ยวกับคุณ",
    sharedMemories: "สิ่งที่ตัวละครทุกคนรู้เกี่ยวกับคุณ",
    sharedMemoriesSummary: (count) => `${count} ความทรงจำ · ใช้ร่วมกันทุกตัวละคร`,
    footnote: "ตัวละครแต่ละคนยังจำเรื่องจากแชทกับคุณด้วย เปิดแชทแล้วแตะ ☰ เพื่อดู",
    proactiveSheet: {
      title: "ตัวละครทักมาก่อน",
      body: "เมื่อคุณเงียบไปสักพัก ตัวละครอาจเริ่มแชทก่อน ไม่เสียเหรียญเลย",
      howOften: "ความถี่",
      prefs: { off: "ปิด", daily1: "วันละครั้ง", daily2: "วันละสองครั้ง" },
      preferredTime: "เวลาที่ต้องการ",
      anyTime: "เวลาใดก็ได้",
      hour: (hour) => `${String(hour).padStart(2, "0")}:00`,
      quietNote:
        "จะไม่มีข้อความระหว่าง 22:00 ถึง 8:00 ตามเวลาของคุณ ถ้าเลือกวันละสองครั้ง ครั้งที่สองจะมาประมาณ 10 ชั่วโมงหลังจากนั้น",
      save: "บันทึก",
      close: "ปิด",
    },
    memories: {
      titleShared: "สิ่งที่ตัวละครทุกคนรู้เกี่ยวกับคุณ",
      titleCharacter: (name) => `สิ่งที่ ${name} จำได้`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "ความทรงจำเต็มแล้ว",
      fullBody: (name) =>
        `${name ?? "ตัวละคร"}จะจำเรื่องใหม่ไม่ได้จนกว่าคุณจะลบบางรายการ ความทรงจำที่คุณแก้ไขแล้วจะยังอยู่`,
      intro: (name) =>
        `${name ?? "ตัวละครทุกคน"}ใช้สิ่งเหล่านี้เพื่อแชทให้เข้ากับคุณมากขึ้น มีแค่คุณที่เห็นรายการนี้ แก้ไขหรือลบได้ฟรี`,
      empty: (name) => `ยังไม่มีอะไร ${name ?? "ตัวละคร"}จะจำสิ่งที่คุณเล่าระหว่างแชท`,
      edited: "แก้ไขแล้ว",
      edit: "แก้ไขความทรงจำ",
      delete: "ลบความทรงจำ",
      editTitle: "แก้ไขความทรงจำ",
      editHint: (name) => `${name ?? "ตัวละคร"}จะจำตามที่คุณเขียนทุกอย่าง`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "ยกเลิก",
      save: "บันทึก",
      deleteTitle: "ลบความทรงจำนี้ไหม",
      deleteBody: (name) => `${name ?? "ตัวละคร"}จะไม่ใช้เรื่องนี้ตั้งแต่ข้อความถัดไป`,
      deleteConfirm: "ลบ",
      sidebar: (name) => `สิ่งที่ ${name} จำได้`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · เต็ม` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "วิธีแก้คำผิด",
      title: "วิธีแก้คำผิด",
      body: (name) =>
        `${name} จะช่วยอย่างไรเมื่อภาษาเกาหลีของคุณผิด คุณจะได้การ์ดแก้คำผิดเสมอ — ตัวเลือกนี้เปลี่ยนวิธีที่ ${name} ตอบ`,
      modes: {
        separate: {
          title: "การ์ดเท่านั้น",
          body: (name) => `${name} จะแชทต่อไปตามปกติ คำแก้อยู่ที่ ✎ ใต้ข้อความของคุณ`,
        },
        natural: {
          title: "แทรกในคำตอบอย่างเป็นธรรมชาติ",
          body: (name) => `${name} จะใช้คำพูดที่ถูกต้องในคำตอบ เหมือนเพื่อนคนหนึ่ง`,
        },
        prefix: {
          title: "บอกก่อน",
          body: (name) => `${name} จะแก้สั้น ๆ แล้วค่อยแชทต่อ`,
        },
      },
      defaultTag: "ค่าเริ่มต้น",
      note: "ใช้กับตัวละครทุกคนตั้งแต่ข้อความถัดไป",
      save: "บันทึก",
      close: "ปิด",
    },
  },
  feedback: {
    titles: { correction: "แก้คำผิด", better: "เป็นธรรมชาติขึ้น", l1_to_ko: "เป็นภาษาเกาหลี" },
    sendCorrected: "ส่งประโยคที่แก้แล้ว",
    sendInKorean: "ส่งเป็นภาษาเกาหลี",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "คำตอบดี",
    bad: "คำตอบไม่ดี",
    goodSelected: "คำตอบดี, เลือกแล้ว",
    badSelected: "คำตอบไม่ดี, เลือกแล้ว",
    liked: "คุณถูกใจแล้ว",
    flagged: "คุณแจ้งปัญหาแล้ว",
    sheet: {
      title: "มีอะไรไม่ดี",
      body: (name) => `เลือกข้อที่ตรง สิ่งนี้ช่วยให้ ${name} ตอบได้ดีขึ้น`,
      reasons: {
        awkward_korean: () => "ภาษาเกาหลีไม่เป็นธรรมชาติ",
        out_of_character: (name) => `ไม่เหมือน ${name}`,
        too_hard: () => "ยากเกินไปสำหรับฉัน",
        uncomfortable: () => "ทำให้ฉันอึดอัด",
        other: () => "เหตุผลอื่น",
      },
      reportPrompt: "อยากให้เราตรวจสอบข้อความนี้ไหม",
      report: "รายงาน",
      noteLabel: "บอกเพิ่มเติม (ไม่บังคับ)",
      notePlaceholder: "เพิ่มบันทึก",
      send: "ส่ง",
      close: "ปิด",
    },
  },
  guide: {
    cardTitle: (name) => `สวัสดี! เราชื่อ ${name}`,
    cardBody: "ที่นี่คุณจะได้แชทกับเพื่อนชาวเกาหลี เริ่มกับเราก่อนได้เลย — เราจะช่วยเอง",
    cardButton: (name) => `แชทกับ ${name}`,
    steps: {
      ideas: "ไม่รู้จะพูดอะไร แตะหลอดไฟข้างช่องพิมพ์เพื่อดูคำตอบแนะนำ",
      media: "คุณยังขอให้เราส่งรูปภาพหรือข้อความเสียงได้ด้วยปุ่มเหนือแป้นพิมพ์",
      sample: "อยากเห็นไหมว่าตอนนี้ฉันทำอะไรอยู่ แตะ Snapshot แล้วฉันจะส่งรูปให้ รูปแรกให้ฟรี",
      voice: "อยากฟังเสียงฉันไหม แตะ เสียงสั้น แล้วฉันจะอ่านข้อความนั้นให้ฟัง ครั้งแรกให้ฟรีเหมือนกัน",
    },
    keyboard: {
      phone: {
        title: "แชตเป็นภาษาของคุณได้เลย เราจะบอกว่าพูดเป็นภาษาเกาหลีว่าอย่างไร",
        body: "ต่อไป ลองพิมพ์ภาษาเกาหลีด้วยตัวเองดู",
      },
      hangul: {
        title: "หรือพิมพ์ภาษาเกาหลีตรงนี้ด้วยแป้นฮันกึล",
        body: "ไม่ต้องมีแป้นพิมพ์เกาหลี สลับได้ทุกเมื่อด้วยปุ่มสลับใต้ช่องพิมพ์",
      },
    },
    next: "ถัดไป",
    done: "เข้าใจแล้ว",
    skip: "ข้าม",
    stepOf: (step, total) => `${step}/${total}`,
    newTag: "ใหม่",
    free: "ฟรี",
  },
  launch: {
    newTag: "ใหม่",
    coinsTitle: "รู้จัก Yeopjeon เหรียญสำหรับแชทของคุณ",
    coinsBody: "Yeopjeon คือเหรียญสำหรับแชทกับเพื่อนชาวเกาหลี นี่คือจำนวนที่คุณได้รับแล้ว",
    fromEpisodes: "จากตอนที่คุณเรียนจบ",
    launchBonus: "โบนัสเปิดตัว",
    balance: "ยอดคงเหลือ",
    perLesson: "เรียนจบแต่ละบทครั้งแรกได้เพิ่ม 5",
    gotIt: "เข้าใจแล้ว",
    chatTitle: "แชทกับเพื่อนที่คุณได้พบ",
    chatBody: "ทุกคนที่คุณพบในแต่ละตอนเป็นเพื่อนแชทได้ เรียนตอนต่อไปเพื่อพบคนเพิ่ม",
    met: "พบแล้ว",
    now: "ตอนนี้",
    episode: (order) => `ตอนที่ ${order}`,
    metCount: (met, total) => `พบเพื่อนแล้ว ${met}/${total} คน`,
    prices: "ข้อความ 3 · เสียง 15 · รูปภาพ 35",
    later: "ไว้ทีหลัง",
    start: "เริ่มแชท",
  },
  remote: {
    noCredits: (name) => `คุณใช้สิทธิ์แชทกับ ${name} หมดแล้ว`,
    notAvailable: (name) => `คุณยังแชทกับ ${name} ไม่ได้`,
    sendFailed: "ส่งข้อความไม่สำเร็จ โปรดลองอีกครั้ง",
    replyFailed: (name) => `${name} ยังตอบไม่ได้ในตอนนี้`,
    cantReply: (name) => `${name} ตอบเรื่องนั้นไม่ได้ ลองพูดแบบอื่นดู`,
    rateLimited: "คุณส่งเร็วเกินไป รอสักครู่แล้วส่งใหม่",
    updateRequired: "อัปเดตแอปเพื่อแชทต่อ",
    serverError: "เกิดข้อผิดพลาดจากฝั่งเรา โปรดลองใหม่ภายหลัง",
    signedOut: "คุณออกจากระบบแล้ว จึงยังไม่ได้ส่งข้อความนี้",
    notSent: "ยังไม่ได้ส่ง",
    sendAgain: "ส่งอีกครั้ง",
    unsentTitle: "ส่งข้อความไม่สำเร็จ",
    unsentDescription: "ส่งอีกครั้งหรือลบข้อความนี้",
    deleteUnsent: "ลบ",
    cancel: "ยกเลิก",
    recovering: "กำลังรับส่วนที่เหลือของคำตอบ…",
    stalled: "คำตอบยังไม่สมบูรณ์",
    refresh: "รีเฟรช",
    loadFailedTitle: "โหลดแชทไม่ได้",
    loadFailedBody: "ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
    loadFailedNew: "โหลดข้อความใหม่ไม่ได้",
    tryAgain: "ลองอีกครั้ง",
  },
};
