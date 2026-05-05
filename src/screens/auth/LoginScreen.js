import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
} from "react-native";
import { login, resetPassword } from "../../services/authService";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/PrimaryButton";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    try {
      setError("");
      setLoading(true);
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!email) {
      Alert.alert("Email required", "Please enter your email to reset password.");
      return;
    }
    try {
      setError("");
      setResettingPassword(true);
      await resetPassword(email.trim());
      Alert.alert(
        "Reset email sent",
        "Check your inbox for password reset instructions."
      );
    } catch (err) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setResettingPassword(false);
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
          <Text style={styles.tagline}>Track every step. Own every mile.</Text>
        </View>

        {/* ── Form ─────────────────────────────────────── */}
        <View style={styles.formContainer}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              placeholder="vivek@example.com"
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
              placeholder="••••••••"
              placeholderTextColor={theme.colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading || resettingPassword}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>
              {resettingPassword ? "Sending reset email..." : "Forgot password?"}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={resettingPassword}
          />

          {/* ── Divider ────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Footer ─────────────────────────────────── */}
          <TouchableOpacity
            style={styles.createRow}
            onPress={() => navigation?.navigate("Signup")}
          >
            <Text style={styles.createText}>
              New to Pace?{" "}
              <Text style={styles.createLink}>Create account →</Text>
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
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontWeight: "500",
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

  /* Create account */
  createRow: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  createText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  createLink: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default LoginScreen;
