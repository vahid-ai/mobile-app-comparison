//! Pulse Events — the app core in Zig, ported from the original
//! TypeScript core (core.ts) so the app can build for mobile targets:
//! the SDK's mobile embed library only supports Zig cores today.
//!
//! The port IS the @native-sdk/core transpiler's own emission of that
//! core.ts (mapping rules R1-R18 are the subset spec's), committed to
//! the tree verbatim: same Model/Msg/update, same helper names the
//! markup binds, same commit semantics. The rt kernel beside it
//! (rt.zig) provides the frame arena and the two-space committed-model
//! heap the emitted code allocates through.

const std = @import("std");
pub const rt = @import("rt.zig").default;

// R2: integer-inferred `number` -> i64; `.length` reads widen to i64.
inline fn jlen(bytes: []const u8) i64 {
    return @intCast(bytes.len);
}

// R2: i64 -> usize at every memory-index site (checked in safe builds).
inline fn uz(v: i64) usize {
    return @intCast(v);
}

// R9: JS bitwise applies ToInt32 to each operand and yields that signed
// 32-bit result. Sites whose operands are provably in range emit the plain
// i64 operators instead (identical result, no wrap).
inline fn jsAnd(a: i64, b: i64) i64 {
    return @as(i32, @truncate(a)) & @as(i32, @truncate(b));
}

inline fn jsOr(a: i64, b: i64) i64 {
    return @as(i32, @truncate(a)) | @as(i32, @truncate(b));
}

inline fn jsXor(a: i64, b: i64) i64 {
    return @as(i32, @truncate(a)) ^ @as(i32, @truncate(b));
}

// R9: JS shifts wrap the value to 32 bits and mask the count & 31; `<<`
// and `>>` yield the signed 32-bit result, `>>>` the unsigned one.
inline fn jsShl(a: i64, b: i64) i64 {
    const n: u5 = @intCast(@as(u32, @bitCast(@as(i32, @truncate(b)))) & 31);
    return @as(i32, @bitCast(@as(u32, @bitCast(@as(i32, @truncate(a)))) << n));
}

inline fn jsShr(a: i64, b: i64) i64 {
    const n: u5 = @intCast(@as(u32, @bitCast(@as(i32, @truncate(b)))) & 31);
    return @as(i32, @truncate(a)) >> n;
}

inline fn jsUshr(a: i64, b: i64) i64 {
    const n: u5 = @intCast(@as(u32, @bitCast(@as(i32, @truncate(b)))) & 31);
    return @as(u32, @bitCast(@as(i32, @truncate(a)))) >> n;
}

inline fn jsBitNot(a: i64) i64 {
    return ~@as(i32, @truncate(a));
}

// R8: JS `**` differs from libm pow on two corners it defines itself:
// a NaN exponent is NaN even for base 1, and (+-1) ** (+-Infinity) is NaN.
fn jsPow(a: f64, b: f64) f64 {
    if (std.math.isNan(b)) return std.math.nan(f64);
    if ((a == 1 or a == -1) and std.math.isInf(b)) return std.math.nan(f64);
    return std.math.pow(f64, a, b);
}

// R5b: two string-literal unions overlap as string sets, so equality across
// them compares the underlying literal names — resolved per member at compile
// time (no runtime string work). null on an optional side equals only null.
fn tagEq(a: anytype, b: anytype) bool {
    if (@typeInfo(@TypeOf(b)) == .optional) return if (b) |v| tagEq(a, v) else tagIsNull(a);
    if (@typeInfo(@TypeOf(a)) == .optional) return if (a) |v| tagEq(v, b) else false;
    switch (a) {
        inline else => |v| {
            if (!@hasField(@TypeOf(b), @tagName(v))) return false;
            return b == @field(@TypeOf(b), @tagName(v));
        },
    }
}

fn tagIsNull(a: anytype) bool {
    if (@typeInfo(@TypeOf(a)) == .optional) return a == null;
    return false;
}

// R5b: assigning across literal unions re-tags the value by literal name
// (the TypeScript checker has already proven the member exists there).
fn tagCast(comptime T: type, v: anytype) if (@typeInfo(@TypeOf(v)) == .optional) ?T else T {
    if (@typeInfo(@TypeOf(v)) == .optional) return if (v) |x| tagCast(T, x) else null;
    switch (v) {
        inline else => |tag| return @field(T, @tagName(tag)),
    }
}

// JS `===` on strings compares contents, and null equals only null. The
// emitter routes string-typed (never bytes-typed) equality through here.
fn strEq(a: anytype, b: anytype) bool {
    if (@typeInfo(@TypeOf(a)) == .optional) return if (a) |v| strEq(v, b) else strIsNull(b);
    if (@typeInfo(@TypeOf(b)) == .optional) return if (b) |v| strEq(a, v) else false;
    return std.mem.eql(u8, a, b);
}

