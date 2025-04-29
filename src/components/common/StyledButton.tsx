// src/components/common/StyledButton.tsx
import React from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ImageBackground,
    View,
    ImageSourcePropType,
    ViewStyle,
    TextStyle
} from 'react-native';
import { colors } from '../../styles/colors'; // Assuming you have defined text colors etc.

// Define the paths to your images
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
  pressedBorderColor?: string; // Optional: Customize overlay color
  pressedBorderOpacity?: number; // Optional: Customize overlay opacity
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  borderWidth = 4,
  // Default pressed overlay: slightly darker blue/purple tint
  pressedBorderColor = 'rgba(50, 50, 150, 0.3)', // Example: blue/purple tint
  pressedBorderOpacity = 0.3, // Default opacity (adjust as needed) - Now incorporated into RGBA
}) => {

  // Wood source selection remains the same
  const woodSource = disabled ? defaultWoodBackground : pressedWoodBackground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        disabled ? styles.buttonDisabled : null,
        // Apply pressed state directly? Maybe not needed if overlay works
        // pressed ? styles.buttonPressedOverlayActive : null,
        style,
      ]}
    >
      {({ pressed }) => {
        const borderImageSource = abaloneTexture;
        const innerWoodSource = pressed ? pressedWoodBackground : defaultWoodBackground;
        // Determine if the pressed overlay should be active
        const isPressedOverlayActive = pressed && !disabled;

        return (
          // Outer layer: Abalone border background
          <ImageBackground
            source={borderImageSource}
            style={[styles.borderBackground, { padding: borderWidth }]}
            imageStyle={styles.backgroundImageStyle}
            resizeMode="cover"
          >
            {/* Inner layer: Wood grain content background */}
            <ImageBackground
                source={innerWoodSource}
                style={styles.contentBackground}
                imageStyle={styles.backgroundImageStyleInner} // Use potentially different inner radius
                resizeMode="cover"
             >
                 <Text style={[styles.textBase, disabled ? styles.textDisabled : styles.textEnabled, textStyle]}>
                     {title}
                 </Text>
            </ImageBackground>

            {/* *** ADDED: Pressed State Overlay for Border *** */}
            {isPressedOverlayActive && (
              <View
                style={[
                  styles.pressedBorderOverlay,
                  {
                      // Apply dynamic RGBA color based on props
                      backgroundColor: pressedBorderColor,
                      // Ensure overlay respects border radius (same as outer image)
                      borderRadius: styles.backgroundImageStyle.borderRadius,
                  }
                ]}
              />
            )}
            {/* *** END Overlay *** */}

          </ImageBackground>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: 45,
    borderRadius: 10, // Outer rounding
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
  // Outer Abalone Background Container
  borderBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Needed for absolute positioning of the overlay
  },
   // Inner Wood Content Background
  contentBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Slightly smaller radius for inner wood makes border look better
    borderRadius: 6,
  },
  backgroundImageStyle: {
     // Style for the outer abalone image
     borderRadius: 10, // Match buttonBase
  },
   backgroundImageStyleInner: {
     // Style for the inner wood image
     borderRadius: 6, // Match contentBackground
  },
  // *** ADDED: Overlay Style ***
  pressedBorderOverlay: {
    ...StyleSheet.absoluteFillObject, // Make overlay cover the entire borderBackground area
    // backgroundColor is set dynamically
    // borderRadius needs to match outer background image style
  },
  // Text Styles
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