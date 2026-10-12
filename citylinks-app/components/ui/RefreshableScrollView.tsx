import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  RefreshControl,
  RefreshControlProps,
} from 'react-native';

export interface AppRefreshControlProps extends Partial<RefreshControlProps> {
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

/**
 * Standardized Pull-To-Refresh Control for CityLinks
 * Use directly on FlatList, SectionList, or custom scroll views
 */
export function AppRefreshControl({
  refreshing: controlledRefreshing,
  onRefresh,
  colors = ['#2563eb', '#9333ea'],
  tintColor = '#2563eb',
  progressBackgroundColor = '#ffffff',
  ...rest
}: AppRefreshControlProps) {
  const [internalRefreshing, setInternalRefreshing] = useState(false);

  const isRefreshing =
    controlledRefreshing !== undefined ? controlledRefreshing : internalRefreshing;

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    if (controlledRefreshing === undefined) {
      setInternalRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setInternalRefreshing(false);
      }
    } else {
      onRefresh();
    }
  }, [onRefresh, controlledRefreshing]);

  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      colors={colors}
      tintColor={tintColor}
      progressBackgroundColor={progressBackgroundColor}
      {...rest}
    />
  );
}

export interface RefreshableScrollViewProps extends ScrollViewProps {
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  refreshColors?: string[];
  refreshTintColor?: string;
}

/**
 * Universal RefreshableScrollView component
 * Supports pull-to-refresh on all present & future CityLinks pages
 */
export default function RefreshableScrollView({
  children,
  onRefresh,
  refreshing,
  refreshColors = ['#2563eb', '#9333ea'],
  refreshTintColor = '#2563eb',
  ...scrollViewProps
}: RefreshableScrollViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={refreshColors}
            tintColor={refreshTintColor}
          />
        ) : undefined
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}
