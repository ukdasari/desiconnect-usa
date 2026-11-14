import * as Location from "expo-location";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PILOT_MARKET, US_STATES } from "@desiconnect/contracts";
import { KEYS, prefs } from "./storage";

export interface SavedLocation {
  city?: string;
  state?: string;
  zip?: string;
  label: string;
}

export const DEFAULT_LOCATION: SavedLocation = { city: PILOT_MARKET.city, state: PILOT_MARKET.state, label: PILOT_MARKET.name };

/** Converts "Texas" or "TX" to "TX". */
export function toStateCode(region: string | null | undefined): string | undefined {
  if (!region) return undefined;
  const r = region.trim();
  return US_STATES.find(([code, name]) => code === r.toUpperCase() || name.toLowerCase() === r.toLowerCase())?.[0];
}

export function fromZip(zip: string): SavedLocation | null {
  return /^\d{5}$/.test(zip) ? { zip, label: `ZIP ${zip}` } : null;
}

/** Search query parameters for a saved location. */
export function locationQuery(loc: SavedLocation) {
  return { city: loc.city, state: loc.state, zip: loc.zip };
}

interface LocationApi {
  location: SavedLocation;
  ready: boolean;
  setLocation: (loc: SavedLocation) => Promise<void>;
  /** Asks permission and uses the device position. Returns why it failed, or null on success. */
  requestDeviceLocation: () => Promise<string | null>;
}

const Ctx = createContext<LocationApi | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLoc] = useState<SavedLocation>(DEFAULT_LOCATION);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    prefs.get<SavedLocation>(KEYS.location).then((saved) => {
      if (saved?.label) setLoc(saved);
      setReady(true);
    });
  }, []);

  const setLocation = useCallback(async (loc: SavedLocation) => {
    setLoc(loc);
    await prefs.set(KEYS.location, loc);
  }, []);

  const requestDeviceLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return "Location permission was not given. You can enter a ZIP code instead.";
    try {
      // City-level accuracy is enough and is kinder to privacy and battery.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const state = toStateCode(place?.region);
      if (!place || place.isoCountryCode !== "US" || !state) return "1StopDesi currently covers the United States. Enter a US ZIP code instead.";
      const city = place.city ?? place.subregion ?? undefined;
      await setLocation(city ? { city, state, label: `${city}, ${state}` } : fromZip(place.postalCode ?? "") ?? DEFAULT_LOCATION);
      return null;
    } catch {
      return "Couldn't find your location. Enter a ZIP code instead.";
    }
  }, [setLocation]);

  const value = useMemo(() => ({ location, ready, setLocation, requestDeviceLocation }), [location, ready, setLocation, requestDeviceLocation]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