fn strIsNull(b: anytype) bool {
    if (@typeInfo(@TypeOf(b)) == .optional) return b == null;
    return false;
}

// JS `===` on numbers whose machine classes diverge (an optional i64
// slot against an f64 value): unwrap optionals with the JS truth table
// (null equals only null, never a number) and widen the integer side
// exactly, so the comparison is IEEE f64 equality — node's semantics.
fn numEq(a: anytype, b: anytype) bool {
    if (@typeInfo(@TypeOf(a)) == .optional) return if (a) |v| numEq(v, b) else numIsNull(b);
    if (@typeInfo(@TypeOf(b)) == .optional) return if (b) |v| numEq(a, v) else false;
    const av: f64 = if (@TypeOf(a) == i64) @floatFromInt(a) else a;
    const bv: f64 = if (@TypeOf(b) == i64) @floatFromInt(b) else b;
    return av == bv;
}

fn numIsNull(b: anytype) bool {
    if (@typeInfo(@TypeOf(b)) == .optional) return b == null;
    return false;
}

const empty_bytes: []const u8 = &.{};

// Model forwarders call the module-level helpers through this alias:
// inside the Model struct an unqualified helper name would resolve to
// the forwarder itself.
const core_root = @This();

pub const Bytes = []const u8;

pub const Tab = enum(u8) { discover = 0, map = 1, calendar = 2, you = 3, detail = 4 };

pub const Cat = enum(u8) { all = 0, tonight = 1, house = 2, techno = 3, free = 4 };

pub const Rsvp = enum(u8) { none = 0, interested = 1, going = 2 };

// ---------------------------------------------------------------------------
// Catalog (const tables — rodata, shared for free at commit)
pub const EventInfo = struct {
    id: i64,
    title: Bytes,
    venue: Bytes,
    area: Bytes,
    day: i64,
    time: Bytes,
    timeShort: Bytes,
    ampm: Bytes,
    cat: Cat,
    catLabel: Bytes,
    price: Bytes,
    free: bool,
    dist: Bytes,
    att: i64,
    friends: i64,
    host: Bytes,
    hostInit: Bytes,
    about: Bytes,
    pinLeft: i64,
    pinTop: i64,
    pinSize: i64,
};

const EVENTS: []const EventInfo = &.{ .{ .id = 1, .title = "Neon Warehouse", .venue = "Basement Nine", .area = "Bushwick", .day = 21, .time = "11:00 PM", .timeShort = "11:00", .ampm = "PM", .cat = .techno, .catLabel = "Techno", .price = "$25", .free = false, .dist = "0.8 mi", .att = 342, .friends = 12, .host = "Maya Reyes", .hostInit = "MR", .about = "Three rooms, two floors, one night. Bushwick's biggest warehouse rave returns with a raw industrial sound system and visuals until sunrise. 21+, dress to move.", .pinLeft = 105, .pinTop = 210, .pinSize = 44 }, .{ .id = 2, .title = "Rooftop Sunset Sessions", .venue = "The Aerie", .area = "Williamsburg", .day = 24, .time = "6:30 PM", .timeShort = "6:30", .ampm = "PM", .cat = .house, .catLabel = "Rooftop", .price = "$15", .free = false, .dist = "1.2 mi", .att = 128, .friends = 10, .host = "Dev & Zoe", .hostInit = "DZ", .about = "Golden-hour house music with skyline views. Natural wine bar, low-key sets, and the best sunset in Brooklyn. Come early - the roof fills fast.", .pinLeft = 224, .pinTop = 175, .pinSize = 38 }, .{ .id = 3, .title = "Vinyl Nights: Disco", .venue = "Groove Room", .area = "Bushwick", .day = 25, .time = "10:00 PM", .timeShort = "10:00", .ampm = "PM", .cat = .house, .catLabel = "House", .price = "Free", .free = true, .dist = "0.5 mi", .att = 96, .friends = 8, .host = "Kai Tran", .hostInit = "KT", .about = "All vinyl, all disco, all night. A tight basement room, a wall of records, and no phones on the floor. Free entry before 11.", .pinLeft = 161, .pinTop = 330, .pinSize = 36 }, .{ .id = 4, .title = "Afterhours: Deep Cuts", .venue = "Cellar 33", .area = "East Williamsburg", .day = 22, .time = "2:00 AM", .timeShort = "2:00", .ampm = "AM", .cat = .techno, .catLabel = "Techno", .price = "$20", .free = false, .dist = "2.0 mi", .att = 210, .friends = 12, .host = "Priya N.", .hostInit = "PN", .about = "When everything else closes, this opens. Deep, hypnotic techno in a candle-lit cellar for the ones who never go home. Members + guests.", .pinLeft = 266, .pinTop = 350, .pinSize = 40 }, .{ .id = 5, .title = "Y2K Throwback Rave", .venue = "Palace Hall", .area = "Ridgewood", .day = 26, .time = "9:00 PM", .timeShort = "9:00", .ampm = "PM", .cat = .all, .catLabel = "Live", .price = "$30", .free = false, .dist = "3.1 mi", .att = 540, .friends = 12, .host = "Leo M.", .hostInit = "LM", .about = "2000s bangers, butterfly clips, and a giant disco ball. Full live PA, throwback visuals, and a costume contest at midnight. Dress the decade.", .pinLeft = 63, .pinTop = 375, .pinSize = 42 }, .{ .id = 6, .title = "Backyard Beats & BBQ", .venue = "The Lot", .area = "Bushwick", .day = 22, .time = "4:00 PM", .timeShort = "4:00", .ampm = "PM", .cat = .house, .catLabel = "House", .price = "Free", .free = true, .dist = "0.9 mi", .att = 74, .friends = 7, .host = "Nia B.", .hostInit = "NB", .about = "Day party done right. Smoky grills, a garden sound system, and easy house grooves till sundown. Bring a friend, BYO good vibes.", .pinLeft = 182, .pinTop = 260, .pinSize = 34 } };

