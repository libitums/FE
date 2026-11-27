// 빈도 실험 문구(ADR-0208) — 단계와 상관없이 쓰는 두 가지: 복귀 문구 하나, 매일 알림을 멈춘다는 마지막 알림.
// 말투는 듀오링고처럼 「기다리다 풀이 죽은 Duru」(사용자 결정 2026-11-27).

import type { Copy } from "./push-campaign-types.ts";

export const winbackAnyCopy: Copy = {
  en: {
    title: "Is this goodbye? 😢",
    body: "{name}, Duru hopes not. One short lesson and you're back.",
  },
  vi: {
    title: "Đây là lời tạm biệt sao? 😢",
    body: "{name}, Duru mong là không. Chỉ một bài ngắn là bạn trở lại rồi.",
  },
  id: {
    title: "Apa ini perpisahan? 😢",
    body: "{name}, semoga bukan. Satu pelajaran singkat dan kamu kembali lagi.",
  },
  ms: {
    title: "Adakah ini selamat tinggal? 😢",
    body: "{name}, Duru harap tidak. Satu pelajaran pendek dan anda kembali semula.",
  },
  es: {
    title: "¿Esto es un adiós? 😢",
    body: "{name}, Duru espera que no. Una lección corta y estás de vuelta.",
  },
  ja: {
    title: "これでお別れですか？😢",
    body: "{name}さん、Duruはそうでないことを願っています。短いレッスン1つで戻れます。",
  },
  "zh-TW": {
    title: "這是道別嗎？😢",
    body: "{name}，Duru 希望不是。一堂短短的課，你就回來了。",
  },
};

export const lastCopy: Copy = {
  en: {
    title: "Duru will stop bothering you 😢",
    body: "{name}, these reminders don't seem to be working, so Duru will go quiet for now. Your Korean story stays saved on the map.",
  },
  vi: {
    title: "Duru sẽ không làm phiền bạn nữa 😢",
    body: "{name}, có vẻ lời nhắc không giúp được gì nên Duru sẽ tạm im lặng. Câu chuyện tiếng Hàn của bạn vẫn được lưu trên bản đồ.",
  },
  id: {
    title: "Duru tidak akan mengganggumu lagi 😢",
    body: "{name}, sepertinya pengingat ini tidak membantu, jadi Duru diam dulu. Cerita Koreamu tetap tersimpan di peta.",
  },
  ms: {
    title: "Duru tidak akan ganggu anda lagi 😢",
    body: "{name}, nampaknya peringatan ini tidak membantu, jadi Duru akan senyap dahulu. Cerita Korea anda kekal disimpan di peta.",
  },
  es: {
    title: "Duru dejará de molestarte 😢",
    body: "{name}, parece que estos recordatorios no funcionan, así que Duru guardará silencio por ahora. Tu historia en coreano sigue guardada en el mapa.",
  },
  ja: {
    title: "Duruはもうお邪魔しません 😢",
    body: "{name}さん、お知らせがお役に立てていないようなので、Duruはしばらく静かにします。韓国語のストーリーはマップに保存されています。",
  },
  "zh-TW": {
    title: "Duru 不再打擾你了 😢",
    body: "{name}，提醒似乎沒有用，Duru 先安靜一陣子。你的韓語故事會一直保存在地圖上。",
  },
};
