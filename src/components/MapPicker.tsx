import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { getCurrentCoords } from '../services/geocoding';
import { radius } from '../theme';

type MapPickerProps = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  /* Native only -- surfaces failures from auto-locate-on-open and the
     recenter button. Web keeps its own separate "Use my current location"
     button and error handling in AddressesScreen. */
  onLocateError?: (message: string) => void;
};

const PIN_COLOR = '#B4553C';

/* Raw tile.openstreetmap.org is explicitly for evaluation only -- OSM's own
 * usage policy asks production apps to use a dedicated provider. Falls back
 * to it when no key is configured so local development needs no signup; see
 * the same fallback in services/geocoding.ts. */
const LOCATIONIQ_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY?.trim() ?? '';
const TILE_URL = LOCATIONIQ_KEY
  ? `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`
  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = LOCATIONIQ_KEY
  ? '&copy; <a href="https://locationiq.com/attribution">LocationIQ</a> &copy; OpenStreetMap contributors'
  : '&copy; OpenStreetMap contributors';

/* Native uses the same fixed-center-pin-you-pan-the-map-under pattern as
   Uber/Rapido/Blinkit -- a marker under a fingertip is hard to place
   precisely since the finger covers the exact point being dropped. */
function buildMapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    #pin {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 30px;
      height: 42px;
      margin-left: -15px;
      margin-top: -42px;
      pointer-events: none;
      transition: margin-top 120ms ease;
      z-index: 1000;
    }
    #pin.lifted { margin-top: -50px; }
    #pin svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="pin">
    <svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${PIN_COLOR}" />
      <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
    </svg>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 16);
    L.tileLayer('${TILE_URL}', {
      attribution: '${TILE_ATTRIBUTION}',
      maxZoom: 19,
    }).addTo(map);

    const pin = document.getElementById('pin');

    function post(payload) {
      const message = JSON.stringify(payload);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(message);
      } else {
        window.parent.postMessage(message, '*');
      }
    }

    map.on('movestart', () => pin.classList.add('lifted'));
    map.on('moveend', () => {
      pin.classList.remove('lifted');
      const center = map.getCenter();
      post({ lat: center.lat, lng: center.lng });
    });

    window.__recenter = function (lat, lng) {
      map.setView([lat, lng], 16);
    };

    post({ ready: true });
  </script>
</body>
</html>`;
}

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

/* Cached at module scope so navigating to the address form more than once
   doesn't re-inject the stylesheet/script tags each time. */
let leafletLoadPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = () => reject(new Error('Could not load the map'));
    document.body.appendChild(script);
  });
  return leafletLoadPromise;
}

export function MapPicker({ lat, lng, onChange, onLocateError }: MapPickerProps) {
  const initial = useRef({ lat, lng });
  const html = useMemo(() => buildMapHtml(initial.current.lat, initial.current.lng), []);
  const webMapNode = useRef<any>(null);
  const webviewRef = useRef<WebView>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onLocateErrorRef = useRef(onLocateError);
  onLocateErrorRef.current = onLocateError;
  const [isLocating, setIsLocating] = useState(false);
  const hasAutoLocated = useRef(false);

  const locate = async () => {
    setIsLocating(true);
    try {
      const found = await getCurrentCoords();
      webviewRef.current?.injectJavaScript(`window.__recenter(${found.lat}, ${found.lng}); true;`);
    } catch (err) {
      onLocateErrorRef.current?.(
        err instanceof Error ? err.message : 'Could not find your location.',
      );
    } finally {
      setIsLocating(false);
    }
  };

  /* react-native-webview has no dependable web build, so on web the map is
     mounted straight into the DOM node behind the View instead -- react-native-web
     forwards refs on host components to the real element. Web keeps the
     simpler tap-to-drop-a-pin flow rather than the pan-under-a-fixed-pin one. */
  useEffect(() => {
    if (Platform.OS !== 'web' || !webMapNode.current) return;
    let map: any;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !webMapNode.current) return;
        map = L.map(webMapNode.current, { zoomControl: true }).setView(
          [initial.current.lat, initial.current.lng],
          16,
        );
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

        const marker = L.marker([initial.current.lat, initial.current.lng], {
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const { lat: draggedLat, lng: draggedLng } = marker.getLatLng();
          onChangeRef.current(draggedLat, draggedLng);
        });
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onChangeRef.current(e.latlng.lat, e.latlng.lng);
        });
      })
      .catch(() => {
        /* Map stays blank; the text fields below are still fully usable. */
      });

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  if (Platform.OS === 'web') {
    return <View ref={webMapNode} style={styles.wrap} />;
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.ready) {
              /* Fires once the page has a live map and window.__recenter --
                 injecting the auto-locate call any earlier races the WebView's
                 own script execution. */
              if (!hasAutoLocated.current) {
                hasAutoLocated.current = true;
                locate();
              }
              return;
            }
            onChangeRef.current(data.lat, data.lng);
          } catch {
            // ignore malformed bridge messages
          }
        }}
        style={styles.webview}
      />
      <Pressable
        style={styles.locateFab}
        onPress={locate}
        disabled={isLocating}
        accessibilityLabel="Use my current location"
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={PIN_COLOR} />
        ) : (
          <Text style={styles.locateFabIcon}>⌖</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 240,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  locateFab: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locateFabIcon: {
    fontSize: 20,
    color: PIN_COLOR,
  },
});
