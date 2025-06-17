// src/components/admin/modals/EditJourneyLocationModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { JourneyLocation, updateJourneyLocation } from '../../../api/journey';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

interface EditJourneyLocationModalProps {
  visible: boolean;
  onClose: () => void;
  locationToEdit: JourneyLocation | null;
}

const EditJourneyLocationModal: React.FC<EditJourneyLocationModalProps> = ({
  visible,
  onClose,
  locationToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [canReassign, setCanReassign] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateJourneyLocation,
    onSuccess: updatedLocation => {
      queryClient.invalidateQueries({ queryKey: ['journeyLocations'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Location "${updatedLocation.name}" updated.`,
        position: 'bottom',
      });
      onClose();
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message,
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (visible && locationToEdit) {
      setName(locationToEdit.name);
      setDescription(locationToEdit.description || '');
      setCanReassign(locationToEdit.can_reassign_tasks);
      mutation.reset();
    }
  }, [visible, locationToEdit]);

  const handleSave = () => {
    if (!locationToEdit) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Location name is required.' });
      return;
    }

    const updates: Partial<Omit<JourneyLocation, 'id'>> = {};
    let hasChanges = false;
    if (trimmedName !== locationToEdit.name) {
      updates.name = trimmedName;
      hasChanges = true;
    }
    if ((description.trim() || null) !== (locationToEdit.description || null)) {
      updates.description = description.trim() || null;
      hasChanges = true;
    }
    if (canReassign !== locationToEdit.can_reassign_tasks) {
      updates.can_reassign_tasks = canReassign;
      hasChanges = true;
    }

    if (!hasChanges) {
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No information was modified.' });
      onClose();
      return;
    }

    mutation.mutate({ locationId: locationToEdit.id, updates });
  };

  const isSaveDisabled = mutation.isPending || !name.trim();

  if (!locationToEdit) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Journey Location</Text>
          <Text style={commonSharedStyles.modalSubTitle}>ID: {locationToEdit.id}</Text>
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
              Enable this for locations where students can do tasks more than once. Leave disabled
              for one-time progression paths.
            </Text>
          </ScrollView>

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Saving Changes...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>Error: {mutation.error.message}</Text>
          )}

          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              color={colors.primary}
              disabled={isSaveDisabled}
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

export default EditJourneyLocationModal;
