import { expect, test } from "vitest";

import { romanize } from "./korean-romanize.ts";

// 국어의 로마자 표기법 — 소리 나는 대로. 친구 스토리의 로마자(ADR-0192 D8).
test("표기법의 보기", () => {
  const cases: [string, string][] = [
    ["구미", "gumi"],
    ["백암", "baegam"],
    ["합덕", "hapdeok"],
    ["월곶", "wolgot"],
    ["벚꽃", "beotkkot"],
    ["한밭", "hanbat"],
    ["구리", "guri"],
    ["설악", "seorak"],
    ["칠곡", "chilgok"],
    ["울릉", "ulleung"],
    ["백마", "baengma"],
    ["종로", "jongno"],
    ["왕십리", "wangsimni"],
    ["별내", "byeollae"],
    ["신라", "silla"],
    ["해돋이", "haedoji"],
    ["같이", "gachi"],
    ["굳히다", "guchida"],
    ["잡혀", "japyeo"],
    ["앉히다", "anchida"],
    ["읽혀요", "ilkyeoyo"],
    ["입학", "ipak"],
    ["읽고", "ilgo"],
    ["맑게", "malge"],
    ["읽기", "ilgi"],
    ["닭", "dak"],
    ["읽다", "ikda"],
    ["좋고", "joko"],
    ["놓다", "nota"],
    ["낳지", "nachi"],
    ["압구정", "apgujeong"],
    ["낙동강", "nakdonggang"],
    ["죽변", "jukbyeon"],
    ["울산", "ulsan"],
    ["독립문", "dongnimmun"],
  ];
  for (const [ko, roman] of cases) expect([ko, romanize(ko)]).toEqual([ko, roman]);
});

test("스토리에 나올 문장", () => {
  expect(romanize("점심은 김치찌개예요. 조금 매워요!")).toBe(
    "jeomsimeun gimchijjigaeyeyo. jogeum maewoyo!",
  );
  expect(romanize("광장시장에 왔어요. 사람이 정말 많아요!")).toBe(
    "gwangjangsijange wasseoyo. sarami jeongmal manayo!",
  );
  expect(romanize("맛있겠다! 저도 좋아해요.")).toBe("masitgetda! jeodo joahaeyo.");
  expect(romanize("붕어빵을 샀어요. 따뜻합니다.")).toBe(
    "bungeoppangeul sasseoyo. ttatteuthamnida.",
  );
  expect(romanize("달력 넘기니까 놀랍네요.")).toBe("dallyeok neomginikka nollamneyo.");
  expect(romanize("책을 읽어요. 싫어요? 괜찮아요.")).toBe(
    "chaegeul ilgeoyo. sireoyo? gwaenchanayo.",
  );
  expect(romanize("십이월이에요. 밖에 눈이 와요.")).toBe("sibiworieyo. bakke nuni wayo.");
  expect(romanize("축하해요! 못 해요. 못해요.")).toBe("chukahaeyo! mot haeyo. mothaeyo.");
  expect(romanize("예약했어요. 착해요. 따뜻해요.")).toBe("yeyakaesseoyo. chakaeyo. ttatteuthaeyo.");
  expect(romanize("책을 읽고 있어요. 하늘이 맑고 좋아요.")).toBe(
    "chaegeul ilgo isseoyo. haneuri malgo joayo.",
  );
});

test("규칙으로 알 수 없는 소리 — 자주 나오는 말은 표로", () => {
  expect(romanize("맛없어요. 겉옷을 입어요.")).toBe("madeopseoyo. geodoseul ibeoyo.");
  expect(romanize("서울역에 왔어요. 지하철역 앞이에요.")).toBe(
    "seoullyeoge wasseoyo. jihacheollyeok apieyo.",
  );
  expect(romanize("깻잎을 한입 먹었어요.")).toBe("kkaennipeul hannip meogeosseoyo.");
  expect(romanize("십이월 이십육일, 열여섯 살")).toBe("sibiwol isimnyugil, yeollyeoseot sal");
});

test("한글이 아닌 글자는 그대로 · 낱말 사이는 잇지 않는다", () => {
  expect(romanize("12월 1일, K-pop 좋아!")).toBe("12wol 1il, k-pop joa!");
  expect(romanize("옷 입어요")).toBe("ot ibeoyo");
  expect(romanize("")).toBe("");
  expect(romanize("앉았어요. ㅋㅋ ㅠㅠ ㅎㅎ")).toBe("anjasseoyo. kk yuyu hh");
  expect(romanize("ㄱㄴ")).toBe("ㄱㄴ");
});
