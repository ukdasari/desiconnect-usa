import { useState } from "react";
import { View } from "react-native";
import { PILOT_MARKET } from "@desiconnect/contracts";
import { fromZip, useLocation } from "@/lib/location";
import { space } from "@/lib/theme";
import { Body, Button, Chip, Field, Notice } from "./ui";

/** Optional device location, a ZIP code, or a DFW city. Used by onboarding and the location screen. */
export function LocationPicker({ onDone }: { onDone: () => void }) {
  const { location, setLocation, requestDeviceLocation } = useLocation();
  const [zip, setZip] = useState(location.zip ?? "");
  const [zipError, setZipError] = useState<string>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <View style={{ gap: space.lg }}>
      <Button
        title="Use my current location"
        icon="navigate"
        variant="secondary"
        loading={locating}
        accessibilityHint="Asks for location permission. Only your city is saved."
        onPress={async () => {
          setLocating(true);
          const problem = await requestDeviceLocation();
          setLocating(false);
          if (problem) setNotice(problem);
          else onDone();
        }}
      />
      {notice ? <Notice tone="warning">{notice}</Notice> : null}
      <View style={{ gap: space.sm }}>
        <Field label="Or enter a ZIP code" value={zip} onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))} keyboardType="number-pad" placeholder="75034" error={zipError} maxLength={5} />
        <Button
          title="Use this ZIP"
          onPress={async () => {
            const loc = fromZip(zip);
            if (!loc) return setZipError("Enter a 5-digit ZIP code");
            await setLocation(loc);
            onDone();
          }}
        />
      </View>
      <Body muted>Or pick a city in {PILOT_MARKET.name}:</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {PILOT_MARKET.cities.map((city) => (
          <Chip
            key={city}
            label={city}
            selected={location.city === city}
            onPress={async () => {
              await setLocation({ city, state: "TX", label: `${city}, TX` });
              onDone();
            }}
          />
        ))}
      </View>
    </View>
  );
}
