import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back: 'https://img.icons8.com/ios-filled/50/0d47a1/left.png',
  contract: 'https://img.icons8.com/color/96/signature.png',
  calendar: 'https://img.icons8.com/color/96/calendar--v1.png',
  money: 'https://img.icons8.com/color/96/money-bag.png',
  info: 'https://img.icons8.com/color/96/info--v1.png',
  owner: 'https://img.icons8.com/color/96/businessperson.png',
  tukang: 'https://img.icons8.com/color/96/worker-male.png',
  check: 'https://img.icons8.com/color/96/checked--v1.png',
};

export default function CreateContractScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [myUser, setMyUser] = useState<any>(null);
  const [namaPekerjaan, setNamaPekerjaan] = useState('');
  const [nilaiBorongan, setNilaiBorongan] = useState('');
  const [persenDP, setPersenDP] = useState('10');
  const [tglMulai, setTglMulai] = useState('');
  const [estimasiHari, setEstimasiHari] = useState('');
  const [termin, setTermin] = useState('Pelunasan setelah selesai 100%');

  useEffect(() => {
    const getMyData = async () => {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) setMyUser(JSON.parse(session));
    };
    getMyData();
  }, []);

  const formatRupiah = (angka: string) => {
    const num = angka.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const hitungDP = () => {
    const total = parseInt(nilaiBorongan.replace(/[^0-9]/g, '') || '0', 10);
    const dp = (total * parseInt(persenDP, 10)) / 100;
    return dp;
  };

  const hitungFeeHF = () => {
    const total = parseInt(nilaiBorongan.replace(/[^0-9]/g, '') || '0', 10);
    let fee = 0.02;
    if (total >= 10000000 && total < 50000000) fee = 0.015;
    if (total >= 50000000) fee = 0.01;
    return Math.round(total * fee);
  };

  const handleBuatKontrak = async () => {
    if (!namaPekerjaan || !nilaiBorongan || !tglMulai || !estimasiHari) {
      Alert.alert('Data Kurang', 'Lengkapi semua kolom ya Bro.');
      return;
    }

    const total = parseInt(nilaiBorongan.replace(/[^0-9]/g, ''), 10);
    if (total < 50000) {
      Alert.alert('Waduh', 'Nilai borongan minimal Rp 50.000');
      return;
    }

    const dpRupiah = hitungDP();
    const feeHF = hitungFeeHF();
    const isOwner = myUser?.Peran === 'Owner';

    setLoading(true);
    const payload = {
      action: 'tambahKontrak',
      sheet: 'Kontrak',
      data: {
        Kontrak_ID: 'KTR-' + Date.now(),
        ID_Owner: isOwner ? myUser.Nama : params.penerima,
        ID_Mitra: isOwner ? params.penerima : myUser.Nama,
        Nama_Pekerjaan: namaPekerjaan,
        Nilai_Borongan: total,
        Persen_DP: persenDP,
        Nilai_Dp_Rupiah: dpRupiah,
        TglMulai: tglMulai,
        Estimasi_Hari: estimasiHari,
        Termin: termin,
        Fee_HF: feeHF,
      },
    };

    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.status === 'success') {
        Alert.alert(
          'SPK Terbit!',
          'Draft kontrak berhasil dibuat. Cek menu Kontrak untuk aktivasi DP.',
          [{ text: 'OKE', onPress: () => router.replace('/(tabs)/contract-list') }]
        );
      } else {
        Alert.alert('Gagal', result.message || 'Coba lagi.');
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal kirim. Cek koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  const total = parseInt(nilaiBorongan.replace(/[^0-9]/g, '') || '0', 10);
  const dpRupiah = hitungDP();
  const feeHF = hitungFeeHF();

  const namaPihakSatu = myUser?.Peran === 'Owner' ? myUser?.Nama : (params.penerima as string);
  const namaPihakDua = myUser?.Peran !== 'Owner' ? myUser?.Nama : (params.penerima as string);

  const totalText = 'Rp ' + total.toLocaleString('id-ID');
  const dpText = 'Rp ' + dpRupiah.toLocaleString('id-ID');
  const feeText = 'Rp ' + feeHF.toLocaleString('id-ID');
  const sisaText = 'Rp ' + (total - dpRupiah).toLocaleString('id-ID');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON_PNG.back }} style={styles.iconBack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat SPK / Kontrak</Text>
        <Image source={{ uri: ICON_PNG.contract }} style={styles.iconHeaderRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexFull}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.spkHeader}>
              <Image source={{ uri: ICON_PNG.contract }} style={styles.iconSpk} />
              <Text style={styles.spkTitle}>SURAT PERJANJIAN KERJA</Text>
              <Text style={styles.spkSub}>HomeFix — Platform Tukang Indonesia</Text>
            </View>

            <View style={styles.pihakBox}>
              <Text style={styles.pihakLabel}>PIHAK TERKAIT</Text>

              <View style={styles.pihakRow}>
                <Image source={{ uri: ICON_PNG.owner }} style={styles.pihakIcon} />
                <View>
                  <Text style={styles.pihakNama}>{namaPihakSatu}</Text>
                  <Text style={styles.pihakPeran}>Pihak Pertama (Owner)</Text>
                </View>
              </View>

              <View style={styles.pihakRow}>
                <Image source={{ uri: ICON_PNG.tukang }} style={styles.pihakIcon} />
                <View>
                  <Text style={styles.pihakNama}>{namaPihakDua}</Text>
                  <Text style={styles.pihakPeran}>Pihak Kedua (Tukang/Mitra)</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Nama / Judul Pekerjaan</Text>
            <TextInput
              style={styles.input}
              value={namaPekerjaan}
              onChangeText={setNamaPekerjaan}
              placeholder="Contoh: Renovasi Kamar Mandi Lt.2"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.label}>Total Nilai Borongan (Rp)</Text>
            <View style={styles.inputRow}>
              <Image source={{ uri: ICON_PNG.money }} style={styles.iconSmall} />
              <TextInput
                style={styles.inputFlex}
                placeholder="Contoh: 15.000.000"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
                value={nilaiBorongan}
                onChangeText={(t) => setNilaiBorongan(formatRupiah(t))}
              />
            </View>

            <Text style={styles.label}>Uang Muka / DP (Min. 5%)</Text>
            <View style={styles.dpRow}>
              {['5', '10', '20', '30', '50'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.dpBtn, persenDP === p ? styles.dpBtnActive : null]}
                  onPress={() => setPersenDP(p)}
                >
                  <Text style={[styles.dpText, persenDP === p ? styles.dpTextActive : null]}>
                    {p + '%'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {total > 0 ? (
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Nilai Borongan</Text>
                  <Text style={styles.previewVal}>{totalText}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{'DP ' + persenDP + '%'}</Text>
                  <Text style={styles.previewValOrange}>{dpText}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Fee HomeFix</Text>
                  <Text style={styles.previewVal}>{feeText}</Text>
                </View>
                <View style={styles.previewRowFinal}>
                  <Text style={styles.previewLabelBold}>Sisa Pelunasan</Text>
                  <Text style={styles.previewValFinal}>{sisaText}</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.label}>Tanggal Mulai Kerja</Text>
            <View style={styles.inputRow}>
              <Image source={{ uri: ICON_PNG.calendar }} style={styles.iconSmall} />
              <TextInput
                style={styles.inputFlex}
                placeholder="Contoh: 20 Juni 2025"
                placeholderTextColor="#bbb"
                value={tglMulai}
                onChangeText={setTglMulai}
              />
            </View>

            <Text style={styles.label}>Estimasi Lama Pekerjaan (Hari)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 30"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
              value={estimasiHari}
              onChangeText={setEstimasiHari}
            />

            <Text style={styles.label}>Sistem Pelunasan / Termin</Text>
            <TextInput
              style={styles.inputMulti}
              value={termin}
              onChangeText={setTermin}
              multiline
              placeholderTextColor="#bbb"
            />

            <View style={styles.infoBox}>
              <Image source={{ uri: ICON_PNG.info }} style={styles.iconInfo} />
              <Text style={styles.infoText}>
                Dana DP ditahan sistem HomeFix dan baru cair ke Tukang setelah verifikasi tiba di lokasi kerja.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnCreate, loading ? styles.btnCreateLoading : null]}
              onPress={handleBuatKontrak}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0d47a1" />
              ) : (
                <View style={styles.btnCreateContent}>
                  <Image source={{ uri: ICON_PNG.check }} style={styles.iconCheck} />
                  <Text style={styles.btnCreateText}>TERBITKAN SPK RESMI</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  flexFull: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    elevation: 3,
  },
  iconBack: { width: 24, height: 24 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
  iconHeaderRight: { width: 28, height: 28 },

  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 5 },

  spkHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FFC400',
  },
  iconSpk: { width: 36, height: 36 },
  spkTitle: { fontSize: 15, fontWeight: 'bold', color: '#0d47a1', marginTop: 8, letterSpacing: 1 },
  spkSub: { fontSize: 10, color: '#999', marginTop: 3 },

  pihakBox: { backgroundColor: '#f0f4ff', padding: 15, borderRadius: 15, marginBottom: 10 },
  pihakLabel: { fontSize: 10, fontWeight: 'bold', color: '#999', marginBottom: 10 },
  pihakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pihakIcon: { width: 32, height: 32, marginRight: 10 },
  pihakNama: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  pihakPeran: { fontSize: 10, color: '#888', marginTop: 1 },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#0d47a1', marginTop: 14, marginBottom: 7 },

  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  inputMulti: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    height: 70,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 4,
  },
  iconSmall: { width: 20, height: 20, marginRight: 10 },
  inputFlex: { flex: 1, fontSize: 14, color: '#333' },

  dpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dpBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dpBtnActive: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  dpText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  dpTextActive: { color: '#FFC400' },

  previewBox: {
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC400',
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  previewRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ffe082',
    paddingTop: 8,
    marginTop: 4,
  },
  previewLabel: { fontSize: 12, color: '#666' },
  previewLabelBold: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  previewVal: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  previewValOrange: { fontSize: 12, color: '#e65100', fontWeight: 'bold' },
  previewValFinal: { fontSize: 12, color: '#0d47a1', fontWeight: 'bold' },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 14,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  iconInfo: { width: 20, height: 20 },
  infoText: { flex: 1, marginLeft: 10, fontSize: 11, color: '#0d47a1', lineHeight: 17 },

  btnCreate: { backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 25, elevation: 4 },
  btnCreateLoading: { opacity: 0.6 },
  btnCreateContent: { flexDirection: 'row', alignItems: 'center' },
  iconCheck: { width: 22, height: 22, marginRight: 10 },
  btnCreateText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 15 },

  bottomSpace: { height: 60 },
});