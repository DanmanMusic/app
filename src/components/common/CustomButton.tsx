// src/components/common/CustomButton.tsx

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  ColorValue,
} from 'react-native';

import { colors } from '../../styles/colors';

type CustomButtonProps = {
  /** The text to display inside the button */
  title: string;
  /** Function to execute on press */
  onPress: () => void;
  /** The background color of the button. */
  color?: ColorValue;
  /** If true, the user cannot interact with the button. */
  disabled?: boolean;
  /** If true, shows a loading spinner instead of text/icon. */
  isLoading?: boolean;
  /** An optional icon component to display on the left. */
  leftIcon?: React.ReactNode;
  /** Optional custom styles for the button container */
  style?: ViewStyle;
  /** Optional custom styles for the text */
  textStyle?: TextStyle;
};

export const CustomButton = ({
  title,
  onPress,
  color = colors.primary,
  disabled = false,
  isLoading = false,
  leftIcon,
  style,
  textStyle,
}: CustomButtonProps) => {
  const isButtonDisabled = disabled || isLoading;

  const backgroundColor = isButtonDisabled ? colors.disabled : color;
  const textColor = isButtonDisabled ? colors.disabledText : colors.textWhite;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isButtonDisabled}
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      activeOpacity={0.7}
    >
      {isLoading ? (

        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,

    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
