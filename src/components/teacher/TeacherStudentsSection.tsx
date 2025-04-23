import React, { useMemo } from 'react';
import { View, Text, FlatList, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query'; // Import useQuery

// Import API functions & types
import { fetchStudents } from '../../api/users'; // API to fetch students
import { Instrument } from '../../mocks/mockInstruments';
import { SimplifiedStudent } from '../../types/dataTypes';
import { User } from '../../types/userTypes'; // Needed for filtering/lookup if API changes
// Import updated props type
import { TeacherStudentsSectionProps } from '../../types/componentProps'; // Adjust path

// Import context for teacher ID
import { useAuth } from '../../contexts/AuthContext';

// Import utils and shared components/styles
import { getInstrumentNames } from '../../utils/helpers'; // getUserDisplayName not needed if using SimplifiedStudent
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
// Import sub-component (or define locally)
// Assuming StudentListItem is defined elsewhere or moved to common
import { StudentListItem } from '../../views/TeacherView'; // Adjust path

// Use updated props interface
export const TeacherStudentsSection: React.FC<TeacherStudentsSectionProps> = ({
  mockInstruments, // Receive instruments list
  onViewProfile,
  onAssignTask,
}) => {
    const { currentUserId: teacherId } = useAuth();

    // --- Query to fetch students ---
    // MENTAL NOTE: Fetching page 1 only. Need proper pagination or dedicated endpoint.
    // MENTAL NOTE: Ideally fetch only students linked to `teacherId`.
    const {
        data: allStudentsResult,
        isLoading, // Use internal loading state
        isError,   // Use internal error state
        error,     // Use internal error object
    } = useQuery({
        queryKey: ['students', { filter: 'all', context: 'teacherStudentsSection' }],
        queryFn: () => fetchStudents({ filter: 'all', page: 1 }), // Fetch page 1 of all students
        enabled: !!teacherId, // Only fetch if teacher is logged in
        staleTime: 5 * 60 * 1000,
    });
    const allStudentsSimple: SimplifiedStudent[] = allStudentsResult?.students ?? [];

    // --- Filter Students Client-Side (Placeholder Logic) ---
    // ** TODO: Replace this with backend filtering or fetching full User objects **
    const studentsLinkedToTeacher = useMemo(() => {
        if (!teacherId || !allStudentsSimple) return [];
        console.warn("[TeacherStudentsSection] Filtering students client-side. Inefficient/Inaccurate.");
        // Placeholder: Returning ALL fetched students for now.
        // Real logic needs to check student.linkedTeacherIds against teacherId.
        return allStudentsSimple.sort((a, b) => a.name.localeCompare(b.name)); // Sort the result
    }, [teacherId, allStudentsSimple]);
    // --- End Placeholder Logic ---

    return (
        <View>
            <Text style={appSharedStyles.sectionTitle}> My Students ({studentsLinkedToTeacher.length}) </Text>
            {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
            {isError && <Text style={appSharedStyles.textDanger}>Error loading students: {error?.message}</Text>}
            {!isLoading && !isError && (
                 studentsLinkedToTeacher.length > 0 ? (
                   <FlatList
                        data={studentsLinkedToTeacher} // Use the internally filtered list
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <StudentListItem
                                student={item}
                                mockInstruments={mockInstruments} // Use passed instruments
                                onViewProfile={onViewProfile} // Pass callback
                                onAssignTask={onAssignTask} // Pass callback
                            />
                        )}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    />
                ) : (
                    <Text style={appSharedStyles.emptyListText}> No students linked to you. </Text>
                )
            )}
            {/* Keep placeholder button */}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button title="View All Students (TODO)" onPress={() => alert('Implement view all students')} />
            </View>
        </View>
    );
};

// Local styles needed for StudentListItem if not imported
const styles = StyleSheet.create({
    studentActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, gap: 5 },
    inactiveItemStyle: { borderColor: colors.secondary, opacity: 0.7, },
});