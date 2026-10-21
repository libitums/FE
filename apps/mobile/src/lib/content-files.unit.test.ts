import { afterEach, describe, expect, test, vi } from "vitest";

import {
  contentFileUrl,
  contentFilesAvailable,
  downloadContentFile,
  downloadResultOf,
  localOrRemoteUrl,
} from "./content-files";

// `unit` 계층: 호스트 `ContentFileModule` 접점 — 모듈은 대역입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("content-files", () => {
  test("CF1. 모듈이 없으면 쓸 수 없고, 받기는 unavailable, 주소는 null이다", async () => {
    vi.stubGlobal("NativeModules", {});

    expect(contentFilesAvailable()).toBe(false);
    expect(await downloadContentFile("https://x/a.jpg", "images/a.jpg")).toEqual({
      status: "unavailable",
    });
    expect(contentFileUrl("images/a.jpg")).toBeNull();
  });

  test("CF2. 받기는 주소 · 경로를 넘기고 콜백 페이로드를 결과로 바꾼다", async () => {
    const download = vi.fn((_url: string, _path: string, callback: (p: unknown) => void) =>
      callback({ status: "http", code: "404" }),
    );
    vi.stubGlobal("NativeModules", { ContentFileModule: { download, fileUrl: () => "" } });

    expect(contentFilesAvailable()).toBe(true);
    expect(await downloadContentFile("https://x/a.jpg", "images/a.jpg")).toEqual({
      status: "http",
      code: 404,
    });
    expect(download).toHaveBeenCalledWith("https://x/a.jpg", "images/a.jpg", expect.any(Function));
  });

  test("CF3. 페이로드 — saved · network · invalid · io는 그대로, 모르는 모양은 io다", () => {
    expect(downloadResultOf({ status: "saved", bytes: "10" })).toEqual({ status: "saved" });
    expect(downloadResultOf({ status: "network" })).toEqual({ status: "network" });
    expect(downloadResultOf({ status: "invalid" })).toEqual({ status: "invalid" });
    expect(downloadResultOf({ status: "http", code: "x" })).toEqual({ status: "io" });
    expect(downloadResultOf({ status: "what" })).toEqual({ status: "io" });
    expect(downloadResultOf(null)).toEqual({ status: "io" });
  });

  test("CF4. 주소 — 빈 문자열 · 던짐은 null, 값이 있으면 그대로다", () => {
    const fileUrl = vi.fn((path: string) =>
      path === "images/a.jpg" ? "file:///c/images/a.jpg" : "",
    );
    vi.stubGlobal("NativeModules", { ContentFileModule: { download: vi.fn(), fileUrl } });

    expect(contentFileUrl("images/a.jpg")).toBe("file:///c/images/a.jpg");
    expect(contentFileUrl("images/b.jpg")).toBeNull();
    fileUrl.mockImplementation(() => {
      throw new Error("x");
    });
    expect(contentFileUrl("images/a.jpg")).toBeNull();
  });

  test("CF5. 받기 호출이 던지면 io로 거둔다", async () => {
    vi.stubGlobal("NativeModules", {
      ContentFileModule: {
        download: () => {
          throw new Error("x");
        },
        fileUrl: () => "",
      },
    });

    expect(await downloadContentFile("https://x/a.jpg", "images/a.jpg")).toEqual({ status: "io" });
  });
});

describe("localOrRemoteUrl", () => {
  test("CF6. 받아 둔 파일이 있으면 file 주소, 없으면 원격 주소다", () => {
    vi.stubGlobal("NativeModules", {
      ContentFileModule: {
        download: vi.fn(),
        fileUrl: (path: string) => (path === "images/a.jpg" ? "file:///c/images/a.jpg" : ""),
      },
    });
    const remote = (path: string) => `https://cdn.example/content/${path}`;

    expect(localOrRemoteUrl("images/a.jpg", remote)).toBe("file:///c/images/a.jpg");
    expect(localOrRemoteUrl("images/b.jpg", remote)).toBe(
      "https://cdn.example/content/images/b.jpg",
    );
  });

  test("CF7. 화면이 쓰는 경로(선두 `content/`)도 같은 파일을 찾고, 위험한 경로는 파일을 찾지 않는다", () => {
    const fileUrl = vi.fn((path: string) =>
      path === "images/a.jpg" ? "file:///c/images/a.jpg" : "",
    );
    vi.stubGlobal("NativeModules", { ContentFileModule: { download: vi.fn(), fileUrl } });
    const remote = () => null;

    expect(localOrRemoteUrl("content/images/a.jpg", remote)).toBe("file:///c/images/a.jpg");
    expect(localOrRemoteUrl("../x.jpg", remote)).toBeNull();
    expect(fileUrl).not.toHaveBeenCalledWith("../x.jpg");
  });

  type WithBundled = (
    path: string,
    remoteUrlOf: (path: string) => string | null,
    bundledUrlOf?: (relative: string) => string | null,
  ) => string | null;
  const resolveUrl = localOrRemoteUrl as unknown as WithBundled;

  test("BI3. 받아 둔 파일 > 내장 > 원격 순이고, 규칙 밖 경로는 파일 · 내장을 찾지 않고 원격 규칙에 맡긴다", () => {
    const fileUrl = vi.fn((path: string) =>
      path === "images/a.webp" ? "file:///c/images/a.webp" : "",
    );
    vi.stubGlobal("NativeModules", { ContentFileModule: { download: vi.fn(), fileUrl } });
    const remote = (path: string) => `https://cdn.example/${path}`;
    const bundled = vi.fn((relative: string) =>
      relative === "images/a.webp" || relative === "images/b.webp"
        ? `/static/image/${relative}`
        : null,
    );

    expect(resolveUrl("images/a.webp", remote, bundled)).toBe("file:///c/images/a.webp");
    expect(resolveUrl("content/images/b.webp", remote, bundled)).toBe(
      "/static/image/images/b.webp",
    );
    expect(resolveUrl("images/c.webp", remote, bundled)).toBe("https://cdn.example/images/c.webp");

    bundled.mockClear();
    expect(resolveUrl("../x.webp", remote, bundled)).toBe("https://cdn.example/../x.webp");
    expect(bundled).not.toHaveBeenCalled();
    expect(fileUrl).not.toHaveBeenCalledWith("../x.webp");
  });

  test("BI5. 셋째 인자를 주지 않으면 내장 조회 없이 지금 동작 그대로다", () => {
    vi.stubGlobal("NativeModules", {
      ContentFileModule: {
        download: vi.fn(),
        fileUrl: (path: string) => (path === "images/a.jpg" ? "file:///c/images/a.jpg" : ""),
      },
    });
    const remote = (path: string) => `https://cdn.example/${path}`;

    expect(resolveUrl("images/a.jpg", remote)).toBe("file:///c/images/a.jpg");
    expect(resolveUrl("images/b.jpg", remote)).toBe("https://cdn.example/images/b.jpg");
  });
});
