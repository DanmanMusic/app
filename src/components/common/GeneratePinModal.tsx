// src/components/common/GeneratePinModal.tsx
import React, { useState, useEffect } from 'react';

import { Modal, View, Text, Button, ActivityIndicator } from 'react-native';

import Toast from 'react-native-toast-message';

import { generatePinForUser } from '../../api/users';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { User, UserRole } from '../../types/dataTypes';
import { capitalizeFirstLetter, getUserDisplayName } from '../../utils/helpers';

interface GeneratePinModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

export const GeneratePinModal: React.FC<GeneratePinModalProps> = ({ visible, user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [generatedForRole, setGeneratedForRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!visible) {
      setGeneratedPin(null);
      setGeneratedForRole(null);
      setIsLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    setGeneratedPin(null);
    setGeneratedForRole(null);
    setIsLoading(false);
  }, [user]);

  const handleGeneratePin = async (generateAsRole: UserRole) => {
    if (!user || isLoading) return;

    setGeneratedForRole(generateAsRole);
    setIsLoading(true);
    setGeneratedPin(null);

    try {
      console.log(
        `[GeneratePinModal] Calling API to generate PIN for user ${user.id} (User Role: ${user.role}), intended login role: ${generateAsRole}`
      );
      const pinFromApi = await generatePinForUser(user.id, generateAsRole);

      setGeneratedPin(pinFromApi);
      Toast.show({
        type: 'success',
        text1: `Generated PIN for ${capitalizeFirstLetter(generateAsRole)}`,
        text2: `Tell ${generateAsRole === 'parent' ? 'Parent' : getUserDisplayName(user)} to use: ${pinFromApi}`,
        visibilityTime: 20000,
        position: 'bottom',
      });
      console.log(`[GeneratePinModal] Received PIN from API: ${pinFromApi}`);
    } catch (error: any) {
      console.error('Error generating PIN via API:', error);
      Toast.show({
        type: 'error',
        text1: 'PIN Generation Failed',
        text2: error.message || 'Could not generate PIN.',
        position: 'bottom',
        visibilityTime: 5000,
      });
      setGeneratedPin(null);
      setGeneratedForRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const userActualRole = user.role;
  const possibleTargetRoles: UserRole[] = [userActualRole];

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Generate Login PIN</Text>
          <Text style={commonSharedStyles.modalContextInfo}>
            For User: {displayName} ({userActualRole})
          </Text>

          {isLoading && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Generating PIN...</Text>
            </View>
          )}

          {generatedPin && !isLoading && generatedForRole && (
            <View style={commonSharedStyles.containerPinDisplay}>
              <Text style={commonSharedStyles.pinLabel}>
                Generated PIN for {capitalizeFirstLetter(generatedForRole)}:
              </Text>
              <Text style={commonSharedStyles.pinValue}>{generatedPin}</Text>
              <Text style={commonSharedStyles.pinInstructions}>
                Provide this PIN to the {generatedForRole === 'parent' ? 'Parent' : 'User'} for
                login. It will expire shortly.
              </Text>
            </View>
          )}

          {!generatedPin && !isLoading && (
            <View style={commonSharedStyles.full}>
              {possibleTargetRoles.map(targetRole => (
                <Button
                  key={targetRole}
                  title={`Generate PIN for ${capitalizeFirstLetter(targetRole)} Login`}
                  onPress={() => handleGeneratePin(targetRole)}
                  disabled={isLoading}
                  color={colors.info}
                />
              ))}
            </View>
          )}

          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
            <Button
              title={generatedPin ? 'Close' : 'Cancel'}
              onPress={onClose}
              color={colors.secondary}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default GeneratePinModal;
