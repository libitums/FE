// 말하기 탐침 화면의 순수 로직 — 화면에 뜬 제시문과 인식기가 돌려준 문자열을
// **나란히 볼 수 있는 형태**로 만든다 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 이 모듈이 **정한 것**
// - 관찰 축을 둘로 본다: 공백을 어떻게 다룰지와 문장부호를 어떻게 다룰지.
// - 두 축의 조합을 후보로 삼고, 후보마다 제시문과 인식 결과를 같은 규칙으로
//   정규화해 **둘을 나란히** 내놓는다.
// - 인식기가 실제로 무엇을 싣고 오는지(양끝 공백·연속 공백·문장부호)를 세지 않고도
//   눈에 들어오도록 문자열의 모양을 따로 낸다.
//
// 이 모듈이 **미룬 것 — 판정 규칙 전부**
// 「맞았다/틀렸다」를 답하는 함수가 여기 없다. 통과 임계값도, 유사도 컷오프도,
// 어느 후보를 정본으로 쓸지도 없다. 탐침이 답하려는 물음이 *"SFSpeechRecognizer가
// 실제로 어떤 문자열을 주는가 — 공백·문장부호·띄어쓰기가 어떻게 돌아오는가"* 이고,
// **그 답을 실기에서 본 뒤에** 규칙을 정하기 때문이다. 지금 고르면 지어내는 것이 되고,
// 지어낸 규칙은 탐침의 관찰을 자기 쪽으로 물들인다 — 후보 하나를 정본으로 박아 두면
// 실기에서 보이는 것이 「인식기가 준 문자열」이 아니라 「그 규칙을 통과했는가」가 된다.
//
// 그래서 `identical`은 **판정이 아니라 관찰값**이다 — 그 후보를 적용했을 때 두 문자열이
// 문자 그대로 같은가일 뿐이다. 규칙을 정하는 다음 단위가 읽을 자리가 여기다.

// ---------------------------------------------------------------- 정규화 후보의 축

/**
 * 공백을 어떻게 다룰지. **사다리다 — 뒤 칸이 앞 칸을 포함한다.**
 *
 * 포함 관계로 둔 이유는 관찰을 읽기 위해서다. 칸끼리 겹치지 않게 쪼개면 「양끝은
 * 그대로 두고 안쪽만 줄인 것」 같은 조합이 후보에 끼어드는데, 인식기의 출력을 처음
 * 보는 자리에서 그런 칸은 읽는 사람에게 묻기만 하고 답을 주지 않는다.
 */
export type SpacingHandling = "keep" | "trim" | "collapse" | "remove";

/** 문장부호를 어떻게 다룰지. */
export type PunctuationHandling = "keep" | "remove";

/** 정규화 후보 하나 — 두 축의 값 한 쌍이다. */
export type SpeechNormalization = {
  readonly spacing: SpacingHandling;
  readonly punctuation: PunctuationHandling;
};

// 축의 값 목록. 순서가 화면에 그대로 나가므로 **약한 쪽에서 강한 쪽으로** 둔다 —
// 위에서 아래로 읽으면 무엇을 더 지웠을 때 두 문자열이 붙는지가 그 순서로 보인다.
const spacingHandlings: readonly SpacingHandling[] = ["keep", "trim", "collapse", "remove"];
const punctuationHandlings: readonly PunctuationHandling[] = ["keep", "remove"];

/**
 * 후보 전부. **축의 곱이라 목록을 손으로 적지 않는다** — 손으로 적으면 축에 값이
 * 하나 늘 때 목록과 축이 갈리고, 갈린 쪽은 화면에서만 보인다.
 *
 * 문장부호가 바깥이다. 실기에서 먼저 갈리는 것이 「인식기가 문장부호를 주는가」라,
 * 그 축으로 묶어 두면 두 덩이를 통째로 비교하게 된다.
 */
export const speechNormalizations: readonly SpeechNormalization[] = punctuationHandlings.flatMap(
  (punctuation) => spacingHandlings.map((spacing) => ({ spacing, punctuation })),
);

