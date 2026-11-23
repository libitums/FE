// 미얀마어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

// 양력 달 이름(미얀마어 음역)입니다 — `Intl` 없이 씁니다(Android PrimJS).
const monthsMy = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "ဩဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
] as const;

export const ticketsMy: TicketsCopy = {
  ticketsLeft: (count) => `လက်မှတ် ${String(count)} စောင် ကျန်`,
  unlimited: "အကန့်အသတ်မဲ့ လက်မှတ်",
  unlimitedLine: "လက်မှတ် မသုံးပါ · အကန့်အသတ်မဲ့",
  noTicketNeeded: "လက်မှတ် မလိုပါ",
  unlimitedModal: {
    guestPass: "ဧည့်သည် ပတ်စ်",
    guestMessage: "ဤအကောင့်တွင် သင်ခန်းစာနှင့်\nသရုပ်ဆောင် အားလုံး ဖွင့်ထားပါသည်။",
    gotIt: "နားလည်ပါပြီ",
    renewsOn: "သက်တမ်းတိုးမည့်ရက်",
    endsOn: "ကုန်ဆုံးမည့်ရက်",
    memberSince: (date) => `${date} မှစ၍ အဖွဲ့ဝင်`,
    endsDate: (date) => `${date} တွင် ကုန်ဆုံးမည်`,
    daysLeft: (days) => `${String(days)} ရက် ကျန်`,
    dayProgress: (left, total) => `${String(left)}/${String(total)} ရက်`,
    hoursLeft: (hours) => `${String(hours)} နာရီ ကျန်`,
    hourProgress: (left, total) => `${String(left)}/${String(total)} နာရီ`,
    activeMessage: "မည်သည့်သင်ခန်းစာကိုမဆို လက်မှတ်မပါဘဲ စတင်ပါ။",
    endingMessage: "ထို့နောက် သင်ခန်းစာများတွင် လက်မှတ် ပြန်သုံးပါမည်။\nတိုးတက်မှု အားလုံးကို ဆက်ထိန်းထားပါမည်။",
    manage: "စာရင်းသွင်းမှု စီမံရန်",
    keep: "အကန့်အသတ်မဲ့ ဆက်သုံးရန်",
    date: (d) => `${String(d.year)} ${monthsMy[d.month - 1] ?? ""} ${String(d.day)}`,
    shortDate: (d) => `${monthsMy[d.month - 1] ?? ""} ${String(d.day)}`,
  },
  modal: {
    // 큰 숫자 · 아이콘 아래 따로 서는 줄이라 「남은 티켓」 명사구로 둡니다.
    title: () => "ကျန်ရှိသော လက်မှတ်",
    nextTicketIn: "နောက်လက်မှတ် ရရန်",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `လက်မှတ် ${String(total)} စောင်အနက် ${String(available)} စောင် အသင့်`
        : `လက်မှတ် ${String(total)} စောင်အနက် ${String(available)} စောင် အသင့်။ နောက်လက်မှတ် ${nextClock} အတွင်း`,
    slotReady: "အသင့်",
    message: "သင်ခန်းစာတစ်ခုလျှင် လက်မှတ်တစ်စောင် သုံးပါသည်။\nသုံးပြီးသော လက်မှတ်သည် 1 နာရီအကြာတွင် ပြန်ရပါမည်။",
  },
  getMore: "လက်မှတ် ၁ စောင် ယူရန်",
  getMoreLabel: (price) => `ဒင်္ဂါး ${String(price)} ဖြင့် လက်မှတ် ၁ စောင် ယူရန်`,
  moreNotice: {
    bought: "လက်မှတ် ၁ စောင် ထည့်ပြီးပါပြီ။",
    short: (more) => `ဒင်္ဂါး မလုံလောက်ပါ။ နောက်ထပ် ${String(more)} လိုပါသေးတယ်။`,
    full: "လက်မှတ်များ ပြည့်နေပါပြီ။",
    signIn: "ဒင်္ဂါးသုံးရန် အကောင့်ဝင်ပါ။",
    failed: "လက်မှတ် မရနိုင်ခဲ့ပါ။ ထပ်စမ်းကြည့်ပါ။",
  },
  outOfTickets: {
    title: "လက်မှတ် ကုန်သွားပြီ",
    untilNext: "နောက်လက်မှတ် ရသည်အထိ",
    clockLabel: (clock) => `နောက်လက်မှတ် ရရန် ${clock} ကျန်`,
    message: "ဤသင်ခန်းစာ စတင်ရန် လက်မှတ်တစ်စောင် လိုပါသည်။\nလက်မှတ်တစ်စောင်စီ 1 နာရီအကြာတွင် ပြန်ရပါမည်။",
    startLesson: "သင်ခန်းစာ စတင်ရန်",
    backToMap: "မြေပုံသို့",
  },
  startCost: "လက်မှတ် 1 စောင် သုံးမည်",
};
