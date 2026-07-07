import { TextStyle } from 'react-native';

export const typography = {
  fontFamily: 'Inter',
  
  h1: {
    fontFamily: 'System', // Fallback to System on mobile; Inter must be linked/loaded
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
  },
  h2: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  body: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  buttonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
  }
};
