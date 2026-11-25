// 가입 보상 문구(ADR-0174, 시안 Main · Reward) — 일곱 언어를 한 파일에 두고 각 언어 표가 자기 몫을 꽂습니다
// (`ui-copy-streak-reward.ts`와 같은 방식). 엽전은 화면에서 「Yeopjeon」으로 적습니다(ADR-0116).

import type { EntryLanguage } from "./entry-language";
import { clock12, clock24, clock24Padded, type WelcomeGiftEnd } from "./welcome-gift-time";

export type SignupRewardCopy = {
  /** 카드 제목 — `Get 100 Yeopjeon free`. */
  readonly cardTitle: (amount: number) => string;
  readonly cardBody: string;
  /** 카드의 알약 · 낭독 끝말. */
  readonly signUp: string;
  /** 모달 위 알약. */
  readonly tag: string;
  readonly title: string;
  /** 금액 줄의 낭독 — `+100 Yeopjeon`. */
  readonly amountSpoken: (amount: number) => string;
  /** 손님에서 계정으로 온 경우의 보조문. */
  readonly bodyGuest: string;
  /** 처음부터 가입한 경우의 보조문. */
  readonly bodyNew: string;
  readonly gotIt: string;
  /** 푸시 캠페인 보상 모달(ADR-0175) — 위 알약 · 제목. */
  readonly pushTag: string;
  readonly pushTitle: string;
  /** 무제한 티켓 보상의 금액 줄 — `24h`. */
  readonly hoursShort: (hours: number) => string;
  /** 선물 두 줄(ADR-0186 개정 3)의 엽전 줄 설명 — 줄 제목이 이미 `+100 Yeopjeon`이라 `bodyNew`보다 짧습니다. */
  readonly coinsLine: string;
  /** 무제한 줄 설명 — 첫날 무제한이 끝나는 기기 시각(오늘 · 내일 + 시:분, 언어별 시계 관례). */
  readonly unlimitedUntil: (end: WelcomeGiftEnd) => string;
};

const en: SignupRewardCopy = {
  cardTitle: (amount) => `Get ${amount} Yeopjeon free`,
  cardBody: "Sign up — your progress comes with you.",
  signUp: "Sign up",
  tag: "WELCOME GIFT",
  title: "You're signed up!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "Your guest progress is saved to your account.",
  bodyNew: "Use Yeopjeon to chat with the friends you meet.",
  gotIt: "Got it",
  pushTag: "GIFT",
  pushTitle: "Your gift is here!",
  coinsLine: "Chat with the friends you meet.",
  unlimitedUntil: (end) => {
    const clock = clock12(end.hours, end.minutes);
    const day = end.day === "today" ? "today" : "tomorrow";
    return `Every lesson is free until ${day}, ${clock.hour}:${clock.minutes} ${clock.pm ? "PM" : "AM"}.`;
  },
  hoursShort: (hours) => `${hours}h`,
};

const es: SignupRewardCopy = {
  cardTitle: (amount) => `Consigue ${amount} Yeopjeon gratis`,
  cardBody: "Regístrate y tu progreso irá contigo.",
  signUp: "Registrarse",
  tag: "REGALO DE BIENVENIDA",
  title: "¡Ya tienes tu cuenta!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "Tu progreso como invitado se guardó en tu cuenta.",
  bodyNew: "Usa los Yeopjeon para chatear con los amigos que conozcas.",
  gotIt: "Entendido",
  pushTag: "REGALO",
  pushTitle: "¡Aquí está tu regalo!",
  coinsLine: "Chatea con los amigos que conozcas.",
  // 24시간 표기, 1시만 「a la」.
  unlimitedUntil: (end) =>
    `Todas las lecciones son gratis hasta ${end.day === "today" ? "hoy" : "mañana"} ${end.hours === 1 ? "a la" : "a las"} ${clock24(end.hours, end.minutes)}.`,
  hoursShort: (hours) => `${hours} h`,
};

const id: SignupRewardCopy = {
  cardTitle: (amount) => `Dapatkan ${amount} Yeopjeon gratis`,
  cardBody: "Daftar — progresmu ikut tersimpan.",
  signUp: "Daftar",
  tag: "HADIAH SELAMAT DATANG",
  title: "Kamu sudah terdaftar!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "Progresmu sebagai tamu sudah tersimpan di akunmu.",
  bodyNew: "Pakai Yeopjeon untuk mengobrol dengan teman yang kamu temui.",
  gotIt: "Mengerti",
  pushTag: "HADIAH",
  pushTitle: "Hadiahmu sudah datang!",
  coinsLine: "Mengobrol dengan teman yang kamu temui.",
  // 24시간 · 점 구분 · 두 자리 시(`pukul 09.05`).
  unlimitedUntil: (end) =>
    `Semua pelajaran gratis sampai ${end.day === "today" ? "hari ini" : "besok"} pukul ${clock24Padded(end.hours, end.minutes, ".")}.`,
  hoursShort: (hours) => `${hours} jam`,
};

const ja: SignupRewardCopy = {
  cardTitle: (amount) => `${amount} Yeopjeonを無料でもらおう`,
  cardBody: "登録すると、これまでの学習記録もそのまま引き継げます。",
  signUp: "登録する",
  tag: "ウェルカムギフト",
  title: "登録が完了しました！",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "ゲストでの学習記録はアカウントに保存されました。",
  bodyNew: "Yeopjeonを使って、出会った友だちとチャットしましょう。",
  gotIt: "わかりました",
  pushTag: "ギフト",
  pushTitle: "ギフトが届きました！",
  coinsLine: "出会った友だちとチャットしましょう。",
  unlimitedUntil: (end) =>
    `${end.day === "today" ? "今日" : "明日"}${clock24(end.hours, end.minutes)}まで、すべてのレッスンが無料です。`,
  hoursShort: (hours) => `${hours}時間`,
};

