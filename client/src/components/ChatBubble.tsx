import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ShieldCheck, BookOpen } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Citation {
  source: string;
  pageNumber?: number;
}

interface ChatBubbleProps {
  sender: 'user' | 'bot';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  sender,
  content,
  citations = [],
  timestamp,
}) => {
  const isUser = sender === 'user';

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.botWrapper]}>
      {/* Bot Icon Indicator */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <ShieldCheck size={18} color={colors.white} />
        </View>
      )}

      <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
        {/* Message Content */}
        {isUser ? (
          <Text style={styles.userText}>{content}</Text>
        ) : (
          <View style={styles.markdownContainer}>
            <Markdown style={markdownStyles}>{content}</Markdown>
          </View>
        )}



        {/* Timestamp */}
        <Text style={[styles.timeText, isUser ? styles.userTime : styles.botTime]}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  botWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  container: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userContainer: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  botContainer: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userText: {
    ...typography.body,
    color: colors.white,
  },
  markdownContainer: {
    marginVertical: -6, // Compensate for Markdown default margins
  },
  citationsSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  citationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  citationsTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  citationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  citationBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  citationBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 9,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: '#D1FAE5',
  },
  botTime: {
    color: colors.textSecondary,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  paragraph: {
    marginVertical: 4,
  },
  heading1: {
    ...typography.h2,
    color: colors.navy,
    marginVertical: 4,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginVertical: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  strong: {
    fontWeight: '600',
  },
  em: {
    fontStyle: 'italic',
  },
});
