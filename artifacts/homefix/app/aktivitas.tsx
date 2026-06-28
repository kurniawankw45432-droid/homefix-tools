import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  SafeAreaView, ScrollView, ActivityIndicator, RefreshControl,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

// MASTER ICON PNG - ANTI BARANG HARAM
const ICON_PNG = {
  back:     "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  bell:     "https://img.icons8.com/fluency/96/alarm.png",
  comment:  "https://img.icons8.com/color/96/speech-bubble-with-dots.png",
  contract: "https://img.icons8.com/color/96/handshake.png",
  trash:    "https://img.icons8.com/color/96/trash.png",
  empty:    "https://img.icons8.com/bubbles/100/empty-box.png",
};

// FIX: daftar Tipe notifikasi yang terkait KONTRAK (bukan Komentar postingan biasa).
// Semua tipe ini Post_ID-nya berisi Kontrak_ID, harus diarahkan ke /contract-detail,
// bukan /post-detail (yang sebelumnya menyebabkan loading tanpa henti karena
// mencari Kontrak_ID di tab Postingan yang tidak akan pernah ketemu).
const TIPE_KONTRAK = [
  'dp_cair',
  'kasbon',
  'kasbon_respon',
  'kasbon_gagal',
  'kasbon_perlu_topup',
  'verifikasi_lokasi',
  'kontrak_selesai',
  'topup_jatuh_tempo',
];

