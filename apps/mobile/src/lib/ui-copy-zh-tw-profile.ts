// 대만 중국어(번체, zh-TW) 문구표 구획 — 학습자 프로필(이름 · 나라) 양식 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileZhTw: LearnerProfileCopy = {
  language: "zh-TW",
  nameLabel: "你的名字",
  nameIssue: {
    empty: "請輸入你的名字。",
    "too-long": "請使用30個字元以內。",
    "forbidden-character": "名字不能包含 { 或 }。",
  },
  countryLabel: "國家",
  notSet: "尚未設定",
  countryMissing: "請選擇你的國家。",
  preview: {
    heading: { example: "範例", yours: "你會說" },
    label: (kind, ko, en) => `${kind === "example" ? "範例句子" : "你會說"}：${ko} 意思：${en}`,
  },
  picker: {
    title: "選擇國家",
    back: "返回",
    searchLabel: "搜尋國家",
    clearSearch: "清除搜尋",
    allCountries: (count) => `${String(count)}個國家 · 以英文名稱搜尋`,
    matches: (count) => `${String(count)}個結果`,
    noMatches: "找不到結果。請檢查拼字，或試試較短的名稱。",
    noMatchesAnnouncement: "找不到結果",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `國家已設為 ${en}`,
  },
  signup: {
    continue: "繼續",
    back: "返回",
    name: {
      title: "你叫什麼名字？",
      caption: "我們會把它放進你練習的句子裡",
      helper: "我們幫你選了一個名字 — 可以保留、隨機換一個，或自己輸入。",
      shuffle: "隨機",
      shuffleLabel: "隨機換一個名字",
      previewHeading: "在課程中聽起來像這樣",
    },
    country: {
      title: "你來自哪裡？",
      caption: "在故事中認識新朋友時，你會說這句話",
      searchPlaceholder: (count) => `搜尋${String(count)}個國家`,
      allCountries: (count) => `所有國家 · ${String(count)}`,
      jumpTo: (letter) => `跳到 ${letter}`,
      jumpBar: "跳到字母",
    },
    birthYear: {
      title: "你是哪一年出生的？",
      caption: "我們用它來讓 App 適合你的年齡。這不會顯示給任何人。",
    },
  },
  settings: {
    title: "名字和國家",
    body: "用於你練習的句子。變更會從你下一次開啟的課程開始套用。",
    submit: "儲存",
    saved: "已儲存",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) => `${summary}。已儲存在這台裝置上，恢復連線後我們會同步。`,
  },
};
