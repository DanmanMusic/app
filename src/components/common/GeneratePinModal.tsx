// File: src/components/common/GeneratePinModal.tsx (Refactored with Shared Styles)

import React, { useState, useEffect } from 'react';

import { Modal, View, Text, ActivityIndicator } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import ConfirmationModal from './ConfirmationModal';
import { generatePinForUser, hasActivePinSessions, forceUserLogout } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User, UserRole } from '../../types/dataTypes';
import { capitalizeFirstLetter, getUserDisplayName } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import { XCircleIcon } from 'react-native-heroicons/solid';

interface GeneratePinModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

export const GeneratePinModal: React.FC<GeneratePinModalProps> = ({ visible, user, onClose }) => {
  const queryClient = useQueryClient();
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [isConfirmLogoutVisible, setIsConfirmLogoutVisible] = useState(false);

  const { currentUserRole } = useAuth();

  const {
    data: hasSession,
    isLoading: isLoadingSessionCheck,
    refetch: refetchSessionCheck,
  } = useQuery({
    queryKey: ['hasPinSession', user?.id],
    queryFn: () => hasActivePinSessions(user!.id),
    enabled: !!user && visible,
    staleTime: 5 * 1000,
  });

  const forceLogoutMutation = useMutation({
    mutationFn: forceUserLogout,
    onSuccess: data => {
      Toast.show({ type: 'success', text1: 'Success', text2: data.message });
      queryClient.invalidateQueries({ queryKey: ['hasPinSession', user?.id] });
      setIsConfirmLogoutVisible(false);
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      setIsConfirmLogoutVisible(false);
    },
  });

  const generatePinMutation = useMutation({
    mutationFn: (role: UserRole) => generatePinForUser(user!.id, role),
    onSuccess: pinFromApi => {
      setGeneratedPin(pinFromApi);
      Toast.show({
        type: 'success',
        text1: 'Generated PIN',
        text2: `Tell the user to log in with: ${pinFromApi}`,
        visibilityTime: 20000,
        position: 'bottom',
      });
      refetchSessionCheck();
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'PIN Generation Failed',
        text2: error.message,
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (!visible) {
      setGeneratedPin(null);
      setIsConfirmLogoutVisible(false);
    }
  }, [visible]);

  const handleGeneratePin = (generateAsRole: UserRole) => {
    if (!user || generatePinMutation.isPending) return;
    setGeneratedPin(null);
    generatePinMutation.mutate(generateAsRole);
  };

  const handleForceLogout = () => {
    if (user && !forceLogoutMutation.isPending) {
      forceLogoutMutation.mutate(user.id);
    }
  };

  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const isActionPending =
    generatePinMutation.isPending || forceLogoutMutation.isPending || isLoadingSessionCheck;

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Session Management</Text>
            <Text style={commonSharedStyles.modalContextInfo}>
              For User: {displayName} ({user.role})
            </Text>

            <View style={commonSharedStyles.modalSubSection}>
              <Text style={commonSharedStyles.roleSectionTitle}>Active PIN Sessions</Text>
              {isLoadingSessionCheck ? (
                <ActivityIndicator />
              ) : hasSession ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Text style={commonSharedStyles.infoText}>
                    This user has one or more active PIN sessions.
                  </Text>
                  <CustomButton
                    title="Force Logout All Devices"
                    onPress={() => setIsConfirmLogoutVisible(true)}
                    color={colors.danger}
                    disabled={isActionPending}
                  />
                </View>
              ) : (
                <Text style={commonSharedStyles.infoText}>
                  No active PIN sessions found for this user.
                </Text>
              )}
            </View>

            {currentUserRole === 'admin' && (
              <View style={commonSharedStyles.modalSubSection}>
                <Text style={commonSharedStyles.roleSectionTitle}>Generate New Login PIN</Text>
                {generatePinMutation.isPending ? (
                  <ActivityIndicator />
                ) : generatedPin ? (
                  <View style={commonSharedStyles.containerPinDisplay}>
                    <Text style={commonSharedStyles.pinValue}>{generatedPin}</Text>
                    <Text style={commonSharedStyles.pinInstructions}>
                      This PIN expires in 5 minutes.
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <CustomButton
                      title={`Generate PIN for ${capitalizeFirstLetter(user.role)} Login`}
                      onPress={() => handleGeneratePin(user.role)}
                      disabled={isActionPending}
                      color={colors.info}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={[commonSharedStyles.full, { marginTop: 20 }]}>
              <CustomButton
                title="Close"
                onPress={onClose}
                color={colors.secondary}
                disabled={isActionPending}
                leftIcon={
                  <XCircleIcon
                    color={isActionPending ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={isConfirmLogoutVisible}
        title="Confirm Force Logout"
        message={`This will invalidate all active PIN sessions for "${displayName}", forcing them to log in again. Are you sure?`}
        confirmText={forceLogoutMutation.isPending ? 'Logging out...' : 'Yes, Force Logout'}
        onConfirm={handleForceLogout}
        onCancel={() => setIsConfirmLogoutVisible(false)}
        confirmDisabled={forceLogoutMutation.isPending}
      />
    </>
  );
};

export default GeneratePinModal;