/** 후보를 가리키는 안정된 이름. 화면의 `data-testid`와 목록 키가 이것을 쓴다. */
export function speechNormalizationId(normalization: SpeechNormalization): string {
  return `spacing-${normalization.spacing}-punctuation-${normalization.punctuation}`;
}

// 축의 낱말 표. export하지 않는다 — 밖에서 필요한 것은 아래 라벨 함수 하나다.
const spacingLabel: Record<SpacingHandling, string> = {
  keep: "공백 그대로",
  trim: "양끝 공백 제거",
  collapse: "연속 공백 하나로",
  remove: "공백 전부 제거",
};

const punctuationLabel: Record<PunctuationHandling, string> = {
  keep: "문장부호 그대로",
  remove: "문장부호 제거",
};

/**
 * 후보를 사람이 읽을 한 줄로. 구분자는 가운뎃점 양옆 공백이다 — 이 저장소가 이미
 * 쓰는 모양이다.
 *
 * 화면이 문구를 짓지 않게 여기서 낸다. 라벨이 화면에 있으면 탐침을 손볼 때마다
 * 축의 이름이 조금씩 갈리고, 실기 기록에 적힌 이름과 코드의 이름이 달라진다.
 */
export function speechNormalizationLabel(normalization: SpeechNormalization): string {
  return `${punctuationLabel[normalization.punctuation]} · ${spacingLabel[normalization.spacing]}`;
}

// ---------------------------------------------------------------- 정규화

