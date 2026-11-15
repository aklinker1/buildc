import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { styleText } from "node:util";

const secretNames = [
  "APPLE_CERT_BASE64",
  "APPLE_CERT_PASSWORD",
  "APPLE_API_ISSUER_ID",
  "APPLE_API_KEY_ID",
  "APPLE_API_KEY_P8",
] as const;

/**
 * Sign and notarize a macOS executable using `rcodesign`, so it works from
 * Linux CI. The binary is modified in place.
 *
 * Required environment variables:
 *
 * - `APPLE_CERT_BASE64`: Base64 encoded Developer ID Application `.p12`
 * - `APPLE_CERT_PASSWORD`: Password of the `.p12`
 * - `APPLE_API_ISSUER_ID`, `APPLE_API_KEY_ID`, `APPLE_API_KEY_P8`: App Store
 *   Connect API key (the `.p8` contents), used for notarization
 *
 * When none are set and not running in CI, signing is skipped so local builds
 * keep working. In CI, missing secrets are an error to avoid shipping unsigned
 * releases.
 */
export async function signMacosBinary(binPath: string): Promise<void> {
  const missing = secretNames.filter((name) => !process.env[name]);
  if (missing.length === secretNames.length && !process.env.CI) {
    console.log(
      styleText("yellow", `⚠ Skipping signing ${basename(binPath)}: no Apple secrets set`),
    );
    return;
  }
  if (missing.length > 0) {
    throw Error(`Missing secrets for macOS signing: ${missing.join(", ")}`);
  }

  const dir = await mkdtemp(join(tmpdir(), "buildc-sign-"));
  try {
    const p12 = join(dir, "cert.p12");
    const p12Password = join(dir, "cert-password");
    const p8 = join(dir, "AuthKey.p8");
    const apiKey = join(dir, "api-key.json");
    const zip = join(dir, "notarize.zip");

    await writeFile(
      p12,
      Buffer.from(process.env.APPLE_CERT_BASE64!.replace(/\s/g, ""), "base64"),
    );
    await writeFile(p12Password, process.env.APPLE_CERT_PASSWORD!, { mode: 0o600 });
    await writeFile(p8, process.env.APPLE_API_KEY_P8!, { mode: 0o600 });

    console.log(styleText("cyan", `\nSigning ${basename(binPath)}`));
    await Bun.$`rcodesign sign --for-notarization --code-signature-flags runtime --p12-file ${p12} --p12-password-file ${p12Password} ${binPath}`;

    console.log(styleText("cyan", `\nNotarizing ${basename(binPath)}`));
    await Bun.$`rcodesign encode-app-store-connect-api-key --output-path ${apiKey} ${process.env.APPLE_API_ISSUER_ID!} ${process.env.APPLE_API_KEY_ID!} ${p8}`.quiet();
    // Apple's notary service doesn't accept bare executables, so zip it.
    await Bun.$`zip -j ${zip} ${binPath}`.quiet();
    await Bun.$`rcodesign notary-submit --api-key-file ${apiKey} --wait ${zip}`;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
