// 내 스토리 문구(ja, ADR-0179).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => `返信${count}件`;

const LIVE = "公開中";

export const myStoriesJa: MyStoriesCopy = {
  language: "ja",
  row: {
    create: "作成",
    createLabel: "新しいストーリーを作る",
    mine: "自分",
    mineLabel: (count, unseen) =>
      `あなたのストーリー、${replies(count)}${unseen ? "、新しい返信あり" : ""}`,
  },
  guide: {
    title: "韓国語の単語をシェアしよう",
    body: "ここの友だちが返信してくれます。ストーリーのひとつひとつが小さな韓国語の練習です。",
    steps: [
      {
        title: "単語かレッスンカードを選ぶ",
        body: "保存した単語やレッスンから選べます。",
      },
      {
        title: "友だちが1日かけて返信",
        body: "あなたの単語を使って返信します。「返信する」をタップして会話を続けましょう。",
      },
      {
        title: "見られるのはduruの友だちだけ",
        body: "ほかの人には見えません。設定 › マイストーリーでいつでも削除できます。",
      },
    ],
    start: "最初のストーリーを作る",
    later: "あとで",
    stepLabel: (n, title, body) => `${n}. ${title}。${body}`,
  },
  composer: {
    title: "新しいストーリー",
    close: "閉じる",
    tabsLabel: "シェアするもの",
    tab: (kind) => (kind === "word" ? "単語帳" : "レッスンカード"),
    wordsTitle: "保存した単語を選ぶ",
    wordCount: (count) => `${count}語`,
    all: "すべて",
    emptyWords: "保存した単語はまだありません。レッスンで学んだ単語がここに表示されます。",
    emptyCards: "レッスンを終えると、そのカードをシェアできます。",
    chipLabel: (label, on) => `${label}${on ? "、選択中" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko}、${meaning}${selected ? "、選択中" : ""}`,
    share: (ko) => `${ko}でカードを作る`,
    shareCard: "カードをシェア",
    posting: "シェア中…",
    dailyLimit: "今日シェアできるストーリーの上限に達しました。また明日お試しください。",
    failed: "ストーリーをシェアできませんでした。もう一度お試しください。",
  },
  viewer: {
    yourStory: "あなたのストーリー",
    kindLabel: (kind) => (kind === "word" ? "単語カード" : "レッスンカード"),
    cardTag: (kind) => (kind === "word" ? "今日の単語" : "レッスンカード"),
    close: "閉じる",
    options: "ストーリーのオプション",
    delete: "ストーリーを削除",
    repliesTitle: "友だちがあなたの単語を使いました",
    waiting: "友だちが1日のうちに返信してくれます。",
    hidden: "友だちが見られたのは24時間だけ。今はあなただけが見られます。",
    answer: (name) => `${name}に返信する`,
    reactionLabel: (name, text, meaning) => `${name}：${text}${meaning ? `。${meaning}` : ""}`,
  },
  remove: {
    title: "このストーリーを削除しますか？",
    body: (count) =>
      `カードと友だちからの${replies(count)}が削除されます。チャットには「削除されたストーリー」と表示されます。元に戻せません。`,
    allTitle: "すべてのストーリーを削除しますか？",
    allBody:
      "すべてのストーリーと友だちの返信が削除されます。チャットには「削除されたストーリー」と表示されます。元に戻せません。",
    confirm: "削除",
    cancel: "キャンセル",
    failed: "削除できませんでした。もう一度お試しください。",
  },
  archive: {
    entryTitle: "マイストーリー",
    entryDescription: "シェアした単語とカード",
    title: "マイストーリー",
    back: "設定に戻る",
    keep: "24時間後もストーリーを残す",
    keepBody:
      "友だちがストーリーを見られるのは24時間です。このアーカイブはあなただけが見られます。",
    count: (count) => `ストーリー${count}件`,
    newest: "新しい順",
    live: LIVE,
    tileMeta: (date, count) => `${date}・${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}、${meaning}、${date}、${replies(count)}${live ? `、${LIVE}` : ""}`,
    deleteOne: (date) => `${date}のストーリーを削除`,
    deleteToday: "今日のストーリーを削除",
    deleteAll: "すべてのストーリーを削除",
    deleteAllNote: "カードと友だちの返信はサーバーから削除されます。",
    empty: "ストーリーはまだありません。チャット一覧の上の＋をタップして単語をシェアしましょう。",
    today: "今日",
    date: (month, day) => `${month}月${day}日`,
  },
  quote: {
    mine: "あなたのストーリーについて返信しました",
    replyingMine: "あなたのストーリーについて返信中",
    deleted: "削除されたストーリー",
    deletedLabel: "削除されたストーリーへの返信",
  },
};
