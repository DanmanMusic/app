import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ImageBackground,
  View,
  ImageSourcePropType,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../styles/colors';

const defaultWoodBackground = require('../../../assets/buttons/btn_wood_default.jpeg');
const pressedWoodBackground = require('../../../assets/buttons/btn_wood_pressed.jpeg');
const abaloneTexture = require('../../../assets/buttons/abalone_border.jpeg');

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  borderWidth?: number;
  pressedBorderColor?: string;
  pressedBorderOpacity?: number;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  borderWidth = 4,

  pressedBorderColor = 'rgba(50, 50, 150, 0.3)',
  pressedBorderOpacity = 0.3,
}) => {
  const woodSource = disabled ? defaultWoodBackground : pressedWoodBackground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.buttonBase, disabled ? styles.buttonDisabled : null, style]}
    >
      {({ pressed }) => {
        const borderImageSource = abaloneTexture;
        const innerWoodSource = pressed ? pressedWoodBackground : defaultWoodBackground;

        const isPressedOverlayActive = pressed && !disabled;

        return (
          <ImageBackground
            source={borderImageSource}
            style={[styles.borderBackground, { padding: borderWidth }]}
            imageStyle={styles.backgroundImageStyle}
            resizeMode="cover"
          >
            <ImageBackground
              source={innerWoodSource}
              style={styles.contentBackground}
              imageStyle={styles.backgroundImageStyleInner}
              resizeMode="cover"
            >
              <Text
                style={[
                  styles.textBase,
                  disabled ? styles.textDisabled : styles.textEnabled,
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </ImageBackground>

            {isPressedOverlayActive && (
              <View
                style={[
                  styles.pressedBorderOverlay,
                  {
                    backgroundColor: pressedBorderColor,

                    borderRadius: styles.backgroundImageStyle.borderRadius,
                  },
                ]}
              />
            )}
          </ImageBackground>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: 45,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  borderBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  contentBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',

    borderRadius: 6,
  },
  backgroundImageStyle: {
    borderRadius: 10,
  },
  backgroundImageStyleInner: {
    borderRadius: 6,
  },

  pressedBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  textBase: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textEnabled: {
    color: colors.textWhite,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textDisabled: {
    color: '#ccc',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