const CatInfo = struct { tag: Cat, label: Bytes };

const CATS: []const CatInfo = &.{ .{ .tag = .all, .label = "All" }, .{ .tag = .tonight, .label = "Tonight" }, .{ .tag = .house, .label = "House" }, .{ .tag = .techno, .label = "Techno" }, .{ .tag = .free, .label = "Free" } };

const DayName = struct { name: Bytes };

// July 1, 2026 is a Wednesday: weekday(d) = DAY_NAMES[(2 + d) % 7].
const DAY_NAMES: []const DayName = &.{ .{ .name = "Sunday" }, .{ .name = "Monday" }, .{ .name = "Tuesday" }, .{ .name = "Wednesday" }, .{ .name = "Thursday" }, .{ .name = "Friday" }, .{ .name = "Saturday" } };

const PoolInitials = struct { init: Bytes };

// The attendee-avatar initials pool the design cycles through.
const POOL: []const PoolInitials = &.{ .{ .init = "MR" }, .{ .init = "DZ" }, .{ .init = "KT" }, .{ .init = "PA" }, .{ .init = "LM" }, .{ .init = "NB" }, .{ .init = "JS" } };

pub const GroupRow = struct {
    id: i64,
    init: Bytes,
    name: Bytes,
    members: i64,
    note: Bytes,
};

const GROUPS: []const GroupRow = &.{ .{ .id = 1, .init = "BR", .name = "Bushwick Ravers", .members = 1240, .note = "3 events this week" }, .{ .id = 2, .init = "RC", .name = "Rooftop Crew", .members = 86, .note = "New party Fri" }, .{ .id = 3, .init = "TH", .name = "Techno Heads", .members = 512, .note = "12 online now" }, .{ .id = 4, .init = "DP", .name = "Day Party Club", .members = 203, .note = "Planning brunch" } };

pub const ChatRow = struct {
    id: i64,
    init: Bytes,
    name: Bytes,
    last: Bytes,
    when: Bytes,
    unread: i64,
    hasUnread: bool,
};

const CHATS: []const ChatRow = &.{ .{ .id = 1, .init = "BR", .name = "Bushwick Ravers", .last = "Maya: who's pre-gaming before Neon?", .when = "2m", .unread = 5, .hasUnread = true }, .{ .id = 2, .init = "RC", .name = "Rooftop Crew", .last = "Dev: got 4 tickets, need 2 more", .when = "18m", .unread = 2, .hasUnread = true }, .{ .id = 3, .init = "TH", .name = "Techno Heads", .last = "You: see everyone at Cellar 33", .when = "1h", .unread = 0, .hasUnread = false } };

const LABEL_JOIN: Bytes = "Join";

const LABEL_GOING: Bytes = "Going";

const LABEL_SAVED: Bytes = "Saved";

// ---------------------------------------------------------------------------
// Model
pub const RsvpEntry = struct { id: i64, status: Rsvp };

pub const FollowEntry = struct { id: i64, on: bool };

