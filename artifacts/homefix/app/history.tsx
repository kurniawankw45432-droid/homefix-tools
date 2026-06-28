import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Image,
  TouchableOpacity, SafeAreaView, ActivityIndicator, 
  RefreshControl, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back:   "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  wallet: "https://img.icons8.com/color/96/wallet--v1.png",
  plus:   "https://img.icons8.com/color/96/plus--v1.png",
  cash:   "https://img.icons8.com/color/96/money-box.png",
  in:     "https://img.icons8.com/fluency/96/download-2.png",
  out:    "https://img.icons8.com/fluency/96/upload-2.png",
  trash:  "https://img.icons8.com/color/96/trash.png",
  empty:  "https://img.icons8.com/color/96/empty-wallet.png",
  pending:"https://img.icons8.com/color/96/hourglass.png",
};

interface Transaksi {
  Trans_ID: string;
  User_ID: string;
  Jenis_Transaksi: string;
  Jumlah_Nominal: number;
  Tanggal_Jam: string;
  Keterangan: string;
  Status_Admin: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory]       = useState<Transaksi[]>([]);
  const [user, setUser]             = useState<any>(null);

  const ambilHistory = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (!session) return;
      const me = JSON.parse(session);

      const [resT, resU] = await Promise.all([
        fetch(`${BASE_URL}?sheet=Transaksi_Keuangan`),
        fetch(`${BASE_URL}?sheet=Pengguna`)
      ]);

      const dataT = await resT.json();
      const dataU = await resU.json();

      if (Array.isArray(dataT)) {
        const myHistory = dataT
          .filter(t => t.User_ID === me.Nama || t.User_ID === me.User_ID)
          .reverse();
        setHistory(myHistory);
      }

      if (Array.isArray(dataU)) {
        const latestMe = dataU.find((u: any) => u.User_ID === me.User_ID || u.Nama === me.Nama);
        if (latestMe) {
          latestMe.Saldo_Dompet = Number(latestMe.Saldo_Dompet) || 0;
          setUser(latestMe);
          await AsyncStorage.setItem('user_hf', JSON.stringify(latestMe));
        }
      }
    } catch (e) {
      console.log("History Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { ambilHistory(); }, []);

  const handleHapusTrans = (id: string) => {
    Alert.alert("Hapus Riwayat", "Hapus catatan transaksi ini?", [
      { text: "Batal" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        try {
          await fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteData', sheet: 'Transaksi_Keuangan', id })
          });
          ambilHistory();
        } catch (e) { Alert.alert("Gagal", "Koneksi error."); }
      }}
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Sukses' || status === 'Verified') return '#4caf50';
    if (status === 'Ditolak') return '#d32f2f';
    return '#FFC400';
  };

  const renderItem = ({ item }: { item: Transaksi }) => {
    const isPlus = item.Jenis_Transaksi === 'Topup' ||
                   item.Jenis_Transaksi === 'Kasbon' ||
                   item.Jenis_Transaksi.includes('Masuk');
    const isPending = item.Status_Admin === 'Pending';

    return (
      <View style={styles.transCard}>
        <View style={[styles.iconCircle, { backgroundColor: isPlus ? '#e8f5e9' : '#ffebee' }]}>
          <Image source={{ uri: isPlus ? ICON_PNG.in : ICON_PNG.out }} style={{ width: 22, height: 22 }} />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.transTitle}>{item.Keterangan}</Text>
          <Text style={styles.transDate}>
            {new Date(item.Tanggal_Jam).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.Status_Admin) + '22' }]}>
            {isPending && <Image source={{ uri: ICON_PNG.pending }} style={styles.statusIcon} />}
            <Text style={[styles.statusText, { color: getStatusColor(item.Status_Admin) }]}>
              {isPending ? 'Menunggu Verifikasi' : item.Status_Admin}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amountText, { color: isPlus ? '#4caf50' : '#d32f2f' }]}>
            {isPlus ? '+' : '-'} Rp {Number(item.Jumlah_Nominal).toLocaleString('id-ID')}
          </Text>
          <TouchableOpacity onPress={() => handleHapusTrans(item.Trans_ID)} style={{ marginTop: 8 }}>
            <Image source={{ uri: ICON_PNG.trash }} style={{ width: 14, height: 14, opacity: 0.4 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalMasuk   = history.filter(t => t.Jenis_Transaksi === 'Topup'    && t.Status_Admin === 'Sukses').reduce((s, t) => s + Number(t.Jumlah_Nominal), 0);
  const totalKeluar  = history.filter(t => t.Jenis_Transaksi === 'Withdraw' && t.Status_Admin === 'Sukses').reduce((s, t) => s + Number(t.Jumlah_Nominal), 0);
  const totalPending = history.filter(t => t.Status_Admin === 'Pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dompet HomeFix</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.balanceCard}>
        <Image source={{ uri: ICON_PNG.wallet }} style={{ width: 40, height: 40, marginBottom: 10 }} />
        <Text style={styles.balanceLabel}>Saldo Aktif Saat Ini</Text>
        <Text style={styles.balanceAmount}>
          Rp {Number(user?.Saldo_Dompet || 0).toLocaleString('id-ID')}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>Rp {totalMasuk.toLocaleString('id-ID')}</Text>
            <Text style={styles.summaryLbl}>Total Masuk</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#d32f2f' }]}>Rp {totalKeluar.toLocaleString('id-ID')}</Text>
            <Text style={styles.summaryLbl}>Total Keluar</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#FFC400' }]}>{totalPending}</Text>
            <Text style={styles.summaryLbl}>Pending</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.btnAction}
            onPress={() => router.push('/topup' as any)}
          >
            <Image source={{ uri: ICON_PNG.plus }} style={{ width: 20, height: 20 }} />
            <Text style={styles.btnActionText}>Isi Saldo</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.btnAction}
            onPress={() => router.push('/withdraw' as any)}
          >
            <Image source={{ uri: ICON_PNG.cash }} style={{ width: 20, height: 20 }} />
            <Text style={styles.btnActionText}>Tarik Tunai</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
        {loading ? (
          <ActivityIndicator color="#0d47a1" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item, index) => item.Trans_ID || String(index)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); ambilHistory(); }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Image source={{ uri: ICON_PNG.empty }} style={{ width: 60, height: 60 }} />
                <Text style={styles.emptyText}>Belum ada aktivitas keuangan.</Text>
                <Text style={styles.emptySubText}>Isi saldo pertama kamu sekarang!</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0d47a1' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backBtn:        { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:    { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  balanceCard:    { backgroundColor: '#fff', margin: 20, borderRadius: 25, padding: 25, alignItems: 'center', elevation: 10 },
  balanceLabel:   { color: '#999', fontSize: 12, fontWeight: '600' },
  balanceAmount:  { color: '#0d47a1', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  summaryRow:     { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 10, marginBottom: 5, paddingVertical: 12, backgroundColor: '#f9f9f9', borderRadius: 15 },
  summaryItem:    { alignItems: 'center' },
  summaryVal:     { fontSize: 12, fontWeight: 'bold', color: '#4caf50' },
  summaryLbl:     { fontSize: 9, color: '#999', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#eee' },
  actionRow:      { flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15, width: '100%', justifyContent: 'space-around' },
  btnAction:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#f0f4ff', borderRadius: 20 },
  btnActionText:  { marginLeft: 8, fontWeight: 'bold', color: '#0d47a1', fontSize: 13 },
  divider:        { width: 1, height: 25, backgroundColor: '#eee' },
  historySection: { flex: 1, backgroundColor: '#f5f7fa', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  transCard:      { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 12, alignItems: 'center', elevation: 2 },
  iconCircle:     { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  transTitle:     { fontSize: 13, fontWeight: 'bold', color: '#333' },
  transDate:      { fontSize: 10, color: '#aaa', marginTop: 2 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 5 },
  statusIcon:     { width: 11, height: 11, marginRight: 4 },
  statusText:     { fontSize: 9, fontWeight: 'bold' },
  amountText:     { fontWeight: 'bold', fontSize: 13 },
  emptyBox:       { alignItems: 'center', marginTop: 60 },
  emptyText:      { textAlign: 'center', marginTop: 12, color: '#999', fontSize: 13, fontWeight: 'bold' },
  emptySubText:   { textAlign: 'center', marginTop: 5, color: '#bbb', fontSize: 11 },
});