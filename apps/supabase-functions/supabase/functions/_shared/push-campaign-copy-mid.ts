// 빈도 실험 문구(ADR-0208) — 에피소드 중간에서 멈춘 사람. 점심 · 저녁 · 복귀 문구를 날마다 돌려 씁니다.
// 말투는 듀오링고처럼 「기다리다 풀이 죽은 Duru」(사용자 결정 2026-11-27).

import type { StageCopy } from "./push-campaign-types.ts";

export const midCopy: StageCopy = {
  noon: [
    {
      en: {
        title: "You left in the middle of {episode} 😢",
        body: "{name}, the story is stuck without you. One lesson on your break?",
      },
      vi: {
        title: "Bạn bỏ đi giữa chừng {episode} 😢",
        body: "{name}, câu chuyện đang kẹt lại vì thiếu bạn. Một bài trong giờ nghỉ nhé?",
      },
      id: {
        title: "Kamu pergi di tengah {episode} 😢",
        body: "{name}, ceritanya macet tanpamu. Satu pelajaran saat istirahat?",
      },
      ms: {
        title: "Anda pergi di tengah {episode} 😢",
        body: "{name}, cerita ini tersekat tanpa anda. Satu pelajaran semasa rehat?",
      },
      es: {
        title: "Te fuiste a mitad de {episode} 😢",
        body: "{name}, la historia quedó atascada sin ti. ¿Una lección en tu descanso?",
      },
      ja: {
        title: "「{episode}」の途中でいなくなりました 😢",
        body: "{name}さん、ストーリーが止まったままです。休憩中にレッスンを1つどうですか。",
      },
      "zh-TW": {
        title: "你在「{episode}」中途離開了 😢",
        body: "{name}，故事少了你就卡住了。休息時上一課？",
      },
    },
    {
      en: {
        title: "Steps left in {episode}: {steps} 🥺",
        body: "{name}, Duru counted them twice. Finish one today?",
      },
      vi: {
        title: "Số bước còn lại trong {episode}: {steps} 🥺",
        body: "{name}, Duru đã đếm đi đếm lại hai lần. Hôm nay hoàn thành một bước nhé?",
      },
      id: {
        title: "Sisa langkah di {episode}: {steps} 🥺",
        body: "{name}, Duru sudah menghitungnya dua kali. Selesaikan satu hari ini?",
      },
      ms: {
        title: "Baki langkah dalam {episode}: {steps} 🥺",
        body: "{name}, Duru sudah mengiranya dua kali. Selesaikan satu hari ini?",
      },
      es: {
        title: "Pasos que faltan en {episode}: {steps} 🥺",
        body: "{name}, Duru los contó dos veces. ¿Terminas uno hoy?",
      },
      ja: {
        title: "「{episode}」は残り{steps}ステップ 🥺",
        body: "{name}さん、Duruは2回も数えました。今日1つ終わらせませんか。",
      },
      "zh-TW": {
        title: "「{episode}」還剩 {steps} 步 🥺",
        body: "{name}，Duru 數了兩遍。今天完成一步好嗎？",
      },
    },
  ],
  evening: [
    {
      en: {
        title: "The story stopped when you left 🥺",
        body: "{name}, {episode} is waiting on the map. One lesson tonight?",
      },
      vi: {
        title: "Câu chuyện dừng lại từ khi bạn đi 🥺",
        body: "{name}, {episode} đang chờ trên bản đồ. Tối nay học một bài nhé?",
      },
      id: {
        title: "Ceritanya berhenti sejak kamu pergi 🥺",
        body: "{name}, {episode} menunggu di peta. Satu pelajaran malam ini?",
      },
      ms: {
        title: "Cerita terhenti sejak anda pergi 🥺",
        body: "{name}, {episode} menunggu di peta. Satu pelajaran malam ini?",
      },
      es: {
        title: "La historia se detuvo cuando te fuiste 🥺",
        body: "{name}, {episode} te espera en el mapa. ¿Una lección esta noche?",
      },
      ja: {
        title: "あなたがいないとストーリーが進みません 🥺",
        body: "{name}さん、「{episode}」がマップで待っています。今夜レッスンを1つどうですか。",
      },
      "zh-TW": {
        title: "你離開後故事就停了 🥺",
        body: "{name}，「{episode}」在地圖上等你。今晚上一課？",
      },
    },
    {
      en: {
        title: "Your Korean words are fading 😢",
        body: "{name}, Duru is trying to hold on to them. A few minutes in {episode} tonight?",
      },
      vi: {
        title: "Những từ tiếng Hàn của bạn đang phai dần 😢",
        body: "{name}, Duru đang cố giữ chúng lại. Tối nay dành vài phút cho {episode} nhé?",
      },
      id: {
        title: "Kata-kata Koreamu mulai memudar 😢",
        body: "{name}, Duru berusaha menjaganya. Beberapa menit di {episode} malam ini?",
      },
      ms: {
        title: "Perkataan Korea anda semakin pudar 😢",
        body: "{name}, Duru cuba menyimpannya. Beberapa minit dalam {episode} malam ini?",
      },
      es: {
        title: "Tus palabras en coreano se están borrando 😢",
        body: "{name}, Duru intenta sujetarlas. ¿Unos minutos en {episode} esta noche?",
      },
      ja: {
        title: "覚えた韓国語が消えかけています 😢",
        body: "{name}さん、Duruが必死に守っています。今夜「{episode}」を数分どうですか。",
      },
      "zh-TW": {
        title: "你學的韓語正在慢慢消失 😢",
        body: "{name}，Duru 正努力幫你留住。今晚花幾分鐘學「{episode}」？",
      },
    },
  ],
  winback: [
    {
      en: {
        title: "Duru kept your place 🥺",
        body: "{name}, you stopped in the middle of {episode}. Your progress is still saved.",
      },
      vi: {
        title: "Duru vẫn giữ chỗ cho bạn 🥺",
        body: "{name}, bạn đã dừng giữa chừng {episode}. Tiến độ của bạn vẫn được lưu.",
      },
      id: {
        title: "Duru menjaga tempatmu 🥺",
        body: "{name}, kamu berhenti di tengah {episode}. Progresmu masih tersimpan.",
      },
      ms: {
        title: "Duru menjaga tempat anda 🥺",
        body: "{name}, anda berhenti di tengah {episode}. Kemajuan anda masih disimpan.",
      },
      es: {
        title: "Duru guardó tu lugar 🥺",
        body: "{name}, te quedaste a mitad de {episode}. Tu progreso sigue guardado.",
      },
      ja: {
        title: "Duruが続きを取っておきました 🥺",
        body: "{name}さん、「{episode}」の途中で止まっています。進み具合は保存されています。",
      },
      "zh-TW": {
        title: "Duru 幫你留著進度 🥺",
        body: "{name}，你停在「{episode}」的中間。進度都還保存著。",
      },
    },
  ],
};
