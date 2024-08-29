import type { DepGraph } from "dependency-graph";

export function getOverallBuildOrder<T>(graph: DepGraph<T>): string[] {
  return graph.overallOrder();
}

export function getPackageDependenciesBuildOrder<T>(
  graph: DepGraph<T>,
  packageName: string,
): string[] {
  return graph.dependenciesOf(packageName);
}