pub const Model = struct {
    tab: Tab,
    prevTab: Tab,
    selectedId: i64,
    mapSelId: i64,
    cat: Cat,
    selectedDay: i64,
    rsvps: []const *const RsvpEntry,
    follows: []const *const FollowEntry,

    pub fn isDiscover(self: *const Model) bool {
        return core_root.isDiscover(self);
    }
    pub fn isMap(self: *const Model) bool {
        return core_root.isMap(self);
    }
    pub fn isCalendar(self: *const Model) bool {
        return core_root.isCalendar(self);
    }
    pub fn isYou(self: *const Model) bool {
        return core_root.isYou(self);
    }
    pub fn isDetail(self: *const Model) bool {
        return core_root.isDetail(self);
    }
    pub fn showTabbar(self: *const Model) bool {
        return core_root.showTabbar(self);
    }
    pub fn catRows(self: *const Model) []const CatRowView {
        return core_root.catRows(self);
    }
    pub fn feedRows(self: *const Model) []const FeedRow {
        return core_root.feedRows(self);
    }
    pub fn featuredId(self: *const Model) i64 {
        return core_root.featuredId(self);
    }
    pub fn featuredTitle(self: *const Model) Bytes {
        return core_root.featuredTitle(self);
    }
    pub fn featuredVenue(self: *const Model) Bytes {
        return core_root.featuredVenue(self);
    }
    pub fn featuredTime(self: *const Model) Bytes {
        return core_root.featuredTime(self);
    }
    pub fn featuredAtt(self: *const Model) i64 {
        return core_root.featuredAtt(self);
    }
    pub fn mapPins(self: *const Model) []const MapPin {
        return core_root.mapPins(self);
    }
    pub fn mapCards(self: *const Model) []const MapCard {
        return core_root.mapCards(self);
    }
    pub fn mapCount(self: *const Model) i64 {
        return core_root.mapCount(self);
    }
    pub fn mapSelTitle(self: *const Model) Bytes {
        return core_root.mapSelTitle(self);
    }
    pub fn mapSelVenue(self: *const Model) Bytes {
        return core_root.mapSelVenue(self);
    }
    pub fn mapSelDist(self: *const Model) Bytes {
        return core_root.mapSelDist(self);
    }
    pub fn mapSelTime(self: *const Model) Bytes {
        return core_root.mapSelTime(self);
    }
    pub fn mapSelAtt(self: *const Model) i64 {
        return core_root.mapSelAtt(self);
    }
    pub fn calCells(self: *const Model) []const CalCell {
        return core_root.calCells(self);
    }
    pub fn selectedDayName(self: *const Model) Bytes {
        return core_root.selectedDayName(self);
    }
    pub fn dayRows(self: *const Model) []const DayRow {
        return core_root.dayRows(self);
    }
    pub fn hasDayEvents(self: *const Model) bool {
        return core_root.hasDayEvents(self);
    }
    pub fn noDayEvents(self: *const Model) bool {
        return core_root.noDayEvents(self);
    }
    pub fn groupRows(self: *const Model) []const GroupRow {
        return core_root.groupRows(self);
    }
    pub fn chatRows(self: *const Model) []const ChatRow {
        return core_root.chatRows(self);
    }
    pub fn selTitle(self: *const Model) Bytes {
        return core_root.selTitle(self);
    }
    pub fn selCatLabel(self: *const Model) Bytes {
        return core_root.selCatLabel(self);
    }
    pub fn selVenue(self: *const Model) Bytes {
        return core_root.selVenue(self);
    }
    pub fn selArea(self: *const Model) Bytes {
        return core_root.selArea(self);
    }
    pub fn selDist(self: *const Model) Bytes {
        return core_root.selDist(self);
    }
    pub fn selTime(self: *const Model) Bytes {
        return core_root.selTime(self);
    }
    pub fn selDateNum(self: *const Model) i64 {
        return core_root.selDateNum(self);
    }
    pub fn selDayName(self: *const Model) Bytes {
        return core_root.selDayName(self);
    }
    pub fn selHost(self: *const Model) Bytes {
        return core_root.selHost(self);
    }
    pub fn selHostInit(self: *const Model) Bytes {
        return core_root.selHostInit(self);
    }
    pub fn selAbout(self: *const Model) Bytes {
        return core_root.selAbout(self);
    }
    pub fn selAtt(self: *const Model) i64 {
        return core_root.selAtt(self);
    }
    pub fn selFriends(self: *const Model) i64 {
        return core_root.selFriends(self);
    }
    pub fn selOthers(self: *const Model) i64 {
        return core_root.selOthers(self);
    }
    pub fn selGoing(self: *const Model) bool {
        return core_root.selGoing(self);
    }
    pub fn selInterested(self: *const Model) bool {
        return core_root.selInterested(self);
    }
    pub fn selFollowed(self: *const Model) bool {
        return core_root.selFollowed(self);
    }
    pub const view_unbound = .{ "tab", "prevTab", "selectedId", "cat", "rsvps", "follows" };
};

pub fn initialModel() *const Model {
    return rt.frameCreate(Model, .{
        .tab = .discover,
        .prevTab = .discover,
        .selectedId = 1,
        .mapSelId = 2,
        .cat = .all,
        .selectedDay = 21,
        .rsvps = &.{},
        .follows = &.{},
    });
}

// Update-only state nothing in markup binds directly (helpers derive from it).

// ---------------------------------------------------------------------------
// Msg + update
pub const Msg = union(enum) {
    go_discover,
    go_map,
    go_calendar,
    go_you,
    open_event: i64,
    back,
    pick_cat: Cat,
    pick_day: i64,
    pick_pin: i64,
    join_event: i64,
    toggle_going,
    toggle_interested,
    toggle_follow,
};

