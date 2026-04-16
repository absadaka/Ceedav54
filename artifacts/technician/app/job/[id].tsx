import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  EmptyState,
  Input,
  KV,
  PriorityDot,
  SectionTitle,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  addJobNote,
  addJobPart,
  changeJobStatus,
  deleteJobPart,
  getJob,
  jobTimer,
  patchJob,
  type JobDetail,
} from "@/lib/api";

type TabKey = "vehicle" | "estimation" | "inspection" | "feedback";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant, user, loading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("vehicle");

  const authReady = !loading;
  const authed = !!user && !!tenant;

  const q = useQuery({
    queryKey: ["job", id, tenant?.slug],
    enabled: !!id && !!tenant?.slug && authed,
    queryFn: () => getJob(String(id), tenant!.slug),
  });

  if (authReady && !authed) {
    return <Redirect href="/login" />;
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["job", id, tenant?.slug] });
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
  };

  const statusMut = useMutation({
    mutationFn: (to_status: string) =>
      changeJobStatus(String(id), tenant!.slug, to_status, user?.id ?? null),
    onSuccess: invalidate,
    onError: (e) =>
      Alert.alert(
        "Couldn't update status",
        e instanceof Error ? e.message : "Try again.",
      ),
  });

  const onTimerError = (e: unknown) =>
    Alert.alert(
      "Timer error",
      e instanceof Error ? e.message : "Couldn't update the timer.",
    );

  const startTimer = useMutation({
    mutationFn: () => jobTimer(String(id), tenant!.slug, "start", user?.id ?? null),
    onSuccess: invalidate,
    onError: onTimerError,
  });
  const stopTimer = useMutation({
    mutationFn: () => jobTimer(String(id), tenant!.slug, "stop", user?.id ?? null),
    onSuccess: invalidate,
    onError: onTimerError,
  });

  if (q.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <EmptyState
        icon="alert-triangle"
        title="Couldn't load job"
        description={
          q.error instanceof Error ? q.error.message : "Pull to retry."
        }
      />
    );
  }

  const data: JobDetail = q.data;
  const job = data.job;
  const isRunning = data.timeLogs.some((l) => !l.ended_at);
  const totalMinutes = data.totalMinutes ?? data.timeLogs.reduce(
    (sum, l) => sum + (l.minutes ?? 0),
    0,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        <Card style={{ gap: 12 }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <PriorityDot priority={job.priority} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: colors.mutedForeground,
                fontSize: 13,
                letterSpacing: 0.4,
              }}
            >
              {job.ref}
            </Text>
            <View style={{ flex: 1 }} />
            <StatusBadge status={job.status} />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Inter_700Bold",
              color: colors.foreground,
            }}
          >
            {job.client_name ?? "Walk-in customer"}
          </Text>
          {job.customer_concern ? (
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {job.customer_concern}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m logged
              </Text>
            </View>
            <Button
              size="sm"
              variant={isRunning ? "destructive" : "success"}
              icon={isRunning ? "pause" : "play"}
              label={isRunning ? "Stop timer" : "Start timer"}
              onPress={() => (isRunning ? stopTimer.mutate() : startTimer.mutate())}
              loading={startTimer.isPending || stopTimer.isPending}
            />
          </View>
        </Card>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 4,
            gap: 4,
          }}
        >
          {(
            [
              { k: "vehicle", l: "Details", i: "info" as const },
              { k: "estimation", l: "Estimate", i: "list" as const },
              { k: "inspection", l: "Inspection", i: "search" as const },
              { k: "feedback", l: "Feedback", i: "message-square" as const },
            ] as const
          ).map((t) => {
            const active = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => setTab(t.k)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 8,
                  backgroundColor: active ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Feather
                  name={t.i}
                  size={14}
                  color={active ? "#fff" : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: active ? "#fff" : colors.foreground,
                  }}
                >
                  {t.l}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "vehicle" && <DetailsTab data={data} />}
        {tab === "estimation" && <EstimationTab data={data} onChanged={invalidate} />}
        {tab === "inspection" && <InspectionTab data={data} onChanged={invalidate} />}
        {tab === "feedback" && <FeedbackTab data={data} onChanged={invalidate} />}

        {/* Status actions */}
        <Card style={{ gap: 10 }}>
          <SectionTitle icon="activity" title="Update status" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {nextStatuses(job.status).map((s) => (
              <Button
                key={s.to}
                label={s.label}
                icon={s.icon as keyof typeof Feather.glyphMap}
                variant={s.variant}
                size="sm"
                onPress={() => statusMut.mutate(s.to)}
                loading={statusMut.isPending && statusMut.variables === s.to}
              />
            ))}
            {nextStatuses(job.status).length === 0 ? (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                }}
              >
                No further status changes available from here.
              </Text>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function nextStatuses(
  current: string,
): Array<{ to: string; label: string; icon: string; variant: "primary" | "success" | "secondary" | "destructive" }> {
  switch (current) {
    case "new":
    case "waiting":
      return [
        { to: "in_progress", label: "Start work", icon: "play", variant: "primary" },
        { to: "on_hold", label: "On hold", icon: "pause", variant: "secondary" },
      ];
    case "in_progress":
      return [
        { to: "waiting_parts", label: "Waiting parts", icon: "package", variant: "secondary" },
        { to: "qc", label: "Send to QC", icon: "shield", variant: "secondary" },
        { to: "completed", label: "Mark complete", icon: "check", variant: "success" },
        { to: "on_hold", label: "On hold", icon: "pause", variant: "secondary" },
      ];
    case "on_hold":
    case "waiting_parts":
      return [
        { to: "in_progress", label: "Resume", icon: "play", variant: "primary" },
      ];
    case "qc":
      return [
        { to: "completed", label: "QC pass", icon: "check", variant: "success" },
        { to: "in_progress", label: "Send back", icon: "rotate-ccw", variant: "secondary" },
      ];
    default:
      return [];
  }
}

/* ─────────────────────────────────── Tabs ─────────────────────────────────── */

function DetailsTab({ data }: { data: JobDetail }) {
  const colors = useColors();
  const { job } = data;
  const vehicleHeader = [job.make, job.model, job.year]
    .filter(Boolean)
    .join(" ");
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <SectionTitle icon="truck" title="Vehicle" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                color: colors.foreground,
                letterSpacing: 0.8,
                fontSize: 16,
              }}
            >
              {job.plate_number ?? "—"}
            </Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: "Inter_600SemiBold",
              color: colors.foreground,
              fontSize: 16,
            }}
          >
            {vehicleHeader || "Vehicle"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <View style={{ flexBasis: "50%" }}>
            <KV k="Color" v={job.color} icon="droplet" />
          </View>
          <View style={{ flexBasis: "50%" }}>
            <KV k="VIN" v={job.vin} icon="hash" />
          </View>
          <View style={{ flexBasis: "50%" }}>
            <KV
              k="Mileage"
              v={
                job.vehicle_mileage != null
                  ? `${job.vehicle_mileage.toLocaleString()} km`
                  : null
              }
              icon="map"
            />
          </View>
          <View style={{ flexBasis: "50%" }}>
            <KV
              k="Mileage in"
              v={job.mileage_in ? `${job.mileage_in.toLocaleString()} km` : null}
              icon="trending-up"
            />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle icon="user" title="Customer" />
        <KV k="Name" v={job.client_name} icon="user" />
        <KV k="Phone" v={job.client_phone} icon="phone" />
        <KV k="Email" v={job.client_email} icon="mail" />
      </Card>

      <Card>
        <SectionTitle icon="clipboard" title="Job summary" />
        <KV
          k="Scheduled"
          v={
            job.scheduled_date
              ? new Date(job.scheduled_date).toLocaleString()
              : null
          }
          icon="calendar"
        />
        <KV
          k="Started"
          v={job.started_at ? new Date(job.started_at).toLocaleString() : null}
          icon="play"
        />
        <KV
          k="Created"
          v={new Date(job.created_at).toLocaleString()}
          icon="clock"
        />
        <KV k="Type" v={job.type.replace(/_/g, " ")} icon="tag" />
      </Card>
    </View>
  );
}

