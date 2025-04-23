import React, { useState, useMemo, useEffect } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { View, Text, StyleSheet, Button, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { ParentStudentListItemProps, ParentViewProps } from '../types/componentProps';
import { User } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';

import { StudentView } from './StudentView';

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

// The main ParentView component
export const ParentView: React.FC<ParentViewProps> = () => {
  const { currentUserId } = useAuth(); // Get Parent's ID
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null); // State for selected student

  // --- TQ Queries ---

  // 1. Fetch the Parent User's data
  const {
    data: parentUser,
    isLoading: isLoadingParent,
    isError: isErrorParent,
    error: errorParent, // Capture error object
  } = useQuery<User, Error>({
    queryKey: ['user', currentUserId], // Fetch user data for the logged-in parent
    queryFn: async () => {
      if (!currentUserId) throw new Error('No logged in parent user ID');
      // Replace with fetchUserById(currentUserId) if available
      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error fetching parent:', errorBody);
        throw new Error(`Failed to fetch parent data (status ${response.status})`);
      }
      const userData = await response.json();
      if (userData.role !== 'parent') throw new Error('Logged in user is not a parent');
      return userData;
    },
    enabled: !!currentUserId, // Only run if parent ID exists
    staleTime: 15 * 60 * 1000, // Cache parent data longer
  });

  // 2. Fetch data for ALL linked students using useQueries
  const linkedStudentIds = useMemo(() => parentUser?.linkedStudentIds || [], [parentUser]);

  // Corrected: Use useQueries
  const linkedStudentsQueriesResults = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['user', id], // Unique key for each student query
      queryFn: async () => {
        // Replace with fetchUserById(id) if available
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
          console.error(`Failed to fetch linked student ${id}, status: ${response.status}`);
          // Return null or throw? Returning null allows partial success display
          return null;
        }
        const studentData = await response.json();
        // Ensure it's actually a student before returning
        return studentData?.role === 'student' ? (studentData as User) : null;
      },
      enabled: !!parentUser, // Enable queries only after parent data (and IDs) are loaded
      staleTime: 5 * 60 * 1000, // Cache student data
    })),
    // combine function is not needed here, process results manually below
  });
  // --- End TQ Queries ---

  // --- Process results from useQueries ---
  const linkedStudents: User[] = useMemo(
    () =>
      linkedStudentsQueriesResults
        .map(result => result.data) // Get the data from each result object
        .filter((student): student is User => !!student), // Filter out nulls (failed fetches) and ensure type is User
    [linkedStudentsQueriesResults] // Recompute when the results array changes
  );

  const isLoadingStudents = useMemo(
    () =>
      // Check if *any* of the queries are still loading
      linkedStudentsQueriesResults.some(result => result.isLoading),
    [linkedStudentsQueriesResults]
  );

  const isErrorStudents = useMemo(
    () =>
      // Check if *any* of the queries resulted in an error
      linkedStudentsQueriesResults.some(result => result.isError),
    [linkedStudentsQueriesResults]
  );
  // --- End Processing Results ---

  // --- Derived State & Effects ---
  const hasMultipleStudents = linkedStudents.length > 1;

  // Effect to auto-select if only one student is linked
  useEffect(() => {
    // Check loading states before auto-selecting
    if (
      !isLoadingParent &&
      !isLoadingStudents &&
      !viewingStudentId &&
      linkedStudents.length === 1
    ) {
      console.log('[ParentView] Auto-selecting single student:', linkedStudents[0].id);
      setViewingStudentId(linkedStudents[0].id);
    }
    // Effect to reset view if the currently viewed student is no longer linked
    // Check parentUser exists before accessing linkedStudentIds
    if (
      viewingStudentId &&
      !isLoadingParent &&
      parentUser &&
      !parentUser.linkedStudentIds?.includes(viewingStudentId)
    ) {
      console.log('[ParentView] Viewed student no longer linked, resetting view.');
      setViewingStudentId(null);
    }
  }, [isLoadingParent, isLoadingStudents, viewingStudentId, linkedStudents, parentUser]); // Dependencies include loading states

  // --- Loading and Error Handling ---
  // Show loading if parent is loading OR if we have IDs but student queries are still loading
  if (isLoadingParent || (linkedStudentIds.length > 0 && isLoadingStudents)) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Handle error fetching parent data (critical error)
  if (isErrorParent || !parentUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>
            Error: Could not load parent data. {errorParent?.message}
          </Text>
          {/* Maybe add a logout/retry button */}
        </View>
      </SafeAreaView>
    );
  }
  // Note: isErrorStudents is checked later for less critical display

  // --- Render Logic ---

  // If a student is selected for viewing
  if (viewingStudentId) {
    // Find the student object from the successfully fetched and processed data
    const studentToView = linkedStudents.find(s => s.id === viewingStudentId);

    // Handle case where selected student wasn't found in the successfully fetched list
    if (!studentToView) {
      return (
        <SafeAreaView style={appSharedStyles.safeArea}>
          <View style={appSharedStyles.container}>
            <Text style={appSharedStyles.textDanger}>
              Error: Selected student data could not be loaded or is no longer linked.
            </Text>
            <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
          </View>
        </SafeAreaView>
      );
    }

    // Render the StudentView, passing the ID
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.parentHeader}>
          <Text style={styles.parentHeaderText}>Viewing: {getUserDisplayName(studentToView)}</Text>
          {/* Show back button only if multiple students are linked */}
          {hasMultipleStudents && (
            <Button title="Select Student" onPress={() => setViewingStudentId(null)} />
          )}
        </View>
        {/* Pass the ID to StudentView, which fetches its own details */}
        <StudentView studentIdToView={viewingStudentId} />
      </SafeAreaView>
    );
  }

  // --- Render Parent Dashboard (Student Selection List) ---
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.header}>Parent Dashboard</Text>
        <Text style={appSharedStyles.sectionTitle}>Your Students</Text>
        {/* Display error loading students if applicable */}
        {isErrorStudents && (
          <Text style={appSharedStyles.textDanger}>Error loading some student details.</Text>
        )}

        {
          !isErrorStudents && linkedStudents.length > 0 ? (
            <FlatList
              data={linkedStudents.sort((a, b) =>
                getUserDisplayName(a).localeCompare(getUserDisplayName(b))
              )}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                // Pass the fetched student object to the list item
                <ParentStudentListItem student={item} onSelectStudent={setViewingStudentId} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : !isErrorStudents && linkedStudents.length === 0 ? ( // Handle case where parent has no linked students
            <Text style={appSharedStyles.emptyListText}>No students linked to your account.</Text>
          ) : null /* Don't show empty text if there was an error */
        }

        {/* Link Another Student Button (mock action) */}
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

// Styles (remain the same)
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
