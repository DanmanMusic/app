// src/components/common/AssignTaskModal.tsx
import React, { useState, useMemo, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { createAssignedTask } from '../../api/assignedTasks';
import { fetchInstruments } from '../../api/instruments';
import { fetchTaskLibrary } from '../../api/taskLibrary';
import { fetchStudents, fetchUserProfile } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AssignTaskModalProps } from '../../types/componentProps';
import {
  AssignedTask,
  TaskLibraryItem,
  SimplifiedStudent,
  User,
  Instrument,
} from '../../types/dataTypes';
import { getInstrumentNames, getUserDisplayName, NativeFileObject } from '../../utils/helpers';

interface UrlInput {
  id: string;
  url: string;
  label: string;
}
interface FileInput {
  id: string;
  asset: NativeFileObject;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  visible,
  onClose,
  preselectedStudentId,
}) => {
  const { currentUserId: assignerId, currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
  const [isAdHocMode, setIsAdHocMode] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');
  const [adHocUrls, setAdHocUrls] = useState<UrlInput[]>([]);
  const [adHocFiles, setAdHocFiles] = useState<FileInput[]>([]);

  const {
    data: taskLibrary = [],
    isLoading: isLoadingLibrary,
    isError: isErrorLibrary,
    error: errorLibrary,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library', { viewer: currentUserRole }],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
    enabled: visible && step >= 2 && !isAdHocMode,
  });

  const assignableTaskLibrary = useMemo(() => {
    return taskLibrary.filter(task => !task.canSelfAssign);
  }, [taskLibrary]);

  const sortedTasks = useMemo(
    () => [...assignableTaskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [assignableTaskLibrary]
  );

  const filterTeacherId = currentUserRole === 'teacher' ? assignerId : undefined;
  const {
    data: studentListResult,
    isLoading: isLoadingStudentsList,
    isError: isErrorStudentsList,
    error: errorStudentsList,
  } = useQuery({
    queryKey: [
      'students',
      {
        filter: 'active',
        context: 'assignTaskModal',
        teacherId: filterTeacherId,
        limit: 500,
        page: 1,
        search: studentSearchTerm,
      },
    ],
    queryFn: () =>
      fetchStudents({
        filter: 'active',
        page: 1,
        limit: 500,
        teacherId: filterTeacherId,
        searchTerm: studentSearchTerm,
      }),
    enabled: visible && step === 1 && !preselectedStudentId && !!assignerId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: selectedStudentProfile,
    isLoading: isLoadingSelectedStudent,
    isError: isErrorSelectedStudent,
    error: errorSelectedStudent,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', selectedStudentId],
    queryFn: () => (selectedStudentId ? fetchUserProfile(selectedStudentId) : null),
    enabled: !!selectedStudentId && step >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: instruments = [], isLoading: isLoadingInstruments } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    enabled: visible && step === 2 && !isAdHocMode,
  });

  const availableStudents: SimplifiedStudent[] = useMemo(
    () => studentListResult?.students ?? [],
    [studentListResult]
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearchTerm.toLowerCase().trim();
    if (!term) return [...availableStudents].sort((a, b) => a.name.localeCompare(b.name));
    return availableStudents
      .filter(s => s.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStudents, studentSearchTerm]);

  const selectedStudentName = useMemo(() => {
    if (selectedStudentProfile) return getUserDisplayName(selectedStudentProfile);
    if (!selectedStudentId) return 'Unknown Student';
    const studentFromList = availableStudents.find(s => s.id === selectedStudentId);
    return studentFromList?.name || `ID: ${selectedStudentId}`;
  }, [selectedStudentId, selectedStudentProfile, availableStudents]);

  const filteredTaskLibraryForStudent = useMemo(() => {
    if (
      isLoadingSelectedStudent ||
      !selectedStudentProfile ||
      !selectedStudentProfile.instrumentIds ||
      sortedTasks.length === 0
    ) {
      return sortedTasks;
    }
    const studentInstruments = selectedStudentProfile.instrumentIds;
    return sortedTasks.filter(task => {
      const taskInstruments = task.instrumentIds || [];
      if (taskInstruments.length === 0) return true;
      return taskInstruments.some(taskInstId => studentInstruments.includes(taskInstId));
    });
  }, [sortedTasks, selectedStudentProfile, isLoadingSelectedStudent]);

  const mutation = useMutation({
    mutationFn: (payload: any) => createAssignedTask(payload),
    onSuccess: createdAssignment => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      onClose();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task assigned successfully.' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Assignment Failed', text2: error.message });
    },
  });

  useEffect(() => {
    if (visible) {
      setIsAdHocMode(false);
      setSelectedLibraryTask(null);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setAdHocUrls([]);
      setAdHocFiles([]);
      setStudentSearchTerm('');
      mutation.reset();
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        setStep(2);
      } else {
        setSelectedStudentId(null);
        setStep(1);
      }
    }
  }, [visible, preselectedStudentId]);

  const handleAddAdHocUrl = () =>
    setAdHocUrls(p => [...p, { id: Date.now().toString(), url: '', label: '' }]);
  const handleUpdateAdHocUrl = (id: string, field: 'url' | 'label', value: string) => {
    setAdHocUrls(p => p.map(u => (u.id === id ? { ...u, [field]: value } : u)));
  };
  const handleRemoveAdHocUrl = (id: string) => setAdHocUrls(p => p.filter(u => u.id !== id));

  const handlePickAdHocFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
    if (!result.canceled) {
      const newFiles: FileInput[] = result.assets.map(asset => ({
        id: `${asset.name}-${asset.size}`,
        asset,
      }));
      setAdHocFiles(prev => [...prev, ...newFiles]);
    }
  };
  const handleRemoveAdHocFile = (id: string) => setAdHocFiles(p => p.filter(f => f.id !== id));

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2);
  };
  const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
    setSelectedLibraryTask(task);
    setIsAdHocMode(false);
    setAdHocFiles([]);
    setAdHocUrls([]);
    setStep(3);
  };
  const handleAdHocSubmit = () => {
    const numericPoints = Number(adHocBasePoints);
    if (!adHocTitle.trim() || isNaN(numericPoints) || numericPoints < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title and valid points are required.',
      });
      return;
    }
    setSelectedLibraryTask(null);
    setIsAdHocMode(true);
    setStep(3);
  };

  const handleConfirm = () => {
    if (!selectedStudentId || !assignerId) return;

    let assignmentPayload: any;

    if (isAdHocMode) {
      assignmentPayload = {
        studentId: selectedStudentId,
        taskTitle: adHocTitle.trim(),
        taskDescription: adHocDescription.trim(),
        taskBasePoints: Number(adHocBasePoints),
        urls: adHocUrls.map(({ url, label }) => ({ url: url.trim(), label: label.trim() })),
        files: adHocFiles.map(f => ({
          _nativeFile: f.asset,
          fileName: f.asset.name,
          mimeType: f.asset.mimeType!,
        })),
      };
    } else if (selectedLibraryTask) {
      assignmentPayload = {
        studentId: selectedStudentId,
        taskLibraryId: selectedLibraryTask.id,
      };
    } else {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'No task selected.' });
      return;
    }
    mutation.mutate(assignmentPayload);
  };

  const goBack = () => {
    if (step === 3) {
      setStep(2);
      setSelectedLibraryTask(null);
    } else if (step === 2 && !preselectedStudentId) {
      setSelectedStudentId(null);
      setStep(1);
    } else {
      onClose();
    }
  };

  const renderStepContent = () => {
    if (step === 1 && !preselectedStudentId) {
      return (
        <>
          <Text style={commonSharedStyles.modalStepTitle}>Step 1: Select Student</Text>
          <TextInput
            style={commonSharedStyles.searchInput}
            placeholder={
              filterTeacherId ? 'Search Your Students...' : 'Search All Active Students...'
            }
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingStudentsList ? (
            <ActivityIndicator color={colors.primary} />
          ) : isErrorStudentsList ? (
            <Text style={commonSharedStyles.errorText}>
              Error loading students: {errorStudentsList?.message}
            </Text>
          ) : (
            <FlatList
              style={commonSharedStyles.modalScrollView}
              data={filteredStudents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={commonSharedStyles.listItem}>
                    <Text style={commonSharedStyles.listItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>
                  {studentSearchTerm ? 'No students match search.' : 'No active students found.'}
                </Text>
              }
            />
          )}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={commonSharedStyles.modalStepTitle}>
            Step {preselectedStudentId ? 1 : 2}: Assign Task to {selectedStudentName}
          </Text>
          <View style={[commonSharedStyles.containerToggle, { marginBottom: 15 }]}>
            <TouchableOpacity
              style={[
                commonSharedStyles.toggleButton,
                !isAdHocMode && commonSharedStyles.toggleButtonActive,
              ]}
              onPress={() => setIsAdHocMode(false)}
              disabled={mutation.isPending}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  !isAdHocMode && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                From Library
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                commonSharedStyles.toggleButton,
                isAdHocMode && commonSharedStyles.toggleButtonActive,
              ]}
              onPress={() => setIsAdHocMode(true)}
              disabled={mutation.isPending}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  isAdHocMode && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                Custom Task
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={[commonSharedStyles.modalScrollView, { paddingHorizontal: 2 }]}>
            {isAdHocMode ? (
              <View>
                <Text style={commonSharedStyles.label}>Custom Task Title:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={adHocTitle}
                  onChangeText={setAdHocTitle}
                  placeholder="e.g., Help setup for recital"
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Custom Task Description:</Text>
                <TextInput
                  style={commonSharedStyles.textArea}
                  value={adHocDescription}
                  onChangeText={setAdHocDescription}
                  placeholder="Describe the task briefly"
                  multiline
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Base Points:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={String(adHocBasePoints)}
                  onChangeText={text =>
                    setAdHocBasePoints(
                      text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0
                    )
                  }
                  keyboardType="numeric"
                  editable={!mutation.isPending}
                />

                <View style={styles.listHeader}>
                  <Text style={commonSharedStyles.label}>Reference URLs</Text>
                  <Button
                    title="+ Add URL"
                    onPress={handleAddAdHocUrl}
                    disabled={mutation.isPending}
                  />
                </View>
                {adHocUrls.map(urlItem => (
                  <View key={urlItem.id} style={styles.urlItemContainer}>
                    <TextInput
                      style={styles.urlInput}
                      value={urlItem.url}
                      onChangeText={text => handleUpdateAdHocUrl(urlItem.id, 'url', text)}
                      placeholder="https://example.com"
                    />
                    <TextInput
                      style={styles.labelInput}
                      value={urlItem.label}
                      onChangeText={text => handleUpdateAdHocUrl(urlItem.id, 'label', text)}
                      placeholder="Optional Label"
                    />
                    <Button
                      title="Remove"
                      onPress={() => handleRemoveAdHocUrl(urlItem.id)}
                      color={colors.danger}
                    />
                  </View>
                ))}

                <View style={styles.listHeader}>
                  <Text style={commonSharedStyles.label}>Attachments</Text>
                  <Button
                    title="+ Attach Files"
                    onPress={handlePickAdHocFiles}
                    disabled={mutation.isPending}
                  />
                </View>
                {adHocFiles.map(fileItem => (
                  <View key={fileItem.id} style={styles.fileItemContainer}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileItem.asset.name}
                    </Text>
                    <Button
                      title="Remove"
                      onPress={() => handleRemoveAdHocFile(fileItem.id)}
                      color={colors.danger}
                    />
                  </View>
                ))}

                <View style={{ marginTop: 15 }}>
                  <Button
                    title="Use This Custom Task"
                    onPress={handleAdHocSubmit}
                    color={colors.primary}
                    disabled={
                      mutation.isPending ||
                      !adHocTitle.trim() ||
                      adHocBasePoints === '' ||
                      adHocBasePoints < 0
                    }
                  />
                </View>
              </View>
            ) : (
              <>
                {(isLoadingLibrary || isLoadingSelectedStudent || isLoadingInstruments) && (
                  <ActivityIndicator />
                )}
                {isErrorLibrary && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading task library: {errorLibrary?.message}
                  </Text>
                )}
                {isErrorSelectedStudent && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading student details: {errorSelectedStudent?.message}
                  </Text>
                )}
                {!isLoadingLibrary &&
                  !isLoadingSelectedStudent &&
                  !isLoadingInstruments &&
                  !isErrorLibrary &&
                  !isErrorSelectedStudent && (
                    <FlatList
                      data={filteredTaskLibraryForStudent}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handleLibraryTaskSelect(item)}>
                          <View style={commonSharedStyles.listItem}>
                            <Text style={commonSharedStyles.itemTitle}>
                              {item.title} ({item.baseTickets} pts)
                            </Text>
                            {item.instrumentIds && item.instrumentIds.length > 0 && (
                              <Text style={commonSharedStyles.baseLightText}>
                                (Instruments: {getInstrumentNames(item.instrumentIds, instruments)})
                              </Text>
                            )}
                            <Text style={commonSharedStyles.baseSecondaryText}>
                              {item.description || '(No description)'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <Text style={commonSharedStyles.baseEmptyText}>
                          {taskLibrary.length === 0
                            ? 'Task library is empty.'
                            : "No assignable tasks found for this student's instrument(s)."}
                        </Text>
                      }
                    />
                  )}
              </>
            )}
          </ScrollView>
        </>
      );
    }

    if (step === 3) {
      const taskTitle = isAdHocMode ? adHocTitle : selectedLibraryTask?.title;
      const taskPoints = isAdHocMode ? adHocBasePoints : selectedLibraryTask?.baseTickets;
      const taskUrls = isAdHocMode ? adHocUrls : selectedLibraryTask?.urls;
      const taskAttachments = isAdHocMode
        ? adHocFiles.map(f => f.asset)
        : selectedLibraryTask?.attachments;

      return (
        <>
          <Text style={commonSharedStyles.modalStepTitle}>
            Step {preselectedStudentId ? 2 : 3}: Confirm Assignment
          </Text>
          <Text style={commonSharedStyles.confirmationText}>
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "
            {selectedStudentName}"?
          </Text>
          {taskUrls && taskUrls.length > 0 && (
            <Text style={commonSharedStyles.baseLightText}>URLs: {taskUrls.length}</Text>
          )}
          {taskAttachments && taskAttachments.length > 0 && (
            <Text style={commonSharedStyles.baseLightText}>
              Attachments: {taskAttachments.length}
            </Text>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Assign Task</Text>
          {renderStepContent()}
          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Assigning Task...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
              Error: {mutation.error.message}
            </Text>
          )}
          <View style={commonSharedStyles.modalFooter}>
            {step === 3 && (
              <Button
                title={mutation.isPending ? 'Assigning...' : 'Confirm & Assign'}
                onPress={handleConfirm}
                color={colors.primary}
                disabled={mutation.isPending}
              />
            )}
            {((step > 1 && !preselectedStudentId) || step === 3) && (
              <Button
                title="Back"
                onPress={goBack}
                color={colors.secondary}
                disabled={mutation.isPending}
              />
            )}
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
  urlInput: {
    ...commonSharedStyles.input,
    marginBottom: 5,
  },
  labelInput: {
    ...commonSharedStyles.input,
    marginBottom: 5,
    fontSize: 14,
    minHeight: 35,
  },
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
  fileName: {
    flex: 1,
    marginRight: 10,
    color: colors.textSecondary,
  },
});

export default AssignTaskModal;
