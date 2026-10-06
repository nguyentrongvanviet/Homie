export type RoomStatus = "AVAILABLE" | "RENTED";
export type Amenity = "aircon" | "furnished" | "balcony" | "parking";
export const AMENITIES: Record<Amenity, string> = {
  aircon: "Máy lạnh",
  furnished: "Nội thất",
  balcony: "Ban công",
  parking: "Chỗ để xe",
};
export const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 10",
  "Bình Thạnh",
  "Phú Nhuận",
  "Tân Bình",
];
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type Filters = {
  q: string;
  district: string;
  maxPrice: number;
  minArea: number;
  amenities: Amenity[];
  sort: "recommended" | "price_asc" | "price_desc";
  availableOnly: boolean;
};
export const DEFAULT_FILTERS: Filters = {
  q: "",
  district: "",
  maxPrice: 100_000_000,
  minArea: 0,
  amenities: [],
  sort: "recommended",
  availableOnly: true,
};
export type Room = {
  id: string;
  code: string;
  title: string;
  street: string;
  district: string;
  lat: number;
  lng: number;
  price: number;
  area: number;
  amenities: Amenity[];
  image: string;
  imageAlt: string;
  status: RoomStatus;
  version: number;
  highlight: string;
};
export type RoomSnapshot = {
  data: Room[];
  meta: {
    total: number;
    revision: number;
    updatedAt: string;
    queryKey: string;
    demoMutations: boolean;
  };
};
export function priceLabel(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value / 1_000_000,
  );
}
export function searchParams(
  filters: Filters,
  bounds?: Bounds,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.district) params.set("district", filters.district);
  params.set("maxPrice", String(filters.maxPrice));
  params.set("minArea", String(filters.minArea));
  params.set("sort", filters.sort);
  params.set("availableOnly", String(filters.availableOnly));
  if (filters.amenities.length)
    params.set("amenities", [...filters.amenities].sort().join(","));
  if (bounds)
    params.set(
      "bbox",
      [bounds.west, bounds.south, bounds.east, bounds.north]
        .map((v) => v.toFixed(6))
        .join(","),
    );
  return params;
}
