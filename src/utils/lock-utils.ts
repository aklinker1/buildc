import consola from "consola";
import fs from "fs-extra";
import { resolve } from "pathe";
import { lock } from "proper-lockfile";

export async function withLock<T>(
  cacheDir: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  const ttl = 2 * 60e3;
  const pollInterval = 100;

  await fs.ensureDir(cacheDir);
  const lockfilePath = resolve(cacheDir, "buildc.lock");
  await fs.writeFile(lockfilePath, "");

  // For some reason, the built-in retry system didn't work... So I did a DIY one.
  const tryGetLock = () =>
    lock(lockfilePath, { stale: ttl }).catch(() => void 0);

  let release = await tryGetLock();
  if (!release)
    consola.info("Waiting for other `buildc` processes to finish...");
  while (!release) {
    await sleep(pollInterval);

    if (Date.now() >= startTime + ttl) throw Error("Timed out");
    release = await tryGetLock();
  }

  try {
    return await fn();
  } finally {
    await release();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((res) => setTimeout(res, ms));
}
