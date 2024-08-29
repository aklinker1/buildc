import { describe, it, expect } from "bun:test";
import { DepGraph } from "dependency-graph";
import {
  getOverallBuildOrder,
  getPackageDependenciesBuildOrder,
} from "../graph-utils";

function wxtGraph(): DepGraph<unknown> {
  const graph = new DepGraph();
  graph.addNode("@wxt-dev/auto-icons");
  graph.addNode("@wxt-dev/i18n");
  graph.addNode("@wxt-dev/module-react");
  graph.addNode("@wxt-dev/module-solid");
  graph.addNode("@wxt-dev/module-svelte");
  graph.addNode("@wxt-dev/module-vue");
  graph.addNode("wxt");
  graph.addNode("wxt-demo");

  graph.addDependency("@wxt-dev/auto-icons", "wxt");
  graph.addDependency("@wxt-dev/i18n", "wxt");
  graph.addDependency("@wxt-dev/module-react", "wxt");
  graph.addDependency("@wxt-dev/module-solid", "wxt");
  graph.addDependency("@wxt-dev/module-svelte", "wxt");
  graph.addDependency("@wxt-dev/module-vue", "wxt");
  graph.addDependency("wxt-demo", "wxt");
  graph.addDependency("wxt-demo", "@wxt-dev/auto-icons");
  graph.addDependency("wxt-demo", "@wxt-dev/i18n");

  return graph;
}

function exampleGraph(): DepGraph<unknown> {
  const graph = new DepGraph();
  graph.addNode("a");
  graph.addNode("b");
  graph.addNode("c");
  graph.addDependency("a", "b");
  graph.addDependency("a", "c");
  graph.addDependency("b", "c");
  return graph;
}

describe("Graph Utils", () => {
  describe("getOverallBuildOrder", () => {
    it("should return all dependencies, from first with no dependencies, to last with the most dependencies", () => {
      const expectedWxt = [
        "wxt",
        "@wxt-dev/module-react",
        "@wxt-dev/module-solid",
        "@wxt-dev/module-svelte",
        "@wxt-dev/module-vue",
        "@wxt-dev/auto-icons",
        "@wxt-dev/i18n",
        "wxt-demo",
      ];
      expect(getOverallBuildOrder(wxtGraph())).toEqual(expectedWxt);

      const expectedExample = ["c", "b", "a"];
      expect(getOverallBuildOrder(exampleGraph())).toEqual(expectedExample);
    });
  });

  describe("getPackageDependenciesBuildOrder", () => {
    it.each([
      ["wxt", wxtGraph(), []],
      ["wxt-demo", wxtGraph(), ["wxt", "@wxt-dev/auto-icons", "@wxt-dev/i18n"]],
      ["@wxt-dev/auto-icons", wxtGraph(), ["wxt"]],
      ["a", exampleGraph(), ["c", "b"]],
      ["b", exampleGraph(), ["c"]],
      ["c", exampleGraph(), []],
    ])(
      "should return only the dependencies of %s",
      (packageName, graph, expected) => {
        const actual = getPackageDependenciesBuildOrder(graph, packageName);
        expect(actual).toEqual(expected);
      },
    );
  });
});
