// src/components/admin/AdminTeacherDetailView.tsx
import React, { useMemo } from 'react'; // Added useMemo
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query'; // No mutations needed directly in this view

// Import Supabase-backed API functions
import { fetchStudents, fetchUserProfile } from '../../api/users'; // Use fetchUserProfile and fetchStudents

// Import Types and Props
import { User, SimplifiedStudent } from '../../types/dataTypes';
import { AdminTeacherDetailViewProps } from '../../types/componentProps';

// Import Styles and Helpers
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId, // ID of the teacher being viewed
  // Action handlers passed from AdminView
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile, // Handler to navigate to student profile
}) => {

  // --- Data Fetching ---

  // Fetch the detailed teacher profile
  const {
    data: teacher, // Renamed for clarity
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({ // Profile might not be found
    queryKey: ['userProfile', viewingUserId], // Use specific key
    queryFn: () => fetchUserProfile(viewingUserId), // Use specific fetch function
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch linked students using the fetchStudents API with teacherId filter
  // We fetch ALL linked students (active/inactive) for admin view
  const {
    data: linkedStudentsResult,
    isLoading: isLoadingLinkedStudents,
    isError: isErrorLinkedStudents,
    error: errorLinkedStudents,
  } = useQuery({
    // Key includes teacherId to differentiate from other student lists
    queryKey: ['students', { teacherId: viewingUserId, filter: 'all', context: 'teacherDetailView' }],
    queryFn: () => fetchStudents({ // Use refactored fetchStudents
        teacherId: viewingUserId, // Pass the teacher's ID
        filter: 'all', // Show all students (active/inactive) linked to this teacher
        limit: 9999, // Fetch all linked students (assuming not thousands)
        page: 1,
      }),
    enabled: !!teacher, // Only fetch students if teacher profile loaded successfully
    staleTime: 5 * 60 * 1000,
  });

  // Extract the student list from the paginated result
  const linkedStudents: SimplifiedStudent[] = useMemo(() => {
      return linkedStudentsResult?.students ?? [];
  }, [linkedStudentsResult]);


  // --- Memos ---
  const teacherDisplayName = useMemo(() => teacher ? getUserDisplayName(teacher) : 'Loading...', [teacher]);
  const isTeacherActive = useMemo(() => teacher?.status === 'active', [teacher]);


  // --- Event Handlers ---
  const handleEdit = () => {
    if (teacher && onInitiateEditUser) {
      onInitiateEditUser(teacher);
    }
  };
  const handleStatus = () => {
    if (teacher && onInitiateStatusUser) {
      onInitiateStatusUser(teacher);
    }
  };
  // QR Login handler remains a placeholder
  const handleLoginQR = () => alert(`Simulating QR Code login for ${teacherDisplayName}...`);


  // --- Loading & Error States ---
  if (teacherLoading) {
    return (
      <View style={[appSharedStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Teacher Details...</Text>
      </View>
    );
  }

  if (teacherError || !teacher) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading teacher details: {teacherErrorMsg?.message || 'Teacher not found.'}
        </Text>
        {/* Maybe add a back button here */}
      </View>
    );
  }
  // Additional check if the fetched user is actually a teacher
   if (teacher.role !== 'teacher') {
       return (
          <View style={appSharedStyles.container}>
             <Text style={commonSharedStyles.errorText}>Error: User found but is not a teacher.</Text>
          </View>
        );
   }


  // --- Render Logic ---
  return (
    // Use ScrollView as content might exceed screen height
    <ScrollView style={appSharedStyles.container}>
      {/* Teacher Details Section */}
      <Text style={appSharedStyles.sectionTitle}>Teacher Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {teacherDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {teacher.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text style={isTeacherActive ? styles.activeStatus : styles.inactiveStatus}>
          {teacher.status}
        </Text>
      </Text>

      {/* Action Buttons */}
      <View style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}>
        {/* Pass teacher object to handlers */}
        <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        <Button
          title="Login (QR - TODO)"
          onPress={handleLoginQR}
          color={colors.info}
          disabled={!isTeacherActive} // Disable QR if inactive
        />
      </View>

      {/* Linked Students Section */}
      <Text style={appSharedStyles.sectionTitle}>Linked Students ({linkedStudents.length})</Text>
      {isLoadingLinkedStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {isErrorLinkedStudents && (
        <Text style={commonSharedStyles.errorText}>
          Error loading linked students: {errorLinkedStudents?.message}
        </Text>
      )}
      {!isLoadingLinkedStudents && !isErrorLinkedStudents && (
        <FlatList
          data={linkedStudents.sort((a, b) => a.name.localeCompare(b.name))} // Sort students alphabetically
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            // Reusable student list item (or create specific one if needed)
            <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
              <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
              <Text style={appSharedStyles.itemDetailText}>
                Status: <Text style={item.isActive ? styles.activeStatus : styles.inactiveStatus}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </Text>
              <View style={styles.linkedStudentActions}>
                {/* Call handler passed from AdminView to navigate */}
                <Button title="View Profile" onPress={() => onViewStudentProfile(item.id)} />
              </View>
            </View>
          )}
          scrollEnabled={false} // Disable FlatList scroll within ScrollView
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />} // Use inline separator
          ListEmptyComponent={() => (
             <Text style={appSharedStyles.emptyListText}>No students currently linked to this teacher.</Text>
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