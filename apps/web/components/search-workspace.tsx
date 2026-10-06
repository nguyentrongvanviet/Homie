"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  House,
  MapPin,
  Maximize2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
  Wifi,
  X,
} from "lucide-react";
import {
  AMENITIES,
  DEFAULT_FILTERS,
  DISTRICTS,
  priceLabel,
  searchParams,
  type Amenity,
  type Bounds,
  type Filters,
  type Room,
  type RoomSnapshot,
} from "@/lib/contracts";
import type { MapFocus } from "./room-map";

const RoomMap = dynamic(() => import("./room-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Compass size={32} />
      <span>Đang mở bản đồ…</span>
    </div>
  ),
});
const CENTERS: Record<string, [number, number]> = {
  "Quận 1": [10.791, 106.7],
  "Quận 3": [10.785, 106.685],
  "Quận 10": [10.773, 106.666],
  "Bình Thạnh": [10.803, 106.706],
  "Phú Nhuận": [10.8, 106.682],
  "Tân Bình": [10.804, 106.65],
};

function initialFilters(): Filters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const p = new URLSearchParams(window.location.search);
  const maxPrice = Number(p.get("maxPrice") ?? DEFAULT_FILTERS.maxPrice);
  const minArea = Number(p.get("minArea") ?? 0);
  const sort = p.get("sort");
  return {
    q: (p.get("q") ?? "").slice(0, 100),
    district: DISTRICTS.includes(p.get("district") ?? "")
      ? p.get("district")!
      : "",
    maxPrice: [3000000, 4000000, 5000000, 7000000, 100000000].includes(maxPrice)
      ? maxPrice
      : DEFAULT_FILTERS.maxPrice,
    minArea: [0, 20, 25, 30].includes(minArea) ? minArea : 0,
    amenities: (p.get("amenities") ?? "")
      .split(",")
      .filter((a) => a in AMENITIES) as Amenity[],
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "recommended",
    availableOnly: p.get("availableOnly") !== "false",
  };
}

