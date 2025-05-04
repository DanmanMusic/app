// src/components/admin/modals/EditTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // Added useQuery
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native'; // Added Linking
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker'; // Import document picker

import { updateTaskLibraryItem } from '../../../api/taskLibrary'; // API uses Edge Func now
import { fetchInstruments } from '../../../api/instruments'; // Import fetchInstruments

import { Instrument, TaskLibraryItem } from '../../../types/dataTypes'; // Import Instrument
import { colors } from '../../../styles/colors';
import { EditTaskLibraryModalProps } from '../../../types/componentProps';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { getSupabase } from '../../../lib/supabaseClient'; // Import for signed URL

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

const EditTaskLibraryModal: React.FC<EditTaskLibraryModalProps> = ({
  visible,
  taskToEdit,
  onClose,
}) => {
  // Form state initialized from taskToEdit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [currentAttachmentPath, setCurrentAttachmentPath] = useState<string | undefined>(undefined);

  // State for handling file changes
  // 'keep': No change
  // 'replace': User picked a new file
  // 'remove': User clicked remove button
  type FileAction = 'keep' | 'replace' | 'remove';
  const [fileAction, setFileAction] = useState<FileAction>('keep');
  const [newPickedDocument, setNewPickedDocument] =
    useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch available instruments
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

  // Update Mutation
  const mutation = useMutation({
    mutationFn: updateTaskLibraryItem, // Calls API -> Edge Func
    onSuccess: updatedTask => {
      // We refetch within the API function now, so this data should be fresh
      queryClient.invalidateQueries({ queryKey: ['task-library'] }); // Still good practice
      queryClient.setQueryData(['task-library', { id: updatedTask.id }], updatedTask); // Optionally update specific item cache
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

  // Effect to populate form when taskToEdit changes or modal becomes visible
  useEffect(() => {
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setBaseTickets(taskToEdit.baseTickets);
      setReferenceUrl(taskToEdit.referenceUrl || '');
      setSelectedInstrumentIds(taskToEdit.instrumentIds || []);
      setCurrentAttachmentPath(taskToEdit.attachmentPath || '');
      // Reset file handling state
      setFileAction('keep');
      setNewPickedDocument(null);
      setFileError(null);
      mutation.reset();
    } else {
      // Clear form if modal closes or no task
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
  }, [visible, taskToEdit]); // Rerun when visibility or task changes

  // Function to handle picking a *new* document
  const pickDocument = async () => {
    setFileError(null);
    try {
      const result: DocumentPicker.DocumentPickerResult = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setNewPickedDocument(result);
        setFileAction('replace'); // Mark intent to replace
      } else {
        // If cancelled, revert action only if it was 'replace'
        if (fileAction === 'replace') {
          setFileAction('keep');
          setNewPickedDocument(null);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      setFileError('Failed to pick document.');
      setNewPickedDocument(null);
      setFileAction('keep'); // Revert action on error
    }
  };

  // Function to mark attachment for removal
  const handleRemoveAttachment = () => {
    setFileAction('remove');
    setNewPickedDocument(null); // Clear any newly picked doc
  };

  // Function to view/download current attachment (basic example)
  const viewCurrentAttachment = async () => {
    if (!currentAttachmentPath) return;
    try {
      const supabase = getSupabase();
      // Get a temporary signed URL (expires in 60 seconds)
      const { data, error } = await supabase.storage
        .from(TASK_ATTACHMENT_BUCKET)
        .createSignedUrl(currentAttachmentPath, 60); // 60 seconds expiry

      if (error) throw error;

      if (data?.signedUrl) {
        // Attempt to open the URL in the browser/system handler
        const supported = await Linking.canOpenURL(data.signedUrl);
        if (supported) {
          await Linking.openURL(data.signedUrl);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: `Cannot open URL for this file type.`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error getting signed URL:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Could not get download link: ${error.message}`,
      });
    }
  };

  const toggleInstrumentSelection = (id: string) => {
    /* ... same as create modal ... */
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instId => instId !== id) : [...prev, id]
    );
  };

  // Handle Save Changes
  const handleSave = () => {
    if (!taskToEdit) return;

    const trimmedTitle = title.trim();
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10);

    // --- Basic Validation ---
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

    // --- Prepare Updates Payload ---
    const updates: Partial<Omit<TaskLibraryItem, 'id' | 'createdById'>> = {};
    let hasChanges = false;

    // Check standard fields
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
    const currentRefUrl = taskToEdit.referenceUrl || ''; // Treat null/undefined as empty string for comparison
    const newRefUrl = referenceUrl.trim();

    if (newRefUrl !== currentRefUrl) {
      // Check if value actually changed
      // If changed, set DB value to the new trimmed value OR explicitly null if now empty
      updates.referenceUrl = newRefUrl === '' ? null : newRefUrl;
      hasChanges = true;
    }

    // Check instrument links
    const initialInstrumentIds = (taskToEdit.instrumentIds || []).sort();
    const currentInstrumentIds = [...selectedInstrumentIds].sort();
    if (JSON.stringify(initialInstrumentIds) !== JSON.stringify(currentInstrumentIds)) {
      updates.instrumentIds = selectedInstrumentIds;
      hasChanges = true;
    }

    // --- Prepare File Payload for API ---
    let fileApiPayload: {
      file?: any;
      mimeType?: string;
      fileName?: string;
      deleteAttachment?: boolean;
    } = {};

    if (fileAction === 'remove') {
      fileApiPayload.file = null; // Signal removal intention to API
      // Only consider it a change if there was an attachment before
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
      hasChanges = true; // Replacing is always a change
    }
    // If fileAction is 'keep', fileApiPayload remains empty, no file change sent

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

    // --- Call Mutation ---
    mutation.mutate({
      taskId: taskToEdit.id,
      updates: updates, // Contains text/numeric/instrument changes
      ...fileApiPayload, // Spread file info (file object, mime, name) or delete flag
    });
  };

  const isSaveDisabled =
    mutation.isPending ||
    isLoadingInstruments ||
    !title.trim() ||
    baseTickets === '' ||
    baseTickets < 0;

  // Display name for the current attachment or newly picked file
  const currentFileNameDisplay =
    fileAction === 'replace' &&
    newPickedDocument &&
    !newPickedDocument.canceled &&
    newPickedDocument.assets
      ? newPickedDocument.assets[0].name
      : fileAction !== 'remove' && currentAttachmentPath
        ? currentAttachmentPath.split('/').pop() // Basic name extraction
        : 'None';

  if (!taskToEdit && visible) {
    // Handle case where modal is visible but task data is missing (shouldn't happen with useEffect)
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
          <ScrollView style={commonSharedStyles.modalScrollView}>
            {/* Title, Tickets, Description, URL Inputs */}
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
            <Text style={commonSharedStyles.label}>Attachment:</Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
              <Text style={{ marginBottom: 10 }}>Current: {currentFileNameDisplay}</Text>
              <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                {currentAttachmentPath && fileAction !== 'remove' && (
                  <Button
                    title="View Current"
                    onPress={viewCurrentAttachment}
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
