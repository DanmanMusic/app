import { StyleSheet } from 'react-native';

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
    flexWrap: 'wrap'
  },  
  baseColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  baseSelfAlign: {
    alignSelf: 'flex-start',
  },
  baseSelfAlignStretch: {
    alignSelf: 'stretch',
  },
  baseAlign: {
    alignItems: 'center',
  },  
  baseTitle: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  baseSubTitle: {
    color: colors.textPrimary,
    fontSize: 16,
  },

  justifyCenter: {
    justifyContent: 'center'
  },  
  justifySpaceBetween: {
    justifyContent: 'space-between'
  },
  bold: {
    fontWeight: 'bold',
  },
  flex1: {
    flex: 1
  },


  baseItem: {
    padding: 4,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.backgroundPrimary,
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
});
