//! Pulse Events — app wiring for the Zig core (src/core.zig).
//!
//! The core keeps the committed-model convention its TypeScript original
//! transpiled to (pure `update` returning the next root, frame-arena
//! transients, `commitModelRoot` at every dispatch), so both hosts drive
//! it through `TsCoreHost`, the SDK's effect bridge for exactly that
//! convention:
//!
//!   desktop  `main` builds the app with `TsUiApp(core)` — the same
//!            adapter the TypeScript scaffold used — and runs it under
//!            the app runner. Scene/identity/security mirror app.zon.
//!   mobile   `Model`/`Msg`/`initModel`/`mobileOptions` satisfy the
//!            mobile embed host's contract (see the SDK's
//!            src/embed/ui_host.zig): the embed library compiles this
//!            module as its `"app"` import and pumps the same UiApp
//!            loop from the platform shim's frame callback.
//!
//! The view stays src/app.native (embedded, hot-reloaded in desktop
//! dev); the model contract — every name the markup binds — is the
//! core's, unchanged by the port.

const std = @import("std");
const native_sdk = @import("native_sdk");

pub const panic = std.debug.FullPanic(native_sdk.debug.capturePanic);

pub const core = @import("core.zig");

/// Re-exported for the model contract (`native check`), the mobile embed
/// host, and any test: the core's real surface.
pub const Model = core.Model;
pub const Msg = core.Msg;

pub const app_markup = @embedFile("app.native");

/// The committed-model bridge: every dispatch runs the core's cycle —
/// update, commit, frame-arena reset — and `model()` is the committed
/// root (valid until the next dispatch, exactly a view build's lifetime).
const Host = native_sdk.TsCoreHost(core);

// ------------------------------------------------------------------ scene
//
// The desktop scene, mirroring app.zon's `.shell` (a Zig core declares its
// scene in code; app.zon keeps declaring it for tooling and packaging):
// one phone-shaped window matching the design's 390x844 frame, one
// gpu_surface canvas filling it.

const canvas_label = "main-canvas";
const window_width: f32 = 390;
const window_height: f32 = 844;

const app_permissions = [_][]const u8{native_sdk.security.permission_view};
const shell_views = [_]native_sdk.ShellView{
    .{ .label = canvas_label, .kind = .gpu_surface, .fill = true, .role = "Pulse Events canvas", .accessibility_label = "Pulse Events", .gpu_backend = .metal, .gpu_pixel_format = .bgra8_unorm, .gpu_present_mode = .timer, .gpu_alpha_mode = .@"opaque", .gpu_color_space = .srgb, .gpu_vsync = true },
};
const shell_windows = [_]native_sdk.ShellWindow{.{
    .label = "main",
    .title = "Pulse Events",
    .width = window_width,
    .height = window_height,
    .min_width = window_width,
    .min_height = 700,
    .restore_state = false,
    .restore_policy = .center_on_primary,
    .views = &shell_views,
}};
const shell_scene: native_sdk.ShellConfig = .{ .windows = &shell_windows };

// ----------------------------------------------------------------- mobile
//
// The mobile embed host's app contract. The host constructs the UiApp
// from these options, sets `initModel()`'s value as the boot model, and
// pumps frames from the shim; update/init route through the same
// committed-model bridge the desktop adapter stamps.

const MobileApp = native_sdk.UiApp(Model, Msg);

pub fn initModel() Model {
    // Boot commits the core's initial model into the model heap; the
    // host holds a by-value copy whose slices point into that heap.
    Host.boot();
    return Host.model().*;
}

pub fn mobileOptions() MobileApp.Options {
    return .{
        .name = "pulse-events",
        .scene = native_sdk.embed.mobile_shell_scene,
        .canvas_label = native_sdk.embed.mobile_gpu_surface_label,
        .markup = .{ .source = app_markup },
        // app.zon's theme declaration, restated here: the mobile module
        // compiles without the manifest import the desktop runner has.
        .theme = .geist,
        .theme_accent = native_sdk.canvas.Color.rgb8(0xff, 0x5a, 0x2b),
        .update_fx = mobileUpdate,
        .init_fx = mobileInit,
    };
}

fn mobileUpdate(model: *Model, msg: Msg, fx: *MobileApp.Effects) void {
    Host.dispatch(fx, msg);
    model.* = Host.model().*;
}

fn mobileInit(model: *Model, fx: *MobileApp.Effects) void {
    Host.performBoot(fx);
    model.* = Host.model().*;
}

// ---------------------------------------------------------------- desktop

pub fn main(init: std.process.Init) !void {
    // Desktop-only modules resolve inside `main`: the mobile embed
    // library compiles this file without the `runner` import, and
    // nothing on the mobile export surface reaches this function.
    const runner = @import("runner");
    const Adapter = native_sdk.TsUiApp(core);

    const options: Adapter.Options = .{
        .name = "pulse-events",
        .scene = shell_scene,
        .canvas_label = canvas_label,
        .markup = .{ .source = app_markup, .watch_path = "src/app.native", .io = init.io },
        // app.zon's theme pack + one-accent brand override, resolved at
        // comptime by the runner (a bad value is a build error).
        .theme = comptime runner.manifestThemePack(),
        .theme_accent = comptime runner.manifestThemeAccent(),
    };

    // The app struct (and any real model) is multi-MB: `create`
    // heap-allocates and constructs in place, so neither rides the stack.
    const app_state = try Adapter.create(std.heap.page_allocator, .{}, options);
    defer app_state.destroy();

    try runner.runWithOptions(app_state.app(), .{
        .app_name = "pulse-events",
        .window_title = "Pulse Events",
        .bundle_id = "dev.pulse.events",
        .icon_path = "assets/icon.png",
        .default_frame = native_sdk.geometry.RectF.init(0, 0, window_width, window_height),
        .restore_state = false,
        .js_window_api = false,
        .security = .{
            .permissions = &app_permissions,
            .navigation = .{ .allowed_origins = &.{ "zero://inline", "zero://app" } },
        },
    }, init);
}
