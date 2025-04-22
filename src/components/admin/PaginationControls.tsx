// src/components/admin/PaginationControls.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Don't render if there's only one page or less
  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Button
        title="Previous"
        onPress={handlePrevious}
        disabled={currentPage <= 1}
        color={colors.primary}
      />
      <Text style={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </Text>
      <Button
        title="Next"
        onPress={handleNext}
        disabled={currentPage >= totalPages}
        color={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginHorizontal: 15, // Add some space around the text
  },
});

export default PaginationControls;