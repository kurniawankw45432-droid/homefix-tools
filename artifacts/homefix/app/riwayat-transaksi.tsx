import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BASE_URL } from '../constants';

const ICON = {
  back:    "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  in:      "https://img.icons8.com/color/96/positive-dynamic.png",
  out:     "https://img.icons8.com/color/96/negative-dynamic.png",
  lock:    "https://img.icons8.com/color/96/lock--v1.png",
  empty:   "https://img.icons8.com/color/96/empty-box.png",
  refresh: "https://img.icons8.com/color/96/refresh.png",
};

// FIX-AUDIT: label & ikon ramah-baca untuk tiap jenis transaksi di Ledger_Keuangan
const LABEL_JENIS: Record<string, string> = {
  Bayar_DP:       'Bayar DP',
  DP_Cair:        'DP Cair ke Tukang',
  Fee_HomeFix:    'Fee HomeFix',
  Topup_Kontrak:  'Isi Saldo Kontrak',
  Kasbon_Cair:    'Kasbon Cair',
  Pelunasan_Cair: 'Pelunasan Akhir',
  Topup_Dompet:   'Topup Dompet',
};

export default function RiwayatTransaksiScreen() {
  const router = useRouter();
  const { kontrak_id, nama_pekerjaan } = useLocalSearchParams();

  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [daftar,    setDaftar]    = useState<any[]>([]);

  useEffect(() => { ambilLedger(); }, []);

  const ambilLedger = async () => {
    try {
      const res  = await fetch(`${BASE_URL}?sheet=Ledger_Keuangan`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const milikKontrak = data
          .filter((t: any) => t.Kontrak_ID === kontrak_id)
          // FIX-AUDIT: urutkan dari yang paling baru
          .sort((a: any, b: any) => {
            const ta = new Date(a.Tanggal).getTime() || 0;
            const tb = new Date(b.Tanggal).getTime() || 0;
            return tb - ta;
          });
        setDaftar(milikKontrak);
      }
    } catch {
      Alert.alert('Error', 'Gagal memuat riwayat transaksi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    ambilLedger();
  };

  const formatTanggal = (val: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return val; }
  };

  const totalMasuk = daftar.reduce((sum, t) => sum + (Number(t.Nominal_Masuk) || 0), 0);
  const totalKeluar = daftar.reduce((sum, t) => sum + (Number(t.Nominal_Keluar) || 0), 0);

  if (loading) return <View style={s.center}><ActivityIndicator color="#0d47a1" size="large" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>RIWAYAT TRANSAKSI</Text>
        <TouchableOpacity onPress={handleRefresh}>
          {refreshing
            ? <ActivityIndicator color="#0d47a1" size="small" />
            : <Image source={{ uri: ICON.refresh }} style={{ width: 22, height: 22 }} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.infoBox}>
          <Image source={{ uri: ICON.lock }} style={{ width: 28, height: 28 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.infoJudul}>{nama_pekerjaan || kontrak_id}</Text>
            <Text style={s.infoSub}>No. Kontrak: {kontrak_id}</Text>
          </View>
        </View>

        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderLeftColor: '#4caf50' }]}>
            <Text style={s.summaryLabel}>Total Masuk</Text>
            <Text style={[s.summaryValue, { color: '#2e7d32' }]}>Rp {totalMasuk.toLocaleString('id-ID')}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#e53935' }]}>
            <Text style={s.summaryLabel}>Total Keluar</Text>
            <Text style={[s.summaryValue, { color: '#c62828' }]}>Rp {totalKeluar.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Histori Lengkap ({daftar.length})</Text>

        {daftar.length === 0 && (
          <View style={s.emptyBox}>
            <Image source={{ uri: ICON.empty }} style={{ width: 48, height: 48, marginBottom: 10 }} />
            <Text style={s.emptyText}>Belum ada transaksi tercatat untuk kontrak ini</Text>
          </View>
        )}

        {daftar.map((item, idx) => {
          const masuk  = Number(item.Nominal_Masuk)  || 0;
          const keluar = Number(item.Nominal_Keluar) || 0;
          const isMasuk = masuk > 0;
          return (
            <View key={idx} style={s.card}>
              <Image
                source={{ uri: isMasuk ? ICON.in : ICON.out }}
                style={{ width: 28, height: 28 }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardJenis}>
                  {LABEL_JENIS[item.Jenis_Transaksi] || item.Jenis_Transaksi}
                </Text>
                <Text style={s.cardKet} numberOfLines={2}>{item.Keterangan}</Text>
                <Text style={s.cardTgl}>{formatTanggal(item.Tanggal)}</Text>
                {item.Sumber_Dana || item.Tujuan_Dana ? (
                  <Text style={s.cardArus}>
                    {item.Sumber_Dana || '-'} → {item.Tujuan_Dana || '-'}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.cardNominal, { color: isMasuk ? '#2e7d32' : '#c62828' }]}>
                  {isMasuk ? '+' : '-'} Rp {(isMasuk ? masuk : keluar).toLocaleString('id-ID')}
                </Text>
                <Text style={s.cardSaldo}>Saldo: Rp {(Number(item.Saldo_Setelah) || 0).toLocaleString('id-ID')}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f0f2f5' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 3 },
  headerTitle:   { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
  scroll:        { padding: 16 },
  infoBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#0d47a1' },
  infoJudul:     { fontSize: 13, fontWeight: 'bold', color: '#0d47a1' },
  infoSub:       { fontSize: 11, color: '#888', marginTop: 2 },
  summaryRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, borderLeftWidth: 4 },
  summaryLabel:  { fontSize: 10, color: '#888' },
  summaryValue:  { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  sectionTitle:  { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyBox:      { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center', elevation: 2 },
  emptyText:     { color: '#aaa', fontSize: 12, textAlign: 'center' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardJenis:     { fontSize: 12, fontWeight: 'bold', color: '#0d47a1' },
  cardKet:       { fontSize: 10, color: '#666', marginTop: 2, lineHeight: 14 },
  cardTgl:       { fontSize: 9, color: '#aaa', marginTop: 4 },
  cardArus:      { fontSize: 9, color: '#999', marginTop: 2, fontStyle: 'italic' },
  cardNominal:   { fontSize: 12, fontWeight: 'bold' },
  cardSaldo:     { fontSize: 9, color: '#999', marginTop: 4 },
});