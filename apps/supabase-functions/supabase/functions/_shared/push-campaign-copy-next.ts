// 빈도 실험 문구(ADR-0208) — 에피소드를 끝내고 다음 에피소드를 시작하지 않은 사람. 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.
// 말투는 듀오링고처럼 「기다리다 풀이 죽은 Duru」(사용자 결정 2026-11-27).

import type { StageCopy } from "./push-campaign-types.ts";

export const nextCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "{episode} is ready, but you're not here 🥺",
        body: "{name}, your next story has been open all morning. Take a look?",
      },
      vi: {
        title: "{episode} đã sẵn sàng mà bạn chưa tới 🥺",
        body: "{name}, câu chuyện tiếp theo đã mở suốt buổi sáng. Vào xem nhé?",
      },
      id: {
        title: "{episode} sudah siap, tapi kamu belum datang 🥺",
        body: "{name}, cerita berikutnya sudah terbuka sejak pagi. Mau lihat?",
      },
      ms: {
        title: "{episode} sudah sedia, tetapi anda tiada 🥺",
        body: "{name}, cerita seterusnya sudah dibuka sejak pagi. Mahu lihat?",
      },
      es: {
        title: "{episode} está listo, pero tú no llegas 🥺",
        body: "{name}, tu próxima historia lleva abierta toda la mañana. ¿Le echas un vistazo?",
      },
      ja: {
        title: "「{episode}」は準備できたのに… 🥺",
        body: "{name}さん、次のストーリーは朝からずっと開いています。のぞいてみませんか。",
      },
      "zh-TW": {
        title: "「{episode}」準備好了，你卻沒來 🥺",
        body: "{name}，下一個故事從早上就開著了。來看看好嗎？",
      },
    },
    {
      en: {
        title: "Duru keeps checking the door 👀",
        body: "{name}, you finished one episode and vanished. {episode} is waiting.",
      },
      vi: {
        title: "Duru cứ ngóng ra cửa mãi 👀",
        body: "{name}, bạn học xong một tập rồi biến mất. {episode} đang chờ bạn.",
      },
      id: {
        title: "Duru terus melirik ke pintu 👀",
        body: "{name}, kamu menyelesaikan satu episode lalu menghilang. {episode} menunggu.",
      },
      ms: {
        title: "Duru asyik menjenguk ke pintu 👀",
        body: "{name}, anda habiskan satu episod lalu menghilang. {episode} sedang menunggu.",
      },
      es: {
        title: "Duru no deja de mirar la puerta 👀",
        body: "{name}, terminaste un episodio y desapareciste. {episode} te espera.",
      },
      ja: {
        title: "Duruはずっとドアを見ています 👀",
        body: "{name}さん、1話クリアしたきり姿が見えません。「{episode}」が待っています。",
      },
      "zh-TW": {
        title: "Duru 一直望著門口 👀",
        body: "{name}，你學完一集就不見了。「{episode}」還在等你。",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "Duru saved you a seat 🥺",
        body: "{name}, {episode} hasn't started without you. One lesson tonight?",
      },
      vi: {
        title: "Duru đã giữ chỗ cho bạn 🥺",
        body: "{name}, {episode} chưa bắt đầu vì thiếu bạn. Tối nay học một bài nhé?",
      },
      id: {
        title: "Duru menyimpan kursi untukmu 🥺",
        body: "{name}, {episode} belum dimulai tanpamu. Satu pelajaran malam ini?",
      },
      ms: {
        title: "Duru simpan tempat untuk anda 🥺",
        body: "{name}, {episode} belum bermula tanpa anda. Satu pelajaran malam ini?",
      },
      es: {
        title: "Duru te guardó un lugar 🥺",
        body: "{name}, {episode} no ha empezado sin ti. ¿Una lección esta noche?",
      },
      ja: {
        title: "Duruが席を取っておきました 🥺",
        body: "{name}さん、「{episode}」はまだ始まっていません。今夜レッスンを1つどうですか。",
      },
      "zh-TW": {
        title: "Duru 幫你留了位子 🥺",
        body: "{name}，「{episode}」沒有你就還沒開始。今晚上一課？",
      },
    },
    {
      en: {
        title: "Another night without Korean? 😢",
        body: "{name}, {episode} takes a few minutes. Duru will stop sulking, promise.",
      },
      vi: {
        title: "Lại một tối không có tiếng Hàn sao? 😢",
        body: "{name}, {episode} chỉ mất vài phút. Duru hứa sẽ hết dỗi.",
      },
      id: {
        title: "Satu malam lagi tanpa bahasa Korea? 😢",
        body: "{name}, {episode} hanya beberapa menit. Duru janji berhenti merajuk.",
      },
      ms: {
        title: "Satu malam lagi tanpa bahasa Korea? 😢",
        body: "{name}, {episode} hanya beberapa minit. Duru janji tidak merajuk lagi.",
      },
      es: {
        title: "¿Otra noche sin coreano? 😢",
        body: "{name}, {episode} son solo unos minutos. Duru promete dejar de hacer pucheros.",
      },
      ja: {
        title: "今夜も韓国語なしですか？😢",
        body: "{name}さん、「{episode}」は数分で終わります。Duruももう拗ねません。",
      },
      "zh-TW": {
        title: "又一個沒有韓語的夜晚？😢",
        body: "{name}，「{episode}」只要幾分鐘。Duru 保證不再鬧彆扭。",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "Duru misses you 🥺",
        body: "{name}, {episode} is still open on the map. Come back and start it.",
      },
      vi: {
        title: "Duru nhớ bạn 🥺",
        body: "{name}, {episode} vẫn mở trên bản đồ. Quay lại và bắt đầu nhé.",
      },
      id: {
        title: "Duru kangen kamu 🥺",
        body: "{name}, {episode} masih terbuka di peta. Kembali dan mulai, yuk.",
      },
      ms: {
        title: "Duru rindu anda 🥺",
        body: "{name}, {episode} masih dibuka di peta. Kembali dan mulakan.",
      },
      es: {
        title: "Duru te extraña 🥺",
        body: "{name}, {episode} sigue abierto en el mapa. Vuelve y empiézalo.",
      },
      ja: {
        title: "Duruが寂しがっています 🥺",
        body: "{name}さん、「{episode}」はまだマップで開いています。戻って始めましょう。",
      },
      "zh-TW": {
        title: "Duru 好想你 🥺",
        body: "{name}，「{episode}」還在地圖上開著。回來開始吧。",
      },
    },
  ],
};
