// src/components/common/GeneratePinModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    Button,
    ActivityIndicator,
    StyleSheet,
    Alert // Use Alert for temporary feedback
} from 'react-native';
import Toast from 'react-native-toast-message';

import { User } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface GeneratePinModalProps {
  visible: boolean;
  user: User | null; // User for whom the PIN is generated (Student or Teacher)
  onClose: () => void;
  // We'll add onGeneratePin later when calling the Edge Function
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
  }, [user]);


  const handleGeneratePin = async (role: 'student' | 'parent') => {
    if (!user) return;

    setTargetRole(role);
    setIsLoading(true);
    setGeneratedPin(null); // Clear previous pin

    // --- SIMULATION / DEFERRED ACTION ---
    console.log(`[GeneratePinModal] Simulating PIN generation for user ${user.id}, target role: ${role}`);
    const fakePin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit fake PIN

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 750));

    setGeneratedPin(fakePin); // Display the fake PIN
    Toast.show({
        type: 'success', // Use success to show the PIN clearly
        text1: `Generated PIN for ${role}`,
        text2: `Tell ${role === 'parent' ? 'Parent' : getUserDisplayName(user)} to use: ${fakePin}`,
        visibilityTime: 15000, // Show longer so Admin can read it
        position: 'bottom',
    });
    console.log(`[GeneratePinModal] Simulated PIN: ${fakePin}`);
    // --- END SIMULATION ---

    /* // --- FUTURE IMPLEMENTATION ---
    try {
        // const { data, error } = await supabase.functions.invoke('generate-onetime-pin', {
        //     body: { userId: user.id, targetRole: role }
        // });
        // if (error) throw error;
        // if (!data || !data.pin) throw new Error("Failed to get PIN from function.");
        // setGeneratedPin(data.pin);
        // Toast.show({ ... show success with real pin ... });
    } catch (error: any) {
        console.error("Error generating PIN:", error);
        Toast.show({ type: 'error', text1: 'PIN Generation Failed', text2: error.message });
        setGeneratedPin(null);
        setTargetRole(null);
    } finally {
        setIsLoading(false);
    }
    */
    setIsLoading(false); // End loading after simulation
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

            {isLoading && (
                <View style={modalSharedStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={modalSharedStyles.loadingText}>Generating PIN...</Text>
                </View>
            )}

            {/* Display generated PIN if available */}
            {generatedPin && !isLoading && (
                 <View style={styles.pinDisplayContainer}>
                     <Text style={styles.pinLabel}>Generated PIN for {targetRole}:</Text>
                     <Text style={styles.pinValue}>{generatedPin}</Text>
                     <Text style={styles.pinInstructions}>Provide this PIN to the {targetRole} for login. It will expire shortly.</Text>
                 </View>
            )}

            {/* Action Buttons - Only show generation buttons if PIN hasn't been generated yet in this instance */}
             {!generatedPin && !isLoading && (
                 <View style={modalSharedStyles.buttonContainer}>
                    {/* Button for the user themselves (Student or Teacher) */}
                    <Button
                        title={`Generate PIN for ${displayName}`}
                        onPress={() => handleGeneratePin('student')} // Assuming target is 'student' role for their own login
                        disabled={isLoading}
                    />
                    {/* Conditionally show button for Parent (only if user is a Student) */}
                    {isStudent && (
                        <Button
                        title={`Generate PIN for Parent`}
                        onPress={() => handleGeneratePin('parent')}
                        disabled={isLoading}
                        color={colors.success} // Different color for distinction
                        />
                    )}
                </View>
             )}


            {/* Footer Close Button */}
            <View style={modalSharedStyles.footerButton}>
                <Button
                title={generatedPin ? "Close" : "Cancel"} // Change button text after generation
                onPress={onClose}
                color={colors.secondary}
                // disabled={isLoading} // Allow closing even if somehow loading? Or disable? Let's allow it.
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
        letterSpacing: 3, // Space out digits
        marginBottom: 10,
    },
    pinInstructions: {
        fontSize: 13,
        color: colors.textLight,
        textAlign: 'center',
    }
});

export default GeneratePinModal;