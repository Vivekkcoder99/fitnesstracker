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
  ActivityIndicator,
  Keyboard
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
        <View style={styles.headerContainer}>
          <View style={styles.brandBadge}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>PACE</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor={theme.colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={resettingPassword}
            style={styles.loginButton}
          />

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading || resettingPassword}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>
              {resettingPassword ? "Sending reset email..." : "Forgot your password?"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate("Signup")}>
            <Text style={styles.footerLink}>Sign Up</Text>
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
    padding: theme.spacing.xl,
  },
  headerContainer: {
    marginBottom: theme.spacing.xxl,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  brandText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 3,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  formContainer: {
    gap: theme.spacing.lg,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  errorText: {
    color: theme.colors.danger,
    ...theme.typography.caption,
    textAlign: "center",
    marginTop: -theme.spacing.sm, // Bring it closer to the fields it refers to
    marginBottom: theme.spacing.xs,
  },
  loginButton: {
    marginTop: theme.spacing.sm,
  },
  forgotPasswordButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  forgotPasswordText: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.xxl,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
  },
  footerLink: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default LoginScreen;
