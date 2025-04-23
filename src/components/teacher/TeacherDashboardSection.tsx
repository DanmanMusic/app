import React, { useMemo } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query'; // Import useQuery

// Import API functions & types
import { fetchAssignedTasks } from '../../api/assignedTasks'; // API to fetch tasks
import { fetchStudents } from '../../api/users'; // API to fetch students (for names)
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { SimplifiedStudent } from '../../types/dataTypes'; // Need this for student list type
import { User } from '../../types/userTypes'; // Need User type for lookups potentially
// Import updated Props type
import { TeacherDashboardSectionProps } from '../../types/componentProps'; // Adjust path

// Import context for current teacher ID
import { useAuth } from '../../contexts/AuthContext';

// Import utils and shared components/styles
import { getUserDisplayName } from '../../utils/helpers';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { adminSharedStyles } from '../admin/adminSharedStyles';
import { colors } from '../../styles/colors';
// Import sub-component (or define locally)
// Assuming PendingVerificationItem is defined elsewhere or moved to common
import { PendingVerificationItem } from '../../views/TeacherView'; // Adjust path


// Use updated props interface (only callback needed)
export const TeacherDashboardSection: React.FC<TeacherDashboardSectionProps> = ({
    onInitiateVerificationModal,
}) => {
    const { currentUserId: teacherId } = useAuth(); // Get current teacher's ID

    // --- Query 1: Fetch ALL Pending Tasks ---
    // MENTAL NOTE: Ideally, this should be filtered by teacher's students on backend
    const {
        data: assignedTasksResult,
        isLoading: isLoadingTasks,
        isError: isErrorTasks,
        error: errorTasks
    } = useQuery({
        queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active', context: 'teacherDashboard' }],
        queryFn: () => fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }), // Fetch all pending for active students
        enabled: !!teacherId, // Only run if teacher is logged in
        staleTime: 1 * 60 * 1000,
    });
    const allPendingTasks = assignedTasksResult?.items ?? [];

    // --- Query 2: Fetch Teacher's Data (to get linked students - placeholder) ---
    // MENTAL NOTE: This is inefficient. A dedicated API endpoint is better.
    // This also assumes fetch returns the *full* user object including linkedTeacherIds
    // which might not be the case for fetchStudents. Using simplifiedStudents for now.
     const {
        data: allStudentsResult,
        isLoading: isLoadingStudents,
        // isError: isErrorStudents, // Handle error if needed
    } = useQuery({
        queryKey: ['students', { filter: 'all', context: 'teacherDashboardLookup' }], // Fetch all students for lookup
        queryFn: () => fetchStudents({ filter: 'all', page: 1 }),
        enabled: !!teacherId, // Only run if teacher is logged in
        staleTime: 5 * 60 * 1000,
    });
    const allStudentsSimple : SimplifiedStudent[] = allStudentsResult?.students ?? [];


    // --- Filter Tasks Client-Side (Placeholder Logic) ---
    // ** TODO: Replace this with backend filtering **
    const pendingVerifications = useMemo(() => {
        if (!teacherId || !allPendingTasks || !allStudentsSimple) return [];
        console.warn("[TeacherDashboard] Filtering pending tasks client-side. Inefficient.");
        // We need the *full* student object to check linkedTeacherIds reliably.
        // This placeholder assumes allPendingTasks are potentially for the teacher.
        // A real implementation needs to cross-reference teacherId with student's linkedTeacherIds.
        // Returning all fetched pending tasks for now as a placeholder.
        return allPendingTasks;
    }, [teacherId, allPendingTasks, allStudentsSimple]);
    // --- End Placeholder Logic ---


    // Combine loading states
    const isLoading = isLoadingTasks || isLoadingStudents; // Check both queries

    return (
        <View>
            <Text style={appSharedStyles.sectionTitle}> Pending Verifications ({pendingVerifications.length}) </Text>
            {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
            {/* Handle specific errors */}
            {isErrorTasks && <Text style={[appSharedStyles.textDanger, {marginVertical: 5}]}>Error loading tasks: {errorTasks?.message}</Text>}
            {/* Add error handling for student fetch if needed */}

            {!isLoading && !isErrorTasks && ( pendingVerifications.length > 0 ? (
               <FlatList
                data={pendingVerifications.sort( (a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime() )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  // Find student name from the fetched simplified list
                  const studentInfo = allStudentsSimple.find(s => s.id === item.studentId);
                  return (
                    <PendingVerificationItem
                      task={item}
                      studentName={studentInfo?.name || 'Unknown Student'}
                      onInitiateVerification={onInitiateVerificationModal} // Use the prop callback
                    />
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            ))}
        </View>
    );
};