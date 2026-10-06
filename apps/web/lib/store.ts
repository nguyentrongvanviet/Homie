import { seedRooms } from "./seed";
import type { Room } from "./contracts";

type DemoStore = { rooms: Room[]; revision: number; updatedAt: string };
const shared = globalThis as typeof globalThis & {
  __homieDemoStore?: DemoStore;
};
export function getStore(): DemoStore {
  shared.__homieDemoStore ??= {
    rooms: seedRooms(),
    revision: 1,
    updatedAt: new Date().toISOString(),
  };
  return shared.__homieDemoStore;
}
export function mutationsEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.HOMIE_ENABLE_DEMO_MUTATIONS === "true"
  );
}
export function patchRoom(
  id: string,
  version: number,
  changes: Partial<Pick<Room, "status" | "price">>,
) {
  const store = getStore();
  const room = store.rooms.find((r) => r.id === id);
  if (!room) return { error: "NOT_FOUND" } as const;
  if (room.version !== version) return { error: "VERSION_CONFLICT" } as const;
  Object.assign(room, changes, { version: room.version + 1 });
  store.revision++;
  store.updatedAt = new Date().toISOString();
  return { room: { ...room }, revision: store.revision };
}
export function resetStore() {
  const previous = getStore();
  shared.__homieDemoStore = {
    rooms: seedRooms().map((r) => ({ ...r, version: previous.revision + 1 })),
    revision: previous.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}
