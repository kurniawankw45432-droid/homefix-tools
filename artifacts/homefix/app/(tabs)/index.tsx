import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, RefreshControl, StatusBar, Dimensions, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { BASE_URL } from '../../constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://i.imgur.com/RXnYsgm.png";

const ICON_PNG = {
  bangun:     "https://img.icons8.com/color/96/home--v1.png",
  renovasi:   "https://img.icons8.com/color/96/maintenance.png",
  pesan:      "https://img.icons8.com/color/96/worker-male--v1.png",
  material:   "https://img.icons8.com/color/96/truck.png",
  buku:       "https://img.icons8.com/color/96/address-book.png",
  ai:         "https://img.icons8.com/color/96/artificial-intelligence.png",
  kalkulator: "https://img.icons8.com/color/96/calculator--v1.png",
  saldo:      "https://img.icons8.com/color/96/safe.png",
  bell:       "https://img.icons8.com/fluency/96/alarm.png",
  chat:       "https://img.icons8.com/color/96/speech-bubble-with-dots.png",
  plus:       "https://img.icons8.com/color/96/plus--v1.png",
  map:        "https://img.icons8.com/color/96/marker.png",
  edit:       "https://img.icons8.com/color/96/edit--v1.png",
  trash:      "https://img.icons8.com/color/96/trash.png",
  rantau:     "https://img.icons8.com/color/96/suitcase.png",
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [user, setUser]               = useState<any>(null);
  const [posts, setPosts]             = useState<any[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadChat, setUnreadChat]   = useState(0);

  useFocusEffect(
    useCallback(() => { ambilData(); }, [])
  );

  const updateLokasiGPS = async (userId: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const posisi = await Location.getCurrentPositionAsync({});
      await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateLokasi',
          user_id: userId,
          lat: posisi.coords.latitude,
          lng: posisi.coords.longitude,
        }),
      });
    } catch (e) {
      console.log("Gagal update lokasi GPS:", e);
    }
  };

  const ambilData = async () => {
    try {
      const localVal = await AsyncStorage.getItem('user_hf');
      var parsedUser: any = null;
      if (localVal) {
        parsedUser = JSON.parse(localVal);
        setUser(parsedUser);
      }
      const resPost  = await fetch(`${BASE_URL}?sheet=Postingan`);
      const dataPost = await resPost.json();
      if (Array.isArray(dataPost)) {
        setPosts(dataPost.reverse().filter(p => p && p.Judul));
      }

      if (parsedUser?.Nama) {
        try {
          const resNotif  = await fetch(`${BASE_URL}?action=getAktivitas&nama=${encodeURIComponent(parsedUser.Nama)}`);
          const dataNotif = await resNotif.json();
          if (Array.isArray(dataNotif)) {
            const jumlahBelum = dataNotif.filter((n: any) => n.Status === 'Belum').length;
            setUnreadNotif(jumlahBelum);
          }
        } catch (eNotif) {
          console.log("Gagal hitung notif:", eNotif);
        }

        try {
          const resChat  = await fetch(`${BASE_URL}?sheet=chat`);
          const dataChat = await resChat.json();
          if (Array.isArray(dataChat)) {
            const jumlahPesanBelum = dataChat.filter(
              (c: any) => c.Penerima === parsedUser.Nama && c.Status === 'Belum'
            ).length;
            setUnreadChat(jumlahPesanBelum);
          }
        } catch (eChat) {
          console.log("Gagal hitung pesan:", eChat);
        }

        if (parsedUser.User_ID) {
          updateLokasiGPS(parsedUser.User_ID);
        }
      }
    } catch (error) {
      console.log("Sync Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleHapus = (id: string) => {
    Alert.alert("Hapus", "Yakin hapus postingan ini?", [
      { text: "Batal" },
      { text: "Hapus", style: 'destructive', onPress: async () => {
        try {
          await fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteData', sheet: 'Postingan', id })
          });
          ambilData();
        } catch (e) { Alert.alert("Error", "Gagal hapus."); }
      }}
    ]);
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0d47a1" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgHeader} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={ambilData} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.logoWrapper}>
              <Image source={{ uri: LOGO_URL }} style={styles.logoImg} />
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => router.push('/inbox' as any)}
                style={styles.iconBtn}
              >
                <Image source={{ uri: ICON_PNG.chat }} style={{ width: 30, height: 30 }} />
                {unreadChat > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadChat > 99 ? '99+' : unreadChat}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/aktivitas' as any)}
                style={styles.iconBtn}
              >
                <Image source={{ uri: ICON_PNG.bell }} style={{ width: 30, height: 30 }} />
                {unreadNotif > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadNotif > 99 ? '99+' : unreadNotif}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.menuGrid}>
          <View style={styles.menuCard}>
            <View style={styles.menuRow}>
              <MenuIcon label="Bangun"   img={ICON_PNG.bangun}    onPress={() => router.push({pathname:'/post-job', params:{mode:'Bangun'}} as any)} />
              <MenuIcon label="Renovasi" img={ICON_PNG.renovasi}  onPress={() => router.push({pathname:'/post-job', params:{mode:'Renovasi'}} as any)} />
              <MenuIcon label="Pesan"    img={ICON_PNG.pesan}     onPress={() => router.push('/artisan-list' as any)} />
              <MenuIcon label="Material" img={ICON_PNG.material}  onPress={() => router.push('/material-list' as any)} />
            </View>
            <View style={[styles.menuRow, { marginTop: 20 }]}>
              <MenuIcon label="Buku Kerja"  img={ICON_PNG.buku}       onPress={() => router.push('/buku-kerja' as any)} />
              <MenuIcon label="AI Arsitek"  img={ICON_PNG.ai}         onPress={() => router.push('/ai-architect' as any)} />
              <MenuIcon label="Kalkulator"  img={ICON_PNG.kalkulator} onPress={() => router.push('/kalkulator' as any)} />
              <MenuIcon label="Isi Saldo"   img={ICON_PNG.saldo}      onPress={() => router.push('/history' as any)} />
            </View>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.btnPost}
            onPress={() => router.push({pathname:'/post-job', params:{mode:'Posting'}} as any)}
          >
            <View style={styles.plusCircle}>
              <Image source={{ uri: ICON_PNG.plus }} style={{ width: 18, height: 18 }} />
            </View>
            <Text style={styles.btnPostText}>POSTING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnRantau}
            onPress={() => router.push('/merantau' as any)}
          >
            <View style={styles.rantauCircle}>
              <Image source={{ uri: ICON_PNG.rantau }} style={{ width: 18, height: 18 }} />
            </View>
            <Text style={styles.btnRantauText}>MERANTAU</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feed}>
          <Text style={styles.sectionTitle}>Radar HomeFix</Text>
          {posts.map((post, i) => {
            const isMe    = user?.Nama === post.User_ID_Pembuat;
            const isPromo = post.Jenis_Postingan === 'Posting';
            return (
              <View key={i} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Text style={styles.postUser}>@{post.User_ID_Pembuat}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.typeBadge, { backgroundColor: isPromo ? '#e8f5e9' : '#e3f2fd' }]}>
                      <Text style={[styles.typeText, { color: isPromo ? '#2e7d32' : '#0d47a1' }]}>
                        {isPromo ? 'PROMO' : 'LOWONGAN'}
                      </Text>
                    </View>
                    {isMe && (
                      <View style={{ flexDirection: 'row', marginLeft: 10 }}>
                        <TouchableOpacity onPress={() => router.push({pathname:'/post-job', params:{editId: post.Post_ID}} as any)}>
                          <Image source={{ uri: ICON_PNG.edit }}  style={{ width: 20, height: 20, marginRight: 10 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleHapus(post.Post_ID)}>
                          <Image source={{ uri: ICON_PNG.trash }} style={{ width: 20, height: 20 }} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity onPress={() => router.push({ pathname: '/post-detail', params: { postId: post.Post_ID } } as any)}>
                  <Text style={styles.postTitle}>{post.Judul}</Text>
                  <Text style={styles.postDesc} numberOfLines={2}>{post.Deskripsi}</Text>
                  <View style={styles.postFooter}>
                    <View style={styles.locRow}>
                      <Image source={{ uri: ICON_PNG.map }} style={{ width: 12, height: 12 }} />
                      <Text style={styles.locText}>{post.Kota || 'Nasional'}</Text>
                    </View>
                    {!isPromo && <Text style={styles.budgetText}>Rp {Number(post.Budget).toLocaleString('id-ID')}</Text>}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuIcon = ({ label, img, onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.iconCircle}>
      <Image source={{ uri: img }} style={styles.iconImg} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bgHeader:      { position: 'absolute', top: 0, width, height: 145, backgroundColor: '#0d47a1', borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerContent: { padding: 20, paddingTop: 35 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logoWrapper: { flex: 1, alignItems: 'flex-start', marginLeft: -10 },
  logoImg:     { width: 280, height: 120, resizeMode: 'contain' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:     { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  badge:       { position: 'absolute', right: 4, top: 4, backgroundColor: '#ff1744', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0d47a1' },
  badgeText:   { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  menuGrid:   { paddingHorizontal: 20, marginTop: 10 },
  menuCard:   { backgroundColor: '#fff', padding: 20, borderRadius: 25, elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  menuRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  menuItem:   { alignItems: 'center', width: '23%' },
  iconCircle: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  iconImg:    { width: 30, height: 30 },
  menuLabel:  { fontSize: 10, fontWeight: 'bold', color: '#333' },

  btnRow:      { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, gap: 12 },
  btnPost:     { flex: 1, backgroundColor: '#0d47a1', padding: 16, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  plusCircle:  { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFC400', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  btnPostText: { color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
  btnRantau:      { flex: 1, backgroundColor: '#FFC400', padding: 16, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  rantauCircle:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  btnRantauText:  { color: '#0d47a1', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },

  feed:         { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15 },
  postCard:     { backgroundColor: '#fff', borderRadius: 25, padding: 20, marginBottom: 15, elevation: 5, borderLeftWidth: 5, borderLeftColor: '#FFC400' },
  postHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  postUser:     { fontWeight: 'bold', color: '#0d47a1', fontSize: 12 },
  typeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText:     { fontSize: 8, fontWeight: 'bold' },
  postTitle:    { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  postDesc:     { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  postFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locRow:       { flexDirection: 'row', alignItems: 'center' },
  locText:      { fontSize: 10, color: '#888', marginLeft: 4 },
  budgetText:   { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
});