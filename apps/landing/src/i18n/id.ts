// 인도네시아어 문구입니다. 영어(copy.ts)의 키를 전부 채웁니다 — 빠진 키는 타입 검사가 짚습니다.
// 번역은 초안입니다 — 원어민 검수 필요. 말투는 앱의 인도네시아어 문구표(ADR-0093 D3)와 같이 친근한 「kamu」입니다.
import type { Copy } from "./copy";

export const id: Copy = {
  skip: "Langsung ke konten",
  navWays: "Fitur",
  navJourney: "Cerita",
  navWords: "Ungkapan",
  navFaq: "FAQ",
  navCta: "Unduh aplikasi",
  panel1: "Masuk ke sebuah adegan",
  panel2: "Bicara untuk melewatinya",
  panel3: "Bawa ke kehidupan nyata",
  heroA: "Bahasa Korea,<br />dijalani sebagai cerita",
  heroB: "Masuk ke satu hari di Korea<br />dan hidupi bahasanya",
  heroCue: "Gulir",
  trialCta: "Coba adegan pertama",
  manifesto1:
    "Kata, partikel, dan ungkapan yang dihafal satu per satu sulit dipahami dan cepat terlupa",
  manifesto2: "Duru mengembalikannya ke tempat asalnya: di dalam cerita",
  manifesto3:
    "Kamu masuk ke sebuah adegan, bertemu orang-orang di dalamnya, dan menjawab mereka dalam bahasa Korea",
  manifesto4: "Saat adegan berakhir, kata-kata yang kamu pakai tetap tinggal bersama momen itu",
  waysEyebrow: "Fitur",
  waysTitle: "1 cerita,<br />4 jalan masuk",
  wayStoryTitle: "Adegan cerita",
  wayStoryDesc:
    "Baca tiap adegan seperti cerita pendek. Setiap kalimat Korea disertai artinya, jadi kamu selalu bisa mengikuti.",
  wayMessengerTitle: "Pesan",
  wayMessengerDesc:
    "Seorang teman mengirimimu pesan dalam bahasa Korea. Pilih balasanmu dan lanjutkan obrolan, seperti di ponselmu sendiri.",
  wayCallTitle: "Telepon",
  wayCallDesc:
    "Angkat dan dengarkan suara Mina. Pilih apa yang ingin kamu katakan selagi ia masih di telepon.",
  wayPracticeTitle: "Dengar, bicara, tulis",
  wayPracticeDesc:
    "Dengarkan lagi kalimatnya, ucapkan dengan lantang, dan tulis hurufnya dengan tangan sampai terasa jadi milikmu.",
  journeyEyebrow: "Cerita",
  journeyTitle: "Beberapa hari di Seoul,<br />satu adegan demi satu",
  journeyLead:
    "Setiap episode adalah satu momen perjalanan: minimarket, guesthouse, kafe, kereta bawah tanah. Yang terbaru ada di depan. Masih banyak lagi yang menyusul.",
  journeyNew: "Baru",
  moreTitle: "Cerita lain segera hadir",
  moreDesc: "Episode baru membuka tempat, orang, dan situasi baru.",
  railPrev: "Episode sebelumnya",
  railNext: "Episode berikutnya",
  wordsEyebrow: "Ungkapan",
  wordsTitle: "3 ungkapan<br />dari cerita",
  downloadTitle: "Mulai ceritamu",
  storeSoon: "Segera hadir",
  trialDownload: "Belum siap memasang? Coba adegan pertama di browser",
  footerTerms: "Ketentuan Penggunaan",
  footerPrivacy: "Kebijakan Privasi",
  heroSkyAlt:
    "Laut dan awan terlihat dari jendela pesawat, beberapa menit sebelum mendarat di Korea",
  heroCafeAlt: "Seorang barista bercelemek hijau mendongak dari balik konter kafe",
  heroMarketAlt:
    "Lorong pasar panjang di bawah atap melengkung, berjajar kios makanan dan untaian bendera",
  backdropAlleyAlt: "Gang hanok berlampu lentera saat senja",
  backdropCafeWindowAlt: "Kursi kosong di dekat jendela kafe dengan cahaya pagi di atas meja",
  backdropRainAlt: "Gang di malam hujan, lampu-lampu memantul di batu yang basah",
  backdropSubwayAlt: "Lorong stasiun kereta bawah tanah dengan tiga papan jalur di atasnya",
  phoneMinaWaveAlt:
    "Mina, perempuan berambut panjang, tersenyum dan melambai di asrama yang terang oleh matahari",
  avatarMinaAlt: "Mina, teman sekamar yang mengirimimu pesan dan meneleponmu dalam cerita",
  wordHelloAlt: "Pramugari tersenyum berseragam biru tua dengan syal biru muda",
  wordWaterAlt: "Sebotol air di konter minimarket dengan kasir di belakangnya",
  wordTomorrowAlt: "Mina memakai jaket dan menoleh dari pintu asrama",
  closingDescentAlt:
    "Pulau-pulau dan sebuah jembatan mulai terlihat dari jendela pesawat yang sedang turun",
  navLabel: "Bagian",
  languageLabel: "Bahasa",
  storeGet: "Unduh",
  faqEyebrow: "FAQ",
  faqTitle: "Pertanyaan<br />tentang Duru",
  faqWhatQ: "Apa itu Duru?",
  faqWhatA:
    "Duru adalah aplikasi belajar bahasa Korea berbasis cerita. Kamu masuk ke satu hari di Korea, berbicara dengan orang-orang yang kamu temui lewat pesan dan telepon, dan menyimpan kata-kata yang kamu pakai.",
  faqWhoQ: "Untuk siapa Duru?",
  faqWhoA:
    "Duru untuk orang yang baru mulai belajar bahasa Korea, termasuk yang belum pernah membaca Hangul. Cocok bagi pelajar yang cepat lupa kata saat menghafalnya satu per satu.",
  faqDifferentQ: "Apa bedanya Duru dengan aplikasi kosakata?",
  faqDifferentA:
    "Duru menempatkan kata, partikel, dan ungkapan di dalam cerita, bukan mengajarkannya sebagai daftar terpisah. Kamu menemui tiap kata dalam sebuah adegan dan memakainya untuk menjawab seseorang, jadi kata itu tinggal bersama momen saat kamu memakainya.",
  faqActivitiesQ: "Apa yang dilakukan di Duru?",
  faqActivitiesA:
    "Di Duru kamu membaca adegan cerita, membalas pesan, menerima telepon, dan berlatih dengan mendengar, berbicara, dan menulis huruf dengan tangan. Pelajaran singkat berada di antara momen-momen cerita.",
  faqHangulQ: "Bisakah mulai Duru tanpa tahu Hangul?",
  faqHangulA:
    "Bisa — pelajaran Duru menampilkan ungkapan Korea bersama romanisasi dan artinya, dan adegan ceritanya disertai terjemahan, jadi kamu bisa mulai tanpa membaca Hangul. Pelajaran pertama memandumu mengetuk satu ungkapan, jadi bisa dilakukan tanpa keyboard Korea.",
  faqLanguageQ: "Aplikasi Duru memakai bahasa apa?",
  faqLanguageA:
    "Duru tersedia dalam bahasa Inggris, Indonesia, dan Vietnam. Bahasa Korea yang kamu pelajari disertai arti dan romanisasi.",
  faqWhereQ: "Di mana bisa mengunduh Duru?",
  faqWhereASoon:
    "Duru belum dirilis. Kami sedang menyiapkannya untuk iPhone (App Store) dan Android (Google Play), dan tautan tokonya akan muncul di situs ini saat sudah siap.",
  faqWhereAAvailable:
    "Duru sudah tersedia. Kamu bisa mendapatkannya dari tautan toko di situs ini.",
  notFoundMetaTitle: "Halaman tidak ditemukan — Duru",
  notFoundTitle: "Halaman ini tidak ada",
  notFoundBody:
    "Alamatnya mungkin salah ketik, atau halamannya sudah dipindah. Mulai lagi dari beranda.",
  notFoundHome: "Kembali ke Duru",
  // 목업 — UI 문구는 앱의 인도네시아어 문구표와 같은 낱말(Berikutnya · Pesan · Bisukan …), 뜻풀이는 내장 u03 번역표의 초안을 따릅니다.
  mockEpisode: "Episode 3.",
  mockScene: "Adegan 4 / 4",
  mockNext: "Berikutnya",
  mockAside: "Menyampirkan handuk di satu bahu dan berbalik ke sini.",
  mockStoryGloss: "Hai. Siapa namamu?",
  mockChatA: "Lagi apa? Mau ngopi bareng?",
  mockChatB: "Ketemu di kafe ujung gang, ya.",
  mockComposer: "Pesan",
  mockReplyTitle: "Kamu mau membalas apa?",
  mockOptionA: "Oke! Aku ke sana sekarang.",
  mockOptionB: "Maaf, aku mungkin agak telat.",
  mockMe: "Saya",
  mockCall1: "Halo? Kamu di mana sekarang?",
  mockCall2: "Aku di depan kafe.",
  mockCall3: "Oke. Aku segera ke sana!",
  mockMute: "Bisukan",
  mockSpeaker: "Speaker",
  mockEnd: "Akhiri",
  mockLesson: "Pelajaran 2 / 5",
  mockSpeaking: "Berbicara",
  mockReadPrompt: "Bacakan kalimat dengan lantang.",
  mockReadGloss: "Sampai jumpa di kafe besok.",
  mockSlow: "Pelan",
  mockHeard: "Kamu mengucapkan ketiga katanya.",
  mockTryAgain: "Coba lagi",
  mockStop: "Berhenti bicara",
  wordHelloGloss: "Halo",
  wordWaterGloss: "Minta air",
  wordTomorrowGloss: "Sampai jumpa besok",
  closingGloss: "Halo. Di sinilah ceritaku dimulai.",
};
