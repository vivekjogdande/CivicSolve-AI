import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { STATUS_META, DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/constants';

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const pin = L.divIcon({ className: '', html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1b6f8f;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>', iconSize: [22, 22], iconAnchor: [11, 22] });

function FitBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    if (!items || !items.length) return;
    const b = L.latLngBounds(items.map((i) => [i.location.lat, i.location.lng]));
    if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 14, animate: false });
  }, [items, map]);
  return null;
}

/** Complaint markers (privacy-safe, ~110 m rounded coordinates) coloured by status. */
function Clicker({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function ComplaintMap({ items = [], selectedId, onSelect, onMapClick, picked, className = 'map-box', fit = true, interactive = true }) {
  return (
    <div className={className}>
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom={interactive} dragging={interactive} zoomControl={interactive}>
        <TileLayer url={TILE} attribution={ATTR} />
        {fit && <FitBounds items={items} />}
        {onMapClick && <Clicker onClick={onMapClick} />}
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pin} />}
        {items.map((c) => {
          const color = (STATUS_META[c.status] || {}).color || '#475569';
          const sel = c.complaintId === selectedId;
          return (
            <CircleMarker
              key={c.complaintId}
              center={[c.location.lat, c.location.lng]}
              radius={sel ? 13 : 9}
              pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95, bubblingMouseEvents: false }}
              eventHandlers={onSelect ? { click: () => onSelect(c) } : undefined}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}


function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Recenter({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, Math.max(map.getZoom(), 15), { animate: false }); }, [position, map]);
  return null;
}

/** Click-to-select location picker. */
export function LocationPicker({ lat, lng, onPick, invalid }) {
  const position = useMemo(() => (lat != null && lng != null ? [lat, lng] : null), [lat, lng]);
  return (
    <div className="map-box short" style={invalid ? { borderColor: 'var(--danger)' } : undefined}>
      <MapContainer center={position || DEFAULT_CENTER} zoom={position ? 15 : DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE} attribution={ATTR} />
        <ClickHandler onPick={onPick} />
        <Recenter position={position} />
        {position && <Marker position={position} icon={pin} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onPick(p.lat, p.lng); } }} />}
      </MapContainer>
    </div>
  );
}

export function StatusLegend({ keys }) {
  const list = keys || Object.keys(STATUS_META);
  return (
    <div className="legend" aria-label="Map legend">
      {list.map((k) => <span key={k}><i style={{ background: STATUS_META[k].color }} />{STATUS_META[k].label}</span>)}
    </div>
  );
}
