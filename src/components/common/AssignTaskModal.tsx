// src/components/common/AssignTaskModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Button,
    FlatList,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
} from 'react-native';

// Mocks & Types
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { SimplifiedStudent } from '../../types/dataTypes';

// Styles & Utils
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';

// Updated modal styles
const modalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
    modalView: { margin: 10, backgroundColor: colors.backgroundPrimary, borderRadius: 10, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxHeight: '90%', },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.textPrimary, width: '100%', borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, paddingBottom: 10, },
    stepTitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 10, color: colors.textSecondary, alignSelf: 'flex-start', width: '100%', },
    contentScrollView: { width: '100%', maxHeight: '65%', marginBottom: 15, },
    searchInput: { width: '100%', borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 10, },
    listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
    listItemText: { fontSize: 15, color: colors.textPrimary },
    taskItemText: { fontSize: 14, color: colors.textPrimary },
    taskDescription: { fontSize: 12, color: colors.textLight, marginTop: 3 },
    modeSwitchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 15, paddingHorizontal: 5, },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: colors.textPrimary, },
    input: { width: '100%', borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 10, },
    textArea: { minHeight: 80, textAlignVertical: 'top', },
    confirmationText: { fontSize: 16, marginVertical: 15, textAlign: 'center', lineHeight: 22 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 15, borderTopWidth: 1, borderTopColor: colors.borderPrimary, paddingTop: 15, gap: 10, },
    footerButton: { width: '100%', marginTop: 0, marginBottom: 10, },
});

