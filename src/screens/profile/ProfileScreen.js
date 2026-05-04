import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from "react-native";
import { auth } from "../../config/firebase";
import { getUserProfile, saveUserProfile } from "../../services/profileService";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/PrimaryButton";
import AvatarSelector from "../../components/AvatarSelector";

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
  const [avatarId, setAvatarId] = useState("avatar_1");
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
        setAvatarId(profile.avatarId || "avatar_1");
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
        avatarId,
      });

      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error) {
      Alert.alert("Save failed", error.message || "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your athlete profile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR AVATAR</Text>
          <AvatarSelector selectedAvatarId={avatarId} onSelect={setAvatarId} />
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput 
                value={name} 
                onChangeText={setName} 
                style={styles.input} 
                placeholder="e.g. John Doe"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  style={[styles.input, styles.monoInput]}
                  placeholder="Yrs"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.monoInput]}
                  placeholder="kg"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.monoInput]}
                  placeholder="cm"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fitness Goal</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                style={[styles.input, styles.textArea]}
                multiline
                placeholder="e.g. Run a 5k next month"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>
        </View>

        <PrimaryButton 
          title="Update Profile" 
          onPress={handleSave} 
          loading={isSaving}
          disabled={isLoading} 
          style={{ marginTop: theme.spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 32,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  section: {
    marginVertical: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.caption,
    marginLeft: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.tertiary,
    letterSpacing: 2,
  },
  formSection: {
    gap: theme.spacing.lg,
  },
  rowInputs: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  flex1: {
    flex: 1,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    fontSize: 10,
    letterSpacing: 2,
  },
  inputWrapper: {
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 2,
  },
  input: {
    paddingVertical: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  monoInput: {
    ...theme.typography.mono,
    fontSize: 16,
    fontWeight: "500",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default ProfileScreen;
