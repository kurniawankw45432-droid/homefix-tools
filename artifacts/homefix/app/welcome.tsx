import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, Image, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const LOGO_URL = "https://i.imgur.com/RXnYsgm.png";
const MASCOT   = require('../assets/logotukang.png');

const MAX_BASE64_LENGTH = 45000; // aman di bawah limit cell Google Sheets (~50rb karakter)

const ICON = {
  eyeShow: "https://img.icons8.com/color/48/visible.png",
  eyeHide: "https://img.icons8.com/color/48/invisible.png",
  camera:  "https://img.icons8.com/fluency/96/camera.png",
  home:    "https://img.icons8.com/fluency/48/home.png",
  map:     "https://img.icons8.com/fluency/48/map.png",
};

export default function WelcomeScreen() {
  const router = useRouter();

  const [isChecking,   setIsChecking]   = useState(true);
  const [loading,      setLoading]      = useState(false);
  const [isLoginMode,  setIsLoginMode]  = useState(true);
  const [image,        setImage]        = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nama: '', wa: '', email: '', sandi: '', peran: 'Tukang',
    alamatKtp: '', alamatDomisili: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem('user_hf');
        if (session) {
          router.replace('/(tabs)');
        } else {
          setIsChecking(false);
        }
      } catch {
        setIsChecking(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const IP = require('expo-image-picker');
      const result = await IP.launchImageLibraryAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        const b64 = result.assets[0].base64;
        if (b64.length > MAX_BASE64_LENGTH) {
          Alert.alert("Foto Terlalu Besar", "Pilih foto lain yang lebih kecil/sederhana ukurannya, Bro.");
          return;
        }
        setImage(`data:image/jpeg;base64,${b64}`);
      }
    } catch { Alert.alert("Error", "Gagal buka galeri."); }
  };

  const handleAuth = async () => {
    if (!form.email || !form.sandi) return Alert.alert("Waduh", "Isi Email & Sandi!");
    setLoading(true);
    try {
      if (isLoginMode) {
        const res  = await fetch(
          `${BASE_URL}?action=login` +
          `&email=${encodeURIComponent(form.email.trim())}` +
          `&sandi=${encodeURIComponent(form.sandi.trim())}`
        );
        const user = await res.json();
        if (user.Nama) {
          try {
            const sesiLama = await AsyncStorage.getItem('user_hf');
            if (sesiLama) {
              const lama = JSON.parse(sesiLama);
              if (!user.Foto && lama?.Foto) user.Foto = lama.Foto;
            }
          } catch (_) {}

          await AsyncStorage.setItem('user_hf', JSON.stringify(user));
          router.replace('/(tabs)');
        } else {
          Alert.alert("Gagal Masuk", "Email atau Sandi salah, Bro.");
        }
      } else {
        if (!form.nama || !form.wa || !form.alamatKtp || !form.alamatDomisili || !image) {
          Alert.alert("Data Kurang", "Nama, WA, Alamat KTP, Domisili, dan Foto wajib diisi!");
          setLoading(false);
          return;
        }
        const newUser = {
          User_ID:         "HF-" + Date.now(),
          Nama:            form.nama.trim(),
          WhatsApp:        form.wa.trim(),
          Peran:           form.peran,
          Email:           form.email.toLowerCase().trim(),
          Sandi:           form.sandi.trim(),
          Foto:            image,
          Alamat_KTP:      form.alamatKtp.trim(),
          Alamat_Domisili: form.alamatDomisili.trim(),
          Koordinat_GPS:   "-",
          Saldo_Dompet:    0,
        };
        const res    = await fetch(BASE_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: "tambahPengguna", sheet: "Pengguna", data: newUser }),
        });
        const result = await res.json();
        if (result.status === "success") {
          await AsyncStorage.setItem('user_hf', JSON.stringify(newUser));
          Alert.alert("Sukses!", "Selamat bergabung di HomeFix!");
          router.replace('/(tabs)');
        }
      }
    } catch { Alert.alert("Error", "Koneksi Markas Terputus."); }
    finally  { setLoading(false); }
  };

  if (isChecking) return (
    <View style={{ flex: 1, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FFC400" />
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={s.hero}>
            <View style={s.heroRow}>

              <View style={s.logoBox}>
                <Image source={{ uri: LOGO_URL }} style={s.logoImg} />
              </View>

              <View style={s.mascotCol}>
                <Image source={MASCOT} style={s.mascot} />
                <View style={s.sloganBox}>
                  <Text style={s.sloganMain}>✦ Mas Fix ✦</Text>
                  <Text style={s.sloganSub}>✦ Mas Palugada ✦</Text>
                </View>
              </View>

            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>
              {isLoginMode ? "Masuk Akun" : "Daftar KTA HomeFix"}
            </Text>

            {!isLoginMode && (
              <TouchableOpacity style={s.photoBox} onPress={pickImage}>
                {image
                  ? <Image source={{ uri: image }} style={s.imgFull} />
                  : (
                    <View style={{ alignItems: 'center' }}>
                      <Image source={{ uri: ICON.camera }} style={{ width: 40, height: 40 }} />
                      <Text style={s.photoLabel}>FOTO KTA</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            )}

            <TextInput
              style={s.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={v => setForm({ ...form, email: v })}
              placeholderTextColor="#aaa"
            />

            <View style={s.passRow}>
              <TextInput
                style={s.passInput}
                placeholder="Sandi"
                secureTextEntry={!showPassword}
                value={form.sandi}
                onChangeText={v => setForm({ ...form, sandi: v })}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Image
                  source={{ uri: showPassword ? ICON.eyeHide : ICON.eyeShow }}
                  style={s.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            {!isLoginMode && (
              <>
                <TextInput
                  style={s.input}
                  placeholder="Nama Lengkap Sesuai KTP"
                  value={form.nama}
                  onChangeText={v => setForm({ ...form, nama: v })}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  style={s.input}
                  placeholder="WhatsApp (08xxx)"
                  keyboardType="phone-pad"
                  value={form.wa}
                  onChangeText={v => setForm({ ...form, wa: v })}
                  placeholderTextColor="#aaa"
                />
                <View style={s.inputRow}>
                  <Image source={{ uri: ICON.map }} style={s.inputIcon} />
                  <TextInput
                    style={s.inputFlex}
                    placeholder="Alamat Sesuai KTP (Kota Lahir)"
                    value={form.alamatKtp}
                    onChangeText={v => setForm({ ...form, alamatKtp: v })}
                    placeholderTextColor="#aaa"
                  />
                </View>
                <View style={s.inputRow}>
                  <Image source={{ uri: ICON.home }} style={s.inputIcon} />
                  <TextInput
                    style={s.inputFlex}
                    placeholder="Alamat Domisili Saat Ini"
                    value={form.alamatDomisili}
                    onChangeText={v => setForm({ ...form, alamatDomisili: v })}
                    placeholderTextColor="#aaa"
                  />
                </View>
                <View style={s.roleRow}>
                  {['Owner', 'Tukang', 'Helper'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[s.roleBtn, form.peran === r && s.roleActive]}
                      onPress={() => setForm({ ...form, peran: r })}
                    >
                      <Text style={{
                        color: form.peran === r ? '#fff' : '#888',
                        fontWeight: 'bold', fontSize: 11
                      }}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={s.btnMain} onPress={handleAuth} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#0d47a1" />
                : <Text style={s.btnText}>
                    {isLoginMode ? "MASUK SEKARANG" : "DAFTAR & AKTIFKAN KTA"}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 25 }}>
              <Text style={s.switchText}>
                {isLoginMode
                  ? "Belum punya akun? Klik Daftar"
                  : "Sudah punya akun? Klik Login"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d47a1' },
  scroll:    { paddingHorizontal: 22, paddingTop: 50, alignItems: 'center' },

  hero:    { width: '100%', marginBottom: 18 },
  heroRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    width:          '100%',
  },

  logoBox: {
    width:           '58%',
    height:          300,
    backgroundColor: 'transparent',
    justifyContent:  'center',
    alignItems:      'center',
  },
  logoImg: { width: '100%', height: '100%', resizeMode: 'contain' },

  mascotCol: {
    width:      '48%',
    alignItems: 'center',
  },
  mascot: {
    width:      '100%',
    height:     180,
    resizeMode: 'contain',
  },

  sloganBox:  {
    alignItems: 'center',
    marginTop:  6,
  },
  sloganMain: {
    fontSize:      16,
    fontWeight:    '900',
    fontStyle:     'italic',
    color:         '#FFE033',
    letterSpacing: 1,
    textShadowColor:  'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  sloganSub: {
    fontSize:      13,
    fontWeight:    '900',
    fontStyle:     'italic',
    color:         '#FFE033',
    letterSpacing: 0.8,
    marginTop:     2,
    textShadowColor:  'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  card:      { backgroundColor: '#fff', borderRadius: 25, padding: 25, width: '100%', elevation: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 25, color: '#333' },

  photoBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#f0f2f5',
    alignSelf: 'center', marginBottom: 18,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2.5, borderColor: '#FFC400',
  },
  imgFull:    { width: '100%', height: '100%', resizeMode: 'cover' },
  photoLabel: { fontSize: 8, fontWeight: 'bold', color: '#0d47a1', marginTop: 5 },

  input:     { backgroundColor: '#f5f7f9', padding: 14, borderRadius: 15, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#eee' },
  passRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7f9', borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: '#eee', paddingRight: 5 },
  passInput: { flex: 1, padding: 14, fontSize: 14 },
  eyeBtn:    { padding: 10 },
  eyeIcon:   { width: 20, height: 20 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7f9', borderRadius: 15, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  inputIcon: { width: 20, height: 20, marginRight: 10 },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 14 },

  roleRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  roleBtn:    { width: '31%', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center' },
  roleActive: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },

  btnMain:    { backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, elevation: 5 },
  btnText:    { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 },
  switchText: { textAlign: 'center', color: '#0d47a1', fontWeight: 'bold', fontSize: 12 },
});