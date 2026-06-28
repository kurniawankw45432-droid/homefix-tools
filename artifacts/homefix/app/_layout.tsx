import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { LanguageProvider } from '../utils/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0d47a1" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post-job" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ai-architect" />
        <Stack.Screen name="kalkulator" />
        <Stack.Screen name="post-detail" />
        <Stack.Screen name="chat-room" />
        <Stack.Screen name="create-contract" />
        <Stack.Screen name="contract-detail" />
        <Stack.Screen name="kasbon-request" />
        <Stack.Screen name="rating-screen" />
        <Stack.Screen name="topup" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="view-profile" />
        <Stack.Screen name="ajak-kerja" />
        <Stack.Screen name="buku-kerja" />
        <Stack.Screen name="history" />
        <Stack.Screen name="aktivitas" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="artisan-list" />
        <Stack.Screen name="material-list" />
      </Stack>
    </LanguageProvider>
  );
}