// src/components/admin/modals/CreateJourneyLocationModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native'; // Import Switch
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { createJourneyLocation } from '../../../api/journey';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

interface CreateJourneyLocationModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateJourneyLocationModal: React.FC<CreateJourneyLocationModalProps> = ({
  visible,
  onClose,
}) => {
  const { appUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [canReassign, setCanReassign] = useState(false); // State for the new switch
  const queryClient = useQueryClient();

  const companyId = useMemo(() => appUser?.companyId, [appUser]);

  const mutation = useMutation({
    mutationFn: createJourneyLocation,
    onSuccess: newLocation => {
      queryClient.invalidateQueries({ queryKey: ['journeyLocations'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Location "${newLocation.name}" created.`,
        position: 'bottom',
      });
      onClose();
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error.message,
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setName('');
      setDescription('');
      setCanReassign(false); // Reset on open
      mutation.reset();
    }
  }, [visible]);

  const handleCreate = () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Location name is required.' });
      return;
    }
    if (!companyId) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: 'Company ID not found. Please try again.',
      });
      return;
    }

    mutation.mutate({
      locationData: {
        name: name.trim(),
        description: description.trim() || null,
        can_reassign_tasks: canReassign, // Pass the switch value
      },
      companyId: companyId,
    });
  };

  const isCreateDisabled = mutation.isPending || !name.trim();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Create New Journey Location</Text>
          <ScrollView style={commonSharedStyles.modalScrollView}>
            <Text style={commonSharedStyles.label}>Location Name:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., The Sound Studio"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Description (Optional):</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="A brief, thematic description..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
              editable={!mutation.isPending}
            />
            {/* New Switch for can_reassign_tasks */}
            <View
              style={[
                commonSharedStyles.baseRow,
                commonSharedStyles.justifySpaceBetween,
                commonSharedStyles.baseAlignCenter,
                { marginBottom: 15 },
              ]}
            >
              <Text style={commonSharedStyles.label}>Allow repeatable tasks?</Text>
              <Switch
                trackColor={{ false: colors.secondary, true: colors.success }}
                thumbColor={colors.backgroundPrimary}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setCanReassign}
                value={canReassign}
                disabled={mutation.isPending}
              />
            </View>
            <Text style={commonSharedStyles.infoText}>
              Enable this for locations like "Song Factory" where students can do tasks more than
              once. Leave disabled for one-time progression paths like "Circle of 5ths".
            </Text>
          </ScrollView>

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Location...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>Error: {mutation.error.message}</Text>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Location'}
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

export default CreateJourneyLocationModal;
