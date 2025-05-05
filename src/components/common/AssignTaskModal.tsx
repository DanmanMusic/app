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
  Platform,
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
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';

interface NativeFileObject {
  uri: string;
  name?: string;
  mimeType?: string;
  type?: string;
  size?: number;
  [key: string]: any;
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
  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');
  const [adHocReferenceUrl, setAdHocReferenceUrl] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [adHocPickedDocument, setAdHocPickedDocument] =
    useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [adHocFileError, setAdHocFileError] = useState<string | null>(null);

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

  const sortedTasks = useMemo(
    () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [taskLibrary]
  );
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
      taskLibrary.length === 0
    ) {
      return sortedTasks;
    }
    const studentInstruments = selectedStudentProfile.instrumentIds;
    return sortedTasks.filter(task => {
      const taskInstruments = task.instrumentIds || [];
      if (taskInstruments.length === 0) return true;
      return taskInstruments.some(taskInstId => studentInstruments.includes(taskInstId));
    });
  }, [sortedTasks, selectedStudentProfile, isLoadingSelectedStudent, taskLibrary.length]);

  const mutation = useMutation({
    mutationFn: (
      payload: Omit<
        AssignedTask,
        | 'id'
        | 'assignedById'
        | 'assignedDate'
        | 'isComplete'
        | 'verificationStatus'
        | 'studentStatus'
        | 'assignerName'
        | 'verifierName'
      > & { file?: NativeFileObject | File }
    ) => createAssignedTask(payload),
    onSuccess: createdAssignment => {
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Task assigned successfully.',
        position: 'bottom',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Assignment Failed',
        text2: error.message || 'Could not assign task.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setIsAdHocMode(false);
      setSelectedLibraryTask(null);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setAdHocReferenceUrl('');
      setStudentSearchTerm('');
      setAdHocPickedDocument(null);
      setAdHocFileError(null);
      mutation.reset();
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        setStep(2);
      } else {
        setSelectedStudentId(null);
        setStep(1);
      }
    } else {
      setStep(1);
      setSelectedStudentId(null);
      setSelectedLibraryTask(null);
      setIsAdHocMode(false);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setAdHocReferenceUrl('');
      setStudentSearchTerm('');
      setAdHocPickedDocument(null);
      setAdHocFileError(null);
    }
  }, [visible, preselectedStudentId]);

  const pickAdHocDocument = async () => {
    setAdHocFileError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      setAdHocPickedDocument(result.canceled ? null : result);
      if (!result.canceled && (!result.assets || result.assets.length === 0)) {
        setAdHocFileError('Failed to access selected file.');
      }
    } catch (error) {
      console.error('Error picking ad-hoc document:', error);
      setAdHocFileError('Failed to pick document.');
      setAdHocPickedDocument(null);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2);
  };
  const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
    setSelectedLibraryTask(task);
    setIsAdHocMode(false);
    setAdHocPickedDocument(null);
    setAdHocFileError(null);
    setStep(3);
  };
  const handleAdHocSubmit = () => {
    const numericPoints =
      typeof adHocBasePoints === 'number'
        ? adHocBasePoints
        : parseInt(String(adHocBasePoints || '-1'), 10);
    const url = adHocReferenceUrl.trim();
    if (!adHocTitle.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Custom title required.',
        position: 'bottom',
      });
      return;
    }
    if (isNaN(numericPoints) || numericPoints < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Valid points required.',
        position: 'bottom',
      });
      return;
    }
    if (url && !url.toLowerCase().startsWith('http')) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'URL must start with http/https.',
        position: 'bottom',
      });
      return;
    }
    if (
      adHocPickedDocument &&
      !adHocPickedDocument.canceled &&
      (!adHocPickedDocument.assets || adHocPickedDocument.assets.length === 0)
    ) {
      Toast.show({
        type: 'error',
        text1: 'File Error',
        text2: adHocFileError || 'Selected file is invalid or inaccessible.',
        position: 'bottom',
      });
      return;
    }

    setSelectedLibraryTask(null);
    setIsAdHocMode(true);
    setStep(3);
  };
  const handleConfirm = () => {
    if (!selectedStudentId || !assignerId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Student or Assigner ID missing.',
        position: 'bottom',
      });
      return;
    }

    let assignmentPayload: Omit<
      AssignedTask,
      | 'id'
      | 'assignedById'
      | 'assignedDate'
      | 'isComplete'
      | 'verificationStatus'
      | 'studentStatus'
      | 'assignerName'
      | 'verifierName'
    > & { file?: NativeFileObject | File };

    if (isAdHocMode) {
      const numericPoints =
        typeof adHocBasePoints === 'number'
          ? adHocBasePoints
          : parseInt(String(adHocBasePoints || '-1'), 10);
      const url = adHocReferenceUrl.trim();
      if (!adHocTitle.trim() || isNaN(numericPoints) || numericPoints < 0) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Invalid custom task details.',
          position: 'bottom',
        });
        return;
      }
      if (url && !url.toLowerCase().startsWith('http')) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Invalid custom URL.',
          position: 'bottom',
        });
        return;
      }

      let fileToUpload: NativeFileObject | File | undefined = undefined;
      if (
        adHocPickedDocument &&
        !adHocPickedDocument.canceled &&
        adHocPickedDocument.assets &&
        adHocPickedDocument.assets.length > 0
      ) {
        fileToUpload = adHocPickedDocument.assets[0];
        if (!fileToUpload?.uri || !fileToUpload?.name || !fileToUpload?.mimeType) {
          Toast.show({
            type: 'error',
            text1: 'File Error',
            text2: 'Selected file is missing required information.',
            position: 'bottom',
          });
          return;
        }
      }

      assignmentPayload = {
        studentId: selectedStudentId,
        taskTitle: adHocTitle.trim(),
        taskDescription: adHocDescription.trim(),
        taskBasePoints: numericPoints,
        taskLinkUrl: url || null,
        taskAttachmentPath: null,
        ...(fileToUpload && { file: fileToUpload }),
      };
    } else if (selectedLibraryTask) {
      assignmentPayload = {
        studentId: selectedStudentId,
        taskTitle: selectedLibraryTask.title,
        taskDescription: selectedLibraryTask.description || '',
        taskBasePoints: selectedLibraryTask.baseTickets,
        taskLinkUrl: selectedLibraryTask.referenceUrl || null,
        taskAttachmentPath: selectedLibraryTask.attachmentPath || null,
      };
    } else {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'No task selected or defined.',
        position: 'bottom',
      });
      return;
    }
    mutation.mutate(assignmentPayload);
  };

  const goBack = () => {
    if (step === 3) {
      setStep(2);
      if (isAdHocMode) {
      } else {
        setSelectedLibraryTask(null);
      }
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
          {isLoadingStudentsList && <ActivityIndicator color={colors.primary} />}
          {isErrorStudentsList && (
            <Text style={commonSharedStyles.errorText}>
              Error loading students: {errorStudentsList?.message}
            </Text>
          )}
          {!isLoadingStudentsList && !isErrorStudentsList && (
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
              onPress={() => {
                setIsAdHocMode(false);
                setAdHocPickedDocument(null);
                setAdHocFileError(null);
              }}
              disabled={mutation.isPending}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  !isAdHocMode && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                Select from Library
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                commonSharedStyles.toggleButton,
                isAdHocMode && commonSharedStyles.toggleButtonActive,
              ]}
              onPress={() => {
                setIsAdHocMode(true);
                setSelectedLibraryTask(null);
              }}
              disabled={mutation.isPending}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  isAdHocMode && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                Create Custom Task
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
                  placeholderTextColor={colors.textLight}
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Custom Task Description:</Text>
                <TextInput
                  style={commonSharedStyles.textArea}
                  value={adHocDescription}
                  onChangeText={setAdHocDescription}
                  placeholder="Describe the task briefly"
                  placeholderTextColor={colors.textLight}
                  multiline={true}
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
                  placeholder="e.g., 50"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Reference URL (Optional):</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={adHocReferenceUrl}
                  onChangeText={setAdHocReferenceUrl}
                  placeholder="https://example.com/resource"
                  placeholderTextColor={colors.textLight}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Attachment (Optional):</Text>
                <View
                  style={[
                    commonSharedStyles.baseRow,
                    { alignItems: 'center', marginBottom: 5, gap: 10 },
                  ]}
                >
                  <Button
                    title={
                      adHocPickedDocument && !adHocPickedDocument.canceled
                        ? 'Change File'
                        : 'Attach File'
                    }
                    onPress={pickAdHocDocument}
                    disabled={mutation.isPending}
                    color={colors.info}
                  />
                  {adHocPickedDocument &&
                    !adHocPickedDocument.canceled &&
                    adHocPickedDocument.assets && (
                      <Text
                        style={commonSharedStyles.baseSecondaryText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Selected: {adHocPickedDocument.assets[0].name}
                      </Text>
                    )}
                </View>
                {adHocFileError && (
                  <Text style={[commonSharedStyles.errorText, { marginBottom: 15 }]}>
                    {adHocFileError}
                  </Text>
                )}
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
                            : "No relevant tasks found for this student's instrument(s)."}
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
      const taskUrl = isAdHocMode ? adHocReferenceUrl : selectedLibraryTask?.referenceUrl;
      const taskAttachmentName = isAdHocMode
        ? adHocPickedDocument && !adHocPickedDocument.canceled && adHocPickedDocument.assets
          ? adHocPickedDocument.assets[0].name
          : null
        : selectedLibraryTask?.attachmentPath
          ? selectedLibraryTask.attachmentPath.split('/').pop()
          : null;

      return (
        <>
          <Text style={commonSharedStyles.modalStepTitle}>
            Step {preselectedStudentId ? 2 : 3}: Confirm Assignment
          </Text>
          <Text style={commonSharedStyles.confirmationText}>
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "
            {selectedStudentName}"?
          </Text>
          {taskUrl && <Text style={commonSharedStyles.baseLightText}>Link: {taskUrl}</Text>}
          {taskAttachmentName && (
            <Text style={commonSharedStyles.baseLightText}>Attachment: {taskAttachmentName}</Text>
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
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to assign task'}
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
            {((step > 1 && !preselectedStudentId) ||
              step === 3 ||
              (step === 2 && preselectedStudentId)) && (
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

export default AssignTaskModal;
