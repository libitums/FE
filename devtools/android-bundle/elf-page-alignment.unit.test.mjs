import assert from "node:assert/strict";
import test from "node:test";

import { elfPageAlignmentIssues, nativeLibraryIssues } from "./elf-page-alignment.mjs";

const PT_LOAD = 1;
const PT_GNU_RELRO = 0x6474e552;
const EHDR = 64;
const PHDR = 56;

/**
 * 합성 ELF 머리: 64바이트 머리 + 프로그램 헤더(56바이트) 여럿.
 * @param {Array<{ type: number, offset?: number, vaddr?: number, memsz?: number, align?: number }>} headers
 * @param {{ eiClass?: number, eiData?: number, phnum?: number }} [opts]
 */
function elf(headers, opts = {}) {
  const buf = Buffer.alloc(EHDR + headers.length * PHDR);
  buf.set([0x7f, 0x45, 0x4c, 0x46], 0);
  buf[4] = opts.eiClass ?? 2;
  buf[5] = opts.eiData ?? 1;
  buf.writeBigUInt64LE(BigInt(EHDR), 32); // e_phoff
  buf.writeUInt16LE(PHDR, 54); // e_phentsize
  buf.writeUInt16LE(opts.phnum ?? headers.length, 56); // e_phnum
  headers.forEach((h, i) => {
    const base = EHDR + i * PHDR;
    buf.writeUInt32LE(h.type, base);
    buf.writeBigUInt64LE(BigInt(h.offset ?? 0), base + 8);
    buf.writeBigUInt64LE(BigInt(h.vaddr ?? 0), base + 16);
    buf.writeBigUInt64LE(BigInt(h.memsz ?? 0), base + 40);
    buf.writeBigUInt64LE(BigInt(h.align ?? 0), base + 48);
  });
  return buf;
}

const kinds = (issues) => issues.map((issue) => issue.kind);

const goodLoads = [
  { type: PT_LOAD, offset: 0, vaddr: 0, align: 0x4000 },
  { type: PT_LOAD, offset: 0x4000, vaddr: 0x8000, align: 0x4000 },
];
const good = () =>
  elf([...goodLoads, { type: PT_GNU_RELRO, vaddr: 0x7000, memsz: 0x1000, align: 1 }]);

test("EA1: aligned LOADs and a RELRO ending on a 16 KB boundary have no issues", () => {
  assert.deepEqual(elfPageAlignmentIssues(good()), []);
});

test("EA2: LOAD p_align 0x1000 is reported as load-align only", () => {
  const bytes = elf([{ type: PT_LOAD, offset: 0, vaddr: 0, align: 0x1000 }]);
  assert.deepEqual(kinds(elfPageAlignmentIssues(bytes)), ["load-align"]);
});

test("EA3: LOAD whose p_offset and p_vaddr differ by a non-multiple of 0x4000 is load-congruence", () => {
  const bytes = elf([{ type: PT_LOAD, offset: 0x1000, vaddr: 0x6000, align: 0x4000 }]);
  assert.deepEqual(kinds(elfPageAlignmentIssues(bytes)), ["load-congruence"]);
});

test("EA4: RELRO end at 0x2000 mod 0x4000 is relro-end, and passes for pageSize 4096", () => {
  const bytes = elf([
    ...goodLoads,
    { type: PT_GNU_RELRO, vaddr: 0x5000, memsz: 0x1000, align: 1 }, // end 0x6000
  ]);
  assert.deepEqual(kinds(elfPageAlignmentIssues(bytes)), ["relro-end"]);
  assert.deepEqual(elfPageAlignmentIssues(bytes, 4096), []);
});

test("EA5: ELF32, big-endian, non-ELF text and a too-short buffer are not judged (null)", () => {
  assert.equal(elfPageAlignmentIssues(elf(goodLoads, { eiClass: 1 })), null, "ELF32");
  assert.equal(elfPageAlignmentIssues(elf(goodLoads, { eiData: 2 })), null, "big-endian");
  assert.equal(elfPageAlignmentIssues(Buffer.from("not elf")), null, "not elf");
  assert.equal(elfPageAlignmentIssues(Buffer.alloc(10)), null, "length 10");
});

test("EA6: e_phnum larger than the file yields exactly one truncated issue", () => {
  const issues = elfPageAlignmentIssues(elf(goodLoads, { phnum: 5 }));
  assert.equal(issues?.length, 1);
  assert.equal(issues[0].kind, "truncated");
});

test("EA7: nativeLibraryIssues checks only 64-bit native library entries and skips non-ELF", () => {
  const relroBad = elf([
    ...goodLoads,
    { type: PT_GNU_RELRO, vaddr: 0x5000, memsz: 0x1000, align: 1 },
  ]);
  const loadBad = elf([{ type: PT_LOAD, offset: 0, vaddr: 0, align: 0x1000 }]);
  const result = nativeLibraryIssues([
    { name: "lib/arm64-v8a/a.so", bytes: good() },
    { name: "base/lib/x86_64/b.so", bytes: relroBad },
    { name: "jni/arm64-v8a/c.so", bytes: loadBad },
    { name: "lib/armeabi-v7a/d.so", bytes: loadBad },
    { name: "lib/arm64-v8a/e.so", bytes: Buffer.from("not elf") },
    { name: "assets/f.so", bytes: loadBad },
  ]);
  assert.equal(result.checked, 3);
  assert.deepEqual(
    result.failures.map((f) => f.name),
    ["base/lib/x86_64/b.so", "jni/arm64-v8a/c.so"],
  );
});
