// src/components/admin/modals/EditRewardModal.tsx
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
import { updateReward } from '../../../api/rewards'; // Updated API import
import { RewardItem } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditRewardModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const EditRewardModal: React.FC<EditRewardModalProps> = ({ visible, rewardToEdit, onClose }) => {
  // State for editable fields
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  // State for image handling
  const [imageUri, setImageUri] = useState<string | null>(null); // Current URI (from picker or initial)
  const [mimeType, setMimeType] = useState<string | undefined>(undefined); // Type of picked image
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null); // Original URL from rewardToEdit
  const [imageIntent, setImageIntent] = useState<'keep' | 'replace' | 'remove'>('keep'); // Track user intent for image

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateReward, // Use the Supabase API function
    onSuccess: updatedReward => {
      console.log('[EditRewardModal] Reward updated successfully via mutation:', updatedReward);
      // Invalidate rewards query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose(); // Close modal on success
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Reward "${updatedReward.name}" updated successfully.`,
        position: 'bottom',
      });
    },
    onError: (error, variables) => {
      console.error(`[EditRewardModal] Error updating reward ${variables.rewardId} via mutation:`, error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update reward.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  // Effect to populate fields when modal opens or rewardToEdit changes
  useEffect(() => {
    if (visible && rewardToEdit) {
      setName(rewardToEdit.name);
      setCost(rewardToEdit.cost);
      setDescription(rewardToEdit.description || '');

      // Handle initial image state
      const initialUrl = rewardToEdit.imageUrl && rewardToEdit.imageUrl.startsWith('http')
          ? rewardToEdit.imageUrl
          : null;
      setInitialImageUrl(initialUrl);
      setImageUri(initialUrl); // Start preview with initial image
      setImageIntent('keep'); // Default intent is to keep the image
      setMimeType(undefined); // Reset mime type

      mutation.reset(); // Reset mutation state
    } else {
        // Clear state if modal closes or no reward is being edited
        setName('');
        setCost('');
        setDescription('');
        setImageUri(null);
        setInitialImageUrl(null);
        setImageIntent('keep');
        setMimeType(undefined);
    }
  }, [visible, rewardToEdit]); // Rerun when visibility or the reward object changes

  // Image Picker Function
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed.');
        return;
      }
    }
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri); // Update preview and current URI
        setMimeType(selectedAsset.mimeType);
        setImageIntent('replace'); // User intends to replace the image
        console.log('Selected New Reward Image URI:', selectedAsset.uri, 'MIME Type:', selectedAsset.mimeType);
      }
    } catch (error) {
      console.error("Error picking reward image: ", error);
      Alert.alert('Image Pick Error', 'An error occurred selecting the image.');
    }
  };

  // Function to handle image removal intent
  const handleRemoveImage = () => {
      setImageUri(null); // Clear preview
      setMimeType(undefined);
      setImageIntent('remove'); // User intends to remove the image
  };

  // Handle Save Logic
  const handleSave = () => {
    if (!rewardToEdit) return; // Should not happen if modal is visible

    const trimmedName = name.trim();
    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '-1'), 10);

    // Validation
    if (!trimmedName) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Reward Name is required.' });
       return;
    }
    if (isNaN(numericCost) || numericCost < 0) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid, non-negative Ticket Cost.' });
       return;
    }

    // Determine changes
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
    const currentDesc = rewardToEdit.description || '';
    const newDesc = description.trim();
    if (newDesc !== currentDesc) {
      updates.description = newDesc || undefined; // Send undefined if cleared
      needsUpdate = true;
    }

    // Determine image changes for the API call
    let apiImageUri: string | null | undefined = undefined; // undefined means no change intent for image

    if (imageIntent === 'replace' && imageUri) {
      // Only pass if intent is replace AND we have a new URI
      apiImageUri = imageUri;
      needsUpdate = true;
    } else if (imageIntent === 'remove') {
      // Pass null if intent is remove
      apiImageUri = null;
      needsUpdate = true;
    }
    // If intent is 'keep', apiImageUri remains undefined, API won't touch image

    if (!needsUpdate) {
      console.log('[EditRewardModal] No changes detected.');
      onClose(); // Close if nothing changed
      return;
    }

    // Prepare data for the Supabase API function
    const updateData = {
      rewardId: rewardToEdit.id,
      updates: updates, // Contains name, cost, description changes
      imageUri: apiImageUri, // Contains new URI, null for removal, or undefined for no change
      mimeType: imageIntent === 'replace' ? mimeType : undefined, // Only pass mimeType if replacing
    };

    console.log('[EditRewardModal] Calling mutation with data:', updateData);
    mutation.mutate(updateData);
  };

  // Determine if save button should be disabled
   const isSaveDisabled = mutation.isPending || !name.trim() || cost === '' || cost < 0;
   // Determine preview source (show newly picked URI if available, else initial)
   const previewSource = imageUri ? { uri: imageUri } : null;

   if (!rewardToEdit) return null; // Should already be handled by visible check, but good practice

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Edit Reward</Text>
          <Text style={modalSharedStyles.subTitle}>ID: {rewardToEdit.id}</Text>
          <ScrollView style={modalSharedStyles.scrollView}>
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

            {/* Image Picker/Preview/Remove */}
             <Text style={commonSharedStyles.label}>Image:</Text>
             <View style={modalSharedStyles.iconPreviewContainer}>
                {previewSource ? (
                   <Image source={previewSource} style={modalSharedStyles.iconPreview} resizeMode="contain" />
                 ) : (
                   <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No image set</Text>
                 )}
                 <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                       title={initialImageUrl || imageUri ? "Change Image" : "Choose Image"}
                       onPress={pickImage}
                       disabled={mutation.isPending}
                       color={colors.info}
                     />
                     {/* Show Remove button only if there's currently an image (initial or newly picked) */}
                     {(initialImageUrl || imageUri) && (
                        <Button
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
          </ScrollView>
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
               title={mutation.isPending ? "Saving..." : "Save Changes"}
               onPress={handleSave}
               disabled={isSaveDisabled}
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

export default EditRewardModal;