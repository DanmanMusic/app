
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, TextInput, ScrollView } from 'react-native';
import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';

const modalStyles = StyleSheet.create({
    centeredView:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.7)' },
    modalView:{ margin:20, backgroundColor:colors.backgroundPrimary, borderRadius:10, padding:20, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4, elevation:5, width:'95%', maxWidth:450, maxHeight: '85%' },
    scrollView:{ width:'100%', marginBottom: 15 },
    modalTitle:{ fontSize:20, fontWeight:'bold', marginBottom:15, textAlign:'center', color:colors.textPrimary, width:'100%', borderBottomWidth:1, borderBottomColor:colors.borderPrimary, paddingBottom:10 },
    label:{ fontSize:14, fontWeight:'bold', marginTop:10, marginBottom:5, color:colors.textPrimary, alignSelf:'flex-start', width: '100%' },
    input:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:10 },
    textArea:{ width:'100%', borderWidth:1, borderColor:colors.borderPrimary, borderRadius:5, padding:10, fontSize:16, color:colors.textPrimary, backgroundColor:colors.backgroundPrimary, marginBottom:10, minHeight: 80, textAlignVertical: 'top' },
    buttonContainer:{ flexDirection:'column', width:'100%', marginTop:10, gap:10 },
    footerButton:{ width:'100%', marginTop:10 },
});

interface CreateRewardModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateConfirm: (rewardData: Omit<RewardItem, 'id'>) => void;
}

const CreateRewardModal: React.FC<CreateRewardModalProps> = ({
  visible,
  onClose,
  onCreateConfirm,
}) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>(''); 
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setCost('');
      setDescription('');
      setImageUrl('');
    }
  }, [visible]);

  const handleCreate = () => {
    const numericCost = typeof cost === 'number' ? cost : parseInt(String(cost || '0'), 10);
    if (!name.trim()) {
      alert('Please enter a reward name.');
      return;
    }
     if (isNaN(numericCost) || numericCost < 0) {
         alert('Please enter a valid, non-negative ticket cost.');
         return;
     }
    if (!imageUrl.trim()) {
        alert('Please enter an image URL (mock).'); 
        return;
    }

    onCreateConfirm({
      name: name.trim(),
      cost: numericCost,
      description: description.trim() || undefined, 
      imageUrl: imageUrl.trim(),
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Create New Reward</Text>
          <ScrollView style={modalStyles.scrollView}>
            <Text style={modalStyles.label}>Reward Name:</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Fender Stratocaster"
              placeholderTextColor={colors.textLight}
              maxLength={100}
            />

            <Text style={modalStyles.label}>Ticket Cost:</Text>
            <TextInput
              style={modalStyles.input}
              value={String(cost)} 
              onChangeText={text => setCost(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)} 
              placeholder="e.g., 10000"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
            />

            <Text style={modalStyles.label}>Image URL (Mock):</Text>
            <TextInput
              style={modalStyles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://via.placeholder.com/150?text=Reward"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={modalStyles.label}>Description (Optional):</Text>
            <TextInput
              style={modalStyles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter details about the reward..."
              placeholderTextColor={colors.textLight}
              multiline={true}
              numberOfLines={3}
            />
          </ScrollView>

          <View style={modalStyles.buttonContainer}>
            <Button title="Create Reward" onPress={handleCreate} />
          </View>
          <View style={modalStyles.footerButton}>
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateRewardModal;