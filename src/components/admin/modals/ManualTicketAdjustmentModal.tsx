// src/components/admin/modals/ManualTicketAdjustmentModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // Added useQuery
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';

// Import Supabase API for fetching balance
import { fetchStudentBalance, adjustTickets } from '../../../api/tickets'; // Keep adjustTickets for type, though it's deferred

import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { ManualTicketAdjustmentModalProps } from '../../../types/componentProps'; // Uses updated props
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  const { currentUserId: adminUserId } = useAuth(); // Get admin ID for potential future use
  const queryClient = useQueryClient();

  // State for the form
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubtracting, setIsSubtracting] = useState(false);

  // --- Fetch Current Balance ---
  const {
      data: currentBalance = 0, // Default to 0 while loading/error
      isLoading: balanceLoading,
      isError: balanceError,
      error: balanceErrorMsg,
      // We might want to refetch balance if modal stays open after an action elsewhere
      // refetch: refetchBalance,
  } = useQuery<number, Error>({
      queryKey: ['balance', studentId, { context: 'adjustmentModal' }], // Include context in key
      queryFn: () => fetchStudentBalance(studentId),
      enabled: visible && !!studentId, // Fetch only when modal is visible and ID exists
      staleTime: 30 * 1000, // Shorter stale time as balance might change
      gcTime: 2 * 60 * 1000,
  });
  // --- End Balance Fetch ---


  // Mutation definition (points to deferred API)
  // We keep this definition for potential UI state changes, but don't call mutate
  const mutation = useMutation({
    mutationFn: adjustTickets,
    // onSuccess/onError won't be called as mutate is disabled/errors out
    // We might add specific handling here later if needed
  });

  // Reset form state when modal opens
  useEffect(() => {
    if (visible) {
      setAmount('');
      setNotes('');
      setIsSubtracting(false);
      mutation.reset();
      // Invalidate balance query on open to ensure freshness? Optional.
      // queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
    }
  }, [visible, studentId]); // Add studentId dependency

  // Handler for the adjust button - NOW IT WILL SHOW ERROR/ALERT
  const handleAdjust = () => {
    if (!adminUserId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Adjuster ID not found.' });
      return;
    }
    if (amount === '' || isNaN(Number(amount)) || Number(amount) <= 0) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid positive amount.' });
      return;
    }
    if (!notes.trim()) {
       Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a reason (notes).' });
      return;
    }

    const adjustmentAmount = isSubtracting ? -Number(amount) : Number(amount);

    // Check sufficient balance *before* attempting deferred API call
    if (isSubtracting && currentBalance < Number(amount)) {
      Toast.show({ type: 'error', text1: 'Insufficient Balance', text2: `${studentName} only has ${currentBalance} tickets.` });
      return;
    }

    // --- DEFERRED ACTION ---
    // Show a message indicating feature is not yet implemented instead of calling mutate
    Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Ticket adjustment requires server-side logic (Edge Function).',
        visibilityTime: 5000,
    });
    console.warn("Attempted to adjust tickets, but API implementation is deferred.");
    // mutation.mutate({ // DO NOT CALL MUTATE YET
    //   studentId,
    //   amount: adjustmentAmount,
    //   notes: notes.trim(),
    //   adjusterId: adminUserId,
    // });
    // --- END DEFERRED ACTION ---
  };

  // Calculate preview based on fetched balance
  const numericAmount = Number(amount);
  const newBalancePreview =
    balanceLoading || balanceError || isNaN(numericAmount) || amount === ''
      ? '...' // Show placeholder if balance loading/error or amount invalid
      : currentBalance + (isSubtracting ? -numericAmount : numericAmount);

  const actionText = isSubtracting ? 'Subtract' : 'Add';
  // Always disable confirm button because API is deferred
  const confirmButtonText = `${actionText} Tickets (Disabled)`;
  const isConfirmDisabled = true; // Always disable for now
  // Alternatively, disable based on validation:
  // const isConfirmDisabled = mutation.isPending || amount === '' || isNaN(Number(amount)) || Number(amount) <= 0 || !notes.trim() || balanceLoading || balanceError;


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Manual Ticket Adjustment</Text>
          <Text style={modalSharedStyles.modalContextInfo}>Student: {studentName}</Text>
          <Text style={modalSharedStyles.modalContextInfo}>
            Current Balance: {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
           {balanceError && <Text style={commonSharedStyles.errorText}>{balanceErrorMsg?.message}</Text>}

          <View style={modalSharedStyles.modalToggleContainer}>
            <Button
              title="Add Tickets"
              onPress={() => setIsSubtracting(false)}
              color={!isSubtracting ? colors.primary : colors.secondary}
              disabled={mutation.isPending || balanceLoading} // Disable toggle while loading balance too
            />
            <Button
              title="Subtract Tickets"
              onPress={() => setIsSubtracting(true)}
              color={isSubtracting ? colors.warning : colors.secondary}
              disabled={mutation.isPending || balanceLoading}
            />
          </View>

          <Text style={commonSharedStyles.label}>Amount to {actionText}:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={String(amount)}
            onChangeText={text =>
              setAmount(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || '')
            }
            placeholder="Enter amount (e.g., 100)"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            editable={!mutation.isPending && !balanceLoading} // Disable while loading/mutating
          />
          <Text style={commonSharedStyles.label}>Reason / Notes:</Text>
          <TextInput
            style={commonSharedStyles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder={`Reason for ${isSubtracting ? 'subtracting' : 'adding'} tickets...`}
            placeholderTextColor={colors.textLight}
            multiline={true}
            numberOfLines={3}
            editable={!mutation.isPending && !balanceLoading}
          />
          <Text style={modalSharedStyles.previewText}>
            New Balance Preview: {newBalancePreview} Tickets
          </Text>

          {/* Remove mutation loading/error display as it's disabled */}
          {/* {mutation.isPending && ... } */}
          {/* {mutation.isError && ... } */}

          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={confirmButtonText}
              onPress={handleAdjust} // Still calls validation and shows info toast
              color={isSubtracting ? colors.warning : colors.success}
              disabled={isConfirmDisabled} // Always disabled for now
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending} // Keep disabled if mutation *could* run
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ManualTicketAdjustmentModal;