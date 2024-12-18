console.log("Buildc postinstall step not performed.");
console.log(
  "The postinstall replaces this JS binary with a native binary for your operating system, making buildc lightning fast. If you see this message, it means you didn't run the postinstall step, or your package manager blocked running it.",
);
process.exit(1);