// 문장부호의 정의를 낱자 목록으로 적지 않고 **유니코드 구두점 범주 전체**에 맡긴다.
// 인식기가 무엇을 실어 올지 모르는 자리에서 목록을 적으면 그 목록이 곧 지어낸 규칙이
// 되고, 목록에 없는 글자는 「문장부호가 아닌 것」으로 조용히 남아 관찰을 비껴간다.
//
// ⚠ **이 자리를 `/\p{P}/gu`로 되돌리지 마라.** 호스트 번들을 PrimJS 바이트코드로 인코딩하는
// 단계가 유니코드 속성 이스케이프(`\p{...}`)를 받지 않는다. 그 문법이 번들에 들어가면
// `pnpm build`가 이렇게 죽는다:
//
//     Compile error: main-thread.js exception:
//     SyntaxError: invalid escape sequence in regular expression
//
// 리터럴을 피해 `new RegExp("\\p{P}", "gu")`로 만들어도 같다. 인코더와 실기 런타임이 같은
// 정규식 파서(`PrimJS/src/interpreter/quickjs/source/libregexp.cc`)이고, 그 파서에서 `\p`는
// `CONFIG_ALL_UNICODE` 아래에만 있는데 이 앱의 PrimJS는 `LYNX_SIMPLIFY=0`으로 빌드되어
// 그 블록이 꺼져 있다(`apps/ios/Pods/Target Support Files/PrimJS/PrimJS.release.xcconfig`).
// 인코딩만 피해 가면 실기에서 던지고, 그때 탐침은 관찰 대신 예외를 보여 준다.
//
// 그래서 **범주는 그대로 두고 문법만 바꿨다** — 아래는 유니코드 General_Category=P를
// 코드포인트 범위로 편 것이지 「우리가 떠올린 부호 몇 개」가 아니다. 범위는 손으로 적지
// 않고 유니코드 표에서 기계로 뽑았고, 같은 출처로 unit 테스트가 대조한다.
//
// **덮은 것**: BMP(U+0000~U+FFFF)의 General_Category=P 전부. 한국어 발화에서 올 만한 자리는
// 여기 다 있다 — ASCII 구두점, 일반 구두점(U+2000~206F: 말줄임표·따옴표·줄표), CJK 기호와
// 구두점(U+3000~303F: 、。《》「」), 가운뎃점(U+30FB), 세로쓰기 형태(U+FE10~FE6B),
// 전각·반각 형태(U+FF01~FF65: ，．？！·).
// **덮지 못한 것**: 보조 평면(U+10000 이상)의 구두점 — 쐐기문자·이집트 상형문자·아들람 등
// 역사·특수 문자에만 있는 부호다. `\p{P}`보다 딱 이만큼 덜 잡는다.
const punctuationRanges = [
  // ASCII 구두점
  "\\u0021-\\u0023\\u0025-\\u002A\\u002C-\\u002F\\u003A-\\u003B",
  "\\u003F-\\u0040\\u005B-\\u005D\\u005F\\u007B\\u007D",
  // 라틴1 보충 ~ 아랍 (거꾸로 물음표·아랍 쉼표 등)
  "\\u00A1\\u00A7\\u00AB\\u00B6-\\u00B7\\u00BB\\u00BF\\u037E",
  "\\u0387\\u055A-\\u055F\\u0589-\\u058A\\u05BE\\u05C0\\u05C3",
  "\\u05C6\\u05F3-\\u05F4\\u0609-\\u060A\\u060C-\\u060D\\u061B",
  "\\u061D-\\u061F\\u066A-\\u066D\\u06D4",
  // 시리아·인도계·티베트 (단다 등)
  "\\u0700-\\u070D\\u07F7-\\u07F9\\u0830-\\u083E\\u085E",
  "\\u0964-\\u0965\\u0970\\u09FD\\u0A76\\u0AF0\\u0C77\\u0C84",
  "\\u0DF4\\u0E4F\\u0E5A-\\u0E5B\\u0F04-\\u0F12\\u0F14",
  "\\u0F3A-\\u0F3D\\u0F85\\u0FD0-\\u0FD4\\u0FD9-\\u0FDA",
  // 미얀마·몽골·크메르·발리 등
  "\\u104A-\\u104F\\u10FB\\u1360-\\u1368\\u1400\\u166E",
  "\\u169B-\\u169C\\u16EB-\\u16ED\\u1735-\\u1736\\u17D4-\\u17D6",
  "\\u17D8-\\u17DA\\u1800-\\u180A\\u1944-\\u1945\\u1A1E-\\u1A1F",
  "\\u1AA0-\\u1AA6\\u1AA8-\\u1AAD\\u1B4E-\\u1B4F\\u1B5A-\\u1B60",
  "\\u1B7D-\\u1B7F\\u1BFC-\\u1BFF\\u1C3B-\\u1C3F\\u1C7E-\\u1C7F",
  "\\u1CC0-\\u1CC7\\u1CD3",
  // 일반 구두점 2000~206F (말줄임표·따옴표·줄표) 와 수학 괄호류·콥트·티피나그
  "\\u2010-\\u2027\\u2030-\\u2043\\u2045-\\u2051\\u2053-\\u205E",
  "\\u207D-\\u207E\\u208D-\\u208E\\u2308-\\u230B\\u2329-\\u232A",
  "\\u2768-\\u2775\\u27C5-\\u27C6\\u27E6-\\u27EF\\u2983-\\u2998",
  "\\u29D8-\\u29DB\\u29FC-\\u29FD\\u2CF9-\\u2CFC\\u2CFE-\\u2CFF",
  "\\u2D70",
  // 보충 구두점 2E00~2E5D
  "\\u2E00-\\u2E2E\\u2E30-\\u2E4F\\u2E52-\\u2E5D",
  // CJK 기호와 구두점 3000~303F (、。《》「」〜)
  "\\u3001-\\u3003\\u3008-\\u3011\\u3014-\\u301F\\u3030\\u303D",
  // 가타카나 30A0·30FB (가운뎃점)
  "\\u30A0\\u30FB",
  // 이·바이·참 등 음절문자 A4FE~ABEB 와 아랍 표현 형태 FD3E~FD3F
  "\\uA4FE-\\uA4FF\\uA60D-\\uA60F\\uA673\\uA67E\\uA6F2-\\uA6F7",
  "\\uA874-\\uA877\\uA8CE-\\uA8CF\\uA8F8-\\uA8FA\\uA8FC",
  "\\uA92E-\\uA92F\\uA95F\\uA9C1-\\uA9CD\\uA9DE-\\uA9DF",
  "\\uAA5C-\\uAA5F\\uAADE-\\uAADF\\uAAF0-\\uAAF1\\uABEB",
  "\\uFD3E-\\uFD3F",
  // CJK 호환 형태·작은 형태 FE10~FE6B (세로쓰기 구두점)
  "\\uFE10-\\uFE19\\uFE30-\\uFE52\\uFE54-\\uFE61\\uFE63\\uFE68",
  "\\uFE6A-\\uFE6B",
  // 반각/전각 형태 FF01~FF65 (전각 쉼표·마침표·반각 가운뎃점)
  "\\uFF01-\\uFF03\\uFF05-\\uFF0A\\uFF0C-\\uFF0F\\uFF1A-\\uFF1B",
  "\\uFF1F-\\uFF20\\uFF3B-\\uFF3D\\uFF3F\\uFF5B\\uFF5D",
  "\\uFF5F-\\uFF65",
].join("");

