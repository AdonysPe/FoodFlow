"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIMA_CENTER, LIMA_ZOOM } from "@/lib/orderingWebsite";
import styles from "./TableOrderExperience.module.css";

/**
 * The address step of the delivery checkout.
 *
 * Google Maps is loaded here and nowhere else, the first time a diner picks
 * delivery — the carta itself never pays for the script. Everything the map
 * produces is a convenience: the order is accepted on the zone the restaurant
 * configured and the address the diner confirms, so if the script never
 * arrives, or the key is missing, or permission is denied, the same fields are
 * still typeable and the checkout still completes.
 */

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Optional. Advanced markers need a cloud-styled Map ID; without one we fall
// back to the classic marker, which drags just as well.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
const LOAD_TIMEOUT_MS = 12_000;
const CALLBACK = "__foodflowMapsReady";

let loader = null;
/** One script tag per page, shared by the desktop and the mobile checkout. */
function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (!MAPS_KEY) return Promise.reject(new Error("missing-key"));
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key: MAPS_KEY, v: "weekly", libraries: "places,marker,geocoding",
      language: "es", region: "PE", loading: "async", callback: CALLBACK,
    });
    window[CALLBACK] = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    // A blocked, throttled or offline script must not leave the diner staring
    // at a spinner: reject and let the manual fields take over.
    script.onerror = () => { loader = null; reject(new Error("script")); };
    document.head.appendChild(script);
    setTimeout(() => reject(new Error("timeout")), LOAD_TIMEOUT_MS);
  });
  return loader;
}

// In Peru the district is what everyone means by "zona": Miraflores, Surco,
// Ate. Google files it under whichever of these it has for the address.
const DISTRICT_TYPES = ["sublocality_level_1", "sublocality", "locality", "administrative_area_level_2"];
// Places (New) returns longText/types; the geocoder returns long_name/types.
function districtFrom(components) {
  if (!Array.isArray(components)) return "";
  for (const type of DISTRICT_TYPES) {
    const hit = components.find(part => (part.types ?? []).includes(type));
    if (hit) return hit.longText ?? hit.long_name ?? "";
  }
  return "";
}
const readLatLng = point => point && ({
  lat: typeof point.lat === "function" ? point.lat() : point.lat,
  lng: typeof point.lng === "function" ? point.lng() : point.lng,
});

/** Hides the advanced-vs-classic marker split from the rest of the component. */
function createMarker(maps, map, position, onDragEnd) {
  if (MAP_ID && maps.marker?.AdvancedMarkerElement) {
    const marker = new maps.marker.AdvancedMarkerElement({ map, position, gmpDraggable: true, title: "Tu dirección de entrega" });
    marker.addListener("dragend", event => onDragEnd(readLatLng(event.latLng) ?? readLatLng(marker.position)));
    return { move: next => { marker.position = next; }, destroy: () => { marker.map = null; } };
  }
  const marker = new maps.Marker({ map, position, draggable: true, title: "Tu dirección de entrega" });
  marker.addListener("dragend", event => onDragEnd(readLatLng(event.latLng)));
  return { move: next => marker.setPosition(next), destroy: () => marker.setMap(null) };
}

