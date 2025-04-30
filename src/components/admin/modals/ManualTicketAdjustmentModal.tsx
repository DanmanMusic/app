// src/components/admin/modals/ManualTicketAdjustmentModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

// API Imports
import { fetchStudentBalance, adjustTickets } from '../../../api/tickets'; // Use updated adjustTickets

// Context & Type Imports
// import { useAuth } from '../../../contexts/AuthContext'; // No longer need adjusterId from context
import { ManualTicketAdjustmentModalProps } from '../../../types/componentProps';

// Style Imports
import { colors } from '../../../styles/colors';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

export const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  // const { currentUserId: adminUserId } = useAuth(); // Adjuster ID comes from token now
  const queryClient = useQueryClient();

  // State for the form
  const [amount, setAmount] = useState<number | ''>(''); // Amount to add/subtract
  const [notes, setNotes] = useState(''); // Reason for adjustment
  const [isSubtracting, setIsSubtracting] = useState(false); // Mode toggle

  // Query for current balance display
  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
    refetch: refetchBalance, // Function to refetch balance
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'adjustmentModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId, // Only fetch when modal visible and studentId set
    staleTime: 0, // Fetch fresh balance on open
    gcTime: 2 * 60 * 1000,
  });

  // Mutation hook for adjusting tickets (calls API -> Edge Function)
  const mutation = useMutation({
    mutationFn: adjustTickets, // Use the API function that calls the Edge Function
    onSuccess: data => {
      // Data is { message, transaction, newBalance }
      console.log('[AdjustModal] Ticket adjustment successful:', data);
      Toast.show({ type: 'success', text1: 'Success!', text2: data.message });

      // Invalidate queries to update UI elsewhere
      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId: studentId }] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Global history

      // Optional: Immediately update the balance query data for this modal
      queryClient.setQueryData(
        ['balance', studentId, { context: 'adjustmentModal' }],
        data.newBalance
      );

      onClose(); // Close modal on success
    },
    onError: (error: Error) => {
      console.error('[AdjustModal] Ticket adjustment failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Adjustment Failed',
        text2: error.message || 'Could not adjust tickets.', // Show error from Edge Function
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  // Effect to reset form when modal opens or student changes
  useEffect(() => {
    if (visible && studentId) {
      setAmount('');
      setNotes('');
      setIsSubtracting(false);
      mutation.reset();
      refetchBalance(); // Fetch fresh balance on open
    }
    // No cleanup needed when hiding, as state is reset on visible=true
  }, [visible, studentId, refetchBalance]); // Rerun if visibility or student changes

  // Handler for confirm button press
  const handleAdjust = () => {
    // Basic client-side validation (Edge function does more thorough checks)
    if (amount === '' || isNaN(Number(amount)) || Number(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid positive amount.',
      });
      return;
    }
    if (!notes.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a reason (notes).',
      });
      return;
    }
    if (mutation.isPending) return; // Prevent double submit

    const adjustmentAmount = isSubtracting ? -Number(amount) : Number(amount);

    // Client-side check for subtraction (optional, Edge Func also checks)
    if (isSubtracting && !balanceLoading && !balanceError && currentBalance < Number(amount)) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `${studentName} only has ${currentBalance} tickets.`,
      });
      return;
    }

    console.log(`[AdjustModal] Initiating ticket adjustment mutation. Amount: ${adjustmentAmount}`);
    mutation.mutate({
      studentId: studentId,
      amount: adjustmentAmount, // Send positive or negative value
      notes: notes.trim(),
      // adjusterId is handled by Edge Function
    });
  };

  // Calculate preview (handle loading/error states)
  const numericAmount = Number(amount);
  const newBalancePreview =
    balanceLoading || balanceError || isNaN(numericAmount) || amount === ''
      ? '...' // Show loading/error indicator
      : currentBalance + (isSubtracting ? -numericAmount : numericAmount);

  // Determine button text and disable state
  const actionText = isSubtracting ? 'Subtract' : 'Add';
  const confirmButtonText = mutation.isPending ? 'Processing...' : `${actionText} Tickets`;
  // Disable if loading balance, mutation pending, or form invalid
  const isConfirmDisabled =
    balanceLoading || mutation.isPending || amount === '' || Number(amount) <= 0 || !notes.trim();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Manual Ticket Adjustment</Text>
          <Text style={modalSharedStyles.modalContextInfo}>Student: {studentName}</Text>
          <Text style={modalSharedStyles.modalContextInfo}>
            Current Balance:{' '}
            {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
          {balanceError && (
            <Text style={commonSharedStyles.errorText}>
              Balance Error: {balanceErrorMsg?.message}
            </Text>
          )}

          {/* Add/Subtract Toggle */}
          <View style={modalSharedStyles.modalToggleContainer}>
            <Button
              title="Add Tickets"
              onPress={() => setIsSubtracting(false)}
              color={!isSubtracting ? colors.primary : colors.secondary}
              disabled={mutation.isPending || balanceLoading || balanceError} // Also disable if balance error
            />
            <Button
              title="Subtract Tickets"
              onPress={() => setIsSubtracting(true)}
              color={isSubtracting ? colors.warning : colors.secondary}
              disabled={mutation.isPending || balanceLoading || balanceError} // Also disable if balance error
            />
          </View>

          {/* Form Inputs */}
          <Text style={commonSharedStyles.label}>Amount to {actionText}:</Text>
          <TextInput
            style={commonSharedStyles.input}
            value={String(amount)} // Ensure value is string for input
            onChangeText={text =>
              setAmount(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || '')
            } // Allow only positive integers
            placeholder="Enter amount (e.g., 100)"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            editable={!mutation.isPending && !balanceLoading && !balanceError}
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
            editable={!mutation.isPending && !balanceLoading && !balanceError}
          />

          {/* New Balance Preview */}
          <Text style={modalSharedStyles.previewText}>
            New Balance Preview: {newBalancePreview} Tickets
          </Text>

          {/* Mutation Status */}
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Adjusting Tickets...</Text>
            </View>
          )}
          {mutation.isError &&
            !mutation.isPending && ( // Show error only if not pending
              <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
                Error:{' '}
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Failed to adjust tickets'}
              </Text>
            )}

          {/* Action Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={confirmButtonText}
              onPress={handleAdjust}
              color={isSubtracting ? colors.warning : colors.success}
              disabled={isConfirmDisabled}
            />
          </View>
          <View style={modalSharedStyles.footerButton}>
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

// Keep existing styles if needed, or remove if unused
// const styles = StyleSheet.create({ ... });

export default ManualTicketAdjustmentModal;
