import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface LoadingSkeletonProps {
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ style }) => {
  const shimmerAnimatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimatedValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shimmerAnimatedValue]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { opacity: shimmerAnimatedValue },
        style,
      ]}
    />
  );
};

export const LoadingSkeletonList: React.FC = () => {
  return (
    <View style={styles.listContainer}>
      <LoadingSkeleton style={styles.cardHeader} />
      <LoadingSkeleton style={styles.cardBodyShort} />
      <LoadingSkeleton style={styles.cardBodyLong} />
      <View style={{ height: 16 }} />
      <LoadingSkeleton style={styles.cardHeader} />
      <LoadingSkeleton style={styles.cardBodyLong} />
      <LoadingSkeleton style={styles.cardBodyShort} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  listContainer: {
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    width: '40%',
    height: 18,
    marginBottom: 4,
  },
  cardBodyShort: {
    width: '75%',
    height: 14,
  },
  cardBodyLong: {
    width: '90%',
    height: 14,
  },
});
