// File: src/components/admin/modals/CreateRewardModal.tsx

import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  Switch, // Import Switch
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { createReward } from '../../../api/rewards';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { CreateRewardModalProps } from '../../../types/componentProps';

const CreateRewardModal: React.FC<CreateRewardModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [isGoalEligible, setIsGoalEligible] = useState(false); // State for the switch

  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createReward,
    onSuccess: createdReward => {
      console.log('[CreateRewardModal] Reward created successfully via mutation:', createdReward);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Reward "${createdReward.name}" created successfully.`,
        position: 'bottom',
      });
    },
    onError: error => {
      console.error('[CreateRewardModal] Error creating reward via mutation:', error);
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      setCost('');
      setDescription('');
      setImageUri(null);
      setMimeType(undefined);
      setIsGoalEligible(false); // Reset on open
      mutation.reset();
    }
  }, [visible]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permissions are needed to choose an image.'
        );
        return;
      }
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setMimeType(selectedAsset.mimeType);
      }
    } catch (error) {
      console.error('Error picking reward image: ', error);
    }
  };

  const handleCreate = () => {
    const companyId = appUser?.companyId;
    if (companyId === undefined) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Reward company is required.',
      });
      return;
    }
    const trimmedName = name.trim();
    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '-1'), 10);

    if (!trimmedName) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Reward Name is required.' });
      return;
    }
    if (isNaN(numericCost) || numericCost < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid, non-negative Ticket Cost.',
      });
      return;
    }

    const newRewardData = {
      name: trimmedName,
      cost: numericCost,
      description: description.trim() || undefined,
      imageUri: imageUri,
      mimeType: mimeType,
      isGoalEligible: isGoalEligible, // Pass the switch state
      companyId: companyId,
    };

    mutation.mutate(newRewardData);
  };

  const isCreateDisabled = mutation.isPending || !name.trim() || cost === '' || cost < 0;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Create New Reward</Text>
          <ScrollView style={commonSharedStyles.modalScrollView}>
            <Text style={commonSharedStyles.label}>Reward Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Fender Stratocaster"
              placeholderTextColor={colors.textLight}
              maxLength={100}
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Ticket Cost:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(cost)}
              onChangeText={text =>
                setCost(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              placeholder="e.g., 10000"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Image (Optional):</Text>
            <View style={commonSharedStyles.containerIconPreview}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={commonSharedStyles.iconPreview}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>
                  No image selected
                </Text>
              )}
              <Button
                title={imageUri ? 'Change Image' : 'Choose Image'}
                onPress={pickImage}
                disabled={mutation.isPending}
                color={colors.info}
              />
            </View>

            <Text style={commonSharedStyles.label}>Description (Optional):</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter details about the reward..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />

            <View
              style={[
                commonSharedStyles.baseRow,
                commonSharedStyles.justifySpaceBetween,
                commonSharedStyles.baseAlignCenter,
                { marginBottom: 15 },
              ]}
            >
              <Text style={commonSharedStyles.label}>Can be set as a Goal?</Text>
              <Switch
                trackColor={{ false: colors.secondary, true: colors.success }}
                thumbColor={colors.backgroundPrimary}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setIsGoalEligible}
                value={isGoalEligible}
                disabled={mutation.isPending}
              />
            </View>
          </ScrollView>
          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Reward...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create reward'}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Reward'}
              onPress={handleCreate}
              color={colors.primary}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateRewardModal;
