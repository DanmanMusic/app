// src/views/ParentView.tsx
import React from 'react'; // Removed useState as it's not used directly here
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import NEW user type
import { User } from '../types/userTypes';
import { Instrument } from '../mocks/mockInstruments';

// Import NEW helper for display names
import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';

// PupilViewProps uses the new User type indirectly
import { PupilView, PupilViewProps } from './StudentView';

// Shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


// SimplifiedStudent type uses display name implicitly
// (Assumes App.tsx provides 'name' as the formatted display name)
interface SimplifiedStudent {
  id: string;
  name: string; // Display name
  instrumentIds?: string[];
  balance: number;
}

// This interface is essentially PupilViewProps, just renamed for context
// PupilViewProps already uses the updated User type internally
interface ParentViewingStudentData extends PupilViewProps {}

// Props interface uses the new User type and updated SimplifiedStudent
interface ParentViewProps {
  user: User; // Use new User type for the logged-in parent
  linkedStudents: SimplifiedStudent[]; // Uses display name
  currentViewingStudentId?: string;
  currentViewingStudentData?: ParentViewingStudentData; // Uses new User type via PupilViewProps
  setViewingStudentId: (studentId: string) => void;
  // Pass down mock action function relevant to ParentView (same as PupilView)
  onMarkTaskComplete: (taskId: string) => void;
  mockInstruments: Instrument[];
}

export const ParentView: React.FC<ParentViewProps> = ({
  user, // Full User object for the parent
  linkedStudents, // Simplified list with display names
  currentViewingStudentId,
  currentViewingStudentData, // Full data (including User object) for the viewed child
  setViewingStudentId,
  onMarkTaskComplete,
  mockInstruments,
}) => {
  // If no child is selected, show the family dashboard/selector
  if (!currentViewingStudentId || !currentViewingStudentData) {
    // Get parent's display name
    const parentDisplayName = getUserDisplayName(user);
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
           {/* Use display name in welcome message */}
          <Text style={appSharedStyles.header}>Welcome, {parentDisplayName}!</Text>
          <Text style={appSharedStyles.sectionTitle}>Your Children</Text>

          {linkedStudents.length > 0 ? (
            // Map over the simplified list of linked students
            linkedStudents.map(student => (
              <View key={student.id} style={appSharedStyles.itemContainer}>
                {/* Display name is already formatted in student.name */}
                <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
                <Text style={appSharedStyles.itemDetailText}>
                  Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
                </Text>
                <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
                <View style={styles.studentActions}>
                   <Button
                     // Use the display name from the simplified student object
                     title={`View ${student.name}'s Profile`}
                     onPress={() => setViewingStudentId(student.id)} // Set the ID to view
                   />
                </View>
              </View>
            ))
          ) : (
            // Message if no students are linked
            <Text style={appSharedStyles.emptyListText}>
              No students linked yet. Ask the school admin to link your child.
            </Text>
          )}

          {/* Mock button to add another student */}
          <View style={{ marginTop: 30, alignItems: 'flex-start' }}>
            <Button
              title="Add Another Student (Mock QR Scan)"
              onPress={() => alert('Simulate QR scan to add student')} // Simple alert for mock
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // If a child is selected, render their profile using PupilView

  // Get the display name of the child being viewed
  // currentViewingStudentData.user contains the full User object for the child
  const studentDisplayName = getUserDisplayName(currentViewingStudentData.user);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header for the child's profile view */}
      <View style={appSharedStyles.headerContainer}>
        <Button title="← Back to Children" onPress={() => setViewingStudentId('')} />
         {/* Use display name in header */}
        <Text style={appSharedStyles.header}>{studentDisplayName}'s Profile</Text>
        <View style={{ width: 50 }} /> {/* Spacer */}
      </View>

      {/* Render the PupilView component for the selected child */}
      {/* PupilView itself now handles displaying names correctly using its user prop */}
      <PupilView
        {...currentViewingStudentData} // Spread the props needed by PupilView
        onMarkTaskComplete={onMarkTaskComplete} // Pass down the action prop
        mockInstruments={mockInstruments}
      />
    </SafeAreaView>
  );
};

// Local styles for ParentView specific elements
const styles = StyleSheet.create({
   studentActions: { // Style for the button container within each child item
      flexDirection: 'row',
      justifyContent: 'space-around', // Or 'flex-end', 'center' etc.
      marginTop: 10,
      gap: 5,
   },
});