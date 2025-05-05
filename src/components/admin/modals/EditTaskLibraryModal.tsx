// src/components/admin/modals/EditTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';

import { updateTaskLibraryItem } from '../../../api/taskLibrary';
import { fetchInstruments } from '../../../api/instruments';

import { Instrument, TaskLibraryItem } from '../../../types/dataTypes';
import { colors } from '../../../styles/colors';
import { EditTaskLibraryModalProps } from '../../../types/componentProps';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { handleViewAttachment } from '../../../lib/supabaseClient';

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

  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem,
    onSuccess: updatedTask => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      queryClient.setQueryData(['task-library', { id: updatedTask.id }], updatedTask);
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task library item updated.',
        position: 'bottom',
      });
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Could not update task.',
        position: 'bottom',
        visibilityTime: 4000,
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
      setCurrentAttachmentPath(taskToEdit.attachmentPath || '');

      setFileAction('keep');
      setNewPickedDocument(null);
      setFileError(null);
      mutation.reset();
    } else {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      setReferenceUrl('');
      setSelectedInstrumentIds([]);
      setCurrentAttachmentPath(undefined);
      setFileAction('keep');
      setNewPickedDocument(null);
      setFileError(null);
    }
  }, [visible, taskToEdit]);

  const pickDocument = async () => {
    setFileError(null);
    try {
      const result: DocumentPicker.DocumentPickerResult = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setNewPickedDocument(result);
        setFileAction('replace');
      } else {
        if (fileAction === 'replace') {
          setFileAction('keep');
          setNewPickedDocument(null);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      setFileError('Failed to pick document.');
      setNewPickedDocument(null);
      setFileAction('keep');
    }
  };

  const handleRemoveAttachment = () => {
    setFileAction('remove');
    setNewPickedDocument(null);
  };

  const toggleInstrumentSelection = (id: string) => {
    /* ... same as create modal ... */
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instId => instId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!taskToEdit) return;

    const trimmedTitle = title.trim();
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10);

    if (!trimmedTitle) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task Title cannot be empty.',
      });
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0 || !Number.isInteger(numericTickets)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Base Tickets must be a whole number (0 or greater).',
      });
      return;
    }
    if (referenceUrl.trim() && !referenceUrl.trim().toLowerCase().startsWith('http')) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Reference URL must start with http or https.',
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
    const currentRefUrl = taskToEdit.referenceUrl || '';
    const newRefUrl = referenceUrl.trim();

    if (newRefUrl !== currentRefUrl) {
      updates.referenceUrl = newRefUrl === '' ? null : newRefUrl;
      hasChanges = true;
    }

    const initialInstrumentIds = (taskToEdit.instrumentIds || []).sort();
    const currentInstrumentIds = [...selectedInstrumentIds].sort();
    if (JSON.stringify(initialInstrumentIds) !== JSON.stringify(currentInstrumentIds)) {
      updates.instrumentIds = selectedInstrumentIds;
      hasChanges = true;
    }

    let fileApiPayload: {
      file?: any;
      mimeType?: string;
      fileName?: string;
      deleteAttachment?: boolean;
    } = {};

    if (fileAction === 'remove') {
      fileApiPayload.file = null;

      if (currentAttachmentPath) hasChanges = true;
    } else if (
      fileAction === 'replace' &&
      newPickedDocument &&
      !newPickedDocument.canceled &&
      newPickedDocument.assets &&
      newPickedDocument.assets.length > 0
    ) {
      const asset = newPickedDocument.assets[0];
      if (!asset.mimeType || !asset.name) {
        Toast.show({
          type: 'error',
          text1: 'File Error',
          text2: 'Selected file is missing required information (type or name).',
        });
        return;
      }
      fileApiPayload = { file: asset, mimeType: asset.mimeType, fileName: asset.name };
      hasChanges = true;
    }

    if (!hasChanges) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No changes detected to save.',
        position: 'bottom',
      });
      onClose();
      return;
    }

    mutation.mutate({
      taskId: taskToEdit.id,
      updates: updates,
      ...fileApiPayload,
    });
  };

  const isSaveDisabled =
    mutation.isPending ||
    isLoadingInstruments ||
    !title.trim() ||
    baseTickets === '' ||
    baseTickets < 0;

  const currentFileNameDisplay =
    fileAction === 'replace' &&
    newPickedDocument &&
    !newPickedDocument.canceled &&
    newPickedDocument.assets
      ? newPickedDocument.assets[0].name
      : fileAction !== 'remove' && currentAttachmentPath
        ? currentAttachmentPath.split('/').pop()
        : 'None';

  if (!taskToEdit && visible) {
    return (
      <Modal visible={true} transparent={true}>
        <View style={commonSharedStyles.centeredView}>
          <ActivityIndicator />
        </View>
      </Modal>
    );
  }
  if (!visible) {
    return null;
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

            {/* Instrument Selector */}
            <Text style={commonSharedStyles.label}>Instruments (Optional):</Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
              {isLoadingInstruments && <ActivityIndicator color={colors.primary} />}
              {isErrorInstruments && (
                <Text style={commonSharedStyles.errorText}>Error loading instruments.</Text>
              )}
              {!isLoadingInstruments &&
                !isErrorInstruments &&
                (instruments.length > 0 ? (
                  <View style={commonSharedStyles.baseRowCentered}>
                    {instruments.map(inst => {
                      const isSelected = selectedInstrumentIds.includes(inst.id);
                      return (
                        <Button
                          key={inst.id}
                          title={inst.name}
                          onPress={() => toggleInstrumentSelection(inst.id)}
                          color={isSelected ? colors.success : colors.secondary}
                          disabled={mutation.isPending}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={commonSharedStyles.baseEmptyText}>No instruments available.</Text>
                ))}
            </View>

            {/* Attachment Management */}
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

          {/* Mutation Status & Buttons */}
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
