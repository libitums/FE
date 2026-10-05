// e2e 전용 정적 서버입니다. 빌드 산출물을 그대로 내리고, 없는 주소는 404.html을 404로 내립니다.
// astro preview를 쓰지 않는 이유: 개발 서버가 떠 있으면 잠금 때문에 뜨지 않고, 산출 폴더를 고를 수 없습니다.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const [root, port] = [path.resolve(process.argv[2]), Number(process.argv[3])];
const types = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let file = path.join(root, pathname);
  if (!file.startsWith(root)) file = root;
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  const found = existsSync(file);
  if (!found) file = path.join(root, "404.html");
  response.writeHead(found ? 200 : 404, {
    "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1");
