import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChatSessions } from '../api/graphql';
import { SearchBar } from '../components/SearchBar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { ArrowLeft, MessageSquare, Calendar, ChevronRight } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  History: undefined;
  Chat: { sessionId: string; sessionTitle: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

interface HistoryProps {
  navigation: NavigationProp;
}

export const History: React.FC<HistoryProps> = ({ navigation }) => {
  const [sessions, setSessions] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const fetchUserId = async () => {
      const userInfoStr = await AsyncStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUserId(userInfo.id);
        loadSessions(userInfo.id);
      }
    };
    fetchUserId();
  }, []);

  const loadSessions = async (uid: string) => {
    try {
      setLoading(true);
      const fetched = await fetchChatSessions(uid);
      setSessions(fetched);
    } catch (e) {
      console.error('Failed to load sessions:', e);
      Alert.alert('Error', 'Failed to retrieve conversation history.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation History</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Search */}
        <SearchBar
          placeholder="Search support sessions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching conversations...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.centerContainer}>
            <MessageSquare size={36} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No sessions found</Text>
            <Text style={styles.emptySub}>Your past support chats will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { sessionId: item.id, sessionTitle: item.title })}
                style={styles.sessionCard}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <MessageSquare size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.timeRow}>
                    <Calendar size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.timeText}>
                      {new Date(item.createdAt).toLocaleDateString()} at{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.border} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 16,
    color: colors.navy,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  listContainer: {
    gap: 8,
  },
  sessionCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
