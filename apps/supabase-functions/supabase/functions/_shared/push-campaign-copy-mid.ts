// 빈도 실험 문구(ADR-0208) — 에피소드 중간에서 멈춘 사람. 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.

import type { StageCopy } from "./push-campaign-types.ts";

export const midCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "You're partway through {episode}",
        body: "{name}, pick up where you stopped. One lesson on your break?",
      },
      vi: {
        title: "Bạn đang học dở {episode}",
        body: "{name}, học tiếp từ chỗ bạn dừng lại nhé. Một bài trong giờ nghỉ?",
      },
      id: {
        title: "Kamu sudah setengah jalan di {episode}",
        body: "{name}, lanjutkan dari tempat kamu berhenti. Satu pelajaran saat istirahat?",
      },
      ms: {
        title: "Anda sudah separuh jalan dalam {episode}",
        body: "{name}, sambung dari tempat anda berhenti. Satu pelajaran semasa rehat?",
      },
      es: {
        title: "Vas a mitad de {episode}",
        body: "{name}, retoma donde lo dejaste. ¿Una lección en tu descanso?",
      },
      ja: {
        title: "「{episode}」の途中です",
        body: "{name}さん、止めたところから続けましょう。休憩中にレッスンを1つどうですか。",
      },
      "zh-TW": {
        title: "「{episode}」才學到一半",
        body: "{name}，從上次停下的地方繼續吧。休息時上一課？",
      },
    },
    {
      en: {
        title: "Steps left in {episode}: {steps}",
        body: "{name}, finish one of them today.",
      },
      vi: {
        title: "Số bước còn lại trong {episode}: {steps}",
        body: "{name}, hoàn thành một bước hôm nay nhé.",
      },
      id: {
        title: "Sisa langkah di {episode}: {steps}",
        body: "{name}, selesaikan satu hari ini.",
      },
      ms: {
        title: "Baki langkah dalam {episode}: {steps}",
        body: "{name}, selesaikan satu hari ini.",
      },
      es: {
        title: "Pasos que faltan en {episode}: {steps}",
        body: "{name}, termina uno hoy.",
      },
      ja: {
        title: "「{episode}」は残り{steps}ステップ",
        body: "{name}さん、今日はそのうち1つを終わらせましょう。",
      },
      "zh-TW": {
        title: "「{episode}」還剩 {steps} 步",
        body: "{name}，今天完成其中一步吧。",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "Finish what you started 💪",
        body: "{name}, {episode} is waiting on the map. One lesson tonight?",
      },
      vi: {
        title: "Hoàn thành điều bạn đã bắt đầu 💪",
        body: "{name}, {episode} đang chờ trên bản đồ. Tối nay học một bài nhé?",
      },
      id: {
        title: "Selesaikan yang sudah kamu mulai 💪",
        body: "{name}, {episode} menunggu di peta. Satu pelajaran malam ini?",
      },
      ms: {
        title: "Habiskan apa yang anda mulakan 💪",
        body: "{name}, {episode} menunggu di peta. Satu pelajaran malam ini?",
      },
      es: {
        title: "Termina lo que empezaste 💪",
        body: "{name}, {episode} te espera en el mapa. ¿Una lección esta noche?",
      },
      ja: {
        title: "始めたことを最後まで 💪",
        body: "{name}さん、「{episode}」がマップで待っています。今夜レッスンを1つどうですか。",
      },
      "zh-TW": {
        title: "把開始的事做完 💪",
        body: "{name}，「{episode}」在地圖上等你。今晚上一課？",
      },
    },
    {
      en: {
        title: "Your Korean is getting rusty 🙈",
        body: "{name}, a few minutes in {episode} tonight will fix that.",
      },
      vi: {
        title: "Tiếng Hàn của bạn sắp quên mất rồi 🙈",
        body: "{name}, vài phút với {episode} tối nay là nhớ lại ngay.",
      },
      id: {
        title: "Bahasa Koreamu mulai berkarat 🙈",
        body: "{name}, beberapa menit di {episode} malam ini akan memperbaikinya.",
      },
      ms: {
        title: "Bahasa Korea anda semakin berkarat 🙈",
        body: "{name}, beberapa minit dalam {episode} malam ini akan membetulkannya.",
      },
      es: {
        title: "Tu coreano se está oxidando 🙈",
        body: "{name}, unos minutos en {episode} esta noche lo arreglan.",
      },
      ja: {
        title: "韓国語、忘れかけていませんか 🙈",
        body: "{name}さん、今夜「{episode}」を数分やれば思い出せます。",
      },
      "zh-TW": {
        title: "你的韓語快生疏了 🙈",
        body: "{name}，今晚花幾分鐘學「{episode}」就能找回來。",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "You stopped in the middle of {episode}",
        body: "{name}, your progress is saved. Come back and finish the story.",
      },
      vi: {
        title: "Bạn đã dừng giữa chừng {episode}",
        body: "{name}, tiến độ của bạn vẫn được lưu. Quay lại và học hết câu chuyện nhé.",
      },
      id: {
        title: "Kamu berhenti di tengah {episode}",
        body: "{name}, progresmu tersimpan. Kembali dan selesaikan ceritanya.",
      },
      ms: {
        title: "Anda berhenti di tengah {episode}",
        body: "{name}, kemajuan anda disimpan. Kembali dan habiskan cerita ini.",
      },
      es: {
        title: "Te quedaste a mitad de {episode}",
        body: "{name}, tu progreso está guardado. Vuelve y termina la historia.",
      },
      ja: {
        title: "「{episode}」の途中で止まっています",
        body: "{name}さん、進み具合は保存されています。戻ってストーリーを最後まで。",
      },
      "zh-TW": {
        title: "你停在「{episode}」的中間",
        body: "{name}，進度都有保存。回來把故事學完吧。",
      },
    },
  ],
};
