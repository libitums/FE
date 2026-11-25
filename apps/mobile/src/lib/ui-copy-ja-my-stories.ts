// 내 스토리 문구(ja, ADR-0194).

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
    next: "次のストーリー",
    nextLabel: (time) => `次のストーリーは${time}から`,
  },
  guide: {
    title: "韓国語の単語をシェアしよう",
    body: "ここの友だちが返信してくれます。ストーリーのひとつひとつが小さな韓国語の練習です。",
    steps: [
      { title: "単語を選ぶ", body: "保存した単語から選べます。" },
      {
        title: "友だちが1時間以内に返信",
        body: "返信はそれぞれの友だちのチャットに届きます。",
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
    emptyWords: "保存した単語はまだありません。レッスンで学んだ単語がここに表示されます。",
    choiceLabel: (ko, meaning, selected) => `${ko}、${meaning}${selected ? "、選択中" : ""}`,
    posting: "シェア中…",
    dailyLimit: "今日シェアできるストーリーの上限に達しました。また明日お試しください。",
    windowUsed: (time) =>
      time === null
        ? "この時間帯のストーリーはもうシェアしました。"
        : `この時間帯のストーリーはもうシェアしました。次は${time}からシェアできます。`,
    failed: "ストーリーをシェアできませんでした。もう一度お試しください。",
    checkLimit: "今日はもう十分試しました。また明日どうぞ。",
    invalid: "このストーリーはシェアできませんでした。内容を変えてみてください。",
  },
  viewer: {
    yourStory: "あなたのストーリー",
    kindLabel: (kind) => (kind === "word" ? "単語カード" : "レッスンカード"),
    textLabel: "テキストストーリー",
    cardTag: (kind) => (kind === "word" ? "今日の単語" : "レッスンカード"),
    close: "閉じる",
    options: "ストーリーのオプション",
    delete: "ストーリーを削除",
    replied: (count) => (count === 0 ? "まだ返信はありません" : `${count}人の友だちが返信しました`),
    seenBy: (count) => `${count}人が見ました`,
    seenByLabel: (count) => `${count}人の友だちが見ました`,
    openChat: "チャットを開く",
    openChatLabel: (name) => `${name}とのチャットを開く`,
    saved: "返信はそれぞれの友だちのチャットに保存されます。",
    waiting: "友だちはたいてい1時間以内に返信します。",
    waitingBody: "届いたらお知らせします。返信はここと、それぞれの友だちのチャットに表示されます。",
    noFriendsTitle: "友だちを追加すると返信が届きます",
    noFriendsBody: "まず誰かとチャットしましょう。そうすれば、あなたのストーリーを見てくれます。",
    findFriends: "友だちを探す",
    hidden: "友だちが見られたのは24時間だけ。今はあなただけが見られます。",
    reactionLabel: (name, text, meaning) => `${name}：${text}${meaning ? `。${meaning}` : ""}`,
  },
  window: {
    title: (slot) =>
      slot === "morning"
        ? "今朝のストーリーをシェアしました"
        : slot === "day"
          ? "今日の午後のストーリーをシェアしました"
          : "今夜のストーリーをシェアしました",
    body: (time) => `ストーリーは朝・午後・夜に1つずつ。次は${time}からです。`,
    slot: (slot) => (slot === "morning" ? "朝" : slot === "day" ? "午後" : "夜"),
    range: (start, end) => `${start}〜${end}`,
    time: (hour, minute) => `${hour}:${String(minute).padStart(2, "0")}`,
    shared: "シェア済み",
    missed: "見送り",
    open: "受付中",
    opens: (time) => `${time}から`,
    slotLabel: (slot, range, state) => `${slot}、${range}、${state}`,
    ok: "OK",
    close: "閉じる",
  },
  start: {
    title: "新しいストーリー",
    close: "閉じる",
    camera: "カメラ",
    background: "背景",
    recent: "最近の写真",
  },
  editor: {
    label: "ストーリーの編集",
    back: "戻る",
    colors: "背景の色",
    color: (background) =>
      background === "orange"
        ? "オレンジ"
        : background === "green"
          ? "グリーン"
          : background === "blue"
            ? "ブルー"
            : "パープル",
    colorLabel: (name, on) => `${name}${on ? "、選択中" : ""}`,
    text: "テキスト",
    words: "単語",
    share: "友だちにシェア",
    posting: "シェア中…",
    hintOne: "単語を1つ置くとシェアできます。",
    hintMove: "ドラッグで移動、ピンチで大きさを変えられます。",
    stickerLabel: (ko, meaning) => `${ko}、${meaning}`,
    remove: (ko) => `削除：${ko}`,
    textBlocked: "このテキストはシェアできません。別の言葉で試してください。",
  },
  textEntry: {
    label: "ストーリーのテキスト（韓国語か英語）",
    help: "韓国語でも英語でも大丈夫、手伝います",
    done: "完了",
    colors: "文字の色",
    color: (textColor) =>
      textColor === "brown"
        ? "ブラウン"
        : textColor === "black"
          ? "ブラック"
          : textColor === "white"
            ? "ホワイト"
            : "オレンジ",
    colorLabel: (name, on) => `${name}${on ? "、選択中" : ""}`,
    editLabel: (ko) => `テキストを編集：${ko}`,
  },
  add: {
    title: "単語を追加",
    hint: "単語をタップして置きます。1つのストーリーに8つまで。",
    hintOne: "単語をタップして置きます。",
  },
  quiz: {
    free: "クイズの答えは無料",
    freeAnswer: "無料・クイズの答え",
    lastTry: "無料・最後のチャンス",
    correct: (name) => `正解！${name}ともっと仲良くなりました`,
  },
  remove: {
    title: "このストーリーを削除しますか？",
    body: (count) =>
      `カードとそこに付いた${replies(count)}が削除されます。チャットのメッセージは残り、「削除されたストーリー」と表示されます。元に戻せません。`,
    allTitle: "すべてのストーリーを削除しますか？",
    allBody:
      "すべてのストーリーとそこに付いた返信が削除されます。チャットのメッセージは残り、「削除されたストーリー」と表示されます。元に戻せません。",
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
    deleteAllNote: "カードとそこに付いた返信はサーバーから削除されます。",
    empty: "ストーリーはまだありません。チャット一覧の上の＋をタップして単語をシェアしましょう。",
    today: "今日",
    date: (month, day) => `${month}月${day}日`,
  },
  quote: {
    mine: "あなたのストーリーについて返信しました",
    reacted: "あなたのストーリーに返信しました",
    deleted: "削除されたストーリー",
    deletedLabel: "削除されたストーリーへの返信",
  },
};
