import { describe, expect, test } from "vitest";
import {
  admobSsvEnvFrom,
  createAdmobKeys,
  parseAdmobSsvQuery,
  verifyAdmobSignature,
} from "./admob-ssv.ts";
import { keysJson, signedQuery, testSigner } from "./admob-ssv.test-support.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// AdMob SSV 콜백(ADR-0209) — 쿼리 읽기 · 서명 확인 · 공개키 캐시 · 환경 값.
const user = "00000000-0000-4000-8000-0000000000a1";
const request = "11111111-1111-4111-8111-111111111111";

describe("AS-U1 쿼리 읽기", () => {
  test("Google 순서의 쿼리에서 값을 읽고 서명 대상은 signature 앞까지", async () => {
    const { sign } = await testSigner();
    const raw = await signedQuery(sign, { customData: request, userId: user });
    const parsed = parseAdmobSsvQuery(raw);
    expect(parsed).toMatchObject({
      adUnit: "1234567890",
      customData: request,
      keyId: "3335741209",
      transactionId: "tx-0001",
      userId: user,
    });
    expect(parsed?.signedContent).toBe(raw.slice(0, raw.indexOf("&signature=")));
  });

  test("값은 URL 디코딩한다(서명 대상은 받은 글자 그대로)", () => {
    const parsed = parseAdmobSsvQuery(
      "ad_unit=a%2Fb&custom_data=x&transaction_id=t%20" + "1&user_id=u&signature=AAAA&key_id=1",
    );
    expect(parsed).toMatchObject({ adUnit: "a/b", transactionId: "t 1" });
    expect(parsed?.signedContent).toBe(
      "ad_unit=a%2Fb&custom_data=x&transaction_id=t%201&user_id=u",
    );
  });

  test("서명 · key_id가 끝 둘이 아니거나 필수 값이 비면 null", () => {
    expect(parseAdmobSsvQuery("")).toBeNull();
    // signature 뒤에 다른 값이 끼어들면(순서가 어긋남) 받지 않는다.
    expect(
      parseAdmobSsvQuery("ad_unit=1&transaction_id=t&custom_data=c&user_id=u&signature=A&x=1"),
    ).toBeNull();
    expect(parseAdmobSsvQuery("ad_unit=1&transaction_id=t&custom_data=c&user_id=u")).toBeNull();
    expect(
      parseAdmobSsvQuery("ad_unit=1&transaction_id=t&custom_data=c&user_id=u&key_id=1&signature=A"),
    ).toBeNull();
    expect(parseAdmobSsvQuery("ad_unit=1&custom_data=c&user_id=u&signature=A&key_id=1")).toBeNull();
    expect(
      parseAdmobSsvQuery("ad_unit=1&transaction_id=t&user_id=u&signature=A&key_id=1"),
    ).toBeNull();
    expect(
      parseAdmobSsvQuery("ad_unit=1&transaction_id=t&custom_data=c&signature=A&key_id=1"),
    ).toBeNull();
    expect(
      parseAdmobSsvQuery("ad_unit=1&transaction_id=t&custom_data=c&user_id=u&signature=&key_id=1"),
    ).toBeNull();
  });
});

describe("AS-U2 서명 확인", () => {
  test("맞는 키 · 맞는 원문이면 true", async () => {
    const { sign, publicKeyBase64 } = await testSigner();
    const parsed = parseAdmobSsvQuery(
      await signedQuery(sign, { customData: request, userId: user }),
    );
    expect(
      await verifyAdmobSignature(parsed!.signedContent, parsed!.signature, publicKeyBase64),
    ).toBe(true);
  });

  test("원문을 바꾸면(위조) false", async () => {
    const { sign, publicKeyBase64 } = await testSigner();
    const raw = await signedQuery(sign, { customData: request, userId: user }, (content) =>
      content.replace(user, "00000000-0000-4000-8000-0000000000b2"),
    );
    const parsed = parseAdmobSsvQuery(raw)!;
    expect(
      await verifyAdmobSignature(parsed.signedContent, parsed.signature, publicKeyBase64),
    ).toBe(false);
  });

  test("다른 키 · 깨진 서명 · 깨진 키는 false — 던지지 않는다", async () => {
    const a = await testSigner();
    const b = await testSigner();
    const parsed = parseAdmobSsvQuery(
      await signedQuery(a.sign, { customData: request, userId: user }),
    )!;
    expect(
      await verifyAdmobSignature(parsed.signedContent, parsed.signature, b.publicKeyBase64),
    ).toBe(false);
    expect(await verifyAdmobSignature(parsed.signedContent, "!!!", a.publicKeyBase64)).toBe(false);
    expect(await verifyAdmobSignature(parsed.signedContent, "MAA", a.publicKeyBase64)).toBe(false);
    expect(await verifyAdmobSignature(parsed.signedContent, parsed.signature, "AAAA")).toBe(false);
  });
});

