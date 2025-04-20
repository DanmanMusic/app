// src/views/ParentView.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { Instrument } from '../mocks/mockInstruments';
import { User } from '../mocks/mockUsers';

// Import helpers
import { getInstrumentNames } from '../utils/helpers';

// Import the PupilView component to render the child's data
import { PupilView, PupilViewProps } from './PupilView';

// Import shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


// Re-define SimplifiedStudent here or import if put in a shared file
// (Already defined in AdminView, could move to a common types file later)
interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds?: string[];
  balance: number;
}

interface ParentViewingStudentData extends PupilViewProps {}

interface ParentViewProps {
  user: User;
  linkedStudents: SimplifiedStudent[]; // Simplified list of linked students
  currentViewingStudentId?: string;
  currentViewingStudentData?: ParentViewingStudentData;
  setViewingStudentId: (studentId: string) => void;
  // Pass down mock action functions relevant to ParentView (same as PupilView)
  onMarkTaskComplete: (taskId: string) => void;
  mockInstruments: Instrument[]; // Pass instruments list
  // Mock function for "Add Another Student" later
}

export const ParentView: React.FC<ParentViewProps> = ({
  user,
  linkedStudents,
  currentViewingStudentId,
  currentViewingStudentData,
  setViewingStudentId,
  onMarkTaskComplete, // Destructure the action prop
  mockInstruments, // Destructure instruments list
}) => {
  // If no student is selected or data is missing for the selected student, show the family selector
  if (!currentViewingStudentId || !currentViewingStudentData) {
    return (
      // Use safeArea from appSharedStyles
      <SafeAreaView style={appSharedStyles.safeArea}>
         // Use container from appSharedStyles
        <View style={appSharedStyles.container}>
           // Use header from appSharedStyles
          <Text style={appSharedStyles.header}>Welcome, {user.name}!</Text>
           // Use sectionTitle from appSharedStyles
          <Text style={appSharedStyles.sectionTitle}>Your Children</Text>

          {linkedStudents.length > 0 ? (
            linkedStudents.map(student => (
              // Use itemContainer from appSharedStyles
              <View key={student.id} style={appSharedStyles.itemContainer}>
                 // Use itemTitle from appSharedStyles
                <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
                 // Use itemDetailText from appSharedStyles
                <Text style={appSharedStyles.itemDetailText}>
                  Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
                </Text>
                 // Use itemDetailText and textGold
                <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
                <View style={styles.studentActions}> // Keep specific action container style
                   <Button
                     title={`View ${student.name}'s Profile`}
                     onPress={() => setViewingStudentId(student.id)}
                   />
                </View>
              </View>
            ))
          ) : (
            // Use emptyListText from appSharedStyles
            <Text style={appSharedStyles.emptyListText}>
              No students linked yet. Ask the school admin to link your child.
            </Text>
          )}

          // Placeholder for "Add Another Student"
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

  // If a student is selected, render the PupilView with their data
  // We pass the currentViewingStudentData which matches the PupilViewProps structure
  // We also pass down the action props
  return (
    // Use safeArea from appSharedStyles
    <SafeAreaView style={appSharedStyles.safeArea}>
      // Use headerContainer from appSharedStyles
      <View style={appSharedStyles.headerContainer}>
        <Button title="← Back to Children" onPress={() => setViewingStudentId('')} />
         // Use header from appSharedStyles
        <Text style={appSharedStyles.header}>{currentViewingStudentData.user.name}'s Profile</Text>
        <View style={{ width: 50 }} /> // Spacer to balance button
      </View>

      // Render the PupilView component for the selected child, passing needed props
      <PupilView
        {...currentViewingStudentData}
        onMarkTaskComplete={onMarkTaskComplete} // Pass down the action prop
        mockInstruments={mockInstruments} // Pass instruments list
        // Add other action props from ParentViewProps if needed in PupilView
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // safeArea, container, headerContainer, header, sectionTitle, emptyListText
  // styles moved to appSharedStyles

  // studentItem style removed, using appSharedStyles.itemContainer
  // studentName style removed, using appSharedStyles.itemTitle
   studentActions: { // Keep specific style
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
      gap: 5,
   },
});