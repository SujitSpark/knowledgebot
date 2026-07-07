import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createChatSession, fetchDocuments, logoutUser } from '../api/graphql';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MessageSquare, Plus, FileText, History, Settings, LogOut, ChevronRight } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Chat: { sessionId: string; sessionTitle: string };
  History: undefined;
  Settings: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeProps {
  navigation: NavigationProp;
}

export const Home: React.FC<HomeProps> = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState<{ id: string; name: string; uploadedAt: string }[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const userInfoStr = await AsyncStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUserEmail(userInfo.email);
        setUserId(userInfo.id);
      }
    };
    loadUserData();
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleStartNewChat = async () => {
    if (!userId) return;
    setCreatingSession(true);
    try {
      const title = `Support Session ${new Date().toLocaleDateString()}`;
      const session = await createChatSession(userId, title);
      navigation.navigate('Chat', { sessionId: session.id, sessionTitle: session.title });
    } catch (e) {
      console.error('Failed to create session:', e);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.emailText}>{userEmail || 'support@connectwise.com'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          onPress={handleStartNewChat}
          disabled={creatingSession}
          style={styles.newChatCard}
          activeOpacity={0.9}
        >
          <View style={styles.newChatContent}>
            <View style={styles.newChatIcon}>
              {creatingSession ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MessageSquare size={24} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newChatTitle}>Start Support Chat</Text>
              <Text style={styles.newChatSub}>Resolve queries using ConnectWise official documents</Text>
            </View>
            <ChevronRight size={20} color={colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.menuGrid}>
          <TouchableOpacity
            onPress={() => navigation.navigate('History')}
            style={styles.menuItem}
          >
            <History size={22} color={colors.navy} />
            <Text style={styles.menuItemText}>Chat History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.docsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Knowledge Base</Text>
            <TouchableOpacity onPress={loadDocuments}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingDocs ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : documents.length === 0 ? (
            <View style={styles.emptyDocsCard}>
              <FileText size={24} color={colors.textSecondary} />
              <Text style={styles.emptyDocsText}>No documents indexed yet.</Text>
              <Text style={styles.emptyDocsSub}>Go to Control Panel to upload files.</Text>
            </View>
          ) : (
            <FlatList
              data={documents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.docItem}>
                  <FileText size={18} color={colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.docTime}>
                      Indexed on {new Date(item.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.docsList}
            />
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  welcomeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  emailText: {
    ...typography.bodyBold,
    color: colors.navy,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  newChatCard: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  newChatTitle: {
    ...typography.subtitle,
    color: colors.white,
    fontWeight: '700',
  },
  newChatSub: {
    ...typography.caption,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  menuItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    ...typography.bodyBold,
    color: colors.navy,
  },
  docsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.navy,
    fontSize: 16,
  },
  refreshText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  docsList: {
    gap: 8,
  },
  docItem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  docName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  docTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyDocsCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDocsText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptyDocsSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
