import consola from "consola";
import { glob } from "fast-glob";
import { readFile } from "fs-extra";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

export async function hashDir(
  dir: string,
  include: string[],
  exclude: string[],
): Promise<string> {
  const files = await glob(include, {
    ignore: exclude,
    dot: true,
    cwd: dir,
  });
  const fileHashes = (
    await Promise.all(
      files.sort().map(async (file) => {
        const text = await readFile(resolve(dir, file), "utf8");
        const hash = md5(text);
        return `${hash}-${file}`;
      }),
    )
  ).join("\n");
  consola.debug(`Hashes: ${dir}\n${fileHashes}`);
  return md5(fileHashes);
}

export function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}
