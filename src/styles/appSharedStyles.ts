import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const appSharedStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.backgroundSecondary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },

  itemContainer: {
    backgroundColor: colors.backgroundPrimary,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  itemDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },

  textGold: { color: colors.gold },
  textSuccess: { color: colors.success },
  textDanger: { color: colors.danger },
  textWarning: { color: colors.warning },
});
