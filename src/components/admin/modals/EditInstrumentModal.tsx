import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  ImageURISource,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { updateInstrument } from '../../../api/instruments';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { EditInstrumentModalProps } from '../../../types/componentProps';
import { Instrument } from '../../../types/dataTypes';
import { getInstrumentIconSource } from '../../../utils/helpers';
import { CustomButton } from '../../common/CustomButton';
import { ShieldCheckIcon, XCircleIcon } from 'react-native-heroicons/solid';

const EditInstrumentModal: React.FC<EditInstrumentModalProps> = ({
  visible,
  instrumentToEdit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [initialImageSource, setInitialImageSource] = useState<any>(null);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateInstrument,
    onSuccess: updatedInstrument => {
      console.log(`[EditInstrumentModal] onSuccess: Invalidating instruments query.`);
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Instrument "${updatedInstrument.name}" updated successfully.`,
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(`[EditInstrumentModal] onError updating ${variables.instrumentId}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update instrument.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible && instrumentToEdit) {
      setName(instrumentToEdit.name);
      const source = getInstrumentIconSource(instrumentToEdit);
      setInitialImageSource(source);

      let potentialUri: string | null = null;
      if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
        potentialUri = (source as ImageURISource).uri ?? null;
      }
      setImageUri(potentialUri);

      setMimeType(undefined);
      mutation.reset();
    } else {
      setName('');
      setImageUri(null);
      setMimeType(undefined);
      setInitialImageSource(null);
    }
  }, [visible, instrumentToEdit]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
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

      console.log('Edit ImagePicker Result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setMimeType(selectedAsset.mimeType);
        console.log(
          'Selected New Image URI:',
          selectedAsset.uri,
          'MIME Type:',
          selectedAsset.mimeType
        );
      } else {
        console.log('Image picking cancelled or failed.');
      }
    } catch (error) {
      console.error('Error picking image: ', error);
      Alert.alert('Image Pick Error', 'An error occurred while picking the image.');
    }
  };

  const handleSave = () => {
    if (!instrumentToEdit) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Instrument name cannot be empty.',
        position: 'bottom',
        visibilityTime: 4000,
      });
      return;
    }

    const updates: Partial<Pick<Instrument, 'name'>> = {};
    let needsUpdate = false;

    if (trimmedName !== instrumentToEdit.name) {
      updates.name = trimmedName;
      needsUpdate = true;
    }

    const initialRemoteUri =
      typeof initialImageSource === 'object' && initialImageSource?.uri
        ? initialImageSource.uri
        : null;
    let imageChanged = false;
    if (imageUri && imageUri !== initialRemoteUri) {
      imageChanged = true;
    } else if (imageUri === null && initialRemoteUri !== null) {
    }

    if (imageChanged) {
      needsUpdate = true;
    }

    if (!needsUpdate) {
      console.log('[EditInstrumentModal] No changes detected, closing.');
      onClose();
      return;
    }

    mutation.mutate({
      instrumentId: instrumentToEdit.id,
      updates,
      imageUri: imageChanged ? imageUri : undefined,
      mimeType: imageChanged ? mimeType : undefined,
    });
  };

  if (!instrumentToEdit) {
    return null;
  }

  const previewSource = imageUri ? { uri: imageUri } : initialImageSource;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Instrument</Text>
          <Text style={commonSharedStyles.modalSubTitle}>ID: {instrumentToEdit.id}</Text>

          <Text style={commonSharedStyles.label}>Instrument Name:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Saxophone"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
            editable={!mutation.isPending}
          />
          <Text style={commonSharedStyles.label}>Icon:</Text>
          <View style={commonSharedStyles.containerIconPreview}>
            {previewSource ? (
              <Image
                source={previewSource}
                style={commonSharedStyles.iconPreview}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No icon set</Text>
            )}
            <CustomButton
              title={imageUri ? 'Change Icon' : 'Choose Icon'}
              onPress={pickImage}
              disabled={mutation.isPending}
              color={colors.info}
            />
          </View>

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
              disabled={mutation.isPending || !name.trim()}
              leftIcon={
                <ShieldCheckIcon
                  color={mutation.isPending ? colors.disabledText : colors.textWhite}
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

export default EditInstrumentModal;
