import React, { useEffect, useState, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMapsLibrary,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Clock, ExternalLink, RefreshCw } from 'lucide-react';

const MAPS_API_KEY = (
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof __GOOGLE_MAPS_API_KEY__ !== 'undefined' ? __GOOGLE_MAPS_API_KEY__ : '')
).trim();

const STORE_QUERY = 'Av. Paulista, 1200, Bela Vista, São Paulo - SP, Brasil';
const DIRECTIONS_FALLBACK_URL =
  'https://www.google.com/maps/search/?api=1&query=Av.+Paulista+1200,+Bela+Vista,+Sao+Paulo+-+SP';

interface ResolvedStorePlace {
  location: google.maps.LatLngLiteral;
  formattedAddress: string;
}

function PaulistaMapViewport() {
  const placesLib = useMapsLibrary('places');
  const apiStatus = useApiLoadingStatus();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [storePlace, setStorePlace] = useState<ResolvedStorePlace | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(true);
  const [lookupError, setLookupError] = useState<boolean>(false);

  useEffect(() => {
    if (!placesLib) return;
    let active = true;

    async function resolvePaulistaUnit() {
      try {
        const { Place } = placesLib!;
        const { places } = await Place.searchByText({
          textQuery: STORE_QUERY,
          fields: ['displayName', 'formattedAddress', 'location'],
          language: 'pt-BR',
          region: 'BR',
          maxResultCount: 1,
        });

        if (!active) return;

        const match = places?.[0];
        const coords = match?.location?.toJSON();

        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          setStorePlace({
            location: coords,
            formattedAddress:
              match?.formattedAddress || 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
          });
          setLookupError(false);
        } else {
          setLookupError(true);
        }
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.includes('OVER_QUERY_LIMIT') ||
          message.includes('RESOURCE_EXHAUSTED') ||
          message.includes('QuotaExceededError') ||
          message.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setLookupError(true);
      }
    }

    void resolvePaulistaUnit();

    return () => {
      active = false;
    };
  }, [placesLib]);

  const handleMarkerClick = useCallback(() => {
    setInfoWindowOpen(true);
  }, []);

  if (
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE ||
    lookupError
  ) {
    return (
      <div className="h-60 w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display font-bold text-sm text-white">
            Unidade Matriz — Av. Paulista, 1200
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Bela Vista, São Paulo/SP • Próximo ao Metrô Trianon-Masp
          </p>
        </div>
        <a
          href={DIRECTIONS_FALLBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
        >
          <Navigation className="h-3.5 w-3.5" />
          Abrir Localização no Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (!storePlace) {
    return (
      <div className="h-60 w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
        <RefreshCw className="h-5 w-5 animate-spin text-gold-400" />
        <span>Localizando unidade da Avenida Paulista...</span>
      </div>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${storePlace.location.lat},${storePlace.location.lng}`;

  return (
    <div className="space-y-3">
      <div className="h-60 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-lg bg-slate-900">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={storePlace.location}
          defaultZoom={16}
          gestureHandling="cooperative"
          mapTypeControl={false}
          streetViewControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <AdvancedMarker
            ref={markerRef}
            position={storePlace.location}
            onClick={handleMarkerClick}
            title="Ótica Rapido — Unidade Av. Paulista"
          >
            <Pin background="#b0854c" borderColor="#0e1624" glyphColor="#ffffff" />
          </AdvancedMarker>

          {infoWindowOpen && marker && (
            <InfoWindow
              anchor={marker}
              maxWidth={250}
              onCloseClick={() => setInfoWindowOpen(false)}
            >
              <div className="text-left p-1 space-y-1.5 text-slate-900">
                <p className="font-display font-extrabold text-xs text-slate-950">
                  Ótica Rapido — Unidade Paulista
                </p>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {storePlace.formattedAddress}
                </p>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline pt-0.5"
                >
                  <Navigation className="h-3 w-3" />
                  Traçar Rota
                </a>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
          <span className="text-slate-300 font-medium">{storePlace.formattedAddress}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[10px] text-slate-400">
            {storePlace.location.lat.toFixed(5)}, {storePlace.location.lng.toFixed(5)}
          </span>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold-400 hover:text-gold-300 font-bold"
          >
            <Navigation className="h-3 w-3" />
            Como Chegar
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaulistaLocationMap() {
  return (
    <div className="mt-8 pt-8 border-t border-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h5 className="text-white font-display font-bold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold-400" />
            Localização da Unidade Matriz — Avenida Paulista
          </h5>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gold-500" />
            Seg a Sex: 09h às 19h • Sáb: 09h às 15h • Atendimento presencial e saída das visitas em domicílio
          </p>
        </div>
      </div>

      {MAPS_API_KEY ? (
        <APIProvider
          apiKey={MAPS_API_KEY}
          language="pt-BR"
          region="BR"
          libraries={['places', 'marker']}
        >
          <PaulistaMapViewport />
        </APIProvider>
      ) : (
        <div className="h-52 w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center gap-3">
          <MapPin className="h-6 w-6 text-gold-400" />
          <div>
            <p className="font-display font-bold text-sm text-white">
              Av. Paulista, 1200 — Bela Vista, São Paulo/SP
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Consulte rotas e horários de atendimento presencial na unidade matriz.
            </p>
          </div>
          <a
            href={DIRECTIONS_FALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
          >
            <Navigation className="h-3.5 w-3.5" />
            Ver no Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
