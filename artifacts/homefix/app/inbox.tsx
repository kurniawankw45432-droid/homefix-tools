import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  SafeAreaView, ActivityIndicator, StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back: 'https://img.icons8.com/ios-filled/50/ffffff/left.png',
  inbox: 'https://img.icons8.com/fluency/96/chat.png',
  user: 'https://img.icons8.com/color/96/user-male-circle.png',
  empty: 'https://img.icons8.com/bubbles/100/empty-box.png',
};

export default function InboxScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [myUser, setMyUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      muatPesan();
    }, [])
  );

  const muatPesan = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (!session) return;
      const userData = JSON.parse(session);
      setMyUser(userData);

      const res = await fetch(BASE_URL + '?sheet=chat');
      const data = await res.json();

      if (Array.isArray(data)) {
        const myChats = data.filter(
          (m) => m.Pengirim === userData.Nama || m.Penerima === userData.Nama
        );

        const grouped: any = {};
        myChats.forEach((m) => {
          const lawan = m.Pengirim === userData.Nama ? m.Penerima : m.Pengirim;
          if (!grouped[lawan] || new Date(m.Waktu) > new Date(grouped[lawan].Waktu)) {
            const unreadCount = myChats.filter(
              (c) => c.Pengirim === lawan && c.Penerima === userData.Nama && c.Status === 'Belum'
            ).length;
            grouped[lawan] = { ...m, lawan, unreadCount };
          }
        });

        const finalArray = Object.values(grouped).sort(
          (a: any, b: any) => new Date(b.Waktu).getTime() - new Date(a.Waktu).getTime()
        );
        setChats(finalArray);
      }
    } catch (e) {
      console.log('Gagal muat inbox');
    } finally {
      setLoading(false);
    }
  };

  // FIX: tandai semua pesan dari lawan ini sebagai "Dibaca" begitu chat dibuka
  const bukaChat = async (lawan: string) => {
    if (myUser?.Nama) {
      try {
        fetch(BASE_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'markAllRead',
            sheet: 'chat',
            pengirim: lawan,
            penerima: myUser.Nama
          })
        });
      } catch (e) {
        // ignore, navigasi tetap lanjut walau gagal tandai dibaca
      }
    }
    router.push({ pathname: '/chat-room', params: { penerima: lawan } } as any);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.lawan || 'User') + '&background=0d47a1&color=fff';
    const tanggalText = new Date(item.Waktu).toLocaleDateString();

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => bukaChat(item.lawan)}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.chatInfo}>
          <View style={styles.row}>
            <Text style={styles.nameText}>{item.lawan}</Text>
            <Text style={styles.timeText}>{tanggalText}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.msgPreview} numberOfLines={1}>{item.Pesan}</Text>
            {item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON_PNG.back }} style={styles.iconBack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kotak Masuk</Text>
        <Image source={{ uri: ICON_PNG.inbox }} style={styles.iconInbox} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0d47a1" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item, index) => (item.Chat_ID ? String(item.Chat_ID) : 'chat-' + index)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image source={{ uri: ICON_PNG.empty }} style={styles.iconEmpty} />
              <Text style={styles.emptyText}>Belum ada pesan masuk, Wan.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#0d47a1',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
  },
  iconBack: { width: 24, height: 24 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 15 },
  iconInbox: { width: 30, height: 30 },
  listContent: { padding: 20 },

  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
  },
  avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#eee' },
  chatInfo: { flex: 1, marginLeft: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 10, color: '#aaa' },
  msgPreview: { fontSize: 13, color: '#666', flex: 1, marginRight: 10 },
  unreadBadge: {
    backgroundColor: '#ff3d00',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  empty: { alignItems: 'center', marginTop: 100 },
  iconEmpty: { width: 100, height: 100 },
  emptyText: { color: '#999', marginTop: 10, fontWeight: 'bold' },
});