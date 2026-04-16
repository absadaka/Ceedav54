import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: colors.radius,
          padding: 16,
        },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          flex: 1,
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  size = "md",
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "success";
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}) {
  const colors = useColors();
  const bg = {
    primary: colors.primary,
    secondary: colors.secondary,
    ghost: "transparent",
    destructive: colors.destructive,
    success: colors.success,
  }[variant];
  const fg = {
    primary: colors.primaryForeground,
    secondary: colors.foreground,
    ghost: colors.foreground,
    destructive: "#fff",
    success: "#fff",
  }[variant];
  const padding = { sm: 8, md: 12, lg: 16 }[size];
  const fontSize = { sm: 13, md: 15, lg: 16 }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 10,
          paddingVertical: padding,
          paddingHorizontal: padding + 6,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={fontSize + 2} color={fg} /> : null}
          <Text
            style={{ color: fg, fontFamily: "Inter_600SemiBold", fontSize }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      {props.label ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_500Medium",
            color: colors.mutedForeground,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {props.label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: colors.foreground,
            backgroundColor: colors.card,
          },
          props.style,
        ]}
      />
    </View>
  );
}

const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  new:           { label: "New",            bg: "#eef2ff", fg: "#4338ca" },
  waiting:       { label: "Waiting",        bg: "#fef3c7", fg: "#92400e" },
  on_hold:       { label: "On hold",        bg: "#fee2e2", fg: "#991b1b" },
  qc:            { label: "QC",             bg: "#e0e7ff", fg: "#3730a3" },
  in_progress:   { label: "In progress",    bg: "#dcfce7", fg: "#166534" },
  waiting_parts: { label: "Waiting parts",  bg: "#ffedd5", fg: "#9a3412" },
  completed:     { label: "Completed",      bg: "#d1fae5", fg: "#065f46" },
  invoiced:      { label: "Invoiced",       bg: "#cffafe", fg: "#155e75" },
  paid:          { label: "Paid",           bg: "#dcfce7", fg: "#14532d" },
  delivered:     { label: "Delivered",      bg: "#e0e7ff", fg: "#3730a3" },
  cancelled:     { label: "Cancelled",      bg: "#f3f4f6", fg: "#374151" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    bg: "#eef2ff",
    fg: "#3730a3",
  };
  return (
    <View
      style={{
        backgroundColor: meta.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: meta.fg,
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {meta.label}
      </Text>
    </View>
  );
}

export function PriorityDot({ priority }: { priority: string | null }) {
  const map: Record<string, string> = {
    low: "#9ca3af",
    normal: "#3b82f6",
    high: "#f59e0b",
    urgent: "#dc2626",
  };
  const c = map[priority ?? "normal"] ?? "#3b82f6";
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: c,
      }}
    />
  );
}

export function KV({
  k,
  v,
  icon,
}: {
  k: string;
  v: string | null | undefined;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 6 }}>
      {icon ? (
        <Feather
          name={icon}
          size={14}
          color={colors.mutedForeground}
          style={{ marginTop: 3 }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {k}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            marginTop: 2,
          }}
        >
          {v && String(v).trim() !== "" ? v : "—"}
        </Text>
      </View>
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text
        style={{
          fontSize: 17,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{
            marginTop: 6,
            fontSize: 14,
            color: colors.mutedForeground,
            textAlign: "center",
            fontFamily: "Inter_400Regular",
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({});
