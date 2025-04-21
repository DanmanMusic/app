import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { StudentView } from './StudentView';
import { appSharedStyles } from '../styles/appSharedStyles';
import { SimplifiedStudent } from '../types/dataTypes';

interface ParentViewProps {}

export const ParentView: React.FC<ParentViewProps> = () => {
  const { currentUserId, currentViewingStudentId, setMockAuthState } = useAuth();
  const {
    currentMockUsers,
    ticketBalances,
    mockInstruments,
  } = useData();

  const parentUser = currentUserId ? currentMockUsers[currentUserId] : null;

  const linkedStudents = useMemo(() => {
      if (!parentUser || !parentUser.linkedStudentIds) return [];
      const mappedStudents = parentUser.linkedStudentIds.map(studentId => {
          const student = currentMockUsers[studentId];
          if (student && student.role === 'student') {
              return {
                  id: student.id,
                  name: getUserDisplayName(student),
                  instrumentIds: student.instrumentIds,
                  balance: ticketBalances[student.id] || 0,
              };
          }
          return null;
      }).filter((s): s is SimplifiedStudent => s !== null)
      return mappedStudents.sort((a, b) => a.name.localeCompare(b.name));
    }, [parentUser, currentMockUsers, ticketBalances]
  );

  const handleGoBackToStudents = () => {
    setMockAuthState(prev => (prev ? { ...prev, viewingStudentId: undefined } : null));
  };

  const handleSetViewingStudent = (studentId: string) => {
    setMockAuthState(prev => (prev ? { ...prev, viewingStudentId: studentId } : null));
  }

  if (!parentUser || parentUser.role !== 'parent') {
      return ( <SafeAreaView style={appSharedStyles.safeArea}><View style={appSharedStyles.container}><Text>Error: Could not load parent data.</Text></View></SafeAreaView> );
  }

  if (currentViewingStudentId) {
    
    const studentUserForHeader = currentMockUsers[currentViewingStudentId];
    const studentDisplayName = studentUserForHeader ? getUserDisplayName(studentUserForHeader) : "Student Profile";

    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.headerContainer}>
          <Button title="← Back to Students" onPress={handleGoBackToStudents} />
          <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail"> {studentDisplayName}'s Profile </Text>
          <View style={{ width: 50 }} />
        </View>

        {}
        <StudentView studentIdToView={currentViewingStudentId} />

      </SafeAreaView>
    );
  } else {
    
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
          <View style={appSharedStyles.headerContainer}>
            <View style={{ width: 50 }} />
            <Text style={appSharedStyles.header}>Students</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={appSharedStyles.container}>
            <Text style={appSharedStyles.sectionTitle}>Students</Text>
            {linkedStudents.length > 0 ? (
              linkedStudents.map(student => {
                  if (!student) { return null; } 
                  return (
                      <View key={student.id} style={appSharedStyles.itemContainer}>
                          <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
                          <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)} </Text>
                          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> Balance: {student.balance} Tickets </Text>
                          <View style={styles.studentActions}>
                              <Button title={`View ${student.name}'s Profile`} onPress={() => handleSetViewingStudent(student.id)} />
                          </View>
                      </View>
                  );
              })
            ) : ( <Text style={appSharedStyles.emptyListText}> No students linked yet. Ask the school admin to link your child. </Text> )}
            <View style={{ marginTop: 30, alignItems: 'flex-start' }}>
              <Button title="Add Another Student (Mock QR Scan)" onPress={() => alert('Simulate QR scan to add student')} />
            </View>
          </ScrollView>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  studentActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, gap: 5, },
});