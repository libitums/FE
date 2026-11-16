// 자동 캠페인 설정(ADR-0130 D12) — 사용자 결정 2026-11-16: 승자 = 캐릭터 톤(모든 세그먼트), 다음 A/B = 캐릭터 톤 vs 단계별 예고,
// 매일(매시 돌며 현지 20시) · 같은 사람은 72시간에 한 번. 문구 A는 2026-11-13 추천의 캐릭터 톤(없는 세그먼트는 콘솔 DEFAULT_COPY_B).

import type { CampaignConfig } from "./push-campaign-plan.ts";

export const pushCampaignConfig: CampaignConfig = {
  localHour: 20,
  cooldownHours: 72,
  rules: {
    "tutorial-cover": { holdoutPercent: 30, minIdleHours: 20, maxIdleHours: 24 * 14, story: false },
    "tutorial-lesson1": {
      holdoutPercent: 50,
      minIdleHours: 20,
      maxIdleHours: 24 * 14,
      story: false,
    },
    "tutorial-lesson2": {
      holdoutPercent: 50,
      minIdleHours: 20,
      maxIdleHours: 24 * 14,
      story: true,
    },
    "tutorial-rest": { holdoutPercent: 30, minIdleHours: 20, maxIdleHours: 24 * 14, story: true },
    "episode-next": { holdoutPercent: 30, minIdleHours: 20, maxIdleHours: 24 * 21, story: true },
    "episode-mid": { holdoutPercent: 30, minIdleHours: 20, maxIdleHours: 24 * 21, story: true },
  },
  copy: {
    "tutorial-cover": {
      en: {
        title: "{character}: 안녕하세요! 👋",
        body: "{name}, your Korean story starts with one hello. Say it back?",
      },
    },
    "tutorial-lesson1": {
      en: {
        title: "{character}: 어서 오세요 ✈️",
        body: '{name}, "어서 오세요" means "Welcome." Your first Korean words are in lesson 1. Tap it on the map.',
      },
      vi: {
        title: "{character}: 어서 오세요 ✈️",
        body: '{name}, "어서 오세요" nghĩa là "Chào mừng". Những từ tiếng Hàn đầu tiên ở bài 1. Chọn bài 1 trên bản đồ nhé.',
      },
      ms: {
        title: "{character}: 어서 오세요 ✈️",
        body: '{name}, "어서 오세요" bermaksud "Selamat datang". Perkataan Korea pertama anda ada dalam pelajaran 1. Tekan di peta.',
      },
      es: {
        title: "{character}: 어서 오세요 ✈️",
        body: "{name}, «어서 오세요» significa «Bienvenido». Tus primeras palabras en coreano están en la lección 1. Tócala en el mapa.",
      },
      ja: {
        title: "{character}: 어서 오세요 ✈️",
        body: "{name}さん、「어서 오세요」は「ようこそ」という意味です。最初の韓国語はレッスン1にあります。マップでタップしてください。",
      },
    },
    "tutorial-lesson2": {
      en: {
        title: "{character}: 괜찮아요 🙂",
        body: '{name}, "괜찮아요" means "It\'s okay." Lesson 2 is hard for almost everyone at first. Tap lesson 2 on the map and try again.',
      },
      vi: {
        title: "{character}: 괜찮아요 🙂",
        body: '{name}, "괜찮아요" nghĩa là "Không sao đâu". Bài 2 lúc đầu khó với hầu hết mọi người. Chọn bài 2 trên bản đồ và thử lại nhé.',
      },
      ms: {
        title: "{character}: 괜찮아요 🙂",
        body: '{name}, "괜찮아요" bermaksud "Tak apa". Pelajaran 2 sukar bagi hampir semua orang pada mulanya. Tekan pelajaran 2 di peta dan cuba lagi.',
      },
      es: {
        title: "{character}: 괜찮아요 🙂",
        body: "{name}, «괜찮아요» significa «Está bien». La lección 2 cuesta a casi todos al principio. Toca la lección 2 en el mapa y vuelve a intentarlo.",
      },
      ja: {
        title: "{character}: 괜찮아요 🙂",
        body: "{name}さん、「괜찮아요」は「大丈夫」という意味です。レッスン2は最初はほとんどの人が難しく感じます。マップでレッスン2をもう一度どうぞ。",
      },
    },
    "tutorial-rest": {
      en: {
        title: "{character}: 거의 다 왔어요 🎉",
        body: "{name}, just a few steps left in the tutorial.",
      },
    },
    "episode-next": {
      en: {
        title: "{character}: 수고했어요 👏",
        body: '{name}, "수고했어요" means "You did great." Your next story, {episode}, is ready on the map.',
      },
      vi: {
        title: "{character}: 수고했어요 👏",
        body: '{name}, "수고했어요" nghĩa là "Bạn đã làm tốt lắm". Câu chuyện tiếp theo, {episode}, đã có trên bản đồ.',
      },
      ms: {
        title: "{character}: 수고했어요 👏",
        body: '{name}, "수고했어요" bermaksud "Anda sudah buat dengan baik". Cerita seterusnya, {episode}, sudah ada di peta.',
      },
      es: {
        title: "{character}: 수고했어요 👏",
        body: "{name}, «수고했어요» significa «Lo hiciste muy bien». Tu próxima historia, {episode}, ya está en el mapa.",
      },
    },
    "episode-mid": {
      en: {
        title: "{character}: 같이 가요 😊",
        body: '{name}, "같이 가요" means "Let\'s go together." Your story is waiting on the map. One lesson tonight?',
      },
      vi: {
        title: "{character}: 같이 가요 😊",
        body: '{name}, "같이 가요" nghĩa là "Cùng đi nào". Câu chuyện đang chờ bạn trên bản đồ. Tối nay học 1 bài nhé?',
      },
      ms: {
        title: "{character}: 같이 가요 😊",
        body: '{name}, "같이 가요" bermaksud "Jom pergi bersama". Cerita anda menunggu di peta. 1 pelajaran malam ini?',
      },
      es: {
        title: "{character}: 같이 가요 😊",
        body: "{name}, «같이 가요» significa «Vamos juntos». Tu historia te espera en el mapa. ¿Una lección esta noche?",
      },
      ja: {
        title: "{character}: 같이 가요 😊",
        body: "{name}さん、「같이 가요」は「一緒に行こう」という意味です。マップでストーリーが待っています。今夜レッスンを1つどうですか。",
      },
    },
  },
};