function EstimationTab({
  data,
  onChanged,
}: {
  data: JobDetail;
  onChanged: () => void;
}) {
  const { tenant, user } = useAuth();
  const colors = useColors();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const addPart = useMutation({
    mutationFn: () =>
      addJobPart(data.job.id, tenant!.slug, {
        description: desc.trim(),
        qty: Number(qty) || 1,
        unit_price: Number(price) || 0,
        added_by: user?.id ?? null,
      }),
    onSuccess: () => {
      setDesc("");
      setQty("1");
      setPrice("");
      onChanged();
    },
    onError: (e) =>
      Alert.alert(
        "Couldn't add line",
        e instanceof Error ? e.message : "Try again.",
      ),
  });

  const delPart = useMutation({
    mutationFn: (pid: string) =>
      deleteJobPart(data.job.id, pid, tenant!.slug),
    onSuccess: onChanged,
    onError: (e) =>
      Alert.alert(
        "Couldn't remove line",
        e instanceof Error ? e.message : "Try again.",
      ),
  });

  const total = data.parts.reduce(
    (sum, p) => sum + Number(p.line_total ?? 0),
    0,
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ gap: 16 }}
    >
      <Card>
        <SectionTitle icon="list" title="Estimate lines" />
        {data.parts.length === 0 ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              textAlign: "center",
              paddingVertical: 20,
            }}
          >
            No estimate lines yet. Add parts and labour below.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {data.parts.map((p) => (
              <View
                key={p.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: colors.foreground,
                    }}
                  >
                    {p.description}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      marginTop: 2,
                    }}
                  >
                    {p.qty} × {Number(p.unit_price).toFixed(2)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: colors.foreground,
                    fontSize: 15,
                  }}
                >
                  {Number(p.line_total).toFixed(2)}
                </Text>
                <Pressable
                  onPress={() => delPart.mutate(p.id)}
                  hitSlop={8}
                  style={{ padding: 6 }}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 17,
                  color: colors.primary,
                }}
              >
                {total.toFixed(2)} {tenant?.currency ?? ""}
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionTitle icon="plus" title="Add line" />
        <Input
          label="Description"
          value={desc}
          onChangeText={setDesc}
          placeholder="e.g. Brake pads — front"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Quantity"
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Unit price"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        </View>
        <Button
          label="Add line"
          icon="plus"
          onPress={() => addPart.mutate()}
          loading={addPart.isPending}
          disabled={!desc.trim()}
        />
      </Card>
    </KeyboardAvoidingView>
  );
}

