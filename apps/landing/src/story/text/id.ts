// Story 카드의 인도네시아어 글입니다. en.ts의 에피소드마다 넷을 채운다 — 빠지면 타입 검사가 짚는다. 제목은 내장 번역표(`translations.id`)의 제목. 번역은 초안 — 원어민 검수 필요.
import type { StoryEpisodeId, StoryEpisodeText } from "../episodes.contract";

export const id: Record<StoryEpisodeId, StoryEpisodeText> = {
  "u10-laundry": {
    when: "Hari 3 · Siang",
    title: "Mencuci Pakaian",
    teaser: "Semua tombol di laundromat berbahasa Korea.",
    alt: "Papan nama laundry koin 24 jam yang menyala di atas pintu kaca di ujung gang hanok yang hujan",
  },
  "u09-subway": {
    when: "Hari 3 · Pagi",
    title: "Naik Kereta Bawah Tanah",
    teaser: "Tiga warna, tiga panah, satu pagi hujan di bawah tanah.",
    alt: "Pintu keluar 4 beratap kaca di stasiun Jongno 3-ga pada pagi hujan, tangga menuju bawah tanah",
  },
  "u08-umbrella": {
    when: "Hari 2 · Sore",
    title: "Hujan Tiba-tiba",
    teaser: "Kamu membuka pintu kafe ke tengah hujan deras, dan seseorang mengikutimu keluar.",
    alt: "Hujan deras turun di gang hanok berlampu lentera pada malam hari, dilihat dari bawah payung gelap",
  },
  "u07-jaemin": {
    when: "Hari 2 · Siang",
    title: "Tempat Duduk yang Salah",
    teaser: "Kursi paling cerah di kafe tampak kosong. Ternyata tidak.",
    alt: "Payung hitam panjang bersandar di sudut kursi jendela kafe yang cerah di bawah langit terang",
  },
  "u06-cafe": {
    when: "Hari 2 · Pagi",
    title: "Memesan Kopi",
    teaser: "Kafe yang terkunci semalam kini lampunya menyala.",
    alt: "Kafe di sudut gang hanok pada pagi yang cerah, papan namanya menyala",
  },
  "u05-baekban": {
    when: "Hari 1 · Sore",
    title: "Makan Sendirian",
    teaser: "Menu tulisan tangan, tanpa foto, dan pertanyaan yang tak kamu duga.",
    alt: "Panci sup kimchi yang mendidih dengan semangkuk nasi dan lauk di meja restoran",
  },
  "u04-directions": {
    when: "Hari 1 · Sore",
    title: "Mencari Restoran",
    teaser: "Katanya lima menit. Kamu sudah melewati pot bunga ini dua kali.",
    alt: "Gang hanok berlampu lentera saat senja bercabang menjadi beberapa jalan yang tampak serupa",
  },
  "u03-mina": {
    when: "Hari 1 · Siang",
    title: "Bertemu Mina",
    teaser: "Empat ranjang susun, peta gambar tangan, dan pertanyaan tentang namamu.",
    alt: "Tangan memegang catatan kecil berisi peta gambar tangan di asrama yang terang oleh matahari",
  },
  "u02-checkin": {
    when: "Hari 1 · Siang",
    title: "Check-in",
    teaser: "Kamar 201 setengah terbuka, dan ransel seseorang sudah ada di tempat tidur.",
    alt: "Pintu kamar asrama yang setengah terbuka dengan ranjang susun dan ransel di tempat tidur dekat jendela",
  },
  "u01-water": {
    when: "Hari 1 · Siang",
    title: "Membeli Air",
    teaser: "Haus, tersesat, menyeret koper. Toko pertama yang kamu temukan kecil sekali.",
    alt: "Gang hanok yang sepi dalam cahaya sore dilihat dari pintu minimarket, guesthouse lebih ke dalam",
  },
  "u00-tutorial": {
    when: "Hari 0 · Tiba",
    title: "Tutorial",
    teaser: "Kata-kata Korea pertamamu akan segera keluar dari mulutmu. Kamu belum mengenalnya.",
    alt: "Minimarket malam yang seperti mimpi: secangkir besar mi goreng pedas dan gimbap segitiga di meja dekat jendela",
  },
};