// 두 벌인 이유는 플래그뿐이다. `g`가 붙은 정규식은 `lastIndex`를 들고 다녀서 `test`에
// 쓰면 호출마다 다른 답을 낸다 — 지우는 쪽과 살펴보는 쪽을 갈라 둔다.
const punctuationPattern = new RegExp(`[${punctuationRanges}]`, "gu");
const punctuationProbe = new RegExp(`[${punctuationRanges}]`, "u");

// 공백도 같은 이유로 스페이스 하나가 아니라 유니코드 공백류 전체다.
const whitespacePattern = /\s+/gu;

function applySpacing(text: string, spacing: SpacingHandling): string {
  switch (spacing) {
    case "keep":
      return text;
    case "trim":
      return text.trim();
    case "collapse":
      // 사다리라 `trim`을 포함한다 — 양끝의 공백 덩이를 하나로 줄이면 양끝에 스페이스가
      // 하나 남는데, 그것이 남은 문자열은 사람이 화면에서 읽어 낼 수 없다.
      return text.replace(whitespacePattern, " ").trim();
    case "remove":
      return text.replace(whitespacePattern, "");
  }
}

/**
 * 후보 하나를 문자열에 적용한다. 제시문과 인식 결과가 **같은 함수**를 지난다 —
 * 둘이 서로 다른 경로로 정규화되면 화면에 나란히 놓인 두 줄을 비교할 수 없다.
 *
 * **문장부호를 먼저 지운다.** 순서가 결과를 가르기 때문이다: 공백을 먼저 다루면
 * `"안녕 , 세상"`에서 쉼표가 빠진 자리에 공백이 둘 남아 `collapse`가 그것을 못 본다.
 * 어느 쪽이 옳은지를 여기서 고른 것이 아니라, **두 벌이 되지 않게 한 자리에 고정**한
 * 것이다.
 *
 * 빈 문자열은 유효한 입력이다 — 어느 후보를 지나도 빈 문자열이고, 그 자체가 실기에서
 * 볼 만한 관찰이다(인식기가 돌았는데 관측이 0건인 것).
 */
export function normalizeSpeechText(text: string, normalization: SpeechNormalization): string {
  const withoutPunctuation =
    normalization.punctuation === "remove" ? text.replace(punctuationPattern, "") : text;

  return applySpacing(withoutPunctuation, normalization.spacing);
}

// ---------------------------------------------------------------- 문자열의 모양

/**
 * 인식기가 실어 온 문자열의 모양. **세는 값과 있고 없음만** 담는다 — 여기서 무엇을
 * 해야 하는지는 말하지 않는다.
 *
 * 정규화 후보를 나란히 보는 것만으로는 답이 안 나오는 물음이 있어서 따로 둔다:
 * 어느 후보에서 두 줄이 붙었다는 것은 「무엇을 지우면 붙는가」를 말할 뿐이고,
 * 「인식기가 애초에 무엇을 실어 왔는가」는 말하지 않는다. 뒤엣것이 탐침의 물음이다.
 */
