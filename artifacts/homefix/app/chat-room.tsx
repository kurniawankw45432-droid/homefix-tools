import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, FlatList, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back: 'https://img.icons8.com/ios-filled/50/ffffff/left.png',
  send: 'https://img.icons8.com/color/96/sent.png',
  chat: 'https://img.icons8.com/color/96/speech-bubble-with-dots.png',
  user: 'https://img.icons8.com/color/96/user-male-circle.png',
  deal: 'https://img.icons8.com/color/96/handshake.png',
  contract: 'https://img.icons8.com/color/96/signature.png',
};

type Pesan = {
  Chat_ID: string;
  Pengirim: string;
  Penerima: string;
  Pesan: string;
  Waktu: string;
  Status: string;
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const { penerima } = useLocalSearchParams<{ penerima: string }>();

  const [myUser, setMyUser] = useState<any>(null);
  const [messages, setMessages] = useState<Pesan[]>([]);
  const [teks, setTeks] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myUserRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await AsyncStorage.getItem('user_hf');
        if (s) {
          const parsed = JSON.parse(s);
          setMyUser(parsed);
          myUserRef.current = parsed;
        }
      } catch (e) {
        // ignore
      }
      await ambilPesan();
    };
    init();

    pollingRef.current = setInterval(ambilPesan, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // FIX: tandai pesan dari lawan sebagai "Dibaca" di server
  const tandaiSudahDibaca = async () => {
    if (!myUserRef.current?.Nama || !penerima) return;
    try {
      fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'markAllRead',
          sheet: 'chat',
          pengirim: penerima,
          penerima: myUserRef.current.Nama
        })
      });
    } catch (e) {
      // ignore, tidak perlu blokir tampilan chat
    }
  };

  const ambilPesan = async () => {
    try {
      const res = await fetch(BASE_URL + '?sheet=chat');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        // Setelah pesan diambil & ditampilkan, tandai yang dari lawan sebagai dibaca
        tandaiSudahDibaca();
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const pesanTampil = messages.filter(
    (m) =>
      (m.Pengirim === myUser?.Nama && m.Penerima === penerima) ||
      (m.Pengirim === penerima && m.Penerima === myUser?.Nama)
  );

  const kirimPesan = async () => {
    if (!teks.trim()) return;
    if (!myUser?.Nama) {
      Alert.alert('Sesi Habis', 'Silakan login ulang.');
      return;
    }

    const pesanBaru: Pesan = {
      Chat_ID: 'CHAT-' + Date.now(),
      Pengirim: myUser.Nama,
      Penerima: penerima as string,
      Pesan: teks.trim(),
      Waktu: new Date().toISOString(),
      Status: 'Belum',
    };

    setMessages((prev) => [...prev, pesanBaru]);
    setTeks('');
    setSending(true);

    try {
      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahChat',
          sheet: 'chat',
          data: pesanBaru,
        }),
      });
      await ambilPesan();
    } catch (e) {
      Alert.alert('Info', 'Pesan mungkin belum terkirim, coba lagi.');
    } finally {
      setSending(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleDeal = () => {
    Alert.alert('DEAL!', 'Siap buat Surat Perjanjian Kerja (SPK)?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Buat SPK',
        onPress: () =>
          router.push({
            pathname: '/create-contract',
            params: { penerima: penerima as string },
          }),
      },
    ]);
  };

  const formatWaktu = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderItem = ({ item }: { item: Pesan }) => {
    const isDariku = item.Pengirim === myUser?.Nama;
    const waktuText = formatWaktu(item.Waktu);

    return (
      <View style={[styles.bubbleRow, isDariku ? styles.rowKanan : styles.rowKiri]}>
        {!isDariku ? <Image source={{ uri: ICON_PNG.user }} style={styles.avatarKecil} /> : null}
        <View style={[styles.bubble, isDariku ? styles.bubbleSaya : styles.bubbleLawan]}>
          <Text style={[styles.bubbleTeks, isDariku ? styles.bubbleTeksSaya : null]}>
            {item.Pesan}
          </Text>
          <Text style={[styles.waktuTeks, isDariku ? styles.waktuTeksSaya : null]}>
            {waktuText}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={styles.iconBack} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Image source={{ uri: ICON_PNG.user }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerNama}>{penerima}</Text>
            <Text style={styles.headerStatus}>HomeFix Member</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.dealBtn} onPress={handleDeal}>
          <Image source={{ uri: ICON_PNG.deal }} style={styles.iconDeal} />
          <Text style={styles.dealTeks}>DEAL</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexFull}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0d47a1" />
            <Text style={styles.loadingTeks}>Memuat percakapan...</Text>
          </View>
        ) : pesanTampil.length === 0 ? (
          <View style={styles.center}>
            <Image source={{ uri: ICON_PNG.chat }} style={styles.iconChatEmpty} />
            <Text style={styles.emptyTeks}>{'Belum ada pesan.\nMulai percakapan sekarang!'}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={pesanTampil}
            keyExtractor={(item) => item.Chat_ID}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ketik pesan..."
            placeholderTextColor="#aaa"
            value={teks}
            onChangeText={setTeks}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.btnKirim, !teks.trim() || sending ? styles.btnKirimDisabled : null]}
            onPress={kirimPesan}
            disabled={!teks.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#0d47a1" size="small" />
            ) : (
              <Image source={{ uri: ICON_PNG.send }} style={styles.iconSend} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4fa' },
  flexFull: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingTeks: { marginTop: 12, color: '#999', fontSize: 13 },
  iconChatEmpty: { width: 64, height: 64, opacity: 0.3 },
  emptyTeks: { marginTop: 16, color: '#bbb', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#0d47a1',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 10,
  },
  backBtn: { padding: 5 },
  iconBack: { width: 24, height: 24 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFC400',
    marginRight: 10,
  },
  headerNama: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 10, color: '#FFC400', marginTop: 2 },

  dealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC400',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  iconDeal: { width: 18, height: 18 },
  dealTeks: { color: '#0d47a1', fontWeight: 'bold', fontSize: 13, marginLeft: 5 },

  listContent: { padding: 16, paddingBottom: 10 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  rowKiri: { justifyContent: 'flex-start' },
  rowKanan: { justifyContent: 'flex-end' },
  avatarKecil: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },

  bubble: { maxWidth: '75%', padding: 12, borderRadius: 25, elevation: 3 },
  bubbleSaya: { backgroundColor: '#0d47a1', borderBottomRightRadius: 5 },
  bubbleLawan: { backgroundColor: '#fff', borderBottomLeftRadius: 5 },
  bubbleTeks: { fontSize: 14, color: '#222', lineHeight: 20 },
  bubbleTeksSaya: { color: '#FFC400' },
  waktuTeks: { fontSize: 9, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  waktuTeksSaya: { color: '#90caf9' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  btnKirim: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFC400',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  btnKirimDisabled: { opacity: 0.5 },
  iconSend: { width: 22, height: 22 },
});