/** Bound bytes before JSON parsing, including requests without a Content-Length. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  if (req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new Error("INVALID_BODY");
  if (Number(req.headers.get("content-length")) > maxBytes) throw new Error("BODY_TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  let buffer: Buffer | undefined;
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (bytes + value.byteLength > maxBytes) {
            void reader.cancel().catch(() => undefined);
            throw new Error("BODY_TOO_LARGE");
          }
          buffer ??= Buffer.allocUnsafe(maxBytes);
          buffer.set(value, bytes);
          bytes += value.byteLength;
        }
        return JSON.parse(buffer?.toString("utf8", 0, bytes) ?? "");
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("BODY_TIMEOUT"));
          void reader.cancel().catch(() => undefined);
        }, 5000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
}

export function bodyReadStatus(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "BODY_TOO_LARGE") return 413;
    if (error.message === "BODY_TIMEOUT") return 408;
  }
  return 400;
}