fn eventById(id: i64) EventInfo {
    var found: ?EventInfo = null;
    for (EVENTS) |e| {
        if (e.id == id) {
            found = e;
            break;
        }
    }
    return found orelse EVENTS[0];
}

fn rsvpOf(model: *const Model, id: i64) Rsvp {
    var entry_2: ?*const RsvpEntry = null;
    for (model.rsvps) |r| {
        if (r.id == id) {
            entry_2 = r;
            break;
        }
    }
    const entry = entry_2;
    return if (entry) |entry_3| entry_3.status else .none;
}

// Toggle semantics from the design: setting the status you already have
// clears it; setting the other one replaces it.
fn toggleRsvp(model: *const Model, id: i64, status: Rsvp) *const Model {
    const current = rsvpOf(model, id);
    const next: Rsvp = if (current == status) .none else status;
    var any_match = false;
    for (model.rsvps) |r| {
        if (r.id == id) {
            any_match = true;
            break;
        }
    }
    if (!any_match) {
        const rsvps_2 = rt.frameAlloc(*const RsvpEntry, model.rsvps.len + 1);
        @memcpy(rsvps_2[0..model.rsvps.len], model.rsvps);
        rsvps_2[model.rsvps.len] = rt.frameCreate(RsvpEntry, .{ .id = id, .status = next });
        const rsvps = rsvps_2;
        const out = rt.frameCreate(Model, model.*);
        out.rsvps = rsvps;
        return out;
    }
    const out_2 = rt.frameCreate(Model, model.*);
    const rsvps_3 = rt.frameAlloc(*const RsvpEntry, model.rsvps.len);
    for (model.rsvps, 0..) |r_2, i| {
        if (r_2.id == id) {
            rsvps_3[i] = rt.frameCreate(RsvpEntry, .{ .id = r_2.id, .status = next });
        } else {
            rsvps_3[i] = r_2;
        }
    }
    out_2.rsvps = rsvps_3;
    return out_2;
}

fn followOf(model: *const Model, id: i64) bool {
    var entry_2: ?*const FollowEntry = null;
    for (model.follows) |f| {
        if (f.id == id) {
            entry_2 = f;
            break;
        }
    }
    const entry = entry_2;
    return if (entry) |entry_3| entry_3.on else false;
}

pub fn update(model: *const Model, msg: Msg) *const Model {
    switch (msg) {
        .go_discover => {
            const out = rt.frameCreate(Model, model.*);
            out.tab = .discover;
            out.prevTab = .discover;
            return out;
        },
        .go_map => {
            const out_2 = rt.frameCreate(Model, model.*);
            out_2.tab = .map;
            out_2.prevTab = .map;
            return out_2;
        },
        .go_calendar => {
            const out_3 = rt.frameCreate(Model, model.*);
            out_3.tab = .calendar;
            out_3.prevTab = .calendar;
            return out_3;
        },
        .go_you => {
            const out_4 = rt.frameCreate(Model, model.*);
            out_4.tab = .you;
            out_4.prevTab = .you;
            return out_4;
        },
        .open_event => |id| {
            const out_5 = rt.frameCreate(Model, model.*);
            out_5.tab = .detail;
            out_5.selectedId = id;
            out_5.prevTab = if (model.tab == .detail) model.prevTab else model.tab;
            return out_5;
        },
        .back => {
            const out_6 = rt.frameCreate(Model, model.*);
            out_6.tab = model.prevTab;
            return out_6;
        },
        .pick_cat => |cat| {
            const out_7 = rt.frameCreate(Model, model.*);
            out_7.cat = cat;
            return out_7;
        },
        .pick_day => |day| {
            const out_8 = rt.frameCreate(Model, model.*);
            out_8.selectedDay = day;
            return out_8;
        },
        .pick_pin => |id_2| {
            const out_9 = rt.frameCreate(Model, model.*);
            out_9.mapSelId = id_2;
            return out_9;
        },
        .join_event => |id_3| return toggleRsvp(model, id_3, .going),
        .toggle_going => return toggleRsvp(model, model.selectedId, .going),
        .toggle_interested => return toggleRsvp(model, model.selectedId, .interested),
        .toggle_follow => {
            const id_4 = model.selectedId;
            var any_match = false;
            for (model.follows) |f| {
                if (f.id == id_4) {
                    any_match = true;
                    break;
                }
            }
            if (!any_match) {
                const follows_2 = rt.frameAlloc(*const FollowEntry, model.follows.len + 1);
                @memcpy(follows_2[0..model.follows.len], model.follows);
                follows_2[model.follows.len] = rt.frameCreate(FollowEntry, .{ .id = id_4, .on = true });
                const follows = follows_2;
                const out_10 = rt.frameCreate(Model, model.*);
                out_10.follows = follows;
                return out_10;
            }
            const out_11 = rt.frameCreate(Model, model.*);
            const follows_3 = rt.frameAlloc(*const FollowEntry, model.follows.len);
            for (model.follows, 0..) |f_2, i| {
                if (f_2.id == id_4) {
                    follows_3[i] = rt.frameCreate(FollowEntry, .{ .id = f_2.id, .on = !f_2.on });
                } else {
                    follows_3[i] = f_2;
                }
            }
            out_11.follows = follows_3;
            return out_11;
        },
    }
}

