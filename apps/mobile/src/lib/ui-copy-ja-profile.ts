// 일본어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileJa: LearnerProfileCopy = {
  nameLabel: "あなたの名前",
  nameIssue: {
    empty: "名前を入力してください。",
    "too-long": "30文字以内で入力してください。",
    "forbidden-character": "名前に { と } は使えません。",
  },
  countryLabel: "国",
  notSet: "未設定",
  countryMissing: "国を選択してください。",
  preview: {
    heading: { example: "例", yours: "あなたが言う文" },
    label: (kind, ko, en) => `${kind === "example" ? "例文" : "あなたが言う文"}：${ko} 意味：${en}`,
  },
  picker: {
    title: "国を選択",
    back: "戻る",
    searchLabel: "国を検索",
    clearSearch: "検索をクリア",
    allCountries: (count) => `${count}か国 · 英語名で検索`,
    matches: (count) => `${count}件`,
    noMatches: "見つかりません。つづりを確認するか、短い名前で試してください。",
    noMatchesAnnouncement: "見つかりません",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `国を${en}に設定しました`,
  },
  signup: {
    continue: "続ける",
    back: "戻る",
    name: {
      title: "お名前は？",
      caption: "練習する文の中で使います",
      helper: "名前を選んでおきました。そのまま使うか、シャッフルするか、自分で入力してください。",
      shuffle: "シャッフル",
      shuffleLabel: "別の名前をランダムに選ぶ",
      previewHeading: "レッスンではこうなります",
    },
    country: {
      title: "どこの出身ですか？",
      caption: "ストーリーで人と出会ったときに言います",
      searchPlaceholder: (count) => `${count}か国から検索`,
      allCountries: (count) => `すべての国 · ${count}`,
      jumpTo: (letter) => `${letter}へ移動`,
      jumpBar: "頭文字で移動",
    },
  },
  settings: {
    title: "名前と国",
    body: "練習する文の中で使います。変更は次に開くレッスンから反映されます。",
    submit: "保存",
    saved: "保存しました",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) => `${summary}。この端末に保存しました。オンラインに戻ったら同期します。`,
  },
};
