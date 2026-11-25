import { describe, expect, test } from "vitest";

import { editorShareOf, photoEditorCaps, type EditorSticker } from "./my-story-editor";
import {
  photoLineOf,
  photoPickResultOf,
  photoUploadOf,
  storyPhotoObjectPath,
} from "./my-story-photo";
import { myStoriesFrom, myStoryPostFrom } from "./my-stories-parse";
import { wordChoice } from "./my-stories.test-support";

// `unit` 계층(MSP-U1 ~ U7, ADR-0199): 내 스토리 사진 — 호스트 콜백 · 업로드 결과 · 버킷 경로 · 올릴 한 줄 · 편집 판정 · 서버 응답 풀기.

const UID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const sticker = (id: string, ko: string): EditorSticker => ({
  id,
  choice: wordChoice(id, ko),
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
});
const text = (ko: string) => ({
  ko,
  color: "white" as const,
  x: 0.5,
  y: 0.3,
  scale: 1,
  rotation: 0,
});

describe("MSP-U1 호스트 고르기 콜백", () => {
  test("picked — 문자열 값을 수로 풀고, 칸이 틀리면 failed", () => {
    expect(
      photoPickResultOf({
        status: "picked",
        url: "file:///c/story-photos/a.jpg",
        path: "/c/story-photos/a.jpg",
        width: "1600",
        height: "1200",
      }),
    ).toEqual({
      status: "picked",
      photo: {
        url: "file:///c/story-photos/a.jpg",
        path: "/c/story-photos/a.jpg",
        width: 1600,
        height: 1200,
      },
    });
    expect(
      photoPickResultOf({ status: "picked", url: "", path: "/a.jpg", width: "1", height: "1" }),
    ).toEqual({
      status: "failed",
    });
    expect(
      photoPickResultOf({
        status: "picked",
        url: "file:///a.jpg",
        path: "/a.jpg",
        width: "x",
        height: "1",
      }),
    ).toEqual({
      status: "failed",
    });
  });
  test("cancelled · denied · unavailable는 그대로, busy · invalid · 모르는 값 · 모양 틀림은 failed", () => {
    for (const status of ["cancelled", "denied", "unavailable"] as const)
      expect(photoPickResultOf({ status })).toEqual({ status });
    for (const payload of [
      { status: "busy" },
      { status: "invalid" },
      { status: "x" },
      null,
      "picked",
    ])
      expect(photoPickResultOf(payload)).toEqual({ status: "failed" });
  });
});

describe("MSP-U2 업로드 결과", () => {
  test("2xx와 이미 있음(409 · 400 Duplicate)은 uploaded, 그 밖은 failed", () => {
    expect(photoUploadOf({ status: "http", code: "200", body: "{}" })).toBe("uploaded");
    expect(photoUploadOf({ status: "http", code: "409", body: "" })).toBe("uploaded");
    expect(
      photoUploadOf({
        status: "http",
        code: "400",
        body: '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}',
      }),
    ).toBe("uploaded");
    expect(
      photoUploadOf({
        status: "http",
        code: "403",
        body: "new row violates row-level security policy",
      }),
    ).toBe("failed");
    expect(photoUploadOf({ status: "http", code: "400", body: "bad" })).toBe("failed");
    expect(photoUploadOf({ status: "network" })).toBe("failed");
    expect(photoUploadOf({ status: "missing" })).toBe("failed");
    expect(photoUploadOf(undefined)).toBe("failed");
  });
});

describe("MSP-U3 버킷 경로", () => {
  test("<user_id>/<파일 이름> — 서버 정규식에 맞을 때만", () => {
    expect(storyPhotoObjectPath(UID, "/var/c/story-photos/ab12-cd.jpg")).toBe(`${UID}/ab12-cd.jpg`);
    expect(storyPhotoObjectPath(UID, "C:\\x\\a.jpg")).toBeNull();
    expect(storyPhotoObjectPath(UID, "/c/.hidden.jpg")).toBeNull();
    expect(storyPhotoObjectPath(UID, "/c/사진.jpg")).toBeNull();
    expect(storyPhotoObjectPath("not-a-user", "/c/a.jpg")).toBeNull();
    expect(storyPhotoObjectPath(UID, `/c/${"a".repeat(121)}`)).toBeNull();
    expect(storyPhotoObjectPath(UID, "/c/")).toBeNull();
  });
});

