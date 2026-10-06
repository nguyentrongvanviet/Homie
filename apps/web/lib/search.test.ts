import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FILTERS, searchParams } from "./contracts";
import { filterRooms, parseQuery, QueryError } from "./search";
import { seedRooms } from "./seed";
import { getStore, patchRoom, resetStore } from "./store";
import { isSameOrigin } from "./same-origin";

test("bbox selects exactly the rooms inside the visible map", () => {
  const rooms = seedRooms();
  const bounds = { west: 106.66, east: 106.671, south: 10.765, north: 10.78 };
  assert.deepEqual(
    filterRooms(rooms, DEFAULT_FILTERS, bounds).map((r) => r.id),
    ["room-11", "room-12", "room-13"],
  );
});

test("combines district, price, area and ALL selected amenities", () => {
  const filters = {
    ...DEFAULT_FILTERS,
    district: "Bình Thạnh",
    maxPrice: 4500000,
    minArea: 25,
    amenities: ["aircon", "balcony"] as const,
  };
  assert.deepEqual(
    filterRooms(seedRooms(), {
      ...filters,
      amenities: [...filters.amenities],
    }).map((r) => r.id),
    ["room-01"],
  );
});

test("Vietnamese search also works without accents", () => {
  const result = filterRooms(seedRooms(), {
    ...DEFAULT_FILTERS,
    q: "nguyen gia tri",
  });
  assert.deepEqual(
    result.map((r) => r.id),
    ["room-01"],
  );
});

test("rejects malformed filters and inverted coordinate bounds", () => {
  for (const query of [
    "bbox=106,11,105,10",
    "bbox=1,2,3,",
    "maxPrice=NaN",
    "amenities=secret",
    "sort=bad",
    "availableOnly=yes",
  ]) {
    assert.throws(() => parseQuery(new URLSearchParams(query)), QueryError);
  }
});

test("roundtrips the shared list/map filter contract and sorts stably", () => {
  const filters = {
    ...DEFAULT_FILTERS,
    sort: "price_asc" as const,
    district: "Quận 10",
  };
  const parsed = parseQuery(searchParams(filters));
  assert.deepEqual(parsed.filters, filters);
  assert.deepEqual(
    filterRooms(seedRooms(), filters).map((r) => r.id),
    ["room-13", "room-11", "room-12"],
  );
});

test("server revision increments; stale room versions cannot overwrite changes", () => {
  resetStore();
  const room = { ...getStore().rooms[0] };
  const before = getStore().revision;
  const result = patchRoom(room.id, room.version, {
    status: "RENTED",
    price: 4000000,
  });
  assert.ok("room" in result);
  assert.equal(getStore().revision, before + 1);
  assert.ok(
    !filterRooms(getStore().rooms, DEFAULT_FILTERS).some(
      (r) => r.id === room.id,
    ),
  );
  assert.ok(
    filterRooms(getStore().rooms, {
      ...DEFAULT_FILTERS,
      availableOnly: false,
    }).some((r) => r.id === room.id),
  );
  assert.deepEqual(patchRoom(room.id, room.version, { price: 3000000 }), {
    error: "VERSION_CONFLICT",
  });
  resetStore();
});

test("demo mutations require an Origin matching the actual browser Host", () => {
  const request = (origin: string) =>
    new Request("http://localhost:3000/api/v1/demo/reset", {
      headers: { host: "127.0.0.1:3000", origin },
    });
  assert.equal(isSameOrigin(request("http://127.0.0.1:3000")), true);
  assert.equal(isSameOrigin(request("https://unrelated.example")), false);
  assert.equal(isSameOrigin(request("https://127.0.0.1:3000")), false);
  assert.equal(isSameOrigin(request("null")), false);
  assert.equal(isSameOrigin(new Request("http://localhost:3000")), false);
});
