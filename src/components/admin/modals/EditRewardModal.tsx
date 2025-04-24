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
} from 'react-native';
import { updateReward } from '../../../api/rewards';
import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';
import { EditRewardModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

const EditRewardModal: React.FC<EditRewardModalProps> = ({ visible, rewardToEdit, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateReward,
    onSuccess: updatedReward => {
      console.log('Reward updated successfully via mutation:', updatedReward);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
    },
    onError: (error, variables) => {
      console.error(`Error updating reward ${variables.rewardId} via mutation:`, error);
    },
  });

  useEffect(() => {
    if (visible && rewardToEdit) {
      setName(rewardToEdit.name);
      setCost(rewardToEdit.cost);
      setDescription(rewardToEdit.description || '');
      setImageUrl(rewardToEdit.imageUrl);
      mutation.reset();
    }
  }, [visible, rewardToEdit, mutation]);

  const handleSave = () => {
    if (!rewardToEdit) return;

    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '0'), 10);
    if (!name.trim()) {
      return;
    }
    if (isNaN(numericCost) || numericCost < 0) {
      return;
    }
    if (!imageUrl.trim()) {
      return;
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return;
    }

    const updates: Partial<Omit<RewardItem, 'id'>> = {};
    if (name.trim() !== rewardToEdit.name) updates.name = name.trim();
    if (numericCost !== rewardToEdit.cost) updates.cost = numericCost;
    const trimmedDescription = description.trim();
    if (trimmedDescription !== (rewardToEdit.description || '')) {
      updates.description = trimmedDescription ? trimmedDescription : undefined;
    }
    if (imageUrl.trim() !== rewardToEdit.imageUrl) updates.imageUrl = imageUrl.trim();

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate({ rewardId: rewardToEdit.id, updates });
  };

  if (!rewardToEdit) return null;

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
            <Text style={commonSharedStyles.label}>Image URL:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              keyboardType="url"
              editable={!mutation.isPending}
            />
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
            <Button title="Save Changes" onPress={handleSave} disabled={mutation.isPending} />
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
