import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

let ImagePicker: any;
try { ImagePicker = require('expo-image-picker'); } catch (e) {}

const MAX_BASE64_LENGTH = 45000; // aman di bawah limit cell Google Sheets (~50rb karakter)

const ICON_PNG = {
  back:   "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  camera: "https://img.icons8.com/ios-filled/50/ffffff/camera.png",
  user:   "https://img.icons8.com/color/96/user-male-circle.png",
  id:     "https://img.icons8.com/color/96/id-verified.png",
  phone:  "https://img.icons8.com/color/96/phone.png",
  map:    "https://img.icons8.com/color/96/marker.png",
  home:   "https://img.icons8.com/color/96/home.png",
  nik:    "https://img.icons8.com/color/96/identification-documents.png",
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => { muatData(); }, []);

  const muatData = async () => {
    const s = await AsyncStorage.getItem('user_hf');
    if (s) setUserData(JSON.parse(s));
  };

  const pilihFoto = async () => {
    if (!ImagePicker) return Alert.alert("Error", "Modul foto tidak tersedia.");
    const ijin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!ijin.granted) return Alert.alert("Izin Ditolak", "Butuh akses galeri!");
    let res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true
    });
    if (!res.canceled && res.assets[0].base64) {
      const b64 = res.assets[0].base64;
      if (b64.length > MAX_BASE64_LENGTH) {
        Alert.alert(
          "Foto Terlalu Besar",
          "Ukuran foto masih terlalu besar untuk disimpan ke server. Coba pilih foto lain yang lebih sederhana atau resolusi lebih kecil."
        );
        return;
      }
      setUserData({ ...userData, Foto: `data:image/jpeg;base64,${b64}` });
    }
  };

  const simpan = async () => {
    if (!userData.Nama || !userData.WhatsApp) return Alert.alert("Waduh", "Nama & WA wajib diisi!");
    setLoading(true);
    try {
      await AsyncStorage.setItem('user_hf', JSON.stringify(userData));
      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateProfile', sheet: 'Pengguna', data: userData })
      });
      Alert.alert("Mantap!", "Data KTA sudah diperbarui.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Info", "Data tersimpan di HP. Sinkron server gagal.");
      router.back();
    } finally { setLoading(false); }
  };

  if (!userData) return null;

  const ktaLengkap = userData.NIK && userData.Alamat_KTP && userData.Alamat_Domisili;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sempurnakan KTA</Text>
        <Image source={{ uri: ICON_PNG.id }} style={{ width: 28, height: 28 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={20}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {!ktaLengkap && (
            <View style={styles.warningBox}>
              <Image source={{ uri: ICON_PNG.id }} style={{ width: 20, height: 20 }} />
              <Text style={styles.warningText}>Lengkapi NIK & Alamat agar bisa membuat Kontrak SPK!</Text>
            </View>
          )}

          <View style={styles.photoContainer}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: userData.Foto || "https://i.pravatar.cc/300" }} style={styles.avatarImg} />
              <TouchableOpacity style={styles.camBadge} onPress={pilihFoto}>
                <Image source={{ uri: ICON_PNG.camera }} style={{ width: 18, height: 18 }} />
              </TouchableOpacity>
            </View>
            <Text style={styles.photoHint}>Klik kamera untuk ganti foto profil</Text>
          </View>

          <View style={styles.card}>

            <View style={styles.fieldRow}>
              <Image source={{ uri: ICON_PNG.user }} style={styles.fieldIcon} />
              <Text style={styles.label}>NAMA LENGKAP (KTP)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={userData.Nama}
              onChangeText={(t) => setUserData({...userData, Nama: t})}
              placeholder="Sesuai KTP"
              placeholderTextColor="#bbb"
            />

            <View style={styles.fieldRow}>
              <Image source={{ uri: ICON_PNG.nik }} style={styles.fieldIcon} />
              <Text style={styles.label}>NO. KTP / NIK (16 Digit)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={userData.NIK}
              onChangeText={(t) => setUserData({...userData, NIK: t})}
              keyboardType="numeric"
              maxLength={16}
              placeholder="Contoh: 3271234567890001"
              placeholderTextColor="#bbb"
            />

            <View style={styles.fieldRow}>
              <Image source={{ uri: ICON_PNG.phone }} style={styles.fieldIcon} />
              <Text style={styles.label}>NOMOR WHATSAPP</Text>
            </View>
            <TextInput
              style={styles.input}
              value={userData.WhatsApp}
              keyboardType="phone-pad"
              onChangeText={(t) => setUserData({...userData, WhatsApp: t})}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor="#bbb"
            />

            <View style={styles.fieldRow}>
              <Image source={{ uri: ICON_PNG.map }} style={styles.fieldIcon} />
              <Text style={styles.label}>ALAMAT SESUAI KTP</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={userData.Alamat_KTP}
              onChangeText={(t) => setUserData({...userData, Alamat_KTP: t})}
              placeholder="Jl. Contoh No. 1, RT/RW, Kel, Kec, Kota"
              placeholderTextColor="#bbb"
            />

            <View style={styles.fieldRow}>
              <Image source={{ uri: ICON_PNG.home }} style={styles.fieldIcon} />
              <Text style={styles.label}>ALAMAT DOMISILI SAAT INI</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={userData.Alamat_Domisili}
              onChangeText={(t) => setUserData({...userData, Alamat_Domisili: t})}
              placeholder="Alamat tinggal sekarang"
              placeholderTextColor="#bbb"
            />

            <View style={[styles.ktaStatus, ktaLengkap ? styles.ktaOk : styles.ktaKurang]}>
              <Text style={styles.ktaStatusText}>
                {ktaLengkap ? '✅ KTA Lengkap — Siap buat Kontrak SPK!' : '⚠️ KTA belum lengkap — NIK & Alamat diperlukan'}
              </Text>
            </View>

            <TouchableOpacity style={styles.btnSave} onPress={simpan} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#0d47a1" />
                : <Text style={styles.btnText}>💾  SIMPAN PERUBAHAN</Text>
              }
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
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, marginLeft: 15 },
  backBtn:        { padding: 5 },
  scroll:         { padding: 20 },
  warningBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3e0', padding: 14, borderRadius: 15, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  warningText:    { fontSize: 11, color: '#e65100', flex: 1, fontWeight: 'bold', marginLeft: 8 },
  photoContainer: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper:  { width: 130, height: 130, borderRadius: 25, backgroundColor: '#fff', elevation: 10, borderWidth: 3, borderColor: '#0d47a1' },
  avatarImg:      { width: '100%', height: '100%', borderRadius: 22 },
  camBadge:       { position: 'absolute', bottom: -10, right: -10, backgroundColor: '#FFC400', padding: 10, borderRadius: 20, elevation: 5 },
  photoHint:      { fontSize: 10, color: '#888', marginTop: 15, fontWeight: 'bold' },
  card:           { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5 },
  fieldRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 14 },
  fieldIcon:      { width: 16, height: 16, marginRight: 6 },
  label:          { fontSize: 10, fontWeight: 'bold', color: '#0d47a1' },
  input:          { backgroundColor: '#f9f9f9', borderRadius: 15, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: '#333', marginBottom: 4, borderWidth: 1, borderColor: '#eee' },
  inputMulti:     { height: 85, paddingTop: 12, borderRadius: 15 },
  ktaStatus:      { padding: 12, borderRadius: 15, marginTop: 16, marginBottom: 8 },
  ktaOk:          { backgroundColor: '#e8f5e9' },
  ktaKurang:      { backgroundColor: '#fff3e0' },
  ktaStatusText:  { fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  btnSave:        { backgroundColor: '#FFC400', padding: 18, borderRadius: 25, alignItems: 'center', marginTop: 10, elevation: 5 },
  btnText:        { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 },
});