export const github = "https://github.com/aklinker1/buildc";

/** Normalized form of `repository`. Must match the GitHub repo for npm trusted publishing. */
export const repository = {
  type: "git",
  url: `git+${github}.git`,
};

/** Public scoped packages need explicit access. Provenance is attached when publishing via OIDC. */
export const publishConfig = {
  access: "public",
  provenance: true,
};

export const packageName = "@aklinker1/buildc";

export const license = "MIT";

export const readmeContents = `# Buildc\n\nDocumentation: <https://github.com/aklinker1/buildc>`;
