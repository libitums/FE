import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { syncAndroidBundle } from "./sync.mjs";

test("copies the bundle and replaces stale static assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "duru-android-bundle-"));
  try {
    const dist = join(root, "dist");
    const assets = join(root, "assets");
    await mkdir(join(dist, "static", "image"), { recursive: true });
    await mkdir(join(assets, "static"), { recursive: true });
    await writeFile(join(dist, "main.lynx.bundle"), "new bundle");
    await writeFile(join(dist, "static", "image", "cover.png"), "new image");
    await writeFile(join(assets, "static", "stale.png"), "old image");

    await syncAndroidBundle(dist, assets);

    assert.equal(await readFile(join(assets, "main.lynx.bundle"), "utf8"), "new bundle");
    assert.equal(await readFile(join(assets, "static", "image", "cover.png"), "utf8"), "new image");
    await assert.rejects(readFile(join(assets, "static", "stale.png")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
