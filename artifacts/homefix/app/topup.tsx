import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back:   "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  camera: "https://img.icons8.com/fluency/96/camera.png",
  check:  "https://img.icons8.com/color/96/checked-checkbox.png",
  info:   "https://img.icons8.com/color/96/info--v1.png",
};

const BATAS_MAKS_TOPUP = 2000000; // FIX: sinkron dengan batas di Code.gs

export default function TopupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser]       = useState<any>(null);
  const [nominal, setNominal] = useState('');
  const [metode, setMetode]   = useState('BRI');
  const [image, setImage]     = useState<string | null>(null);

  const bankAccounts: any = {
    'BRI':     { no: '6920-01-011517-53-3', an: 'Sri Mulyani' },
    'BCA':     { no: '1540-611-111',         an: 'Kurniawan' },
    'MANDIRI': { no: '123-00-0987654-3',     an: 'HomeFix Indonesia' },
    'DANA':    { no: '0812-3456-7890',       an: 'HomeFix Admin' }
  };

  useEffect(() => {
    AsyncStorage.getItem('user_hf').then(s => { if (s) setUser(JSON.parse(s)); });
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [3, 4], quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleTopup = async () => {
    if (!nominal || !image) {
      Alert.alert("Data Kurang", "Masukkan nominal dan unggah bukti transfer, Bro.");
      return;
    }
    const nom = parseInt(nominal);
    if (nom < 10000) {
      Alert.alert("Minimal Topup", "Minimal pengisian saldo adalah Rp 10.000");
      return;
    }
    // FIX: validasi batas maksimal di frontend sebelum kirim ke server
    if (nom > BATAS_MAKS_TOPUP) {
      Alert.alert("Melebihi Batas", `Maksimal topup saat ini Rp ${BATAS_MAKS_TOPUP.toLocaleString('id-ID')} per transaksi.`);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        action: 'tambahTransaksi',
        sheet: 'Transaksi_Keuangan',
        data: {
          Trans_ID:        "TP-" + Date.now(),
          User_ID:         user.Nama,
          Jenis_Transaksi: "Topup",
          Jumlah_Nominal:  nom,
          Tanggal_Jam:     new Date().toISOString(),
          Keterangan:      `Topup via ${metode}`,
          Nama_Bank:       metode,
          No_Rekening:     bankAccounts[metode].no,
          Bukti_TF:        image,
        }
      };
      const res    = await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();

      // FIX: tangani kalau backend menolak (misal melebihi batas)
      if (result && result.error) {
        Alert.alert("Gagal", result.error);
        return;
      }

      if (result.status === 'success') {
        // FIX: saldo langsung bertambah, tidak perlu nunggu verifikasi admin
        const saldoBaru = result.saldo_baru;
        if (typeof saldoBaru === 'number' && user) {
          const userBaru = { ...user, Saldo_Dompet: saldoBaru };
          await AsyncStorage.setItem('user_hf', JSON.stringify(userBaru));
        }
        Alert.alert(
          "✅ Berhasil!",
          "Saldo kamu sudah bertambah dan langsung bisa dipakai.",
          [{ text: "OKE", onPress: () => router.replace('/history') }]
        );
      }
    } catch (e) {
      Alert.alert("Error", "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Isi Saldo Dompet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>

            {/* FIX: info saldo langsung masuk + batas nominal */}
            <View style={styles.infoInstanBox}>
              <Image source={{ uri: ICON_PNG.info }} style={{ width: 18, height: 18 }} />
              <Text style={styles.infoInstanText}>
                Saldo langsung masuk setelah konfirmasi. Maksimal Rp {BATAS_MAKS_TOPUP.toLocaleString('id-ID')} per transaksi.
              </Text>
            </View>

            <Text style={styles.label}>Pilih Metode Transfer</Text>
            <View style={styles.methodRow}>
              {['BRI', 'BCA', 'MANDIRI', 'DANA'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, metode === m && styles.activeMethod]}
                  onPress={() => setMetode(m)}
                >
                  <Text style={[styles.methodText, metode === m && styles.activeMethodText]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Transfer ke Rekening {metode}:</Text>
              <Text style={styles.infoNo}>{bankAccounts[metode].no}</Text>
              <Text style={styles.infoAn}>a/n {bankAccounts[metode].an}</Text>
            </View>

            <Text style={styles.label}>Nominal Top-Up (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 50000"
              keyboardType="numeric"
              value={nominal}
              onChangeText={setNominal}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Unggah Bukti Transfer</Text>
            <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Image source={{ uri: ICON_PNG.camera }} style={{ width: 40, height: 40 }} />
                  <Text style={styles.photoLabel}>KLIK UNTUK AMBIL FOTO BUKTI</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSubmit, loading && { opacity: 0.7 }]}
              onPress={handleTopup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0d47a1" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: ICON_PNG.check }} style={{ width: 20, height: 20, marginRight: 10 }} />
                  <Text style={styles.btnText}>KONFIRMASI PEMBAYARAN</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f5f7fa' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#fff', elevation: 3 },
  backBtn:          { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  scroll:           { padding: 20 },
  card:             { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  infoInstanBox:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#e8f5e9', padding: 12, borderRadius: 12, marginBottom: 16 },
  infoInstanText:   { flex: 1, marginLeft: 8, fontSize: 11, color: '#2e7d32', lineHeight: 16 },
  label:            { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  methodRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  methodBtn:        { width: '23%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee', alignItems: 'center', backgroundColor: '#f9f9f9' },
  activeMethod:     { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  methodText:       { fontSize: 10, fontWeight: 'bold', color: '#666' },
  activeMethodText: { color: '#fff' },
  infoBox:          { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  infoLabel:        { fontSize: 11, color: '#0d47a1', marginBottom: 5 },
  infoNo:           { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  infoAn:           { fontSize: 12, color: '#0d47a1', marginTop: 2 },
  input:            { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', fontWeight: 'bold' },
  photoBox:         { width: '100%', height: 200, backgroundColor: '#f9f9f9', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed' },
  imagePreview:     { width: '100%', height: '100%', resizeMode: 'contain' },
  photoLabel:       { fontSize: 10, fontWeight: 'bold', color: '#999', marginTop: 10 },
  btnSubmit:        { backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 30, elevation: 4, flexDirection: 'row', justifyContent: 'center' },
  btnText:          { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 },
});