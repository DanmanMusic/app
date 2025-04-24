import { Button, Text, View } from "react-native";
import { ParentStudentListItemProps } from "../../types/componentProps";
import { getUserDisplayName } from "../../utils/helpers";
import { colors } from "../../styles/colors";

export const ParentStudentListItem: React.FC<ParentStudentListItemProps> = ({
    student,
    onSelectStudent,
  }) => (
    <View style={appSharedStyles.itemContainer}>
      <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
      <Text
        style={[
          appSharedStyles.itemDetailText,
          {
            fontWeight: 'bold',
            color: student.status === 'active' ? colors.success : colors.secondary,
          },
        ]}
      >
        Status: {student.status}
      </Text>
      <Button title="View Dashboard" onPress={() => onSelectStudent(student.id)} />
    </View>
  );