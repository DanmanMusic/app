// src/components/admin/modals/CreateInstrumentModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { createInstrument } from '../../../api/instruments';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { CreateInstrumentModalProps } from '../../../types/componentProps';
import { CustomButton } from '../../common/CustomButton';
import { XCircleIcon } from 'react-native-heroicons/solid';

const CreateInstrumentModal: React.FC<CreateInstrumentModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const { appUser } = useAuth();

  const mutation = useMutation({
    mutationFn: createInstrument,
    onSuccess: createdInstrument => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Instrument "${createdInstrument.name}" created successfully.`,
        position: 'bottom',
      });
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create instrument.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      setImageUri(null);
      setMimeType(undefined);
      mutation.reset();
    }
  }, [visible]);

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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setMimeType(selectedAsset.mimeType);
      }
    } catch (error) {
      console.error('Error picking image: ', error);
      Alert.alert('Image Pick Error', 'An error occurred while picking the image.');
    }
  };

  const handleCreate = () => {
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

    if (!appUser?.companyId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not determine company. Please re-login.',
      });
      return;
    }

    const instrumentData = {
      name: trimmedName,
      imageUri: imageUri,
      mimeType: mimeType,
      companyId: appUser.companyId,
    };

    mutation.mutate(instrumentData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Add New Instrument</Text>

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
          <Text style={commonSharedStyles.label}>Icon (Optional):</Text>
          <View style={commonSharedStyles.containerIconPreview}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={commonSharedStyles.iconPreview}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No icon selected</Text>
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
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Instrument...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create instrument'}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <CustomButton
              title={mutation.isPending ? 'Creating...' : 'Create Instrument'}
              onPress={handleCreate}
              color={colors.primary}
              disabled={mutation.isPending || !name.trim()}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
              leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateInstrumentModal;
