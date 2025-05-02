import { Platform, StyleSheet } from 'react-native';

import { colors } from './colors';

export const commonSharedStyles = StyleSheet.create({
  baseGap: {
    gap: 5,
  },
  baseGapLarge: {
    gap: 20,
  },
  baseMargin: {
    margin: 5,
  },
  baseMarginTopBottom: {
    marginTop: 10,
    marginBottom: 10,
  },
  basePadding: {
    padding: 5,
  },
  baseFull: {
    width: '100%',
  },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  baseRowCentered: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  baseColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  baseSelfAlign: {
    alignSelf: 'flex-start',
  },
  baseSelfAlignCenter: {
    alignSelf: 'center',
  },
  baseSelfAlignStretch: {
    alignSelf: 'stretch',
  },
  baseAlignCenter: {
    alignItems: 'center',
  },
  baseHeaderTextLarge: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: 'bold',
  },
  baseHeaderText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  baseTitleText: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  baseSubTitleText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  baseSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  baseLightText: {
    color: colors.textLight,
    fontSize: 14,
    marginBottom: 4,
  },
  baseVeryLightText: {
    color: colors.textVeryLight,
    fontSize: 14,
    marginBottom: 4,
  },
  baseEmptyText: {
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  baseCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  justifySpaceBetween: {
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: 'bold',
  },
  flex0: {
    flex: 0,
  },
  flex1: {
    flex: 1,
  },
  flexGrow: {
    flexGrow: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
  textDanger: {
    color: colors.danger,
  },
  textGold: {
    color: colors.gold,
  },
  textSuccess: {
    color: colors.success,
  },
  textWarning: {
    color: colors.warning,
  },

  full: {
    width: '100%',
  },
  listItemFull: {
    flexGrow: 0,
    marginBottom: 15,
    maxHeight: '60%',
    width: '100%',
  },

  inactiveItem: {
    borderColor: colors.secondary,
    opacity: 0.7,
  },
  activeStatus: {
    fontWeight: 'bold',
    color: colors.success,
  },
  inactiveStatus: {
    fontWeight: 'bold',
    color: colors.secondary,
  },
  baseItem: {
    padding: 4,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.backgroundPrimary,
  },
  baseIcon: {
    height: 40,
    marginRight: 15,
    width: 40,
  },

  goalImage: {
    borderColor: colors.borderSecondary,
    borderRadius: 4,
    borderWidth: 1,
    height: 50,
    width: 50,
  },
  progressBarBackground: {
    backgroundColor: '#eee',
    borderRadius: 5,
    height: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: 5,
    height: '100%',
  },

  centeredView: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
  },
  modalMessage: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 25,
    textAlign: 'center',
  },

  modalContextInfo: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  modalView: {
    alignItems: 'stretch',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    elevation: 5,
    margin: 20,
    maxHeight: '90%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '90%',
  },
  modalTitle: {
    borderBottomColor: colors.borderPrimary,
    borderBottomWidth: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  containerToggle: {
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
  subTitle: {
    borderBottomColor: colors.borderPrimary,
    borderBottomWidth: 1,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 15,
    paddingBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  stepTitle: {
    alignSelf: 'flex-start',
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
    width: '100%',
  },
  scrollView: {
    marginBottom: 15,
    width: '100%',
  },
  contentScrollView: {
    marginBottom: 15,
    maxHeight: '65%',
    width: '100%',
  },
  parentHeader: {
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderBottomColor: colors.borderPrimary,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  parentHeaderText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: colors.danger,
    borderRadius: 5,
    borderWidth: 1,
    marginVertical: 20,
    padding: 15,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 5,
    width: '100%',
  },
  label: {
    alignSelf: 'flex-start',
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    width: '100%',
  },
  separator: {
    backgroundColor: colors.borderSecondary,
    height: 1,
    marginVertical: 10,
  },
  textArea: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    width: '100%',
  },
  containerPinDisplay: {
    alignItems: 'center',
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
