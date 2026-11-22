// 가입 보상 문구(ADR-0174, 시안 Main · Reward) — 일곱 언어를 한 파일에 두고 각 언어 표가 자기 몫을 꽂습니다
// (`ui-copy-streak-reward.ts`와 같은 방식). 엽전은 화면에서 「Yeopjeon」으로 적습니다(ADR-0116).

import type { EntryLanguage } from "./entry-language";

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
  hoursShort: (hours) => `${hours} နာရီ`,
};

export const signupRewardCopy: Readonly<Record<EntryLanguage, SignupRewardCopy>> = {
  en,
  es,
  id,
  ja,
  vi,
  th,
  my,
};
