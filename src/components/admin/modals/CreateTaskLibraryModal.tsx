// src/components/admin/modals/CreateTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';

import { Modal, View, Text, Button, TextInput, ScrollView, ActivityIndicator } from 'react-native';

import { useMutation, useQuery } from '@tanstack/react-query';

import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../../api/instruments';
import { createTaskLibraryItem } from '../../../api/taskLibrary';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { CreateTaskLibraryModalProps } from '../../../types/componentProps';
import { Instrument, TaskLibraryItem } from '../../../types/dataTypes';

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [pickedDocument, setPickedDocument] = useState<DocumentPicker.DocumentPickerResult | null>(
    null
  );
  const [fileError, setFileError] = useState<string | null>(null);

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
    mutationFn: createTaskLibraryItem,
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: error instanceof Error ? error.message : 'Could not create task.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      setReferenceUrl('');
      setSelectedInstrumentIds([]);
      setPickedDocument(null);
      setFileError(null);
      mutation.reset();
    }
  }, [visible]);

  const pickDocument = async () => {
    setFileError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      setPickedDocument(result.canceled ? null : result);
    } catch (error) {
      console.error('Error picking document:', error);
      setFileError('Failed to pick document.');
      setPickedDocument(null);
    }
  };

  const toggleInstrumentSelection = (id: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(id) ? prev.filter(instId => instId !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    const trimmedTitle = title.trim();
    const numericTickets =
      typeof baseTickets === 'number' ? baseTickets : parseInt(String(baseTickets || '-1'), 10);

    if (!trimmedTitle) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Task Title cannot be empty.',
        position: 'bottom',
      });
      return;
    }
    if (isNaN(numericTickets) || numericTickets < 0 || !Number.isInteger(numericTickets)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Base Tickets must be a whole number (0 or greater).',
        position: 'bottom',
      });
      return;
    }
    if (referenceUrl.trim() && !referenceUrl.trim().toLowerCase().startsWith('http')) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Reference URL must start with http or https.',
        position: 'bottom',
      });
      return;
    }

    let filePayload = {};
    if (
      pickedDocument &&
      !pickedDocument.canceled &&
      pickedDocument.assets &&
      pickedDocument.assets.length > 0
    ) {
      const asset = pickedDocument.assets[0];
      if (!asset.mimeType || !asset.name) {
        Toast.show({
          type: 'error',
          text1: 'File Error',
          text2: 'Selected file is missing required information (type or name).',
          position: 'bottom',
        });
        return;
      }
      filePayload = { file: asset, mimeType: asset.mimeType, fileName: asset.name };
    }

    const newTaskData: Omit<TaskLibraryItem, 'id'> & {
      file?: any;
      mimeType?: string;
      fileName?: string;
    } = {
      title: trimmedTitle,
      description: description.trim(),
      baseTickets: numericTickets,
      referenceUrl: referenceUrl.trim() || undefined,
      instrumentIds: selectedInstrumentIds,
      createdById: '',
      ...filePayload,
    };

    mutation.mutate(newTaskData);
  };

  const isCreateDisabled =
    mutation.isPending ||
    isLoadingInstruments ||
    !title.trim() ||
    baseTickets === '' ||
    baseTickets < 0;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Create New Library Task</Text>
          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Practice Scales"
              placeholderTextColor={colors.textLight}
              maxLength={100}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : (parseInt(text.replace(/[^0-9]/g, ''), 10) ?? 0))
              }
              placeholder="e.g., 10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the task requirements..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Reference URL (Optional):</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={referenceUrl}
              onChangeText={setReferenceUrl}
              placeholder="https://example.com/resource"
              placeholderTextColor={colors.textLight}
              keyboardType="url"
              autoCapitalize="none"
              editable={!mutation.isPending}
            />

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

            <Text style={commonSharedStyles.label}>Attachment (Optional):</Text>
            <View
              style={[
                commonSharedStyles.baseRow,
                { alignItems: 'center', marginBottom: 5, gap: 10 },
              ]}
            >
              <Button
                title={pickedDocument && !pickedDocument.canceled ? 'Change File' : 'Attach File'}
                onPress={pickDocument}
                disabled={mutation.isPending}
                color={colors.info}
              />
              {pickedDocument && !pickedDocument.canceled && pickedDocument.assets && (
                <Text
                  style={commonSharedStyles.baseSecondaryText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Selected: {pickedDocument.assets[0].name}
                </Text>
              )}
            </View>
            {fileError && (
              <Text style={[commonSharedStyles.errorText, { marginBottom: 15 }]}>{fileError}</Text>
            )}
          </ScrollView>

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Task...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create task'}
            </Text>
          )}
          <View style={commonSharedStyles.full}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Task'}
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

export default CreateTaskLibraryModal;
