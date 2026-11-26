// 내 스토리 사진 문구(`messengerChat.myStories.photo`, ADR-0199) — 미얀마어 · 태국어 · 베트남어 · 번체 중국어.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { MyStoryPhotoCopy } from "../screens/messenger-chat/my-stories-copy.contract";

export const storyPhotoMy: MyStoryPhotoCopy = {
  label: "သင့်ဓာတ်ပုံ",
  hint: "ဓာတ်ပုံကို မျှဝေရန် စကားလုံးတစ်လုံး ထည့်ပါ သို့မဟုတ် စာတစ်ကြောင်း ရေးပါ။",
  uploading: "သင့်ဓာတ်ပုံကို တင်နေသည်…",
  uploadFailed: "ဓာတ်ပုံကို မတင်နိုင်ပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်ကြိုးစားပါ။",
  denied: "ကင်မရာ အသုံးပြုခွင့် ပိတ်ထားသည်။ ဓာတ်ပုံရိုက်ရန် ဆက်တင်တွင် ဖွင့်ပါ။",
  unavailable: "ဤစက်တွင် ကင်မရာ မရနိုင်ပါ။",
  pickFailed: "ထိုဓာတ်ပုံကို မဖွင့်နိုင်ပါ။ အခြားဓာတ်ပုံ ရွေးကြည့်ပါ။",
  rejectedTitle: "ဤဓာတ်ပုံကို မျှဝေ၍ မရပါ",
  rejectedBody: "စစ်ဆေးမှုတွင် စတိုရီတွင် မပါသင့်သည့်အရာ တွေ့ရှိခဲ့သည်။ အခြားဓာတ်ပုံ ရွေးကြည့်ပါ။",
  review: "ပြန်လည်စစ်ဆေးရန် တောင်းဆိုမည်",
  reviewSent: "ကျေးဇူးတင်ပါသည် — ထပ်မံ စစ်ဆေးပေးပါမည်။",
  reviewFailed: "မပို့နိုင်ပါ။ ထပ်ကြိုးစားပါ။",
  checkingTitle: "သင့်ဓာတ်ပုံကို စစ်ဆေးနေသည်",
  checkingBody: "စစ်ဆေးမှု ပြီးသည်အထိ သင်သာ မြင်ရပါမည်။",
};

export const storyPhotoTh: MyStoryPhotoCopy = {
  label: "รูปของคุณ",
  hint: "เพิ่มคำศัพท์หรือเขียนสักประโยคเพื่อแชร์รูปของคุณ",
  uploading: "กำลังอัปโหลดรูปของคุณ…",
  uploadFailed: "อัปโหลดรูปไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
  denied: "ปิดการเข้าถึงกล้องอยู่ เปิดได้ในการตั้งค่าเพื่อถ่ายรูป",
  unavailable: "อุปกรณ์นี้ใช้กล้องไม่ได้",
  pickFailed: "เปิดรูปนั้นไม่ได้ ลองรูปอื่นนะ",
  rejectedTitle: "แชร์รูปนี้ไม่ได้",
  rejectedBody: "การตรวจของเราพบสิ่งที่ใส่ในสตอรี่ไม่ได้ ลองใช้รูปอื่นนะ",
  review: "ขอให้ตรวจอีกครั้ง",
  reviewSent: "ขอบคุณ — เราจะตรวจดูอีกครั้ง",
  reviewFailed: "ส่งไม่สำเร็จ ลองอีกครั้ง",
  checkingTitle: "กำลังตรวจรูปของคุณ",
  checkingBody: "จนกว่าจะตรวจเสร็จ จะมีแค่คุณที่เห็น",
};

export const storyPhotoVi: MyStoryPhotoCopy = {
  label: "Ảnh của bạn",
  hint: "Thêm một từ hoặc viết một câu để chia sẻ ảnh của bạn.",
  uploading: "Đang tải ảnh của bạn lên…",
  uploadFailed: "Không tải được ảnh lên. Hãy kiểm tra kết nối rồi thử lại.",
  denied: "Quyền truy cập máy ảnh đang tắt. Hãy bật trong Cài đặt để chụp ảnh.",
  unavailable: "Thiết bị này không dùng được máy ảnh.",
  pickFailed: "Không mở được ảnh đó. Hãy thử ảnh khác.",
  rejectedTitle: "Không thể chia sẻ ảnh này",
  rejectedBody: "Bước kiểm tra phát hiện nội dung không được có trong tin. Hãy thử ảnh khác.",
  review: "Yêu cầu xem lại",
  reviewSent: "Cảm ơn bạn — chúng tôi sẽ xem lại.",
  reviewFailed: "Không gửi được. Hãy thử lại.",
  checkingTitle: "Đang kiểm tra ảnh của bạn",
  checkingBody: "Chỉ bạn nhìn thấy cho đến khi kiểm tra xong.",
};

export const storyPhotoZhTw: MyStoryPhotoCopy = {
  label: "你的照片",
  hint: "加一個單字或寫一句話，就能分享你的照片。",
  uploading: "正在上傳你的照片…",
  uploadFailed: "照片上傳失敗。請檢查網路連線後再試一次。",
  denied: "相機權限已關閉。請到「設定」開啟後再拍照。",
  unavailable: "這部裝置無法使用相機。",
  pickFailed: "無法開啟那張照片，請換一張試試。",
  rejectedTitle: "這張照片無法分享",
  rejectedBody: "檢查時發現限時動態不能包含的內容，請換一張照片。",
  review: "要求重新審查",
  reviewSent: "謝謝，我們會再看一次。",
  reviewFailed: "無法送出，請再試一次。",
  checkingTitle: "正在檢查你的照片",
  checkingBody: "檢查完成前只有你看得到。",
};
