import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { getUserProfile, saveUserProfile } from "../../services/profileService";

const inputStyle = {
  borderWidth: 1,
  borderColor: "#CBD5E1",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "#FFFFFF",
};

const PROFILE_LIMITS = {
  age: { min: 10, max: 100 },
  weight: { min: 25, max: 300 },
  height: { min: 100, max: 250 },
};

const parseOptionalNumber = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const ProfileScreen = () => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth?.currentUser?.uid;
        if (!userId) {
          throw new Error("You must be logged in.");
        }

        const profile = await getUserProfile(userId);
        setName(profile.name || "");
        setAge(profile.age === null ? "" : String(profile.age));
        setWeight(profile.weight === null ? "" : String(profile.weight));
        setHeight(profile.height === null ? "" : String(profile.height));
        setGoal(profile.goal || "");
      } catch (error) {
        Alert.alert("Profile", error.message || "Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const userId = auth?.currentUser?.uid;
      if (!userId) {
        throw new Error("You must be logged in.");
      }

      const parsedAge = parseOptionalNumber(age);
      const parsedWeight = parseOptionalNumber(weight);
      const parsedHeight = parseOptionalNumber(height);

      if (Number.isNaN(parsedAge)) {
        throw new Error("Age must be a valid number.");
      }
      if (Number.isNaN(parsedWeight)) {
        throw new Error("Weight must be a valid number.");
      }
      if (Number.isNaN(parsedHeight)) {
        throw new Error("Height must be a valid number.");
      }

      if (
        parsedAge !== null &&
        (parsedAge < PROFILE_LIMITS.age.min || parsedAge > PROFILE_LIMITS.age.max)
      ) {
        throw new Error(
          `Age should be between ${PROFILE_LIMITS.age.min} and ${PROFILE_LIMITS.age.max}.`
        );
      }

      if (
        parsedWeight !== null &&
        (parsedWeight < PROFILE_LIMITS.weight.min ||
          parsedWeight > PROFILE_LIMITS.weight.max)
      ) {
        throw new Error(
          `Weight should be between ${PROFILE_LIMITS.weight.min} and ${PROFILE_LIMITS.weight.max} kg.`
        );
      }

      if (
        parsedHeight !== null &&
        (parsedHeight < PROFILE_LIMITS.height.min ||
          parsedHeight > PROFILE_LIMITS.height.max)
      ) {
        throw new Error(
          `Height should be between ${PROFILE_LIMITS.height.min} and ${PROFILE_LIMITS.height.max} cm.`
        );
      }

      await saveUserProfile(userId, {
        name,
        age: parsedAge,
        weight: parsedWeight,
        height: parsedHeight,
        goal,
      });

      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error) {
      Alert.alert("Save failed", error.message || "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <Text style={{ fontSize: 26, fontWeight: "700", color: "#0F172A" }}>
        Profile
      </Text>
      <Text style={{ color: "#475569" }}>
        Keep your basic fitness details updated for better tracking context.
      </Text>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={inputStyle} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          style={inputStyle}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>
          Weight (kg)
        </Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>
          Height (cm)
        </Text>
        <TextInput
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>Goal</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]}
          multiline
          placeholder="Example: Walk 5 km, 4 days a week."
          placeholderTextColor="#94A3B8"
        />
      </View>

      <Button
        title={isSaving ? "Saving..." : "Save Profile"}
        onPress={handleSave}
        disabled={isSaving || isLoading}
      />
    </ScrollView>
  );
};

export default ProfileScreen;