describe("AS-U3 공개키 캐시", () => {
  function fakeKeys(bodies: string[], status = 200) {
    const calls: OutboundRequest[] = [];
    let now = 0;
    const keys = createAdmobKeys({
      outbound: async (call) => {
        calls.push(call);
        return { status, text: async () => bodies[Math.min(calls.length - 1, bodies.length - 1)]! };
      },
      nowMs: () => now,
      ttlMs: 1000,
      minReloadMs: 0,
    });
    return { keys, calls, advance: (ms: number) => (now += ms) };
  }

  test("목록을 한 번 읽어 key_id로 찾고, 시간 안에는 다시 읽지 않는다", async () => {
    const { keys, calls } = fakeKeys([keysJson("7", "KEY7")]);
    expect(await keys.keyFor("7")).toBe("KEY7");
    expect(await keys.keyFor("7")).toBe("KEY7");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "GET",
      url: "https://www.gstatic.com/admob/reward/verifier-keys.json",
    });
  });

  test("모르는 key_id면 한 번 다시 읽고(키 교체), 그래도 없으면 null", async () => {
    const { keys, calls } = fakeKeys([keysJson("7", "KEY7"), keysJson("8", "KEY8")]);
    expect(await keys.keyFor("7")).toBe("KEY7");
    expect(await keys.keyFor("8")).toBe("KEY8");
    expect(await keys.keyFor("9")).toBeNull();
    expect(calls).toHaveLength(3);
  });

  test("모르는 key_id로 다시 읽기는 최소 간격을 지킨다", async () => {
    let now = 0;
    const calls: OutboundRequest[] = [];
    const keys = createAdmobKeys({
      outbound: async (call) => {
        calls.push(call);
        return { status: 200, text: async () => keysJson("7", "KEY7") };
      },
      nowMs: () => now,
    });
    await keys.keyFor("7");
    expect(await keys.keyFor("9")).toBeNull();
    expect(calls).toHaveLength(1);
    now += 60_000;
    expect(await keys.keyFor("9")).toBeNull();
    expect(calls).toHaveLength(2);
  });

  test("시간이 지나면 다시 읽는다", async () => {
    const { keys, calls, advance } = fakeKeys([keysJson("7", "KEY7")]);
    await keys.keyFor("7");
    advance(1001);
    await keys.keyFor("7");
    expect(calls).toHaveLength(2);
  });

  test("다시 읽기가 실패하면 낡은 키를 쓰고, 겹친 첫 읽기는 하나로 합친다", async () => {
    let now = 0;
    let fail = false;
    const calls: OutboundRequest[] = [];
    const keys = createAdmobKeys({
      outbound: async (call) => {
        calls.push(call);
        return fail
          ? { status: 503, text: async () => "" }
          : { status: 200, text: async () => keysJson("7", "KEY7") };
      },
      nowMs: () => now,
      ttlMs: 1000,
    });
    expect(await Promise.all([keys.keyFor("7"), keys.keyFor("7")])).toEqual(["KEY7", "KEY7"]);
    expect(calls).toHaveLength(1);
    fail = true;
    now += 2000;
    expect(await keys.keyFor("7")).toBe("KEY7");
  });

  test("목록을 못 읽으면(상태 · 모양) 거부한다", async () => {
    await expect(fakeKeys(["{}"], 500).keys.keyFor("7")).rejects.toThrow(/admob keys: 500/);
    await expect(fakeKeys(["not json"]).keys.keyFor("7")).rejects.toThrow(/JSON/);
    await expect(fakeKeys(['{"keys":"x"}']).keys.keyFor("7")).rejects.toThrow(/bad shape/);
  });
});

describe("AS-U4 환경 값", () => {
  const read = (values: Record<string, string>) => (name: string) => values[name];
  const full = {
    SUPABASE_URL: "https://db.example/",
    SUPABASE_SERVICE_ROLE_KEY: " sb_secret_x ",
    ADMOB_AD_UNIT_IDS: " 111 , 222 ,",
  };
  test("셋을 읽고 끝 / · 공백을 걷는다. 광고 단위 목록은 쉼표로", () => {
    expect(admobSsvEnvFrom(read(full))).toEqual({
      supabaseUrl: "https://db.example",
      supabaseServiceRoleKey: "sb_secret_x",
      adUnitIds: ["111", "222"],
    });
  });
  test("하나라도 없거나(광고 단위 목록 포함) https가 아니면 null", () => {
    expect(admobSsvEnvFrom(read({ SUPABASE_URL: "https://db.example" }))).toBeNull();
    expect(admobSsvEnvFrom(read({ ...full, ADMOB_AD_UNIT_IDS: " , " }))).toBeNull();
    expect(admobSsvEnvFrom(read({ ...full, SUPABASE_URL: "http://kong:8000" }))).toBeNull();
  });
});
