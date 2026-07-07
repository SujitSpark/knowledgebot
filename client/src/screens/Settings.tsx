import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { reindexDocuments, uploadDocument } from '../api/graphql';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { ArrowLeft, RefreshCw, UploadCloud, Database, ShieldAlert } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsProps {
  navigation: NavigationProp;
}

export const Settings: React.FC<SettingsProps> = ({ navigation }) => {
  const [reindexing, setReindexing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const success = await reindexDocuments();
      if (success) {
        Alert.alert('Reindexing Successful', 'All documents in docs/ folder have been re-parsed, chunked, and embedded into PostgreSQL.');
      } else {
        Alert.alert('Reindexing Failed', 'The server reported a failure.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to communicate with reindex endpoint.');
    } finally {
      setReindexing(false);
    }
  };

  const handleSimulateUpload = async (docType: 'mfa' | 'backup') => {
    setUploading(true);
    try {
      let name = '';
      let base64Mock = '';
      
      if (docType === 'mfa') {
        name = 'ConnectWise_MFA_Guidelines.pdf';
        base64Mock = 'JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL1Jlc291cmNlcyA8PCA+PgogICAgIC9Db250ZW50cyA0IDAgUgogID4+CmVuZG9iago0IDAgb2JqCiAgPDwgL0xlbmd0aCA2MCA+PgpzdHJlYW0KQlQgL0YxIDEyIFRmIDcwIDcwMCBUZCAoQ29ubmVjdFdpc2UgTUZBIEd1aWRlbGluZXMgLSBFbmZvcmNlIDJGQSBvbiBhbGwgYWRtaW4gYWNjb3VudHMgcG9ydHMgODA0MCBhbmQgODA0MSkgVmogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA3MCAwMDAwMCBuIAowMDAwMDAwMTMwIDAwMDAgbiAKMDAwMDAwMDIwNiAwMDAwMCBuIAp0cmFpbGVyCiAgPDwgL1NpemUgNQogICAgIC9Sb290IDEgMCBSCiAgPj4Kc3RhcnR4cmVmCjMyNQolJUVPRgo=';
      } else {
        name = 'ConnectWise_Control_Backup_Rules.pdf';
        base64Mock = 'JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL1Jlc291cmNlcyA8PCA+PgogICAgIC9Db250ZW50cyA0IDAgUgogID4+CmVuZG9iago0IDAgb2JqCiAgPDwgL0xlbmd0aCA2MCA+PgpzdHJlYW0KQlQgL0YxIDEyIFRmIDcwIDcwMCBUZCAoQ29ubmVjdFdpc2UgQmFja3VwIFJ1bGVzIC0gQmFja3VwIGRhdGFiYXNlIGRhaWx5IHNhdmUgdG8gc2VjdXJlIExBTikgVmogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA3MCAwMDAwMCBuIAowMDAwMDAwMTMwIDAwMDAgbiAKMDAwMDAwMDIwNiAwMDAwMCBuIAp0cmFpbGVyCiAgPDwgL1NpemUgNQogICAgIC9Sb290IDEgMCBSCiAgPj4Kc3RhcnR4cmVmCjMyNQolJUVPRgo=';
      }

      console.log(`Uploading ${name}...`);
      const result = await uploadDocument(name, base64Mock);
      if (result.success) {
        Alert.alert('Upload Successful', `Successfully uploaded and chunked "${result.name}" into ${result.chunkCount} database records.`);
      } else {
        Alert.alert('Upload Failed', 'The server reported a failure.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleRealUpload = async () => {
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      console.log(`Reading local file: ${file.name} from URI: ${file.uri}`);

      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`Uploading ${file.name} to server...`);
      const uploadResult = await uploadDocument(file.name, base64Data);

      if (uploadResult.success) {
        Alert.alert(
          'Upload Successful',
          `Successfully uploaded, parsed, and embedded "${uploadResult.name}" into ${uploadResult.chunkCount} document chunks.`
        );
      } else {
        Alert.alert('Upload Failed', 'The server reported a failure.');
      }
    } catch (e) {
      console.error('Document picker error:', e);
      Alert.alert('Error', 'Failed to pick or upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Control Panel</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Database Reindexing</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Clear database, read the documentation files from the server's `docs/` folder, generate text chunks, compute embeddings using local Ollama (`nomic-embed-text`), and update PostgreSQL.
          </Text>
          <Button
            title="Reindex All Documents"
            onPress={handleReindex}
            loading={reindexing}
            disabled={uploading}
            style={styles.actionBtn}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <UploadCloud size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Document Upload</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Select and upload a custom PDF document from your device, or test the pipeline using pre-loaded templates. The server parses text page-by-page, generates vector embeddings, and indexes them in PostgreSQL.
          </Text>
          <Button
            title="Select & Upload PDF"
            onPress={handleRealUpload}
            loading={uploading && !reindexing}
            disabled={reindexing}
            style={styles.actionBtn}
          />
          <View style={[styles.btnGroup, { marginTop: 12 }]}>
            <Button
              title="Simulate MFA Doc"
              onPress={() => handleSimulateUpload('mfa')}
              variant="outlined"
              loading={uploading && !reindexing}
              disabled={reindexing}
              style={styles.uploadBtn}
            />
            <Button
              title="Simulate Backup Doc"
              onPress={() => handleSimulateUpload('backup')}
              variant="outlined"
              loading={uploading && !reindexing}
              disabled={reindexing}
              style={styles.uploadBtn}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ShieldAlert size={20} color={colors.navy} />
            <Text style={styles.sectionTitle}>Local Pipeline Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Embedding Model:</Text>
            <Text style={styles.statusVal}>nomic-embed-text (Active)</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Generative LLM:</Text>
            <Text style={styles.statusVal}>gemma2:2b (Active)</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Database Vector Extension:</Text>
            <Text style={styles.statusVal}>pgvector (Active)</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Local Server Host:</Text>
            <Text style={styles.statusVal}>127.0.0.1 (Online)</Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContainer: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.navy,
    fontWeight: '700',
  },
  sectionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    width: '100%',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    height: 40,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusVal: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
