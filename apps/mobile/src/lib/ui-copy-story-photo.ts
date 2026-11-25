// 내 스토리 사진 문구(`messengerChat.myStories.photo`, ADR-0199) — 영어 · 스페인어 · 인도네시아어 · 일본어.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { MyStoryPhotoCopy } from "../screens/messenger-chat/my-stories-copy.contract";

export const storyPhotoEn: MyStoryPhotoCopy = {
  label: "Your photo",
  hint: "Add a word or write a line to share your photo.",
  uploading: "Uploading your photo…",
  uploadFailed: "Couldn't upload your photo. Check your connection and try again.",
  denied: "Camera access is off. Turn it on in Settings to take a photo.",
  unavailable: "The camera isn't available on this device.",
  pickFailed: "Couldn't open that photo. Try another one.",
  rejectedTitle: "This photo can't be shared",
  rejectedBody: "Our check found something stories can't include. Try a different photo.",
  review: "Ask for a review",
  reviewSent: "Thanks — we'll take another look.",
  reviewFailed: "Couldn't send that. Try again.",
  checkingTitle: "Checking your photo",
  checkingBody: "Only you can see it until the check is done.",
  kindLabel: "Photo story",
};

export const storyPhotoEs: MyStoryPhotoCopy = {
  label: "Tu foto",
  hint: "Añade una palabra o escribe una frase para compartir tu foto.",
  uploading: "Subiendo tu foto…",
  uploadFailed: "No se pudo subir tu foto. Revisa tu conexión e inténtalo de nuevo.",
  denied: "El acceso a la cámara está desactivado. Actívalo en Ajustes para tomar una foto.",
  unavailable: "La cámara no está disponible en este dispositivo.",
  pickFailed: "No se pudo abrir esa foto. Prueba con otra.",
  rejectedTitle: "No se puede compartir esta foto",
  rejectedBody:
    "Nuestra revisión encontró algo que las historias no pueden incluir. Prueba con otra foto.",
  review: "Pedir una revisión",
  reviewSent: "Gracias, la volveremos a revisar.",
  reviewFailed: "No se pudo enviar. Inténtalo de nuevo.",
  checkingTitle: "Revisando tu foto",
  checkingBody: "Solo tú puedes verla hasta que termine la revisión.",
  kindLabel: "Historia con foto",
};

export const storyPhotoId: MyStoryPhotoCopy = {
  label: "Fotomu",
  hint: "Tambahkan kata atau tulis satu kalimat untuk membagikan fotomu.",
  uploading: "Mengunggah fotomu…",
  uploadFailed: "Fotomu gagal diunggah. Periksa koneksimu lalu coba lagi.",
  denied: "Akses kamera mati. Nyalakan di Pengaturan untuk mengambil foto.",
  unavailable: "Kamera tidak tersedia di perangkat ini.",
  pickFailed: "Foto itu tidak bisa dibuka. Coba foto lain.",
  rejectedTitle: "Foto ini tidak bisa dibagikan",
  rejectedBody:
    "Pemeriksaan kami menemukan sesuatu yang tidak boleh ada di cerita. Coba foto lain.",
  review: "Minta ditinjau ulang",
  reviewSent: "Terima kasih — kami akan memeriksanya lagi.",
  reviewFailed: "Gagal mengirim. Coba lagi.",
  checkingTitle: "Memeriksa fotomu",
  checkingBody: "Hanya kamu yang bisa melihatnya sampai pemeriksaan selesai.",
  kindLabel: "Cerita foto",
};

export const storyPhotoJa: MyStoryPhotoCopy = {
  label: "あなたの写真",
  hint: "単語を置くか一言書くと、写真をシェアできます。",
  uploading: "写真をアップロード中…",
  uploadFailed: "写真をアップロードできませんでした。接続を確認してもう一度お試しください。",
  denied: "カメラへのアクセスがオフです。写真を撮るには設定でオンにしてください。",
  unavailable: "この端末ではカメラを使えません。",
  pickFailed: "その写真を開けませんでした。別の写真をお試しください。",
  rejectedTitle: "この写真はシェアできません",
  rejectedBody:
    "チェックでストーリーに載せられないものが見つかりました。別の写真をお試しください。",
  review: "再確認を依頼",
  reviewSent: "ありがとうございます。もう一度確認します。",
  reviewFailed: "送信できませんでした。もう一度お試しください。",
  checkingTitle: "写真を確認中",
  checkingBody: "確認が終わるまで、あなただけに表示されます。",
  kindLabel: "写真ストーリー",
};
