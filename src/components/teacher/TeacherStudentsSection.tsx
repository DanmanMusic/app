// src/components/teacher/TeacherStudentsSection.tsx
import React from 'react';
import { View, Text, FlatList, Button, StyleSheet, ActivityIndicator } from 'react-native';

import { SimplifiedStudent } from '../../types/dataTypes';
import { Instrument } from '../../mocks/mockInstruments';

import { StudentListItem } from '../../views/TeacherView'; // Assuming StudentListItem stays in TeacherView or moves to common
import { appSharedStyles } from '../../styles/appSharedStyles';
// import { colors } from '../../styles/colors'; // Import if needed for specific styles

interface TeacherStudentsSectionProps {
    studentsLinkedToTeacher: SimplifiedStudent[];
    isLoading: boolean; // Loading state for the students query
    isError: boolean;   // Error state
    mockInstruments: Instrument[]; // Pass instruments for display
    onViewProfile: (studentId: string) => void;
    onAssignTask: (studentId: string) => void;
}

export const TeacherStudentsSection: React.FC<TeacherStudentsSectionProps> = ({
    studentsLinkedToTeacher,
    isLoading,
    isError,
    mockInstruments,
    onViewProfile,
    onAssignTask,
}) => {
    return (
        <View>
            <Text style={appSharedStyles.sectionTitle}> My Students ({studentsLinkedToTeacher.length}) </Text>
             {isLoading && <ActivityIndicator color={appSharedStyles.primary}/>}
             {isError && <Text style={appSharedStyles.textDanger}>Error loading students.</Text>}
            {!isLoading && !isError && ( studentsLinkedToTeacher.length > 0 ? (
               <FlatList
                data={studentsLinkedToTeacher} // Display only linked students
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  // You might need to move StudentListItem definition here or import from common
                  <StudentListItem
                    student={item}
                    mockInstruments={mockInstruments} // Pass instruments
                    onViewProfile={onViewProfile} // Pass callback
                    onAssignTask={onAssignTask} // Pass callback
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}> No students linked to you. </Text>
            ))}
            {/* Keep placeholder button here or move to parent? Let's keep it here for now */}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button title="View All Students (TODO)" onPress={() => alert('Implement view all students')} />
            </View>
        </View>
    );
};