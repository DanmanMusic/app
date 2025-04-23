
import React, { useState, useMemo, useEffect } from 'react'; 
import { View, Text, StyleSheet, Button, FlatList } from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';


import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { StudentView } from './StudentView'; 


import { User } from '../types/userTypes';


import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


interface ParentStudentListItemProps {
  student: User; 
  onSelectStudent: (studentId: string) => void;
}

const ParentStudentListItem: React.FC<ParentStudentListItemProps> = ({
  student,
  onSelectStudent,
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        {
          fontWeight: 'bold',
          color: student.status === 'active' ? colors.success : colors.secondary,
        },
      ]}
    >
      Status: {student.status}
    </Text>
    <Button title="View Dashboard" onPress={() => onSelectStudent(student.id)} />
  </View>
);

export const ParentView: React.FC = () => {
  const { currentUserId } = useAuth();
  const { currentMockUsers } = useData();

  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const parentUser = currentUserId ? currentMockUsers[currentUserId] : null;

  
  const linkedStudents = useMemo(() => {
    if (!parentUser || !parentUser.linkedStudentIds) return [];
    return parentUser.linkedStudentIds
      .map(studentId => currentMockUsers[studentId])
      .filter((student): student is User => !!student && student.role === 'student'); 
  }, [parentUser, currentMockUsers]);

  
  const hasMultipleStudents = linkedStudents.length > 1;

  
  useEffect(() => {
    if (!viewingStudentId && linkedStudents.length === 1) {
      console.log('[ParentView] Auto-selecting single student:', linkedStudents[0].id);
      setViewingStudentId(linkedStudents[0].id);
    }
    
    if (viewingStudentId && !linkedStudents.some(s => s.id === viewingStudentId)) {
      console.log('[ParentView] Viewed student no longer linked, resetting view.');
      setViewingStudentId(null);
    }
  }, [linkedStudents, viewingStudentId]);

  if (!parentUser || parentUser.role !== 'parent') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text>Error: Parent data not found or invalid role.</Text>
        </View>
      </SafeAreaView>
    );
  }

  
  if (viewingStudentId) {
    const studentToView = currentMockUsers[viewingStudentId];
    
    if (
      !studentToView ||
      studentToView.role !== 'student' ||
      !parentUser.linkedStudentIds?.includes(viewingStudentId)
    ) {
      return (
        <SafeAreaView style={appSharedStyles.safeArea}>
          <View style={appSharedStyles.container}>
            <Text style={appSharedStyles.errorText}>
              Error: Could not load selected student data or student is no longer linked.
            </Text>
            <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        {}
        <View style={styles.parentHeader}>
          <Text style={styles.parentHeaderText}>Viewing: {getUserDisplayName(studentToView)}</Text>
          {}
          {hasMultipleStudents && (
            <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
          )}
        </View>
        {}
        <StudentView studentIdToView={viewingStudentId} />
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.header}>Parent Dashboard</Text>
        <Text style={appSharedStyles.sectionTitle}>Your Students</Text>
        {linkedStudents.length > 0 ? (
          <FlatList
            data={linkedStudents.sort((a, b) =>
              getUserDisplayName(a).localeCompare(getUserDisplayName(b))
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ParentStudentListItem student={item} onSelectStudent={setViewingStudentId} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No students linked to your account.</Text>
        )}
        <View style={{ marginTop: 20 }}>
          <Button
            title="Link Another Student (Mock QR)"
            onPress={() => alert('Simulate scanning QR code...')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  parentHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});
