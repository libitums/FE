// 빈도 실험 문구(ADR-0208) — 튜토리얼을 아직 끝내지 않은 사람(표지 · 레슨 1 · 레슨 2 · 나머지). 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.
// 말투는 듀오링고처럼 「기다리다 풀이 죽은 Duru」(사용자 결정 2026-11-27).

import type { StageCopy } from "./push-campaign-types.ts";

export const tutorialCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "Duru is eating lunch alone 🥺",
        body: "{name}, keep it company with one short Korean lesson?",
      },
      vi: {
        title: "Duru đang ăn trưa một mình 🥺",
        body: "{name}, học một bài tiếng Hàn ngắn cho Duru đỡ buồn nhé?",
      },
      id: {
        title: "Duru makan siang sendirian 🥺",
        body: "{name}, temani Duru dengan satu pelajaran Korea singkat?",
      },
      ms: {
        title: "Duru makan tengah hari seorang diri 🥺",
        body: "{name}, temankan Duru dengan satu pelajaran Korea yang pendek?",
      },
      es: {
        title: "Duru está almorzando solo 🥺",
        body: "{name}, ¿le haces compañía con una lección corta de coreano?",
      },
      ja: {
        title: "Duruはひとりでお昼を食べています 🥺",
        body: "{name}さん、短い韓国語レッスンを1つ、一緒にどうですか。",
      },
      "zh-TW": {
        title: "Duru 一個人在吃午餐 🥺",
        body: "{name}，上一堂短短的韓語課陪陪它好嗎？",
      },
    },
    {
      en: {
        title: "You said 안녕하세요 and left 😢",
        body: "{name}, Duru only got one hello from you. Come learn the next word.",
      },
      vi: {
        title: "Bạn nói 안녕하세요 rồi đi mất 😢",
        body: "{name}, Duru mới nhận được một lời chào từ bạn. Quay lại học từ tiếp theo nhé.",
      },
      id: {
        title: "Kamu bilang 안녕하세요 lalu pergi 😢",
        body: "{name}, Duru baru dapat satu sapaan darimu. Ayo pelajari kata berikutnya.",
      },
      ms: {
        title: "Anda sebut 안녕하세요 lalu pergi 😢",
        body: "{name}, Duru baru dapat satu sapaan daripada anda. Mari belajar perkataan seterusnya.",
      },
      es: {
        title: "Dijiste 안녕하세요 y te fuiste 😢",
        body: "{name}, Duru solo recibió un saludo tuyo. Ven a aprender la siguiente palabra.",
      },
      ja: {
        title: "안녕하세요と言ったきりです 😢",
        body: "{name}さん、Duruはまだ挨拶をひとつしかもらっていません。次の言葉を覚えに来てください。",
      },
      "zh-TW": {
        title: "你說了 안녕하세요 就走了 😢",
        body: "{name}，Duru 只收到你一句問候。回來學下一個詞吧。",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "Duru waited all day 🥺",
        body: "{name}, your first Korean lesson is still sitting here. Just one tonight?",
      },
      vi: {
        title: "Duru đã chờ cả ngày 🥺",
        body: "{name}, bài học tiếng Hàn đầu tiên vẫn nằm ở đây. Tối nay học một bài thôi nhé?",
      },
      id: {
        title: "Duru menunggu seharian 🥺",
        body: "{name}, pelajaran Korea pertamamu masih di sini. Satu saja malam ini?",
      },
      ms: {
        title: "Duru menunggu sepanjang hari 🥺",
        body: "{name}, pelajaran Korea pertama anda masih di sini. Satu sahaja malam ini?",
      },
      es: {
        title: "Duru esperó todo el día 🥺",
        body: "{name}, tu primera lección de coreano sigue aquí. ¿Solo una esta noche?",
      },
      ja: {
        title: "Duruは一日中待っていました 🥺",
        body: "{name}さん、最初の韓国語レッスンがまだここにあります。今夜1つだけ、どうですか。",
      },
      "zh-TW": {
        title: "Duru 等了一整天 🥺",
        body: "{name}，你的第一堂韓語課還在這裡。今晚上一堂就好？",
      },
    },
    {
      en: {
        title: "Did Duru do something wrong? 😢",
        body: "{name}, you left before the tutorial ended. Give it one more try tonight.",
      },
      vi: {
        title: "Duru đã làm gì sai sao? 😢",
        body: "{name}, bạn rời đi khi phần hướng dẫn chưa xong. Tối nay thử lại một lần nữa nhé.",
      },
      id: {
        title: "Apa Duru salah? 😢",
        body: "{name}, kamu pergi sebelum tutorialnya selesai. Coba sekali lagi malam ini.",
      },
      ms: {
        title: "Duru ada buat salah ke? 😢",
        body: "{name}, anda pergi sebelum tutorial tamat. Cuba sekali lagi malam ini.",
      },
      es: {
        title: "¿Duru hizo algo mal? 😢",
        body: "{name}, te fuiste antes de terminar el tutorial. Dale otra oportunidad esta noche.",
      },
      ja: {
        title: "Duruが何か悪いことをしましたか？😢",
        body: "{name}さん、チュートリアルの途中でいなくなってしまいました。今夜もう一度だけ、どうですか。",
      },
      "zh-TW": {
        title: "Duru 做錯什麼了嗎？😢",
        body: "{name}，新手教學還沒結束你就離開了。今晚再試一次吧。",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "Duru still remembers you 🥺",
        body: "{name}, it's been a while. Your Korean tutorial is right where you left it.",
      },
      vi: {
        title: "Duru vẫn nhớ bạn 🥺",
        body: "{name}, lâu rồi không gặp. Phần hướng dẫn tiếng Hàn vẫn ở đúng chỗ bạn dừng lại.",
      },
      id: {
        title: "Duru masih ingat kamu 🥺",
        body: "{name}, sudah lama, ya. Tutorial bahasa Koreamu masih di tempat terakhir kamu berhenti.",
      },
      ms: {
        title: "Duru masih ingat anda 🥺",
        body: "{name}, sudah lama tak jumpa. Tutorial bahasa Korea anda masih di tempat anda berhenti.",
      },
      es: {
        title: "Duru todavía te recuerda 🥺",
        body: "{name}, ha pasado un tiempo. Tu tutorial de coreano sigue donde lo dejaste.",
      },
      ja: {
        title: "Duruはまだ覚えています 🥺",
        body: "{name}さん、お久しぶりです。韓国語のチュートリアルは止めたところのままです。",
      },
      "zh-TW": {
        title: "Duru 還記得你 🥺",
        body: "{name}，好久不見。你的韓語新手教學還停在你離開的地方。",
      },
    },
  ],
};