// ---------------------------------------------------------------------------
// Screen flags
pub fn isDiscover(model: *const Model) bool {
    return model.tab == .discover;
}

pub fn isMap(model: *const Model) bool {
    return model.tab == .map;
}

pub fn isCalendar(model: *const Model) bool {
    return model.tab == .calendar;
}

pub fn isYou(model: *const Model) bool {
    return model.tab == .you;
}

pub fn isDetail(model: *const Model) bool {
    return model.tab == .detail;
}

pub fn showTabbar(model: *const Model) bool {
    return model.tab != .detail;
}

// ---------------------------------------------------------------------------
// Discover
pub const CatRowView = struct {
    tag: Cat,
    label: Bytes,
    active: bool,
};

pub fn catRows(model: *const Model) []const CatRowView {
    const mapped = rt.frameAlloc(CatRowView, CATS.len);
    for (CATS, 0..) |c, i| {
        mapped[i] = .{ .tag = c.tag, .label = c.label, .active = c.tag == model.cat };
    }
    return mapped;
}

pub const FeedRow = struct {
    id: i64,
    day: i64,
    title: Bytes,
    venue: Bytes,
    dist: Bytes,
    price: Bytes,
    att: i64,
    statusLabel: Bytes,
    joined: bool,
};

fn matchesCat(e: EventInfo, cat: Cat) bool {
    if (cat == .all) return true;
    if (cat == .tonight) return e.day == 21;
    if (cat == .free) return e.free;
    return e.cat == cat;
}

pub fn feedRows(model: *const Model) []const FeedRow {
    const kept = rt.frameAlloc(EventInfo, EVENTS.len);
    var kept_len: usize = 0;
    for (EVENTS) |e| {
        if (matchesCat(e, model.cat)) {
            kept[kept_len] = e;
            kept_len += 1;
        }
    }
    const mapped = rt.frameAlloc(FeedRow, kept[0..kept_len].len);
    for (kept[0..kept_len], 0..) |e_2, i| {
        const status = rsvpOf(model, e_2.id);
        mapped[i] = .{
            .id = e_2.id,
            .day = e_2.day,
            .title = e_2.title,
            .venue = e_2.venue,
            .dist = e_2.dist,
            .price = e_2.price,
            .att = e_2.att,
            .statusLabel = if (status == .going) LABEL_GOING else if (status == .interested) LABEL_SAVED else LABEL_JOIN,
            .joined = status == .going,
        };
    }
    return mapped;
}

pub fn featuredId(model: *const Model) i64 {
    _ = model;
    return EVENTS[0].id;
}

pub fn featuredTitle(model: *const Model) Bytes {
    _ = model;
    return EVENTS[0].title;
}

pub fn featuredVenue(model: *const Model) Bytes {
    _ = model;
    return EVENTS[0].venue;
}

pub fn featuredTime(model: *const Model) Bytes {
    _ = model;
    return EVENTS[0].time;
}

pub fn featuredAtt(model: *const Model) i64 {
    _ = model;
    return EVENTS[0].att;
}

// ---------------------------------------------------------------------------
// Map
pub const MapPin = struct {
    id: i64,
    title: Bytes,
    left: i64,
    top: i64,
    size: i64,
    selected: bool,
};

pub fn mapPins(model: *const Model) []const MapPin {
    const mapped = rt.frameAlloc(MapPin, EVENTS.len);
    for (EVENTS, 0..) |e, i| {
        mapped[i] = .{
            .id = e.id,
            .title = e.title,
            .left = e.pinLeft,
            .top = e.pinTop,
            .size = if (e.id == model.mapSelId) 52 else e.pinSize,
            .selected = e.id == model.mapSelId,
        };
    }
    return mapped;
}

pub const MapCard = struct {
    id: i64,
    title: Bytes,
    time: Bytes,
    dist: Bytes,
};

pub fn mapCards(model: *const Model) []const MapCard {
    _ = model;
    const copied_from = rt.sliceIndex(EVENTS.len, 0);
    const copied_to = @max(copied_from, rt.sliceIndex(EVENTS.len, 2));
    const copied = rt.frameAlloc(EventInfo, copied_to - copied_from);
    @memcpy(copied, EVENTS[copied_from..copied_to]);
    const mapped = rt.frameAlloc(MapCard, copied.len);
    for (copied, 0..) |e, i| {
        mapped[i] = .{ .id = e.id, .title = e.title, .time = e.time, .dist = e.dist };
    }
    return mapped;
}

pub fn mapCount(model: *const Model) i64 {
    _ = model;
    return @as(i64, @intCast(EVENTS.len));
}

