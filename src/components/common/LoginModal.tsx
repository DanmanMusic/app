// src/components/common/LoginModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity, // For the toggle buttons
  Keyboard, // To dismiss keyboard
  TouchableWithoutFeedback // To dismiss keyboard
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getSupabase } from '../../lib/supabaseClient'; // To call Supabase auth eventually
import { useAuth } from '../../contexts/AuthContext'; // To set the mock state on simulated login
import { fetchUserProfile } from '../../api/users'; // To get role after real email login
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { UserRole } from '../../types/dataTypes'; // Import UserRole

// Define props (simple for now)
interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

type LoginMode = 'email' | 'pin';

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  const { setMockAuthState } = useAuth();
  const supabase = getSupabase(); // Get Supabase client instance

  const [mode, setMode] = useState<LoginMode>('email'); // Default to email/password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal visibility changes
  useEffect(() => {
    if (visible) {
      // Reset fields when opened
      setMode('email');
      setEmail('');
      setPassword('');
      setPin('');
      setError(null);
      setIsLoading(false);
    }
  }, [visible]);

  // --- Email/Password Login Handler ---
  const handleEmailLogin = async () => {
    Keyboard.dismiss(); // Dismiss keyboard
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
        console.log('[LoginModal] Attempting Supabase email/password sign in...');
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password, // Don't trim password
        });

        if (signInError) {
            console.error('[LoginModal] Supabase Sign In Error:', signInError.message);
            // Provide user-friendly messages for common errors
            let userMessage = 'Invalid login credentials.';
            if (signInError.message.toLowerCase().includes('email not confirmed')) {
                userMessage = 'Please confirm your email address first.';
            }
            throw new Error(userMessage);
        }

        if (!data.user) {
             console.error('[LoginModal] Sign In Error: No user data returned.');
            throw new Error('Login failed. Please try again.');
        }

        console.log(`[LoginModal] Sign In Success for user: ${data.user.id}. Fetching profile...`);

        // Fetch profile to get the application role
        const userProfile = await fetchUserProfile(data.user.id);
        if (!userProfile) {
             console.error(`[LoginModal] Profile fetch error: No profile found for user ${data.user.id}.`);
             // Log out the potentially partial session for safety
             await supabase.auth.signOut();
             throw new Error('Login failed: User profile not found.');
        }

         console.log(`[LoginModal] Profile fetched. Role: ${userProfile.role}. Updating context.`);

        // IMPORTANT: Update AuthContext with REAL userId and fetched role
        // Use setMockAuthState for consistency with dev flow, but it now contains real data
        setMockAuthState({
            role: userProfile.role,
            userId: userProfile.id,
            // No viewingStudentId on direct Admin/Teacher login
        });

        Toast.show({ type: 'success', text1: 'Login Successful!' });
        onClose(); // Close modal on success

    } catch (catchError: any) {
      setError(catchError.message || 'An unexpected error occurred.');
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: catchError.message || 'An unexpected error occurred.',
        position: 'bottom',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- PIN Login Handler (Simulated - Student Only) ---
  const handlePinLogin = async () => {
    Keyboard.dismiss();
    const trimmedPin = pin.trim(); // Trim PIN
    if (!trimmedPin || trimmedPin.length < 4) { // Basic validation
      setError('Please enter a valid PIN.');
      return;
    }
    setError(null);
    setIsLoading(true);

    // --- SIMULATION / DEFERRED ACTION ---
    console.log(`[LoginModal] Simulating PIN login with PIN: ${trimmedPin} as STUDENT`);
    Toast.show({
      type: 'info',
      text1: 'PIN Login Simulation (Student)', // Indicate role
      text2: 'Feature requires server-side setup.',
      visibilityTime: 3000,
    });

    const simulatedUserId = 'SIMULATED_PIN_STUDENT_ID'; // More specific ID

    // Wait a tiny bit to make loading indicator visible
    await new Promise(resolve => setTimeout(resolve, 500));

    setMockAuthState({
      role: 'student', // Directly set role
      userId: simulatedUserId,
      viewingStudentId: undefined, // No viewing ID needed for student
    });
    // --- END SIMULATION ---

    setIsLoading(false);
    onClose();
  };


  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        {/* Wrap with TouchableWithoutFeedback to dismiss keyboard on tap outside */}
            <View style={modalSharedStyles.centeredView}>
                <View style={modalSharedStyles.modalView}>
                <Text style={modalSharedStyles.modalTitle}>Login</Text>

                {/* Toggle Buttons */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                    style={[styles.toggleButton, mode === 'email' && styles.toggleButtonActive]}
                    onPress={() => setMode('email')}
                    disabled={isLoading}
                    >
                    <Text style={[styles.toggleButtonText, mode === 'email' && styles.toggleButtonTextActive]}>
                        Email / Password
                    </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    style={[styles.toggleButton, mode === 'pin' && styles.toggleButtonActive]}
                    onPress={() => setMode('pin')}
                    disabled={isLoading}
                    >
                    <Text style={[styles.toggleButtonText, mode === 'pin' && styles.toggleButtonTextActive]}>
                        Login PIN
                    </Text>
                    </TouchableOpacity>
                </View>

                {/* Login Forms */}
                {mode === 'email' && (
                    <View style={styles.formContainer}>
                    <Text style={commonSharedStyles.label}>Email:</Text>
                    <TextInput
                        style={commonSharedStyles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email"
                        placeholderTextColor={colors.textLight}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        editable={!isLoading}
                    />
                    <Text style={commonSharedStyles.label}>Password:</Text>
                    <TextInput
                        style={commonSharedStyles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={true} // Hide password
                        autoComplete="password"
                        editable={!isLoading}
                    />
                     <View style={modalSharedStyles.buttonContainer}>
                        <Button
                            title={isLoading ? "Logging In..." : "Login with Email"}
                            onPress={handleEmailLogin}
                            disabled={isLoading}
                        />
                    </View>
                    </View>
                )}

                {mode === 'pin' && (
                    <View style={styles.formContainer}>
                    <Text style={commonSharedStyles.label}>One-Time PIN:</Text>
                    <TextInput
                        style={commonSharedStyles.input}
                        value={pin}
                        onChangeText={setPin}
                        placeholder="Enter PIN from Admin"
                        placeholderTextColor={colors.textLight}
                        keyboardType="number-pad" // Numeric keyboard
                        maxLength={6} // Assume 6-digit PINs
                        editable={!isLoading}
                        secureTextEntry={true} // Optionally obscure PIN input
                    />
                    <View style={modalSharedStyles.buttonContainer}>
                        <Button
                            title={isLoading ? "Verifying..." : "Login with PIN (Simulated)"}
                            onPress={handlePinLogin}
                            disabled={isLoading}
                        />
                    </View>
                    </View>
                )}

                {/* Loading and Error Display */}
                {isLoading && (
                    <View style={modalSharedStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={modalSharedStyles.loadingText}>Processing...</Text>
                    </View>
                )}
                {error && (
                    <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
                    Error: {error}
                    </Text>
                )}


                {/* Footer Cancel Button */}
                <View style={modalSharedStyles.footerButton}>
                    <Button
                    title="Cancel"
                    onPress={onClose}
                    color={colors.secondary}
                    disabled={isLoading}
                    />
                </View>
                </View>
            </View>
    </Modal>
  );
};

// Local Styles
const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    overflow: 'hidden', // Keep text inside rounded corners
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleButtonTextActive: {
    color: colors.textWhite,
  },
  formContainer: {
      width: '100%',
      alignItems: 'stretch', // Ensure inputs take full width
  }
});

export default LoginModal;