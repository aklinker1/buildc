import { buildPlatform } from "./build-platform";
import { platforms } from "./platforms";

await import("./rustup-install");
await import("./build-buildc");

// const toBuild =
//   process.platform === "win32"
//     ? // Can build everything on Windows
//       platforms
//     : // Linux/Mac cannot build windows
//       platforms.filter((p) => !p.name.startsWith("win32"));

for (const platform of platforms) {
  await buildPlatform(platform);
}
