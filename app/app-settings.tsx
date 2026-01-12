import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, Alert, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Modal } from '@/components/nativewindui/Modal';
import { Text } from '@/components/nativewindui/Text';
import { Toggle } from '@/components/nativewindui/Toggle';
import { useColorScheme } from '@/lib/useColorScheme';
import { useSettingsStore } from '@/store/settingsStore';

export default function AppSettingsScreen() {
  const { colors, colorScheme, setColorScheme } = useColorScheme();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const addProductType = useSettingsStore((state) => state.addProductType);
  const removeProductType = useSettingsStore((state) => state.removeProductType);
  const addGasSize = useSettingsStore((state) => state.addGasSize);
  const removeGasSize = useSettingsStore((state) => state.removeGasSize);

  const [showAddProductTypeModal, setShowAddProductTypeModal] = useState(false);
  const [showAddGasSizeModal, setShowAddGasSizeModal] = useState(false);
  const [newProductType, setNewProductType] = useState('');
  const [newGasSize, setNewGasSize] = useState('');
  const [fadeAnim] = useState(new Animated.Value(1));

  const handleAddProductType = () => {
    if (!newProductType.trim()) {
      Alert.alert('Error', 'Please enter a product type');
      return;
    }
    if (settings.productTypes.includes(newProductType.trim())) {
      Alert.alert('Error', 'Product type already exists');
      return;
    }
    addProductType(newProductType.trim());
    setNewProductType('');
    setShowAddProductTypeModal(false);
    Alert.alert('Success', 'Product type added');
  };

  const handleRemoveProductType = (type: string) => {
    Alert.alert('Remove Product Type', `Are you sure you want to remove "${type}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeProductType(type);
          Alert.alert('Success', 'Product type removed');
        },
      },
    ]);
  };

  const handleAddGasSize = () => {
    if (!newGasSize.trim()) {
      Alert.alert('Error', 'Please enter a gas size');
      return;
    }
    if (settings.gasSizes.includes(newGasSize.trim())) {
      Alert.alert('Error', 'Gas size already exists');
      return;
    }
    addGasSize(newGasSize.trim());
    setNewGasSize('');
    setShowAddGasSizeModal(false);
    Alert.alert('Success', 'Gas size added');
  };

  const handleRemoveGasSize = (size: string) => {
    if (size === 'none') {
      Alert.alert('Error', 'Cannot remove "none" size');
      return;
    }
    Alert.alert('Remove Gas Size', `Are you sure you want to remove "${size}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeGasSize(size);
          Alert.alert('Success', 'Gas size removed');
        },
      },
    ]);
  };

  const fontSizeOptions = [
    { label: 'Small', value: 0.85 },
    { label: 'Medium', value: 1.0 },
    { label: 'Large', value: 1.15 },
    { label: 'Extra Large', value: 1.3 },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Header Section */}
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-6">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.input || colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border || colors.mutedForeground,
                  }}>
                  <Icon name="chevron.left" size={20} color={colors.foreground} />
                </View>
              </Pressable>
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    color: colors.foreground,
                    fontWeight: '500',
                    fontSize: 18,
                    letterSpacing: -0.2,
                  }}>
                  App Settings
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <View className="px-5 pt-6">
          {/* Theme Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
              Appearance
            </Text>

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text variant="subhead" style={{ fontWeight: '500' }}>
                    Theme
                  </Text>
                  <Text variant="footnote" color="tertiary" className="mt-0.5">
                    Dark Mode (Fixed)
                  </Text>
                </View>
                <View className="flex-row items-center gap-2" style={{ opacity: 0.5 }}>
                  {(['light', 'dark', 'system'] as const).map((scheme) => (
                    <View
                      key={scheme}
                      className="px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: scheme === 'dark' ? colors.primary : colors.background,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: scheme === 'dark' ? '#FFFFFF' : colors.foreground,
                          fontWeight: scheme === 'dark' ? '600' : '400',
                        }}>
                        {scheme === 'system' ? 'Auto' : scheme === 'dark' ? 'Dark' : 'Light'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />

            <View>
              <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                Base Font Size
              </Text>
              {/* <View className="flex-row gap-2">
                {fontSizeOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      // Animate font size change
                      Animated.sequence([
                        Animated.timing(fadeAnim, {
                          toValue: 0.6,
                          duration: 100,
                          useNativeDriver: true,
                        }),
                        Animated.timing(fadeAnim, {
                          toValue: 1,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                      ]).start();
                      updateSettings({ baseFontSize: option.value });
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <Animated.View
                      className="px-4 py-2.5 rounded-xl"
                      style={{
                        backgroundColor:
                          settings.baseFontSize === option.value ? colors.primary : colors.background,
                        opacity: fadeAnim,
                        transform: [{
                          scale: settings.baseFontSize === option.value ? fadeAnim.interpolate({
                            inputRange: [0.5, 1],
                            outputRange: [0.95, 1],
                          }) : 1,
                        }],
                      }}>
                      <Text
                        style={{
                          color: settings.baseFontSize === option.value ? '#FFFFFF' : colors.foreground,
                          fontWeight: settings.baseFontSize === option.value ? '600' : '400',
                          fontSize: 13,
                        }}>
                        {option.label}
                      </Text>
                    </Animated.View>
                  </Pressable>
                ))}
              </View> */}
            </View>
          </View>

          {/* Product Properties Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text variant="callout" style={{ fontWeight: '500' }}>
                Product Types
              </Text>
              <Pressable
                onPress={() => setShowAddProductTypeModal(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View
                  className="h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="plus" size={16} color={colors.primary} />
                </View>
              </Pressable>
            </View>

            <View className="gap-2">
              {settings.productTypes.map((type, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between py-2.5 px-3 rounded-lg"
                  style={{ backgroundColor: colors.background }}>
                  <Text variant="subhead" style={{ fontSize: 14 }}>
                    {type}
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveProductType(type)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="trash" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Gas Sizes Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text variant="callout" style={{ fontWeight: '500' }}>
                Gas Sizes
              </Text>
              <Pressable
                onPress={() => setShowAddGasSizeModal(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View
                  className="h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="plus" size={16} color={colors.primary} />
                </View>
              </Pressable>
            </View>

            <View className="gap-2">
              {settings.gasSizes.map((size, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between py-2.5 px-3 rounded-lg"
                  style={{ backgroundColor: colors.background }}>
                  <Text variant="subhead" style={{ fontSize: 14 }}>
                    {size === 'none' ? 'N/A' : size}
                  </Text>
                  {size !== 'none' && (
                    <Pressable
                      onPress={() => handleRemoveGasSize(size)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="trash" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Currency Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
              Currency
            </Text>
            <View>
              <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                Default Currency
              </Text>
              <Input
                value={settings.defaultCurrency}
                onChangeText={(value) => updateSettings({ defaultCurrency: value.toUpperCase() })}
                placeholder="UGX"
                style={{ backgroundColor: colors.background }}
                maxLength={3}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      </Animated.View>

      {/* Add Product Type Modal */}
      <Modal
        visible={showAddProductTypeModal}
        onClose={() => {
          setShowAddProductTypeModal(false);
          setNewProductType('');
        }}
        title="Add Product Type"
        subtitle="Add a new product type">
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Product Type Name
            </Text>
            <Input
              value={newProductType}
              onChangeText={setNewProductType}
              placeholder="e.g., Gas Cylinder"
              style={{ backgroundColor: colors.background }}
            />
          </View>
          <Button onPress={handleAddProductType} disabled={!newProductType.trim()}>
            <Text>Add Product Type</Text>
          </Button>
        </View>
      </Modal>

      {/* Add Gas Size Modal */}
      <Modal
        visible={showAddGasSizeModal}
        onClose={() => {
          setShowAddGasSizeModal(false);
          setNewGasSize('');
        }}
        title="Add Gas Size"
        subtitle="Add a new gas size option">
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Gas Size
            </Text>
            <Input
              value={newGasSize}
              onChangeText={setNewGasSize}
              placeholder="e.g., 15kg"
              style={{ backgroundColor: colors.background }}
            />
          </View>
          <Button onPress={handleAddGasSize} disabled={!newGasSize.trim()}>
            <Text>Add Gas Size</Text>
          </Button>
        </View>
      </Modal>
    </View>
  );
}
