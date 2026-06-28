import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON = {
  back:   "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  money:  "https://img.icons8.com/color/96/money-bag.png",
  check:  "https://img.icons8.com/color/96/ok--v1.png",
  cancel: "https://img.icons8.com/color/96/cancel.png",
  clock:  "https://img.icons8.com/color/96/clock--v1.png",
  bank:   "https://img.icons8.com/color/96/bank.png",
  info:   "https://img.icons8.com/color/96/info--v1.png",
};

export default function KasbonRequestScreen() {
  const router = useRouter();
  const { kontrak_id, id_owner, id_mitra, nama_pekerjaan, nilai_borongan } = useLocalSearchParams();

  const [myUser,       setMyUser]       = useState<any>(null);
  const [daftarKasbon, setDaftarKasbon] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [proc,         setProc]         = useState(false);
  const [nominal,      setNominal]      = useState('');
  const [showModal,    setShowModal]    = useState(false);

  // FIX: plafon real-time dari server, bukan dihitung sendiri di frontend
  const [plafonTersisa, setPlafonTersisa]   = useState<number | null>(null);
  const [saldoKontrak,  setSaldoKontrak]    = useState<number | null>(null);

  const [showModal2, setShowModal2] = useState(false); // (tidak dipakai, dibiarkan kosong agar tidak konflik nama)

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) setMyUser(JSON.parse(session));
      await ambilKasbon();
      await ambilPlafon();
    } catch {}
    finally { setLoading(false); }
  };

  const ambilKasbon = async () => {
    try {
      const res  = await fetch(`${BASE_URL}?sheet=Kasbon`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDaftarKasbon(data.filter((k: any) => k.Kontrak_ID === kontrak_id));
      }
    } catch {}
  };

  // FIX: ambil plafon tersisa & saldo kontrak terkunci dari backend
  const ambilPlafon = async () => {
    try {
      const res  = await fetch(`${BASE_URL}?action=getPlafonKasbon&kontrak_id=${encodeURIComponent(kontrak_id as string)}`);
      const data = await res.json();
      if (data && typeof data.plafon_tersisa === 'number') {
        setPlafonTersisa(data.plafon_tersisa);
        setSaldoKontrak(data.saldo_kontrak_terkunci);
      }
    } catch {}
  };

  const isOwner = myUser?.Nama === id_owner;
  const isMitra = myUser?.Nama === id_mitra;

  const totalDisetujui = daftarKasbon
    .filter(k => k.Status === 'Disetujui')
    .reduce((sum: number, k: any) => sum + Number(k.Nominal || 0), 0);

  const jumlahPengajuan = daftarKasbon.filter(k => k.Status !== 'Ditolak').length;

  const handleAjukan = async () => {
    if (jumlahPengajuan >= 5) {
      Alert.alert('Batas Kasbon', 'Maksimal 5x pengajuan kasbon per kontrak.');
      return;
    }
    const nom = parseInt(nominal.replace(/\D/g, ''));
    if (!nom || nom < 10000) {
      Alert.alert('Error', 'Nominal minimal Rp 10.000');
      return;
    }
    // FIX: validasi tidak boleh melebihi plafon tersisa
    if (plafonTersisa !== null && nom > plafonTersisa) {
      Alert.alert('Melebihi Plafon', `Nominal tidak boleh lebih dari sisa plafon kontrak: Rp ${plafonTersisa.toLocaleString('id-ID')}`);
      return;
    }
    setProc(true);
    try {
      const kasbon_id = 'KSB-' + Date.now();
      await fetch(BASE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahKasbon',
          data: {
            Kasbon_ID:  kasbon_id,
            Kontrak_ID: kontrak_id,
            ID_Mitra:   id_mitra,
            ID_Owner:   id_owner,
            Nominal:    nom,
          }
        })
      });
      await fetch(BASE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahAktivitas',
          sheet:  'Aktivitas',
          data: {
            ID:      'AKT-' + Date.now(),
            Penerima: id_owner,
            Pengirim: id_mitra,
            Tipe:    'kasbon',
            Post_ID: kontrak_id,
            Pesan:   `${id_mitra} mengajukan kasbon Rp ${nom.toLocaleString('id-ID')}`,
            Waktu:   new Date().toLocaleString('id-ID'),
          }
        })
      });
      setNominal('');
      setShowModal(false);
      Alert.alert('✅ Terkirim', 'Pengajuan kasbon terkirim. Menunggu persetujuan owner.');
      await ambilKasbon();
      await ambilPlafon();
    } catch {
      Alert.alert('Gagal', 'Koneksi error. Coba lagi.');
    } finally {
      setProc(false);
    }
  };

  const handleResponOwner = (kasbon: any, statusBaru: string) => {
    const label = statusBaru === 'Disetujui' ? 'Cairkan' : 'Tolak';
    Alert.alert(`${label} Kasbon`,
      `${label} kasbon Rp ${Number(kasbon.Nominal).toLocaleString('id-ID')}?`,
      [
        { text: 'Batal' },
        { text: label, onPress: async () => {
          setProc(true);
          try {
            const res = await fetch(BASE_URL, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'updateStatusKasbon',
                data: {
                  Kasbon_ID:  kasbon.Kasbon_ID,
                  status:     statusBaru,
                  id_mitra:   id_mitra,
                  id_owner:   id_owner,
                  kontrak_id: kontrak_id,
                  nominal:    kasbon.Nominal,
                  catatan:    statusBaru === 'Ditolak' ? 'Ditolak oleh Owner' : 'Disetujui',
                }
              })
            });
            const result = await res.json();

            // FIX: kalau backend menolak karena saldo kontrak tidak cukup, beri pesan jelas
            if (result && result.error) {
              Alert.alert('⚠️ Tidak Bisa Dicairkan', result.error);
              await ambilKasbon();
              await ambilPlafon();
              setProc(false);
              return;
            }

            await fetch(BASE_URL, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'tambahAktivitas',
                sheet:  'Aktivitas',
                data: {
                  ID:      'AKT-' + Date.now(),
                  Penerima: id_mitra,
                  Pengirim: id_owner,
                  Tipe:    'kasbon_respon',
                  Post_ID: kontrak_id,
                  Pesan:   statusBaru === 'Disetujui'
                    ? `Kasbon Rp ${Number(kasbon.Nominal).toLocaleString('id-ID')} disetujui! Dana masuk ke saldo, silakan withdraw.`
                    : `Kasbon Rp ${Number(kasbon.Nominal).toLocaleString('id-ID')} ditolak owner.`,
                  Waktu: new Date().toLocaleString('id-ID'),
                }
              })
            });
            await ambilKasbon();
            await ambilPlafon();
            if (statusBaru === 'Disetujui') {
              Alert.alert('✅ Dicairkan', 'Dana kasbon masuk ke saldo tukang.');
            }
          } catch {
            Alert.alert('Gagal', 'Koneksi error.');
          } finally {
            setProc(false);
          }
        }}
      ]
    );
  };

  const formatRp = (val: string) => {
    const angka = val.replace(/\D/g, '');
    return angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const statusColor = (status: string) => {
    if (status === 'Disetujui') return '#4caf50';
    if (status === 'Ditolak')   return '#f44336';
    return '#ff9800';
  };

  const statusIcon = (status: string) => {
    if (status === 'Disetujui') return ICON.check;
    if (status === 'Ditolak')   return ICON.cancel;
    return ICON.clock;
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#0d47a1" size="large" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>KASBON PROYEK</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.infoBox}>
            <Image source={{ uri: ICON.money }} style={{ width: 32, height: 32 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.infoJudul}>{nama_pekerjaan}</Text>
              <Text style={s.infoSub}>Nilai Kontrak: Rp {Number(nilai_borongan).toLocaleString('id-ID')}</Text>
              <Text style={s.infoSub}>Total Dicairkan: Rp {totalDisetujui.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {/* FIX: kartu info plafon & saldo kontrak terkunci */}
          {plafonTersisa !== null && (
            <View style={s.plafonBox}>
              <Image source={{ uri: ICON.info }} style={{ width: 20, height: 20 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.plafonLabel}>Sisa Plafon Kasbon</Text>
                <Text style={s.plafonValue}>Rp {plafonTersisa.toLocaleString('id-ID')}</Text>
                {saldoKontrak !== null && (
                  <Text style={s.plafonSub}>Saldo kontrak terkunci saat ini: Rp {saldoKontrak.toLocaleString('id-ID')}</Text>
                )}
              </View>
            </View>
          )}

          {isMitra && (
            <View style={s.kuotaBox}>
              <Text style={s.kuotaLabel}>Sisa Kuota Kasbon</Text>
              <View style={s.kuotaRow}>
                {[1,2,3,4,5].map(n => (
                  <View key={n} style={[s.kuotaDot, n <= jumlahPengajuan && s.kuotaDotUsed]} />
                ))}
              </View>
              <Text style={s.kuotaSub}>{jumlahPengajuan}/5 pengajuan terpakai</Text>
            </View>
          )}

          {isMitra && jumlahPengajuan < 5 && (
            <TouchableOpacity style={s.btnAjukan} onPress={() => setShowModal(true)}>
              <Image source={{ uri: ICON.money }} style={{ width: 20, height: 20, marginRight: 8 }} />
              <Text style={s.btnAjukanText}>+ AJUKAN KASBON</Text>
            </TouchableOpacity>
          )}

          {isMitra && jumlahPengajuan >= 5 && (
            <View style={s.limitBox}>
              <Text style={s.limitText}>⚠️ Batas 5x kasbon tercapai</Text>
            </View>
          )}

          <Text style={s.sectionTitle}>Riwayat Pengajuan</Text>

          {daftarKasbon.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Belum ada pengajuan kasbon</Text>
            </View>
          )}

          {daftarKasbon.map((item, idx) => (
            <View key={idx} style={s.kasbonCard}>
              <View style={s.kasbonTop}>
                <Image source={{ uri: statusIcon(item.Status) }} style={{ width: 24, height: 24 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={s.kasbonNominal}>Rp {Number(item.Nominal).toLocaleString('id-ID')}</Text>
                  <Text style={s.kasbonTgl}>{item.TglAjuan}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusColor(item.Status) }]}>
                  <Text style={s.statusBadgeText}>{item.Status}</Text>
                </View>
              </View>

              {isOwner && item.Status === 'Menunggu' && (
                <View style={s.ownerBtnRow}>
                  <TouchableOpacity
                    style={[s.ownerBtn, { backgroundColor: '#4caf50' }]}
                    onPress={() => handleResponOwner(item, 'Disetujui')}
                    disabled={proc}
                  >
                    <Text style={s.ownerBtnText}>✅ Cairkan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.ownerBtn, { backgroundColor: '#f44336' }]}
                    onPress={() => handleResponOwner(item, 'Ditolak')}
                    disabled={proc}
                  >
                    <Text style={s.ownerBtnText}>❌ Tolak</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isMitra && item.Status === 'Disetujui' && (
                <View style={s.infoDisetujui}>
                  <Image source={{ uri: ICON.bank }} style={{ width: 16, height: 16, marginRight: 6 }} />
                  <Text style={s.infoDisetujuiText}>Dana sudah masuk ke saldo dompet kamu</Text>
                </View>
              )}
            </View>
          ))}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Ajukan Kasbon</Text>
            <Text style={s.modalSub}>Masukkan nominal yang dibutuhkan</Text>
            <View style={s.inputRow}>
              <Text style={s.rpLabel}>Rp</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="0"
                value={nominal}
                onChangeText={v => setNominal(formatRp(v))}
                placeholderTextColor="#aaa"
              />
            </View>
            <Text style={s.modalNote}>
              {plafonTersisa !== null ? `* Maksimal: Rp ${plafonTersisa.toLocaleString('id-ID')}\n` : ''}
              * Sisa kuota: {5 - jumlahPengajuan}x lagi{'\n'}
              * Menunggu persetujuan owner
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnBatal}
                onPress={() => { setShowModal(false); setNominal(''); }}
              >
                <Text style={s.modalBtnBatalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnKirim} onPress={handleAjukan} disabled={proc}>
                {proc
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.modalBtnKirimText}>Kirim</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f0f2f5' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 3 },
  headerTitle:        { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
  scroll:             { padding: 16 },
  infoBox:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#0d47a1' },
  infoJudul:          { fontSize: 13, fontWeight: 'bold', color: '#0d47a1', marginBottom: 2 },
  infoSub:            { fontSize: 11, color: '#555', marginTop: 1 },
  plafonBox:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  plafonLabel:        { fontSize: 11, color: '#2e7d32', fontWeight: 'bold' },
  plafonValue:        { fontSize: 16, color: '#2e7d32', fontWeight: 'bold', marginTop: 2 },
  plafonSub:          { fontSize: 10, color: '#558b2f', marginTop: 4 },
  kuotaBox:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, alignItems: 'center' },
  kuotaLabel:         { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  kuotaRow:           { flexDirection: 'row', gap: 8, marginBottom: 6 },
  kuotaDot:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e0e0' },
  kuotaDotUsed:       { backgroundColor: '#0d47a1' },
  kuotaSub:           { fontSize: 10, color: '#888' },
  btnAjukan:          { flexDirection: 'row', backgroundColor: '#0d47a1', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 4 },
  btnAjukanText:      { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  limitBox:           { backgroundColor: '#fff3e0', padding: 14, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  limitText:          { color: '#e65100', fontWeight: 'bold', fontSize: 13 },
  sectionTitle:       { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyBox:           { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center', elevation: 2 },
  emptyText:          { color: '#aaa', fontSize: 13 },
  kasbonCard:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 3 },
  kasbonTop:          { flexDirection: 'row', alignItems: 'center' },
  kasbonNominal:      { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
  kasbonTgl:          { fontSize: 10, color: '#999', marginTop: 2 },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText:    { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  ownerBtnRow:        { flexDirection: 'row', marginTop: 10, gap: 8 },
  ownerBtn:           { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  ownerBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  infoDisetujui:      { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#e8f5e9', padding: 10, borderRadius: 10 },
  infoDisetujuiText:  { color: '#2e7d32', fontWeight: 'bold', fontSize: 11 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:         { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  modalSub:           { fontSize: 12, color: '#888', marginBottom: 16 },
  inputRow:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0d47a1', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  rpLabel:            { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginRight: 6 },
  input:              { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#333', paddingVertical: 12 },
  modalNote:          { fontSize: 10, color: '#999', lineHeight: 16, marginBottom: 16 },
  modalBtnRow:        { flexDirection: 'row', gap: 10 },
  modalBtnBatal:      { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#0d47a1', alignItems: 'center' },
  modalBtnBatalText:  { color: '#0d47a1', fontWeight: 'bold' },
  modalBtnKirim:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0d47a1', alignItems: 'center' },
  modalBtnKirimText:  { color: '#fff', fontWeight: 'bold' },
});