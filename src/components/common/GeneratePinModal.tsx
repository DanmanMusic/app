import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { generatePinForUser } from '../../api/users';

import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface GeneratePinModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

export const GeneratePinModal: React.FC<GeneratePinModalProps> = ({ visible, user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  const [generatedForRole, setGeneratedForRole] = useState<UserRole | 'parent' | null>(null);

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

  const handleGeneratePin = async (generateAsRole: UserRole | 'parent') => {
    if (!user || isLoading) return;

    const roleToSendToApi = generateAsRole;

    setGeneratedForRole(roleToSendToApi);
    setIsLoading(true);
    setGeneratedPin(null);

    try {
      console.log(
        `[GeneratePinModal] Calling API to generate PIN for user ${user.id} (User Role: ${user.role}), intended login role: ${roleToSendToApi}`
      );

      const pinFromApi = await generatePinForUser(user.id, roleToSendToApi);

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
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Generate Login PIN</Text>
          <Text style={modalSharedStyles.modalContextInfo}>
            For User: {displayName} ({userActualRole})
          </Text>

          {}
          {isLoading && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Generating PIN...</Text>
            </View>
          )}

          {}
          {generatedPin && !isLoading && (
            <View style={styles.pinDisplayContainer}>
              {}
              <Text style={styles.pinLabel}>Generated PIN for {generatedForRole}:</Text>
              <Text style={styles.pinValue}>{generatedPin}</Text>
              <Text style={styles.pinInstructions}>
                Provide this PIN to the {generatedForRole} for login. It will expire shortly.
              </Text>
            </View>
          )}

          {}
          {!generatedPin && !isLoading && (
            <View style={modalSharedStyles.buttonContainer}>
              {}
              {}
              {(userActualRole === 'student' ||
                userActualRole === 'teacher' ||
                userActualRole === 'admin') && (
                <Button
                  title={`Generate PIN for ${userActualRole.charAt(0).toUpperCase() + userActualRole.slice(1)} Login`}
                  onPress={() => handleGeneratePin(userActualRole)}
                  disabled={isLoading}
                />
              )}

              {}
              {userActualRole === 'student' && (
                <Button
                  title={`Generate PIN for Parent Login`}
                  onPress={() => handleGeneratePin('parent')}
                  disabled={isLoading}
                  color={colors.success}
                />
              )}
            </View>
          )}

          {}
          <View style={modalSharedStyles.footerButton}>
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

const styles = StyleSheet.create({
  pinDisplayContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 15,
    backgroundColor: colors.backgroundHighlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  pinLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
    fontWeight: '600',
  },
  pinValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 3,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  pinInstructions: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default GeneratePinModal;
