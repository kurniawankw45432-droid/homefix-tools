import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator, FlatList 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';
  
// MASTER ICON PNG (ANTI KOTAK SILANG)
const ICON_PNG = {
  back: "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  check: "https://img.icons8.com/color/96/checked-checkbox.png",
  uncheck: "https://img.icons8.com/ios/96/cccccc/square.png",
  send: "https://img.icons8.com/color/96/sent.png",
  work: "https://img.icons8.com/color/96/worker-male--v1.png"
};
  
export default function AjakKerjaScreen() {
  const router = useRouter();
  const { targetMitra } = useLocalSearchParams(); // Nama Mitra yang diajak
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [myUser, setMyUser] = useState<any>(null);
  
  useEffect(() => {
    const initData = async () => {
      try {
        const session = await AsyncStorage.getItem('user_hf');
        if (session) {
          const user = JSON.parse(session);
          setMyUser(user);
          
          // Ambil daftar postingan milik Owner ini untuk ditawarkan
          const res = await fetch(`${BASE_URL}?sheet=Postingan`);
          const data = await res.json();
          if (Array.isArray(data)) {
            const mine = data.filter(p => p.User_ID_Pembuat === user.Nama);
            setMyPosts(mine);
          }
        }
      } catch (e) {
        console.log("Error Load My Posts");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);
  
  const handleKirimAjakan = async () => {
    if (!selectedPost) {
      Alert.alert("Pilih Kerja", "Pilih dulu salah satu lowongan lo untuk ditawarkan ke " + targetMitra);
      return;
    }
  
    setSending(true);
    const pesanUndangan = `Halo ${targetMitra}, gue tertarik ajak lo kerja di proyek: "${selectedPost.Judul}". Cek detailnya yuk, siapa tahu cocok!`;
  
    try {
      // Kirim pesan otomatis ke sistem chat (Japri)
      const res = await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'tambahChat',
          sheet: 'chat',
          data: {
            Chat_ID: "INV-" + Date.now(),
            Pengirim: myUser.Nama,
            Penerima: targetMitra,
            Pesan: pesanUndangan,
            Waktu: new Date().toISOString(),
            Status: "Belum"
          }
        })
      });
  
      const result = await res.json();
      if (result.status === 'success') {
        Alert.alert("Berhasil!", "Undangan kerja sudah terkirim. Mari lanjut ngobrol di ruang chat.", [
          { 
            text: "MENUJU CHAT", 
            onPress: () => router.push({ 
              pathname: '/chat-room', 
              params: { penerima: targetMitra, judulPekerjaan: selectedPost.Judul } 
            } as any) 
          }
        ]);
      }
    } catch (e) {
      Alert.alert("Error", "Gagal mengirim undangan. Cek koneksi lo.");
    } finally {
      setSending(false);
    }
  };
  
  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#0d47a1" size="large" />
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Undang Kerja Mitra</Text>
        <View style={{ width: 40 }} />
      </View>
  
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* INFO MITRA TARGET */}
          <View style={styles.mitraProfile}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${targetMitra}&background=FFC400&color=0d47a1&bold=true` }} 
              style={styles.avatar} 
            />
            <Text style={styles.mitraName}>{targetMitra}</Text>
            <Text style={styles.mitraSub}>Tawarkan proyek lo secara eksklusif</Text>
          </View>
  
          <View style={styles.divider} />
  
          <Text style={styles.label}>Pilih Lowongan Kerja Lo:</Text>
          
          {myPosts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Image source={{ uri: ICON_PNG.work }} style={{width: 50, height: 50, opacity: 0.2}} />
              <Text style={styles.emptyText}>Lo belum punya postingan lowongan kerja aktif.</Text>
              <TouchableOpacity onPress={() => router.push('/post-job' as any)}>
                <Text style={styles.btnPostNow}>+ Buat Postingan Sekarang</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myPosts.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.postItem, selectedPost?.Post_ID === item.Post_ID && styles.postItemSelected]}
                onPress={() => setSelectedPost(item)}
              >
                <Image 
                  source={{ uri: selectedPost?.Post_ID === item.Post_ID ? ICON_PNG.check : ICON_PNG.uncheck }} 
                  style={{ width: 24, height: 24 }} 
                />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={styles.postTitle} numberOfLines={1}>{item.Judul}</Text>
                  <Text style={styles.postLoc}>{item.Kota || 'Lokasi Proyek'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
  
          {/* TOMBOL KIRIM */}
          <TouchableOpacity 
            style={[styles.btnSend, (!selectedPost || sending) && { opacity: 0.6 }]} 
            onPress={handleKirimAjakan}
            disabled={!selectedPost || sending}
          >
            {sending ? (
              <ActivityIndicator color="#0d47a1" />
            ) : (
              <>
                <Image source={{ uri: ICON_PNG.send }} style={{ width: 20, height: 20, marginRight: 10 }} />
                <Text style={styles.btnText}>KIRIM UNDANGAN KERJA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
  
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20, 
    backgroundColor: '#fff', 
    elevation: 3 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
  scroll: { padding: 20 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    padding: 25, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  mitraProfile: { alignItems: 'center', marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: '#FFC400' },
  mitraName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  mitraSub: { fontSize: 12, color: '#999', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 25 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 15 },
  postItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9f9f9', 
    padding: 15, 
    borderRadius: 18, 
    marginBottom: 12, 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  postItemSelected: { borderColor: '#0d47a1', backgroundColor: '#e3f2fd', borderWidth: 2 },
  postTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  postLoc: { fontSize: 11, color: '#666', marginTop: 3 },
  emptyBox: { padding: 30, alignItems: 'center', width: '100%' },
  emptyText: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
  btnPostNow: { color: '#0d47a1', fontWeight: 'bold', marginTop: 15, textDecorationLine: 'underline' },
  btnSend: { 
    backgroundColor: '#FFC400', 
    width: '100%', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 30, 
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  btnText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 }
});