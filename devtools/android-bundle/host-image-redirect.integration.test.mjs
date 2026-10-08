// android-splash-wordmark 정적 결선 검사 (HR1~HR6). 계약: spec.md §5, 계획: test-plan.md integration.
// 실제 apps/android/app/src/**/java/com/libitum/host/*.java를 텍스트로 읽는다(주석 · 문자열 리터럴을 걸러낸 뒤).
// Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 이미지 URL 재작성이 Lynx의 동기 확장점(setImageInterceptor)에만 걸리는지 본다. 걸린 인터셉터가 제때
// 요청에 닿는지는 기기 계측(SplashWordmarkHostTest.java)이 본다.
//
// HR7 · HR8(r02): 저장소에 든 Lynx AAR의 `ImageInterceptor.loadImage` 호출자가 알려진 집합뿐인지 본다. 순수 Node로
// 읽는다(zip 중앙 디렉터리 + class 상수 풀) — javap · JDK · Gradle이 없는 환경(CI의 `pnpm verify`)에서도 같은 판정이
// 난다. AAR은 저장소에 추적되는 파일이므로 못 찾으면 건너뛰지 않고 실패한다(HR8).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcDir = join(root, "apps/android/app/src");
const hostPackage = "java/com/libitum/host";
const mainHostDir = join(srcDir, "main", hostPackage);
const mainActivityPath = join(mainHostDir, "MainActivity.java");
const bundledFetcherPath = join(mainHostDir, "BundledMediaFetcher.java");
const wiringSourceSets = ["main", "debug", "bundled", "release"];

/**
 * 주석과 문자열 · 문자 리터럴의 내용을 지운다(따옴표는 남긴다). 문자열 안의 `//`(URL)를 주석으로 읽지
 * 않고, 주석 · 문자열 안에 적힌 호출 이름을 호출로 세지 않는다.
 */
function stripJavaCommentsAndLiterals(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const ch = source[i];
    if (two === "//") {
      while (i < source.length && source[i] !== "\n") i += 1;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      // 줄 번호를 지키기 위해 줄바꿈은 남긴다.
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (ch === '"' || ch === "'") {
      const quote = ch;
      out += quote;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        i += source[i] === "\\" ? 2 : 1;
      }
      out += quote;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

function walkJava(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walkJava(path) : path.endsWith(".java") ? [path] : [];
  });
}

/** 소스 집합들의 호스트 Java를 `상대경로 → 걸러낸 소스`로 읽는다. */
function readHostSources(sourceSets) {
  const sources = {};
  for (const set of sourceSets) {
    for (const path of walkJava(join(srcDir, set))) {
      sources[relative(srcDir, path)] = stripJavaCommentsAndLiterals(readFileSync(path, "utf8"));
    }
  }
  return sources;
}

/** 소스 맵에서 `needle` 호출이 나오는 `파일:줄`. */
function findCalls(sources, needle) {
  const hits = [];
  for (const [path, text] of Object.entries(sources)) {
    text.split("\n").forEach((line, index) => {
      if (line.includes(needle)) hits.push(`${path}:${index + 1}`);
    });
  }
  return hits;
}

