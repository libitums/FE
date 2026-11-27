// 빈도 실험 문구(ADR-0208) — 단계와 상관없이 쓰는 두 가지: 복귀 문구 하나, 매일 알림을 멈춘다는 마지막 알림.

import type { Copy } from "./push-campaign-types.ts";

export const winbackAnyCopy: Copy = {
  en: {
    title: "Still thinking about Korean? 🇰🇷",
    body: "{name}, your place is saved. One short lesson gets you back in.",
  },
  vi: {
    title: "Vẫn nghĩ về tiếng Hàn chứ? 🇰🇷",
    body: "{name}, chỗ của bạn vẫn được lưu. Một bài ngắn là bắt nhịp lại ngay.",
  },
  id: {
    title: "Masih kepikiran bahasa Korea? 🇰🇷",
    body: "{name}, posisimu tersimpan. Satu pelajaran singkat dan kamu kembali lagi.",
  },
  ms: {
    title: "Masih teringat bahasa Korea? 🇰🇷",
    body: "{name}, tempat anda disimpan. Satu pelajaran pendek dan anda kembali semula.",
  },
  es: {
    title: "¿Sigues pensando en el coreano? 🇰🇷",
    body: "{name}, tu lugar está guardado. Con una lección corta vuelves al ritmo.",
  },
  ja: {
    title: "韓国語、まだ気になりますか？🇰🇷",
    body: "{name}さん、続きは保存されています。短いレッスン1つで戻れます。",
  },
  "zh-TW": {
    title: "還惦記著韓語嗎？🇰🇷",
    body: "{name}，你的進度還留著。一堂短短的課就能回到軌道。",
  },
};

export const lastCopy: Copy = {
  en: {
    title: "We'll pause the daily reminders",
    body: "{name}, they don't seem to be helping, so we'll go quiet for now. Your Korean story stays saved on the map.",
  },
  vi: {
    title: "Chúng tôi sẽ tạm dừng nhắc hằng ngày",
    body: "{name}, có vẻ lời nhắc chưa giúp được bạn nên chúng tôi sẽ tạm im lặng. Câu chuyện tiếng Hàn của bạn vẫn được lưu trên bản đồ.",
  },
  id: {
    title: "Pengingat harian kami jeda dulu",
    body: "{name}, sepertinya pengingat ini kurang membantu, jadi kami diam dulu. Cerita Koreamu tetap tersimpan di peta.",
  },
  ms: {
    title: "Peringatan harian akan dihentikan seketika",
    body: "{name}, nampaknya peringatan ini tidak membantu, jadi kami akan senyap dahulu. Cerita Korea anda kekal disimpan di peta.",
  },
  es: {
    title: "Pausamos los recordatorios diarios",
    body: "{name}, parece que no están ayudando, así que guardaremos silencio por ahora. Tu historia en coreano sigue guardada en el mapa.",
  },
  ja: {
    title: "毎日のお知らせをお休みします",
    body: "{name}さん、お知らせがお役に立てていないようなので、しばらく控えます。韓国語のストーリーはマップに保存されています。",
  },
  "zh-TW": {
    title: "每日提醒先暫停",
    body: "{name}，提醒似乎沒有幫上忙，我們先安靜一陣子。你的韓語故事會一直保存在地圖上。",
  },
};
