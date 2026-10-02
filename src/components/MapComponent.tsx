"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper component to center map when professionals update
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface MapProps {
  professionals: Array<{
    id: number;
    latitud: number | null;
    longitud: number | null;
    user?: { name: string };
    provincia?: string;
    ciudad?: string;
  }>;
}

export default function MapComponent({ professionals }: MapProps) {
  // Coordenadas del centro de Ecuador por defecto
  const defaultCenter: [number, number] = [-1.831239, -78.183406];

  // Crear icono personalizado
  const customIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const activeProfessionals = professionals.filter(
    (p) => p.latitud !== null && p.longitud !== null
  );

  const center: [number, number] =
    activeProfessionals.length > 0
      ? [activeProfessionals[0].latitud!, activeProfessionals[0].longitud!]
      : defaultCenter;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-900/20">
      <MapContainer
        center={center}
        zoom={activeProfessionals.length > 0 ? 11 : 6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />
        {activeProfessionals.map((prof) => (
          <Marker
            key={prof.id}
            position={[prof.latitud!, prof.longitud!]}
            icon={customIcon}
          >
            <Popup>
              <div className="text-slate-900 font-sans p-1 text-xs">
                <p className="font-bold text-sm leading-tight">{prof.user?.name}</p>
                <p className="text-slate-500 mt-1">📍 {prof.provincia}, {prof.ciudad}</p>
                <a
                  href={`/directorio/${prof.id}`}
                  className="inline-block mt-2 font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Ver Perfil Completo
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
