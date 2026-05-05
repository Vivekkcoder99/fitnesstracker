import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
} from "react-native";
import { signup } from "../../services/authService";
import { theme } from "../../theme";
import PrimaryButton from "../../components/PrimaryButton";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    Keyboard.dismiss();
    try {
      setError("");
      setLoading(true);
      await signup(email.trim(), password);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* ── Brand Hero ───────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.logoText}>PACE</Text>
          <Text style={styles.tagline}>Start tracking your progress today.</Text>
        </View>

        {/* ── Form ─────────────────────────────────────── */}
        <View style={styles.formContainer}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              placeholder="Min 6 characters"
              placeholderTextColor={theme.colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
          />

          {/* ── Divider ────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Footer ─────────────────────────────────── */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation?.navigate("Login")}
          >
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkAccent}>Sign in →</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },

  /* Brand hero */
  heroSection: {
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
    gap: 8,
  },
  logoText: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 42,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    letterSpacing: 0.5,
  },

  /* Form */
  formContainer: {
    gap: theme.spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.mono.fontFamily,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "500",
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: theme.spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    letterSpacing: 0.5,
  },

  /* Link */
  linkRow: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  linkAccent: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default SignupScreen;
