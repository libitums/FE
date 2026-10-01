import { copyFile, cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function syncAndroidBundle(dist, assets) {
  const bundle = join(dist, "main.lynx.bundle");
  const staticSource = join(dist, "static");
  if (!(await stat(bundle)).isFile() || !(await stat(staticSource)).isDirectory()) {
    throw new Error("Mobile build output is incomplete");
  }
  await mkdir(assets, { recursive: true });
  await copyFile(bundle, join(assets, "main.lynx.bundle"));
  await rm(join(assets, "static"), { recursive: true, force: true });
  await cp(staticSource, join(assets, "static"), { recursive: true });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  await syncAndroidBundle(
    join(root, "apps", "mobile", "dist"),
    join(root, "apps", "android", "app", "src", "main", "assets"),
  );
}
