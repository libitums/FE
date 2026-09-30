import { afterEach, describe, expect, test, vi } from "vitest";

import {
  legalDocumentOpenedEvent,
  legalDocumentResultFrom,
  openLegalDocument,
} from "./legal-document";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("legalDocumentResultFrom", () => {
  test.each(["opened", "failed", "invalid-arguments"] as const)("LG1: %s는 그대로다", (status) => {
    expect(legalDocumentResultFrom({ status })).toEqual({ status });
  });

  test.each<[label: string, payload: unknown]>([
    ["null", null],
    ["undefined", undefined],
    ["문자열", "opened"],
    ["배열", [{ status: "opened" }]],
    ["모르는 status", { status: "closed" }],
    ["status 없음", {}],
  ])("LG2: %s는 malformed다", (_label, payload) => {
    expect(legalDocumentResultFrom(payload)).toEqual({ status: "malformed" });
  });
});

describe("openLegalDocument", () => {
  test("LG3: 모듈이 없으면 unavailable이고 콜백이 없다", () => {
    vi.stubGlobal("NativeModules", {});
    const onResult = vi.fn();

    expect(openLegalDocument("privacy-policy", onResult)).toBe("unavailable");
    expect(onResult).not.toHaveBeenCalled();
  });

  test("LG4: 문서 이름만 넘긴다 — 주소를 넘기지 않는다", () => {
    const open = vi.fn<
      (args: Record<string, unknown>, callback: (payload: unknown) => void) => void
    >((_args, callback) => callback({ status: "opened" }));
    vi.stubGlobal("NativeModules", { LegalDocumentModule: { open } });
    const onResult = vi.fn();

    expect(openLegalDocument("terms-of-use", onResult)).toBe("requested");
    expect(open.mock.calls[0]![0]).toStrictEqual({ document: "terms-of-use" });
    expect(onResult).toHaveBeenCalledWith({ status: "opened" });
  });

  test("LG5: 호출이 던지면 unavailable이고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {
      LegalDocumentModule: {
        open: () => {
          throw new Error("bridge");
        },
      },
    });

    expect(() => openLegalDocument("privacy-policy")).not.toThrow();
    expect(openLegalDocument("privacy-policy")).toBe("unavailable");
  });

  test("LG6: 결과 콜백 없이 불러도 된다", () => {
    vi.stubGlobal("NativeModules", {
      LegalDocumentModule: {
        open: (_args: unknown, callback: (payload: unknown) => void) =>
          callback({ status: "opened" }),
      },
    });

    expect(() => openLegalDocument("privacy-policy")).not.toThrow();
  });

  test("LG5b: 모듈은 있는데 open이 함수가 아니면 unavailable이고 콜백 0회", () => {
    vi.stubGlobal("NativeModules", { LegalDocumentModule: { open: "missing" } });
    const onResult = vi.fn<(result: unknown) => void>();

    expect(openLegalDocument("terms-of-use", onResult)).toBe("unavailable");
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("legalDocumentOpenedEvent", () => {
  test("LG7: 문서와 연 자리를 싣는다", () => {
    expect(legalDocumentOpenedEvent("privacy-policy", "login")).toStrictEqual({
      name: "legal_document_opened",
      document: "privacy-policy",
      source: "login",
    });
  });
});
