import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Input } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password, tenantSlug.trim() || undefined);
      router.replace("/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
      >
        <View style={{ width: "100%", maxWidth: 460, gap: 24 }}>
          <View style={{ alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 64, height: 64 }}
                contentFit="cover"
              />
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Inter_700Bold",
                  color: colors.foreground,
                }}
              >
                CEER Technician
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.mutedForeground,
                  textAlign: "center",
                }}
              >
                Sign in with your workshop account to view assigned jobs.
              </Text>
            </View>
          </View>

          <Card style={{ gap: 14, padding: 20 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@workshop.ae"
              textContentType="emailAddress"
            />
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: colors.mutedForeground,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  backgroundColor: colors.card,
                  paddingRight: 8,
                }}
              >
                <Input
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter password"
                  textContentType="password"
                  style={{ borderWidth: 0, flex: 1, backgroundColor: "transparent" }}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  style={{ padding: 6 }}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>
            <Input
              label="Workshop slug (optional)"
              value={tenantSlug}
              onChangeText={setTenantSlug}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. demo-workshop"
            />

            {error ? (
              <View
                style={{
                  backgroundColor: "#fee2e2",
                  borderRadius: 8,
                  padding: 10,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <Feather name="alert-circle" size={16} color="#991b1b" />
                <Text
                  style={{
                    color: "#991b1b",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              label="Sign in"
              icon="log-in"
              onPress={onSubmit}
              loading={submitting}
              size="lg"
            />
          </Card>

          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              textAlign: "center",
              fontFamily: "Inter_400Regular",
            }}
          >
            Use the same credentials as the CEER web app.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
