#!/usr/bin/env python3
"""워드마크 응답만 늦추고 요청을 기록하는 번들 서버 (작업 android-splash-wordmark, r02).

쓰는 법:
    python3 apps/android/tools/wordmark-delay-server.py <번들 디렉터리> <포트> [워드마크 지연 ms] > server.log

- 경로에 `logo-handwriting`이 들면 응답을 시작하기 전에 지연 ms 만큼 기다린다. 그 밖의 경로는 바로 응답한다.
  지연을 안 주면(또는 0) 지연 없이 기록만 한다 — 요청 기록이 필요한 자연 조건 실행(SW1)에 쓴다.
- 요청마다 두 줄을 표준 출력에 찍고 곧바로 flush 한다(`> server.log`로 받는다). 호스트 시계다.
    HH:MM:SS.mmm START <클라이언트 포트> <경로>
    HH:MM:SS.mmm END   <클라이언트 포트> <경로> <상태> <걸린 ms>ms
  END 의 상태는 응답 상태 코드다(200 · 404 …). 실행기(splash-wordmark-repeat.sh --server-log)가 이 모양을 읽는다.
- GET 만 기록한다(HEAD 는 사전 점검의 `curl -I`라 기록하지 않는다).
- 127.0.0.1 에만 묶는다(에뮬레이터의 10.0.2.2 가 호스트의 127.0.0.1 로 닿는다). 3000 포트는 다른 작업의 서버일 수 있어 거부한다.
"""
import http.server
import os
import socketserver
import sys
import time


def stamp():
    now = time.time()
    return time.strftime("%H:%M:%S", time.localtime(now)) + ".%03d" % int((now % 1) * 1000)


def main(argv):
    if len(argv) < 3:
        sys.stderr.write(__doc__)
        return 2
    root, port = argv[1], int(argv[2])
    delay = int(argv[3]) / 1000.0 if len(argv) > 3 else 0.0
    if port == 3000:
        sys.stderr.write("3000 포트는 다른 작업의 번들 서버일 수 있다 — 18790 같은 전용 포트를 쓴다\n")
        return 2
    os.chdir(root)

    class Handler(http.server.SimpleHTTPRequestHandler):
        status = "-"

        def send_response(self, code, message=None):
            self.status = str(code)
            super().send_response(code, message)

        def do_GET(self):
            began = time.time()
            sys.stdout.write("%s START %s %s\n" % (stamp(), self.client_address[1], self.path))
            sys.stdout.flush()
            if delay and "logo-handwriting" in self.path:
                time.sleep(delay)
            try:
                super().do_GET()
            finally:
                sys.stdout.write(
                    "%s END   %s %s %s %dms\n"
                    % (stamp(), self.client_address[1], self.path, self.status, (time.time() - began) * 1000)
                )
                sys.stdout.flush()

        def log_message(self, *args):
            pass

    class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    Server(("127.0.0.1", port), Handler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
