const cargoTomlFile = Bun.file("../Cargo.toml");

export async function getVersion(): Promise<string> {
  const cargoToml: any = Bun.TOML.parse(await cargoTomlFile.text());
  return cargoToml.package.version;
}
