// src/styles/modalSharedStyles.ts
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const modalSharedStyles = StyleSheet.create({
  awardedPointsText: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    borderTopColor: colors.borderSecondary,
    borderTopWidth: 1,
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    width: '100%',
  },
  cannotAffordText: {
    color: colors.textLight,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  centeredView: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.primary,
    fontSize: 24,
    marginLeft: 10,
  },
  confirmationText: {
    fontSize: 16,
    lineHeight: 22,
    marginVertical: 15,
    textAlign: 'center',
  },
  contentScrollView: {
    marginBottom: 15,
    maxHeight: '65%', // Adjust as needed
    width: '100%',
  },
  currentGoalItem: {
    backgroundColor: colors.backgroundHighlight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  filterSection: {
    backgroundColor: colors.backgroundPrimary, // Light background for filter area
    borderBottomColor: colors.borderSecondary,
    borderBottomWidth: 1,
    paddingBottom: 10,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderBottomLeftRadius: 10, // Match modal border radius
    borderBottomRightRadius: 10,
    borderTopColor: colors.borderPrimary,
    borderTopWidth: 1,
    paddingBottom: 10, // Consistent padding
    paddingTop: 5, // Less padding top in footer
    width: '100%',
  },
  footerButton: {
    marginTop: 10, // Space between main actions and cancel/close
    width: '100%',
  },
  goalSelectDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  goalSelectImage: {
    borderColor: colors.borderSecondary,
    borderRadius: 4,
    borderWidth: 1,
    height: 45,
    marginRight: 12,
    width: 45,
  },
  goalSelectItem: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderSecondary,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  goalSelectItemContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  goalSelectName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  iconPreviewContainer: {
    alignItems: 'center',
    borderBottomColor: colors.borderSecondary,
    borderBottomWidth: 1,
    marginBottom: 15,
    paddingBottom: 15,
    width: '100%',
    gap: 10, // Add gap between preview and button
  },
  iconPreview: {
    width: 80, // Slightly larger preview
    height: 80,
    marginBottom: 5,
    borderRadius: 5, // Optional rounded corners
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundGrey, // Background for empty state or loading
  },
  listItem: {
    borderBottomColor: colors.borderSecondary,
    borderBottomWidth: 1,
    padding: 12,
  },
  listItemText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 20, // Give it some height
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 10,
  },
  modalContextInfo: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderBottomColor: colors.borderPrimary,
    borderBottomWidth: 1,
    borderTopLeftRadius: 10, // Match modal border radius
    borderTopRightRadius: 10,
    padding: 15,
    width: '100%',
  },
  modalListContainer: {
    flexGrow: 0, // Prevent list from taking all space initially
    marginBottom: 15,
    maxHeight: '60%', // Or adjust as needed
    width: '100%',
  },
  modalMessage: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 25,
    textAlign: 'center',
  },
  modalSectionTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
    textAlign: 'center',
    width: '100%',
  },
  modalSubSection: {
    borderTopColor: colors.borderSecondary,
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 15,
    width: '100%',
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
  modalToggleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    paddingHorizontal: 10,
    width: '100%',
  },
  modalView: {
    alignItems: 'stretch', // Changed from 'center'
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    elevation: 5,
    margin: 20,
    maxHeight: '90%', // Limit height
    maxWidth: 500, // Limit width on larger screens
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '90%', // Responsive width
  },
  modeSwitchContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
    width: '100%',
  },
  pointsInputContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewText: {
    color: colors.textLight,
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 15,
    textAlign: 'center',
  },
  rangeText: {
    color: colors.textSecondary,
    flexDirection: 'row',
    fontSize: 12,
    justifyContent: 'space-between',
    marginBottom: 5,
    marginTop: -5, // Pull up slightly below slider
    paddingHorizontal: 5,
    width: '100%',
  },
  roleSectionTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleSpecificSection: {
    borderTopColor: colors.borderSecondary,
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 15,
    width: '100%',
  },
  scrollView: {
    marginBottom: 15, // Space before buttons
    width: '100%',
    // Max height can be controlled by the modalView's maxHeight
  },
  searchInput: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
    padding: 10,
    width: '100%',
  },
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10, // Space below selection buttons
  },
  slider: {
    height: 40, // Standard touch target height
    marginTop: 10,
    width: '100%',
  },
  stepTitle: {
    alignSelf: 'flex-start',
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10, // Consistent spacing
    width: '100%',
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
  taskDescription: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 3,
  },
  taskItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});