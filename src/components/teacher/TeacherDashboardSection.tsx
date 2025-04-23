// src/components/teacher/TeacherDashboardSection.tsx
import React from 'react';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native'; // Removed StyleSheet as not needed here yet

import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { SimplifiedStudent } from '../../types/dataTypes'; // For student lookup

import { PendingVerificationItem } from '../../views/TeacherView'; // Assuming PendingVerificationItem stays in TeacherView or moves to common
import { appSharedStyles } from '../../styles/appSharedStyles';
// import { colors } from '../../styles/colors'; // Import if needed for specific styles

interface TeacherDashboardSectionProps {
    pendingVerifications: AssignedTask[];
    isLoading: boolean; // Loading state for the underlying tasks query
    isError: boolean;   // Error state
    allStudentsSimple: SimplifiedStudent[]; // For looking up student names
    onInitiateVerificationModal: (task: AssignedTask) => void;
}

export const TeacherDashboardSection: React.FC<TeacherDashboardSectionProps> = ({
    pendingVerifications,
    isLoading,
    isError,
    allStudentsSimple,
    onInitiateVerificationModal,
}) => {
    return (
        <View>
            <Text style={appSharedStyles.sectionTitle}> Pending Verifications ({pendingVerifications.length}) </Text>
            {isLoading && <ActivityIndicator color={appSharedStyles.primary} style={{ marginVertical: 10 }}/>}
            {isError && <Text style={appSharedStyles.textDanger}>Error loading pending tasks.</Text>}
            {!isLoading && !isError && ( pendingVerifications.length > 0 ? (
               <FlatList
                // Sort oldest completed first
                data={pendingVerifications.sort( (a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime() )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  // Find student name from the passed list
                  const studentInfo = allStudentsSimple.find(s => s.id === item.studentId);
                  return (
                    // You might need to move PendingVerificationItem definition here or import from common
                    <PendingVerificationItem
                      task={item}
                      studentName={studentInfo?.name || 'Unknown Student'}
                      onInitiateVerification={onInitiateVerificationModal}
                    />
                  );
                }}
                scrollEnabled={false} // Disable scroll within parent ScrollView
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            ))}
        </View>
    );
};