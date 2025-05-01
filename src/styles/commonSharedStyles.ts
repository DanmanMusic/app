import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const commonSharedStyles = StyleSheet.create({
  baseItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
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
    marginBottom: 15,
    minHeight: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    width: '100%',
  },
});
