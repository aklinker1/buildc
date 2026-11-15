import { buildPlatforms } from "./build-platform";
import { platforms } from "./platforms";

await import("./rustup-install");
await import("./build-buildc");
await buildPlatforms(platforms);
