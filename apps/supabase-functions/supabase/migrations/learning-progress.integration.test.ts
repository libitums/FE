import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { load, save, signIn, startTestDatabase } from "./postgres.test-support";

const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";
const empty = {
  version: 1,
  completedStepCount: 0,
  completedEpisodeIntroIds: [] as string[],
  completedMessengerUnitIds: [] as string[],
  completedPhoneCallUnitIds: [] as string[],
  visualNovel: { status: "active", beatIndex: 0 },
  completedEpisodeFinalIds: [] as string[],
};
const first = {
  ...empty,
  completedStepCount: 3,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  visualNovel: { status: "active", beatIndex: 1 },
};
const second = {
  ...empty,
  completedStepCount: 2,
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  completedEpisodeFinalIds: ["tutorial-final-test"],
  visualNovel: { status: "completed", beatIndex: 2 },
};
const merged = {
  ...first,
  completedPhoneCallUnitIds: second.completedPhoneCallUnitIds,
  completedEpisodeFinalIds: second.completedEpisodeFinalIds,
  visualNovel: second.visualNovel,
};
let db: Awaited<ReturnType<typeof startTestDatabase>>;
let writerA: Awaited<ReturnType<typeof db.connect>>;
let writerB: typeof writerA;

beforeAll(async () => {
  db = await startTestDatabase();
  writerA = await db.connect();
  writerB = await db.connect();
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await writerA.query("rollback");
  await writerB.query("rollback");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);
  await signIn(writerA, userA);
  await signIn(writerB, userA);
});

test("이전 스냅숏이 늦게 도착해도 모든 진행 필드가 뒤로 가지 않는다", async () => {
  await save(writerA, merged);
  await save(writerB, empty);
  expect(await load(writerA)).toEqual(merged);
});

test.each([
  [first, second],
  [second, first],
])("서로 다른 활동은 저장 순서와 관계없이 합쳐지고 재전송은 멱등이다", async (a, b) => {
  await save(writerA, a);
  await save(writerB, b);
  await save(writerA, a);
  expect(await load(writerB)).toEqual(merged);
});

test.each([
  [false, first, second],
  [false, second, first],
  [true, first, second],
  [true, second, first],
] as const)(
  "동시 저장: 기존 행 %s, 첫 요청이 커밋된 최신 행에 두 번째 진행을 합친다",
  async (existing, a, b) => {
    if (existing) await save(writerA, empty);
    const pid = (await writerB.query("select pg_backend_pid() as pid")).rows[0].pid;
    await writerA.query("begin");
    await save(writerA, a);
    const blockedSave = save(writerB, b);
    try {
      // 별도 연결의 실제 Lock 대기를 확인하므로 두 순차 요청을 동시성 테스트로 세지 않습니다.
      await vi.waitFor(
        async () => {
          const result = await db.admin.query(
            "select wait_event_type from pg_stat_activity where pid = $1",
            [pid],
          );
          expect(result.rows[0].wait_event_type).toBe("Lock");
        },
        { timeout: 3_000 },
      );
    } finally {
      await writerA.query("commit");
      await blockedSave;
    }
    expect(await load(writerB)).toEqual(merged);
  },
);

test("알 수 없는 유닛 ID도 보존하고 완료 목록의 중복을 제거한다", async () => {
  const snapshot = {
    ...first,
    completedEpisodeIntroIds: ["future-intro", "tutorial-intro", "future-intro"],
  };
  await save(writerA, snapshot);
  await save(writerB, first);
  expect(await load(writerA)).toEqual({
    ...first,
    completedEpisodeIntroIds: ["future-intro", "tutorial-intro"],
  });
});

test("활성 장면은 큰 인덱스를 유지하며 완료 상태를 이전 활성 상태로 되돌리지 않는다", async () => {
  await save(writerA, first);
  await save(writerB, empty);
  expect(await load(writerA)).toEqual(first);
  await save(writerB, second);
  await save(writerA, first);
  expect(await load(writerA)).toEqual(merged);
});

test.each(
  [
    null,
    {},
    [],
    { ...empty, version: 2 },
    { ...empty, version: "1" },
    { ...empty, completedStepCount: -1 },
    { ...empty, completedStepCount: 0.5 },
    { ...empty, completedStepCount: "2" },
    { ...empty, completedStepCount: null },
    { ...empty, completedEpisodeIntroIds: null },
    { ...empty, completedMessengerUnitIds: [1] },
    { ...empty, completedPhoneCallUnitIds: [null] },
    { ...empty, completedEpisodeFinalIds: [{}] },
    { ...empty, visualNovel: null },
    { ...empty, visualNovel: { status: "active", beatIndex: 2 } },
    { ...empty, visualNovel: { status: "completed", beatIndex: 0 } },
  ].map((snapshot) => [snapshot]),
)("잘못된 입력은 기존 진행을 바꾸지 않는다: %j", async (snapshot) => {
  await save(writerA, first);
  await expect(save(writerB, snapshot)).rejects.toMatchObject({ code: "22023" });
  expect(await load(writerA)).toEqual(first);
});

test("다른 스냅숏 버전이 이미 저장돼 있으면 덮어쓰지 않고 실패한다", async () => {
  const future = { ...merged, version: 2 };
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    userA,
    future,
  ]);
  await expect(save(writerA, empty)).rejects.toMatchObject({ code: "22023" });
  expect(await load(writerA)).toEqual(future);
});

test("사용자별로 격리하며 계정 삭제는 저장된 진행을 함께 지운다", async () => {
  await save(writerA, first);
  await signIn(writerB, userB);
  expect(await load(writerB)).toBeNull();
  await save(writerB, second);
  expect(await load(writerA)).toEqual(first);
  expect(await load(writerB)).toEqual(second);
  await db.admin.query("delete from auth.users where id = $1", [userA]);
  expect(await load(writerA)).toBeNull();
  expect(await load(writerB)).toEqual(second);
});

test("비로그인·직접 표 접근·내부 합치기 함수 호출 권한을 허용하지 않는다", async () => {
  await writerA.query("set role anon");
  await expect(save(writerA, first)).rejects.toMatchObject({ code: "42501" });
  await signIn(writerA, "");
  await expect(save(writerA, first)).rejects.toMatchObject({ code: "28000" });
  await signIn(writerA, userA);
  await expect(writerA.query("select * from public.learning_progress")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    writerA.query("select public.merge_learning_progress_v1($1, $2)", [empty, first]),
  ).rejects.toMatchObject({ code: "42501" });
});

test("각 입력은 작아도 합친 결과가 16 KiB를 넘으면 기존 기록 전체를 보존한다", async () => {
  const a = {
    ...empty,
    completedEpisodeIntroIds: Array.from({ length: 100 }, (_, i) => `a-${i}-${"x".repeat(90)}`),
  };
  const b = {
    ...empty,
    completedEpisodeIntroIds: Array.from({ length: 100 }, (_, i) => `b-${i}-${"x".repeat(90)}`),
  };
  await save(writerA, a);
  const before = await load(writerA);
  await expect(save(writerB, b)).rejects.toMatchObject({ code: "23514" });
  expect(await load(writerA)).toEqual(before);
});

test("SQL NULL과 지나치게 큰 입력은 기존 진행을 보존한다", async () => {
  await save(writerA, first);
  await expect(writerB.query("select public.save_learning_progress(null)")).rejects.toMatchObject({
    code: "22023",
  });
  await expect(
    save(writerB, { ...empty, completedEpisodeIntroIds: ["x".repeat(17_000)] }),
  ).rejects.toMatchObject({ code: "22023" });
  expect(await load(writerA)).toEqual(first);
});
