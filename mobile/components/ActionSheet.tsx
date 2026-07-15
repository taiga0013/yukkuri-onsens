import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

// Alert.alertの複数ボタンはreact-native-webで空実装（何も表示されない）ため、
// Web/ネイティブ問わず一貫して動く選択メニューとしてModalベースで実装する。
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  const { colors, radius } = useTheme();

  const select = (option: ActionSheetOption) => {
    onClose();
    option.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.bgOverlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <Text style={[styles.title, { color: colors.inkFaint, borderColor: colors.rule }]}>{title}</Text>
          ) : null}
          {options.map((option, i) => (
            <Pressable
              key={i}
              onPress={() => select(option)}
              style={[styles.option, { borderColor: colors.rule }]}
            >
              <Text style={{ color: option.destructive ? colors.danger : colors.ink, fontSize: 14.5, fontWeight: '600' }}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={{ color: colors.inkFaint, fontSize: 14.5, fontWeight: '600' }}>キャンセル</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { margin: 16, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 12, textAlign: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  option: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1 },
  cancel: { paddingVertical: 15, alignItems: 'center' },
});
