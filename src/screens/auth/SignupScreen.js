import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
import { signup } from "../../services/authService";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setError("");
      setLoading(true);

      // Creates account with entered credentials.
      await signup(email.trim(), password);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Sign Up</Text>

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
        title={loading ? "Creating account..." : "Sign Up"}
        onPress={handleSignup}
        disabled={loading}
      />

      <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
        <Text style={{ textAlign: "center", marginTop: 8 }}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignupScreen;
