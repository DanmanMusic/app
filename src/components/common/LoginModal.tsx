// src/components/common/LoginModal.tsx
import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from 'react-native';

import Toast from 'react-native-toast-message';

import { claimPin } from '../../api/auth';
import { storeItem, removeItem, CUSTOM_REFRESH_TOKEN_KEY } from '../../lib/storageHelper';
import { getSupabase } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
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
      try {
        await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        console.log('[LoginModal] Cleared any existing PIN refresh token.');
      } catch (e) {
        console.warn('Could not clear pin token on email login', e);
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) throw new Error(signInError.message || 'Invalid login credentials.');
      if (!data.user) throw new Error('Login failed. Please try again.');

      console.log(
        `[LoginModal] Sign In Success for user: ${data.user.id}. AuthContext will handle profile.`
      );
      Toast.show({ type: 'success', text1: 'Login Initiated!', position: 'bottom' });
      onClose();
    } catch (catchError: any) {
      setError(catchError.message);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: catchError.message,
        position: 'bottom',
      });
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

      try {
        await storeItem(CUSTOM_REFRESH_TOKEN_KEY, sessionData.refresh_token);
        console.log('[LoginModal] Custom refresh token stored successfully.');
      } catch (storeError) {
        console.error('[LoginModal] Failed to store custom refresh token:', storeError);
        Toast.show({
          type: 'error',
          text1: 'Session Error',
          text2: 'Could not save session token locally.',
          position: 'bottom',
        });

        try {
          await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        } catch (removeErr) {
          console.error('Error removing partially stored token:', removeErr);
        }
        throw new Error('Failed to store session.');
      }

      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
      console.log('[LoginModal] Supabase session set. AuthContext will handle profile fetch.');

      Toast.show({ type: 'success', text1: 'Login Successful via PIN!', position: 'bottom' });
      onClose();
    } catch (catchError: any) {
      console.error('[LoginModal] Error claiming PIN via API or storing token:', catchError);
      setError(catchError.message || 'An error occurred during PIN login.');
      try {
        await removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      } catch (e) {
        console.warn('Could not clear pin token on failed login', e);
      }

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
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Login</Text>
          <View style={commonSharedStyles.containerToggle}>
            <TouchableOpacity
              style={[
                commonSharedStyles.toggleButton,
                mode === 'email' && commonSharedStyles.toggleButtonActive,
              ]}
              onPress={() => setMode('email')}
              disabled={isLoading}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  mode === 'email' && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                Email / Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                commonSharedStyles.toggleButton,
                mode === 'pin' && commonSharedStyles.toggleButtonActive,
              ]}
              onPress={() => setMode('pin')}
              disabled={isLoading}
            >
              <Text
                style={[
                  commonSharedStyles.toggleButtonText,
                  mode === 'pin' && commonSharedStyles.toggleButtonTextActive,
                ]}
              >
                Login PIN
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'email' && (
            <View style={commonSharedStyles.full}>
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
              <View style={commonSharedStyles.full}>
                <Button
                  title={isLoading ? 'Logging In...' : 'Login with Email'}
                  onPress={handleEmailLogin}
                  color={colors.primary}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}

          {mode === 'pin' && (
            <View style={commonSharedStyles.full}>
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
              <View style={commonSharedStyles.full}>
                <Button
                  title={isLoading ? 'Verifying...' : 'Login with PIN'}
                  onPress={handlePinLogin}
                  color={colors.primary}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}

          {isLoading && (
            <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Processing...</Text>
            </View>
          )}
          {error && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}> Error: {error} </Text>
          )}

          <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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

export default LoginModal;
