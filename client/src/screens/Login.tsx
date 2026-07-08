import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { loginUser, signupUser } from '../api/graphql';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Bot } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginProps {
  navigation: NavigationProp;
}

export const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signupUser(email, password);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await loginUser(email, password);
      }
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Authentication Failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Bot size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome to KnowledgeBot</Text>
          <Text style={styles.subtitle}>Sign in to access ConnectWise Support</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. support@connectwise.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title={isSignup ? 'Create Account' : 'Sign In'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <Button
            title={isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            onPress={() => setIsSignup(!isSignup)}
            variant="outlined"
            style={styles.toggleBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: colors.textPrimary,
    backgroundColor: '#FAFBFC',
  },
  submitBtn: {
    marginTop: 8,
  },
  toggleBtn: {
    marginTop: 12,
    borderWidth: 0,
  },
});
