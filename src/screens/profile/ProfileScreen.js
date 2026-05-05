import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  StyleSheet,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { getUserProfile, saveUserProfile } from "../../services/profileService";
import { getUserActivities } from "../../services/activityService";
import { logout } from "../../services/authService";
import { theme } from "../../theme";
import AvatarSelector from "../../components/AvatarSelector";

const PROFILE_LIMITS = {
  age:    { min: 10,  max: 100 },
  weight: { min: 25,  max: 300 },
  maxHR:  { min: 100, max: 220 },
};

const parseOptionalNumber = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return "U";
};

/* ─── Editable Field Row ───────────────────────────────────── */
const FieldRow = ({ label, value, unit, color, onEdit }) => (
  <View style={fieldStyles.row}>
    <Text style={fieldStyles.key}>{label}</Text>
    <View style={fieldStyles.right}>
      <Text style={[fieldStyles.val, color && { color }]}>
        {value || "–"}{unit ? ` ${unit}` : ""}
      </Text>
      <TouchableOpacity onPress={onEdit}>
        <Text style={fieldStyles.editBtn}>Edit</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  key: { fontSize: 12, color: theme.colors.text.secondary },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  val: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  editBtn: { fontSize: 10, color: theme.colors.primary, fontWeight: "600" },
});

