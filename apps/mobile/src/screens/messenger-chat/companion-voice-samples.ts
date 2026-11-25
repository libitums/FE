// 프로필 시트 목소리 견본의 앱 쪽 표입니다(ADR-0198 D1). 정본은 `docs/content/companion-voice-intros.json` — 경로 · 대본 · 로마자 ·
// 여덟 언어 뜻이 그 파일과 같아야 합니다(단위 테스트 VS1이 맞춥니다). 순수 데이터. 대본은 학습 내용이라 한글 그대로 둡니다.

import type { VoiceSampleScript } from "./friend-catalog.contract";

/** 인물 칸에 얹는 두 값 — 견본이 없는 인물은 둘 다 null입니다. */
export type VoiceSampleFields = {
  readonly voiceSamplePath: string | null;
  readonly voiceSampleScript: VoiceSampleScript | null;
};

/** 인물 id → 대본. 음성 파일은 `content/audio/companion/<id>-intro.mp3`입니다. 정본 순서(추천 친구 넷 · 이야기 다섯)대로 둡니다. */
export const VOICE_SAMPLE_SCRIPTS: Readonly<Record<string, VoiceSampleScript>> = {
  seoyeon: {
    ko: "차서연이에요. 제 그림 보고 싶어요? 비싸요 ㅋㅋ",
    roman: "chaseoyeonieyo. je geurim bogo sipeoyo? bissayo kk",
    en: "I'm Cha Seoyeon. Want to see my drawings? They're pricey. lol",
    es: "Soy Cha Seoyeon. ¿Quieres ver mis dibujos? Son caros. jaja",
    id: "Aku Cha Seoyeon. Mau lihat gambarku? Mahal, lho. wkwk",
    ja: "チャ・ソヨンです。私の絵、見たいですか？高いですよ。笑",
    vi: "Mình là Cha Seoyeon. Muốn xem tranh của mình không? Đắt lắm đấy. haha",
    th: "เรา Cha Seoyeon อยากดูรูปวาดของเราไหม? แพงนะ 555",
    my: "Cha Seoyeon ပါ။ ကျွန်မပန်းချီတွေ ကြည့်ချင်လား။ ဈေးကြီးတယ်နော်။ ဟားဟား",
    "zh-TW": "我是 Cha Seoyeon。想看我的畫嗎？很貴喔，哈哈",
  },
  haejun: {
    ko: "권해준이에요. 마, 밥 묵었나? ㅎㅎ 부산말이에요",
    roman: "gwonhaejunieyo. ma, bap mugeonna? hh busanmarieyo",
    en: "I'm Kwon Haejun. Hey, eaten yet? Hehe. That's Busan dialect.",
    es: "Soy Kwon Haejun. Oye, ¿ya comiste? Jeje. Es dialecto de Busan.",
    id: "Aku Kwon Haejun. Hei, sudah makan? Hehe. Itu dialek Busan.",
    ja: "クォン・ヘジュンです。おい、飯食ったか？へへ。釜山弁です。",
    vi: "Mình là Kwon Haejun. Này, ăn cơm chưa? Hehe. Đó là tiếng địa phương Busan.",
    th: "เรา Kwon Haejun เฮ้ กินข้าวหรือยัง? ฮิฮิ นี่ภาษาถิ่นปูซานนะ",
    my: "Kwon Haejun ပါ။ ဟေး၊ ထမင်းစားပြီးပြီလား။ ဟဲဟဲ။ ဒါ ဘူဆန်ဒေသိယစကားပါ။",
    "zh-TW": "我是 Kwon Haejun。喂，吃飯了沒？嘿嘿，這是釜山話。",
  },
  daeun: {
    ko: "송다은이에요! 외국인 친구 처음이에요 ㅎㅎ 대박!",
    roman: "songdaeunieyo! oegugin chingu cheoeumieyo hh daebak!",
    en: "I'm Song Daeun! You're my first foreign friend, hehe. Awesome!",
    es: "¡Soy Song Daeun! Eres mi primer amigo extranjero, jeje. ¡Qué pasada!",
    id: "Aku Song Daeun! Kamu teman asing pertamaku, hehe. Keren!",
    ja: "ソン・ダウンです！外国人の友達、初めてです。へへ。やばい！",
    vi: "Mình là Song Daeun! Bạn là người bạn nước ngoài đầu tiên của mình đó, hehe. Đỉnh ghê!",
    th: "เรา Song Daeun! คุณเป็นเพื่อนต่างชาติคนแรกของเราเลย ฮิฮิ สุดยอด!",
    my: "Song Daeun ပါ။ နင်က ကျွန်မရဲ့ ပထမဆုံး နိုင်ငံခြားသူငယ်ချင်းပဲ၊ ဟဲဟဲ။ မိုက်တယ်!",
    "zh-TW": "我是 Song Daeun！你是我第一個外國朋友，嘿嘿。太讚了！",
  },
  geonwoo: {
    ko: "임건우예요! 오늘 10킬로 뛰었어요 ㅋㅋ 힘들다~",
    roman: "imgeonuyeyo! oneul sip killo ttwieosseoyo kk himdeulda~",
    en: "I'm Lim Geonwoo! I ran 10 km today, haha. I'm beat~",
    es: "¡Soy Lim Geonwoo! Hoy corrí 10 km, jaja. ¡Estoy muerto~!",
    id: "Aku Lim Geonwoo! Hari ini aku lari 10 km, wkwk. Capek~",
    ja: "イム・ゴヌです！今日10キロ走りました。笑 疲れた〜",
    vi: "Mình là Lim Geonwoo! Hôm nay mình chạy 10 km, haha. Mệt quá~",
    th: "เรา Lim Geonwoo! วันนี้วิ่งไป 10 กิโล 555 เหนื่อยจัง~",
    my: "Lim Geonwoo ပါ။ ဒီနေ့ ၁၀ ကီလို ပြေးခဲ့တယ်၊ ဟားဟား။ မောလိုက်တာ~",
    "zh-TW": "我是 Lim Geonwoo！今天跑了 10 公里，哈哈。好累喔～",
  },
  duksu: {
    ko: "덕수쌤이에요! 제 머리요? 공부를 너무 해서요 하하하",
    roman: "deoksussaemieyo! je meoriyo? gongbureul neomu haeseoyo hahaha",
    en: "I'm Teacher Duksu! My head? I studied too much. Hahaha",
    es: "¡Soy el profe Duksu! ¿Mi cabeza? Es de estudiar demasiado. Jajaja",
    id: "Aku Pak Duksu! Kepalaku? Karena terlalu banyak belajar. Hahaha",
    ja: "トクス先生です！僕の頭ですか？勉強しすぎたせいです。ははは",
    vi: "Thầy là thầy Duksu! Đầu của thầy á? Tại học nhiều quá đấy. Hahaha",
    th: "ครู Duksu เองครับ! หัวผมเหรอ? เพราะเรียนหนักเกินไปน่ะครับ ฮ่าฮ่าฮ่า",
    my: "ဆရာ Duksu ပါ။ ဆရာ့ခေါင်းလား။ စာအရမ်းကျက်လို့ပါ။ ဟားဟားဟား",
    "zh-TW": "我是 Duksu 老師！我的頭？因為讀書讀太多了。哈哈哈",
  },
  yoonkyung: {
    ko: "어서 와요, 정윤경이에요 호호. 밥은 먹었어요?",
    roman: "eoseo wayo, jeongyungyeongieyo hoho. babeun meogeosseoyo?",
    en: "Welcome, I'm Jung Yoonkyung, hoho. Have you eaten?",
    es: "Bienvenido, soy Jung Yoonkyung, jojo. ¿Ya comiste?",
    id: "Selamat datang, saya Jung Yoonkyung, hoho. Sudah makan?",
    ja: "いらっしゃい、チョン・ユンギョンです。ふふ。ご飯は食べましたか？",
    vi: "Chào mừng bạn, tôi là Jung Yoonkyung, hihi. Bạn ăn cơm chưa?",
    th: "ยินดีต้อนรับจ้ะ นี่ Jung Yoonkyung นะ โฮะๆ กินข้าวหรือยัง?",
    my: "ကြိုဆိုပါတယ်၊ Jung Yoonkyung ပါ၊ ဟိုးဟိုး။ ထမင်းစားပြီးပြီလား။",
    "zh-TW": "歡迎光臨，我是 Jung Yoonkyung，呵呵。吃飯了嗎？",
  },
  mina: {
    ko: "안녕! 아니, 안녕하세요! 미나예요 ㅎㅎ",
    roman: "annyeong! ani, annyeonghaseyo! minayeyo hh",
    en: "Hi! I mean, hello! I'm Mina, hehe.",
    es: "¡Hola! Digo, ¡buenas! Soy Mina, jeje.",
    id: "Hai! Eh, maksudku, halo! Aku Mina, hehe.",
    ja: "やあ！じゃなくて、こんにちは！ミナです。へへ",
    vi: "Chào! À không, xin chào ạ! Mình là Mina, hehe.",
    th: "หวัดดี! เอ๊ย สวัสดีค่ะ! เรา Mina นะ ฮิฮิ",
    my: "ဟိုင်း! အာ မဟုတ်ဘူး၊ မင်္ဂလာပါ! Mina ပါ၊ ဟဲဟဲ။",
    "zh-TW": "嗨！不對，你好！我是 Mina，嘿嘿。",
  },
  doyun: {
    ko: "도윤이에요! 사실 저 연습생이에요. 쉿! ㅎㅎ",
    roman: "doyunieyo! sasil jeo yeonseupsaengieyo. swit! hh",
    en: "I'm Doyun! Actually, I'm a trainee. Shh! Hehe.",
    es: "¡Soy Doyun! En realidad, soy aprendiz de idol. ¡Shh! Jeje.",
    id: "Aku Doyun! Sebenarnya aku trainee. Sst! Hehe.",
    ja: "ドユンです！実は僕、練習生なんです。しーっ！へへ",
    vi: "Mình là Doyun! Thật ra mình là thực tập sinh đấy. Suỵt! Hehe.",
    th: "เรา Doyun! จริงๆ แล้วเราเป็นเด็กฝึก ชู่ว์! ฮิฮิ",
    my: "Doyun ပါ။ တကယ်တော့ ကျွန်တော်က အိုင်ဒေါ်လေ့ကျင့်သူပါ။ ရှူး! ဟဲဟဲ။",
    "zh-TW": "我是 Doyun！其實我是練習生。噓！嘿嘿。",
  },
  jaemin: {
    ko: "서재민입니다. 오늘 저녁… 시간 있어요? 흠흠",
    roman: "seojaeminimnida. oneul jeonyeok… sigan isseoyo? heumheum",
    en: "I'm Seo Jaemin. This evening… are you free? Ahem.",
    es: "Soy Seo Jaemin. Esta noche… ¿tienes tiempo? Ejem.",
    id: "Saya Seo Jaemin. Malam ini… ada waktu? Ehem.",
    ja: "ソ・ジェミンです。今夜…時間ありますか？コホン",
    vi: "Tôi là Seo Jaemin. Tối nay… bạn có rảnh không? E hèm.",
    th: "นี่ Seo Jaemin ครับ เย็นนี้… ว่างไหมครับ? อะแฮ่ม",
    my: "Seo Jaemin ပါ။ ဒီညနေ… အားလား။ အဟမ်း။",
    "zh-TW": "我是 Seo Jaemin。今天晚上…有空嗎？咳咳。",
  },
};

/** 그 인물의 견본(경로 · 대본) — 표에 없으면 둘 다 null. */
export function voiceSampleOf(id: string): VoiceSampleFields {
  const script = VOICE_SAMPLE_SCRIPTS[id];
  return script === undefined
    ? { voiceSamplePath: null, voiceSampleScript: null }
    : { voiceSamplePath: `content/audio/companion/${id}-intro.mp3`, voiceSampleScript: script };
}
