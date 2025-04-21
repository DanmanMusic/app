
import React from 'react'; 
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { User } from '../types/userTypes';
import { Instrument } from '../mocks/mockInstruments';


import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';


import { StudentView, StudentViewProps } from './StudentView';


import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';




interface SimplifiedStudent {
  id: string;
  name: string; 
  instrumentIds?: string[];
  balance: number;
}



interface ParentViewingStudentData extends StudentViewProps {}


interface ParentViewProps {
  user: User; 
  linkedStudents: SimplifiedStudent[]; 
  currentViewingStudentId?: string;
  currentViewingStudentData?: ParentViewingStudentData; 
  setViewingStudentId: (studentId: string) => void;
  
  onMarkTaskComplete: (taskId: string) => void;
  mockInstruments: Instrument[];
}

export const ParentView: React.FC<ParentViewProps> = ({
  user, 
  linkedStudents, 
  currentViewingStudentId,
  currentViewingStudentData, 
  setViewingStudentId,
  onMarkTaskComplete,
  mockInstruments,
}) => {
  
  if (!currentViewingStudentId || !currentViewingStudentData) {
    
    const parentDisplayName = getUserDisplayName(user);
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
           {}
          <Text style={appSharedStyles.header}>Welcome, {parentDisplayName}!</Text>
          <Text style={appSharedStyles.sectionTitle}>Your Children</Text>

          {linkedStudents.length > 0 ? (
            
            linkedStudents.map(student => (
              <View key={student.id} style={appSharedStyles.itemContainer}>
                {}
                <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
                <Text style={appSharedStyles.itemDetailText}>
                  Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
                </Text>
                <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
                <View style={styles.studentActions}>
                   <Button
                     
                     title={`View ${student.name}'s Profile`}
                     onPress={() => setViewingStudentId(student.id)} 
                   />
                </View>
              </View>
            ))
          ) : (
            
            <Text style={appSharedStyles.emptyListText}>
              No students linked yet. Ask the school admin to link your child.
            </Text>
          )}

          {}
          <View style={{ marginTop: 30, alignItems: 'flex-start' }}>
            <Button
              title="Add Another Student (Mock QR Scan)"
              onPress={() => alert('Simulate QR scan to add student')} 
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  

  
  
  const studentDisplayName = getUserDisplayName(currentViewingStudentData.user);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {}
      <View style={appSharedStyles.headerContainer}>
        <Button title="← Back to Children" onPress={() => setViewingStudentId('')} />
         {}
        <Text style={appSharedStyles.header}>{studentDisplayName}'s Profile</Text>
        <View style={{ width: 50 }} /> {}
      </View>

      {}
      {}
      <StudentView
        {...currentViewingStudentData} 
        onMarkTaskComplete={onMarkTaskComplete} 
        mockInstruments={mockInstruments}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
   studentActions: { 
      flexDirection: 'row',
      justifyContent: 'space-around', 
      marginTop: 10,
      gap: 5,
   },
});