// 컴패니언 「지금까지 이야기」 카드 데이터(docs/specs/ai-companion-story.md). 원천은 duru-curation audio/story/timeline.yaml @674cd495을 캐릭터가 직접 겪은
// 일만 골라 손으로 줄인 것 — 제작 메모 · 분기 · 뒤 에피소드 언급 · 그 캐릭터가 없던 막간은 뺐다. 스토리가 바뀌면 여기를 고친다.
// 덕수쌤은 타임라인에 없다(교실 밖 막간 인물). 고르기 · 글 만들기는 `companion-story.ts`.

export type StoryEntry = {
  readonly episode: string;
  /** 그 에피소드에서 이 캐릭터가 학습자와 겪은 일(한국어 짧은 문장). */
  readonly lines: readonly string[];
  /** 아직 안 끝난 말 · 약속. 카드가 보일 때 함께 싣는다. */
  readonly open?: readonly { readonly id: string; readonly line: string }[];
};

export const storyVersion = "2026-11-15";

export const storyEntries: Readonly<Record<string, readonly StoryEntry[]>> = {
  yoonkyung: [
    {
      episode: "u02-checkin",
      lines: [
        "마당을 쓸다가 미나가 불러서 학습자의 체크인을 받았다. 일주일 묵고 201호(3층), 와이파이는 duruduru, 체크아웃은 오전 11시.",
        "마루에서는 신발을 벗으라고 챙겨 줬다.",
      ],
    },
    {
      episode: "u13-pajeon",
      lines: [
        "비 오는 밤 마당에서 학습자에게 「시장에서 빈대떡은 먹었어요?」 하고 물었다. 아침 전화에서 말하려던 게 빈대떡이었는데, 학습자는 못 먹었다. 같이 아쉬워했다.",
        "그 뒤 미나가 학습자를 데리고 파전을 먹으러 나갔다.",
      ],
    },
    {
      episode: "u15-changdeokgung",
      lines: [
        "학습자와 미나가 한복을 입고 창덕궁에 간 날, 옛날에 찍은 한복 사진을 메시지로 보내 줬다(사진 속 자기는 눈을 감았다).",
      ],
    },
    {
      episode: "u17-samgyeopsal",
      lines: [
        "밤늦게 마루에서, 학습자가 어떤 남자와 숙소 골목 입구까지 걸어와 인사하는 걸 봤다. 아직 그 얘기는 하지 않았다.",
      ],
      open: [
        {
          id: "late-return",
          line: "어젯밤 늦게 들어온 걸 봤다 — 아침에 지나가듯 한마디 할 수 있다",
        },
      ],
    },
  ],
  mina: [
    {
      episode: "u01-water",
      lines: [
        "게스트하우스 앞에서 짐 정리를 하다가 처음 보는 학습자에게 먼저 「어, 새로 오셨나 봐요?」 하고 말을 걸었다. 아직 서로 이름은 몰랐다.",
      ],
    },
    {
      episode: "u02-checkin",
      lines: [
        "마당의 사장님을 불러 학습자의 체크인을 도와줬다. 학습자는 201호 창가 침대에 놓인 미나의 배낭을 봤다.",
      ],
    },
    {
      episode: "u03-mina",
      lines: [
        "샤워하고 들어와 같은 방(여성 도미토리) 룸메이트가 된 걸 알았다. 캐리어 둘 곳을 알려 주고 처음 통성명을 했다 — 미나는 스위스에서 한국어를 배우러 왔고, 이틀 먼저 왔고, 2주 머문다.",
        "「우리 친하게 지내요」 하고, 유진식당 약도를 그려 준 뒤 약속이 있어 급히 나갔다.",
      ],
      open: [
        {
          id: "yujin-report",
          line: "「유진식당 맛있었는지 내일 얘기해 줘요!」 — 아직 후기를 못 들었다",
        },
      ],
    },
    {
      episode: "u13-pajeon",
      lines: [
        "비 오는 밤, 「비 올 때는 파전이죠?」 하고 학습자를 골목 전집에 데려갔다. 둘 다 잘 모르면서 사장님 말만 믿고 갔다.",
        "파전과 막걸리를 처음 같이 먹고 「짠!」 했다. 내일 한복 입고 창덕궁 가자고 했다.",
      ],
    },
    {
      episode: "u14-hanbok",
      lines: [
        "비 갠 아침, 같이 「고운한복」에서 한복을 빌렸다. 미나는 노란 저고리에 분홍 치마, 학습자는 파란 치마. 서로 「어때요?」 「예뻐요!」 했다.",
      ],
    },
    {
      episode: "u15-changdeokgung",
      lines: [
        "한복 차림으로 창덕궁에 갔다. 둘이 같이 나온 사진이 없어서 관광객에게 부탁했는데 미나가 눈을 감아서 한 장 더 찍었다. 그 뒤 미나는 덕수궁으로 갔다.",
      ],
    },
  ],
  doyun: [
    {
      episode: "u04-directions",
      lines: [
        "저녁에 카페 마감하고 퇴근하다가, 약도를 들고 10분째 헤매던 학습자에게 유진식당 가는 길(저기에서 오른쪽)을 알려 줬다. 서로 이름은 몰랐다.",
      ],
    },
    {
      episode: "u06-cafe",
      lines: [
        "다음 날 아침 학습자가 카페 끌림에 왔다. 「어, 어제 그분 맞죠?」 하고 먼저 알아봤다. 학습자는 명찰을 보고 이름을 알았다.",
        "아이스 아메리카노를 내주며 유진식당 갔는지, 김치찌개 맛있었는지 물었다.",
      ],
    },
    {
      episode: "u12-cafe-missed",
      lines: [
        "학습자가 노트북 손님(재민)에게 우산을 돌려주러 왔는데 그 손님은 방금 나간 뒤였다. 「보통 저녁에 오세요」 하고 알려 줬다.",
        "아샷추를 서비스로 주고 먼저 전화번호를 물었다 — 「우리 친구 해요!」",
      ],
    },
    {
      episode: "u13-pajeon",
      lines: ["번호를 주고받은 뒤, 마감하고 학습자에게 첫 문자를 보냈다(안부뿐)."],
    },
    {
      episode: "u16-umbrella-return",
      lines: [
        "카운터에서, 학습자가 창가 손님에게 우산을 돌려주고 둘이 저녁 먹으러 나가는 걸 지켜봤다. 대화에는 끼지 않았다.",
      ],
    },
    {
      episode: "u17-samgyeopsal",
      lines: [
        "문자로 한복 사진을 보내 달라고 했다가, 학습자가 부끄러워하자 자기 연습실 셀카를 먼저 보냈다.",
      ],
    },
  ],
  jaemin: [
    {
      episode: "u07-jaemin",
      lines: [
        "카페 창가에서 통화하다가, 자기 자리에 앉은 학습자에게 「아, 거기 제 자리예요」 했다. 「여행 오셨어요?」 「좋은 여행 되세요」. 맑은 날인데 창가에 검은 장우산이 있었다. 이름은 서로 몰랐다.",
      ],
    },
    {
      episode: "u08-umbrella",
      lines: [
        "저녁에 갑자기 폭우가 쏟아져 처마 밑에 선 학습자에게 「우산 없으시죠? 이거 쓰세요」 하고 우산을 넘겼다. 집이 가깝다며 가방을 머리에 얹고 뛰어갔다. 「천천히 주세요」, 보통 저녁에 카페에 온다고 했다.",
      ],
    },
    {
      episode: "u16-umbrella-return",
      lines: [
        "퇴근 시간 카페 창가에서 학습자에게 우산을 돌려받았다. 어제 학습자가 왔었다는 건 몰랐다(그날은 일찍 나갔다).",
        "먼저 「저녁 먹었어요?」 물었고 삼겹살을 먹으러 가자고 했다. 나서면서 처음 이름(서재민)을 말했고, 첫날 학습자가 아이스 아메리카노를 시킨 걸 지나가듯 기억했다.",
      ],
    },
    {
      episode: "u17-samgyeopsal",
      lines: [
        "종로 고깃집에서 학습자에게 처음 삼겹살을 구워 주고 쌈을 싸 줬다. 처음으로 사적인 걸 물었다 — 「근데 왜 혼자 여행 왔어요?」",
        "숙소 골목 입구까지 바래다주고 번호를 주고받았다. 「그럼 일요일에 한강 가요. 생각 있으면 연락 줘요.」",
      ],
      open: [
        {
          id: "hanriver-sunday",
          line: "일요일에 한강 가자는 말 — 약속이 아니라 열어 둔 말이다. 재촉하지 않는다",
        },
      ],
    },
  ],
};

