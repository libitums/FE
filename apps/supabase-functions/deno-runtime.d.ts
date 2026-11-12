// tsc 전용 최소 선언입니다. Deno 배포 런타임은 이 파일을 읽지 않습니다 — 진입 파일
// `supabase/functions/delete-account/index.ts`가 쓰는 두 API만 적습니다.

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  readonly env: { get(name: string): string | undefined };
};

// `chat-send/index.ts`가 쓰는 Supabase Edge 런타임 전역입니다. 응답이 끝나도 작업을 끝까지 돌게 합니다.
declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void };
