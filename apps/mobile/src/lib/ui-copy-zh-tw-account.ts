// 대만 중국어(번체, zh-TW) 문구표 구획 — 계정 · 기타(notifications ~ coinShop) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  CoinShopCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsZhTw: NotificationsCopy = {
  title: "通知",
  emptyTitle: "目前沒有通知",
  emptyBody: "有新通知時，我們會在這裡通知你。",
  deleteLabel: (message) => `${message}，刪除`,
  destination: {
    "roleplay-list": "查看角色扮演列表",
  },
};

export const settingsZhTw: SettingsCopy = {
  title: "設定",
  group: { account: "帳號", learning: "學習", accountActions: "帳號操作" },
  nav: {
    profile: "使用者資料",
    "learner-profile": "課程中的名字和國家",
    language: "語言",
    download: "下載",
    notifications: "通知",
    feedback: "意見回饋",
    "privacy-policy": "隱私權政策",
    "terms-of-use": "使用條款",
  },
  downloads: {
    title: "下載",
    caption: "選擇何時下載圖片和音訊。",
    mobileDataHeading: "使用行動數據下載",
    policy: { ask: "每次都詢問", always: "一律下載", "wifi-only": "僅限 Wi-Fi" },
    offlineHeading: "離線",
    downloadAll: "全部下載以離線使用",
    downloadAllCaption: "下載每一集的圖片和音訊，沒有網路也能學習。",
    downloadAllStarted: "正在背景下載，你可以繼續學習。",
    downloaded: (size) => `已下載：${size}`,
    episodeRow: (n, d, t) => `第${n}集：${t}堂課中已下載${d}堂`,
    episodeRowComplete: (n) => `第${n}集：已完成`,
    downloadRest: (n) => `下載第${n}集的其餘內容`,
    confirm: {
      title: "要使用行動數據下載嗎？",
      description: "下載所有集數可能會用掉大量行動數據。你也可以等連上 Wi-Fi 再下載。",
      download: "立即下載",
      cancel: "取消",
      restDescription: (n) => `第${n}集的其餘內容會使用行動數據下載。你也可以等連上 Wi-Fi 再下載。`,
    },
  },
  sessionOption: {
    "auto-play-audio": "自動播放",
    "show-transcript": "顯示字幕",
    "show-choice-romanization": "羅馬拼音",
    vibration: "震動",
  },
  sessionOptionDescription: {
    "show-choice-romanization": "在答案、課程和故事中，以小字顯示韓文的讀法。",
    vibration: "答對、答錯和點按鍵盤時震動。",
  },
  optionState: { on: "開啟", off: "關閉" },
  action: {
    "sign-in": "登入",
    "sign-out": "登出",
    "delete-account": "刪除帳號",
  },
  signOutDialog: { title: "要登出嗎？", confirm: "登出", cancel: "保持登入" },
  deleteDialog: {
    title: "要刪除你的帳號嗎？",
    description: "你的帳號和學習進度將被永久刪除，且無法復原。",
    confirm: "刪除帳號",
    cancel: "保留帳號",
  },
  deleteFailure: {
    network: "無法刪除你的帳號。請檢查網路連線後再試一次。",
    other: "無法刪除你的帳號。請再試一次。",
  },
  exitAnnouncement: { "signed-out": "你已登出。", deleted: "你的帳號已刪除。" },
  version: (name, build) => `版本 ${name}（${build}）`,
};

export const appUpdateZhTw: AppUpdateCopy = {
  title: "請更新 Duru 以繼續使用",
  description: "此版本的 Duru 已不再支援。請到商店下載最新版本以繼續學習。",
  update: "更新",
  failure: "無法開啟商店。請從 App Store 或 Google Play 更新 Duru。",
};

export const feedbackZhTw: FeedbackCopy = {
  title: "意見回饋",
  ratingQuestion: "到目前為止，你覺得 Duru 怎麼樣？",
  ratingOption: { 1: "不好", 2: "還可以更好", 3: "普通", 4: "不錯", 5: "超喜歡" },
  messageLabel: "還有什麼想告訴我們的嗎？（選填）",
  send: "送出",
  sent: "謝謝！我們已收到你的意見。",
  failed: "無法送出你的意見。請再試一次。",
  survey: {
    title: "這一集如何？",
    messageLabel: "有哪裡可以做得更好？（選填）",
    reasonsLabel: "哪裡不太好？可複選。",
    reasonOption: {
      "too-hard": "太難",
      "too-easy": "太簡單",
      audio: "音訊有問題",
      unclear: "很難理解",
      translation: "翻譯有問題",
      stuck: "卡住或出錯",
      "too-long": "太長",
      other: "其他",
    },
    otherAccessibilityLabel: "其他，開啟文字輸入框",
    description: (episodeTitle) => `你完成了${episodeTitle}。告訴我們你的想法。`,
    skip: "稍後再說",
  },
};

