// 빈도 실험 문구(ADR-0208) — 에피소드를 끝내고 다음 에피소드를 시작하지 않은 사람. 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.

import type { StageCopy } from "./push-campaign-types.ts";

export const nextCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "New story ready: {episode} 📖",
        body: "{name}, your next episode is open on the map. Take a look.",
      },
      vi: {
        title: "Câu chuyện mới: {episode} 📖",
        body: "{name}, tập tiếp theo đã mở trên bản đồ. Vào xem nhé.",
      },
      id: {
        title: "Cerita baru siap: {episode} 📖",
        body: "{name}, episode berikutnya sudah terbuka di peta. Yuk lihat.",
      },
      ms: {
        title: "Cerita baharu sedia: {episode} 📖",
        body: "{name}, episod seterusnya sudah dibuka di peta. Jom lihat.",
      },
      es: {
        title: "Nueva historia lista: {episode} 📖",
        body: "{name}, tu próximo episodio ya está abierto en el mapa. Échale un vistazo.",
      },
      ja: {
        title: "新しいストーリー：{episode} 📖",
        body: "{name}さん、次のエピソードがマップで開いています。のぞいてみてください。",
      },
      "zh-TW": {
        title: "新故事準備好了：{episode} 📖",
        body: "{name}，下一集已經在地圖上開放了，來看看吧。",
      },
    },
    {
      en: {
        title: "One episode done. Ready for the next? 👏",
        body: "{name}, {episode} starts with one short lesson.",
      },
      vi: {
        title: "Xong một tập rồi. Sẵn sàng cho tập tiếp chứ? 👏",
        body: "{name}, {episode} bắt đầu bằng một bài học ngắn.",
      },
      id: {
        title: "Satu episode selesai. Siap lanjut? 👏",
        body: "{name}, {episode} dimulai dengan satu pelajaran singkat.",
      },
      ms: {
        title: "Satu episod selesai. Sedia untuk seterusnya? 👏",
        body: "{name}, {episode} bermula dengan satu pelajaran pendek.",
      },
      es: {
        title: "Un episodio listo. ¿Vamos por el siguiente? 👏",
        body: "{name}, {episode} empieza con una lección corta.",
      },
      ja: {
        title: "1話クリア。次に進みますか？👏",
        body: "{name}さん、「{episode}」は短いレッスン1つから始まります。",
      },
      "zh-TW": {
        title: "完成一集了，準備好下一集嗎？👏",
        body: "{name}，「{episode}」從一堂短短的課開始。",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "Don't stop at one episode 🔥",
        body: "{name}, {episode} is next. One lesson tonight keeps your Korean moving.",
      },
      vi: {
        title: "Đừng dừng lại ở một tập 🔥",
        body: "{name}, tiếp theo là {episode}. Một bài tối nay để tiếng Hàn của bạn tiến tiếp.",
      },
      id: {
        title: "Jangan berhenti di satu episode 🔥",
        body: "{name}, berikutnya {episode}. Satu pelajaran malam ini agar bahasa Koreamu terus maju.",
      },
      ms: {
        title: "Jangan berhenti pada satu episod 🔥",
        body: "{name}, seterusnya {episode}. Satu pelajaran malam ini supaya bahasa Korea anda terus maju.",
      },
      es: {
        title: "No te quedes en un episodio 🔥",
        body: "{name}, sigue {episode}. Una lección esta noche y tu coreano sigue avanzando.",
      },
      ja: {
        title: "1話で止めないで 🔥",
        body: "{name}さん、次は「{episode}」です。今夜レッスンを1つ進めましょう。",
      },
      "zh-TW": {
        title: "別只停在一集 🔥",
        body: "{name}，下一集是「{episode}」。今晚上一課，讓韓語繼續進步。",
      },
    },
    {
      en: {
        title: "Tonight: {episode}",
        body: "{name}, start your next story before bed. It takes a few minutes.",
      },
      vi: {
        title: "Tối nay: {episode}",
        body: "{name}, bắt đầu câu chuyện tiếp theo trước khi ngủ nhé. Chỉ mất vài phút.",
      },
      id: {
        title: "Malam ini: {episode}",
        body: "{name}, mulai cerita berikutnya sebelum tidur. Hanya beberapa menit.",
      },
      ms: {
        title: "Malam ini: {episode}",
        body: "{name}, mulakan cerita seterusnya sebelum tidur. Hanya beberapa minit.",
      },
      es: {
        title: "Esta noche: {episode}",
        body: "{name}, empieza tu próxima historia antes de dormir. Solo son unos minutos.",
      },
      ja: {
        title: "今夜は「{episode}」",
        body: "{name}さん、寝る前に次のストーリーを始めませんか。数分で終わります。",
      },
      "zh-TW": {
        title: "今晚：{episode}",
        body: "{name}，睡前開始下一個故事吧，只要幾分鐘。",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "Your next story is still waiting",
        body: "{name}, {episode} is open on the map. Come back and start it.",
      },
      vi: {
        title: "Câu chuyện tiếp theo vẫn đang chờ",
        body: "{name}, {episode} đã mở trên bản đồ. Quay lại và bắt đầu nhé.",
      },
      id: {
        title: "Cerita berikutnya masih menunggu",
        body: "{name}, {episode} sudah terbuka di peta. Kembali dan mulai, yuk.",
      },
      ms: {
        title: "Cerita seterusnya masih menunggu",
        body: "{name}, {episode} sudah dibuka di peta. Kembali dan mulakan.",
      },
      es: {
        title: "Tu próxima historia sigue esperando",
        body: "{name}, {episode} está abierto en el mapa. Vuelve y empiézalo.",
      },
      ja: {
        title: "次のストーリーが待っています",
        body: "{name}さん、「{episode}」がマップで開いています。戻って始めましょう。",
      },
      "zh-TW": {
        title: "下一個故事還在等你",
        body: "{name}，「{episode}」已經在地圖上開放了，回來開始吧。",
      },
    },
  ],
};
