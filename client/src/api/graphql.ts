import { GraphQLClient } from 'graphql-request';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const GRAPHQL_URL = `${API_BASE_URL}/graphql`;

const gqlClient = new GraphQLClient(GRAPHQL_URL);

export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  await AsyncStorage.setItem('auth_token', data.token);
  await AsyncStorage.setItem('user_info', JSON.stringify(data.user));
  return data;
}

export async function signupUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Signup failed');
  await AsyncStorage.setItem('auth_token', data.token);
  await AsyncStorage.setItem('user_info', JSON.stringify(data.user));
  return data;
}

export async function logoutUser() {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_info');
}

const getChatSessionsQuery = `
  query GetChatSessions($userId: UUID!) {
    allChatSessions(condition: { userId: $userId }, orderBy: CREATED_AT_DESC) {
      nodes {
        id
        title
        createdAt
      }
    }
  }
`;

export async function fetchChatSessions(userId: string) {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    allChatSessions: { nodes: { id: string; title: string; createdAt: string }[] };
  }>(getChatSessionsQuery, { userId }, headers);
  return data.allChatSessions.nodes;
}

const createChatSessionMutation = `
  mutation CreateChatSession($userId: UUID!, $title: String!) {
    createChatSession(input: { chatSession: { userId: $userId, title: $title } }) {
      chatSession {
        id
        title
        createdAt
      }
    }
  }
`;

export async function createChatSession(userId: string, title: string) {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    createChatSession: { chatSession: { id: string; title: string; createdAt: string } };
  }>(createChatSessionMutation, { userId, title }, headers);
  return data.createChatSession.chatSession;
}

const getMessagesQuery = `
  query GetMessages($sessionId: UUID!) {
    allMessages(condition: { sessionId: $sessionId }, orderBy: CREATED_AT_ASC) {
      nodes {
        id
        sender
        content
        sourceCitation
        createdAt
      }
    }
  }
`;

export interface MessageNode {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  sourceCitation: { source: string; pageNumber?: number }[];
  createdAt: string;
}

export async function fetchMessages(sessionId: string): Promise<MessageNode[]> {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    allMessages: { nodes: MessageNode[] };
  }>(getMessagesQuery, { sessionId }, headers);
  return data.allMessages.nodes;
}

const askQuestionMutation = `
  mutation AskQuestion($sessionId: UUID!, $userId: UUID!, $question: String!) {
    askQuestion(sessionId: $sessionId, userId: $userId, question: $question) {
      messageId
      sessionId
      sender
      content
      sourceCitations
      createdAt
    }
  }
`;

export interface AskQuestionResult {
  messageId: string;
  sessionId: string;
  sender: 'bot';
  content: string;
  sourceCitations: { source: string; pageNumber?: number }[];
  createdAt: string;
}

export async function askQuestion(sessionId: string, userId: string, question: string): Promise<AskQuestionResult> {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    askQuestion: AskQuestionResult;
  }>(askQuestionMutation, { sessionId, userId, question }, headers);
  return data.askQuestion;
}

const createMessageMutation = `
  mutation CreateMessage($sessionId: UUID!, $sender: String!, $content: String!) {
    createMessage(input: { message: { sessionId: $sessionId, sender: $sender, content: $content } }) {
      message {
        id
        sender
        content
        sourceCitation
        createdAt
      }
    }
  }
`;

export async function createMessage(sessionId: string, sender: 'user' | 'bot', content: string): Promise<MessageNode> {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    createMessage: { message: MessageNode };
  }>(createMessageMutation, { sessionId, sender, content }, headers);
  return data.createMessage.message;
}

const uploadDocumentMutation = `
  mutation UploadDocument($name: String!, $base64Data: String!) {
    uploadDocument(input: { name: $name, base64Data: $base64Data }) {
      success
      documentId
      name
      chunkCount
    }
  }
`;

export interface UploadDocumentResult {
  success: boolean;
  documentId?: string;
  name: string;
  chunkCount: number;
}

export async function uploadDocument(name: string, base64Data: string): Promise<UploadDocumentResult> {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    uploadDocument: UploadDocumentResult;
  }>(uploadDocumentMutation, { name, base64Data }, headers);
  return data.uploadDocument;
}

const reindexDocumentsMutation = `
  mutation Reindex {
    reindexDocuments
  }
`;

export async function reindexDocuments(): Promise<boolean> {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    reindexDocuments: boolean;
  }>(reindexDocumentsMutation, {}, headers);
  return data.reindexDocuments;
}

const getDocumentsQuery = `
  query GetDocuments {
    allDocuments(orderBy: UPLOADED_AT_DESC) {
      nodes {
        id
        name
        uploadedAt
      }
    }
  }
`;

export async function fetchDocuments() {
  const headers = await getAuthHeader();
  const data = await gqlClient.request<{
    allDocuments: { nodes: { id: string; name: string; uploadedAt: string }[] };
  }>(getDocumentsQuery, {}, headers);
  return data.allDocuments.nodes;
}
