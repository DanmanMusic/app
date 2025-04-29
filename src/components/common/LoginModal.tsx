import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getSupabase } from '../../lib/supabaseClient';

import { claimPin } from '../../api/auth';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

type LoginMode = 'email' | 'pin';

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  const supabase = getSupabase();

  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode('email');
      setEmail('');
      setPassword('');
      setPin('');
      setError(null);
      setIsLoading(false);
    }
  }, [visible]);

  const handleEmailLogin = async () => {
    Keyboard.dismiss();
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
        password: password,
      });

      if (signInError) throw new Error(signInError.message || 'Invalid login credentials.');
      if (!data.user) throw new Error('Login failed. Please try again.');

      console.log(
        `[LoginModal] Sign In Success for user: ${data.user.id}. AuthContext will handle profile.`
      );
      Toast.show({ type: 'success', text1: 'Login Initiated!' });
      onClose();
    } catch (catchError: any) {
      setError(catchError.message);
      Toast.show({ type: 'error', text1: 'Login Failed', text2: catchError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async () => {
    Keyboard.dismiss();
    const trimmedPin = pin.trim();
    if (!trimmedPin || trimmedPin.length < 4) {
      setError('Please enter a valid PIN.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      console.log(`[LoginModal] Calling API to claim PIN ending in ...${trimmedPin.slice(-2)}`);
      const sessionData = await claimPin(trimmedPin);
      console.log('[LoginModal] PIN Claim successful via API:', sessionData);

      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
      console.log('[LoginModal] Supabase session set. AuthContext will handle profile fetch.');

      Toast.show({ type: 'success', text1: 'Login Successful via PIN!' });
      onClose();
    } catch (catchError: any) {
      console.error('[LoginModal] Error claiming PIN via API:', catchError);
      setError(catchError.message || 'An error occurred during PIN login.');
      Toast.show({
        type: 'error',
        text1: 'PIN Login Failed',
        text2: catchError.message || 'Invalid PIN or server error.',
        position: 'bottom',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Login</Text>

          {}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, mode === 'email' && styles.toggleButtonActive]}
              onPress={() => setMode('email')}
              disabled={isLoading}
            >
              <Text
                style={[styles.toggleButtonText, mode === 'email' && styles.toggleButtonTextActive]}
              >
                Email / Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, mode === 'pin' && styles.toggleButtonActive]}
              onPress={() => setMode('pin')}
              disabled={isLoading}
            >
              <Text
                style={[styles.toggleButtonText, mode === 'pin' && styles.toggleButtonTextActive]}
              >
                Login PIN
              </Text>
            </TouchableOpacity>
          </View>

          {}
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
                secureTextEntry={true}
                autoComplete="password"
                editable={!isLoading}
              />
              <View style={modalSharedStyles.buttonContainer}>
                <Button
                  title={isLoading ? 'Logging In...' : 'Login with Email'}
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
                placeholder="Enter PIN from Admin/Teacher"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
                secureTextEntry={true}
              />
              <View style={modalSharedStyles.buttonContainer}>
                <Button
                  title={isLoading ? 'Verifying...' : 'Login with PIN'}
                  onPress={handlePinLogin}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}

          {}
          {isLoading && (
            <View style={modalSharedStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={modalSharedStyles.loadingText}>Processing...</Text>
            </View>
          )}
          {error && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}> Error: {error} </Text>
          )}

          {}
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

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    overflow: 'hidden',
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
    alignItems: 'stretch',
  },
});

export default LoginModal;
