import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';

const AVATARS = [
  { id: 'avatar_1', source: require('../assets/avatars/avatar_1.png') },
  { id: 'avatar_2', source: require('../assets/avatars/avatar_2.png') },
  { id: 'avatar_3', source: require('../assets/avatars/avatar_3.png') },
  { id: 'avatar_4', source: require('../assets/avatars/avatar_4.png') },
];

export const getAvatarSource = (avatarId) => {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar ? avatar.source : AVATARS[0].source;
};

const AvatarSelector = ({ selectedAvatarId, onSelect }) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {AVATARS.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;
          return (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarWrapper,
                isSelected && styles.selectedWrapper
              ]}
              onPress={() => onSelect(avatar.id)}
            >
              <Image source={avatar.source} style={styles.avatarImage} />
              {isSelected && <View style={styles.selectedGlow} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedWrapper: {
    borderColor: theme.colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  selectedGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
  },
});

export default AvatarSelector;
