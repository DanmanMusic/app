// src/views/PublicView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native'; // Removed Image
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { RewardItem } from '../mocks/mockRewards';
import { Announcement } from '../mocks/mockAnnouncements';

interface PublicViewProps {
    rewardsCatalog: RewardItem[];
    announcements: Announcement[];
}

// Render item for FlatList of Rewards (using View placeholder for image)
const RewardItemPublic = ({ item }: { item: RewardItem }) => (
    <View style={styles.rewardItemContainer}>
        {/* Reverted to placeholder View for the image */}
         <View style={styles.rewardImagePlaceholder}>
             <Text style={styles.rewardImagePlaceholderText}>Image</Text>
         </View>
        <View style={styles.rewardDetails}>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={styles.rewardCost}>{item.cost} Tickets</Text>
            {item.description && <Text style={styles.rewardDescription}>{item.description}</Text>}
        </View>
    </View>
);

// Render item for FlatList of Announcements
const AnnouncementItem = ({ item }: { item: Announcement }) => (
     <View style={styles.announcementItemContainer}>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.announcementMessage}>{item.message}</Text>
        <Text style={styles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text> {/* Format date */}
    </View>
);


export const PublicView: React.FC<PublicViewProps> = ({ rewardsCatalog, announcements }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Using ScrollView for the main container to allow scrolling of overall content */}
            <ScrollView style={styles.container}>
                <Text style={styles.header}>Danmans Music School</Text> {/* Changed to School */}
                <Text style={styles.subheader}>Virtual Ticket Rewards Program</Text>

                <Text style={styles.sectionTitle}>Rewards Catalog</Text>
                {/* Using FlatList for performant scrolling of the rewards list */}
                <FlatList
                    data={rewardsCatalog}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <RewardItemPublic item={item} />}
                    // Optional: Add horizontal={true} and other props for a horizontal list
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />} // Add spacing between items
                    ListEmptyComponent={() => <Text style={styles.emptyListText}>No rewards found.</Text>}
                     scrollEnabled={false} // Disable inner scroll, let the parent ScrollView handle it
                     contentContainerStyle={styles.listContentContainer}
                />

                 <Text style={styles.sectionTitle}>Announcements</Text>
                 {/* Using FlatList for performant scrolling of the announcements list */}
                  <FlatList
                    data={announcements}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <AnnouncementItem item={item} />}
                     ItemSeparatorComponent={() => <View style={{ height: 10 }} />} // Add spacing between items
                    ListEmptyComponent={() => <Text style={styles.emptyListText}>No announcements found.</Text>}
                    scrollEnabled={false} // Disable inner scroll
                     contentContainerStyle={styles.listContentContainer}
                />


                <Text style={styles.footer}>Login to track your progress and earn tickets!</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f8f8', // A softer background color
    },
    container: {
        flex: 1,
        padding: 15,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
        marginBottom: 5,
    },
     subheader: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 25,
        color: '#555',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
        color: '#444',
    },
    // Styles for Reward Items
    rewardItemContainer: {
        flexDirection: 'row', // Arrange image and details horizontally
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center', // Vertically align content
    },
     // Placeholder View styles for the image
    rewardImagePlaceholder: {
         width: 80,
         height: 80,
         marginRight: 15,
         borderRadius: 4, // Slightly rounded corners for images
         backgroundColor: '#eee', // Light grey background
         justifyContent: 'center',
         alignItems: 'center',
         borderWidth: 1,
         borderColor: '#ccc',
    },
     rewardImagePlaceholderText: {
         fontSize: 12,
         color: '#777',
     },
    rewardDetails: {
        flex: 1, // Allow details to take up remaining space
        justifyContent: 'center',
    },
    rewardName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    rewardCost: {
        fontSize: 15,
        color: 'gold', // Keep gold for tickets
        fontWeight: '600',
        marginVertical: 3,
    },
     rewardDescription: {
        fontSize: 14,
        color: '#666',
     },
    // Styles for Announcement Items
    announcementItemContainer: {
         backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
     announcementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    announcementMessage: {
        fontSize: 14,
        color: '#555',
    },
    announcementDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        textAlign: 'right',
    },
    emptyListText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 10,
    },
    listContentContainer: {
        paddingBottom: 5, // Add a little padding at the bottom of the lists
    },
     footer: {
        textAlign: 'center',
        marginTop: 40,
        marginBottom: 20, // Add padding at the very bottom of the scroll view
        fontSize: 16,
        color: '#666',
     }
});