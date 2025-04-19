// src/views/ParentView.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { Instrument } from '../mocks/mockInstruments';
import { User } from '../mocks/mockUsers';

// Import helpers
import { getInstrumentNames } from '../utils/helpers'; // IMPORT HELPER (getTaskTitle not needed here)

// Import the PupilView component to render the child's data
import { PupilView, PupilViewProps } from './PupilView';

// Re-define SimplifiedStudent here or import if put in a shared file
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.header}>Welcome, {user.name}!</Text>
          <Text style={styles.sectionTitle}>Your Children</Text>

          {linkedStudents.length > 0 ? (
            linkedStudents.map(student => (
              <View key={student.id} style={styles.studentItem}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text>
                  Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
                </Text>{' '}
                {/* Use helper */}
                <Text>Balance: {student.balance} Tickets</Text>
                <Button
                  title={`View ${student.name}'s Profile`}
                  onPress={() => setViewingStudentId(student.id)}
                />
              </View>
            ))
          ) : (
            <Text style={styles.emptyListText}>
              No students linked yet. Ask the school admin to link your child.
            </Text>
          )}

          {/* Placeholder for "Add Another Student" */}
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
    <SafeAreaView style={styles.safeArea}>
      {/* Add a button/header here to go back to the family selector */}
      <View style={styles.headerContainer}>
        <Button title="← Back to Children" onPress={() => setViewingStudentId('')} />
        <Text style={styles.header}>{currentViewingStudentData.user.name}'s Profile</Text>
        <View style={{ width: 50 }} /> {/* Spacer to balance button */}
      </View>

      {/* Render the PupilView component for the selected child, passing needed props */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 5,
  },
  studentItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 10,
  },
});
