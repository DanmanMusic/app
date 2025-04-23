
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';


import AssignTaskModal from '../components/common/AssignTaskModal';
import PaginationControls from '../components/admin/PaginationControls'; 
import { adminSharedStyles } from '../components/admin/adminSharedStyles'; 


import { usePaginatedStudentTasks } from '../hooks/usePaginatedStudentTasks';
import { usePaginatedStudentHistory } from '../hooks/usePaginatedStudentHistory'; 


import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';
import { SimplifiedStudent } from '../types/dataTypes'; 
import { User } from '../types/userTypes'; 


import { getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

interface TeacherViewProps {
  onInitiateVerificationModal: (task: AssignedTask) => void;
}


const PendingVerificationItem = ({
  task,
  studentName,
  onInitiateVerification,
}: {
  task: AssignedTask;
  studentName: string;
  onInitiateVerification: (task: AssignedTask) => void;
}) => {
  const taskTitle = task.taskTitle;
  const baseTickets = task.taskBasePoints;
  const completedDateTime = task.completedDate
    ? new Date(task.completedDate).toLocaleString()
    : 'N/A';
  return (
    <View style={adminSharedStyles.pendingItem}>
      <Text style={adminSharedStyles.pendingTitle}>Task: {taskTitle}</Text>
      <Text style={adminSharedStyles.pendingDetail}>Student: {studentName}</Text>
      <Text style={adminSharedStyles.pendingDetail}>Potential Tickets: {baseTickets}</Text>
      <Text style={adminSharedStyles.pendingDetail}>Completed: {completedDateTime}</Text>
      <View style={{ marginTop: 10 }}>
        <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
      </View>
    </View>
  );
};


const StudentListItem = ({
  student,
  mockInstruments,
  onViewProfile,
  onAssignTask,
}: {
  student: SimplifiedStudent; 
  mockInstruments: Instrument[];
  onViewProfile: (studentId: string) => void;
  onAssignTask: (studentId: string) => void;
}) => (
  <View style={[appSharedStyles.itemContainer, !student.isActive ? styles.inactiveItemStyle : {}]}>
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>
      Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
    </Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
      Balance: {student.balance} Tickets
    </Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary },
      ]}
    >
      Status: {student.isActive ? 'Active' : 'Inactive'}
    </Text>
    <View style={styles.studentActions}>
      <Button title="View Profile" onPress={() => onViewProfile(student.id)} />
      {student.isActive && <Button title="Assign Task" onPress={() => onAssignTask(student.id)} />}
    </View>
  </View>
);


