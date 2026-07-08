import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMessages, askQuestion, createMessage, uploadDocument, MessageNode } from '../api/graphql';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ChatBubble } from '../components/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Send, ArrowLeft, RefreshCw, Paperclip } from 'lucide-react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Chat: { sessionId: string; sessionTitle: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

interface ChatProps {
  route: ChatScreenRouteProp;
  navigation: ChatScreenNavigationProp;
}

export const Chat: React.FC<ChatProps> = ({ route, navigation }) => {
  const { sessionId, sessionTitle } = route.params;
  const [messages, setMessages] = useState<MessageNode[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleUploadDocument = async () => {
    if (uploadingDoc || sending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setUploadingDoc(true);

      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uploadResult = await uploadDocument(file.name, base64Data);

      if (uploadResult.success) {
        const confirmText = `**Document Uploaded**: "${file.name}" has been successfully uploaded and indexed into the RAG database. You can now ask me questions about its content!`;
        
        const savedMsg = await createMessage(sessionId, 'bot', confirmText);
        setMessages((prev) => [...prev, savedMsg]);
      } else {
        Alert.alert('Upload Failed', 'The server reported a failure.');
      }
    } catch (e) {
      console.error('Failed to upload document in chat:', e);
      Alert.alert('Error', 'Failed to pick or upload document in chat.');
    } finally {
      setUploadingDoc(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const userInfoStr = await AsyncStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUserId(userInfo.id);
      }
    };
    fetchUserId();
    loadMessages();
  }, [sessionId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const fetched = await fetchMessages(sessionId);
      setMessages(fetched);
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      Alert.alert('Error', 'Failed to load conversation history.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !userId || sending) return;

    const userText = inputText.trim();
    setInputText('');
    setSending(true);

    const tempUserMsg: MessageNode = {
      id: `temp-user-${Date.now()}`,
      sender: 'user',
      content: userText,
      sourceCitation: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const response = await askQuestion(sessionId, userId, userText);
      
      const botMsg: MessageNode = {
        id: response.messageId,
        sender: 'bot',
        content: response.content,
        sourceCitation: response.sourceCitations,
        createdAt: response.createdAt,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error('Failed to get answer:', e);
      Alert.alert('Error', 'Failed to get answer from Assistant. Please make sure Ollama server is running.');
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const renderMessageItem = ({ item }: { item: MessageNode }) => {
    const timeString = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <ChatBubble
        sender={item.sender}
        content={item.content}
        citations={item.sourceCitation}
        timestamp={timeString}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sessionTitle}
          </Text>
          <Text style={styles.headerSubtitle}>KnowledgeBot Support Assistant</Text>
        </View>
        <TouchableOpacity onPress={loadMessages} style={styles.headerBtn}>
          <RefreshCw size={16} color={colors.navy} />
        </TouchableOpacity>
      </View>
 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Hydrating conversation history...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Ask anything about your documents</Text>
                <Text style={styles.emptyText}>
                  Type a query or tap the paperclip icon below to upload custom PDF manuals and query them instantly.
                </Text>
              </View>
            }
          />
        )}

        {sending && <TypingIndicator />}

        <View style={styles.inputBar}>
          <TouchableOpacity
            onPress={handleUploadDocument}
            disabled={uploadingDoc || sending}
            style={[styles.attachButton, (uploadingDoc || sending) && styles.attachButtonDisabled]}
          >
            {uploadingDoc ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Paperclip size={20} color={colors.navy} />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a customer support query..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!sending && !uploadingDoc}
            multiline
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending || uploadingDoc}
            style={[
              styles.sendButton,
              (!inputText.trim() || sending || uploadingDoc) && styles.sendButtonDisabled,
            ]}
          >
            <Send size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.navy,
    fontSize: 15,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.navy,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: '#FAFBFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 0,
  },
  attachButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
});