const vi: SignupRewardCopy = {
  cardTitle: (amount) => `Nhận miễn phí ${amount} Yeopjeon`,
  cardBody: "Đăng ký — tiến độ học của bạn vẫn được giữ nguyên.",
  signUp: "Đăng ký",
  tag: "QUÀ CHÀO MỪNG",
  title: "Bạn đã đăng ký xong!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "Tiến độ học khi dùng với tư cách khách đã được lưu vào tài khoản của bạn.",
  bodyNew: "Dùng Yeopjeon để trò chuyện với những người bạn đã gặp.",
  gotIt: "Đã hiểu",
  pushTag: "QUÀ TẶNG",
  pushTitle: "Quà của bạn đây!",
  coinsLine: "Trò chuyện với những người bạn đã gặp.",
  unlimitedUntil: (end) =>
    `Mọi bài học đều miễn phí đến ${clock24(end.hours, end.minutes)} ${end.day === "today" ? "hôm nay" : "ngày mai"}.`,
  hoursShort: (hours) => `${hours} giờ`,
};

const th: SignupRewardCopy = {
  cardTitle: (amount) => `รับ ${amount} Yeopjeon ฟรี`,
  cardBody: "สมัครสมาชิก แล้วความคืบหน้าของคุณจะตามไปด้วย",
  signUp: "สมัครสมาชิก",
  tag: "ของขวัญต้อนรับ",
  title: "สมัครสมาชิกเรียบร้อยแล้ว!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "ความคืบหน้าตอนใช้งานแบบผู้เยี่ยมชมถูกบันทึกไว้ในบัญชีของคุณแล้ว",
  bodyNew: "ใช้ Yeopjeon แชทกับเพื่อนๆ ที่คุณได้พบ",
  gotIt: "เข้าใจแล้ว",
  pushTag: "ของขวัญ",
  pushTitle: "ของขวัญของคุณมาแล้ว!",
  coinsLine: "แชทกับเพื่อนๆ ที่คุณได้พบ",
  unlimitedUntil: (end) =>
    `เรียนได้ฟรีทุกบทเรียนจนถึง${end.day === "today" ? "วันนี้" : "พรุ่งนี้"} เวลา ${clock24(end.hours, end.minutes)} น.`,
  hoursShort: (hours) => `${hours} ชม.`,
};

const my: SignupRewardCopy = {
  cardTitle: (amount) => `Yeopjeon ${amount} ကို အခမဲ့ ရယူပါ`,
  cardBody: "အကောင့်ဖွင့်ပါ — သင့်လေ့လာမှု တိုးတက်မှုများ ဆက်ပါလာပါမည်။",
  signUp: "အကောင့်ဖွင့်ရန်",
  tag: "ကြိုဆိုလက်ဆောင်",
  title: "အကောင့်ဖွင့်ပြီးပါပြီ!",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "ဧည့်သည်အဖြစ် လေ့လာခဲ့သမျှကို သင့်အကောင့်တွင် သိမ်းဆည်းပြီးပါပြီ။",
  bodyNew: "တွေ့ဆုံခဲ့သော သူငယ်ချင်းများနှင့် ချတ်ရန် Yeopjeon ကို အသုံးပြုပါ။",
  gotIt: "နားလည်ပြီ",
  pushTag: "လက်ဆောင်",
  pushTitle: "သင့်လက်ဆောင် ရောက်ပါပြီ!",
  // 줄 칸이 좁아 Android가 음절 가운데서 줄을 바꾸므로(기기 확인 2026-11-25) 「만난」을 빼고 한 줄에 서게 짧게.
  coinsLine: "သူငယ်ချင်းများနှင့် ချတ်ပါ။",
  // 12시간 — 오전 「နံနက်」 · 오후 「ညနေ」를 시각 앞에.
  unlimitedUntil: (end) => {
    const clock = clock12(end.hours, end.minutes);
    const day = end.day === "today" ? "ယနေ့" : "မနက်ဖြန်";
    return `${day} ${clock.pm ? "ညနေ" : "နံနက်"} ${clock.hour}:${clock.minutes} အထိ သင်ခန်းစာအားလုံး အခမဲ့ဖြစ်ပါသည်။`;
  },
  hoursShort: (hours) => `${hours} နာရီ`,
};

// 대만 중국어(번체) — 번역 초안, 원어민 검수 필요(ADR-0185).
const zhTw: SignupRewardCopy = {
  cardTitle: (amount) => `免費領取 ${amount} Yeopjeon`,
  cardBody: "註冊帳號，你的學習進度會一起保留。",
  signUp: "註冊",
  tag: "歡迎禮",
  title: "註冊完成！",
  amountSpoken: (amount) => `+${amount} Yeopjeon`,
  bodyGuest: "你以訪客身分學習的進度已存到你的帳號。",
  bodyNew: "用 Yeopjeon 和你認識的朋友聊天吧。",
  gotIt: "知道了",
  pushTag: "禮物",
  pushTitle: "你的禮物到了！",
  coinsLine: "和你認識的朋友聊天吧。",
  // 12시간 — 「上午 · 下午」를 시각 앞에.
  unlimitedUntil: (end) => {
    const clock = clock12(end.hours, end.minutes);
    const day = end.day === "today" ? "今天" : "明天";
    return `${day}${clock.pm ? "下午" : "上午"}${clock.hour}:${clock.minutes}前，所有課程都免費。`;
  },
  hoursShort: (hours) => `${hours}小時`,
};

export const signupRewardCopy: Readonly<Record<EntryLanguage, SignupRewardCopy>> = {
  en,
  es,
  id,
  ja,
  vi,
  th,
  my,
  "zh-TW": zhTw,
};
