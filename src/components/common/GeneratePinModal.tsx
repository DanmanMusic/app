// src/components/common/GeneratePinModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    Button,
    ActivityIndicator,
    StyleSheet,
    Platform,
    // Removed Alert as we use Toast/API calls now
} from 'react-native';
import Toast from 'react-native-toast-message';

// Import the new API function
import { generatePinForUser } from '../../api/users'; // Adjust path if needed

import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface GeneratePinModalProps {
  visible: boolean;
  user: User | null; // User for whom the PIN is generated
  onClose: () => void;
}

export const GeneratePinModal: React.FC<GeneratePinModalProps> = ({
  visible,
  user,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<'student' | 'parent' | null>(null);

  // Reset state when modal visibility or user changes
  useEffect(() => {
    if (!visible) {
      setGeneratedPin(null);
      setTargetRole(null);
      setIsLoading(false);
    }
  }, [visible]);

  useEffect(() => {
     // Reset generated PIN if the target user changes while modal is open
     setGeneratedPin(null);
     setTargetRole(null);
     setIsLoading(false); // Also reset loading if user changes
  }, [user]);


  // Updated handler to call the API function
  const handleGeneratePin = async (role: 'student' | 'parent') => {
    if (!user || isLoading) return; // Prevent multiple clicks or calls without user

    setTargetRole(role);
    setIsLoading(true);
    setGeneratedPin(null); // Clear previous pin

    try {
        console.log(`[GeneratePinModal] Calling API to generate PIN for user ${user.id}, target role: ${role}`);
        // Call the API function
        const pinFromApi = await generatePinForUser(user.id, role);

        setGeneratedPin(pinFromApi); // Display the PIN from the API response
        Toast.show({
            type: 'success',
            text1: `Generated PIN for ${role}`,
            text2: `Tell ${role === 'parent' ? 'Parent' : getUserDisplayName(user)} to use: ${pinFromApi}`,
            visibilityTime: 20000, // Show even longer for readability
            position: 'bottom',
        });
        console.log(`[GeneratePinModal] Received PIN from API: ${pinFromApi}`);

    } catch (error: any) {
        console.error("Error generating PIN via API:", error);
        Toast.show({
            type: 'error',
            text1: 'PIN Generation Failed',
            text2: error.message || 'Could not generate PIN.',
            position: 'bottom',
            visibilityTime: 5000,
        });
        setGeneratedPin(null); // Clear pin display on error
        setTargetRole(null); // Clear target role on error
    } finally {
        setIsLoading(false); // Ensure loading state is turned off
    }
  };

  if (!user) return null; // Don't render if user object isn't provided

  const displayName = getUserDisplayName(user);
  const isStudent = user.role === 'student';

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
            <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Generate Login PIN</Text>
            <Text style={modalSharedStyles.modalContextInfo}>For User: {displayName} ({user.role})</Text>

            {/* Show loading indicator while API call is in progress */}
            {isLoading && (
                <View style={modalSharedStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={modalSharedStyles.loadingText}>Generating PIN...</Text>
                </View>
            )}

            {/* Display generated PIN if available and not loading */}
            {generatedPin && !isLoading && (
                 <View style={styles.pinDisplayContainer}>
                     <Text style={styles.pinLabel}>Generated PIN for {targetRole}:</Text>
                     <Text style={styles.pinValue}>{generatedPin}</Text>
                     <Text style={styles.pinInstructions}>Provide this PIN to the {targetRole} for login. It will expire shortly (approx. 5 minutes).</Text>
                 </View>
            )}

            {/* Action Buttons - Only show generation buttons if PIN hasn't been generated yet in this modal instance */}
             {!generatedPin && !isLoading && (
                 <View style={modalSharedStyles.buttonContainer}>
                    {/* Button for the user themselves (Student or Teacher) */}
                    {/* Teachers currently can only generate for themselves, students generate for student role */}
                    <Button
                        title={`Generate PIN for ${displayName}`}
                        onPress={() => handleGeneratePin('student')} // Target role is 'student' for self-login
                        disabled={isLoading}
                    />
                    {/* Conditionally show button for Parent (only if user is a Student) */}
                    {isStudent && (
                        <Button
                        title={`Generate PIN for Parent`}
                        onPress={() => handleGeneratePin('parent')} // Target role is 'parent'
                        disabled={isLoading}
                        color={colors.success}
                        />
                    )}
                </View>
             )}


            {/* Footer Close Button */}
            <View style={modalSharedStyles.footerButton}>
                <Button
                title={generatedPin ? "Close" : "Cancel"} // Change button text
                onPress={onClose}
                color={colors.secondary}
                // Allow closing while loading? Maybe disable if needed.
                // disabled={isLoading}
                />
            </View>
            </View>
        </View>
    </Modal>
  );
};

// Local Styles
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
    },
    pinValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
        letterSpacing: 3,
        marginBottom: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', // Monospace font
    },
    pinInstructions: {
        fontSize: 13,
        color: colors.textLight,
        textAlign: 'center',
    }
});

export default GeneratePinModal;