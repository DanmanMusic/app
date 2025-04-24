import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { createReward } from '../../../api/rewards';
import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';
import { CreateRewardModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

const CreateRewardModal: React.FC<CreateRewardModalProps> = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createReward,
    onSuccess: createdReward => {
      console.log('Reward created successfully via mutation:', createdReward);
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
    },
    onError: error => {
      console.error('Error creating reward via mutation:', error);
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      setCost('');
      setDescription('');
      setImageUrl('');
      mutation.reset();
    }
  }, [visible, mutation]);

  const handleCreate = () => {
    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '0'), 10);
    if (!name.trim()) {
      return;
    }
    if (isNaN(numericCost) || numericCost < 0) {
      return;
    }
    if (!imageUrl.trim()) {
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        return;
      }
    }

    const newRewardData: Omit<RewardItem, 'id'> = {
      name: name.trim(),
      cost: numericCost,
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim(),
    };

    mutation.mutate(newRewardData);
  };

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
              value={String(cost)}
              onChangeText={text =>
                setCost(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              placeholder="e.g., 10000"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />

            <Text style={commonSharedStyles.label}>Image URL:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
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
            <Button title="Create Reward" onPress={handleCreate} disabled={mutation.isPending} />
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
