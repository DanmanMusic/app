import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, TextInput, ActivityIndicator, Alert } from 'react-native';
import { adjustTickets } from '../../../api/tickets';
import { useAuth } from '../../../contexts/AuthContext';
import { colors } from '../../../styles/colors';
import { ManualTicketAdjustmentModalProps } from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../../styles/commonSharedStyles';

const ManualTicketAdjustmentModal: React.FC<ManualTicketAdjustmentModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  currentBalance,
}) => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubtracting, setIsSubtracting] = useState(false);

  const mutation = useMutation({
    mutationFn: adjustTickets,
    onSuccess: createdTransaction => {
      console.log('Ticket adjustment successful via mutation:', createdTransaction);

      queryClient.invalidateQueries({ queryKey: ['balance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId }] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      Alert.alert('Success', `Tickets adjusted successfully for ${studentName}.`);
      onClose();
    },
    onError: error => {
      console.error('Error adjusting tickets via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to adjust tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
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

    if (isSubtracting && currentBalance < Number(amount)) {
      Alert.alert(
        'Insufficient Balance',
        `${studentName} only has ${currentBalance} tickets. Cannot subtract ${Number(amount)}.`
      );
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
  const newBalancePreview =
    isNaN(numericAmount) || amount === ''
      ? currentBalance
      : currentBalance + (isSubtracting ? -numericAmount : numericAmount);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Manual Ticket Adjustment</Text>
          <Text style={modalSharedStyles.modalContextInfo}>Student: {studentName}</Text>
          <Text style={modalSharedStyles.modalContextInfo}>
            Current Balance: {currentBalance} Tickets
          </Text>

          <View style={modalSharedStyles.modalToggleContainer}>
            <Button
              title="Add Tickets"
              onPress={() => setIsSubtracting(false)}
              color={!isSubtracting ? colors.primary : colors.secondary}
              disabled={mutation.isPending}
            />
            <Button
              title="Subtract Tickets"
              onPress={() => setIsSubtracting(true)}
              color={isSubtracting ? colors.warning : colors.secondary}
              disabled={mutation.isPending}
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
            editable={!mutation.isPending}
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
            editable={!mutation.isPending}
          />
          <Text style={modalSharedStyles.previewText}>
            New Balance Preview: {newBalancePreview} Tickets
          </Text>
          {mutation.isPending && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Adjusting Tickets...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={commonSharedStyles.errorText}>
              Error:
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to adjust tickets'}
            </Text>
          )}
          <View style={modalSharedStyles.buttonContainer}>
            <Button
              title={confirmButtonText}
              onPress={handleAdjust}
              color={isSubtracting ? colors.warning : colors.success}
              disabled={
                mutation.isPending ||
                amount === '' ||
                isNaN(Number(amount)) ||
                Number(amount) <= 0 ||
                !notes.trim()
              }
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