function RoomCard({
  room,
  selected,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`room-card${selected ? " selected" : ""}`}
      onClick={onSelect}
      data-card-id={room.id}
      aria-pressed={selected}
    >
      <div className="card-photo">
        <img
          src={room.image}
          alt={room.imageAlt}
          width={400}
          height={280}
          loading="lazy"
        />
        <span className="photo-label">
          {room.status === "AVAILABLE" ? room.highlight : "Đã cho thuê"}
        </span>
        <span className="photo-count">Ảnh minh họa</span>
      </div>
      <div className="card-content">
        <div className="card-location">
          <MapPin size={13} />
          {room.district}
          <span className="verified">
            <Check size={11} /> Mẫu
          </span>
        </div>
        <h3>{room.title}</h3>
        <p className="street">{room.street}</p>
        <div className="room-facts">
          <span>
            <Square size={14} />
            {room.area} m²
          </span>
          <span>
            <BedDouble size={15} />
            Phòng riêng
          </span>
          <span>
            <Bath size={15} />
            WC riêng
          </span>
        </div>
        <div className="card-bottom">
          <span className="price">
            <strong>{priceLabel(room.price)}</strong> triệu<span>/tháng</span>
          </span>
          <span className="open-room">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function SearchWorkspace() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [bounds, setBounds] = useState<Bounds>();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("map");
  const [toast, setToast] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoRooms, setDemoRooms] = useState<Room[]>([]);
  const [demoId, setDemoId] = useState("room-01");
  const [demoPrice, setDemoPrice] = useState("4200000");
  const [demoStatus, setDemoStatus] = useState<Room["status"]>("AVAILABLE");
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const closeDemoButton = useRef<HTMLButtonElement>(null);
  const queryKey = searchParams(filters, bounds).toString();

  useEffect(() => {
    const value = initialFilters();
    setFilters(value);
    setInput(value.q);
    setHydrated(true);
    const pop = () => {
      const f = initialFilters();
      setFilters(f);
      setInput(f.q);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const p = searchParams(filters);
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, [filters, hydrated]);

  const load = useCallback(
    async (foreground = false) => {
      if (!hydrated) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const current = ++sequence.current;
      if (foreground) setLoading(true);
      try {
        const response = await fetch(`/api/v1/rooms/search?${queryKey}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Không tải được dữ liệu phòng",
          );
        if (current !== sequence.current) return;
        setSnapshot((previous) =>
          previous &&
          previous.meta.revision === body.meta.revision &&
          previous.meta.queryKey === body.meta.queryKey
            ? previous
            : body,
        );
        setSelectedId((previous) =>
          previous && !body.data.some((room: Room) => room.id === previous)
            ? null
            : previous,
        );
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted || current !== sequence.current) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Mất kết nối. Vui lòng thử lại.",
        );
      } finally {
        if (current === sequence.current) setLoading(false);
      }
    },
    [queryKey, hydrated],
  );

  useEffect(() => {
    sequence.current++;
    request.current?.abort();
    if (!hydrated) return;
    setLoading(true);
    const timer = setTimeout(() => void load(true), 220);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
    };
  }, [load, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const refresh = () => void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    if ("BroadcastChannel" in window) {
      const broadcast = new BroadcastChannel("homie-demo-rooms");
      channel.current = broadcast;
      broadcast.onmessage = refresh;
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      channel.current?.close();
      channel.current = null;
    };
  }, [load, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const rooms = snapshot?.data ?? [];
  const selected = rooms.find((room) => room.id === selectedId);
  const stale = snapshot && snapshot.meta.queryKey !== queryKey;
  const activeFilterCount =
    Number(Boolean(filters.district)) +
    Number(Boolean(filters.q)) +
    Number(filters.maxPrice !== DEFAULT_FILTERS.maxPrice) +
    Number(filters.minArea > 0) +
    filters.amenities.length;

  const onBoundsChange = useCallback((value: Bounds) => {
    setBounds((previous) =>
      previous &&
      ["west", "south", "east", "north"].every(
        (k) =>
          Math.abs(previous[k as keyof Bounds] - value[k as keyof Bounds]) <
          0.00001,
      )
        ? previous
        : value,
    );
  }, []);

  function setDistrict(district: string) {
    setFilters((previous) => ({ ...previous, district }));
    setSelectedId(null);
    const center = CENTERS[district];
    setFocus({
      lat: center?.[0] ?? 10.791,
      lng: center?.[1] ?? 106.682,
      zoom: center ? 14 : 12,
      key: Date.now(),
    });
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setInput("");
    setSelectedId(null);
    setFocus({ lat: 10.791, lng: 106.682, zoom: 12, key: Date.now() });
  }

  function selectRoom(id: string) {
    setSelectedId((previous) => (previous === id ? null : id));
    if (window.innerWidth <= 800) setMobileTab("map");
    const card = document.querySelector(`[data-card-id="${id}"]`);
    if (card && window.innerWidth > 800)
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function fetchDemoRooms(preferred = demoId) {
    const response = await fetch(
      "/api/v1/rooms/search?availableOnly=false&maxPrice=100000000",
      { cache: "no-store" },
    );
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error?.message ?? "Không tải được phòng mẫu");
    setDemoRooms(body.data);
    const room: Room | undefined =
      body.data.find((r: Room) => r.id === preferred) ?? body.data[0];
    if (room) {
      setDemoId(room.id);
      setDemoPrice(String(room.price));
      setDemoStatus(room.status);
    }
  }

  async function openDemo() {
    setDemoOpen(true);
    setDemoError(null);
    setDemoBusy(true);
    modal.current?.showModal();
    try {
      await fetchDemoRooms(selectedId ?? demoId);
    } catch (cause) {
      setDemoError(
        cause instanceof Error ? cause.message : "Không tải được dữ liệu",
      );
    } finally {
      setDemoBusy(false);
    }
  }

  function closeDemo() {
    modal.current?.close();
    setDemoOpen(false);
    closeDemoButton.current?.focus();
  }

  async function updateDemo(reset = false) {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const room = demoRooms.find((r) => r.id === demoId);
      if (!reset && !room) throw new Error("Chọn một phòng để thử");
      const response = await fetch(
        reset ? "/api/v1/demo/reset" : `/api/v1/demo/rooms/${demoId}`,
        {
          method: reset ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: reset
            ? undefined
            : JSON.stringify({
                version: room!.version,
                price: Number(demoPrice),
                status: demoStatus,
              }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) await fetchDemoRooms();
        throw new Error(body.error?.message ?? "Không cập nhật được");
      }
      channel.current?.postMessage({ changed: true });
      await load();
      await fetchDemoRooms();
      setToast(
        reset
          ? "Đã khôi phục 18 phòng mẫu."
          : "Đã cập nhật. Danh sách và bản đồ dùng dữ liệu mới.",
      );
    } catch (cause) {
      setDemoError(
        cause instanceof Error ? cause.message : "Thao tác thất bại",
      );
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Homie — Trang tìm phòng">
          <span className="brand-symbol">
            <House size={23} strokeWidth={2.2} />
          </span>
          homie<span className="brand-period">.</span>
        </a>
        <span className="header-divider" />
        <span className="header-location">
          <MapPin size={15} /> TP. Hồ Chí Minh
        </span>
        <div className="header-right">
          <span className="sample-badge">Bản trải nghiệm · Dữ liệu mẫu</span>
          <button
            className="demo-button"
            ref={closeDemoButton}
            onClick={() => void openDemo()}
          >
            <CircleHelp size={17} />
            <span>Thử đồng bộ</span>
          </button>
        </div>
      </header>

      <section className="search-header" aria-label="Bộ lọc tìm phòng">
        <div className="heading-row">
          <div>
            <p className="eyebrow">KHÁM PHÁ KHÔNG GIAN SỐNG</p>
            <h1>Phòng hợp ý. Vị trí hợp mình.</h1>
          </div>
          <p className="heading-note">
            <Compass size={18} /> Chọn điểm trên bản đồ để xem phòng
          </p>
        </div>
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((previous) => ({ ...previous, q: input.trim() }));
          }}
        >
          <label className="search-input">
            <Search size={20} />
            <span className="sr-only">Tìm theo tên phòng hoặc đường</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={100}
              placeholder="Tên đường, khu vực hoặc phòng…"
            />
          </label>
          <label className="search-district">
            <MapPin size={18} />
            <span className="sr-only">Khu vực</span>
            <select
              value={filters.district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">Tất cả khu vực</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
          <button className="search-submit" type="submit">
            <Search size={17} /> Tìm phòng
          </button>
        </form>
        <div className="filters-row">
          <span className="filter-label">
            <SlidersHorizontal size={16} /> Bộ lọc
          </span>
          <label
            className={`filter-select${filters.maxPrice !== DEFAULT_FILTERS.maxPrice ? " active" : ""}`}
          >
            <span className="sr-only">Giá thuê tối đa</span>
            <select
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))
              }
            >
              <option value={DEFAULT_FILTERS.maxPrice}>Mọi mức giá</option>
              <option value={3000000}>Đến 3 triệu</option>
              <option value={4000000}>Đến 4 triệu</option>
              <option value={5000000}>Đến 5 triệu</option>
              <option value={7000000}>Đến 7 triệu</option>
            </select>
            <ChevronDown size={13} />
          </label>
          <label className={`filter-select${filters.minArea ? " active" : ""}`}>
            <span className="sr-only">Diện tích tối thiểu</span>
            <select
              value={filters.minArea}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minArea: Number(e.target.value) }))
              }
            >
              <option value={0}>Diện tích</option>
              <option value={20}>Từ 20 m²</option>
              <option value={25}>Từ 25 m²</option>
              <option value={30}>Từ 30 m²</option>
            </select>
            <ChevronDown size={13} />
          </label>
          {(Object.keys(AMENITIES) as Amenity[])
            .filter((a) => a !== "parking")
            .map((a) => (
              <button
                key={a}
                className={`filter-chip${filters.amenities.includes(a) ? " active" : ""}`}
                aria-pressed={filters.amenities.includes(a)}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    amenities: f.amenities.includes(a)
                      ? f.amenities.filter((v) => v !== a)
                      : [...f.amenities, a],
                  }))
                }
              >
                {filters.amenities.includes(a) && <Check size={13} />}
                {AMENITIES[a]}
              </button>
            ))}
          {activeFilterCount > 0 && (
            <button className="clear-filters" onClick={resetFilters}>
              Xóa lọc <X size={13} />
            </button>
          )}
          <label className="available-toggle">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(e) =>
                setFilters((f) => ({ ...f, availableOnly: e.target.checked }))
              }
            />
            <span className="toggle-track" />
            <span>Chỉ phòng còn trống</span>
          </label>
        </div>
      </section>

      <section className={`workspace mobile-${mobileTab}`}>
        <aside className="results-panel" aria-label="Danh sách phòng">
          <div className="results-toolbar">
            <div>
              <h2>
                {loading && !snapshot ? (
                  "Đang tìm phòng…"
                ) : (
                  <>
                    <span data-result-count>{rooms.length}</span> phòng phù hợp
                  </>
                )}
              </h2>
              <p>
                {stale
                  ? "Đang cập nhật kết quả…"
                  : "Trong vùng bản đồ đang hiển thị"}
              </p>
            </div>
            <label className="sort-control">
              <span className="sr-only">Sắp xếp phòng</span>
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sort: e.target.value as Filters["sort"],
                  }))
                }
              >
                <option value="recommended">Gợi ý</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>
          {error && (
            <div className="query-error" role="alert">
              <p>
                {error}
                {stale
                  ? " Kết quả bên dưới thuộc bộ lọc trước."
                  : " Đang hiển thị dữ liệu gần nhất."}
              </p>
              <button onClick={() => void load(true)}>Thử lại</button>
            </div>
          )}
          <div className="cards-scroll" aria-busy={loading}>
            {!snapshot && loading ? (
              [1, 2, 3].map((n) => (
                <div className="card-skeleton" key={n}>
                  <div />
                  <span />
                  <span />
                </div>
              ))
            ) : rooms.length ? (
              rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={room.id === selectedId}
                  onSelect={() => selectRoom(room.id)}
                />
              ))
            ) : (
              <div className="empty-state">
                <Search size={28} />
                <h3>Chưa có phòng trong khu vực này</h3>
                <p>Thử thu nhỏ bản đồ, chọn khu vực khác hoặc nới bộ lọc.</p>
                <button className="secondary-button" onClick={resetFilters}>
                  Xóa bộ lọc và xem lại
                </button>
              </div>
            )}
            <p className="list-footnote">
              Thông tin phòng và vị trí là dữ liệu minh họa.
            </p>
          </div>
        </aside>

        <div className="map-panel" aria-label="Tìm phòng trên bản đồ">
          <RoomMap
            rooms={rooms}
            selectedId={selectedId}
            onSelect={selectRoom}
            onBoundsChange={onBoundsChange}
            focus={focus}
          />
          <div className="map-topline">
            <span className="map-area">
              <MapPin size={15} />
              {filters.district || "TP. Hồ Chí Minh"}
            </span>
            <button
              className="map-refresh"
              onClick={() => void load(true)}
              disabled={loading}
              aria-label="Cập nhật dữ liệu phòng"
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              <span>{loading ? "Đang cập nhật" : "Cập nhật"}</span>
            </button>
          </div>
          {!selected && (
            <div className="map-hint">
              <span className="hint-icon">
                <Maximize2 size={17} />
              </span>
              <div>
                <strong>Khu vực bạn nhìn, phòng bạn tìm.</strong>
                <span>
                  Kéo hoặc thu phóng để khám phá. Kết quả tự cập nhật.
                </span>
              </div>
            </div>
          )}
          {selected && (
            <section className="map-room-detail" aria-label="Phòng đang chọn">
              <button
                className="detail-close"
                aria-label="Đóng chi tiết phòng"
                onClick={() => setSelectedId(null)}
              >
                <X size={17} />
              </button>
              <img
                src={selected.image}
                alt={selected.imageAlt}
                width={320}
                height={140}
              />
              <div className="detail-body">
                <span className="detail-code">
                  {selected.code} ·{" "}
                  {selected.status === "AVAILABLE"
                    ? "Còn trống"
                    : "Đã cho thuê"}
                </span>
                <h3>{selected.title}</h3>
                <p>
                  <MapPin size={14} />
                  {selected.street}, {selected.district}
                </p>
                <div className="detail-amenities">
                  <span>{selected.area} m²</span>
                  {selected.amenities.map((a) => (
                    <span key={a}>{AMENITIES[a]}</span>
                  ))}
                </div>
                <div className="detail-bottom">
                  <span className="price">
                    <strong>{priceLabel(selected.price)}</strong> triệu
                    <span>/tháng</span>
                  </span>
                  <span className="detail-demo">Phòng mẫu</span>
                </div>
              </div>
            </section>
          )}
          <div className={`sync-state${error ? " offline" : ""}`} role="status">
            <Wifi size={13} />
            <span>
              {error ? "Chưa đồng bộ" : loading ? "Đang đồng bộ" : "Đã đồng bộ"}
            </span>
            <span className="sync-separator">·</span>
            <span>{rooms.length} điểm phòng</span>
          </div>
        </div>
        <div className="mobile-tabs">
          <button
            className={mobileTab === "list" ? "active" : ""}
            onClick={() => setMobileTab("list")}
          >
            <SlidersHorizontal size={16} />
            Danh sách ({rooms.length})
          </button>
          <button
            className={mobileTab === "map" ? "active" : ""}
            onClick={() => setMobileTab("map")}
          >
            <MapPin size={16} />
            Bản đồ
          </button>
        </div>
      </section>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      <dialog
        ref={modal}
        className="demo-dialog"
        onCancel={() => {
          setDemoOpen(false);
        }}
        onClose={() => setDemoOpen(false)}
        onClick={(e) => {
          if (e.target === modal.current) closeDemo();
        }}
      >
        <div className="demo-content" aria-label="Thử đồng bộ phòng mẫu">
          <div className="demo-heading">
            <span className="demo-icon">
              <RefreshCw size={22} />
            </span>
            <button aria-label="Đóng thử đồng bộ" onClick={closeDemo}>
              <X size={21} />
            </button>
          </div>
          <p className="eyebrow">THỬ TRỰC TIẾP</p>
          <h2>Một thay đổi. Hai nơi cập nhật.</h2>
          <p className="demo-description">
            Đổi giá hoặc trạng thái phòng mẫu, rồi quan sát danh sách và điểm
            trên bản đồ. Mở thêm một tab để thấy dữ liệu cập nhật giữa các tab.
          </p>
          {demoOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void updateDemo();
              }}
            >
              <label>
                Phòng mẫu
                <select
                  value={demoId}
                  disabled={demoBusy || !demoRooms.length}
                  onChange={(e) => {
                    const r = demoRooms.find((r) => r.id === e.target.value);
                    if (r) {
                      setDemoId(r.id);
                      setDemoPrice(String(r.price));
                      setDemoStatus(r.status);
                    }
                  }}
                >
                  {demoRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.street}
                    </option>
                  ))}
                </select>
              </label>
              <div className="demo-fields">
                <label>
                  Giá thuê (VND/tháng)
                  <input
                    type="number"
                    min={100000}
                    max={100000000}
                    step={100000}
                    value={demoPrice}
                    onChange={(e) => setDemoPrice(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Trạng thái
                  <select
                    value={demoStatus}
                    onChange={(e) =>
                      setDemoStatus(e.target.value as Room["status"])
                    }
                  >
                    <option value="AVAILABLE">Còn trống</option>
                    <option value="RENTED">Đã cho thuê</option>
                  </select>
                </label>
              </div>
              <p className="demo-explanation">
                Bật “Chỉ phòng còn trống”: phòng đã thuê sẽ biến mất khỏi cả
                danh sách và map. Tab đang xem tự kiểm tra dữ liệu mỗi 5 giây.
              </p>
              {demoError && (
                <p className="demo-error" role="alert">
                  {demoError}
                </p>
              )}
              <div className="demo-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={demoBusy || !snapshot?.meta.demoMutations}
                  onClick={() => void updateDemo(true)}
                >
                  Khôi phục mẫu
                </button>
                <button
                  className="primary-button"
                  disabled={
                    demoBusy ||
                    !demoRooms.length ||
                    !snapshot?.meta.demoMutations
                  }
                >
                  {demoBusy ? "Đang cập nhật…" : "Lưu thay đổi mẫu"}
                </button>
              </div>
              {snapshot && !snapshot.meta.demoMutations && (
                <p className="demo-explanation">
                  Thao tác thay đổi mẫu chỉ bật ở môi trường phát triển.
                </p>
              )}
            </form>
          )}
          <p className="demo-footer">
            Dữ liệu mẫu lưu tạm trên server và mất khi server khởi động lại. Đây
            không phải thao tác đặt phòng thật.
          </p>
        </div>
      </dialog>
    </main>
  );
}
