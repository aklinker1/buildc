import type { DepGraph } from "dependency-graph";
import type { Package } from "../types";
import consola from "consola";

export function debugGraph(graph: DepGraph<Package>): void {
  const lines = ["Dependency Graph:"];
  function printNode(node: string, level = 1) {
    lines.push(`${"".padStart(level * 2, " ")}- \`${node}\``);
    graph.dependenciesOf(node).forEach((dep) => printNode(dep, level + 1));
  }
  graph.entryNodes().forEach((entry) => printNode(entry));
  consola.debug(lines.join("\n"));
}
