import {
  AMENITIES,
  DEFAULT_FILTERS,
  DISTRICTS,
  type Bounds,
  type Filters,
  type Room,
} from "./contracts";

export class QueryError extends Error {}
function numberParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = params.get(key);
  const value = raw === null ? fallback : Number(raw);
  if (raw === "" || !Number.isFinite(value) || value < min || value > max)
    throw new QueryError(`${key} không hợp lệ`);
  return value;
}
export function parseQuery(params: URLSearchParams): {
  filters: Filters;
  bounds?: Bounds;
} {
  const q = (params.get("q") ?? "").trim();
  if (q.length > 100) throw new QueryError("Từ khóa tối đa 100 ký tự");
  const district = params.get("district") ?? "";
  if (district && !DISTRICTS.includes(district))
    throw new QueryError("Khu vực không hợp lệ");
  const amenities = [
    ...new Set((params.get("amenities") ?? "").split(",").filter(Boolean)),
  ];
  if (amenities.some((a) => !(a in AMENITIES)))
    throw new QueryError("Tiện ích không hợp lệ");
  const sort = params.get("sort") ?? "recommended";
  if (!["recommended", "price_asc", "price_desc"].includes(sort))
    throw new QueryError("Thứ tự không hợp lệ");
  const available = params.get("availableOnly") ?? "true";
  if (!["true", "false"].includes(available))
    throw new QueryError("Trạng thái lọc không hợp lệ");
  let bounds: Bounds | undefined;
  if (params.has("bbox")) {
    const raw = params.get("bbox")!.split(",");
    const values = raw.map(Number);
    if (
      raw.length !== 4 ||
      raw.some((v) => !v.trim()) ||
      values.some((v) => !Number.isFinite(v))
    )
      throw new QueryError("bbox cần 4 tọa độ");
    const [west, south, east, north] = values;
    if (
      west < -180 ||
      east > 180 ||
      south < -90 ||
      north > 90 ||
      west >= east ||
      south >= north
    )
      throw new QueryError("Vùng bản đồ không hợp lệ");
    bounds = { west, south, east, north };
  }
  return {
    filters: {
      q,
      district,
      maxPrice: numberParam(
        params,
        "maxPrice",
        DEFAULT_FILTERS.maxPrice,
        0,
        100000000,
      ),
      minArea: numberParam(params, "minArea", 0, 0, 1000),
      amenities: amenities as Filters["amenities"],
      sort: sort as Filters["sort"],
      availableOnly: available === "true",
    },
    bounds,
  };
}
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
export function filterRooms(
  rooms: Room[],
  filters: Filters,
  bounds?: Bounds,
): Room[] {
  const query = normalize(filters.q);
  const result = rooms.filter(
    (room) =>
      (!filters.availableOnly || room.status === "AVAILABLE") &&
      (!filters.district || room.district === filters.district) &&
      room.price <= filters.maxPrice &&
      room.area >= filters.minArea &&
      filters.amenities.every((a) => room.amenities.includes(a)) &&
      (!query ||
        normalize(
          `${room.title} ${room.street} ${room.district} ${room.code}`,
        ).includes(query)) &&
      (!bounds ||
        (room.lng >= bounds.west &&
          room.lng <= bounds.east &&
          room.lat >= bounds.south &&
          room.lat <= bounds.north)),
  );
  return result.sort((a, b) => {
    if (filters.sort === "price_asc")
      return a.price - b.price || a.id.localeCompare(b.id);
    if (filters.sort === "price_desc")
      return b.price - a.price || a.id.localeCompare(b.id);
    return a.id.localeCompare(b.id);
  });
}
