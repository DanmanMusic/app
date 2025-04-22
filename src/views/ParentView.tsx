// src/views/ParentView.tsx
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { View, Text, StyleSheet, Button, FlatList } from 'react-native'; // Removed ScrollView? Check usage.
import { SafeAreaView } from 'react-native-safe-area-context';

// Contexts & Components
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { StudentView } from './StudentView'; // Assuming StudentView handles its own imports

// Types
import { User } from '../types/userTypes';

// Utils & Styles
import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// Interface for StudentListItem in Parent context
interface ParentStudentListItemProps {
  student: User; // Pass full student User object
  onSelectStudent: (studentId: string) => void;
}

const ParentStudentListItem: React.FC<ParentStudentListItemProps> = ({ student, onSelectStudent }) => (
    <View style={appSharedStyles.itemContainer}>
        <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
        <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold', color: student.status === 'active' ? colors.success : colors.secondary }]}>
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

  // Memoize linked students
  const linkedStudents = useMemo(() => {
    if (!parentUser || !parentUser.linkedStudentIds) return [];
    return parentUser.linkedStudentIds
      .map(studentId => currentMockUsers[studentId])
      .filter((student): student is User => !!student && student.role === 'student'); // Ensure they are students
  }, [parentUser, currentMockUsers]);

  // Check if multiple students are linked
  const hasMultipleStudents = linkedStudents.length > 1;

  // Automatically select the student if only one is linked and none is selected yet
  useEffect(() => {
    if (!viewingStudentId && linkedStudents.length === 1) {
      console.log("[ParentView] Auto-selecting single student:", linkedStudents[0].id);
      setViewingStudentId(linkedStudents[0].id);
    }
     // If the currently viewed student becomes unlinked or invalid, reset view
     if (viewingStudentId && !linkedStudents.some(s => s.id === viewingStudentId)) {
         console.log("[ParentView] Viewed student no longer linked, resetting view.");
         setViewingStudentId(null);
     }

  }, [linkedStudents, viewingStudentId]);


  if (!parentUser || parentUser.role !== 'parent') {
    return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text>Error: Parent data not found or invalid role.</Text></View></SafeAreaView> );
  }

  // If viewing a specific student, render StudentView
  if (viewingStudentId) {
    const studentToView = currentMockUsers[viewingStudentId];
    // Additional check to ensure the student is still valid and linked
    if (!studentToView || studentToView.role !== 'student' || !parentUser.linkedStudentIds?.includes(viewingStudentId)) {
        return (
            <SafeAreaView style={appSharedStyles.safeArea}>
                <View style={appSharedStyles.container}>
                    <Text style={appSharedStyles.errorText}>Error: Could not load selected student data or student is no longer linked.</Text>
                    <Button title="Back to Students" onPress={() => setViewingStudentId(null)}/>
                </View>
            </SafeAreaView>
        );
    }

    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
         {/* Header with conditional back button */}
        <View style={styles.parentHeader}>
           <Text style={styles.parentHeaderText}>Viewing: {getUserDisplayName(studentToView)}</Text>
           {/* Only show Back button if there are multiple students to go back TO */}
           {hasMultipleStudents && (
                <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
           )}
        </View>
        {/* StudentView handles its own scrolling and content */}
        <StudentView studentIdToView={viewingStudentId} />
      </SafeAreaView>
    );
  }

  // Otherwise, show the student selection list
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.header}>Parent Dashboard</Text>
        <Text style={appSharedStyles.sectionTitle}>Your Students</Text>
        {linkedStudents.length > 0 ? (
          <FlatList
            data={linkedStudents.sort((a,b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ParentStudentListItem student={item} onSelectStudent={setViewingStudentId} />
            )}
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No students linked to your account.</Text>
        )}
        <View style={{ marginTop: 20 }}>
          <Button title="Link Another Student (Mock QR)" onPress={() => alert('Simulate scanning QR code...')} />
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