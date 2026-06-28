import { Tabs } from 'expo-router';
import { Image, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0d47a1',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { 
          fontSize: 10, 
          fontWeight: 'bold', 
          marginBottom: 10,
        },
        tabBarStyle: {
          height: 80,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          backgroundColor: '#ffffff',
          elevation: 25,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          borderTopWidth: 0,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={{ uri: 'https://img.icons8.com/fluency/96/home.png' }} 
              style={[styles.icon, { opacity: focused ? 1 : 0.4 }]} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="artisan-list"
        options={{
          title: 'Cari',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={{ uri: 'https://img.icons8.com/fluency/96/search.png' }} 
              style={[styles.icon, { opacity: focused ? 1 : 0.4 }]} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contract-list"
        options={{
          title: 'Kontrak',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={{ uri: 'https://img.icons8.com/fluency/96/contract.png' }} 
              style={[styles.icon, { opacity: focused ? 1 : 0.4 }]} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'KTA',
          tabBarIcon: ({ focused }) => (
            <Image 
              source={{ uri: 'https://img.icons8.com/fluency/96/user-male-circle.png' }} 
              style={[styles.icon, { opacity: focused ? 1 : 0.4 }]} 
            />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});