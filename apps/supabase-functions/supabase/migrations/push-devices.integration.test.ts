import { afterAll, beforeAll, expect, test } from "vitest";

import { fcmStoredTokenFrom } from "../functions/_shared/fcm.ts";
import { signIn, startTestDatabase } from "./postgres.test-support.ts";

const userId = "00000000-0000-4000-8000-000000000003";
let db: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  db = await startTestDatabase();
  await db.admin.query("insert into auth.users (id) values ($1)", [userId]);
}, 30_000);
afterAll(async () => {
  await db?.close();
});

test("기존 APNs와 Android FCM을 같은 RPC와 표에 등록한다", async () => {
  const user = await db.connect();
  await signIn(user, userId);
  const apns = "a".repeat(64);
  const fcm = fcmStoredTokenFrom("bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1")!;
  await user.query("select public.register_push_device($1, $2)", [apns, "production"]);
  await user.query("select public.register_push_device($1, $2)", [fcm, "fcm"]);
  const rows = await db.admin.query(
    "select token, environment from public.push_devices order by environment",
  );
  expect(rows.rows).toEqual([
    { token: fcm, environment: "fcm" },
    { token: apns, environment: "production" },
  ]);
  await expect(
    user.query("select public.register_push_device($1, $2)", [apns, "fcm"]),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    user.query("select public.register_push_device($1, $2)", [fcm, "sandbox"]),
  ).rejects.toMatchObject({ code: "23514" });
  await user.query("select public.unregister_push_device($1)", [fcm]);
  const remaining = await db.admin.query("select token from public.push_devices");
  expect(remaining.rows).toEqual([{ token: apns }]);
}, 30_000);
