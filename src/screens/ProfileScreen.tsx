import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../state/AuthContext';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();
  const { profile, updateProfile } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  /* Seeds from the current profile, which may have hydrated after first render */
  const startEditing = () => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setSaveError('Please enter your name.');
      return;
    }
    setSaveError(null);
    updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="My Profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.avatarName}>{profile.name}</Text>
            <Text style={styles.avatarEmail}>{profile.email}</Text>
            {!isEditing && (
              <Pressable style={styles.editChip} onPress={startEditing}>
                <Text style={styles.editChipText}>✏️  Edit Profile</Text>
              </Pressable>
            )}
          </View>

          {/* Fields */}
          <View style={styles.card}>
            <FieldRow
              label="Full Name"
              value={isEditing ? name : profile.name}
              editing={isEditing}
              onChangeText={setName}
              placeholder="Your name"
              colors={colors}
            />
            <View style={styles.divider} />
            <FieldRow
              label="Email"
              value={isEditing ? email : profile.email}
              editing={isEditing}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              colors={colors}
            />
            <View style={styles.divider} />
            <FieldRow
              label="Phone"
              value={isEditing ? phone : profile.phone}
              editing={isEditing}
              onChangeText={setPhone}
              placeholder="+91 00000 00000"
              keyboardType="phone-pad"
              colors={colors}
            />
          </View>

          {isEditing && saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

          {isEditing && (
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <Button label="Save Changes" onPress={handleSave} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="outline" onPress={handleCancel} />
              </View>
            </View>
          )}

          {/* Account info */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="ribbon-outline" size={16} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Membership</Text>
                <Text style={styles.infoValue}>Gold Member</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>June 2026</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Total Orders</Text>
                <Text style={styles.infoValue}>3 orders</Text>
              </View>
            </View>
          </View>

          {/* Sign out */}
          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>↪  Sign Out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldRowProps = {
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  colors: ColorPalette;
};

function FieldRow({ label, value, editing, onChangeText, placeholder, keyboardType = 'default', colors }: FieldRowProps) {
  return (
    <View style={{ paddingVertical: spacing.sm, gap: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {editing ? (
        <TextInput
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
            borderBottomWidth: 1.5,
            borderBottomColor: colors.primary,
            paddingVertical: spacing.xs,
            paddingHorizontal: 0,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCorrect={false}
        />
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{value}</Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.xs,
    },
    avatarCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      borderWidth: 3,
      borderColor: colors.primaryLight,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    avatarName: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    avatarEmail: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    editChip: {
      marginTop: spacing.sm,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    editChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    infoIcon: {
      fontSize: 18,
      width: 26,
      textAlign: 'center',
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginTop: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    saveError: {
      fontSize: 13,
      color: colors.danger,
      textAlign: 'center',
    },
    signOutBtn: {
      borderWidth: 1.5,
      borderColor: colors.danger,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    signOutText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.danger,
    },
  });
}