function InspectionTab({
  data,
  onChanged,
}: {
  data: JobDetail;
  onChanged: () => void;
}) {
  const { tenant, user } = useAuth();
  const colors = useColors();
  const [note, setNote] = useState("");
  const [savingMain, setSavingMain] = useState(false);
  const [mainNote, setMainNote] = useState(data.job.technician_note ?? "");
  const [mainNoteDirty, setMainNoteDirty] = useState(false);

  useEffect(() => {
    if (!mainNoteDirty) {
      setMainNote(data.job.technician_note ?? "");
    }
  }, [data.job.technician_note, mainNoteDirty]);

  const saveMain = async () => {
    setSavingMain(true);
    try {
      await patchJob(data.job.id, tenant!.slug, { technician_note: mainNote });
      setMainNoteDirty(false);
      onChanged();
    } catch (e) {
      Alert.alert(
        "Couldn't save",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setSavingMain(false);
    }
  };

  const addNote = useMutation({
    mutationFn: () =>
      addJobNote(data.job.id, tenant!.slug, note.trim(), "technician", user?.id ?? null),
    onSuccess: () => {
      setNote("");
      onChanged();
    },
    onError: (e) =>
      Alert.alert(
        "Couldn't add note",
        e instanceof Error ? e.message : "Try again.",
      ),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ gap: 16 }}
    >
      <Card style={{ gap: 12 }}>
        <SectionTitle icon="search" title="Inspection findings" />
        <Input
          value={mainNote}
          onChangeText={(t) => {
            setMainNote(t);
            setMainNoteDirty(true);
          }}
          placeholder="Document what you found during inspection — wear, faults, recommendations…"
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />
        <Button
          label="Save findings"
          icon="save"
          onPress={saveMain}
          loading={savingMain}
        />
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionTitle
          icon="message-circle"
          title={`Inspection notes (${data.techNotes.length})`}
        />
        {data.techNotes.length === 0 ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              textAlign: "center",
              paddingVertical: 12,
            }}
          >
            No notes yet.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {data.techNotes.map((n) => (
              <View
                key={n.id}
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {new Date(n.created_at).toLocaleString()}
                  {n.created_by_name ? ` · ${n.created_by_name}` : ""}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    lineHeight: 20,
                  }}
                >
                  {n.note}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Input
          value={note}
          onChangeText={setNote}
          placeholder="Add a quick note…"
          multiline
          style={{ minHeight: 60, textAlignVertical: "top" }}
        />
        <Button
          label="Add note"
          icon="plus"
          variant="secondary"
          onPress={() => addNote.mutate()}
          loading={addNote.isPending}
          disabled={!note.trim()}
        />
      </Card>
    </KeyboardAvoidingView>
  );
}

function FeedbackTab({
  data,
  onChanged,
}: {
  data: JobDetail;
  onChanged: () => void;
}) {
  const { tenant, user } = useAuth();
  const colors = useColors();
  const [note, setNote] = useState("");

  const addReport = useMutation({
    mutationFn: () =>
      addJobNote(data.job.id, tenant!.slug, note.trim(), "report", user?.id ?? null),
    onSuccess: () => {
      setNote("");
      onChanged();
    },
    onError: (e) =>
      Alert.alert(
        "Couldn't submit",
        e instanceof Error ? e.message : "Try again.",
      ),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ gap: 16 }}
    >
      <Card style={{ gap: 12 }}>
        <SectionTitle
          icon="file-text"
          title={`Customer report entries (${data.reportNotes.length})`}
        />
        {data.reportNotes.length === 0 ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              textAlign: "center",
              paddingVertical: 12,
            }}
          >
            No feedback submitted yet. Use this section to record what was done
            for the customer.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {data.reportNotes.map((n) => (
              <View
                key={n.id}
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 10,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {new Date(n.created_at).toLocaleString()}
                  {n.created_by_name ? ` · ${n.created_by_name}` : ""}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    lineHeight: 20,
                  }}
                >
                  {n.note}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionTitle icon="edit-3" title="Submit repair feedback" />
        <Input
          value={note}
          onChangeText={setNote}
          placeholder="Describe the work completed, parts replaced, recommendations…"
          multiline
          numberOfLines={6}
          style={{ minHeight: 140, textAlignVertical: "top" }}
        />
        <Button
          label="Submit feedback"
          icon="send"
          onPress={() => addReport.mutate()}
          loading={addReport.isPending}
          disabled={!note.trim()}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            fontFamily: "Inter_400Regular",
          }}
        >
          This appears on the customer invoice and report.
        </Text>
      </Card>
    </KeyboardAvoidingView>
  );
}
