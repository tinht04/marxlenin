import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { CountryData } from "../types";
import { fetchCountryData } from "../services/googleSheetService";
import { Loader } from "./Loader";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ====== Helper Functions ======
const getPartnershipColor = (level?: string | null) => {
  if (!level || level === "No Partnership") return "#6b7280";
  if (level.includes("Comprehensive Strategic")) return "#16a34a";
  if (level.includes("Strategic")) return "#facc15";
  if (level.includes("FTA Only")) return "#3b82f6";
  return "#6b7280";
};

const createColoredIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="28px" height="28px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// ====== Popup Component ======
const CountryPopupContent: React.FC<{ country: CountryData }> = ({
  country,
}) => {
  const parseTradeValue = (valueStr?: string): number => {
    if (!valueStr) return 0;
    const cleaned = valueStr.replace(/[\$,]/g, "").trim().toUpperCase();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    if (cleaned.endsWith("T")) return num * 1000;
    if (cleaned.endsWith("B")) return num;
    return num;
  };

  const tradeValue = parseTradeValue(country["Trade Value"]);

  const chartData = {
    labels: ["Giá trị thương mại (tỷ USD)"],
    datasets: [
      {
        label: "Giá trị",
        data: [tradeValue],
        backgroundColor: "rgba(59,130,246,0.5)",
        borderColor: "rgba(59,130,246,1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `Thương mại ${country.Country}` },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="w-80 max-h-80 overflow-y-auto p-1">
      <h3 className="font-bold text-lg mb-2 text-blue-800">
        {country.Country}
      </h3>
      <div className="text-sm space-y-2">
        <p>
          <strong>Mức độ hợp tác:</strong>{" "}
          {country["Partnership Level"] || "Không có"}
        </p>
        <p>
          <strong>Tình trạng FTA:</strong> {country["FTA Status"]}
        </p>

        {tradeValue > 0 && (
          <div className="my-2">
            <Bar options={chartOptions} data={chartData} />
          </div>
        )}

        <p>
          <strong>Top Xuất khẩu:</strong> {country["Top Exports"]}
        </p>
        <p>
          <strong>Top Nhập khẩu:</strong> {country["Top Imports"]}
        </p>
        <p>
          <strong>Tóm tắt:</strong> {country["Strategy Summary"]}
        </p>
      </div>
    </div>
  );
};

// ====== Main Map Component ======
export const IntegrationMap: React.FC = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    partnership: "all",
    region: "all",
    fta: "all",
  });

  const mapRef = useRef<L.Map | null>(null);

  // Load data from Google Sheets
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchCountryData();
        setCountries(data);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu bản đồ.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const partnershipLevels = useMemo(
    () => [
      ...new Set(countries.map((c) => c["Partnership Level"]).filter(Boolean)),
    ],
    [countries]
  );
  const regions = useMemo(
    () => [...new Set(countries.map((c) => c.Region).filter(Boolean))],
    [countries]
  );
  const ftaStatuses = useMemo(
    () => [...new Set(countries.map((c) => c["FTA Status"]).filter(Boolean))],
    [countries]
  );

  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const partnershipMatch =
        filters.partnership === "all" ||
        c["Partnership Level"] === filters.partnership;
      const regionMatch =
        filters.region === "all" || c.Region === filters.region;
      const ftaMatch = filters.fta === "all" || c["FTA Status"] === filters.fta;
      return partnershipMatch && regionMatch && ftaMatch;
    });
  }, [countries, filters]);

  if (loading) return <Loader message="Đang tải dữ liệu bản đồ..." />;
  if (error) return <p className="text-red-500 text-center">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Bộ lọc */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 rounded-xl shadow-md border-2 border-amber-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-amber-900">
            Mức độ hợp tác
          </label>
          <select
            value={filters.partnership}
            onChange={(e) =>
              setFilters((f) => ({ ...f, partnership: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border-2 border-amber-300 bg-white focus:ring-amber-500 focus:border-amber-600 sm:text-sm font-medium text-gray-700 px-3 py-2"
          >
            <option value="all">Tất cả</option>
            {partnershipLevels.map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-amber-900">
            Khu vực
          </label>
          <select
            value={filters.region}
            onChange={(e) =>
              setFilters((f) => ({ ...f, region: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border-2 border-amber-300 bg-white focus:ring-amber-500 focus:border-amber-600 sm:text-sm font-medium text-gray-700 px-3 py-2"
          >
            <option value="all">Tất cả</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-amber-900">
            Tình trạng FTA
          </label>
          <select
            value={filters.fta}
            onChange={(e) => setFilters((f) => ({ ...f, fta: e.target.value }))}
            className="mt-1 block w-full rounded-lg border-2 border-amber-300 bg-white focus:ring-amber-500 focus:border-amber-600 sm:text-sm font-medium text-gray-700 px-3 py-2"
          >
            <option value="all">Tất cả</option>
            {ftaStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* <div>
          <label className="block text-sm font-medium text-gray-700">
            Xem nhanh
          </label>
          <div className="flex gap-2 mt-1">
            <button className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
              Việt Nam
            </button>
            <button className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600">
              Quần đảo
            </button>
          </div>
        </div> */}
      </div>

      {/* Bản đồ */}
      <div className="h-[70vh] w-full rounded-xl overflow-hidden shadow-lg border relative">
        <MapContainer
          center={[16, 106]}
          zoom={5}
          minZoom={2}
          maxZoom={18}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          worldCopyJump={true}
          maxBounds={[[-90, -180], [90, 180]]}
          preferCanvas={true}
        >
          {/* OpenStreetMap - Nhanh, ổn định */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c']}
            maxZoom={19}
            minZoom={2}
            noWrap={true}
            updateWhenIdle={false}
            updateWhenZooming={false}
            keepBuffer={2}
          />

          {/* Hoàng Sa */}
          <Marker
            position={[16.5, 111.5]}
            icon={L.divIcon({
              className: "custom-label",
              html: `<div style="
      white-space: nowrap;
      color: #ef4444;
      font-weight: 600;
      font-size: 12px;
      text-shadow: 0 0 2px rgba(255,255,255,0.9);
    ">Hoàng Sa</div>`,
            })}
          />

          {/* Trường Sa */}
          <Marker
            position={[8.6, 111.9]}
            icon={L.divIcon({
              className: "custom-label",
              html: `<div style="
      white-space: nowrap;
      color: #ef4444;
      font-weight: 600;
      font-size: 12px;
      text-shadow: 0 0 2px rgba(255,255,255,0.9);
    ">Trường Sa</div>`,
            })}
          />

          {/* Các quốc gia khác */}
          {filteredCountries.map((c) => {
            const lat = parseFloat(c.Latitude);
            const lng = parseFloat(c.Longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker
                key={c.Country}
                position={[lat, lng]}
                icon={createColoredIcon(
                  getPartnershipColor(c["Partnership Level"])
                )}
              >
                <Popup>
                  <CountryPopupContent country={c} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
