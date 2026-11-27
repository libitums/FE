// 빈도 실험 문구(ADR-0208) — 튜토리얼을 아직 끝내지 않은 사람(표지 · 레슨 1 · 레슨 2 · 나머지). 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.

import type { StageCopy } from "./push-campaign-types.ts";

export const tutorialCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "A few minutes for Korean? ⏱️",
        body: "{name}, your first lesson is short. Try it on your break.",
      },
      vi: {
        title: "Vài phút cho tiếng Hàn nhé? ⏱️",
        body: "{name}, bài học đầu tiên rất ngắn. Thử ngay trong giờ nghỉ nhé.",
      },
      id: {
        title: "Beberapa menit untuk bahasa Korea? ⏱️",
        body: "{name}, pelajaran pertamamu singkat. Coba saat istirahat.",
      },
      ms: {
        title: "Beberapa minit untuk bahasa Korea? ⏱️",
        body: "{name}, pelajaran pertama anda pendek sahaja. Cuba semasa rehat.",
      },
      es: {
        title: "¿Unos minutos para el coreano? ⏱️",
        body: "{name}, tu primera lección es corta. Pruébala en tu descanso.",
      },
      ja: {
        title: "韓国語に数分だけ ⏱️",
        body: "{name}さん、最初のレッスンは短いです。休憩中にどうぞ。",
      },
      "zh-TW": {
        title: "花幾分鐘學韓語？⏱️",
        body: "{name}，第一課很短，休息時試試看吧。",
      },
    },
    {
      en: {
        title: "안녕하세요 means hello 👋",
        body: "{name}, that's one Korean phrase already. Learn the next one in the tutorial.",
      },
      vi: {
        title: "안녕하세요 nghĩa là xin chào 👋",
        body: "{name}, vậy là bạn đã biết một câu tiếng Hàn. Học câu tiếp theo trong phần hướng dẫn nhé.",
      },
      id: {
        title: "안녕하세요 artinya halo 👋",
        body: "{name}, itu sudah satu frasa Korea. Pelajari yang berikutnya di tutorial.",
      },
      ms: {
        title: "안녕하세요 bermaksud helo 👋",
        body: "{name}, itu sudah satu frasa Korea. Belajar yang seterusnya dalam tutorial.",
      },
      es: {
        title: "안녕하세요 significa hola 👋",
        body: "{name}, ya sabes una frase en coreano. Aprende la siguiente en el tutorial.",
      },
      ja: {
        title: "안녕하세요は「こんにちは」👋",
        body: "{name}さん、これで韓国語をひとつ覚えました。次はチュートリアルで。",
      },
      "zh-TW": {
        title: "안녕하세요 是「你好」👋",
        body: "{name}，你已經會一句韓語了。下一句就在新手教學裡。",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "Your Korean story hasn't started yet",
        body: "{name}, one short lesson tonight and it begins.",
      },
      vi: {
        title: "Câu chuyện tiếng Hàn của bạn chưa bắt đầu",
        body: "{name}, chỉ cần một bài ngắn tối nay là câu chuyện bắt đầu.",
      },
      id: {
        title: "Cerita Koreamu belum dimulai",
        body: "{name}, satu pelajaran singkat malam ini dan ceritanya dimulai.",
      },
      ms: {
        title: "Cerita Korea anda belum bermula",
        body: "{name}, satu pelajaran pendek malam ini dan cerita pun bermula.",
      },
      es: {
        title: "Tu historia en coreano aún no empieza",
        body: "{name}, con una lección corta esta noche ya comienza.",
      },
      ja: {
        title: "韓国語のストーリーはまだ始まっていません",
        body: "{name}さん、今夜レッスンを1つやれば始まります。",
      },
      "zh-TW": {
        title: "你的韓語故事還沒開始",
        body: "{name}，今晚上一堂短短的課，故事就開始了。",
      },
    },
    {
      en: {
        title: "Still want to learn Korean? 🇰🇷",
        body: "{name}, the tutorial is right where you left it. Pick it up tonight.",
      },
      vi: {
        title: "Bạn vẫn muốn học tiếng Hàn chứ? 🇰🇷",
        body: "{name}, phần hướng dẫn vẫn ở đúng chỗ bạn dừng lại. Tối nay học tiếp nhé.",
      },
      id: {
        title: "Masih mau belajar bahasa Korea? 🇰🇷",
        body: "{name}, tutorialnya masih di tempat terakhir kamu berhenti. Lanjutkan malam ini.",
      },
      ms: {
        title: "Masih mahu belajar bahasa Korea? 🇰🇷",
        body: "{name}, tutorial masih di tempat anda berhenti. Sambung malam ini.",
      },
      es: {
        title: "¿Aún quieres aprender coreano? 🇰🇷",
        body: "{name}, el tutorial sigue donde lo dejaste. Retómalo esta noche.",
      },
      ja: {
        title: "韓国語、まだ続けますか？🇰🇷",
        body: "{name}さん、チュートリアルは止めたところで待っています。今夜続きをどうぞ。",
      },
      "zh-TW": {
        title: "還想學韓語嗎？🇰🇷",
        body: "{name}，新手教學還停在你離開的地方，今晚接著學吧。",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "It's been a while 👋",
        body: "{name}, your Korean tutorial is still here. Come back for one short lesson.",
      },
      vi: {
        title: "Lâu rồi không gặp 👋",
        body: "{name}, phần hướng dẫn tiếng Hàn vẫn còn đây. Quay lại học một bài ngắn nhé.",
      },
      id: {
        title: "Sudah lama, ya 👋",
        body: "{name}, tutorial bahasa Koreamu masih ada. Kembali untuk satu pelajaran singkat.",
      },
      ms: {
        title: "Sudah lama tak jumpa 👋",
        body: "{name}, tutorial bahasa Korea anda masih ada. Kembali untuk satu pelajaran pendek.",
      },
      es: {
        title: "Ha pasado un tiempo 👋",
        body: "{name}, tu tutorial de coreano sigue aquí. Vuelve para una lección corta.",
      },
      ja: {
        title: "お久しぶりです 👋",
        body: "{name}さん、韓国語のチュートリアルはそのままです。短いレッスンを1つ、どうですか。",
      },
      "zh-TW": {
        title: "好久不見 👋",
        body: "{name}，你的韓語新手教學還在。回來上一堂短短的課吧。",
      },
    },
  ],
};
