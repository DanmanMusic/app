import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { generatePinForUser } from '../../api/users';

import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';

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

        text1: `Generated PIN for ${generatedForRole}`,
        text2: `Tell ${generatedForRole === 'parent' ? 'Parent' : getUserDisplayName(user)} to use: ${pinFromApi}`,
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

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={appSharedStyles.centeredView}>
        <View style={appSharedStyles.modalView}>
          <Text style={appSharedStyles.modalTitle}>Generate Login PIN</Text>
          <Text style={appSharedStyles.modalContextInfo}>
            For User: {displayName} ({userActualRole})
          </Text>

          {isLoading && (
            <View style={appSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={appSharedStyles.loadingText}>Generating PIN...</Text>
            </View>
          )}

          {generatedPin && !isLoading && (
            <View style={appSharedStyles.pinDisplayContainer}>
              <Text style={appSharedStyles.pinLabel}>Generated PIN for {generatedForRole}:</Text>
              <Text style={appSharedStyles.pinValue}>{generatedPin}</Text>
              <Text style={appSharedStyles.pinInstructions}>
                Provide this PIN to the {generatedForRole} for login. It will expire shortly.
              </Text>
            </View>
          )}

          {!generatedPin && !isLoading && (
            <View style={appSharedStyles.buttonContainer}>
              {(userActualRole === 'student' ||
                userActualRole === 'teacher' ||
                userActualRole === 'admin') && (
                <Button
                  title={`Generate PIN for ${userActualRole.charAt(0).toUpperCase() + userActualRole.slice(1)} Login`}
                  onPress={() => handleGeneratePin(userActualRole)}
                  disabled={isLoading}
                />
              )}
            </View>
          )}

          <View style={appSharedStyles.footerButton}>
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
