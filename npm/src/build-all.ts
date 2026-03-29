import { buildPlatform } from "./build-platform";
import { platforms } from "./platforms";

await import("./rustup-install");
await import("./build-buildc");
for (const platform of platforms) {
  await buildPlatform(platform);
}
