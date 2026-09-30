import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

type Client = ReturnType<EmbeddedPostgres["getPgClient"]>;

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

/** 일회용 PostgreSQL만 띄웁니다. 외부 DB URL이나 개발자의 Supabase 설정은 읽지 않습니다. */
export async function startTestDatabase() {
  const databaseDir = await mkdtemp(join(tmpdir(), "learning-progress-pg-"));
  const logs: string[] = [];
  const database = new EmbeddedPostgres({
    databaseDir,
    port: await freePort(),
    user: "postgres",
    password: randomUUID(),
    persistent: false,
    initdbFlags: ["--locale=C", "--encoding=UTF8"],
    postgresFlags: [
      "-h",
      "127.0.0.1",
      "-k",
      "",
      "-c",
      "max_connections=10",
      "-c",
      "shared_buffers=16MB",
    ],
    onLog: (message) => {
      logs.push(message);
    },
    onError: (message) => {
      logs.push(String(message));
    },
  });
  const clients: Client[] = [];
  const close = async () => {
    await Promise.all(clients.map((client) => client.end()));
    await database.stop();
    await rm(databaseDir, { recursive: true, force: true });
  };
  try {
    await database.initialise();
    await database.start();
    const connect = async () => {
      const client = database.getPgClient("postgres", "127.0.0.1");
      await client.connect();
      clients.push(client);
      await client.query("set statement_timeout = '5s'");
      return client;
    };
    const admin = await connect();
    // Supabase가 제공하는 경계만 최소로 준비합니다. 표·RPC·권한은 실제 마이그레이션을 실행합니다.
    await admin.query(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    const directory = new URL("./", import.meta.url);
    for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
      await admin.query(await readFile(new URL(file, directory), "utf8"));
    }
    return { admin, connect, close };
  } catch (error) {
    await close();
    throw new Error(`Test PostgreSQL failed: ${String(error)}\n${logs.join("")}`);
  }
}

export async function signIn(client: Client, userId: string): Promise<void> {
  await client.query("set role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
}

export const save = (client: Client, snapshot: unknown) =>
  client.query("select public.save_learning_progress($1::jsonb)", [JSON.stringify(snapshot)]);
export async function load(client: Client): Promise<unknown> {
  const result = await client.query("select public.load_learning_progress() as progress");
  return result.rows[0].progress;
}
