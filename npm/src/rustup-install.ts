import { styleText } from "node:util";
import { platforms } from "./platforms";

console.log(styleText("cyan", "\nInstalling required rust targets"));

for (const platform of platforms) {
  await Bun.$`rustup target add ${platform.target}`;
}

console.log(`\n${styleText("green", "✓")} Done\n`);
