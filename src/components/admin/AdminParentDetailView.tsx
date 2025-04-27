// src/components/admin/AdminParentDetailView.tsx
import React, { useMemo } from 'react'; // Added useMemo
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueries } from '@tanstack/react-query'; // Added useQueries

// Import Supabase-backed API function
import { fetchUserProfile } from '../../api/users'; // Use fetchUserProfile

// Import Types and Props
import { User } from '../../types/dataTypes';
import { AdminParentDetailViewProps } from '../../types/componentProps';

// Import Styles and Helpers
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';

export const AdminParentDetailView: React.FC<AdminParentDetailViewProps> = ({
  viewingUserId, // ID of the parent being viewed
  // Action handlers passed from AdminView
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile, // To navigate to student profile
}) => {

  // --- Data Fetching ---

  // Fetch the detailed parent profile (which should include linkedStudentIds now)
  const {
    data: parent, // Renamed for clarity
    isLoading: parentLoading,
    isError: parentError,
    error: parentErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId], // Use specific key
    queryFn: () => fetchUserProfile(viewingUserId), // Use specific fetch function
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Get the linked student IDs from the fetched parent profile
  const linkedStudentIds = useMemo(() => parent?.linkedStudentIds || [], [parent]);

  // Use useQueries to fetch profile data for each linked student ID
  const linkedStudentsQueries = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['userProfile', id], // Fetch each student profile individually
      queryFn: () => fetchUserProfile(id),
      enabled: !!parent, // Only run if parent data is loaded and has IDs
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // Keep student data cached longer
    })),
  });

  // Process the results from useQueries
  const { linkedStudents, isLoadingLinkedStudents, isErrorLinkedStudents } = useMemo(() => {
      const students: User[] = [];
      let isLoading = false;
      let isError = false;

      // Only process if there are queries (i.e., linkedStudentIds is not empty)
      if (linkedStudentsQueries.length > 0) {
          isLoading = linkedStudentsQueries.some(q => q.isLoading || q.isFetching); // Consider fetching as loading for UI
          isError = linkedStudentsQueries.some(q => q.isError);
          linkedStudentsQueries.forEach(q => {
              // Add student data if fetch succeeded and is actually a student profile
              if (q.isSuccess && q.data && q.data.role === 'student') {
                  students.push(q.data);
              } else if (q.isError) {
                  // Log specific errors for failed student fetches
                  console.error(`[AdminParentDetailView] Error fetching linked student:`, q.error?.message);
              }
          });
      }

      return { linkedStudents: students, isLoadingLinkedStudents: isLoading, isErrorLinkedStudents: isError };
  }, [linkedStudentsQueries]);


  // --- Memos ---
  const parentDisplayName = useMemo(() => parent ? getUserDisplayName(parent) : 'Loading...', [parent]);
  const isParentActive = useMemo(() => parent?.status === 'active', [parent]);


  // --- Event Handlers ---
  const handleEdit = () => {
    if (parent && onInitiateEditUser) {
      // Pass parent object, EditUserModal should probably prevent editing parents anyway
      onInitiateEditUser(parent);
    }
  };
  const handleStatus = () => {
    if (parent && onInitiateStatusUser) {
      onInitiateStatusUser(parent);
    }
  };
  // Placeholder for linking more students
  const handleLinkStudent = () => {
      if (parent) {
        alert(`TODO: Implement link student flow for ${parentDisplayName}... (Parent ID: ${parent.id})`);
      }
  };


  // --- Loading & Error States ---
  if (parentLoading) {
    return (
      <View style={[appSharedStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Parent Details...</Text>
      </View>
    );
  }

  if (parentError || !parent) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading parent details: {parentErrorMsg?.message || 'Parent not found.'}
        </Text>
        {/* Maybe add a back button here */}
      </View>
    );
  }
  // Ensure the user is actually a parent
   if (parent.role !== 'parent') {
       return (
          <View style={appSharedStyles.container}>
             <Text style={commonSharedStyles.errorText}>Error: User found but is not a parent.</Text>
          </View>
        );
   }


  // --- Render Logic ---
  return (
    <ScrollView style={appSharedStyles.container}>
      {/* Parent Details Section */}
      <Text style={appSharedStyles.sectionTitle}>Parent Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {parentDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {parent.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text style={isParentActive ? styles.activeStatus : styles.inactiveStatus}>
          {parent.status}
        </Text>
      </Text>

      {/* Action Buttons */}
      <View style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}>
        {/* Note: Editing parent info might be limited compared to student/teacher */}
        <Button
          title="Edit Info (Limited)"
          onPress={handleEdit}
          color={colors.warning}
          // Disable edit for parents for now? Or EditUserModal handles it?
          // disabled={true}
        />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        {/* Link student flow needs backend implementation */}
        <Button
          title="Link Another Student (TODO)"
          onPress={handleLinkStudent}
          color={colors.info}
          // Should probably be enabled even if parent is inactive?
          // disabled={!isParentActive}
        />
      </View>

      {/* Linked Students Section */}
      <Text style={appSharedStyles.sectionTitle}>Linked Students ({linkedStudents.length})</Text>
      {isLoadingLinkedStudents && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
      {/* Show general error if any student fetch failed */}
      {isErrorLinkedStudents && !isLoadingLinkedStudents && (
         <Text style={commonSharedStyles.errorText}>Error loading details for one or more linked students.</Text>
      )}

      {!isLoadingLinkedStudents && !isErrorLinkedStudents && (
        <FlatList
          // Sort fetched students alphabetically
          data={linkedStudents.sort((a, b) =>
            getUserDisplayName(a).localeCompare(getUserDisplayName(b))
          )}
          keyExtractor={item => item.id}
          renderItem={({ item: studentItem }) => ( // Rename item to avoid conflict
            // Reusable student list item view
            <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
              <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(studentItem)}</Text>
              <Text style={appSharedStyles.itemDetailText}>
                Status: <Text style={studentItem.status === 'active' ? styles.activeStatus : styles.inactiveStatus}>{studentItem.status}</Text>
              </Text>
              <View style={styles.linkedStudentActions}>
                {/* Call handler passed from AdminView */}
                <Button title="View Profile" onPress={() => onViewStudentProfile(studentItem.id)} />
              </View>
            </View>
          )}
          scrollEnabled={false} // Disable FlatList scroll within ScrollView
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />} // Use inline separator
          ListEmptyComponent={() => (
             <Text style={appSharedStyles.emptyListText}>No students currently linked to this parent.</Text>
          )}
        />
      )}
      <View style={{ height: 30 }} /> {/* Bottom padding */}
    </ScrollView>
  );
};

// Local Styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
   activeStatus: {
        fontWeight: 'bold',
        color: colors.success,
    },
    inactiveStatus: {
         fontWeight: 'bold',
         color: colors.secondary,
    },
  linkedStudentItem: {
    backgroundColor: colors.backgroundSecondary, // Slightly different background for contrast
  },
  linkedStudentActions: {
    marginTop: 8,
    alignItems: 'flex-start', // Align button to left
  },
});