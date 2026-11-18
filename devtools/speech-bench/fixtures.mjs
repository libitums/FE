// 테스트용 도우미(테스트 파일이 아니라 node --test가 직접 돌리지 않습니다).

/** 무음 PCM WAV 버퍼를 만듭니다. */
export function makeWav({ sampleRate = 16000, channels = 1, bits = 16, seconds = 1 } = {}) {
  const dataBytes = Math.round(sampleRate * channels * (bits / 8) * seconds);
  const b = Buffer.alloc(44 + dataBytes);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * channels * (bits / 8), 28);
  b.writeUInt16LE(channels * (bits / 8), 32);
  b.writeUInt16LE(bits, 34);
  b.write("data", 36, "ascii");
  b.writeUInt32LE(dataBytes, 40);
  return b;
}
