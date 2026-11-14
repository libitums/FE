// 메신저 문구 표의 덧붙는 칸(ja) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";

export const messengerChatExtraJa: MessengerChatExtraCopy = {
  access: {
    signInTitle: "出会った人とメッセージしよう",
    signInBody:
      "無料アカウントを作ると、ストーリーで出会った人たちと韓国語でチャットできます。これまでの進み具合も引き継がれます。",
    signIn: "登録またはログイン",
    comingSoonTitle: "チャットはまもなく公開",
    comingSoonBody:
      "まずは一部の方にチャットを公開しています。学習を続けてください。出会った人たちともうすぐやり取りできます。",
  },
  pushNotice: { chatUnavailable: "このチャットは今は開けません。" },
  chatSettings: {
    entryTitle: "チャット",
    entryDescription: "返信のヒント・キャラクターからのメッセージ・記憶",
    title: "チャット",
    back: "戻る",
    sectionWhile: "チャット中",
    replyIdeas: "返信のヒント",
    replyIdeasBody: "メッセージのたびに返信の候補を1〜2個表示します",
    sectionProactive: "キャラクターからのメッセージ",
    proactive: "相手から話しかける",
    sectionAbout: "あなたについて",
    sharedMemories: "みんなが知っているあなたのこと",
    sharedMemoriesSummary: (count) => `${count}件 · すべてのキャラクターと共有`,
    footnote:
      "キャラクターはそれぞれ、あなたとのチャットの内容も覚えています。チャットを開いて ☰ をタップすると見られます。",
    proactiveSheet: {
      title: "相手から話しかける",
      body: "しばらくやり取りがないと、キャラクターから話しかけることがあります。コインはかかりません。",
      howOften: "頻度",
      prefs: { off: "オフ", daily1: "1日1回", daily2: "1日2回" },
      preferredTime: "希望の時間",
      anyTime: "いつでも",
      hour: (hour) => `${hour}:00`,
      quietNote:
        "現地時間の22時〜8時はメッセージを送りません。1日2回の場合、2回目は約10時間後です。",
      save: "保存",
      close: "閉じる",
    },
    memories: {
      titleShared: "みんなが知っているあなたのこと",
      titleCharacter: (name) => `${name}が覚えていること`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "記憶がいっぱいです",
      fullBody: (name) =>
        `いくつか削除するまで、${name ?? "キャラクター"}は新しいことを覚えられません。あなたが編集した記憶は残ります。`,
      intro: (name) =>
        `${name ?? "すべてのキャラクター"}は、これを使ってあなたに合わせたチャットをします。この一覧はあなただけが見られます。編集・削除は無料です。`,
      empty: (name) =>
        `まだありません。チャットで話したことを${name ?? "キャラクター"}が覚えていきます。`,
      edited: "編集済み",
      edit: "記憶を編集",
      delete: "記憶を削除",
      editTitle: "記憶を編集",
      editHint: (name) => `${name ?? "キャラクター"}は、書いたとおりに覚えます。`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "キャンセル",
      save: "保存",
      deleteTitle: "この記憶を削除しますか？",
      deleteBody: (name) => `次のメッセージから、${name ?? "キャラクター"}はこの記憶を使いません。`,
      deleteConfirm: "削除",
      sidebar: (name) => `${name}が覚えていること`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · いっぱい` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "直し方",
      title: "直し方",
      body: (name) =>
        `韓国語にまちがいがあったとき、${name}がどう手伝うかを選びます。訂正カードはいつも届きます。変わるのは${name}の返し方です。`,
      modes: {
        separate: {
          title: "カードだけ",
          body: (name) => `${name}はそのまま会話を続けます。直しはメッセージの下の ✎ に出ます。`,
        },
        natural: {
          title: "返事の中で自然に",
          body: (name) => `${name}が友だちのように、正しい言い方を返事の中で使います。`,
        },
        prefix: {
          title: "先に指摘する",
          body: (name) => `${name}が短く直してから、会話を続けます。`,
        },
      },
      defaultTag: "標準",
      note: "次のメッセージから、すべてのキャラクターに適用されます。",
      save: "保存",
      close: "閉じる",
    },
  },
  feedback: {
    titles: { correction: "直し", better: "もっと自然に", l1_to_ko: "韓国語で" },
    sendCorrected: "直した文で送る",
    sendInKorean: "韓国語で送る",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "いい返事",
    bad: "よくない返事",
    goodSelected: "いい返事、選択中",
    badSelected: "よくない返事、選択中",
    liked: "いいねしました",
    flagged: "よくないと伝えました",
    sheet: {
      title: "どこがよくなかったですか？",
      body: (name) => `当てはまるものを選んでください。${name}の返事がよくなります。`,
      reasons: {
        awkward_korean: () => "韓国語が不自然",
        out_of_character: (name) => `${name}らしくない`,
        too_hard: () => "難しすぎる",
        uncomfortable: () => "不快だった",
        other: () => "その他",
      },
      reportPrompt: "このメッセージを確認しましょうか？",
      report: "報告",
      noteLabel: "詳しく教えてください（任意）",
      notePlaceholder: "メモを追加",
      send: "送信",
      close: "閉じる",
    },
  },
  remote: {
    noCredits: (name) => `${name}とチャットするクレジットがありません。`,
    notAvailable: (name) => `${name}とはまだチャットできません。`,
    sendFailed: "送信できませんでした。もう一度お試しください。",
  },
};
