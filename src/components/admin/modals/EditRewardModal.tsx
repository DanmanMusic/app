// File: src/components/admin/modals/EditRewardModal.tsx

import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  Switch,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { updateReward } from '../../../api/rewards';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { EditRewardModalProps } from '../../../types/componentProps';
import { RewardItem } from '../../../types/dataTypes';
import { CustomButton } from '../../common/CustomButton';
import { ShieldCheckIcon, XCircleIcon } from 'react-native-heroicons/solid';

const EditRewardModal: React.FC<EditRewardModalProps> = ({ visible, rewardToEdit, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [isGoalEligible, setIsGoalEligible] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
  const [imageIntent, setImageIntent] = useState<'keep' | 'replace' | 'remove'>('keep');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateReward,
    onSuccess: updatedReward => {
      console.log('[EditRewardModal] Reward updated successfully via mutation:', updatedReward);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Reward "${updatedReward.name}" updated successfully.`,
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(
        `[EditRewardModal] Error updating reward ${variables.rewardId} via mutation:`,
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && rewardToEdit) {
      setName(rewardToEdit.name);
      setCost(rewardToEdit.cost);
      setDescription(rewardToEdit.description || '');
      setIsGoalEligible(rewardToEdit.isGoalEligible);

      const initialUrl =
        rewardToEdit.imageUrl && rewardToEdit.imageUrl.startsWith('http')
          ? rewardToEdit.imageUrl
          : null;
      setInitialImageUrl(initialUrl);
      setImageUri(initialUrl);
      setImageIntent('keep');
      setMimeType(undefined);

      mutation.reset();
    }
  }, [visible, rewardToEdit]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed.');
        return;
      }
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setMimeType(selectedAsset.mimeType);
        setImageIntent('replace');
      }
    } catch (error) {
      console.error('Error picking reward image: ', error);
      Alert.alert('Image Pick Error', 'An error occurred selecting the image.');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setMimeType(undefined);
    setImageIntent('remove');
  };

  const handleSave = () => {
    if (!rewardToEdit) return;

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

    const updates: Partial<Omit<RewardItem, 'id' | 'imageUrl'>> = {};
    let needsUpdate = false;

    if (trimmedName !== rewardToEdit.name) {
      updates.name = trimmedName;
      needsUpdate = true;
    }
    if (numericCost !== rewardToEdit.cost) {
      updates.cost = numericCost;
      needsUpdate = true;
    }
    if ((description.trim() || '') !== (rewardToEdit.description || '')) {
      updates.description = description.trim() || undefined;
      needsUpdate = true;
    }
    if (isGoalEligible !== rewardToEdit.isGoalEligible) {
      updates.isGoalEligible = isGoalEligible;
      needsUpdate = true;
    }

    let apiImageUri: string | null | undefined = undefined;
    if (imageIntent === 'replace' && imageUri) {
      apiImageUri = imageUri;
      needsUpdate = true;
    } else if (imageIntent === 'remove') {
      apiImageUri = null;
      needsUpdate = true;
    }

    if (!needsUpdate) {
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No information was modified.' });
      onClose();
      return;
    }

    const updateData = {
      rewardId: rewardToEdit.id,
      updates,
      imageUri: apiImageUri,
      mimeType: imageIntent === 'replace' ? mimeType : undefined,
    };

    mutation.mutate(updateData);
  };

  const isSaveDisabled = mutation.isPending || !name.trim() || cost === '' || cost < 0;
  const previewSource = imageUri ? { uri: imageUri } : null;

  if (!rewardToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Reward</Text>
          <Text style={commonSharedStyles.modalSubTitle}>ID: {rewardToEdit.id}</Text>
          <ScrollView style={commonSharedStyles.modalScrollView}>
            <Text style={commonSharedStyles.label}>Reward Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={name}
              onChangeText={setName}
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
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Image:</Text>
            <View style={commonSharedStyles.containerIconPreview}>
              {previewSource ? (
                <Image
                  source={previewSource}
                  style={commonSharedStyles.iconPreview}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No image set</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <CustomButton
                  title={initialImageUrl || imageUri ? 'Change Image' : 'Choose Image'}
                  onPress={pickImage}
                  disabled={mutation.isPending}
                  color={colors.info}
                />
                {(initialImageUrl || imageUri) && (
                  <CustomButton
                    title="Remove Image"
                    onPress={handleRemoveImage}
                    disabled={mutation.isPending}
                    color={colors.warning}
                  />
                )}
              </View>
            </View>

            <Text style={commonSharedStyles.label}>Description (Optional):</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
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
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <CustomButton
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              color={colors.primary}
              disabled={isSaveDisabled}
              leftIcon={
                <ShieldCheckIcon
                  color={isSaveDisabled ? colors.disabledText : colors.textWhite}
                  size={18}
                />
              }
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
              leftIcon={
                <XCircleIcon
                  color={mutation.isPending ? colors.disabledText : colors.textWhite}
                  size={18}
                />
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditRewardModal;
