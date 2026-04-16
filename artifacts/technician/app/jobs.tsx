import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Card,
  EmptyState,
  PriorityDot,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listMyJobs, type JobListItem } from "@/lib/api";

const FILTERS: Array<{ key: string; label: string; statuses: string[] | null }> = [
  { key: "active", label: "Active", statuses: ["new", "waiting", "in_progress", "on_hold", "waiting_parts", "qc"] },
  { key: "today", label: "Today", statuses: null },
  { key: "completed", label: "Completed", statuses: ["completed", "invoiced", "paid", "delivered"] },
  { key: "all", label: "All", statuses: null },
];

export default function JobsScreen() {
  const { user, tenant, signOut, loading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("active");

  if (!loading && (!user || !tenant)) {
    return <Redirect href="/login" />;
  }

  const handleSignOut = async () => {
    await signOut();
    qc.clear();
    router.replace("/login");
  };

  const q = useQuery({
    queryKey: ["my-jobs", tenant?.slug, user?.id],
    enabled: !!tenant?.slug && !!user?.id,
    queryFn: () =>
      listMyJobs({
        tenantSlug: tenant!.slug,
        technicianId: user!.id,
      }),
  });

  const filtered: JobListItem[] = useMemo(() => {
    const all = q.data ?? [];
    const f = FILTERS.find((x) => x.key === filter);
    if (!f || !f.statuses) {
      if (filter === "today") {
        const today = new Date().toISOString().slice(0, 10);
        return all.filter(
          (j) => (j.scheduled_date ?? j.created_at).slice(0, 10) === today,
        );
      }
      return all;
    }
    return all.filter((j) => f.statuses!.includes(j.status));
  }, [q.data, filter]);

  const counts = useMemo(() => {
    const all = q.data ?? [];
    return {
      active: all.filter((j) =>
        ["new", "waiting", "in_progress", "on_hold", "waiting_parts", "qc"].includes(
          j.status,
        ),
      ).length,
      completed: all.filter((j) =>
        ["completed", "invoiced", "paid", "delivered"].includes(j.status),
      ).length,
      total: all.length,
    };
  }, [q.data]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="tool" size={20} color="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                color: colors.mutedForeground,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {tenant?.name ?? "Workshop"}
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
              }}
            >
              {user?.name ?? "Technician"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSignOut}
          hitSlop={8}
          style={({ pressed }) => ({
            padding: 10,
            opacity: pressed ? 0.6 : 1,
            borderRadius: 8,
          })}
        >
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* KPI strip */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 6,
        }}
      >
        <Kpi label="Active" value={counts.active} icon="activity" />
        <Kpi label="Done" value={counts.completed} icon="check-circle" />
        <Kpi label="Total" value={counts.total} icon="briefcase" />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? "#fff" : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {q.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : q.isError ? (
        <EmptyState
          icon="wifi-off"
          title="Couldn't load jobs"
          description={q.error instanceof Error ? q.error.message : "Try again."}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 24,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching && !q.isLoading}
              onRefresh={() => q.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="No jobs here yet"
              description="When new work is assigned to you, it will appear in this list."
            />
          }
          renderItem={({ item }) => (
            <JobCard item={item} onPress={() => router.push(`/job/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <Card style={{ flex: 1, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={icon} size={14} color={colors.primary} />
        <Text
          style={{
            fontSize: 11,
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
    </Card>
  );
}

function JobCard({ item, onPress }: { item: JobListItem; onPress: () => void }) {
  const colors = useColors();
  const vehicle = [item.make, item.model, item.year]
    .filter(Boolean)
    .join(" ");
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: colors.radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <PriorityDot priority={item.priority} />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: colors.mutedForeground,
            letterSpacing: 0.4,
          }}
        >
          {item.ref}
        </Text>
        <View style={{ flex: 1 }} />
        <StatusBadge status={item.status} />
      </View>
      <Text
        style={{
          fontSize: 17,
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        }}
        numberOfLines={1}
      >
        {item.client_name ?? "Walk-in customer"}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          marginTop: 8,
        }}
      >
        {vehicle ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="truck" size={13} color={colors.mutedForeground} />
            <Text
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              }}
            >
              {vehicle}
            </Text>
          </View>
        ) : null}
        {item.plate_number ? (
          <View
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
                letterSpacing: 0.6,
              }}
            >
              {item.plate_number}
            </Text>
          </View>
        ) : null}
      </View>
      {item.customer_concern ? (
        <Text
          style={{
            marginTop: 10,
            fontSize: 13,
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
          }}
          numberOfLines={2}
        >
          {item.customer_concern}
        </Text>
      ) : null}
    </Pressable>
  );
}
