import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back:   "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  bank:   "https://img.icons8.com/color/96/bank-building.png",
  money:  "https://img.icons8.com/color/96/money-box.png",
  info:   "https://img.icons8.com/color/96/info--v1.png",
  wallet: "https://img.icons8.com/color/96/wallet--v1.png"
};

export default function WithdrawScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [nominal, setNominal] = useState('');
  const [bank, setBank] = useState('');
  const [rekening, setRekening] = useState('');
  const [namaAkun, setNamaAkun] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_hf').then((s) => {
      if (s) {
        const parsed = JSON.parse(s);
        parsed.Saldo_Dompet = Number(parsed.Saldo_Dompet) || 0;
        setUser(parsed);
      }
    });
  }, []);

  const handleWithdraw = async () => {
    const jumlah = parseInt(nominal, 10);

    if (!nominal || !bank || !rekening || !namaAkun) {
      Alert.alert('Data Kurang', 'Lengkapi semua data bank dan nominal tarik, Bro.');
      return;
    }
    if (jumlah < 50000) {
      Alert.alert('Minimal Tarik', 'Pencairan saldo minimal adalah Rp 50.000');
      return;
    }
    if (jumlah > (user?.Saldo_Dompet || 0)) {
      Alert.alert('Saldo Kurang', 'Saldo aktif lo nggak cukup buat narik segitu.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        action: 'tambahTransaksi',
        sheet: 'Transaksi_Keuangan',
        data: {
          Trans_ID: 'WD-' + Date.now(),
          User_ID: user.Nama,
          Jenis_Transaksi: 'Withdraw',
          Jumlah_Nominal: jumlah,
          Tanggal_Jam: new Date().toISOString(),
          Keterangan: 'Tarik ke ' + bank + ' (' + rekening + ' a/n ' + namaAkun + ')',
          Nama_Bank: bank,
          No_Rekening: rekening,
          Bukti_TF: '-',
          Status_Admin: 'Pending',
        },
      };

      const res = await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();

      if (result.status === 'success') {
        Alert.alert(
          'Berhasil!',
          'Pengajuan tarik saldo terkirim. Admin akan memproses transfer manual dalam 1x24 jam.',
          [{ text: 'OKE', onPress: () => router.replace('/history') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal menghubungi pusat data HomeFix.');
    } finally {
      setLoading(false);
    }
  };

  const saldoAktif = Number(user?.Saldo_Dompet || 0).toLocaleString('id-ID');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexFull}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Image source={{ uri: ICON_PNG.back }} style={styles.iconBack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tarik Tunai Saldo</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.infoBox}>
              <Image source={{ uri: ICON_PNG.wallet }} style={styles.iconWallet} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Saldo Aktif Lo:</Text>
                <Text style={styles.infoValue}>{'Rp ' + saldoAktif}</Text>
              </View>
            </View>

            <Text style={styles.label}>Nominal Tarik (Rp)</Text>
            <View style={styles.inputRow}>
              <Image source={{ uri: ICON_PNG.money }} style={styles.iconSmall} />
              <TextInput
                style={styles.inputFlex}
                placeholder="Contoh: 100000"
                keyboardType="numeric"
                value={nominal}
                onChangeText={setNominal}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.label}>Nama Bank / E-Wallet</Text>
            <View style={styles.inputRow}>
              <Image source={{ uri: ICON_PNG.bank }} style={styles.iconSmall} />
              <TextInput
                style={styles.inputFlex}
                placeholder="BCA / Mandiri / Dana / Gopay"
                value={bank}
                onChangeText={setBank}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.label}>Nomor Rekening / HP</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nomor tujuan transfer"
              keyboardType="numeric"
              value={rekening}
              onChangeText={setRekening}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Nama Pemilik Rekening</Text>
            <TextInput
              style={styles.input}
              placeholder="Sesuai nama di bank/aplikasi"
              value={namaAkun}
              onChangeText={setNamaAkun}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.btnSubmit, loading ? styles.btnSubmitLoading : null]}
              onPress={handleWithdraw}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0d47a1" />
              ) : (
                <Text style={styles.btnText}>KIRIM PENGAJUAN</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerNote}>
              <Image source={{ uri: ICON_PNG.info }} style={styles.iconInfo} />
              <Text style={styles.noteText}>
                Pencairan akan diverifikasi admin. Saldo akan terpotong otomatis setelah transfer sukses.
              </Text>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    elevation: 3,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  iconBack: { width: 24, height: 24 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  headerSpacer: { width: 40 },
  scroll: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWallet: { width: 30, height: 30 },
  infoTextWrap: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: '#0d47a1', fontWeight: '600' },
  infoValue: { fontSize: 22, fontWeight: 'bold', color: '#0d47a1', marginTop: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 8 },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 15,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  iconSmall: { width: 20, height: 20, marginRight: 10 },
  inputFlex: { flex: 1, paddingVertical: 15, fontSize: 14, color: '#333' },
  btnSubmit: {
    backgroundColor: '#FFC400',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 30,
    elevation: 4,
  },
  btnSubmitLoading: { opacity: 0.7 },
  btnText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 16 },
  footerNote: {
    flexDirection: 'row',
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconInfo: { width: 16, height: 16 },
  noteText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
  },
  bottomSpace: { height: 50 },
});