export default function DeliveryLocationPicker({ idPrefix, value, onChange, onStatusChange, children }) {
  // "loading" until the script answers, then "ready" or "unavailable". The
  // last one is not an error state for the diner — it is the manual form.
  const [status, setStatus] = useState(MAPS_KEY ? "loading" : "unavailable");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const mapNode = useRef(null);
  const searchNode = useRef(null);
  const refs = useRef({ maps: null, map: null, marker: null, geocoder: null });
  // The map callbacks outlive the render that created them, so they read the
  // newest onChange instead of the one captured when the map was built.
  const apply = useRef(onChange);
  apply.current = onChange;

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const place = useCallback((position, details) => {
    refs.current.marker?.move(position);
    refs.current.map?.panTo(position);
    apply.current({
      latitude: position.lat, longitude: position.lng,
      ...(details?.formattedAddress ? { address: details.formattedAddress } : {}),
      ...(details?.district ? { district: details.district } : {}),
      placeId: details?.placeId ?? "",
      // Any move invalidates the previous confirmation: the diner has to look
      // at the pin again before the order goes out.
      locationConfirmed: false,
    });
  }, []);

  const resolveAddress = useCallback(async position => {
    const { maps, geocoder } = refs.current;
    if (!maps || !geocoder) { place(position); return; }
    setBusy("Buscando la dirección…");
    try {
      const { results } = await geocoder.geocode({ location: position, language: "es", region: "pe" });
      const best = results?.[0];
      place(position, best && {
        formattedAddress: best.formatted_address,
        district: districtFrom(best.address_components),
        placeId: best.place_id ?? "",
      });
      setNotice(best ? "" : "No encontramos una dirección exacta en ese punto. Escríbela abajo.");
    } catch {
      place(position);
      setNotice("No pudimos leer la dirección de ese punto. Escríbela abajo.");
    } finally { setBusy(""); }
  }, [place]);

  // Built only once the container has real pixels: the same checkout is
  // rendered in the desktop column and the mobile sheet, and only one of them
  // is ever laid out, so this keeps it to a single map.
  useEffect(() => {
    if (!MAPS_KEY) return;
    const node = mapNode.current;
    if (!node) return;
    let cancelled = false;
    let observer = null;

    async function build() {
      let maps;
      try { maps = await loadGoogleMaps(); }
      catch { if (!cancelled) setStatus("unavailable"); return; }
      if (cancelled || refs.current.map) return;
      try {
        const [{ Map }] = await Promise.all([
          maps.importLibrary("maps"), maps.importLibrary("marker"),
          maps.importLibrary("geocoding"), maps.importLibrary("places"),
        ]);
        if (cancelled || refs.current.map) return;
        const start = value.latitude != null && value.longitude != null
          ? { lat: value.latitude, lng: value.longitude } : { ...LIMA_CENTER };
        const map = new Map(node, {
          center: start, zoom: value.latitude != null ? 17 : LIMA_ZOOM,
          mapId: MAP_ID || undefined, mapTypeControl: false, streetViewControl: false,
          fullscreenControl: false, clickableIcons: false,
          gestureHandling: "greedy",
        });
        refs.current = {
          maps, map, geocoder: new maps.Geocoder(),
          marker: createMarker(maps, map, start, next => { void resolveAddress(next); }),
        };
        map.addListener("click", event => {
          const next = readLatLng(event.latLng);
          if (next) void resolveAddress(next);
        });
        buildSearch(maps);
        setStatus("ready");
      } catch { if (!cancelled) setStatus("unavailable"); }
    }

    function buildSearch(maps) {
      const host = searchNode.current;
      const Element = maps.places?.PlaceAutocompleteElement;
      if (!host || !Element || host.firstChild) return;
      const element = new Element({
        includedRegionCodes: ["pe"],
        locationBias: { center: LIMA_CENTER, radius: 40_000 },
      });
      element.id = `${idPrefix}-address-search`;
      element.style.width = "100%";
      const onSelect = async event => {
        // `gmp-select` is the current event; `gmp-placeselect` was its name
        // while the element was in beta. Both shapes end at a Place.
        const picked = event.placePrediction?.toPlace?.() ?? event.place;
        if (!picked) return;
        setBusy("Ubicando la dirección…");
        try {
          await picked.fetchFields({ fields: ["formattedAddress", "location", "addressComponents", "id"] });
          const position = readLatLng(picked.location);
          if (!position) return;
          refs.current.map?.setZoom(17);
          place(position, {
            formattedAddress: picked.formattedAddress ?? "",
            district: districtFrom(picked.addressComponents),
            placeId: picked.id ?? "",
          });
          setNotice("");
        } catch { setNotice("No pudimos leer esa dirección. Elige el punto en el mapa."); }
        finally { setBusy(""); }
      };
      element.addEventListener("gmp-select", onSelect);
      element.addEventListener("gmp-placeselect", onSelect);
      host.appendChild(element);
    }

    if (node.getBoundingClientRect().width > 0) void build();
    else if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(entries => {
        if (entries.some(entry => entry.contentRect.width > 0)) { observer.disconnect(); void build(); }
      });
      observer.observe(node);
    } else void build();

    return () => {
      cancelled = true;
      observer?.disconnect();
      refs.current.marker?.destroy();
      refs.current = { maps: null, map: null, marker: null, geocoder: null };
      if (searchNode.current) searchNode.current.replaceChildren();
    };
    // Built once per mount. `value` is read for the initial centre only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPrefix, place, resolveAddress]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNotice("No pudimos acceder a tu ubicación. Puedes buscar tu dirección o seleccionarla manualmente en el mapa.");
      return;
    }
    setBusy("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        refs.current.map?.setZoom(17);
        void resolveAddress(point);
      },
      () => {
        setBusy("");
        setNotice("No pudimos acceder a tu ubicación. Puedes buscar tu dirección o seleccionarla manualmente en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }

  const hasPin = value.latitude != null && value.longitude != null;
  const canConfirm = value.address.trim().length >= 5;
  return <div className={styles.locationPicker}>
    {status !== "unavailable" && <>
      <label className={styles.nameLabel} htmlFor={`${idPrefix}-address-search`}>Busca tu dirección</label>
      <div ref={searchNode} className={styles.addressSearch} />
    </>}
    {/* Kept mounted while loading so the container has a size to measure. */}
    {status !== "unavailable" && <div className={styles.mapFrame}>
      <div ref={mapNode} className={styles.mapCanvas} role="application" aria-label="Mapa para elegir tu dirección de entrega" />
      {status === "loading" && <p className={styles.mapOverlay} role="status">Cargando el mapa…</p>}
    </div>}
    {status === "ready" && <p className={styles.mapHint}>Mueve el marcador hasta la entrada de tu domicilio.</p>}
    {status === "unavailable" && <p className={styles.mapHint} role="status">El mapa no está disponible ahora. Escribe tu dirección y una referencia y podrás pedir igual.</p>}
    {status === "ready" && <button type="button" className={styles.ghostAction} onClick={useMyLocation}>Usar mi ubicación</button>}
    {busy && <p className={styles.mapHint} role="status">{busy}</p>}
    {notice && <p className={styles.error} role="status">{notice}</p>}
    <label className={styles.nameLabel} htmlFor={`${idPrefix}-address`}>Dirección
      <input id={`${idPrefix}-address`} value={value.address} required minLength={5} maxLength={200} autoComplete="street-address"
        onChange={event => apply.current({
          address: event.target.value,
          // The pin stays — it is still the best guess of where the door is —
          // but a hand-edited address has to be confirmed again.
          locationConfirmed: false,
        })} />
    </label>
    {children}
    {hasPin && !value.locationConfirmed && <p className={styles.mapHint}>Revisa el punto en el mapa y confírmalo.</p>}
    {/* Without a map there is no pin to confirm — the button still closes the
        step so the diner gets the same delivery summary, but it stops
        promising a confirmation it cannot make. */}
    <button type="button" className={styles.confirmLocation} disabled={!canConfirm} onClick={() => apply.current({ locationConfirmed: true })}>
      {status === "unavailable" ? "Guardar dirección" : "Confirmar ubicación"}
    </button>
  </div>;
}
