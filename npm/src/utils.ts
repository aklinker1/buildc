import type { BunFile } from "bun";
import { relative } from "node:path";
import { styleText } from "node:util";

export function logFile(outDir: string, file: BunFile): void {
  const name = relative(outDir, file.name!);
  const kb = (file.size / 1024).toFixed(2);
  console.log(
    `${styleText("blue", "ℹ")} ${styleText("dim", outDir + "/")}${styleText("bold", name).padEnd(24)}  ${styleText("dim", kb + " kB")}`,
  );
}
