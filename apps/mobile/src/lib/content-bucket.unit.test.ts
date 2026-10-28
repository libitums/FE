import { expect, test } from "vitest";

import { contentBucketFrom } from "./content-bucket";
import { contentBaseUrl } from "./episode-remote";

// `unit` 계층: 콘텐츠 버킷 고르기(ADR-0087 D3). 값이 없거나 규칙 밖이면 늘 운영 버킷입니다.

test("CB1. 값이 없거나 비었거나 문자열이 아니면 undefined라 기준 주소가 content다", () => {
  for (const value of [undefined, null, "", "   ", 1, {}]) {
    expect(contentBucketFrom(value)).toBeUndefined();
    expect(contentBaseUrl("https://x.supabase.co", contentBucketFrom(value))).toBe(
      "https://x.supabase.co/storage/v1/object/public/content/",
    );
  }
});

test("CB2. content-로 시작하는 소문자 이름만 받는다", () => {
  expect(contentBucketFrom("content-test")).toBe("content-test");
  expect(contentBucketFrom(" content-test ")).toBe("content-test");
  for (const value of ["content", "test", "Content-Test", "content-", "content/x", "../content"]) {
    expect(contentBucketFrom(value)).toBeUndefined();
  }
});

test("CB3. 기준 주소는 고른 버킷을 가리킨다", () => {
  expect(contentBaseUrl("https://x.supabase.co/", "content-test")).toBe(
    "https://x.supabase.co/storage/v1/object/public/content-test/",
  );
  expect(contentBaseUrl("https://x.supabase.co")).toBe(
    "https://x.supabase.co/storage/v1/object/public/content/",
  );
});
