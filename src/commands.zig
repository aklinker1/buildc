const utils = @import("utils.zig");
const Ctx = utils.Ctx;
const monorepo = @import("monorepo.zig");

pub fn all(ctx: Ctx) !void {
    // 1. Build monorepo dependency tree
    const root_dir = monorepo.findRootDir(ctx.alloc);
    defer ctx.alloc.free(root_dir);
    const repo = try monorepo.read(ctx.alloc, root_dir);

    // 2. Execute build commands of root node's children (ie: all packages)
    const dependencies = try repo.getOverallBuildOrder();
    for (dependencies) |dependency| {
        try build_cached(ctx, dependency);
    }
}

pub fn build(ctx: Ctx) !void {
    // 1. Build monorepo dependency tree
    const root_dir = monorepo.findRootDir(ctx.alloc);
    defer ctx.alloc.free(root_dir);
    const repo = try monorepo.read(ctx.alloc, root_dir);
    const package = try repo.detectPackage(ctx.alloc);

    // 2. Execute build commands of package node's children (ie: it's dependencies)
    const dependencies = try repo.getOverallBuildOrder();
    for (dependencies) |dependency| {
        try build_cached(ctx, dependency);
    }

    // 3. Execute package's build command and cache the result
    try build_cached(ctx, package);
}

pub fn deps(ctx: Ctx) !void {
    // 1. Build monorepo dependency tree
    const root_dir = monorepo.findRootDir(ctx.alloc);
    defer ctx.alloc.free(root_dir);
    const repo = try monorepo.read(ctx.alloc, root_dir);
    const package = try repo.detectPackage(ctx.alloc);

    // 2. Execute build commands of package node's children (ie: it's dependencies)
    const dependencies = try repo.getOverallBuildOrder();
    for (dependencies) |dependency| {
        try build_cached(ctx, dependency);
    }

    // 3. Execute package's command (NOT cached)
    try run(ctx, package.dir, ctx.cmd_args);
}

pub fn graph(ctx: Ctx) !void {
    // 1. Build monorepo dependency tree
    const root_dir = monorepo.findRootDir(ctx.alloc);
    defer ctx.alloc.free(root_dir);
    const repo = try monorepo.read(ctx.alloc, root_dir);

    // 2. Print tree
    try monorepo.tree.print(std.io.getStdErr().writer(), 0);
}

pub fn clean(ctx: Ctx) !void {
    // 1. Delete <monorepo>/.cache
    const root_dir = monorepo.findRootDir(ctx.alloc);
    const cache_dir = root_dir ++ ".cache";
    std.fs.deleteDir(cache_dir);
}
