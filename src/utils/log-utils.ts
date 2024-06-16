import type { DepGraph } from "dependency-graph";
import type { Package } from "../types";

export function getGraphString(graph: DepGraph<Package>): string {
  const lines: string[] = [];
  function printNode(node: string, level = 1) {
    lines.push(`${"".padStart(level * 2, " ")}- \`${node}\``);
    graph.dependenciesOf(node).forEach((dep) => printNode(dep, level + 1));
  }
  graph.entryNodes().forEach((entry) => printNode(entry));
  return lines.join("\n");
}
