// 정본은 android-release-config 계약 6.1절. 순수 함수 — 파일을 읽지 않는다.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const PAGE_SIZE_16K = 16384;

/**
 * @typedef {{ kind: "truncated" | "load-align" | "load-congruence" | "relro-end", detail: string }} AlignmentIssue
 */

const PT_LOAD = 1;
const PT_GNU_RELRO = 0x6474e552;
const EHDR_SIZE = 64;
const PHDR_SIZE = 56;
const NATIVE_LIBRARY = /^(?:base\/)?(?:lib|jni)\/(arm64-v8a|x86_64)\/[^/]+\.so$/;

const hex = (value) => `0x${value.toString(16)}`;
const mod = (value, size) => ((value % size) + size) % size;

/**
 * ELF64 little-endian이 아니면 null(판정 대상 아님). 대상이면 문제 목록(없으면 []). 던지지 않는다.
 * @param {Uint8Array} bytes
 * @param {number} [pageSize]
 * @returns {AlignmentIssue[] | null}
 */
export function elfPageAlignmentIssues(bytes, pageSize = PAGE_SIZE_16K) {
  if (
    bytes.length < EHDR_SIZE ||
    bytes[0] !== 0x7f ||
    bytes[1] !== 0x45 ||
    bytes[2] !== 0x4c ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 2 ||
    bytes[5] !== 1
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const phoff = view.getBigUint64(32, true);
  const phentsize = BigInt(view.getUint16(54, true));
  const phnum = view.getUint16(56, true);
  const page = BigInt(pageSize);
  const length = BigInt(bytes.length);

  /** @type {AlignmentIssue[]} */
  const issues = [];
  for (let i = 0; i < phnum; i += 1) {
    const base = phoff + BigInt(i) * phentsize;
    if (base + BigInt(PHDR_SIZE) > length) {
      return [
        {
          kind: "truncated",
          detail: `program header ${i} ends at ${hex(base + BigInt(PHDR_SIZE))} but the file has ${hex(length)} bytes`,
        },
      ];
    }
    const at = Number(base);
    const type = view.getUint32(at, true);
    const offset = view.getBigUint64(at + 8, true);
    const vaddr = view.getBigUint64(at + 16, true);
    const memsz = view.getBigUint64(at + 40, true);
    const align = view.getBigUint64(at + 48, true);
    if (type === PT_LOAD) {
      if (align < page) {
        issues.push({ kind: "load-align", detail: `p_align ${hex(align)} < ${hex(page)}` });
      }
      if (mod(offset - vaddr, page) !== 0n) {
        issues.push({
          kind: "load-congruence",
          detail: `p_offset ${hex(offset)} and p_vaddr ${hex(vaddr)} differ modulo ${hex(page)}`,
        });
      }
    } else if (type === PT_GNU_RELRO) {
      const end = vaddr + memsz;
      if (mod(end, page) !== 0n) {
        issues.push({
          kind: "relro-end",
          detail: `GNU_RELRO ends at ${hex(end)}, not a multiple of ${hex(page)}`,
        });
      }
    }
  }
  return issues;
}

/**
 * 이름이 /^(?:base\/)?(?:lib|jni)\/(arm64-v8a|x86_64)\/[^/]+\.so$/ 인 항목만 본다.
 * @param {Array<{ name: string, bytes: Uint8Array }>} entries
 * @returns {{ checked: number, failures: Array<{ name: string, issues: AlignmentIssue[] }> }}
 */
export function nativeLibraryIssues(entries) {
  let checked = 0;
  /** @type {Array<{ name: string, issues: AlignmentIssue[] }>} */
  const failures = [];
  for (const { name, bytes } of entries) {
    if (!NATIVE_LIBRARY.test(name)) continue;
    const issues = elfPageAlignmentIssues(bytes);
    if (issues === null) continue;
    checked += 1;
    if (issues.length > 0) failures.push({ name, issues });
  }
  return { checked, failures };
}

// CLI: node devtools/android-bundle/elf-page-alignment.mjs <archive>... (.apk · .aab · .aar)
// 판정은 위 순수 함수가 한다. 여기는 unzip으로 항목을 읽어 넘기는 껍질이다.
// 실패가 있거나 검사한 64비트 라이브러리가 0개면 종료 코드 1.
function readArchive(archive) {
  return execFileSync("unzip", ["-Z1", archive], { maxBuffer: 1 << 26 })
    .toString("utf8")
    .split("\n")
    .filter((name) => NATIVE_LIBRARY.test(name))
    .map((name) => ({
      name,
      bytes: new Uint8Array(execFileSync("unzip", ["-p", archive, name], { maxBuffer: 1 << 28 })),
    }));
}

function runCli(archives) {
  if (archives.length === 0) {
    process.stderr.write("usage: elf-page-alignment.mjs <archive.apk|.aab|.aar>...\n");
    return 1;
  }
  let status = 0;
  for (const archive of archives) {
    const { checked, failures } = nativeLibraryIssues(readArchive(archive));
    process.stdout.write(`${archive}: checked ${checked}, failures ${failures.length}\n`);
    for (const failure of failures) {
      const detail = failure.issues.map((issue) => `${issue.kind}(${issue.detail})`).join("; ");
      process.stdout.write(`  ${failure.name}: ${detail}\n`);
    }
    if (failures.length > 0 || checked === 0) status = 1;
  }
  return status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv.slice(2));
}
