import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Address } from '../data/addresses';
import { SERVICE_AREA_LABEL, validatePincode } from '../data/serviceability';
import { RootStackParamList } from '../navigation/types';
import { useLocation } from '../state/LocationContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

export function AddressesScreen({ navigation }: Props) {
  const { address, addresses, isLoading, selectAddress, addAddress, removeAddress, makeDefault } =
    useLocation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setLabel('');
    setLine1('');
    setCity('');
    setPincode('');
    setFormError(null);
  };

  const handleSave = async () => {
    if (!label.trim() || !line1.trim() || !city.trim() || !pincode.trim()) {
      setFormError('Please fill in all fields');
      return;
    }
    const pincodeError = validatePincode(pincode);
    if (pincodeError) {
      setFormError(pincodeError);
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await addAddress({
        label: label.trim(),
        line1: line1.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        isDefault: addresses.length === 0,
      });
      resetForm();
      setIsAdding(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Saved Addresses" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          addresses.map((item: Address) => (
            <Card key={item.id} style={styles.card}>
              <Pressable onPress={() => selectAddress(item)}>
                <Text style={typography.subheading}>{item.label}</Text>
                <Text style={typography.caption}>
                  {item.line1}, {item.city} {item.pincode}
                </Text>
              </Pressable>
              <View style={styles.cardActions}>
                {item.id === address.id ? (
                  <Badge label="Selected" tone="primary" />
                ) : (
                  <Pressable onPress={() => selectAddress(item)}>
                    <Text style={styles.actionText}>Select</Text>
                  </Pressable>
                )}
                {item.isDefault ? (
                  <Badge label="Default" />
                ) : (
                  <Pressable onPress={() => makeDefault(item.id)}>
                    <Text style={styles.actionText}>Make default</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => removeAddress(item.id)}>
                  <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {!isLoading && addresses.length === 0 ? (
          <Text style={[typography.body, styles.empty]}>No saved addresses yet.</Text>
        ) : null}

        {isAdding ? (
          <Card style={styles.formCard}>
            <Text style={typography.subheading}>New address</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g. Home, Work)"
              placeholderTextColor={colors.textMuted}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Address line"
              placeholderTextColor={colors.textMuted}
              value={line1}
              onChangeText={setLine1}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={styles.input}
              placeholder="Pincode"
              placeholderTextColor={colors.textMuted}
              value={pincode}
              onChangeText={(text) => {
                setPincode(text);
                if (formError) setFormError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.hint}>Currently delivering in {SERVICE_AREA_LABEL} only</Text>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button label={isSaving ? 'Saving...' : 'Save address'} onPress={handleSave} />
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => {
                resetForm();
                setIsAdding(false);
              }}
            />
          </Card>
        ) : (
          <Button label="+ Add new address" variant="outline" onPress={() => setIsAdding(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
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
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.xs,
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    actionText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 12,
    },
    removeText: {
      color: colors.danger,
    },
    empty: {
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: spacing.lg,
    },
    formCard: {
      gap: spacing.sm,
    },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: colors.text,
    },
    hint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: -spacing.xs,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}