function count(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

/** HR1 · HR4가 쓰는 판정: 문자열 소스 하나에서 호출이 있는가(주석 · 리터럴은 걸러낸 뒤). */
function hasCall(source, name) {
  return stripJavaCommentsAndLiterals(source).includes(`${name}(`);
}

// ---- HR6: 검사기 자신의 가드 ---------------------------------------------------

test("HR6: 주석 처리된 호출은 HR1을 통과하고 실제 호출은 실패한다", () => {
  const commented = [
    "class A {",
    "  void f(LynxViewBuilder builder) {",
    "    // builder.setMediaResourceFetcher(new BundledMediaFetcher(bundled, templateUrl));",
    '    /* builder.setMediaResourceFetcher(x); */ String s = "setMediaResourceFetcher(";',
    "  }",
    "}",
  ].join("\n");
  const real = commented.replace(
    "// builder.setMediaResourceFetcher(new BundledMediaFetcher(bundled, templateUrl));",
    "builder.setMediaResourceFetcher(new BundledMediaFetcher(bundled, templateUrl));",
  );
  assert.equal(hasCall(commented, "setMediaResourceFetcher"), false);
  assert.equal(hasCall(real, "setMediaResourceFetcher"), true);
});

test("HR6: 문자열 안의 URL(//)은 주석으로 읽지 않는다", () => {
  const source = 'String u = "http://10.0.2.2:3000"; builder.setAsyncImageInterceptor(x);';
  assert.equal(hasCall(source, "setAsyncImageInterceptor"), true);
});

// ---- HR1 ~ HR5: 실제 결선 --------------------------------------------------------

test("HR1: app/src/main 어디에도 setMediaResourceFetcher( 호출이 없다", () => {
  const hits = findCalls(readHostSources(["main"]), "setMediaResourceFetcher(");
  assert.deepEqual(
    hits,
    [],
    `이미지 URL 재작성을 LynxMediaResourceFetcher에 걸면 Lynx가 재작성을 불린 스레드가 아닌 lynx-brief-io로 넘긴다(경합). 발견: ${hits.join(", ")}`,
  );
});

test("HR2: LynxMediaResourceFetcher를 잇는 클래스와 BundledMediaFetcher.java가 없다", () => {
  const extending = findCalls(readHostSources(["main"]), "extends LynxMediaResourceFetcher");
  assert.deepEqual(
    extending,
    [],
    `LynxMediaResourceFetcher를 잇는 클래스: ${extending.join(", ")}`,
  );
  assert.equal(
    existsSync(bundledFetcherPath),
    false,
    `${relative(root, bundledFetcherPath)}가 남아 있다`,
  );
});

test("HR3: MainActivity가 builder.build(this) 뒤 renderTemplateUrl( 앞에서 setImageInterceptor(new HostImageInterceptor(bundled, templateUrl))를 정확히 1회 단다", () => {
  const source = stripJavaCommentsAndLiterals(readFileSync(mainActivityPath, "utf8"));
  assert.equal(
    count(source, /\.setImageInterceptor\(/g),
    1,
    "setImageInterceptor( 호출이 정확히 1회여야 한다",
  );
  const call =
    /\.setImageInterceptor\(\s*new\s+HostImageInterceptor\(\s*bundled\s*,\s*templateUrl\s*\)\s*\)/;
  const match = call.exec(source);
  assert.ok(
    match,
    "setImageInterceptor(new HostImageInterceptor(bundled, templateUrl)) 형태가 아니다(인자는 onCreate의 bundled · templateUrl 그대로)",
  );
  const built = source.search(/=\s*builder\.build\(\s*this\s*\)/);
  const render = source.indexOf("renderTemplateUrl(");
  assert.ok(built >= 0, "builder.build(this) 호출을 찾을 수 없다");
  assert.ok(render >= 0, "renderTemplateUrl( 호출을 찾을 수 없다");
  assert.ok(
    built < match.index,
    "setImageInterceptor는 builder.build(this) 뒤에 와야 한다(LynxView가 있어야 단다)",
  );
  assert.ok(
    match.index < render,
    "setImageInterceptor는 renderTemplateUrl( 앞에 와야 한다 — 뒤에 달면 첫 화면의 이미지가 인터셉터 없이 요청된다",
  );
});

test("HR4: main · debug · bundled · release 어디에도 setAsyncImageInterceptor( 호출이 없다", () => {
  const hits = findCalls(readHostSources(wiringSourceSets), "setAsyncImageInterceptor(");
  assert.deepEqual(
    hits,
    [],
    `비동기 인터셉터는 재작성을 다른 스레드로 넘긴다. 발견: ${hits.join(", ")}`,
  );
});

test("HR5: setEnableGenericResourceFetcher(LynxBooleanOption.TRUE)가 그대로 있다", () => {
  const source = stripJavaCommentsAndLiterals(readFileSync(mainActivityPath, "utf8"));
  assert.ok(
    /setEnableGenericResourceFetcher\(\s*LynxBooleanOption\.TRUE\s*\)/.test(source),
    "MainActivity가 setEnableGenericResourceFetcher(LynxBooleanOption.TRUE)를 부르지 않는다(I5)",
  );
});

// ---- HR7 · HR8: Lynx AAR의 `loadImage` 호출자(정적 · 가드) ---------------------------
// r02(D1 진단): 호스트의 HostImageInterceptor.loadImage는 Lynx가 부르지 않는 죽은 경로다(4.0.1 바이트코드 확인). 그
// 사실을 지킨다 — Lynx를 올려 새 호출자가 생기면 이 검사가 실패하고, 그때 loadImage를 실제로 구현해야 한다.
// 한계: xelement* · lynx-service-image는 Maven에서 받아 저장소에 없다. 이 검사는 `lynx` AAR만 본다.

const lynxMavenDir = join(root, "apps/android/vendor-maven/org/lynxsdk/lynx/lynx");
const interceptorClass = "com/lynx/tasm/behavior/ImageInterceptor";
const redirectUtilsClass = "com/lynx/tasm/behavior/ui/image/ImageUrlRedirectUtils";
const knownLoadImageClasses = [
  interceptorClass,
  redirectUtilsClass,
  "com/lynx/tasm/LynxViewClient",
  "com/lynx/tasm/LynxViewClientGroup",
];
const minClassCount = 1000;

/** zip(바이트)의 중앙 디렉터리를 읽어 `이름 → 압축 풀린 바이트`를 돌려준다. zip64 · 암호화는 지원하지 않는다. */
function readZip(buffer, filter = () => true) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip 끝 레코드(EOCD)를 찾을 수 없다");
  const entries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < entries; n += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("zip 중앙 디렉터리가 깨졌다");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!filter(name)) continue;
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressed);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`지원하지 않는 zip 압축 방식 ${method}: ${name}`);
  }
  return files;
}

