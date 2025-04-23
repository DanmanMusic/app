// src/components/admin/modals/ManualTicketAdjustmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ActivityIndicator,
  Alert, // Keep for now
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// API & Types
import { adjustTickets } from '../../../api/tickets';
import { TicketTransaction } from '../../../mocks/mockTickets'; // For return type

// Context (for getting adjuster ID)
import { useAuth } from '../../../contexts/AuthContext';

// Utils & Styles
import { colors } from '../../../styles/colors';

interface ManualTicketAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentBalance: number;
}

const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  currentBalance,
}) => {
  const { currentUserId } = useAuth(); // Get admin/teacher ID performing adjustment
  const queryClient = useQueryClient();

  // Form State
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubtracting, setIsSubtracting] = useState(false); // Toggle add/subtract

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: adjustTickets, // API function expects { studentId, amount, notes, adjusterId }
    onSuccess: (createdTransaction) => {
      console.log('Ticket adjustment successful via mutation:', createdTransaction);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] }); // Invalidate student balance
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId }] }); // Invalidate student history
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Invalidate global history
      Alert.alert('Success', `Tickets adjusted successfully for ${studentName}.`);
      onClose(); // Close modal on success
    },
    onError: (error) => {
      console.error('Error adjusting tickets via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to adjust tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Keep modal open on error
    },
  });

  // Reset form when modal visibility or student changes
  useEffect(() => {
    if (visible) {
      setAmount('');
      setNotes('');
      setIsSubtracting(false);
      mutation.reset();
    }
  }, [visible, studentId]);

  const handleAdjust = () => {
    if (!currentUserId) {
      Alert.alert('Error', 'Adjuster ID not found. Cannot perform adjustment.');
      return;
    }
    if (amount === '' || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }
    if (!notes.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason (notes) for the adjustment.');
      return;
    }

    const adjustmentAmount = isSubtracting ? -Number(amount) : Number(amount);

    // Check for sufficient balance if subtracting
    if (isSubtracting && currentBalance < Number(amount)) {
        Alert.alert('Insufficient Balance', `${studentName} only has ${currentBalance} tickets. Cannot subtract ${Number(amount)}.`);
        return;
    }


    mutation.mutate({
      studentId,
      amount: adjustmentAmount,
      notes: notes.trim(),
      adjusterId: currentUserId,
    });
  };

  const numericAmount = Number(amount);
  const actionText = isSubtracting ? 'Subtract' : 'Add';
  const confirmButtonText = mutation.isPending ? 'Adjusting...' : `${actionText} Tickets`;
  const newBalancePreview = isNaN(numericAmount) || amount === '' ? currentBalance : currentBalance + (isSubtracting ? -numericAmount : numericAmount);


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Manual Ticket Adjustment</Text>
          <Text style={modalStyles.studentInfo}>Student: {studentName}</Text>
          <Text style={modalStyles.studentInfo}>Current Balance: {currentBalance} Tickets</Text>

          <View style={modalStyles.toggleContainer}>
              <Button title="Add Tickets" onPress={() => setIsSubtracting(false)} color={!isSubtracting ? colors.primary : colors.secondary} disabled={mutation.isPending}/>
              <Button title="Subtract Tickets" onPress={() => setIsSubtracting(true)} color={isSubtracting ? colors.warning : colors.secondary} disabled={mutation.isPending}/>
          </View>


          <Text style={modalStyles.label}>Amount to {actionText}:</Text>
          <TextInput
            style={modalStyles.input}
            value={String(amount)}
            onChangeText={text => setAmount(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || '')}
            placeholder="Enter amount (e.g., 100)"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            editable={!mutation.isPending}
          />

          <Text style={modalStyles.label}>Reason / Notes:</Text>
          <TextInput
            style={modalStyles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder={`Reason for ${isSubtracting ? 'subtracting' : 'adding'} tickets...`}
            placeholderTextColor={colors.textLight}
            multiline={true}
            numberOfLines={3}
            editable={!mutation.isPending}
          />

           <Text style={modalStyles.previewText}>
                New Balance Preview: {newBalancePreview} Tickets
           </Text>

          {/* Loading Indicator */}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalStyles.loadingText}>Adjusting Tickets...</Text>
            </View>
          )}

          {/* Error Message */}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Failed to adjust tickets'}
            </Text>
          )}

          <View style={modalStyles.buttonContainer}>
            <Button
              title={confirmButtonText}
              onPress={handleAdjust}
              color={isSubtracting ? colors.warning : colors.success}
              disabled={mutation.isPending || amount === '' || isNaN(Number(amount)) || Number(amount) <= 0 || !notes.trim()}
            />
          </View>
          <View style={modalStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Styles ---
const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', },
  modalView: { margin: 20, backgroundColor: colors.backgroundPrimary, borderRadius: 10, padding: 20, alignItems: 'stretch', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%', maxWidth: 450, },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.textPrimary, width: '100%', borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, paddingBottom: 10, },
  studentInfo: { fontSize: 16, marginBottom: 5, color: colors.textSecondary, textAlign: 'center', },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15, },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: colors.textPrimary, },
  input: { borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 10, },
  textArea: { minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 5, padding: 10, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary, marginBottom: 10, },
  previewText: { fontSize: 14, fontStyle: 'italic', color: colors.textLight, textAlign: 'center', marginBottom: 15, },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 5, height: 20, },
  loadingText: { marginLeft: 10, fontSize: 14, color: colors.textSecondary, },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 10, marginBottom: 5, fontSize: 14, minHeight: 18, },
  buttonContainer: { marginTop: 10, marginBottom: 10, },
  footerButton: { marginTop: 10, },
});

export default ManualTicketAdjustmentModal;