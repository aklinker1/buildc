const std = @import("std");
const json = std.json;
const builtin = @import("builtin");

pub fn build(b: *std.Build) !void {
    const required_zig_version = try std.SemanticVersion.parse("0.13.0");
    if (std.SemanticVersion.order(builtin.zig_version, required_zig_version) != .eq) {
        std.debug.print("Buildc requires Zig 0.13.0, got {}", .{builtin.zig_version});
        return error.InvalidZigVersion;
    }

    // Options

    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Version

    const version_json = @embedFile("package.json");
    var parsed = json.parseFromSlice(std.json.Value, b.allocator, version_json, .{}) catch unreachable;
    defer parsed.deinit();
    const version_str = parsed.value.object.get("version").?.string;
    var version = try std.SemanticVersion.parse(version_str);
    version.build = b.run(&.{ "git", "rev-parse", "--short", "HEAD" })[0..7];

    const options = b.addOptions();
    options.addOption(std.SemanticVersion, "version", version);

    // Executable

    const exe = b.addExecutable(.{
        .name = "buildc",
        .root_source_file = b.path("src/buildc.zig"),
        .target = target,
        .optimize = optimize,
        .version = version,
    });
    exe.root_module.addOptions("config", options);
    b.installArtifact(exe);
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }
    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    // Tests

    const exe_unit_tests = b.addTest(.{
        .root_source_file = b.path("src/tree.zig"),
        .target = target,
        .optimize = optimize,
    });
    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_exe_unit_tests.step);
}