export type SpeechTextShape = {
  readonly length: number;
  /** 공백 문자의 수. 덩이가 아니라 글자로 센다. */
  readonly whitespaceCount: number;
  /** 양끝 중 한 쪽이라도 공백으로 시작하거나 끝나는가 — `trim`이 일을 하는가. */
  readonly hasEdgeWhitespace: boolean;
  /** 공백이 둘 이상 붙어 있는 자리가 있는가 — `collapse`가 일을 하는가. */
  readonly hasRepeatedWhitespace: boolean;
  /** 나타난 문장부호를 **나타난 순서대로, 중복 없이**. 비어 있으면 인식기가 안 준 것이다. */
  readonly punctuation: readonly string[];
};

export function speechTextShape(text: string): SpeechTextShape {
  const characters = [...text];
  const whitespace = characters.filter((character) => /\s/u.test(character));
  const punctuation = characters.filter((character) => punctuationProbe.test(character));

  return {
    length: characters.length,
    whitespaceCount: whitespace.length,
    hasEdgeWhitespace: text !== text.trim(),
    hasRepeatedWhitespace: /\s\s/u.test(text),
    // 중복을 접는 것은 화면이 읽을 것이 「어떤 부호가 왔나」이지 「몇 번 왔나」가
    // 아니기 때문이다. 횟수가 필요해지면 그때 축을 연다.
    punctuation: [...new Set(punctuation)],
  };
}

// ---------------------------------------------------------------- 나란히 보기

/** 후보 하나에서 제시문과 인식 결과가 어떻게 보이는지. */
export type SpeechComparison = {
  readonly normalization: SpeechNormalization;
  /** `speechNormalizationId`가 낸 이름. 행 키와 `data-testid`가 이것을 쓴다. */
  readonly id: string;
  /** 후보를 적용한 제시문. */
  readonly prompt: string;
  /** 후보를 적용한 인식 결과. */
  readonly recognized: string;
  /**
   * 위 두 문자열이 **문자 그대로** 같은가. ⭐ 판정이 아니다 — 「이 후보에서는 둘이
   * 붙는다」는 관찰일 뿐이고, 어느 후보를 정답의 기준으로 삼을지는 이 단위가 정하지
   * 않는다.
   *
   * 둘 다 빈 문자열이면 참이 된다. 인식기가 아무것도 못 알아들은 것과 제시문이 비어
   * 있는 것이 이 값에서는 같아 보이는데, **접어서 감추지 않는다** — 그 자리를 무엇으로
   * 가를지도 실기를 보고 정할 일이라, 여기서 예외를 두면 관찰이 아니라 이미 규칙이다.
   * 무엇이 들어왔는지는 `speechTextShape`가 따로 말한다.
   */
  readonly identical: boolean;
};

/**
 * 후보 전부에 대해 제시문과 인식 결과를 나란히 낸다. 순서는 `speechNormalizations`
 * 그대로다.
 *
 * 화면이 후보를 골라 오게 두지 않는다 — 고르는 순간 그 화면이 규칙을 정한 것이 되고,
 * 실기에서 보이는 것이 인식기의 출력이 아니라 그 선택이 된다.
 */
export function speechComparisons(prompt: string, recognized: string): readonly SpeechComparison[] {
  return speechNormalizations.map((normalization) => {
    const normalizedPrompt = normalizeSpeechText(prompt, normalization);
    const normalizedRecognized = normalizeSpeechText(recognized, normalization);

    return {
      normalization,
      id: speechNormalizationId(normalization),
      prompt: normalizedPrompt,
      recognized: normalizedRecognized,
      identical: normalizedPrompt === normalizedRecognized,
    };
  });
}
