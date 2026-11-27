// 미얀마어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileMy: LearnerProfileCopy = {
  language: "my",
  nameLabel: "သင့်အမည်",
  nameIssue: {
    empty: "သင့်အမည်ကို ထည့်ပါ။",
    "too-long": "အများဆုံး စာလုံး 30 လုံး။",
    "forbidden-character": "အမည်တွင် { သို့မဟုတ် } မပါရပါ။",
  },
  countryLabel: "နိုင်ငံ",
  notSet: "မသတ်မှတ်ရသေး",
  countryMissing: "သင့်နိုင်ငံကို ရွေးပါ။",
  preview: {
    heading: { example: "ဥပမာ", yours: "သင်ပြောမည့်စကား" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "ဥပမာ ဝါကျ" : "သင်ပြောမည့်စကား"}: ${ko} အဓိပ္ပာယ်: ${en}`,
  },
  picker: {
    title: "နိုင်ငံ ရွေးရန်",
    back: "နောက်သို့",
    searchLabel: "နိုင်ငံ ရှာရန်",
    clearSearch: "ရှာဖွေမှု ဖျက်ရန်",
    allCountries: (count) => `နိုင်ငံ ${String(count)} နိုင်ငံ · အင်္ဂလိပ်အမည်ဖြင့် ရှာပါ`,
    matches: (count) => `ရလဒ် ${String(count)} ခု`,
    noMatches: "ရလဒ် မတွေ့ပါ။ စာလုံးပေါင်းကို စစ်ပါ သို့မဟုတ် အမည်တိုဖြင့် ရှာကြည့်ပါ။",
    noMatchesAnnouncement: "ရလဒ် မတွေ့ပါ",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `နိုင်ငံ ရွေးပြီး: ${en}`,
  },
  signup: {
    continue: "ရှေ့ဆက်ရန်",
    back: "နောက်သို့",
    name: {
      title: "သင့်နာမည် ဘယ်လိုခေါ်လဲ။",
      caption: "လေ့ကျင့်မည့် ဝါကျများထဲတွင် သင့်အမည်ကို ထည့်ပေးပါမည်",
      helper: "အမည်တစ်ခု ရွေးပေးထားပါတယ် — ဒီအတိုင်းထားပါ၊ ကျပန်းပြောင်းပါ သို့မဟုတ် ကိုယ်တိုင် ရိုက်ထည့်ပါ။",
      shuffle: "အမည်ပြောင်းရန်",
      shuffleLabel: "ကျပန်းအမည် နောက်တစ်ခု ရွေးရန်",
      previewHeading: "သင်ခန်းစာထဲတွင် ဤသို့ ကြားရပါမည်",
    },
    country: {
      title: "ဘယ်နိုင်ငံက လာတာလဲ။",
      caption: "ဇာတ်လမ်းထဲတွင် လူတွေနဲ့ တွေ့တဲ့အခါ ဒီအတိုင်း ပြောရပါမယ်",
      searchPlaceholder: (count) => `နိုင်ငံ ${String(count)} နိုင်ငံထဲမှ ရှာရန်`,
      allCountries: (count) => `နိုင်ငံအားလုံး · ${String(count)}`,
      jumpTo: (letter) => `${letter} စာလုံးသို့`,
      jumpBar: "စာလုံးသို့ သွားရန်",
    },
  },
  settings: {
    title: "အမည်နှင့် နိုင်ငံ",
    body: "လေ့ကျင့်မည့် ဝါကျများတွင် အသုံးပြုပါသည်။ ပြောင်းလဲမှုများသည် နောက်ဖွင့်မည့် သင်ခန်းစာမှ စတင် သက်ရောက်ပါမည်။",
    submit: "သိမ်းရန်",
    saved: "သိမ်းပြီးပါပြီ",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) => `${summary}။ ဤစက်တွင် သိမ်းထားပါသည်။ အင်တာနက် ပြန်ရလျှင် ချိန်ကိုက်ပေးပါမည်။`,
  },
};
