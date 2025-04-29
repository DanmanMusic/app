import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator } from 'react-native';

import { fetchStudentBalance, adjustTickets } from '../../../api/tickets';

import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { ManualTicketAdjustmentModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  const { currentUserId: adminUserId } = useAuth();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubtracting, setIsSubtracting] = useState(false);

  const {
    data: currentBalance = 0,
    isLoading: balanceLoading,
    isError: balanceError,
    error: balanceErrorMsg,
  } = useQuery<number, Error>({
    queryKey: ['balance', studentId, { context: 'adjustmentModal' }],
    queryFn: () => fetchStudentBalance(studentId),
    enabled: visible && !!studentId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: adjustTickets,
  });

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNotes('');
      setIsSubtracting(false);
      mutation.reset();
    }
  }, [visible, studentId]);

  const handleAdjust = () => {
    if (!adminUserId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Adjuster ID not found.' });
      return;
    }
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

    const adjustmentAmount = isSubtracting ? -Number(amount) : Number(amount);

    if (isSubtracting && currentBalance < Number(amount)) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `${studentName} only has ${currentBalance} tickets.`,
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Feature Not Implemented',
      text2: 'Ticket adjustment requires server-side logic (Edge Function).',
      visibilityTime: 5000,
    });
    console.warn('Attempted to adjust tickets, but API implementation is deferred.');
  };

  const numericAmount = Number(amount);
  const newBalancePreview =
    balanceLoading || balanceError || isNaN(numericAmount) || amount === ''
      ? '...'
      : currentBalance + (isSubtracting ? -numericAmount : numericAmount);

  const actionText = isSubtracting ? 'Subtract' : 'Add';

  const confirmButtonText = `${actionText} Tickets (Disabled)`;
  const isConfirmDisabled = true;

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
            <Text style={commonSharedStyles.errorText}>{balanceErrorMsg?.message}</Text>
          )}

          <View style={modalSharedStyles.modalToggleContainer}>
            <Button
              title="Add Tickets"
              onPress={() => setIsSubtracting(false)}
              color={!isSubtracting ? colors.primary : colors.secondary}
              disabled={mutation.isPending || balanceLoading}
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
            editable={!mutation.isPending && !balanceLoading}
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

export default ManualTicketAdjustmentModal;