pub fn mapSelTitle(model: *const Model) Bytes {
    return eventById(model.mapSelId).title;
}

pub fn mapSelVenue(model: *const Model) Bytes {
    return eventById(model.mapSelId).venue;
}

pub fn mapSelDist(model: *const Model) Bytes {
    return eventById(model.mapSelId).dist;
}

pub fn mapSelTime(model: *const Model) Bytes {
    return eventById(model.mapSelId).time;
}

pub fn mapSelAtt(model: *const Model) i64 {
    return eventById(model.mapSelId).att;
}

// ---------------------------------------------------------------------------
// Calendar
pub const CalCell = struct {
    key: i64,
    day: i64,
    blank: bool,
    selected: bool,
    dot: bool,
    label: Bytes,
};

pub fn calCells(model: *const Model) []const CalCell {
    var cells = rt.frameAlloc(CalCell, 0);
    var cells_len: usize = 0;
    var i: i64 = 0;
    while (i < 3) : (i += 1) {
        if (cells_len == cells.len) cells = rt.frameGrow(CalCell, cells);
        cells[cells_len] = .{ .key = i, .day = 0, .blank = true, .selected = false, .dot = false, .label = "" };
        cells_len += 1;
    }
    var d: i64 = 1;
    while (d <= 31) : (d += 1) {
        const sel = d == model.selectedDay;
        var has_2 = false;
        for (EVENTS) |e| {
            if (e.day == d) {
                has_2 = true;
                break;
            }
        }
        const has = has_2;
        const buf = rt.frameAlloc(u8, 25);
        const text = std.fmt.bufPrint(buf, "July {d}", .{ d }) catch unreachable;
        if (cells_len == cells.len) cells = rt.frameGrow(CalCell, cells);
        cells[cells_len] = .{
            .key = 3 + d,
            .day = d,
            .blank = false,
            .selected = sel,
            .dot = has and !sel,
            .label = text,
        };
        cells_len += 1;
    }
    if (cells_len == cells.len) cells = rt.frameGrow(CalCell, cells);
    cells[cells_len] = .{ .key = 40, .day = 0, .blank = true, .selected = false, .dot = false, .label = "" };
    cells_len += 1;
    return cells[0..cells_len];
}

pub fn selectedDayName(model: *const Model) Bytes {
    return DAY_NAMES[uz(@rem((2 + model.selectedDay), 7))].name;
}

pub const DayRow = struct {
    id: i64,
    timeShort: Bytes,
    ampm: Bytes,
    title: Bytes,
    venue: Bytes,
    dist: Bytes,
    att: i64,
    @"i1": Bytes,
    @"i2": Bytes,
    @"i3": Bytes,
};

pub fn dayRows(model: *const Model) []const DayRow {
    const kept = rt.frameAlloc(EventInfo, EVENTS.len);
    var kept_len: usize = 0;
    for (EVENTS) |e| {
        if (e.day == model.selectedDay) {
            kept[kept_len] = e;
            kept_len += 1;
        }
    }
    const mapped = rt.frameAlloc(DayRow, kept[0..kept_len].len);
    for (kept[0..kept_len], 0..) |e_2, i| {
        mapped[i] = .{
            .id = e_2.id,
            .timeShort = e_2.timeShort,
            .ampm = e_2.ampm,
            .title = e_2.title,
            .venue = e_2.venue,
            .dist = e_2.dist,
            .att = e_2.att,
            .@"i1" = POOL[uz(@rem(e_2.id, 7))].init,
            .@"i2" = POOL[uz(@rem((e_2.id + 1), 7))].init,
            .@"i3" = POOL[uz(@rem((e_2.id + 2), 7))].init,
        };
    }
    return mapped;
}

pub fn hasDayEvents(model: *const Model) bool {
    var any_match = false;
    for (EVENTS) |e| {
        if (e.day == model.selectedDay) {
            any_match = true;
            break;
        }
    }
    return any_match;
}

pub fn noDayEvents(model: *const Model) bool {
    var any_match = false;
    for (EVENTS) |e| {
        if (e.day == model.selectedDay) {
            any_match = true;
            break;
        }
    }
    return !any_match;
}

// ---------------------------------------------------------------------------
// You
pub fn groupRows(model: *const Model) []const GroupRow {
    _ = model;
    return GROUPS;
}

pub fn chatRows(model: *const Model) []const ChatRow {
    _ = model;
    return CHATS;
}

// ---------------------------------------------------------------------------
// Detail
pub fn selTitle(model: *const Model) Bytes {
    return eventById(model.selectedId).title;
}

pub fn selCatLabel(model: *const Model) Bytes {
    return eventById(model.selectedId).catLabel;
}

pub fn selVenue(model: *const Model) Bytes {
    return eventById(model.selectedId).venue;
}

pub fn selArea(model: *const Model) Bytes {
    return eventById(model.selectedId).area;
}

