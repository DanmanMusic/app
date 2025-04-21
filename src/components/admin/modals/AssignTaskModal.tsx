
import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, FlatList, TouchableOpacity } from 'react-native';
import { TaskLibraryItem } from '../../../mocks/mockTaskLibrary';
import { SimplifiedStudent } from '../../../types/dataTypes'; 
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';

const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:10, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:15, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxHeight:'90%' },
    scrollView:{ width:'100%', marginBottom: 15, maxHeight: '70%' }, 
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:15, textAlign:'center', color:colors.textPrimary, width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10 },
    stepTitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 10, color: colors.textSecondary },
    listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
    selectedListItem: { backgroundColor: colors.backgroundHighlight },
    listItemText: { fontSize: 15, color: colors.textPrimary },
    taskItemText: { fontSize: 14, color: colors.textPrimary },
    taskDescription: { fontSize: 12, color: colors.textLight, marginTop: 3 },
    confirmationText: { fontSize: 16, marginVertical: 15, textAlign: 'center', lineHeight: 22 },
    buttonContainer:{ flexDirection:'row', justifyContent: 'space-around', width:'100%', marginTop:15, borderTopWidth: 1, borderTopColor: colors.borderPrimary, paddingTop: 15 },
    footerButton:{ width:'100%', marginTop:10 }, 
});

interface AssignTaskModalProps {
  visible: boolean;
  onClose: () => void;  
  allStudents: SimplifiedStudent[];
  taskLibrary: TaskLibraryItem[];
  onAssignTask: (taskId: string, studentId: string) => void;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  visible,
  onClose,
  allStudents,
  taskLibrary,
  onAssignTask,
}) => {
  const [step, setStep] = useState(1); 
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const sortedStudents = useMemo(() => [...allStudents].sort((a, b) => a.name.localeCompare(b.name)), [allStudents]);
  const sortedTasks = useMemo(() => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)), [taskLibrary]);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setSelectedStudentId(null);
      setSelectedTaskId(null);
    }
  }, [visible]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2);
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setStep(3);
  };

  const handleConfirm = () => {
    if (selectedTaskId && selectedStudentId) {
      onAssignTask(selectedTaskId, selectedStudentId);
      onClose(); 
    } else {
      alert('Error: Student or Task not selected.'); 
    }
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: 
        return (
          <>
            <Text style={modalStyles.stepTitle}>Step 1: Select Student</Text>
            <FlatList
              style={modalStyles.scrollView}
              data={sortedStudents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={modalStyles.listItem}>
                    <Text style={modalStyles.listItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>No students found.</Text>}
            />
          </>
        );
      case 2: 
        return (
           <>
            <Text style={modalStyles.stepTitle}>Step 2: Select Task from Library</Text>
             <FlatList
               style={modalStyles.scrollView}
               data={sortedTasks}
               keyExtractor={item => item.id}
               renderItem={({ item }) => (
                 <TouchableOpacity onPress={() => handleTaskSelect(item.id)}>
                   <View style={modalStyles.listItem}>
                     <Text style={modalStyles.taskItemText}>{item.title} ({item.baseTickets} pts)</Text>
                     <Text style={modalStyles.taskDescription}>{item.description}</Text>
                   </View>
                 </TouchableOpacity>
               )}
               ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>}
             />
          </>
        );
      case 3: 
        const student = allStudents.find(s => s.id === selectedStudentId);
        const task = taskLibrary.find(t => t.id === selectedTaskId);
        return (
           <>
            <Text style={modalStyles.stepTitle}>Step 3: Confirm Assignment</Text>
            <Text style={modalStyles.confirmationText}>
                Assign task "{task?.title || 'Unknown Task'}"
                to student "{student?.name || 'Unknown Student'}"?
            </Text>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Assign Task</Text>
          {renderStepContent()}
          <View style={modalStyles.buttonContainer}>
            {step > 1 && <Button title="Back" onPress={goBack} color={colors.secondary} />}
            {step === 3 && <Button title="Confirm & Assign" onPress={handleConfirm} />}
            {}
            {step === 1 && <Button title="Cancel" onPress={onClose} color={colors.secondary} />}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AssignTaskModal;