export default function AktivitasScreen() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifs, setNotifs]         = useState<any[]>([]);
  const [user, setUser]             = useState<any>(null);

  // Badge merah: hitung yang belum dibaca
  const unreadCount = notifs.filter(n => n.Status === 'Belum').length;

  useFocusEffect(
    useCallback(() => {
      muatAktivitas();
    }, [])
  );

  const muatAktivitas = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) {
        const parsed = JSON.parse(session);
        setUser(parsed);
        const res  = await fetch(`${BASE_URL}?action=getAktivitas&nama=${encodeURIComponent(parsed.Nama)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // FIX: sortir ulang di frontend supaya pasti urut terbaru-di-atas,
          // walaupun format Waktu di server campur (ISO string ATAU
          // toLocaleString('id-ID') seperti "22/6/2026, 09.30.00").
          const terurut = [...data].sort((a, b) => parseWaktuAman(b.Waktu) - parseWaktuAman(a.Waktu));
          setNotifs(terurut);
        }
      }
    } catch (e) {
      console.log("Gagal muat aktivitas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // FIX: parser waktu yang aman untuk 2 format yang beredar di data lama:
  // 1) ISO standar -> new Date() langsung berhasil
  // 2) format id-ID "DD/MM/YYYY, HH.MM.SS" -> new Date() gagal, jadi NaN,
  //    perlu dirakit manual jadi format yang dikenali Date.
  const parseWaktuAman = (waktuStr: string): number => {
    if (!waktuStr) return 0;
    const langsung = new Date(waktuStr).getTime();
    if (!isNaN(langsung)) return langsung;

    // coba parse format "DD/MM/YYYY, HH.MM.SS"
    try {
      const [tglBagian, jamBagian] = waktuStr.split(',').map(s => s.trim());
      const [dd, mm, yyyy] = tglBagian.split('/').map(Number);
      const [hh, mi, ss] = (jamBagian || '0.0.0').split('.').map(Number);
      const hasil = new Date(yyyy, mm - 1, dd, hh || 0, mi || 0, ss || 0).getTime();
      return isNaN(hasil) ? 0 : hasil;
    } catch (e) {
      return 0;
    }
  };

  const handleKlikNotif = async (item: any) => {
    // 1. Optimistic update — badge langsung hilang tanpa tunggu server
    setNotifs(prev =>
      prev.map(n => n.ID === item.ID ? { ...n, Status: 'Sudah' } : n)
    );

    // 2. Tandai sudah dibaca di server (background)
    try {
      fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'markAsRead', sheet: 'Aktivitas', id: item.ID })
      });
    } catch (e) {}

    // 3. Navigasi ke sumber notif — FIX: cek Tipe dulu, kontrak vs komentar beda tujuan
    const adalahNotifKontrak = TIPE_KONTRAK.indexOf(item.Tipe) !== -1;

    if (item.Post_ID && item.Post_ID !== "-") {
      if (adalahNotifKontrak) {
        router.push({ pathname: '/contract-detail', params: { id: item.Post_ID } } as any);
      } else {
        router.push({ pathname: '/post-detail', params: { postId: item.Post_ID } } as any);
      }
    } else {
      Alert.alert("Info", item.Pesan);
    }
  };

  const hapusNotif = (id: string) => {
    Alert.alert("Hapus", "Hapus notifikasi ini?", [
      { text: "Batal" },
      {
        text: "Hapus", style: 'destructive',
        onPress: async () => {
          try {
            await fetch(BASE_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'deleteData', id })
            });
            setNotifs(notifs.filter(n => n.ID !== id));
          } catch (e) {}
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Pusat Aktivitas</Text>
            <Text style={styles.headerSub}>Notifikasi & Pemberitahuan</Text>
          </View>

          {/* Bell icon + badge merah FB-style */}
          <View style={styles.bellWrapper}>
            <Image source={{ uri: ICON_PNG.bell }} style={{ width: 35, height: 35 }} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={muatAktivitas} />}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
          ) : notifs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Image source={{ uri: ICON_PNG.empty }} style={{ width: 100, height: 100 }} />
              <Text style={styles.emptyText}>Belum ada aktivitas terbaru, Wan.</Text>
            </View>
          ) : (
            notifs.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.notifCard, item.Status === 'Belum' && styles.unreadCard]}
                onPress={() => handleKlikNotif(item)}
                activeOpacity={0.85}
              >
                <View style={styles.iconBox}>
                  <Image
                    source={{ uri: item.Tipe === 'Komentar' ? ICON_PNG.comment : ICON_PNG.contract }}
                    style={{ width: 30, height: 30 }}
                  />
                  {/* Dot kecil jika belum dibaca */}
                  {item.Status === 'Belum' && <View style={styles.dotUnread} />}
                </View>

                <View style={styles.contentBox}>
                  <View style={styles.notifHeader}>
                    <Text style={styles.notifType}>{item.Tipe?.toUpperCase()}</Text>
                    <Text style={styles.notifTime}>{item.Waktu?.split('T')[0]}</Text>
                  </View>
                  <Text style={styles.notifPesan} numberOfLines={2}>{item.Pesan}</Text>
                  <Text style={styles.notifSender}>Dari: {item.Pengirim}</Text>
                </View>

                <TouchableOpacity onPress={() => hapusNotif(item.ID)} style={styles.trashBtn}>
                  <Image source={{ uri: ICON_PNG.trash }} style={{ width: 18, height: 18 }} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f7fa' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 10 },
  headerTitleBox: { flex: 1, marginLeft: 15 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub:      { fontSize: 10, color: '#FFC400', fontWeight: 'bold' },
  backBtn:        { padding: 5 },

  // Bell + badge
  bellWrapper:    { position: 'relative' },
  badge:          { position: 'absolute', top: -6, right: -6, backgroundColor: '#ff1744', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#0d47a1' },
  badgeText:      { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  scroll:         { padding: 15 },
  notifCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  unreadCard:     { borderLeftWidth: 5, borderLeftColor: '#ff1744', backgroundColor: '#fff9f9' },
  iconBox:        { width: 50, height: 50, borderRadius: 15, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dotUnread:      { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff1744', borderWidth: 1.5, borderColor: '#fff' },
  contentBox:     { flex: 1, marginLeft: 15 },
  notifHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifType:      { fontSize: 9, fontWeight: 'bold', color: '#0d47a1' },
  notifTime:      { fontSize: 8, color: '#aaa' },
  notifPesan:     { fontSize: 13, color: '#333', fontWeight: '500', lineHeight: 18 },
  notifSender:    { fontSize: 10, color: '#888', marginTop: 5, fontStyle: 'italic' },
  trashBtn:       { padding: 10 },
  emptyBox:       { alignItems: 'center', marginTop: 100 },
  emptyText:      { color: '#999', fontSize: 14, fontStyle: 'italic', marginTop: 15 },
});