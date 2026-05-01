import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
} from "react-native";
import { login, resetPassword } from "../../services/authService";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleLogin = async () => {
    try {
      setError("");
      setLoading(true);

      // Try logging in with the values from inputs.
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError("");
      setResettingPassword(true);
      await resetPassword(email);
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
    <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        style={{ borderWidth: 1, padding: 10, borderRadius: 6 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, borderRadius: 6 }}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading || resettingPassword}
      />

      <TouchableOpacity
        onPress={handleResetPassword}
        disabled={loading || resettingPassword}
      >
        <Text style={{ textAlign: "center", color: "#2563EB", marginTop: 4 }}>
          {resettingPassword ? "Sending reset email..." : "Forgot password?"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation?.navigate("Signup")}>
        <Text style={{ textAlign: "center", marginTop: 8 }}>
          Don&apos;t have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;
