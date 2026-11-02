import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, space, useTheme } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const style = { padding: padded ? space.lg : 0, paddingBottom: insets.bottom + space.xxl, gap: space.lg };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.background }, style]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={style} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={[{ color: c.text, fontSize: 28 }, font.display]}>{children}</Text>;
}

export function H2({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.rowBetween}>
      <Text accessibilityRole="header" style={[{ color: c.text, fontSize: 20, flexShrink: 1 }, font.display]}>{children}</Text>
      {action}
    </View>
  );
}

export function Body({ children, muted = false, size = font.body }: { children: ReactNode; muted?: boolean; size?: number }) {
  const { c } = useTheme();
  return <Text style={{ color: muted ? c.textMuted : c.text, fontSize: size, lineHeight: size * 1.45 }}>{children}</Text>;
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title, onPress, variant = "primary", loading = false, disabled = false, icon, style, accessibilityHint,
}: { title: string; onPress?: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; icon?: IconName; style?: ViewStyle; accessibilityHint?: string }) {
  const { c } = useTheme();
  const bg = { primary: c.primary, secondary: c.surface, danger: c.danger, ghost: "transparent" }[variant];
  const fg = { primary: c.onPrimary, secondary: c.text, danger: "#fff", ghost: c.text }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === "secondary" ? c.border : bg, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: "700", fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.text, fontWeight: "600" }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={c.textMuted}
        {...props}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
          props.multiline ? { minHeight: 110, textAlignVertical: "top", paddingTop: 12 } : null,
          props.style,
        ]}
      />
      {error ? <Text style={{ color: c.danger, fontSize: font.small }} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text style={{ color: c.textMuted, fontSize: font.small }}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected = false, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? c.selected : c.border, backgroundColor: selected ? c.selected : c.surface }]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? c.onSelected : c.textMuted} /> : null}
      <Text style={{ color: selected ? c.onSelected : c.text, fontWeight: "600", fontSize: font.small }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: "neutral" | "success" | "warning" | "danger"; icon?: IconName }) {
  const { c } = useTheme();
  const t = {
    neutral: { bg: c.surface2, fg: c.textMuted },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.haldi, fg: c.primaryStrong },
    danger: { bg: c.dangerSoft, fg: c.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={{ color: t.fg, fontSize: font.tiny, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "success" | "danger" | "warning"; title?: string; children?: ReactNode }) {
  const { c } = useTheme();
  const t = { info: c.peacockSoft, success: c.successSoft, danger: c.dangerSoft, warning: c.haldi }[tone];
  return (
    <View accessibilityRole={tone === "danger" ? "alert" : undefined} style={[styles.notice, { backgroundColor: t }]}>
      {title ? <Text style={{ color: c.text, fontWeight: "700" }}>{title}</Text> : null}
      {children ? <Text style={{ color: c.textMuted, lineHeight: 20 }}>{children}</Text> : null}
    </View>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <Text style={{ color: c.text, fontWeight: "800", fontSize: 18, textAlign: "center" }}>{title}</Text>
      {body ? <Text style={{ color: c.textMuted, textAlign: "center", lineHeight: 21 }}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState title="That didn't load" body={message} action={onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : undefined} />;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={styles.checkRow}>
      <View style={[styles.checkBox, { borderColor: checked ? c.selected : c.border, backgroundColor: checked ? c.selected : c.surface }]}>
        {checked ? <Ionicons name="checkmark" size={16} color={c.onSelected} /> : null}
      </View>
      <Text style={{ color: c.text, flex: 1, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({ title, subtitle, icon, onPress, right }: { title: string; subtitle?: string; icon?: IconName; onPress?: () => void; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} onPress={onPress} style={[styles.listRow, { borderColor: c.border }]}>
      {icon ? <Ionicons name={icon} size={22} color={c.textMuted} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontWeight: "600", fontSize: 16 }}>{title}</Text>
        {subtitle ? <Text style={{ color: c.textMuted, fontSize: font.small }}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.md },
  button: { minHeight: 48, borderRadius: 999, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 36, paddingVertical: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  card: { borderWidth: 1, borderRadius: 18, padding: space.lg, gap: space.sm },
  notice: { borderRadius: 14, padding: 14, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 20, padding: space.xl, alignItems: "center", gap: space.sm },
  checkRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: 44, paddingVertical: 6 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
});
