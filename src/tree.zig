const std = @import("std");
const mem = std.mem;
const colors = @import("colors.zig");

pub fn Node(comptime T: type) type {
    return struct {
        const Self = @This();
        id: []u8,
        value: T,
        children: std.ArrayList(*Self),
        alloc: mem.Allocator,

        fn init(alloc: mem.Allocator, id: []const u8, value: T) !Self {
            const children = std.ArrayList(*Self).init(alloc);
            return Self{
                .id = try alloc.dupe(u8, id),
                .value = value,
                .children = children,
                .alloc = alloc,
            };
        }

        fn deinit(self: Self) void {
            self.alloc.free(self.id);
            self.children.deinit();
        }

        pub fn getDependencyBuildOrder(self: *Self) ![]*Self {
            var existence_set = std.BufSet.init(self.alloc);
            defer existence_set.deinit();
            var results = try std.ArrayList(*Self).initCapacity(self.alloc, self.children.items.len);
            defer results.deinit();

            for (self.children.items) |child| {
                try child.depthFirstSearch(&existence_set, &results);
            }

            return try results.toOwnedSlice();
        }

        fn depthFirstSearch(self: *Self, existence: *std.BufSet, result: *std.ArrayList(*Self)) !void {
            if (existence.contains(self.id)) return;
            try existence.insert(self.id);

            var list = try std.ArrayList(*Self).initCapacity(self.alloc, self.children.items.len);
            defer list.deinit();

            for (self.children.items) |child| {
                try child.depthFirstSearch(existence, result);
            }
            try result.append(self);
        }

        pub fn print(self: *Self, writer: anytype, depth: usize) !void {
            // Print current node
            try writer.writeByteNTimes(' ', depth * 2);
            try writer.print("- {s}{s}{s}\n", .{ colors.cyan, self.id, colors.reset });

            // Print children
            for (self.children.items) |child| {
                try child.print(writer, depth + 1);
            }
        }
    };
}

test "expect getDependencyBuildOrder to return non-duplicate dependencies in the correct build order" {
    var root = try Node(u8).init(std.testing.allocator, "root", 0);
    defer root.deinit();
    var a = try Node(u8).init(std.testing.allocator, "a", 0);
    defer a.deinit();
    var b = try Node(u8).init(std.testing.allocator, "b", 0);
    defer b.deinit();
    var c = try Node(u8).init(std.testing.allocator, "c", 0);
    defer c.deinit();

    try root.children.append(&b);
    try root.children.append(&a);
    try root.children.append(&c);

    try a.children.append(&b);
    try a.children.append(&c);

    try b.children.append(&c);

    const expected = &[_]*Node(u8){ &c, &b, &a };
    const actual = try root.getDependencyBuildOrder();
    defer std.testing.allocator.free(actual);

    try std.testing.expectEqualSlices(*Node(u8), expected, actual);
}
