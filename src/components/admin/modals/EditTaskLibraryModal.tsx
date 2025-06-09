// src/components/admin/modals/EditTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
} from 'react-native';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../../api/instruments';
import { fetchJourneyLocations, JourneyLocation } from '../../../api/journey';
import { updateTaskLibraryItem } from '../../../api/taskLibrary';
import { handleViewAttachment } from '../../../lib/supabaseClient';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { EditTaskLibraryModalProps } from '../../../types/componentProps';
import { Instrument, TaskLibraryItem } from '../../../types/dataTypes';
import { getInstrumentNames } from '../../../utils/helpers';

const EditTaskLibraryModal: React.FC<EditTaskLibraryModalProps> = ({
  visible,
  taskToEdit,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [canSelfAssign, setCanSelfAssign] = useState(false);
  const [selectedJourneyLocationId, setSelectedJourneyLocationId] = useState<string | null>(null);
  const [currentAttachmentPath, setCurrentAttachmentPath] = useState<string | undefined>(undefined);

  type FileAction = 'keep' | 'replace' | 'remove';
  const [fileAction, setFileAction] = useState<FileAction>('keep');
  const [newPickedDocument, setNewPickedDocument] =
    useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const {
    data: instruments = [],
    isLoading: isLoadingInstruments,
    isError: isErrorInstruments,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    enabled: visible,
  });

  const { data: journeyLocations = [], isLoading: isLoadingJourney } = useQuery<
    JourneyLocation[],
    Error
  >({
    queryKey: ['journeyLocations'],
    queryFn: fetchJourneyLocations,
    staleTime: 5 * 60 * 1000,
    enabled: visible && canSelfAssign,
  });

  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item updated.',
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
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setBaseTickets(taskToEdit.baseTickets);
      setReferenceUrl(taskToEdit.referenceUrl || '');
      setSelectedInstrumentIds(taskToEdit.instrumentIds || []);
      setCanSelfAssign(taskToEdit.canSelfAssign);
      setSelectedJourneyLocationId(taskToEdit.journeyLocationId || null);
      setCurrentAttachmentPath(taskToEdit.attachmentPath || undefined);
      setFileAction('keep');
      setNewPickedDocument(null);
      setFileError(null);
      mutation.reset();
    }
  }, [visible, taskToEdit]);

  useEffect(() => {
    if (!canSelfAssign) setSelectedJourneyLocationId(null);
  }, [canSelfAssign]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setNewPickedDocument(result);
        setFileAction('replace');
      }
    } catch (error) {
      setFileError('Failed to pick document.');
    }
  };

  const handleRemoveAttachment = () => {
    setFileAction('remove');
    setNewPickedDocument(null);
  };
  const toggleInstrumentSelection = (id: string) =>
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

  const handleSave = () => {
    if (!taskToEdit) return;
    const trimmedTitle = title.trim();
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || -1), 10);
    if (!trimmedTitle) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Task Title is required.' });
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Base Tickets must be a valid number.',
      });
      return;
    }
    if (canSelfAssign && !selectedJourneyLocationId) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'A Journey Location is required for self-assignable tasks.',
      });
      return;
    }

    const updates: Partial<Omit<TaskLibraryItem, 'id' | 'createdById'>> = {};
    let hasChanges = false;
    if (trimmedTitle !== taskToEdit.title) {
      updates.title = trimmedTitle;
      hasChanges = true;
    }
    if (description.trim() !== (taskToEdit.description || '')) {
      updates.description = description.trim();
      hasChanges = true;
    }
    if (numericTickets !== taskToEdit.baseTickets) {
      updates.baseTickets = numericTickets;
      hasChanges = true;
    }
    if (referenceUrl.trim() !== (taskToEdit.referenceUrl || '')) {
      updates.referenceUrl = referenceUrl.trim() === '' ? null : referenceUrl.trim();
      hasChanges = true;
    }
    if (canSelfAssign !== taskToEdit.canSelfAssign) {
      updates.canSelfAssign = canSelfAssign;
      hasChanges = true;
    }
    if (selectedJourneyLocationId !== (taskToEdit.journeyLocationId || null)) {
      updates.journeyLocationId = selectedJourneyLocationId;
      hasChanges = true;
    }
    const initialInstrumentIds = (taskToEdit.instrumentIds || []).sort();
    if (
      JSON.stringify([...selectedInstrumentIds].sort()) !== JSON.stringify(initialInstrumentIds)
    ) {
      updates.instrumentIds = selectedInstrumentIds;
      hasChanges = true;
    }

    let fileApiPayload: { file?: any; mimeType?: string; fileName?: string } = {};
    if (fileAction === 'remove' && currentAttachmentPath) {
      updates.attachmentPath = null;
      hasChanges = true;
    } else if (
      fileAction === 'replace' &&
      newPickedDocument &&
      !newPickedDocument.canceled &&
      newPickedDocument.assets
    ) {
      const asset = newPickedDocument.assets[0];
      if (!asset.mimeType || !asset.name) {
        Toast.show({ type: 'error', text1: 'File Error', text2: 'Selected file is missing info.' });
        return;
      }
      fileApiPayload = { file: asset, mimeType: asset.mimeType, fileName: asset.name };
      hasChanges = true;
    }

    if (!hasChanges) {
      Toast.show({ type: 'info', text1: 'No Changes', text2: 'No information was modified.' });
      onClose();
      return;
    }
    mutation.mutate({ taskId: taskToEdit.id, updates, ...fileApiPayload });
  };

  const isSaveDisabled =
    mutation.isPending ||
    isLoadingInstruments ||
    !title.trim() ||
    baseTickets === '' ||
    baseTickets < 0 ||
    (canSelfAssign && !selectedJourneyLocationId);
  const currentFileNameDisplay =
    fileAction === 'replace' &&
    newPickedDocument &&
    !newPickedDocument.canceled &&
    newPickedDocument.assets
      ? newPickedDocument.assets[0].name
      : fileAction !== 'remove' && currentAttachmentPath
        ? currentAttachmentPath.split('/').pop()
        : 'None';

  if (!visible) return null;
  if (!taskToEdit) {
    return (
      <Modal visible={true} transparent={true}>
        <View style={commonSharedStyles.centeredView}>
          <ActivityIndicator />
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Library Task</Text>
          <Text style={commonSharedStyles.modalSubTitle}>ID: {taskToEdit?.id}</Text>
          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={title}
              onChangeText={setTitle}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : (parseInt(text.replace(/[^0-9]/g, ''), 10) ?? 0))
              }
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Reference URL (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={referenceUrl}
              onChangeText={setReferenceUrl}
              keyboardType="url"
              autoCapitalize="none"
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
              <Text style={commonSharedStyles.label}>Allow Student Self-Assignment?</Text>
              <Switch
                trackColor={{ false: colors.secondary, true: colors.success }}
                thumbColor={colors.backgroundPrimary}
                onValueChange={setCanSelfAssign}
                value={canSelfAssign}
                disabled={mutation.isPending}
              />
            </View>

            {canSelfAssign && (
              <View style={{ marginBottom: 15 }}>
                <Text style={commonSharedStyles.label}>Journey Location (Required):</Text>
                {isLoadingJourney ? (
                  <ActivityIndicator />
                ) : (
                  <View style={commonSharedStyles.pickerContainer}>
                    <Picker
                      selectedValue={selectedJourneyLocationId}
                      onValueChange={itemValue => setSelectedJourneyLocationId(itemValue)}
                      enabled={!mutation.isPending}
                    >
                      <Picker.Item label="-- Select a Location --" value={null} />
                      {journeyLocations.map(loc => (
                        <Picker.Item key={loc.id} label={loc.name} value={loc.id} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
            )}

            <Text style={commonSharedStyles.label}>Instruments (Optional):</Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
              {isLoadingInstruments ? (
                <ActivityIndicator color={colors.primary} />
              ) : isErrorInstruments ? (
                <Text style={commonSharedStyles.errorText}>Error loading instruments.</Text>
              ) : instruments.length > 0 ? (
                <View style={commonSharedStyles.baseRowCentered}>
                  {instruments.map(inst => (
                    <Button
                      key={inst.id}
                      title={inst.name}
                      onPress={() => toggleInstrumentSelection(inst.id)}
                      color={
                        selectedInstrumentIds.includes(inst.id) ? colors.success : colors.secondary
                      }
                      disabled={mutation.isPending}
                    />
                  ))}
                </View>
              ) : (
                <Text style={commonSharedStyles.baseEmptyText}>No instruments available.</Text>
              )}
            </View>

            <Text style={commonSharedStyles.label}>Attachment (Optional):</Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
              <Text style={{ marginBottom: 10 }}>Current: {currentFileNameDisplay}</Text>
              <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                {currentAttachmentPath && fileAction !== 'remove' && (
                  <Button
                    title="View Current"
                    onPress={() => handleViewAttachment(currentAttachmentPath)}
                    disabled={mutation.isPending}
                    color={colors.secondary}
                  />
                )}
                <Button
                  title={currentAttachmentPath || newPickedDocument ? 'Change File' : 'Attach File'}
                  onPress={pickDocument}
                  disabled={mutation.isPending}
                  color={colors.info}
                />
                {(currentAttachmentPath || newPickedDocument) && fileAction !== 'remove' && (
                  <Button
                    title="Remove Attachment"
                    onPress={handleRemoveAttachment}
                    disabled={mutation.isPending}
                    color={colors.warning}
                  />
                )}
              </View>
              {fileError && (
                <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>{fileError}</Text>
              )}
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

export default EditTaskLibraryModal;