export const profileZhTw: ProfileCopy = {
  notProvided: "未提供",
  learningLanguage: "韓語",
  title: "使用者資料",
  itemLabel: {
    name: "名字",
    "learning-language": "學習語言",
    email: "電子郵件",
    phone: "手機號碼",
  },
};

export const coinShopZhTw: CoinShopCopy = {
  digitSeparator: ",",
  title: "Yeopjeon",
  subtitle: "韓國古代黃銅錢幣",
  balanceLabel: "你擁有",
  balance: (_count, display) => `你擁有 ${display}枚錢幣`,
  pickTitle: "選擇錢袋",
  pickCaption: "在課程中賺取錢幣，或在這裡取得更多。",
  packName: { bundle: "一串錢幣", pouch: "錢袋", big: "大錢袋" },
  coinsUnit: "錢幣",
  packAmount: (_count, display) => `${display}枚錢幣`,
  bonus: (display) => `+${display} 加碼`,
  bestValue: "最划算",
  buy: (price) => `以 ${price} 購買`,
  storeNote: "將從你的應用程式商店帳號扣款。",
  openShop: (count) => `${count}枚錢幣，取得更多`,
  notice: {
    title: "付款功能即將推出",
    description: "目前還無法購買錢幣。請稍後再回來看看。",
  },
  purchaseFailed: "購買未完成。請再試一次。",
  purchaseWait: {
    confirming: "正在確認你的購買…",
    late: "你的購買很安全，稍後就會顯示。",
    added: (_count, display) => `已加入 +${display}枚錢幣`,
    adding: "正在加入你的錢包",
    updating: "更新中",
  },
};

export const downloadSheetZhTw: DownloadSheetCopy = {
  askTitle: (n) => `要下載第${n}集嗎？`,
  askDescription: "這一集的圖片和音訊還不在你的手機上。下載會使用行動數據。",
  size: (size) => `約 ${size}`,
  downloadNow: "立即下載",
  onWifi: "連上 Wi-Fi 時下載",
  wifiOnlyTitle: (n) => `第${n}集會在連上 Wi-Fi 時下載`,
  wifiOnlyDescription:
    "你在設定中選擇了僅限 Wi-Fi。你可以這次使用行動數據、不載入圖片和音訊直接開啟，或變更設定。",
  ok: "好",
  offlineTitle: "你目前離線",
  offlineDescription: (n) => `第${n}集尚未下載。恢復連線後就會開始下載。`,
  openAnyway: "仍要開啟",
  close: "關閉",
  askUnitTitle: (l) => `要下載${l}嗎？`,
  askUnitDescription: "這堂課的圖片和音訊還不在你的手機上。下載會使用行動數據。",
  rows: {
    common: "共用的圖片和音訊",
    allLessons: "這一集的所有課程",
    otherLessons: "其他課程",
    status: { done: "已在手機上", pending: "立即下載", wifi: "連上 Wi-Fi 時" },
  },
  askHint: "每次都會詢問你。可在 設定 › 下載 中變更。",
  wifiOnlyUnitTitle: (l) => `${l}會在連上 Wi-Fi 時下載`,
  mobileDataOnce: "這次使用行動數據",
  openWithout: "不載入圖片和音訊直接開啟",
  changeSetting: "變更設定",
  offlineUnitDescription: (l) => `${l}尚未下載。恢復連線後就會開始下載。`,
  offlineHint: "圖片會以純色顯示，聽力題會略過。",
  allCleared: {
    title: "你已完成這裡所有的故事",
    description: "可能有新的集數在等你。連上網路後，我們會幫你確認。",
    offline: "你目前離線",
    lastChecked: (d) =>
      d === null ? "尚未確認" : d === 0 ? "今天確認過" : d === 1 ? "昨天確認過" : `${d}天前確認過`,
    checkNow: "立即確認",
    later: "稍後",
    autoNote: "恢復連線時，我們也會自動確認。",
    offlineHint: "一連上網路，我們就會確認。",
  },
};
