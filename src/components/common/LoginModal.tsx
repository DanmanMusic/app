// src/components/common/LoginModal.tsx

import React, { useState, useEffect } from 'react';

import {
  Modal,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from 'react-native';

import Toast from 'react-native-toast-message';

import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { CustomButton } from './CustomButton';
import { XCircleIcon } from 'react-native-heroicons/solid';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

type LoginMode = 'email' | 'pin';

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  const { signInWithEmailPassword, signInWithPin } = useAuth();
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
      await signInWithEmailPassword(email.trim(), password);
      onClose();
    } catch (e: any) {
      setError(e.message);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: e.message,
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
      await signInWithPin(trimmedPin);
      onClose();
    } catch (e: any) {
      setError(e.message);
      Toast.show({
        type: 'error',
        text1: 'PIN Login Failed',
        text2: e.message,
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
                <CustomButton
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
                <CustomButton
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
            <CustomButton
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={isLoading}
              leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LoginModal;
