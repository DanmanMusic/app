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
  StyleSheet,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { fetchInstruments } from '../../../api/instruments';
import { fetchJourneyLocations, JourneyLocation } from '../../../api/journey';
import {
  updateTaskLibraryItem,
  UpdateTaskApiPayload,
  fetchSingleTaskLibraryItem,
} from '../../../api/taskLibrary';
import { handleViewAttachment } from '../../../lib/supabaseClient';
import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import { EditTaskLibraryModalProps } from '../../../types/componentProps';
import { Instrument, TaskLibraryItem, Url, Attachment } from '../../../types/dataTypes';
import { NativeFileObject } from '../../../utils/helpers';
import { useAuth } from '../../../contexts/AuthContext';

interface UrlInput extends Partial<Url> {
  localId: string;
}
interface AttachmentInput extends Partial<Attachment> {
  localId: string;
  isNew: boolean;
  nativeFile?: NativeFileObject;
}

const EditTaskLibraryModal: React.FC<EditTaskLibraryModalProps> = ({
  visible,
  taskToEdit,
  onClose,
}) => {
  const { currentUserRole } = useAuth();
  const isAdmin = currentUserRole === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseTickets, setBaseTickets] = useState<number | ''>('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [canSelfAssign, setCanSelfAssign] = useState(false);
  const [selectedJourneyLocationId, setSelectedJourneyLocationId] = useState<string | null>(null);

  const [urls, setUrls] = useState<UrlInput[]>([]);
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);

  const queryClient = useQueryClient();

  const { data: fullTask, isLoading: isLoadingTask } = useQuery<TaskLibraryItem | null, Error>({
    queryKey: ['taskLibraryItem', taskToEdit?.id],
    queryFn: () => {
      if (!taskToEdit?.id) {
        return Promise.resolve(null);
      }

      return fetchSingleTaskLibraryItem(taskToEdit.id);
    },
    enabled: !!taskToEdit && visible,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: instruments = [] } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    enabled: visible,
  });

  const { data: journeyLocations = [] } = useQuery<JourneyLocation[], Error>({
    queryKey: ['journeyLocations'],
    queryFn: fetchJourneyLocations,
    staleTime: 5 * 60 * 1000,
    enabled: visible && isAdmin && canSelfAssign,
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateTaskApiPayload) => updateTaskLibraryItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-library'] });
      queryClient.invalidateQueries({ queryKey: ['taskLibraryItem', taskToEdit?.id] });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task updated.' });
      onClose();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message });
    },
  });

  useEffect(() => {
    if (visible && fullTask) {
      setTitle(fullTask.title);
      setDescription(fullTask.description || '');
      setBaseTickets(fullTask.baseTickets);
      setSelectedInstrumentIds(fullTask.instrumentIds || []);
      setCanSelfAssign(fullTask.canSelfAssign);
      setSelectedJourneyLocationId(fullTask.journeyLocationId || null);
      setUrls(fullTask.urls.map(u => ({ ...u, localId: u.id })));
      setAttachments(fullTask.attachments.map(a => ({ ...a, localId: a.id, isNew: false })));
      mutation.reset();
    }
  }, [visible, fullTask]);

  const handleAddUrl = () =>
    setUrls(p => [...p, { localId: Date.now().toString(), url: '', label: '' }]);
  const handleUpdateUrl = (localId: string, field: 'url' | 'label', value: string) => {
    setUrls(p => p.map(u => (u.localId === localId ? { ...u, [field]: value } : u)));
  };
  const handleRemoveUrl = (localId: string) => setUrls(p => p.filter(u => u.localId !== localId));

  const handlePickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
    if (!result.canceled) {
      const newFiles: AttachmentInput[] = result.assets.map(asset => ({
        localId: `${asset.name}-${asset.size}`,
        name: asset.name,
        isNew: true,
        nativeFile: asset,
        file_path: asset.uri,
      }));
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };
  const handleRemoveAttachment = (localId: string) =>
    setAttachments(p => p.filter(a => a.localId !== localId));
  const toggleInstrumentSelection = (id: string) =>
    setSelectedInstrumentIds(p => (p.includes(id) ? p.filter(i => i !== id) : [...p, id]));

  const handleSave = () => {
    if (!fullTask) return;
    const initialAttachmentPaths = fullTask.attachments.map(a => a.file_path);
    const finalAttachments = attachments.filter(a => !a.isNew);
    const attachmentPathsToDelete = initialAttachmentPaths.filter(
      p => !finalAttachments.some(fa => fa.file_path === p)
    );
    const newFilesToUpload = attachments.filter(a => a.isNew);
    const payload: UpdateTaskApiPayload = {
      taskId: fullTask.id,
      updates: {
        title: title.trim(),
        description: description.trim() || null,
        baseTickets: Number(baseTickets),
        canSelfAssign,
        journeyLocationId: canSelfAssign ? selectedJourneyLocationId : null,
        instrumentIds: selectedInstrumentIds,
        urls: urls.map(({ id, url, label }) => ({
          id: id!,
          url: (url || '').trim(),
          label: (label || '').trim() || null,
        })),
        attachments: finalAttachments.map(({ id, file_path, file_name }) => ({
          id: id!,
          file_path: file_path!,
          file_name: file_name!,
        })),
        newFiles: newFilesToUpload.map(f => ({
          _nativeFile: f.nativeFile!,
          fileName: f.file_name!,
          mimeType: f.nativeFile!.mimeType!,
        })),
        attachmentPathsToDelete,
      },
    };
    mutation.mutate(payload);
  };

  if (isLoadingTask) {
    return (
      <Modal visible={true} transparent={true}>
        <View style={commonSharedStyles.centeredView}>
          <ActivityIndicator size="large" />
        </View>
      </Modal>
    );
  }
  if (!taskToEdit || !fullTask) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Edit Library Task</Text>
          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            <Text style={commonSharedStyles.label}>Task Title:</Text>
            <TextInput style={commonSharedStyles.input} value={title} onChangeText={setTitle} />
            <Text style={commonSharedStyles.label}>Base Tickets:</Text>
            <TextInput
              style={commonSharedStyles.input}
              value={String(baseTickets)}
              onChangeText={text =>
                setBaseTickets(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
              }
              keyboardType="numeric"
            />
            <Text style={commonSharedStyles.label}>Description:</Text>
            <TextInput
              style={commonSharedStyles.textArea}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
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
                  onValueChange={setCanSelfAssign}
                  value={canSelfAssign}
                />
              </View>
            )}

            {canSelfAssign && (
              <View style={{ marginBottom: 15 }}>
                <Text style={commonSharedStyles.label}>Journey Location (Required):</Text>
                <View style={commonSharedStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedJourneyLocationId}
                    onValueChange={itemValue => setSelectedJourneyLocationId(itemValue)}
                  >
                    <Picker.Item label="-- Select a Location --" value={null} />
                    {journeyLocations.map(loc => (
                      <Picker.Item key={loc.id} label={loc.name} value={loc.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            <View style={styles.listHeader}>
              <Text style={commonSharedStyles.label}>Reference URLs</Text>
              <Button title="+ Add URL" onPress={handleAddUrl} disabled={mutation.isPending} />
            </View>
            {urls.map(urlItem => (
              <View key={urlItem.localId} style={styles.urlItemContainer}>
                <TextInput
                  style={styles.urlInput}
                  value={urlItem.url}
                  onChangeText={text => handleUpdateUrl(urlItem.localId, 'url', text)}
                  placeholder="https://example.com"
                />
                <TextInput
                  style={styles.labelInput}
                  value={urlItem.label ?? ''}
                  onChangeText={text => handleUpdateUrl(urlItem.localId, 'label', text)}
                  placeholder="Optional Label"
                />
                <Button
                  title="Remove"
                  onPress={() => handleRemoveUrl(urlItem.localId)}
                  color={colors.danger}
                />
              </View>
            ))}

            <View style={styles.listHeader}>
              <Text style={commonSharedStyles.label}>Attachments</Text>
              <Button
                title="+ Attach Files"
                onPress={handlePickFiles}
                disabled={mutation.isPending}
              />
            </View>
            {attachments.map(att => (
              <View key={att.localId} style={styles.fileItemContainer}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {att.file_name}
                </Text>
                <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                  {!att.isNew && (
                    <Button
                      title="View"
                      onPress={() => handleViewAttachment(att.file_path!)}
                      color={colors.info}
                    />
                  )}
                  <Button
                    title="Remove"
                    onPress={() => handleRemoveAttachment(att.localId)}
                    color={colors.danger}
                  />
                </View>
              </View>
            ))}

            <Text style={[commonSharedStyles.label, { marginTop: 15 }]}>
              Instruments (Optional):
            </Text>
            <View style={[commonSharedStyles.baseItem, { marginBottom: 15, padding: 10 }]}>
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
            </View>
          </ScrollView>

          {mutation.isPending && <ActivityIndicator />}
          <View style={commonSharedStyles.full}>
            <Button title="Save Changes" onPress={handleSave} disabled={mutation.isPending} />
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

export default EditTaskLibraryModal;