/** class 파일의 상수 풀에서 Utf8 항목들을 읽는다. */
function constantPoolUtf8(classBytes) {
  if (classBytes.length < 10 || classBytes.readUInt32BE(0) !== 0xcafebabe) return null;
  const count = classBytes.readUInt16BE(8);
  const utf8 = [];
  let at = 10;
  for (let index = 1; index < count; index += 1) {
    const tag = classBytes[at];
    if (tag === 1) {
      const length = classBytes.readUInt16BE(at + 1);
      utf8.push(classBytes.toString("latin1", at + 3, at + 3 + length));
      at += 3 + length;
    } else if (tag === 5 || tag === 6) {
      at += 9;
      index += 1; // long · double은 상수 풀 두 칸
    } else if (tag === 3 || tag === 4 || tag === 9 || tag === 10 || tag === 11) {
      at += 5;
    } else if (tag === 12 || tag === 17 || tag === 18) {
      at += 5;
    } else if (tag === 7 || tag === 8 || tag === 16 || tag === 19 || tag === 20) {
      at += 3;
    } else if (tag === 15) {
      at += 4;
    } else {
      throw new Error(`알 수 없는 상수 풀 태그 ${tag}`);
    }
  }
  return utf8;
}

/**
 * AAR 안 `classes.jar`의 모든 클래스를 읽어, 상수 풀에 `loadImage`와 (`ImageInterceptor` 또는
 * `ImageUrlRedirectUtils`)를 함께 가진 클래스의 집합을 돌려준다. AAR 또는 classes.jar를 못 읽으면 던진다.
 */
function scanLoadImageClasses(aarPath) {
  if (!existsSync(aarPath)) throw new Error(`AAR이 없다: ${aarPath}`);
  const aar = readZip(readFileSync(aarPath), (name) => name === "classes.jar");
  const jar = aar.get("classes.jar");
  if (!jar) throw new Error(`AAR에 classes.jar가 없다: ${aarPath}`);
  const classes = readZip(jar, (name) => name.endsWith(".class"));
  const hits = [];
  for (const [entry, bytes] of classes) {
    const pool = constantPoolUtf8(bytes);
    if (!pool) continue;
    const mentions = (name) => pool.some((text) => text.includes(name));
    if (
      pool.includes("loadImage") &&
      (mentions(interceptorClass) || mentions(redirectUtilsClass))
    ) {
      hits.push(entry.replace(/\.class$/, ""));
    }
  }
  return { classCount: classes.size, hits: hits.sort() };
}

function lynxAarPaths() {
  if (!existsSync(lynxMavenDir)) return [];
  return readdirSync(lynxMavenDir)
    .filter((version) => statSync(join(lynxMavenDir, version)).isDirectory())
    .map((version) => join(lynxMavenDir, version, `lynx-${version}.aar`));
}

test("HR8: AAR을 못 찾거나 classes.jar가 비면 검사기는 실패한다(건너뛰지 않는다)", () => {
  assert.throws(
    () => scanLoadImageClasses(join(lynxMavenDir, "0.0.0", "lynx-0.0.0.aar")),
    /AAR이 없다/,
  );
  // zip이 아닌 파일 · classes.jar가 없는 zip
  assert.throws(() => scanLoadImageClasses(join(root, "package.json")));
  const emptyZip = Buffer.alloc(22);
  emptyZip.writeUInt32LE(0x06054b50, 0);
  assert.equal(readZip(emptyZip).size, 0);
  // 실제 저장소에는 AAR이 최소 하나 있고 클래스를 충분히 읽는다.
  const paths = lynxAarPaths();
  assert.ok(
    paths.length > 0,
    `${relative(root, lynxMavenDir)} 아래에 Lynx 버전 디렉터리가 없다 — AAR을 못 찾으면 HR7은 통과가 아니라 실패다`,
  );
  for (const aarPath of paths) {
    const { classCount } = scanLoadImageClasses(aarPath);
    assert.ok(
      classCount >= minClassCount,
      `${relative(root, aarPath)}에서 읽은 클래스가 ${classCount}개뿐이다(최소 ${minClassCount}) — 빈 jar를 통과시키지 않는다`,
    );
  }
});

test("HR7: Lynx AAR에서 ImageInterceptor.loadImage를 다루는 클래스는 알려진 넷뿐이다", () => {
  const paths = lynxAarPaths();
  assert.ok(paths.length > 0, `${relative(root, lynxMavenDir)} 아래에 Lynx AAR이 없다`);
  for (const aarPath of paths) {
    const { hits } = scanLoadImageClasses(aarPath);
    assert.deepEqual(
      hits,
      [...knownLoadImageClasses].sort(),
      `${relative(root, aarPath)}: loadImage와 ImageInterceptor · ImageUrlRedirectUtils를 함께 가진 클래스의 집합이 달라졌다. ` +
        "새 호출자가 생겼다면 Lynx가 HostImageInterceptor.loadImage(지금은 imageLoadCompletion(null, null) 한 번)를 " +
        "실제로 부르기 시작했다는 뜻이다 — loadImage를 구현해야 한다(spec r02.4).",
    );
  }
});
