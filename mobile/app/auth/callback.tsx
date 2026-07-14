import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../../constants/theme';

// Web版OAuthリダイレクトの着地点。
// セッションの検出・遷移はルートレイアウト（AuthContext + Navigation）が
// グローバルに処理するため、ここでは待機中のスピナーを表示するだけでよい。
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
