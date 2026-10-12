import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback((options: ToastOptions | string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const toastData: ToastOptions = typeof options === 'string' 
      ? { message: options, type: 'info' } 
      : { type: 'info', ...options };

    setToast(toastData);

    translateY.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const duration = toastData.duration || 3500;
    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [hideToast, translateY, opacity]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ message, title: title || 'Success', type: 'success' });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ message, title: title || 'Error', type: 'error' });
  }, [showToast]);

  const getToastColors = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          iconColor: '#059669',
          titleColor: '#065f46',
          textColor: '#047857',
        };
      case 'error':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          iconColor: '#dc2626',
          titleColor: '#991b1b',
          textColor: '#b91c1c',
        };
      default:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          iconColor: '#2563eb',
          titleColor: '#1e40af',
          textColor: '#1d4ed8',
        };
    }
  };

  const colors = getToastColors(toast?.type);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            {
              top: Math.max(insets.top + 8, 16),
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toast,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.iconContainer}>
              {toast.type === 'success' && <CheckCircle2 size={22} color={colors.iconColor} />}
              {toast.type === 'error' && <AlertCircle size={22} color={colors.iconColor} />}
              {toast.type === 'info' && <Info size={22} color={colors.iconColor} />}
            </View>

            <View style={styles.textContainer}>
              {toast.title ? (
                <Text style={[styles.title, { color: colors.titleColor }]}>
                  {toast.title}
                </Text>
              ) : null}
              <Text style={[styles.message, { color: colors.textColor }]}>
                {toast.message}
              </Text>
            </View>

            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.closeButton}>
              <X size={16} color={colors.textColor} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
    elevation: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
});
