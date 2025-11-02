import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { CountryData } from '../types';
import { fetchCountryData } from '../services/googleSheetService';
import { Loader } from './Loader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const getPartnershipColor = (level?: string | null) => {
    if (!level || level === 'No Partnership') return '#6b7280'; // gray-500
    if (level.includes('Comprehensive Strategic')) return '#16a34a'; // green-600
    if (level.includes('Strategic')) return '#facc15'; // yellow-400
    if (level.includes('FTA Only')) return '#3b82f6'; // blue-500
    return '#6b7280'; // gray-500
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

const CountryPopupContent: React.FC<{ country: CountryData }> = ({ country }) => {
    const parseTradeValue = (valueStr?: string): number => {
        if (!valueStr) return 0;
        // Handles values like "$2.5T", "$800B", "700B"
        const cleanedStr = valueStr.replace(/[\$,]/g, '').trim().toUpperCase();
        const numPart = parseFloat(cleanedStr);

        if (isNaN(numPart)) return 0;

        if (cleanedStr.endsWith('T')) {
            return numPart * 1000; // Convert Trillions to Billions
        }
        if (cleanedStr.endsWith('B')) {
            return numPart; // Already in Billions
        }
        return numPart; // Fallback for numbers without units
    };
    
    const tradeValue = parseTradeValue(country['Trade Value']);
    
    const chartData = {
        labels: ['Giá trị thương mại (tỷ USD)'],
        datasets: [
          {
            label: 'Giá trị',
            data: [tradeValue],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
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
        scales: { y: { beginAtZero: true } }
    };

    return (
        <div className="w-80 max-h-80 overflow-y-auto p-1">
            <h3 className="font-bold text-lg mb-2 text-blue-800">{country.Country}</h3>
            <div className="text-sm space-y-2">
                <p><strong className="font-semibold">Mức độ hợp tác:</strong> {country['Partnership Level'] || 'Không có'}</p>
                <p><strong className="font-semibold">Tình trạng FTA:</strong> {country['FTA Status']}</p>
                
                {tradeValue > 0 && <div className="my-2"><Bar options={chartOptions} data={chartData} /></div>}

                <p><strong className="font-semibold">Top Xuất khẩu:</strong> {country['Top Exports']}</p>
                <p><strong className="font-semibold">Top Nhập khẩu:</strong> {country['Top Imports']}</p>
                <p><strong className="font-semibold">Tóm tắt:</strong> {country['Strategy Summary']}</p>
            </div>
        </div>
    );
};

export const IntegrationMap: React.FC = () => {
    const [countries, setCountries] = useState<CountryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        partnership: 'all',
        region: 'all',
        fta: 'all'
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await fetchCountryData();
                setCountries(data);
            } catch (err) {
                setError('Không thể tải dữ liệu bản đồ. Vui lòng thử lại sau.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const partnershipLevels = useMemo(() => [...new Set(countries.map(c => c['Partnership Level']).filter(Boolean))] as string[], [countries]);
    const regions = useMemo(() => [...new Set(countries.map(c => c.Region).filter(Boolean))] as string[], [countries]);
    const ftaStatuses = useMemo(() => [...new Set(countries.map(c => c['FTA Status']).filter(Boolean))] as string[], [countries]);

    const filteredCountries = useMemo(() => {
        return countries.filter(country => {
            const partnershipMatch = filters.partnership === 'all' || country['Partnership Level'] === filters.partnership;
            const regionMatch = filters.region === 'all' || country.Region === filters.region;
            const ftaMatch = filters.fta === 'all' || country['FTA Status'] === filters.fta;
            return partnershipMatch && regionMatch && ftaMatch;
        });
    }, [countries, filters]);

    if (loading) return <Loader message="Đang tải dữ liệu bản đồ..." />;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="partnership-filter" className="block text-sm font-medium text-gray-700">Mức độ hợp tác</label>
                    <select id="partnership-filter" value={filters.partnership} onChange={e => setFilters(f => ({...f, partnership: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="all">Tất cả</option>
                        {partnershipLevels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div>
                     <label htmlFor="region-filter" className="block text-sm font-medium text-gray-700">Khu vực</label>
                    <select id="region-filter" value={filters.region} onChange={e => setFilters(f => ({...f, region: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="all">Tất cả</option>
                        {regions.map(region => <option key={region} value={region}>{region}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="fta-filter" className="block text-sm font-medium text-gray-700">Tình trạng FTA</label>
                    <select id="fta-filter" value={filters.fta} onChange={e => setFilters(f => ({...f, fta: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="all">Tất cả</option>
                        {ftaStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            </div>
            <div className="h-[70vh] w-full rounded-xl overflow-hidden shadow-lg border">
                 <MapContainer center={[16, 106]} zoom={5} scrollWheelZoom={true}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {filteredCountries.map(country => {
                        const lat = parseFloat(country.Latitude);
                        const lng = parseFloat(country.Longitude);

                        if (isNaN(lat) || isNaN(lng)) {
                            console.warn(`Invalid or missing coordinates for ${country.Country}`);
                            return null;
                        }
                        
                        const position: [number, number] = [lat, lng];
                        const color = getPartnershipColor(country['Partnership Level']);
                        const icon = createColoredIcon(color);

                        return (
                            <Marker key={country.Country} position={position} icon={icon}>
                                <Popup>
                                    <CountryPopupContent country={country} />
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
};