describe("MSP-U4 올릴 한 줄", () => {
  test("글 상자 → 첫 스티커 한국어 → null", () => {
    expect(photoLineOf(text("서울 도착!"), [sticker("a", "창가 자리")])).toBe("서울 도착!");
    expect(photoLineOf(null, [sticker("a", "창가 자리"), sticker("b", "도착하다")])).toBe(
      "창가 자리",
    );
    expect(photoLineOf(null, [])).toBeNull();
  });
});

describe("MSP-U5 사진 위 편집 판정", () => {
  test("사진 편집은 Aa · 얹기 여덟, 한 줄이 없으면 Share 꺼짐, 있으면 사진 올리기(글 상자 먼저)", () => {
    expect(photoEditorCaps).toEqual({
      text: true,
      word: true,
      wordRpc: false,
      photo: true,
      maxStickers: 8,
    });
    expect(editorShareOf("orange", [], null, photoEditorCaps, true)).toBeNull();
    const one = editorShareOf("orange", [sticker("a", "창가 자리")], null, photoEditorCaps, true);
    expect(one).toEqual({
      kind: "photo",
      ko: "창가 자리",
      text: null,
      overlays: [expect.objectContaining({ kind: "word", ko: "창가 자리" })],
    });
    const both = editorShareOf(
      "orange",
      [sticker("a", "창가 자리")],
      text("서울 도착!"),
      photoEditorCaps,
      true,
    );
    expect(both?.kind).toBe("photo");
    expect(both && "ko" in both ? both.ko : null).toBe("서울 도착!");
    expect(both?.kind === "photo" ? both.overlays.map((o) => o.kind) : []).toEqual([
      "text",
      "word",
    ]);
  });
});

describe("MSP-U6 사진 스토리 읽기", () => {
  test("사진 · 확인 중 스토리를 읽는다 — status · imagePath · 뜻 빈 글 허용", () => {
    const state = myStoriesFrom(
      JSON.stringify({
        enabled: true,
        keep: true,
        kinds: ["text", "photo"],
        stories: [
          {
            id: "p1",
            kind: "photo",
            status: "checking",
            word: null,
            ko: "서울 도착!",
            roman: "seoul dochak",
            meaning: "",
            example: null,
            imagePath: `${UID}/a.jpg`,
            overlays: [{ kind: "word", ko: "창가 자리", x: 0.4, y: 0.5, scale: 1, rotation: -4 }],
            postedAt: "2026-11-25T01:00:00Z",
            expiresAt: "2026-11-26T01:00:00Z",
            reactions: [],
          },
          {
            id: "p2",
            kind: "photo",
            word: null,
            ko: "x",
            roman: "",
            meaning: "",
            example: null,
            imagePath: null,
            postedAt: "2026-11-25T01:00:00Z",
            expiresAt: "2026-11-26T01:00:00Z",
            reactions: [],
          },
        ],
      }),
    );
    expect(state?.kinds).toEqual(["text", "photo"]);
    expect(state?.stories).toHaveLength(1);
    expect(state?.stories[0]).toMatchObject({
      kind: "photo",
      status: "checking",
      imagePath: `${UID}/a.jpg`,
      ko: "서울 도착!",
      meaning: "",
      overlays: [expect.objectContaining({ ko: "창가 자리" })],
    });
  });
});

describe("MSP-U7 사진 올리기 결과", () => {
  test("rejected(+ rejection) · check_limit · age → off · no_photo → upload_failed · invalid(#598)", () => {
    expect(
      myStoryPostFrom(
        JSON.stringify({ result: "rejected", rejection: { id: "r-1", category: "nudity" } }),
      ),
    ).toEqual({ result: "rejected", rejection: { id: "r-1", category: "nudity" } });
    expect(myStoryPostFrom(JSON.stringify({ result: "rejected", rejection: null }))).toEqual({
      result: "rejected",
      rejection: null,
    });
    expect(myStoryPostFrom(JSON.stringify({ result: "check_limit" }))).toEqual({
      result: "check_limit",
    });
    expect(myStoryPostFrom(JSON.stringify({ result: "age" }))).toEqual({ result: "off" });
    expect(myStoryPostFrom(JSON.stringify({ result: "no_photo" }))).toEqual({
      result: "upload_failed",
    });
    expect(myStoryPostFrom(JSON.stringify({ result: "invalid" }))).toEqual({ result: "invalid" });
  });
});
