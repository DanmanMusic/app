// src/components/admin/modals/CreateTaskLibraryModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../../api/instruments';
import { fetchJourneyLocations, JourneyLocation } from '../../../api/journey';
import { createTaskLibraryItem } from '../../../api/taskLibrary';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { CreateTaskLibraryModalProps } from '../../../types/componentProps';
import { Instrument } from '../../../types/dataTypes';
import { NativeFileObject } from '../../../utils/helpers';
import { useAuth } from '../../../contexts/AuthContext';
import { CustomButton } from '../../common/CustomButton';
import { TrashIcon, XCircleIcon } from 'react-native-heroicons/solid';

interface UrlInput {
  id: string;
  url: string;
  label: string;
}
interface FileInput {
  id: string;
  asset: NativeFileObject;
}

const CreateTaskLibraryModal: React.FC<CreateTaskLibraryModalProps> = ({ visible, onClose }) => {
  const { currentUserRole } = useAuth();
  const isAdmin = currentUserRole === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [canSelfAssign, setCanSelfAssign] = useState(false);
  const [selectedJourneyLocationId, setSelectedJourneyLocationId] = useState<string | null>(null);
  const [urls, setUrls] = useState<UrlInput[]>([]);
  const [files, setFiles] = useState<FileInput[]>([]);

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
    enabled: visible && isAdmin && canSelfAssign,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => createTaskLibraryItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task created successfully.' });
      onClose();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Creation Failed', text2: error.message });
    },
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setBaseTickets('');
      setSelectedInstrumentIds([]);
      setCanSelfAssign(false);
      setSelectedJourneyLocationId(null);
      setUrls([]);
      setFiles([]);
      mutation.reset();
      if (!isAdmin) {
        setCanSelfAssign(false);
      }
    }
  }, [visible, isAdmin]);

  useEffect(() => {
    if (!canSelfAssign) {
      setSelectedJourneyLocationId(null);
    }
  }, [canSelfAssign]);

  const handleAddUrl = () =>
    setUrls(p => [...p, { id: Date.now().toString(), url: '', label: '' }]);
  const handleUpdateUrl = (id: string, field: 'url' | 'label', value: string) => {
    setUrls(p => p.map(u => (u.id === id ? { ...u, [field]: value } : u)));
  };
  const handleRemoveUrl = (id: string) => setUrls(p => p.filter(u => u.id !== id));

  const handlePickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
    if (!result.canceled) {
      const newFiles: FileInput[] = result.assets.map(asset => ({
        id: `${asset.name}-${asset.size}`,
        asset,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  const handleRemoveFile = (id: string) => setFiles(p => p.filter(f => f.id !== id));
  const toggleInstrumentSelection = (id: string) =>
    setSelectedInstrumentIds(p => (p.includes(id) ? p.filter(i => i !== id) : [...p, id]));

  const handleCreate = () => {
    const trimmedTitle = title.trim();
    const numericTickets = Number(baseTickets);
    if (!trimmedTitle || isNaN(numericTickets) || numericTickets < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title and valid Base Tickets are required.',
      });
      return;
    }
    if (isAdmin && canSelfAssign && !selectedJourneyLocationId) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'A Journey Location is required for self-assignable tasks.',
      });
      return;
    }
    for (const urlItem of urls) {
      if (!urlItem.url.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'URL fields cannot be empty.',
        });
        return;
      }
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      baseTickets: numericTickets,
      instrumentIds: selectedInstrumentIds,
      canSelfAssign,
      journeyLocationId: canSelfAssign ? selectedJourneyLocationId : null,
      urls: urls.map(({ url, label }) => ({ url: url.trim(), label: label.trim() })),
      files: files.map(f => ({
        _nativeFile: f.asset,
        fileName: f.asset.name,
        mimeType: f.asset.mimeType!,
      })),
    };
    mutation.mutate(payload);
  };

  const isCreateDisabled =
    mutation.isPending ||
    isLoadingInstruments ||
    !title.trim() ||
    baseTickets === '' ||
    baseTickets < 0 ||
    (canSelfAssign && !selectedJourneyLocationId);

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
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              keyboardType="numeric"
              editable={!mutation.isPending}
            />
            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the task requirements..."
              multiline={true}
              numberOfLines={3}
              editable={!mutation.isPending}
            />
            {isAdmin && (
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
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setCanSelfAssign}
                  value={canSelfAssign}
                  disabled={mutation.isPending}
                />
              </View>
            )}
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

            <View style={styles.listHeader}>
              <Text style={commonSharedStyles.label}>Reference URLs</Text>
              <CustomButton
                title="+ Add URL"
                onPress={handleAddUrl}
                disabled={mutation.isPending}
              />
            </View>
            {urls.map(urlItem => (
              <View key={urlItem.id} style={styles.urlItemContainer}>
                <TextInput
                  style={styles.urlInput}
                  value={urlItem.url}
                  onChangeText={text => handleUpdateUrl(urlItem.id, 'url', text)}
                  placeholder="https://example.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.labelInput}
                  value={urlItem.label}
                  onChangeText={text => handleUpdateUrl(urlItem.id, 'label', text)}
                  placeholder="Optional Label (e.g., YouTube)"
                />
                <CustomButton
                  title="Remove"
                  onPress={() => handleRemoveUrl(urlItem.id)}
                  color={colors.danger}
                  leftIcon={<TrashIcon color={colors.textWhite} size={18} />}
                />
              </View>
            ))}

            <View style={styles.listHeader}>
              <Text style={commonSharedStyles.label}>Attachments</Text>
              <CustomButton
                title="+ Attach Files"
                onPress={handlePickFiles}
                disabled={mutation.isPending}
              />
            </View>
            {files.map(fileItem => (
              <View key={fileItem.id} style={styles.fileItemContainer}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileItem.asset.name}
                </Text>
                <CustomButton
                  title="Remove"
                  onPress={() => handleRemoveFile(fileItem.id)}
                  color={colors.danger}
                  leftIcon={<TrashIcon color={colors.textWhite} size={18} />}
                />
              </View>
            ))}

            <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>
              Instruments (Optional):
            </Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
              {isLoadingInstruments ? (
                <ActivityIndicator color={colors.primary} />
              ) : isErrorInstruments ? (
                <Text style={commonSharedStyles.errorText}>Error loading instruments.</Text>
              ) : instruments.length > 0 ? (
                <View style={commonSharedStyles.baseRowCentered}>
                  {instruments.map(inst => (
                    <CustomButton
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
          </ScrollView>

          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Creating Task...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>Error: {mutation.error.message}</Text>
          )}

          <View style={commonSharedStyles.full}>
            <CustomButton
              title={mutation.isPending ? 'Creating...' : 'Create Task'}
              onPress={handleCreate}
              color={colors.primary}
              disabled={isCreateDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
              leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  urlItemContainer: {
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
    gap: 5,
  },
  urlInput: { ...commonSharedStyles.input, marginBottom: 5 },
  labelInput: { ...commonSharedStyles.input, marginBottom: 5, fontSize: 14, minHeight: 35 },
  fileItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundGrey,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 5,
  },
  fileName: { flex: 1, marginRight: 10, color: colors.textSecondary },
});

export default CreateTaskLibraryModal;
