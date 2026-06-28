import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const { width } = Dimensions.get('window');

const ICON_PNG = {
  back:  "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  send:  "https://img.icons8.com/color/96/sent.png",
  user:  "https://img.icons8.com/color/96/user-male-circle.png",
  money: "https://img.icons8.com/color/96/money-bag.png",
  map:   "https://img.icons8.com/color/96/marker.png",
  edit:  "https://img.icons8.com/color/96/edit--v1.png",
  trash: "https://img.icons8.com/color/96/trash.png",
  save:  "https://img.icons8.com/color/96/checked--v1.png",
  close: "https://img.icons8.com/color/96/multiply.png",
};

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const [post, setPost]             = useState<any>(null);
  const [comments, setComments]     = useState<any[]>([]);
  const [myUser, setMyUser]         = useState<any>(null);
  const [inputKomen, setInputKomen] = useState('');
  const [loading, setLoading]       = useState(true);
  const [sendLoading, setSendLoading] = useState(false);

  const [editModal, setEditModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editTeks, setEditTeks]     = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { initData(); }, []);

  const initData = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) setMyUser(JSON.parse(session));

      const resPost  = await fetch(`${BASE_URL}?sheet=Postingan`);
      const dataPost = await resPost.json();
      const detail   = dataPost.find((p: any) => p.Post_ID === postId);
      setPost(detail);

      const resKomen  = await fetch(`${BASE_URL}?sheet=Komentar`);
      const dataKomen = await resKomen.json();
      if (Array.isArray(dataKomen)) {
        setComments(dataKomen.filter((c: any) => c.Post_ID === postId));
      }
    } catch (e) {
      console.log("Load error");
    } finally {
      setLoading(false);
    }
  };

  const kirimKomentar = async () => {
    if (!inputKomen.trim() || sendLoading) return;
    setSendLoading(true);

    const komentarId = "K-" + Date.now();

    const payloadKomen = {
      action: 'tambahChat',
      sheet:  'Komentar',
      data: {
        Komentar_ID:  komentarId,
        Post_ID:      postId,
        User_ID:      myUser.Nama,
        Isi_Komentar: inputKomen.trim(),
        Waktu:        new Date().toISOString(),
        Status:       'Belum'
      }
    };

    try {
      await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payloadKomen) });

      // FIX: kumpulkan semua orang yang perlu dinotif —
      // pemilik postingan + semua orang yang sudah pernah komentar di sini,
      // kecuali diri sendiri (yang baru komentar).
      const penerimaSet = new Set<string>();
      if (post?.User_ID_Pembuat) penerimaSet.add(post.User_ID_Pembuat);
      comments.forEach((c) => {
        if (c.User_ID) penerimaSet.add(c.User_ID);
      });
      penerimaSet.delete(myUser.Nama); // jangan notif diri sendiri

      const daftarPenerima = Array.from(penerimaSet);

      // Kirim notifikasi ke setiap orang di daftar (paralel)
      await Promise.all(
        daftarPenerima.map((penerima) =>
          fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'tambahAktivitas',
              sheet:  'Aktivitas',
              data: {
                ID:          'AKT-' + Date.now() + '-' + penerima,
                Penerima:    penerima,
                Pengirim:    myUser.Nama,
                Tipe:        'Komentar',
                Post_ID:     postId,
                Pesan:       `${myUser.Nama} mengomentari postingan yang kamu ikuti diskusinya.`,
                Waktu:       new Date().toISOString(),
                Komentar_ID: komentarId
              }
            })
          })
        )
      );

      setInputKomen('');
      initData();
    } catch (e) {
      Alert.alert("Error", "Gagal kirim komentar.");
    } finally {
      setSendLoading(false);
    }
  };

  const bukaEdit = (komen: any) => {
    setEditTarget(komen);
    setEditTeks(komen.Isi_Komentar || '');
    setEditModal(true);
  };

  const simpanEdit = async () => {
    if (!editTeks.trim()) return;
    setEditLoading(true);
    try {
      await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'editKomentar',
          sheet:  'Komentar',
          id:     editTarget.Komentar_ID,
          data:   { Isi_Komentar: editTeks.trim() }
        })
      });
      setEditModal(false);
      setEditTarget(null);
      initData();
    } catch (e) {
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    } finally {
      setEditLoading(false);
    }
  };

  const hapusKomentar = (komen: any) => {
    Alert.alert(
      "Hapus Komentar",
      "Yakin mau hapus komentar ini?",
      [
        { text: "Batal", style: 'cancel' },
        {
          text: "Hapus", style: 'destructive',
          onPress: async () => {
            try {
              await fetch(BASE_URL, {
                method: 'POST',
                body: JSON.stringify({
                  action: 'deleteData',
                  sheet:  'Komentar',
                  id:     komen.Komentar_ID
                })
              });
              initData();
            } catch (e) {
              Alert.alert("Error", "Gagal hapus komentar.");
            }
          }
        }
      ]
    );
  };

  if (loading || !post) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0d47a1" /></View>
  );

  const namaUser = (c: any) => c.User_ID;

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Postingan</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.postHeader}
              onPress={() => router.push({ pathname: '/view-profile', params: { nama: post.User_ID_Pembuat } } as any)}
            >
              <Image source={{ uri: ICON_PNG.user }} style={{ width: 40, height: 40 }} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.userName}>{post.User_ID_Pembuat}</Text>
                <Text style={styles.postType}>{post.Jenis_Postingan.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.title}>{post.Judul}</Text>
            <Text style={styles.desc}>{post.Deskripsi}</Text>

            {post.Jenis_Postingan !== 'Posting' && (
              <View style={styles.budgetBox}>
                <Image source={{ uri: ICON_PNG.money }} style={{ width: 24, height: 24 }} />
                <Text style={styles.budgetText}>Estimasi: Rp {Number(post.Budget).toLocaleString('id-ID')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Diskusi / Komentar ({comments.length})</Text>

          {comments.map((c, i) => {
            const isMyKomen = myUser?.Nama === namaUser(c);
            return (
              <View key={i} style={styles.komenCard}>
                <View style={styles.komenHeader}>
                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/view-profile', params: { nama: namaUser(c) } } as any)}
                  >
                    <Text style={styles.komenUser}>{namaUser(c)}</Text>
                  </TouchableOpacity>

                  {isMyKomen && (
                    <View style={styles.aksiRow}>
                      <TouchableOpacity style={styles.btnAksi} onPress={() => bukaEdit(c)}>
                        <Image source={{ uri: ICON_PNG.edit }} style={styles.aksiIcon} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAksi} onPress={() => hapusKomentar(c)}>
                        <Image source={{ uri: ICON_PNG.trash }} style={styles.aksiIcon} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={styles.komenText}>{c.Isi_Komentar}</Text>
              </View>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Tulis komentar..." 
            value={inputKomen} 
            onChangeText={setInputKomen} 
            multiline 
          />
          <TouchableOpacity 
            style={[styles.btnSend, (!inputKomen.trim() || sendLoading) && { opacity: 0.5 }]} 
            onPress={kirimKomentar} 
            disabled={sendLoading || !inputKomen.trim()}
          >
            {sendLoading 
              ? <ActivityIndicator color="#fff" /> 
              : <Image source={{ uri: ICON_PNG.send }} style={{ width: 24, height: 24 }} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Komentar</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Image source={{ uri: ICON_PNG.close }} style={{ width: 22, height: 22 }} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={editTeks}
              onChangeText={setEditTeks}
              multiline
              autoFocus
              placeholder="Tulis ulang komentarmu..."
              placeholderTextColor="#bbb"
            />

            <TouchableOpacity
              style={[styles.btnSimpan, (!editTeks.trim() || editLoading) && { opacity: 0.5 }]}
              onPress={simpanEdit}
              disabled={!editTeks.trim() || editLoading}
            >
              {editLoading
                ? <ActivityIndicator color="#0d47a1" />
                : <>
                    <Image source={{ uri: ICON_PNG.save }} style={{ width: 20, height: 20, marginRight: 8 }} />
                    <Text style={styles.btnSimpanText}>SIMPAN PERUBAHAN</Text>
                  </>
              }
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f7fa' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 50,
    backgroundColor: '#0d47a1',
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
    elevation: 5,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scroll:      { padding: 20 },
  card:        { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5, marginBottom: 20 },
  postHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  userName:    { fontWeight: 'bold', color: '#0d47a1', fontSize: 16, textDecorationLine: 'underline' },
  postType:    { fontSize: 10, color: '#888', fontWeight: 'bold' },
  title:       { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  desc:        { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 15 },
  budgetBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 12, borderRadius: 15 },
  budgetText:  { marginLeft: 10, fontWeight: 'bold', color: '#0d47a1' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15, marginLeft: 5 },
  komenCard: {
    backgroundColor: '#fff', padding: 15, borderRadius: 25,
    marginBottom: 10, elevation: 5,
    borderLeftWidth: 5, borderLeftColor: '#FFC400',
  },
  komenHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  komenUser:    { fontWeight: 'bold', fontSize: 12, color: '#0d47a1', textDecorationLine: 'underline' },
  komenText:    { fontSize: 13, color: '#444', lineHeight: 18 },

  aksiRow:    { flexDirection: 'row', alignItems: 'center' },
  btnAksi:    { marginLeft: 8, padding: 4 },
  aksiIcon:   { width: 18, height: 18 },

  inputContainer: {
    flexDirection: 'row', padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1, backgroundColor: '#f5f7fa',
    borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10,
    maxHeight: 100, fontSize: 14, color: '#333',
  },
  btnSend: {
    backgroundColor: '#0d47a1', width: 45, height: 45,
    borderRadius: 22.5, justifyContent: 'center', alignItems: 'center',
    marginLeft: 10, elevation: 5,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25, borderTopRightRadius: 25,
    padding: 25, elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle:  { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
  modalInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 25, borderWidth: 1, borderColor: '#e0e0e0',
    paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 14, color: '#333',
    minHeight: 100, textAlignVertical: 'top',
  },
  btnSimpan: {
    flexDirection: 'row',
    backgroundColor: '#FFC400',
    borderRadius: 25, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 18,
  },
  btnSimpanText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
});