pub fn selDist(model: *const Model) Bytes {
    return eventById(model.selectedId).dist;
}

pub fn selTime(model: *const Model) Bytes {
    return eventById(model.selectedId).time;
}

pub fn selDateNum(model: *const Model) i64 {
    return eventById(model.selectedId).day;
}

pub fn selDayName(model: *const Model) Bytes {
    return DAY_NAMES[uz(@rem((2 + eventById(model.selectedId).day), 7))].name;
}

pub fn selHost(model: *const Model) Bytes {
    return eventById(model.selectedId).host;
}

pub fn selHostInit(model: *const Model) Bytes {
    return eventById(model.selectedId).hostInit;
}

pub fn selAbout(model: *const Model) Bytes {
    return eventById(model.selectedId).about;
}

pub fn selAtt(model: *const Model) i64 {
    return eventById(model.selectedId).att;
}

pub fn selFriends(model: *const Model) i64 {
    return eventById(model.selectedId).friends;
}

pub fn selOthers(model: *const Model) i64 {
    const e = eventById(model.selectedId);
    return e.att - e.friends;
}

pub fn selGoing(model: *const Model) bool {
    return rsvpOf(model, model.selectedId) == .going;
}

pub fn selInterested(model: *const Model) bool {
    return rsvpOf(model, model.selectedId) == .interested;
}

pub fn selFollowed(model: *const Model) bool {
    return followOf(model, model.selectedId);
}

// ------------------------------------------------------------------ commit
// Emitted from the Model's type shape: the commit walkers copy frame-arena
// nodes into the model heap and share everything already persistent.
//
// incremental: copy frame-resident nodes only — O(new nodes).
// full:        after a two-space flip, copy everything live — O(live model).

const CommitMode = enum { incremental, full };

// During a full (compacting) commit the flipped-away space must also be
// copied out of. Rodata/static pointers are in neither region: shared as-is.
var old_heap_base: usize = 0;
var old_heap_len: usize = 0;

fn inOldHeap(addr: usize) bool {
    return addr >= old_heap_base and addr < old_heap_base + old_heap_len;
}

inline fn shouldCopy(mode: CommitMode, ptr: anytype) bool {
    const addr = @intFromPtr(ptr);
    return switch (mode) {
        .incremental => rt.inFrame(addr),
        .full => rt.inFrame(addr) or inOldHeap(addr),
    };
}

fn commitRsvpEntry(value: *const RsvpEntry, mode: CommitMode) *const RsvpEntry {
    if (!shouldCopy(mode, value)) return value;
    return rt.heapCreate(RsvpEntry, .{
        .id = value.id,
        .status = value.status,
    });
}

fn commitRsvpEntrys(values: []const *const RsvpEntry, mode: CommitMode) []const *const RsvpEntry {
    if (values.len == 0) return &.{};
    if (!shouldCopy(mode, values.ptr)) return values;
    const out = rt.heapAlloc(*const RsvpEntry, values.len);
    for (values, 0..) |v, i| out[i] = commitRsvpEntry(v, mode);
    return out;
}

fn commitFollowEntry(value: *const FollowEntry, mode: CommitMode) *const FollowEntry {
    if (!shouldCopy(mode, value)) return value;
    return rt.heapCreate(FollowEntry, .{
        .id = value.id,
        .on = value.on,
    });
}

fn commitFollowEntrys(values: []const *const FollowEntry, mode: CommitMode) []const *const FollowEntry {
    if (values.len == 0) return &.{};
    if (!shouldCopy(mode, values.ptr)) return values;
    const out = rt.heapAlloc(*const FollowEntry, values.len);
    for (values, 0..) |v, i| out[i] = commitFollowEntry(v, mode);
    return out;
}

fn commitModel(value: *const Model, mode: CommitMode) *const Model {
    if (!shouldCopy(mode, value)) return value;
    return rt.heapCreate(Model, .{
        .tab = value.tab,
        .prevTab = value.prevTab,
        .selectedId = value.selectedId,
        .mapSelId = value.mapSelId,
        .cat = value.cat,
        .selectedDay = value.selectedDay,
        .rsvps = commitRsvpEntrys(value.rsvps, mode),
        .follows = commitFollowEntrys(value.follows, mode),
    });
}

/// Frame-end commit: returns the persistent model root; flips into a full
/// compacting copy when the heap passes its watermark.
pub fn commitModelRoot(next: *const Model) *const Model {
    const before = rt.heapUsed();
    if (before > rt.heap_watermark) {
        old_heap_base = rt.currentHeapBase();
        old_heap_len = rt.heap_cap;
        rt.heapFlip();
        rt.stat_compactions += 1;
        const committed = commitModel(next, .full);
        rt.stat_commit_last = rt.heapUsed();
        return committed;
    }
    const committed = commitModel(next, .incremental);
    rt.stat_commit_last = rt.heapUsed() - before;
    return committed;
}
