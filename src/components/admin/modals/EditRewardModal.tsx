import React, { useState, useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { updateReward } from '../../../api/rewards';
import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';
import { EditRewardModalProps } from '../../../types/componentProps';

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
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Reward</Text>
          <Text style={modalStyles.subTitle}>ID: {rewardToEdit.id}</Text>
          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>Reward Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textLight}
              maxLength={100}
              editable={!mutation.isPending}
            />
            <Text style={modalStyles.label}>Ticket Cost:</Text>
            <TextInput
              style={modalStyles.input}
              value={String(cost)}
              onChangeText={text =>
                setCost(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={modalStyles.label}>Image URL:</Text>
            <TextInput
              style={modalStyles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              keyboardType="url"
              editable={!mutation.isPending}
            />
            <Text style={modalStyles.label}>Description (Optional):</Text>
            <TextInput
              style={modalStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
          </ScrollView>

          {}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Saving Changes...</Text>
            </View>
          )}

          {}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save changes'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button title="Save Changes" onPress={handleSave} disabled={mutation.isPending} />
          </View>
          <View style={modalStyles.footerButton}>
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

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  scrollView: { width: '100%', marginBottom: 15 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
    height: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    minHeight: 18,
  },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 10 },
});

export default EditRewardModal;