/**
 * 메신저 비트 — 진도 구간이 걸린 작은 화제 · 약속(본편에 없는 작은 사실은 괜찮다, 사건 · 관계를 바꾸지 않는다). 화제 전환 씨앗으로
 * 페르소나 화제보다 먼저 쓰고(대화마다 한 번), `opener`면 선톡 소재로도 쓴다. `after`는 끝낸 에피소드(없으면 언제나), `until`을 끝내면 그만.
 */
export type Beat = {
  readonly id: string;
  readonly character: string;
  readonly after?: string;
  readonly until?: string;
  /** 꺼낼 화제(한국어 한 줄 — 답 모델에 씨앗으로 간다). */
  readonly seed: string;
  readonly opener?: boolean;
};

export const beats: readonly Beat[] = [
  {
    id: "duksu-quiz",
    character: "duksu",
    seed: "덕수쌤의 낱말 가족 퀴즈(소 + 고기 = 소고기처럼 낱말 붙이기)",
  },
  {
    id: "duksu-first-hello",
    character: "duksu",
    after: "u00-tutorial",
    until: "u03-mina",
    seed: "한국에 오는 비행기에서 처음 해 본 한국어 인사 — 떨렸는지",
    opener: true,
  },
  {
    id: "duksu-water",
    character: "duksu",
    after: "u01-water",
    until: "u05-baekban",
    seed: "편의점에서 혼자 물 사기 — 「봉투 필요 없어요」를 말해 봤는지",
    opener: true,
  },
  {
    id: "duksu-baekban",
    character: "duksu",
    after: "u05-baekban",
    until: "u09-subway",
    seed: "백반집 한 상 — 반찬 이름 하나씩 맞히기 퀴즈",
    opener: true,
  },
  {
    id: "duksu-subway",
    character: "duksu",
    after: "u09-subway",
    until: "u14-hanbok",
    seed: "지하철 안내 방송 「이번 역은 …입니다」 따라 하기",
    opener: true,
  },
  {
    id: "duksu-hanbok",
    character: "duksu",
    after: "u14-hanbok",
    seed: "한복 입으면 궁이 무료라는 상식 — 어느 궁이 제일 좋았는지",
    opener: true,
  },
  {
    id: "yk-house",
    character: "yoonkyung",
    after: "u02-checkin",
    seed: "게스트하우스 생활 — 방은 편한지, 와이파이(duruduru)는 잘 되는지",
  },
  {
    id: "yk-breakfast",
    character: "yoonkyung",
    after: "u02-checkin",
    seed: "아침은 먹었는지 — 공용 주방에 뭐가 있는지",
    opener: true,
  },
  {
    id: "yk-bindaetteok",
    character: "yoonkyung",
    after: "u13-pajeon",
    seed: "못 먹은 광장시장 빈대떡 — 다시 가 볼 건지, 가는 길",
    opener: true,
  },
  {
    id: "yk-photo",
    character: "yoonkyung",
    after: "u15-changdeokgung",
    seed: "옛날 한복 사진(눈 감고 찍힌 사진) 얘기",
  },
  {
    id: "yk-late",
    character: "yoonkyung",
    after: "u17-samgyeopsal",
    seed: "어젯밤 늦게 들어온 것 — 지나가듯 한마디만, 캐묻지 않는다",
    opener: true,
  },
  {
    id: "mina-yujin",
    character: "mina",
    after: "u03-mina",
    seed: "유진식당 후기 — 맛있었는지, 뭐 먹었는지",
    opener: true,
  },
  {
    id: "mina-palace-photo",
    character: "mina",
    after: "u15-changdeokgung",
    seed: "창덕궁 사진 — 미나가 눈 감아서 한 장 더 찍은 것",
  },
  {
    id: "doyun-ashatchu",
    character: "doyun",
    after: "u12-cafe-missed",
    seed: "서비스로 준 아샷추 맛 — 또 마시러 오라고",
    opener: true,
  },
  {
    id: "jaemin-ssam",
    character: "jaemin",
    after: "u17-samgyeopsal",
    seed: "처음 먹어 본 삼겹살과 쌈 — 다음엔 뭘 먹어 보고 싶은지",
  },
];
