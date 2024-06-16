import { defineCommand } from "citty";
import { version, description, name } from "../../package.json";
import { buildPackage } from "..";

export const main = defineCommand({
  meta: { name, version, description },
  args: {
    command: {
      type: "positional",
      required: true,
      description: "Command to build your package",
      valueHint: '"unbuild"',
    },
    dir: {
      type: "string",
      description: "Run the CLI in a different directory than the CWD",
      default: ".",
    },
  },
  async run({ args }) {
    await buildPackage(args.command);
  },
});
