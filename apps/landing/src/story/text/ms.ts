// Story 카드의 말레이어 글입니다. en.ts의 에피소드마다 넷을 채운다 — 빠지면 타입 검사가 짚는다. 앱에 말레이어가 없어 사람이 옮긴다. 번역은 초안 — 원어민 검수 필요.
import type { StoryEpisodeId, StoryEpisodeText } from "../episodes.contract";

export const ms: Record<StoryEpisodeId, StoryEpisodeText> = {
  "u10-laundry": {
    when: "Hari 3 · Tengah hari",
    title: "Mencuci Pakaian",
    teaser: "Setiap butang di kedai dobi layan diri dalam bahasa Korea.",
    alt: "Papan tanda dobi syiling 24 jam bercahaya di atas pintu kaca di hujung lorong hanok yang hujan",
  },
  "u09-subway": {
    when: "Hari 3 · Pagi",
    title: "Menaiki Kereta Api Bawah Tanah",
    teaser: "Tiga warna, tiga anak panah, satu pagi hujan di bawah tanah.",
    alt: "Pintu keluar 4 berbumbung kaca di stesen Jongno 3-ga pada pagi hujan, tangga menuju bawah tanah",
  },
  "u08-umbrella": {
    when: "Hari 2 · Petang",
    title: "Hujan Tiba-tiba",
    teaser: "Anda membuka pintu kafe ke dalam hujan lebat, dan seseorang mengikut anda keluar.",
    alt: "Hujan lebat turun di lorong hanok berlampu tanglung pada waktu malam, dilihat dari bawah payung gelap",
  },
  "u07-jaemin": {
    when: "Hari 2 · Tengah hari",
    title: "Salah Tempat Duduk",
    teaser: "Tempat duduk paling cerah di kafe nampak kosong. Sebenarnya tidak.",
    alt: "Payung hitam panjang bersandar di sudut tempat duduk tingkap kafe yang cerah di bawah langit jernih",
  },
  "u06-cafe": {
    when: "Hari 2 · Pagi",
    title: "Memesan Kopi",
    teaser: "Kafe yang berkunci malam tadi kini lampunya menyala.",
    alt: "Kafe di penjuru lorong hanok pada pagi yang cerah, papan tandanya bercahaya",
  },
  "u05-baekban": {
    when: "Hari 1 · Petang",
    title: "Makan Seorang Diri",
    teaser: "Menu tulisan tangan, tiada gambar, dan satu soalan yang tidak anda jangka.",
    alt: "Periuk sup kimchi yang mendidih bersama semangkuk nasi dan lauk di meja restoran",
  },
  "u04-directions": {
    when: "Hari 1 · Petang",
    title: "Mencari Restoran",
    teaser: "Kata mereka lima minit. Anda sudah melepasi pasu bunga ini dua kali.",
    alt: "Lorong hanok berlampu tanglung ketika senja bercabang kepada beberapa laluan yang kelihatan serupa",
  },
  "u03-mina": {
    when: "Hari 1 · Tengah hari",
    title: "Bertemu Mina",
    teaser: "Empat katil dua tingkat, peta lukisan tangan, dan satu soalan tentang nama anda.",
    alt: "Tangan memegang nota kecil dengan peta lukisan tangan di asrama yang bermandi cahaya matahari",
  },
  "u02-checkin": {
    when: "Hari 1 · Tengah hari",
    title: "Daftar Masuk",
    teaser: "Bilik 201 separuh terbuka, dan beg galas seseorang sudah ada di atas katil.",
    alt: "Pintu bilik asrama yang separuh terbuka dengan katil dua tingkat dan beg galas di atas katil tepi tingkap",
  },
  "u01-water": {
    when: "Hari 1 · Tengah hari",
    title: "Membeli Air",
    teaser: "Dahaga, sesat, menarik bagasi. Kedai pertama yang anda jumpa kecil sahaja.",
    alt: "Lorong hanok yang sunyi dalam cahaya petang dilihat dari pintu kedai serbaneka, rumah tumpangan di hujung",
  },
  "u00-tutorial": {
    when: "Hari 0 · Ketibaan",
    title: "Tutorial",
    teaser:
      "Kata-kata Korea pertama anda bakal terkeluar dari mulut. Anda belum mengenalinya lagi.",
    alt: "Kedai serbaneka waktu malam bak mimpi: secawan besar mi goreng pedas dan gimbap segi tiga di atas meja tepi tingkap",
  },
};
