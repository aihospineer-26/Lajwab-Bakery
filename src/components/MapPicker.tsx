import React, { useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { radius } from '../theme';

type MapPickerProps = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
};

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

function buildMapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 16);
    L.tileLayer('${TILE_URL}', {
      attribution: '${TILE_ATTRIBUTION}',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);

    function post(latLng) {
      const payload = JSON.stringify({ lat: latLng.lat, lng: latLng.lng });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(payload);
      } else {
        window.parent.postMessage(payload, '*');
      }
    }

    marker.on('dragend', () => post(marker.getLatLng()));
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      post(e.latlng);
    });
  </script>
</body>
</html>`;
}

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const initial = useRef({ lat, lng });
  const html = useMemo(() => buildMapHtml(initial.current.lat, initial.current.lng), []);

  /* react-native-webview has no dependable web build, and the customer app is
     also served as a website. Falling back keeps the address form usable there
     -- "Use my current location" still fills the fields, only the pin is lost. */
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, styles.webFallback]}>
        <Text style={styles.webFallbackText}>
          Pin-drop is available in the app. Use your current location or type the
          address below.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number };
            onChange(data.lat, data.lng);
          } catch {
            // ignore malformed bridge messages
          }
        }}
        style={styles.webview}
      />
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
  webFallback: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F4E8E0',
  },
  webFallbackText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: '#947D6E',
  },
});
