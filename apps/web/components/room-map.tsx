"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { AlertCircle } from "lucide-react";
import { priceLabel, type Bounds, type Room } from "@/lib/contracts";

export type MapFocus = { lat: number; lng: number; zoom: number; key: number };
type Props = {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (bounds: Bounds) => void;
  focus: MapFocus | null;
};

function roomIcon(room: Room, selected: boolean) {
  const button = document.createElement("button");
  button.className = `room-pin${selected ? " is-selected" : ""}${room.status === "RENTED" ? " is-rented" : ""}`;
  button.dataset.roomId = room.id;
  button.setAttribute(
    "aria-label",
    `Chọn ${room.title}, ${priceLabel(room.price)} triệu mỗi tháng`,
  );
  button.setAttribute("aria-pressed", String(selected));
  button.textContent = `${priceLabel(room.price)} tr`;
  return L.divIcon({
    html: button,
    className: "room-pin-shell",
    iconSize: [84, 40],
    iconAnchor: [42, 44],
  });
}

export default function RoomMap({
  rooms,
  selectedId,
  onSelect,
  onBoundsChange,
  focus,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const selectRef = useRef(onSelect);
  const boundsRef = useRef(onBoundsChange);
  const [tileError, setTileError] = useState(false);
  selectRef.current = onSelect;
  boundsRef.current = onBoundsChange;

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      minZoom: 10,
      maxZoom: 18,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      scrollWheelZoom: true,
      maxBounds: L.latLngBounds([10.5, 106.3], [11.15, 107.05]),
      maxBoundsViscosity: 0.8,
    });
    map.current = instance;
    const tiles = L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    L.control.zoom({ position: "bottomright" }).addTo(instance);
    instance.attributionControl.setPrefix(false);
    const reportBounds = () => {
      const b = instance.getBounds();
      boundsRef.current({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    instance.on("moveend", reportBounds);
    instance.fitBounds(
      [
        [10.766, 106.642],
        [10.815, 106.719],
      ],
      { padding: [45, 45], animate: false },
    );
    reportBounds();
    const observer = new ResizeObserver(() => {
      // Mobile list mode hides the map; never query bounds from a zero-size view.
      if (
        container.current &&
        container.current.clientWidth > 0 &&
        container.current.clientHeight > 0
      ) {
        instance.invalidateSize({ pan: false });
      }
    });
    observer.observe(container.current);
    const markerStore = markers.current;
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      markerStore.clear();
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const ids = new Set(rooms.map((room) => room.id));
    for (const [id, marker] of markers.current) {
      if (!ids.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    for (const room of rooms) {
      const marker = markers.current.get(room.id);
      if (marker) {
        marker
          .setLatLng([room.lat, room.lng])
          .setIcon(roomIcon(room, room.id === selectedId));
        marker.setZIndexOffset(room.id === selectedId ? 1000 : 0);
      } else {
        const newMarker = L.marker([room.lat, room.lng], {
          icon: roomIcon(room, room.id === selectedId),
          keyboard: false,
        })
          .on("click", () => selectRef.current(room.id))
          .addTo(map.current);
        newMarker.setZIndexOffset(room.id === selectedId ? 1000 : 0);
        markers.current.set(room.id, newMarker);
      }
    }
  }, [rooms, selectedId]);

  useEffect(() => {
    if (focus && map.current)
      map.current.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.6 });
  }, [focus]);

  return (
    <>
      <div
        ref={container}
        className="leaflet-surface"
        aria-label="Bản đồ phòng trọ mẫu tại TP.HCM"
      />
      {tileError && (
        <div className="tile-error">
          <AlertCircle size={16} /> Chưa tải được nền bản đồ. Bạn vẫn có thể
          chọn điểm phòng.
        </div>
      )}
    </>
  );
}
