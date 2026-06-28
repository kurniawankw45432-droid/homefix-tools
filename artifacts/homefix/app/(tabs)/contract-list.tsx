import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiGet, formatRupiah } from '../../utils/api';
import { Kontrak, User } from '../../utils/types';

const STATUS_COLORS: Record<string, string> = {
  'Menunggu DP': '#9e9e9e',
  'Berjalan': '#1565c0',
  'Pengerjaan': '#f57f17',
  'Selesai': '#2e7d32',
  'Menunggu Verifikasi': '#e65100',
};

export default function ContractListScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<Kontrak[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    const raw = await AsyncStorage.getItem('user_hf');
    if (!raw) { router.replace('/welcome'); return; }
    const u: User = JSON.parse(raw);
    setUser(u);
    try {
      const [contractData, userData] = await Promise.all([
        apiGet({ action: 'getData', sheet: 'Kontrak' }),
        apiGet({ action: 'getData', sheet: 'Pengguna' }),
      ]);
      if (Array.isArray(contractData)) {
        // FIX: ID_Owner & ID_Mitra di tab Kontrak diisi dengan NAMA (bukan User_ID),
        // sesuai cara create-contract.tsx menyimpan data. Cocokkan dengan u.Nama.
        const mine = contractData.filter((c: Kontrak) => c.ID_Owner === u.Nama || c.ID_Mitra === u.Nama);
        setContracts(mine);
      }
      if (Array.isArray(userData)) setAllUsers(userData);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getOtherParty = (c: Kontrak) => {
    if (!user) return '-';
    // FIX: bandingkan & cari lawan transaksi berdasarkan Nama juga
    const otherName = user.Nama === c.ID_Owner ? c.ID_Mitra : c.ID_Owner;
    const other = allUsers.find((u) => u.Nama === otherName);
    return other?.Nama || otherName;
  };

  const renderItem = ({ item }: { item: Kontrak }) => {
    const color = STATUS_COLORS[item.Status_Kontrak] || '#555';
    const dp = parseInt(item.Nilai_Dp_Rupiah || '0');
    const total = parseInt(item.Nilai_Borongan || '0');
    return (
      <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/contract-detail', params: { id: item.Kontrak_ID } })}>
        <View style={s.cardTop}>
          <View style={[s.statusBadge, { backgroundColor: color }]}>
            <Text style={s.statusTxt}>{item.Status_Kontrak || 'Draft'}</Text>
          </View>
          <Text style={s.kontrakId}>#{item.Kontrak_ID}</Text>
        </View>
        <Text style={s.pekerjaan}>{item.Nama_Pekerjaan}</Text>
        <Text style={s.partner}>
          {user?.Nama === item.ID_Owner ? '🏠 Owner → ' : '🔧 Mitra → '}
          {getOtherParty(item)}
        </Text>
        <View style={s.cardBottom}>
          <View>
            <Text style={s.label}>Total Nilai</Text>
            <Text style={s.amount}>{formatRupiah(total)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>DP ({item.Persen_DP}%)</Text>
            <Text style={s.dpAmount}>{formatRupiah(dp)}</Text>
          </View>
        </View>
        <View style={s.arrowRow}>
          <Text style={s.tap}>Tap untuk detail →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Kontrak Saya</Text>
        <Text style={s.headerSub}>{contracts.length} kontrak aktif</Text>
      </View>
      <FlatList
        data={contracts}
        keyExtractor={(item) => item.Kontrak_ID}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 60 }}>
            <Image source={{ uri: 'https://img.icons8.com/fluency/96/contract.png' }} style={{ width: 64, height: 64, opacity: 0.3, marginBottom: 12 }} />
            <Text style={{ color: '#999', fontSize: 15 }}>Belum ada kontrak</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { backgroundColor: '#0d47a1', paddingTop: 55, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { color: '#fff', fontWeight: '800', fontSize: 11 },
  kontrakId: { color: '#999', fontSize: 11 },
  pekerjaan: { fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 4 },
  partner: { color: '#555', fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  label: { fontSize: 11, color: '#999', marginBottom: 2 },
  amount: { fontWeight: '800', fontSize: 16, color: '#0d47a1' },
  dpAmount: { fontWeight: '700', fontSize: 14, color: '#2e7d32' },
  arrowRow: { marginTop: 8, alignItems: 'flex-end' },
  tap: { color: '#0d47a1', fontSize: 12, fontWeight: '600' },
});