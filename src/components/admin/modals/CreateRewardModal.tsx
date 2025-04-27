// src/components/admin/modals/CreateRewardModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image, // Added
  Platform, // Added
  Alert, // Added
} from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // Added
import { createReward } from '../../../api/rewards'; // Updated API import
import { colors } from '../../../styles/colors';
import { CreateRewardModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const CreateRewardModal: React.FC<CreateRewardModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  // const [imageUrl, setImageUrl] = useState(''); // REMOVED - We use imageUri now
  const [imageUri, setImageUri] = useState<string | null>(null); // ADDED - State for picker URI
  const [mimeType, setMimeType] = useState<string | undefined>(undefined); // ADDED - State for image type

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createReward, // Use the Supabase API function
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
      // Reset all fields when modal becomes visible
      setName('');
      setCost('');
      setDescription('');
      setImageUri(null); // Reset image state
      setMimeType(undefined);
      mutation.reset();
    }
  }, [visible]);

  // Image Picker Function (similar to instruments)
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed to choose an image.');
        return;
      }
    }
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Correct usage
        allowsEditing: true,
        aspect: [1, 1], // Keep it square-ish
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setMimeType(selectedAsset.mimeType);
        console.log('Selected Reward Image URI:', selectedAsset.uri, 'MIME Type:', selectedAsset.mimeType);
      }
    } catch (error) {
      console.error("Error picking reward image: ", error);
      Alert.alert('Image Pick Error', 'An error occurred selecting the image.');
    }
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '-1'), 10); // Use -1 to fail validation if empty

    // Validation
    if (!trimmedName) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Reward Name is required.' });
      return;
    }
    if (isNaN(numericCost) || numericCost < 0) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid, non-negative Ticket Cost.' });
      return;
    }
    // Image is optional for creation, but if provided, URI must exist
    // (API handles upload logic)

    // Prepare data for the Supabase API function
    const newRewardData = {
      name: trimmedName,
      cost: numericCost,
      description: description.trim() || undefined, // Pass undefined if empty
      imageUri: imageUri, // Pass the picker URI
      mimeType: mimeType, // Pass the MIME type
    };

    console.log('[CreateRewardModal] Calling mutation with data:', newRewardData);
    mutation.mutate(newRewardData);
  };

  // Determine if create button should be disabled
  const isCreateDisabled = mutation.isPending || !name.trim() || cost === '' || cost < 0;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Create New Reward</Text>
          <ScrollView style={modalSharedStyles.scrollView}>
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
              value={String(cost)} // Ensure value is string for TextInput
              onChangeText={text =>
                // Allow empty string, otherwise parse integer
                setCost(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              placeholder="e.g., 10000"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

             {/* Image Picker Button and Preview */}
             <Text style={commonSharedStyles.label}>Image (Optional):</Text>
             <View style={modalSharedStyles.iconPreviewContainer}>
                {imageUri ? (
                   <Image source={{ uri: imageUri }} style={modalSharedStyles.iconPreview} resizeMode="contain" />
                 ) : (
                   <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No image selected</Text>
                 )}
                <Button
                   title={imageUri ? "Change Image" : "Choose Image"}
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
          </ScrollView>
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Creating Reward...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create reward'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
                title={mutation.isPending ? "Creating..." : "Create Reward"}
                onPress={handleCreate}
                disabled={isCreateDisabled}
             />
          </View>
          <View style={modalSharedStyles.footerButton}>
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