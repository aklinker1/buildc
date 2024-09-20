const std = @import("std");
const mem = std.mem;

pub const Ctx = struct {
    allocator: mem.Allocator,
    is_debug: bool,
    buildc_args: []const []const u8,
    cmd_args: []const []const u8,
};
