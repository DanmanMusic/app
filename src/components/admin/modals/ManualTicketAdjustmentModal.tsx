// src/components/admin/modals/ManualTicketAdjustmentModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { fetchStudentBalance, adjustTickets } from '../../../api/tickets';

import { ManualTicketAdjustmentModalProps } from '../../../types/componentProps';

import { colors } from '../../../styles/colors';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

export const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubtracting, setIsSubtracting] = useState(false);

  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
    refetch: refetchBalance,
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'adjustmentModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId,
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: adjustTickets,
    onSuccess: data => {
      console.log('[AdjustModal] Ticket adjustment successful:', data);
      Toast.show({ type: 'success', text1: 'Success!', text2: data.message });

      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId: studentId }] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });

      queryClient.setQueryData(
        ['balance', studentId, { context: 'adjustmentModal' }],
        data.newBalance
      );

      onClose();
    },
    onError: (error: Error) => {
      console.error('[AdjustModal] Ticket adjustment failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Adjustment Failed',
        text2: error.message || 'Could not adjust tickets.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible && studentId) {
      setAmount('');
      setNotes('');
      setIsSubtracting(false);
      mutation.reset();
      refetchBalance();
    }
  }, [visible, studentId, refetchBalance]);

  const handleAdjust = () => {
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
    if (mutation.isPending) return;

    const adjustmentAmount = isSubtracting ? -Number(amount) : Number(amount);

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
      amount: adjustmentAmount,
      notes: notes.trim(),
    });
  };

  const numericAmount = Number(amount);
  const newBalancePreview =
    balanceLoading || balanceError || isNaN(numericAmount) || amount === ''
      ? '...'
      : currentBalance + (isSubtracting ? -numericAmount : numericAmount);

  const actionText = isSubtracting ? 'Subtract' : 'Add';
  const confirmButtonText = mutation.isPending ? 'Processing...' : `${actionText} Tickets`;

  const isConfirmDisabled =
    balanceLoading || mutation.isPending || amount === '' || Number(amount) <= 0 || !notes.trim();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Manual Ticket Adjustment</Text>
          <Text style={commonSharedStyles.modalContextInfo}>Student: {studentName}</Text>
          <Text style={commonSharedStyles.modalContextInfo}>
            Current Balance:{' '}
            {balanceLoading ? 'Loading...' : balanceError ? 'Error' : `${currentBalance} Tickets`}
          </Text>
          {balanceError && (
            <Text style={commonSharedStyles.errorText}>
              Balance Error: {balanceErrorMsg?.message}
            </Text>
          )}

          {/* Add/Subtract Toggle */}
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.full,
              { justifyContent: 'space-around', marginBottom: 15 },
            ]}
          >
            <Button
              title="Add Tickets"
              onPress={() => setIsSubtracting(false)}
              color={!isSubtracting ? colors.primary : colors.secondary}
              disabled={mutation.isPending || balanceLoading || balanceError}
            />
            <Button
              title="Subtract Tickets"
              onPress={() => setIsSubtracting(true)}
              color={isSubtracting ? colors.warning : colors.secondary}
              disabled={mutation.isPending || balanceLoading || balanceError}
            />
          </View>

          {/* Form Inputs */}
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
          <Text style={commonSharedStyles.previewText}>
            New Balance Preview: {newBalancePreview} Tickets
          </Text>

          {/* Mutation Status */}
          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Adjusting Tickets...</Text>
            </View>
          )}
          {mutation.isError && !mutation.isPending && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
              Error:{' '}
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to adjust tickets'}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={commonSharedStyles.full}>
            <Button
              title={confirmButtonText}
              onPress={handleAdjust}
              color={isSubtracting ? colors.warning : colors.success}
              disabled={isConfirmDisabled}
            />
          </View>
          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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

export default ManualTicketAdjustmentModal;
