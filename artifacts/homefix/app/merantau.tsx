import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, TextInput,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back:    "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  search:  "https://img.icons8.com/color/96/search--v1.png",
  map:     "https://img.icons8.com/color/96/marker.png",
  send:    "https://img.icons8.com/color/96/sent.png",
  empty:   "https://img.icons8.com/bubbles/100/empty-box.png",
  suitcase:"https://img.icons8.com/color/96/suitcase.png",
};

export default function MerantauScreen() {
  const router = useRouter();
  const [kota, setKota]   = useState('');
  const [pulau, setPulau] = useState('');
  const [loading, setLoading]   = useState(false);
  const [sudahCari, setSudahCari] = useState(false);
  const [hasil, setHasil] = useState<any[]>([]);

  // ── Kolom "Posting keahlian di kota ini" ────────────────────────────────
  const [teksPosting, setTeksPosting] = useState('');
  const [postingLoading, setPostingLoading] = useState(false);

  const cariPostingan = async () => {
    if (!kota.trim() && !pulau.trim()) {
      Alert.alert("Info", "Isi minimal Kota atau Pulau untuk mencari.");
      return;
    }
    setLoading(true);
    setSudahCari(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'getPostinganByLokasi');
      if (kota.trim())  params.append('kota', kota.trim());
      if (pulau.trim()) params.append('pulau', pulau.trim());

      const res  = await fetch(`${BASE_URL}?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHasil(data.filter(p => p && p.Judul));
      }
    } catch (e) {
      Alert.alert("Error", "Gagal memuat postingan daerah ini.");
    } finally {
      setLoading(false);
    }
  };

  const kirimPostingRantau = async () => {
    if (!teksPosting.trim()) return;
    if (!kota.trim() && !pulau.trim()) {
      Alert.alert("Info", "Isi Kota atau Pulau tujuan dulu sebelum posting.");
      return;
    }
    setPostingLoading(true);
    try {
      const session = await AsyncStorage.getItem('user_hf');
      const user = session ? JSON.parse(session) : null;
      if (!user?.Nama) {
        Alert.alert("Sesi Habis", "Silakan login ulang.");
        setPostingLoading(false);
        return;
      }

      const postId = "P-" + Date.now();
      const payload = {
        action: 'tambahPostingan',
        sheet:  'Postingan',
        data: {
          Post_ID: postId,
          User_ID_Pembuat: user.Nama,
          Jenis_Postingan: 'Posting',
          Judul: 'Merantau: ' + (user.Nama),
          Deskripsi: teksPosting.trim(),
          Foto_Kerja: '',
          Budget: 0,
          Provinsi: '',
          Kota: kota.trim(),
          Pulau: pulau.trim(),
        }
      };

      await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payload) });
      setTeksPosting('');
      cariPostingan();
    } catch (e) {
      Alert.alert("Error", "Gagal membuat postingan.");
    } finally {
      setPostingLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Merantau</Text>
        <Image source={{ uri: ICON_PNG.suitcase }} style={{ width: 26, height: 26 }} />
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
          {/* ── FORM CARI LOKASI ──────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.label}>Cari postingan di daerah tujuan</Text>

            <TextInput
              style={styles.input}
              placeholder="Kota (contoh: Bandung)"
              placeholderTextColor="#aaa"
              value={kota}
              onChangeText={setKota}
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Pulau (contoh: Jawa)"
              placeholderTextColor="#aaa"
              value={pulau}
              onChangeText={setPulau}
            />

            <TouchableOpacity
              style={[styles.btnCari, (!kota.trim() && !pulau.trim()) && { opacity: 0.5 }]}
              onPress={cariPostingan}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Image source={{ uri: ICON_PNG.search }} style={{ width: 18, height: 18, marginRight: 8 }} />
                    <Text style={styles.btnCariText}>CARI DI DAERAH INI</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>

          {/* ── KOLOM POSTING KEAHLIAN DI KOTA INI ───────────────────────── */}
          <View style={styles.card}>
            <TextInput
              style={styles.inputPosting}
              placeholder="Posting keahlian di kota ini..."
              placeholderTextColor="#bbb"
              value={teksPosting}
              onChangeText={setTeksPosting}
              multiline
            />
            <TouchableOpacity
              style={[styles.btnPosting, !teksPosting.trim() && { opacity: 0.5 }]}
              onPress={kirimPostingRantau}
              disabled={!teksPosting.trim() || postingLoading}
            >
              {postingLoading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Image source={{ uri: ICON_PNG.send }} style={{ width: 16, height: 16, marginRight: 6 }} />
                    <Text style={styles.btnPostingText}>POSTING DI DAERAH INI</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>

          {/* ── HASIL PENCARIAN ──────────────────────────────────────────── */}
          {sudahCari && (
            <View style={styles.hasilWrap}>
              <Text style={styles.sectionTitle}>
                Postingan di {kota.trim() || pulau.trim()} ({hasil.length})
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 30 }} />
              ) : hasil.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Image source={{ uri: ICON_PNG.empty }} style={{ width: 90, height: 90 }} />
                  <Text style={styles.emptyText}>Belum ada postingan di daerah ini.</Text>
                </View>
              ) : (
                hasil.map((post, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.postCard}
                    onPress={() => router.push({ pathname: '/post-detail', params: { postId: post.Post_ID } } as any)}
                  >
                    <Text style={styles.postUser}>@{post.User_ID_Pembuat}</Text>
                    <Text style={styles.postTitle}>{post.Judul}</Text>
                    <Text style={styles.postDesc} numberOfLines={2}>{post.Deskripsi}</Text>
                    <View style={styles.postFooter}>
                      <Image source={{ uri: ICON_PNG.map }} style={{ width: 12, height: 12 }} />
                      <Text style={styles.locText}>{post.Kota || post.Pulau || 'Nasional'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f7fa' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 50,
    backgroundColor: '#0d47a1',
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
    elevation: 5,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scroll: { padding: 20 },
  card:   { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5, marginBottom: 20 },
  label:  { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  input: {
    backgroundColor: '#f5f7fa',
    borderRadius: 15, borderWidth: 1, borderColor: '#e0e0e0',
    paddingHorizontal: 15, paddingVertical: 12,
    fontSize: 14, color: '#333',
  },
  btnCari: {
    flexDirection: 'row', backgroundColor: '#0d47a1',
    borderRadius: 15, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 16,
  },
  btnCariText: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },

  inputPosting: {
    backgroundColor: '#fffbea',
    borderRadius: 15, borderWidth: 1, borderColor: '#FFC400',
    paddingHorizontal: 15, paddingVertical: 14,
    fontSize: 14, color: '#333',
    minHeight: 70, textAlignVertical: 'top',
  },
  btnPosting: {
    flexDirection: 'row', backgroundColor: '#FFC400',
    borderRadius: 15, paddingVertical: 12,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 12,
  },
  btnPostingText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },

  hasilWrap:    { marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15 },

  postCard:    { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 12, elevation: 4, borderLeftWidth: 5, borderLeftColor: '#FFC400' },
  postUser:    { fontWeight: 'bold', color: '#0d47a1', fontSize: 12, marginBottom: 4 },
  postTitle:   { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  postDesc:    { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 10 },
  postFooter:  { flexDirection: 'row', alignItems: 'center' },
  locText:     { fontSize: 10, color: '#888', marginLeft: 4 },

  emptyBox:  { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#999', fontSize: 13, fontStyle: 'italic', marginTop: 12 },
});