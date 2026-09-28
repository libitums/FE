import { afterEach, expect, test, vi } from "vitest";

import { supabaseConfig, supabaseConfigFrom } from "./supabase-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("SC1. url·anonKey가 형식을 지키면 그대로 담는다", () => {
  expect(supabaseConfigFrom("https://abc.supabase.co", "anon")).toEqual({
    url: "https://abc.supabase.co",
    anonKey: "anon",
  });
});

test("SC2. url 끝의 슬래시를 전부 뗀다", () => {
  expect(supabaseConfigFrom("https://abc.supabase.co//", "anon")).toEqual({
    url: "https://abc.supabase.co",
    anonKey: "anon",
  });
});

test("SC3. null이 되는 입력 다섯 — http(s 아님) · url 빈 값 · key 공백 · key sb_secret_ 접두 · 문자열 아님", () => {
  expect(supabaseConfigFrom("http://abc.supabase.co", "anon")).toBeNull();
  expect(supabaseConfigFrom("", "anon")).toBeNull();
  expect(supabaseConfigFrom("https://abc.supabase.co", "  ")).toBeNull();
  expect(supabaseConfigFrom("https://abc.supabase.co", "sb_secret_x")).toBeNull();
  expect(supabaseConfigFrom(undefined, "anon")).toBeNull();
});

test("SC4. supabaseConfig()가 환경 변수를 호출마다 읽는다 — 두 번 바꿔 두 번 다르게 나온다", () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://first.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "first-anon");

  const first = supabaseConfig();

  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://second.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "second-anon");

  const second = supabaseConfig();

  expect(first).toEqual({ url: "https://first.supabase.co", anonKey: "first-anon" });
  expect(second).toEqual({ url: "https://second.supabase.co", anonKey: "second-anon" });
  expect(second).not.toEqual(first);
});
