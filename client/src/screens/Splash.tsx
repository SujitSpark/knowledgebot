import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bot } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Chat: { sessionId: string; sessionTitle: string };
  History: undefined;
  Settings: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface SplashProps {
  navigation: NavigationProp;
}

export const Splash: React.FC<SplashProps> = ({ navigation }) => {
  useEffect(() => {
    const checkAuthStatus = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    };

    checkAuthStatus();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Bot size={64} color={colors.tertiary} />
        <Text style={styles.appName}>KnowledgeBot</Text>
        <Text style={styles.subtitle}>KnowledgeBot Support Assistant</Text>
      </View>
      <ActivityIndicator size="small" color={colors.tertiary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    ...typography.h1,
    color: colors.white,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