const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <Text style={[appSharedStyles.itemDetailText, styles.taskLibraryItemTickets]}>
      {item.baseTickets} Base Tickets
    </Text>
  </View>
);

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const {
    currentMockUsers,
    assignedTasks,
    ticketBalances,
    taskLibrary,
    mockInstruments,
    simulateAssignTask,
    simulateDeleteAssignedTask,
  } = useData();

  
  const [viewingSection, setViewingSection] = useState<
    'dashboard' | 'students' | 'tasks' | 'studentProfile'
  >('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);

  const teacherUser = currentUserId ? currentMockUsers[currentUserId] : null;

  
  const allStudents = useMemo(
    () =>
      Object.values(currentMockUsers)
        .filter(u => u.role === 'student')
        .map(student => ({
          id: student.id,
          name: getUserDisplayName(student),
          instrumentIds: student.instrumentIds,
          balance: ticketBalances[student.id] || 0,
          isActive: student.status === 'active',
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [currentMockUsers, ticketBalances]
  );
  const studentsLinkedToTeacher = useMemo(
    () =>
      teacherUser
        ? allStudents.filter(student =>
            currentMockUsers[student.id]?.linkedTeacherIds?.includes(teacherUser.id)
          )
        : [],
    [allStudents, teacherUser, currentMockUsers]
  );
  const pendingVerifications = useMemo(
    () =>
      teacherUser
        ? assignedTasks.filter(
            task =>
              task.isComplete &&
              task.verificationStatus === 'pending' &&
              currentMockUsers[task.studentId]?.linkedTeacherIds?.includes(teacherUser.id) &&
              currentMockUsers[task.studentId]?.status === 'active'
          )
        : [],
    [assignedTasks, teacherUser, currentMockUsers]
  );

  const viewingStudentUser: User | null = useMemo(
    () => (viewingStudentId ? currentMockUsers[viewingStudentId] : null),
    [viewingStudentId, currentMockUsers]
  );
  const viewingStudentBalance = useMemo(
    () => (viewingStudentId ? ticketBalances[viewingStudentId] || 0 : 0),
    [viewingStudentId, ticketBalances]
  );

  
  const {
    tasks: paginatedTasks,
    currentPage: tasksCurrentPage,
    totalPages: tasksTotalPages,
    setPage: setTasksPage,
    totalTasksCount,
  } = usePaginatedStudentTasks(viewingStudentId);

  const {
    history: paginatedHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    setPage: setHistoryPage,
    totalHistoryCount,
  } = usePaginatedStudentHistory(viewingStudentId);

  
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null);
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };
  const handleAssignTaskConfirm = (
    studentId: string,
    taskTitle: string,
    taskDescription: string,
    taskBasePoints: number
  ) => {
    if (teacherUser) {
      simulateAssignTask(studentId, taskTitle, taskDescription, taskBasePoints, teacherUser.id);
    } else {
      console.error('Teacher user not found');
      alert('Error: Could not assign task.');
    }
  };
  const handleRemoveAssignedTask = (assignmentId: string) => {
    simulateDeleteAssignedTask(assignmentId);
  };

  if (!teacherUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <Text>Loading Teacher Data...</Text>
      </SafeAreaView>
    );
  }

  
  if (viewingSection === 'studentProfile' && viewingStudentId && viewingStudentUser) {
    const studentDisplayName = getUserDisplayName(viewingStudentUser);
    const isStudentActive = viewingStudentUser.status === 'active';
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        {}
        <View style={appSharedStyles.headerContainer}>
          <Button
            title="← Back to Teacher"
            onPress={() => {
              setViewingStudentId(null);
              setViewingSection('students');
            }}
          />
          <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail">
            {studentDisplayName}'s Profile
          </Text>
          <View style={{ width: 50 }} />
        </View>
        {}
        <ScrollView style={appSharedStyles.container}>
          {}
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Status:{' '}
            <Text
              style={{
                fontWeight: 'bold',
                color: isStudentActive ? colors.success : colors.secondary,
              }}
            >
              {viewingStudentUser.status}
            </Text>
          </Text>
          <Text style={appSharedStyles.itemDetailText}>
            {' '}
            Instrument(s):{' '}
            {getInstrumentNames(viewingStudentUser.instrumentIds, mockInstruments)}{' '}
          </Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
            {' '}
            Balance: {viewingStudentBalance} Tickets{' '}
          </Text>

          {}
          <View style={{ marginTop: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            <Button
              title={`Assign Task to ${studentDisplayName}`}
              onPress={() => handleInitiateAssignTaskForStudent(viewingStudentUser.id)}
              disabled={!isStudentActive}
            />
          </View>

          {}
          <Text style={appSharedStyles.sectionTitle}> Assigned Tasks ({totalTasksCount}) </Text>
          {totalTasksCount > 0 ? (
            <FlatList
              data={paginatedTasks} 
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const allowDelete =
                  (!item.isComplete || item.verificationStatus === 'pending') && isStudentActive;
                const allowVerify =
                  item.isComplete && item.verificationStatus === 'pending' && isStudentActive;
                const taskStatus = item.isComplete
                  ? item.verificationStatus === 'pending'
                    ? 'Complete (Pending Verification)'
                    : `Verified (${item.verificationStatus || 'status unknown'})`
                  : 'Assigned';
                return (
                  <View style={adminSharedStyles.taskItem}>
                    <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
                    <Text style={adminSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
                    {item.completedDate && (
                      <Text style={appSharedStyles.itemDetailText}>
                        Completed: {new Date(item.completedDate).toLocaleDateString()}
                      </Text>
                    )}
                    {item.verifiedDate && item.verificationStatus !== 'pending' && (
                      <Text style={appSharedStyles.itemDetailText}>
                        Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                      </Text>
                    )}
                    {item.actualPointsAwarded !== undefined &&
                      item.verificationStatus !== 'pending' && (
                        <Text style={adminSharedStyles.taskItemTickets}>
                          Awarded: {item.actualPointsAwarded ?? 0} Tickets
                        </Text>
                      )}
                    {item.isComplete && item.verificationStatus === 'pending' && (
                      <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                    )}
                    <View style={adminSharedStyles.assignedTaskActions}>
                      {allowVerify && (
                        <Button
                          title="Verify Task"
                          onPress={() => onInitiateVerificationModal(item)}
                        />
                      )}
                      {allowDelete && (
                        <Button
                          title="Remove"
                          onPress={() => handleRemoveAssignedTask(item.id)}
                          color={colors.danger}
                        />
                      )}
                    </View>
                  </View>
                );
              }}
              scrollEnabled={false} 
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={() => (
                <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
              )}
              
              ListFooterComponent={
                tasksTotalPages > 1 ? (
                  <PaginationControls
                    currentPage={tasksCurrentPage}
                    totalPages={tasksTotalPages}
                    onPageChange={setTasksPage}
                  />
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          ) : (
            <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
          )}

          {}
          <Text style={appSharedStyles.sectionTitle}>
            History (Recent - {totalHistoryCount} Total)
          </Text>
          {totalHistoryCount > 0 ? (
            <Text style={{ fontStyle: 'italic', color: colors.textLight, marginBottom: 10 }}>
              (Pagination controls would go here for history)
            </Text>
          ) : (
            <Text style={appSharedStyles.emptyListText}>No history found.</Text>
          )}

          {}
          <View
            style={{
              marginTop: 20,
              marginBottom: 20,
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}
          >
            <Button
              title="View Catalog (Mock)"
              onPress={() => alert(`Mock View Catalog in ${studentDisplayName}'s context`)}
            />
          </View>
        </ScrollView>
        {}
        <AssignTaskModal
          visible={isAssignTaskModalVisible}
          onClose={handleAssignTaskModalClose}
          allStudents={studentsLinkedToTeacher.filter(s => s.isActive)}
          taskLibrary={taskLibrary}
          onAssignTask={handleAssignTaskConfirm}
          preselectedStudentId={assignTaskTargetStudentId}
        />
      </SafeAreaView>
    );
  }

  
  const teacherDisplayName = getUserDisplayName(teacherUser);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {}
      <View style={appSharedStyles.headerContainer}>
        <Text style={appSharedStyles.header}>Teacher: {teacherDisplayName}</Text>
      </View>
      <ScrollView style={appSharedStyles.container}>
        {}
        <View style={styles.teacherNav}>
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="My Students"
            onPress={() => setViewingSection('students')}
            color={viewingSection === 'students' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setViewingSection('tasks')}
            color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
          />
        </View>

        {}
        {viewingSection === 'dashboard' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              {' '}
              Pending Verifications ({pendingVerifications.length}){' '}
            </Text>
            {pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort(
                  (a, b) =>
                    new Date(a.completedDate || a.assignedDate).getTime() -
                    new Date(b.completedDate || b.assignedDate).getTime()
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const studentInfo = allStudents.find(s => s.id === item.studentId);
                  return (
                    <PendingVerificationItem
                      task={item}
                      studentName={studentInfo?.name || 'Unknown Student'}
                      onInitiateVerification={onInitiateVerificationModal}
                    />
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            )}
          </View>
        )}

        {}
        {viewingSection === 'students' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              {' '}
              My Students ({studentsLinkedToTeacher.length}){' '}
            </Text>
            {studentsLinkedToTeacher.length > 0 ? (
              <FlatList
                data={studentsLinkedToTeacher}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <StudentListItem
                    student={item}
                    mockInstruments={mockInstruments}
                    onViewProfile={id => {
                      setViewingStudentId(id);
                      setViewingSection('studentProfile');
                    }}
                    onAssignTask={handleInitiateAssignTaskForStudent}
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No students linked to you.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>
                {' '}
                No students linked to you. Ask an Admin to link your students.{' '}
              </Text>
            )}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button
                title="View All Students (Mock)"
                onPress={() =>
                  alert('View All Students - Simulate viewing a list of all students.')
                }
              />
            </View>
          </View>
        )}

        {}
        {viewingSection === 'tasks' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
              <Button title="Assign Task" onPress={handleInitiateAssignTaskGeneral} />
            </View>
            <Text style={adminSharedStyles.sectionSubTitle}>
              {' '}
              Task Library ({taskLibrary.length}){' '}
            </Text>
            {taskLibrary.length > 0 ? (
              <FlatList
                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {}
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        allStudents={studentsLinkedToTeacher.filter(s => s.isActive)}
        taskLibrary={taskLibrary}
        onAssignTask={handleAssignTaskConfirm}
        preselectedStudentId={assignTaskTargetStudentId}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  teacherNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  studentActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, gap: 5 },
  taskLibraryItemTickets: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  inactiveItemStyle: {
    
    borderColor: colors.secondary,
    opacity: 0.7,
  },
});