interface AssignTaskModalProps {
    visible: boolean;
    onClose: () => void;
    allStudents: SimplifiedStudent[];
    taskLibrary: TaskLibraryItem[];
    onAssignTask: ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number ) => void;
    preselectedStudentId?: string | null;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
    visible,
    onClose,
    allStudents,
    taskLibrary,
    onAssignTask,
    preselectedStudentId,
}) => {
    // State for steps and selections
    const [step, setStep] = useState(1);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
    const [isAdHocMode, setIsAdHocMode] = useState(false);
    const [adHocTitle, setAdHocTitle] = useState('');
    const [adHocDescription, setAdHocDescription] = useState('');
    const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');

    // State for student search
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Memoize the sorted task library
    const sortedTasks = useMemo( () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)), [taskLibrary] );

    // Filter students based on search term
    const filteredStudents = useMemo(() => {
        const searchTermLower = studentSearchTerm.toLowerCase().trim();
        if (!searchTermLower) {
            return [...allStudents].sort((a, b) => a.name.localeCompare(b.name));
        }
        return allStudents
            .filter(student => student.name.toLowerCase().includes(searchTermLower))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allStudents, studentSearchTerm]);


    // Reset state effect
    useEffect(() => {
        if (visible) {
            setIsAdHocMode(false);
            setAdHocTitle('');
            setAdHocDescription('');
            setAdHocBasePoints('');
            setSelectedLibraryTask(null);
            setStudentSearchTerm('');

            if (preselectedStudentId) {
                setStep(2);
                setSelectedStudentId(preselectedStudentId);
            } else {
                setStep(1);
                setSelectedStudentId(null);
            }
        } else {
            setStep(1);
            setSelectedStudentId(null);
            setSelectedLibraryTask(null);
            setIsAdHocMode(false);
            setAdHocTitle('');
            setAdHocDescription('');
            setAdHocBasePoints('');
            setStudentSearchTerm('');
        }
    }, [visible, preselectedStudentId]);

    // Handlers
    const handleStudentSelect = (studentId: string) => {
        setSelectedStudentId(studentId);
        setStep(2);
    };

    const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
        setSelectedLibraryTask(task);
        setStep(3);
    };

    const handleAdHocSubmit = () => {
        const numericPoints = typeof adHocBasePoints === 'number' ? adHocBasePoints : parseInt(String(adHocBasePoints || '0'), 10);
        if (!adHocTitle.trim() || !adHocDescription.trim() || isNaN(numericPoints) || numericPoints < 0) {
            alert('Please fill in a valid Title, Description, and non-negative Base Points for the custom task.');
            return;
        }
        setSelectedLibraryTask(null);
        setStep(3);
    };

    const handleConfirm = () => {
        if (!selectedStudentId) {
            alert('Error: Student not selected.');
            return;
        }
        let title = '';
        let description = '';
        let basePoints = 0;
        if (isAdHocMode) {
            const numericPoints = typeof adHocBasePoints === 'number' ? adHocBasePoints : parseInt(String(adHocBasePoints || '0'), 10);
            if (!adHocTitle.trim() || !adHocDescription.trim() || isNaN(numericPoints) || numericPoints < 0) {
                 alert('Error: Invalid custom task details.');
                 return;
            }
            title = adHocTitle.trim();
            description = adHocDescription.trim();
            basePoints = numericPoints;
        } else if (selectedLibraryTask) {
            title = selectedLibraryTask.title;
            description = selectedLibraryTask.description;
            basePoints = selectedLibraryTask.baseTickets;
        } else {
            alert('Error: No task selected or created.');
            return;
        }
        onAssignTask(selectedStudentId, title, description, basePoints);
        onClose();
    };

    const goBack = () => {
        if (step === 3) {
            setStep(2);
        } else if (step === 2 && !preselectedStudentId) {
            setStep(1);
        } else {
             onClose();
        }
    };


    const renderStepContent = () => {
        // Step 1: Select Student
        if (step === 1 && !preselectedStudentId) {
            return (
                <>
                    <Text style={modalStyles.stepTitle}>Step 1: Select Student</Text>
                    <TextInput
                        style={modalStyles.searchInput}
                        placeholder="Search Students..."
                        placeholderTextColor={colors.textLight}
                        value={studentSearchTerm}
                        onChangeText={setStudentSearchTerm}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <FlatList
                        style={modalStyles.contentScrollView}
                        data={filteredStudents}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                                <View style={modalStyles.listItem}>
                                    <Text style={modalStyles.listItemText}>{item.name}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={appSharedStyles.emptyListText}>
                                {studentSearchTerm ? 'No students match search.' : 'No active students found.'}
                            </Text>
                        }
                    />
                </>
            );
        }

        // Step 2: Select Task from Library OR Create Ad-Hoc Task
        if (step === 2) {
             const student = allStudents.find(s => s.id === selectedStudentId);
             return (
                <>
                    <Text style={modalStyles.stepTitle}>
                        Step {preselectedStudentId ? 1 : 2}: Assign Task to {student?.name || 'Selected Student'}
                    </Text>
                     <View style={modalStyles.modeSwitchContainer}>
                        <Text style={modalStyles.label}>Select from Library</Text>
                        <Switch
                            trackColor={{ false: colors.secondary, true: colors.primary }}
                            thumbColor={colors.backgroundPrimary}
                            ios_backgroundColor={colors.secondary}
                            onValueChange={setIsAdHocMode}
                            value={isAdHocMode}
                        />
                        <Text style={modalStyles.label}>Create Custom Task</Text>
                    </View>

                    <ScrollView style={modalStyles.contentScrollView}>
                        {isAdHocMode ? (
                            <View>
                                <Text style={modalStyles.label}>Custom Task Title:</Text>
                                <TextInput
                                    style={modalStyles.input}
                                    value={adHocTitle}
                                    onChangeText={setAdHocTitle}
                                    placeholder="e.g., Help setup for recital"
                                    placeholderTextColor={colors.textLight}
                                />
                                <Text style={modalStyles.label}>Custom Task Description:</Text>
                                <TextInput
                                    style={[modalStyles.input, modalStyles.textArea]}
                                    value={adHocDescription}
                                    onChangeText={setAdHocDescription}
                                    placeholder="Describe the task briefly"
                                    placeholderTextColor={colors.textLight}
                                    multiline={true}
                                />
                                <Text style={modalStyles.label}>Base Points:</Text>
                                <TextInput
                                    style={modalStyles.input}
                                    value={String(adHocBasePoints)}
                                     onChangeText={text =>
                                        setAdHocBasePoints(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)
                                    }
                                    placeholder="e.g., 50"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="numeric"
                                />
                                <Button title="Use This Custom Task" onPress={handleAdHocSubmit} />
                            </View>
                        ) : (
                            <FlatList
                                data={sortedTasks}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity onPress={() => handleLibraryTaskSelect(item)}>
                                        <View style={modalStyles.listItem}>
                                            <Text style={modalStyles.taskItemText}>
                                                {item.title} ({item.baseTickets} pts)
                                            </Text>
                                            <Text style={modalStyles.taskDescription}>{item.description}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
                                }
                            />
                        )}
                    </ScrollView>
                </>
            );
        }

        // Step 3: Confirmation
        if (step === 3) {
            const student = allStudents.find(s => s.id === selectedStudentId);
            const taskTitle = isAdHocMode ? adHocTitle : selectedLibraryTask?.title;
            const taskPoints = isAdHocMode ? adHocBasePoints : selectedLibraryTask?.baseTickets;
            return (
                <>
                    <Text style={modalStyles.stepTitle}>
                         Step {preselectedStudentId ? 2 : 3}: Confirm Assignment
                    </Text>
                    <Text style={modalStyles.confirmationText}>
                        Assign task "{taskTitle || 'Unknown Task'}" ({taskPoints ?? '?'} points)
                        to student "{student?.name || 'Unknown Student'}"?
                    </Text>
                </>
            );
        }
        return null;
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={modalStyles.centeredView}>
                <View style={modalStyles.modalView}>
                    <Text style={modalStyles.modalTitle}>Assign Task</Text>
                    {renderStepContent()}
                    {step === 3 && (
                         <View style={modalStyles.footerButton}>
                            <Button
                                title="Confirm & Assign"
                                onPress={handleConfirm}
                                disabled={!selectedStudentId || (!selectedLibraryTask && !isAdHocMode)}
                            />
                        </View>
                    )}
                    <View style={modalStyles.buttonContainer}>
                        {(step > 1 && !preselectedStudentId) || (step === 3) || (step === 2 && preselectedStudentId) ? (
                            <Button title="Back" onPress={goBack} color={colors.secondary} />
                        ) : <View/> }
                        <Button title="Cancel" onPress={onClose} color={colors.secondary} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default AssignTaskModal;