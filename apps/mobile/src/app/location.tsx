import { useRouter } from "expo-router";
import { LocationPicker } from "@/components/location-picker";
import { Body, Screen } from "@/components/ui";
import { useLocation } from "@/lib/location";

export default function LocationScreen() {
  const router = useRouter();
  const { location } = useLocation();
  return (
    <Screen>
      <Body muted>Currently showing listings near {location.label}.</Body>
      <LocationPicker onDone={() => router.back()} />
    </Screen>
  );
}
