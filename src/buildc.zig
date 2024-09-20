const std = @import("std");
const mem = std.mem;
const config = @import("config");
const c = @import("colors.zig");
const commands = @import("commands.zig");
const utils = @import("utils.zig");
const Ctx = utils.Ctx;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    const seperator = indexOf(args, "--");

    const buildc_args = if (seperator) |index| args[1..index] else args[1..];
    const cmd_args = if (seperator) |index| args[(index + 1)..] else args[0..0];

    if (arrayIncludesEither(buildc_args, "-v", "--version")) return printVersion();
    if (arrayIncludesEither(buildc_args, "-h", "--help")) return printHelp();

    const ctx = Ctx{
        .allocator = allocator,
        .is_debug = try isDebug(allocator),
        .cmd_args = cmd_args,
        .buildc_args = buildc_args,
    };

    // zig fmt: off
    return (
        if (buildc_args.len == 1 and arrayIncludes(buildc_args, "graph")) commands.graph(ctx)
        else if (buildc_args.len == 1 and arrayIncludes(buildc_args, "all")) commands.all(ctx)
        else if (buildc_args.len == 1 and arrayIncludes(buildc_args, "deps") and cmd_args.len > 0) commands.deps(ctx)
        else if (buildc_args.len == 0 and cmd_args.len > 0) commands.build(ctx)
        else std.debug.print("Unknown command. Run {s}buildc --help{s} for more details.\n", .{c.cyan, c.reset})
    ) catch |err| {
        // zig fmt: on
        std.debug.print("Unhandled error: {}\n", .{err});
        std.process.exit(1);
    };
}

fn printHelp() void {
    std.debug.print("{s}{s}Buildc{s} orchestrates and caches builds for JS monorepos. {s}({}){s}\n", .{ c.bold, c.blue, c.reset, c.dim, config.version, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("{s}Usage: buildc <command> {s}[...flags]{s} {s}-- [...args]{s}\n", .{ c.bold, c.cyan, c.reset, c.dim, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("{s}Commands:{s}\n", .{ c.bold, c.reset });
    std.debug.print("  {s}{s}     {s}    {s}-- unbuild{s}       Build dependencies and run the command, caching the result\n", .{ c.bold, c.blue, c.reset, c.dim, c.reset });
    std.debug.print("  {s}{s}deps {s}    {s}-- vitest {s}       Ensure dependencies are build before running the command\n", .{ c.bold, c.blue, c.reset, c.dim, c.reset });
    std.debug.print("  {s}{s}all  {s}    {s}          {s}       Build all packages in the monorepo, caching the results\n", .{ c.bold, c.blue, c.reset, c.dim, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("  {s}{s}graph{s}    {s}          {s}       Print the dependency graph\n", .{ c.bold, c.green, c.reset, c.dim, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("{s}Examples:{s}\n", .{ c.bold, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("  buildc -- unbuild                        {s}Run unbuild after building dependencies{s}\n", .{ c.dim, c.reset });
    std.debug.print("  buildc -- tsup --target=node --minify    {s}Run TSup with some CLI flags{s}\n", .{ c.dim, c.reset });
    std.debug.print("  buildc deps -- jest                      {s}Run tests after ensuring dependencies are built{s}\n", .{ c.dim, c.reset });
    std.debug.print("  buildc deps -- tsc --noEmit              {s}Check for type errors after ensuring dependencies are built{s}\n", .{ c.dim, c.reset });
    std.debug.print("  buildc all                               {s}Build all packages in the monorepo{s}\n", .{ c.dim, c.reset });
    std.debug.print("  buildc graph                             {s}Print the dependency graph{s}\n", .{ c.dim, c.reset });
    std.debug.print("\n", .{});
    std.debug.print("Learn more about Buildc:    {s}https://github.com/aklinker1/buildc{s}\n", .{ c.cyan, c.reset });
}

fn printVersion() void {
    std.debug.print("{}\n", .{config.version});
}

fn indexOf(array: [][]const u8, value: []const u8) ?usize {
    for (array, 0..) |item, i| {
        if (mem.eql(u8, value, item)) {
            return i;
        }
    }
    return null;
}

fn arrayIncludes(array: [][]const u8, value: []const u8) bool {
    for (array) |item| {
        if (mem.eql(u8, value, item)) {
            return true;
        }
    }
    return false;
}

fn arrayIncludesEither(array: [][]const u8, value1: []const u8, value2: []const u8) bool {
    for (array) |item| {
        if (mem.eql(u8, value1, item) or mem.eql(u8, value2, item)) {
            return true;
        }
    }
    return false;
}

/// Check to see if the DEBUG environment variable is set to "bunv"
pub fn isDebug(allocator: mem.Allocator) !bool {
    var env_map = try std.process.getEnvMap(allocator);
    defer env_map.deinit();

    if (env_map.get("DEBUG")) |value| {
        return mem.eql(u8, value, "bunv");
    }

    return false;
}
