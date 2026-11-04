// 일본어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsJa: NotificationsCopy = {
  title: "お知らせ",
  emptyTitle: "お知らせはまだありません",
  emptyBody: "新しいお知らせがあると、ここに表示されます。",
  deleteLabel: (message) => `${message}、削除`,
  destination: {
    "roleplay-list": "ロールプレイ一覧を見る",
  },
};

export const settingsJa: SettingsCopy = {
  title: "設定",
  group: { account: "アカウント", learning: "学習", accountActions: "アカウント操作" },
  nav: {
    profile: "ユーザープロフィール",
    "learner-profile": "レッスンで使う名前と国",
    language: "言語",
    download: "ダウンロード",
    notifications: "お知らせ",
    feedback: "フィードバックを送る",
    "privacy-policy": "プライバシーポリシー",
    "terms-of-use": "利用規約",
  },
  downloads: {
    title: "ダウンロード",
    caption: "画像と音声をダウンロードするタイミングを選べます。",
    mobileDataHeading: "モバイルデータでのダウンロード",
    policy: { ask: "毎回確認する", always: "常にダウンロード", "wifi-only": "Wi-Fiのみ" },
    offlineHeading: "オフライン",
    downloadAll: "オフライン用にすべてダウンロード",
    downloadAllCaption: "すべてのエピソードの画像と音声。通信なしでも学習できます。",
    downloadAllStarted: "バックグラウンドでダウンロード中です。学習を続けられます。",
    downloaded: (size) => `ダウンロード済み：${size}`,
    confirm: {
      title: "モバイルデータでダウンロードしますか？",
      description:
        "すべてのエピソードをダウンロードすると、多くのデータを使う場合があります。Wi-Fiを待つこともできます。",
      download: "今すぐダウンロード",
      cancel: "キャンセル",
    },
  },
  sessionOption: { "auto-play-audio": "自動再生", "show-transcript": "字幕を表示" },
  optionState: { on: "オン", off: "オフ" },
  action: { "sign-out": "ログアウト", "delete-account": "アカウントを削除" },
  signOutDialog: {
    title: "ログアウトしますか？",
    confirm: "ログアウト",
    cancel: "ログインしたままにする",
  },
  deleteDialog: {
    title: "アカウントを削除しますか？",
    description: "アカウントと学習の進捗は完全に削除されます。この操作は元に戻せません。",
    confirm: "アカウントを削除",
    cancel: "削除しない",
  },
  deleteFailure: {
    network: "アカウントを削除できませんでした。接続を確認して、もう一度お試しください。",
    other: "アカウントを削除できませんでした。もう一度お試しください。",
  },
  exitAnnouncement: {
    "signed-out": "ログアウトしました。",
    deleted: "アカウントを削除しました。",
  },
  version: (name, build) => `バージョン ${name} (${build})`,
};

export const appUpdateJa: AppUpdateCopy = {
  title: "Duruをアップデートしてください",
  description:
    "このバージョンのDuruはサポートが終了しました。学習を続けるには、ストアから最新版を入手してください。",
  update: "アップデート",
  failure:
    "ストアを開けませんでした。App StoreまたはGoogle PlayからDuruをアップデートしてください。",
};

export const feedbackJa: FeedbackCopy = {
  title: "フィードバックを送る",
  ratingQuestion: "Duruの使い心地はいかがですか？",
  ratingOption: { 1: "よくない", 2: "いまひとつ", 3: "ふつう", 4: "よい", 5: "とてもよい" },
  messageLabel: "ほかに伝えたいことはありますか？（任意）",
  send: "送信",
  sent: "ありがとうございます！フィードバックを受け取りました。",
  failed: "フィードバックを送信できませんでした。もう一度お試しください。",
  survey: {
    title: "このエピソードはいかがでしたか？",
    description: (episodeTitle) => `${episodeTitle}を終えました。感想を聞かせてください。`,
    skip: "あとで",
  },
};

export const profileJa: ProfileCopy = {
  notProvided: "未登録",
  learningLanguage: "韓国語",
  title: "ユーザープロフィール",
  itemLabel: {
    name: "名前",
    "learning-language": "学習言語",
    email: "メールアドレス",
    phone: "電話番号",
  },
};

export const gemPurchaseJa: GemPurchaseCopy = {
  packAmount: (_count, display) => `${display}ジェム`,
  balance: (_count, display) => `所持ジェム：${display}`,
  paymentMethod: "支払い方法",
  notice: {
    title: "お支払いは近日公開",
    description: "ジェムの購入はまだご利用いただけません。もうしばらくお待ちください。",
  },
};

export const downloadSheetJa: DownloadSheetCopy = {
  askTitle: (n) => `エピソード${n}をダウンロードしますか？`,
  askDescription:
    "このエピソードの画像と音声はまだ端末にありません。ダウンロードにはモバイルデータを使います。",
  size: (size) => `約${size}`,
  downloadNow: "今すぐダウンロード",
  onWifi: "Wi-Fiでダウンロード",
  dontAskAgain: "今後確認しない",
  wifiOnlyTitle: (n) => `エピソード${n}はWi-Fiでダウンロードします`,
  wifiOnlyDescription: "設定で「Wi-Fiのみ」を選んでいます。Wi-Fiにつながるとダウンロードします。",
  ok: "OK",
  offlineTitle: "オフラインです",
  offlineDescription: (n) =>
    `エピソード${n}はまだダウンロードされていません。オンラインに戻るとダウンロードします。`,
  openAnyway: "このまま開く",
  close: "閉じる",
  checked: "オン",
  unchecked: "オフ",
  allCleared: {
    title: "ここにあるストーリーはすべて終わりました",
    description: "新しいエピソードがあるかもしれません。インターネットにつなぐと確認します。",
    offline: "オフラインです",
    lastChecked: (d) =>
      d === null
        ? "まだ確認していません"
        : d === 0
          ? "最終確認：今日"
          : d === 1
            ? "最終確認：昨日"
            : `最終確認：${d}日前`,
    checkNow: "今すぐ確認",
    later: "あとで",
    autoNote: "オンラインに戻ると自動でも確認します。",
    offlineHint: "つながったらすぐに確認します。",
  },
};
