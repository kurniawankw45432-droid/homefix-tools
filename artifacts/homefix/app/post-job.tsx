import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

// JURUS ANTI-CRASH: Safe Import ImagePicker
let ImagePicker: any;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) { console.log("ImagePicker Error"); }

const { width } = Dimensions.get('window');

const ICON_PNG = {
  back: "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  camera: "https://img.icons8.com/fluency/96/camera.png",
  bangun: "https://img.icons8.com/color/96/home--v1.png",
  renovasi: "https://img.icons8.com/color/96/maintenance.png",
  promo: "https://img.icons8.com/color/96/megaphone.png",
  send: "https://img.icons8.com/color/96/sent.png",
  save: "https://img.icons8.com/color/96/checked--v1.png"
};

export default function PostJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // State Form
  const [mode, setMode] = useState<string>(params.mode as string || 'Bangun');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [budget, setBudget] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kota, setKota] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const isEdit = !!params.editId;

  useEffect(() => {
    const init = async () => {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) setUser(JSON.parse(session));
      if (isEdit) {
        ambilDataLama();
      }
    };
    init();
  }, []);

  const ambilDataLama = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}?sheet=Postingan`);
      const data = await res.json();
      const item = data.find((p: any) => p.Post_ID === params.editId);
      if (item) {
        setJudul(item.Judul);
        setDeskripsi(item.Deskripsi);
        setBudget(item.Budget.toString());
        setProvinsi(item.Provinsi);
        setKota(item.Kota);
        setImage(item.Foto_Kerja !== "-" ? item.Foto_Kerja : null);
        setMode(item.Jenis_Postingan);
      }
    } catch (e) { Alert.alert("Error", "Gagal ambil data lama."); }
    finally { setLoading(false); }
  };

  const pickImage = async () => {
    if (!ImagePicker) return Alert.alert("Error", "Modul kamera tidak tersedia.");
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [16, 9], quality: 0.3, base64: true
    });
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handlePost = async () => {
    if (!judul || !deskripsi || !provinsi || !kota) {
      return Alert.alert("Data Kurang", "Harap isi semua kolom yang tersedia.");
    }
    if (mode !== 'Posting' && !budget) {
      return Alert.alert("Budget Kosong", "Masukkan estimasi budget untuk lowongan ini.");
    }

    setLoading(true);
    try {
      if (isEdit) {
        await fetch(BASE_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'deleteData', sheet: 'Postingan', id: params.editId })
        });
      }

      const payload = {
        action: 'tambahPostingan',
        sheet: 'Postingan',
        data: {
          Post_ID: isEdit ? params.editId : "P-" + Date.now(),
          User_ID_Pembuat: user?.Nama || "Anonymous",
          Jenis_Postingan: mode,
          Judul: judul.trim(),
          Deskripsi: deskripsi.trim(),
          Foto_Kerja: image || "-",
          Budget: mode === 'Posting' ? 0 : budget.replace(/[^0-9]/g, ''),
          Provinsi: provinsi.trim(),
          Kota: kota.trim()
        }
      };

      const res = await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.status === 'success') {
        Alert.alert("Berhasil!", isEdit ? "Postingan diperbarui." : "Postingan sudah tayang.", [
          { text: "OK", onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (error) {
      Alert.alert("Gagal", "Koneksi bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Postingan' : (mode === 'Posting' ? 'Promosikan Jasa' : 'Buka Lowongan')}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {!isEdit && (
            <View style={styles.modeRow}>
              {[
                { id: 'Bangun',   icon: ICON_PNG.bangun,   label: 'Bangun' },
                { id: 'Renovasi', icon: ICON_PNG.renovasi, label: 'Renovasi' },
                { id: 'Posting',  icon: ICON_PNG.promo,    label: 'Promo Jasa' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.modeBtn, mode === item.id && styles.activeMode]}
                  onPress={() => setMode(item.id)}
                >
                  <Image source={{ uri: item.icon }} style={{ width: 25, height: 25 }} />
                  <Text style={[styles.modeText, mode === item.id && styles.activeModeText]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Image source={{ uri: ICON_PNG.camera }} style={{ width: 40, height: 40 }} />
                <Text style={styles.photoLabel}>FOTO LOKASI / HASIL KERJA</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.label}>JUDUL POSTINGAN</Text>
            <TextInput style={styles.input} placeholder="Contoh: Tukang Cat Borongan" value={judul} onChangeText={setJudul} />

            <Text style={styles.label}>DESKRIPSI DETAIL</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top', borderRadius: 20 }]}
              placeholder="Jelaskan apa yang lo butuhin atau apa keahlian lo..."
              multiline value={deskripsi} onChangeText={setDeskripsi}
            />

            {mode !== 'Posting' && (
              <View>
                <Text style={styles.label}>ESTIMASI BUDGET (RP)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 1500000"
                  keyboardType="numeric" value={budget} onChangeText={setBudget}
                />
              </View>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>PROVINSI</Text>
                <TextInput style={styles.input} placeholder="Jateng" value={provinsi} onChangeText={setProvinsi} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>KOTA / KABUPATEN</Text>
                <TextInput style={styles.input} placeholder="Magelang" value={kota} onChangeText={setKota} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnPost, loading && { opacity: 0.7 }]}
              onPress={handlePost}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0d47a1" />
              ) : (
                // FIX: ganti <> fragment dengan View agar tidak memunculkan text node hantu
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: isEdit ? ICON_PNG.save : ICON_PNG.send }} style={{ width: 20, height: 20, marginRight: 10 }} />
                  <Text style={styles.btnText}>{isEdit ? 'SIMPAN PERUBAHAN' : 'TAYANGKAN SEKARANG'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f7fa' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 15 },
  backBtn:        { padding: 5 },
  scroll:         { padding: 20 },
  modeRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modeBtn:        { width: '31%', padding: 12, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#eee', elevation: 3 },
  activeMode:     { backgroundColor: '#e3f2fd', borderColor: '#0d47a1', borderWidth: 2 },
  modeText:       { fontSize: 9, fontWeight: 'bold', color: '#666', marginTop: 5 },
  activeModeText: { color: '#0d47a1' },
  photoBox:       { width: '100%', height: 180, backgroundColor: '#fff', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#0d47a1', borderStyle: 'dashed' },
  imagePreview:   { width: '100%', height: '100%', resizeMode: 'cover' },
  photoLabel:     { fontSize: 9, fontWeight: 'bold', color: '#0d47a1', marginTop: 10 },
  card:           { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5 },
  label:          { fontSize: 10, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8, marginTop: 10, marginLeft: 5 },
  input:          { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#333' },
  row:            { flexDirection: 'row', justifyContent: 'space-between' },
  btnPost:        { backgroundColor: '#FFC400', padding: 18, borderRadius: 25, alignItems: 'center', marginTop: 30, elevation: 5, flexDirection: 'row', justifyContent: 'center' },
  btnText:        { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 },
});