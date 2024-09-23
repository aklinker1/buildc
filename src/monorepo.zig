const std = @import("std");
const mem = std.mem;
const tree = @import("tree.zig");

pub const Monorepo = struct {
    const Self = @This();

    dir: []const u8,
    tree: tree.Node(Package),
    alloc: mem.Allocator,

    pub fn deinit(self: *Self) !void {
        self.alloc.free(self.dir);
        for (self.tree.children.items) |package| {
            package.deinit();
        }
        self.tree.deinit();
    }

    /// Returns the packages of the entire monorepo in build order
    pub fn getOverallBuildOrder(self: *Self) ![]tree.Node(Package) {
        return self.tree.getDependencyBuildOrder();
    }

    /// Returns the dependencies of a package in build order
    pub fn getPakcageDepBuildOrder(self: *Self, package_name: []const u8) ![]tree.Node(Package) {
        const node = self.findPackage(package_name);
        return node.getDependencyBuildOrder();
    }

    fn findPackage(self: *Self, package_name: []const u8) !tree.Node(Package) {
        for (self.tree.children.items) |item| {
            if (mem.eql([]u8, item.id, package_name)) {
                return item;
            }
        }
        return error.PackageNotFound;
    }
};

pub const Package = struct {
    name: []const u8,
    dir: []const u8,
    build_script: ?[]const u8,
};

/// Look up the CWD to find a directory with a package.json with "workspaces" or a pnpm-workspace.yaml file.
pub fn findRootDir(alloc: mem.Allocator) ![]const u8 {
    return error.TODO;
}

/// Look up the CWD to find a directory with a package.json with "workspaces" or a pnpm-workspace.yaml file.
pub fn read(alloc: mem.Allocator, root_dir: []const u8) !Monorepo {
    return error.TODO;
}