/* ─── Profile Screen ───────────────────────────────────────── */
const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Form state mirrors profile fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [maxHR, setMaxHR] = useState("");
  const [goalPace, setGoalPace] = useState("");
  const [avatarId, setAvatarId] = useState("avatar_1");

  const loadAll = useCallback(async () => {
    const userId = auth?.currentUser?.uid;
    if (!userId) { setIsLoading(false); return; }
    try {
      const [prof, acts] = await Promise.all([
        getUserProfile(userId),
        getUserActivities(userId),
      ]);
      setProfile(prof);
      setActivities(acts);
      setName(prof.name || "");
      setAge(prof.age !== null ? String(prof.age) : "");
      setWeight(prof.weight !== null ? String(prof.weight) : "");
      setMaxHR(prof.maxHR !== null ? String(prof.maxHR) : "");
      setGoalPace(prof.goalPace || "");
      setAvatarId(prof.avatarId || "avatar_1");
    } catch (err) {
      Alert.alert("Profile", err.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  /* Computed badges from activity history */
  const badges = useMemo(() => {
    const result = [];
    if (activities.length > 0) {
      const first = activities[activities.length - 1];
      const firstTs = first?.startedAt || first?.createdAt;
      if (firstTs) {
        const year = new Date(firstTs).getFullYear();
        result.push(`🏃 Running since ${year}`);
      }
    }
    const totalKm = activities.reduce((s, a) => s + (a.distanceMeters || 0) / 1000, 0);
    if (totalKm > 0) result.push(`${Math.round(totalKm)} km logged`);
    return result;
  }, [activities]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const userId = auth?.currentUser?.uid;
      if (!userId) throw new Error("You must be logged in.");

      const parsedAge    = parseOptionalNumber(age);
      const parsedWeight = parseOptionalNumber(weight);
      const parsedMaxHR  = parseOptionalNumber(maxHR);

      if (Number.isNaN(parsedAge))    throw new Error("Age must be a valid number.");
      if (Number.isNaN(parsedWeight)) throw new Error("Weight must be a valid number.");
      if (Number.isNaN(parsedMaxHR))  throw new Error("Max HR must be a valid number.");

      if (parsedAge !== null && (parsedAge < PROFILE_LIMITS.age.min || parsedAge > PROFILE_LIMITS.age.max))
        throw new Error(`Age should be between ${PROFILE_LIMITS.age.min} and ${PROFILE_LIMITS.age.max}.`);
      if (parsedWeight !== null && (parsedWeight < PROFILE_LIMITS.weight.min || parsedWeight > PROFILE_LIMITS.weight.max))
        throw new Error(`Weight should be between ${PROFILE_LIMITS.weight.min} and ${PROFILE_LIMITS.weight.max} kg.`);
      if (parsedMaxHR !== null && (parsedMaxHR < PROFILE_LIMITS.maxHR.min || parsedMaxHR > PROFILE_LIMITS.maxHR.max))
        throw new Error(`Max HR should be between ${PROFILE_LIMITS.maxHR.min} and ${PROFILE_LIMITS.maxHR.max} bpm.`);

      await saveUserProfile(userId, {
        name,
        age: parsedAge,
        weight: parsedWeight,
        maxHR: parsedMaxHR,
        goalPace,
        avatarId,
      });
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (err) {
      Alert.alert("Save failed", err.message || "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      const confirmSignOut = window.confirm("Are you sure you want to sign out?");
      if (confirmSignOut) {
        try {
          await logout();
        } catch (e) {
          alert("Error signing out: " + e.message);
        }
      }
      return;
    }

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => {
          try { await logout(); } catch (e) { Alert.alert("Error", e.message); }
        }},
      ]
    );
  };

  const user = auth?.currentUser;
  const displayName = name || user?.displayName || user?.email?.split("@")[0] || "Athlete";
  const initials = getInitials(displayName, user?.email);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* ── Profile Hero ──────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{user?.email || ""}</Text>
          {badges.length > 0 && (
            <View style={styles.badgesRow}>
              {badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Avatar Selector ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>AVATAR</Text>
          <AvatarSelector selectedAvatarId={avatarId} onSelect={setAvatarId} />
        </View>

        {/* ── Profile Fields ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROFILE</Text>
          <FieldRow
            label="Age"
            value={age}
            unit="yrs"
            onEdit={() => {/* inline edit via Alert */
              Alert.prompt
                ? Alert.prompt("Edit Age", "Enter your age", (v) => setAge(v), "plain-text", age)
                : Alert.alert("Edit Age", "Use the form below to update.");
            }}
          />
          <FieldRow
            label="Weight"
            value={weight}
            unit="kg"
            onEdit={() => {
              Alert.prompt
                ? Alert.prompt("Edit Weight", "Enter weight in kg", (v) => setWeight(v), "plain-text", weight)
                : Alert.alert("Edit Weight", "Use the form below to update.");
            }}
          />
          <FieldRow
            label="Max HR"
            value={maxHR}
            unit="bpm"
            color={maxHR ? theme.colors.secondary : undefined}
            onEdit={() => {
              Alert.prompt
                ? Alert.prompt("Edit Max HR", "Enter max heart rate (bpm)", (v) => setMaxHR(v), "plain-text", maxHR)
                : Alert.alert("Edit Max HR", "Use the form below to update.");
            }}
          />
          <FieldRow
            label="Goal Pace"
            value={goalPace}
            unit="/km"
            color={goalPace ? theme.colors.primary : undefined}
            onEdit={() => {
              Alert.prompt
                ? Alert.prompt("Edit Goal Pace", "e.g. 5:00", (v) => setGoalPace(v), "plain-text", goalPace)
                : Alert.alert("Edit Goal Pace", "Use the form below to update.");
            }}
          />
        </View>

        {/* ── Inline Form (compact) ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>EDIT DETAILS</Text>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>
          <View style={styles.formRowThree}>
            <View style={styles.formFieldSmall}>
              <Text style={styles.formLabel}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                style={[styles.input, styles.inputMono]}
                keyboardType="number-pad"
                placeholder="28"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.formFieldSmall}>
              <Text style={styles.formLabel}>Weight</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                style={[styles.input, styles.inputMono]}
                keyboardType="decimal-pad"
                placeholder="72 kg"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
            <View style={styles.formFieldSmall}>
              <Text style={styles.formLabel}>Max HR</Text>
              <TextInput
                value={maxHR}
                onChangeText={setMaxHR}
                style={[styles.input, styles.inputMono]}
                keyboardType="number-pad"
                placeholder="190"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Goal Pace</Text>
              <TextInput
                value={goalPace}
                onChangeText={setGoalPace}
                style={[styles.input, styles.inputMono]}
                placeholder="5:00 /km"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Actions ───────────────────────────────────── */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Notifications</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Privacy &amp; Data</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleSignOut}>
            <Text style={styles.actionBtnDangerText}>Sign Out</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingBottom: theme.spacing.xxl,
    gap: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Hero */
  hero: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: Platform.OS === "ios" ? 64 : theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    gap: 6,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  profileName: { fontSize: 16, fontWeight: "600", color: theme.colors.text.primary },
  profileEmail: { fontSize: 11, color: theme.colors.text.tertiary, marginTop: 2 },
  badgesRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  badge: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.borderHighlight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    fontWeight: "500",
    letterSpacing: 0.5,
  },

  /* Cards */
  card: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 2,
    marginTop: 1,
  },
  cardLabel: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  /* Form */
  formRow: { marginTop: 4 },
  formRowThree: { flexDirection: "row", gap: theme.spacing.sm, marginTop: 4 },
  formField: { flex: 1 },
  formFieldSmall: { flex: 1 },
  formLabel: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: theme.colors.text.primary,
    fontSize: 13,
    marginBottom: 2,
  },
  inputMono: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 14,
    fontWeight: "500",
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: 13,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: "700",
  },

  /* Actions */
  actionsCard: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    marginTop: 1,
  },
  actionBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionBtnDanger: { borderBottomWidth: 0 },
  actionBtnText: { fontSize: 13, color: theme.colors.text.primary, fontWeight: "500" },
  actionBtnDangerText: { fontSize: 13, color: theme.colors.danger, fontWeight: "500" },
  actionArrow: { fontSize: 14, color: theme.colors.text.tertiary },
});

export default ProfileScreen;
