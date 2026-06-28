import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { apiGet } from '../../utils/api';
import { User } from '../../utils/types';

const FILTERS = ['Semua', 'Owner', 'Tukang', 'Helper'];

// rumus Haversine — hitung jarak antar 2 koordinat GPS dalam KM
function hitungJarakKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // radius bumi dalam KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ArtisanListScreen() {
  const [myUser, setMyUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [refreshing, setRefreshing] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  // ambil lokasi GPS pencari (owner) untuk menghitung jarak ke tukang
  const ambilLokasiSendiri = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const posisi = await Location.getCurrentPositionAsync({});
      return { lat: posisi.coords.latitude, lng: posisi.coords.longitude };
    } catch (e) {
      return null;
    }
  };

  const load = async () => {
    const raw = await AsyncStorage.getItem('user_hf');
    let parsedMe: User | null = null;
    if (raw) {
      parsedMe = JSON.parse(raw);
      setMyUser(parsedMe);
    }

    const lokasiSendiri = await ambilLokasiSendiri();
    if (lokasiSendiri) {
      setMyLat(lokasiSendiri.lat);
      setMyLng(lokasiSendiri.lng);
    }

    try {
      const data = await apiGet({ action: 'getData', sheet: 'Pengguna' });
      if (Array.isArray(data)) {
        // FIX: sembunyikan diri sendiri dari daftar pencarian, dan sembunyikan
        // akun internal HOMEFIX-ADMIN supaya tidak muncul sebagai "user biasa"
        let dataTanpaDiriSendiri = data.filter((u: any) =>
          u.User_ID !== 'HOMEFIX-ADMIN' &&
          (!parsedMe || u.Nama !== parsedMe.Nama)
        );

        let dataUrut = dataTanpaDiriSendiri;
        if (lokasiSendiri) {
          dataUrut = [...dataTanpaDiriSendiri].sort((a: any, b: any) => {
            const aLat = parseFloat(a.Lokasi_Lat);
            const aLng = parseFloat(a.Lokasi_Lng);
            const bLat = parseFloat(b.Lokasi_Lat);
            const bLng = parseFloat(b.Lokasi_Lng);
            const aPunyaGPS = !isNaN(aLat) && !isNaN(aLng);
            const bPunyaGPS = !isNaN(bLat) && !isNaN(bLng);

            if (aPunyaGPS && bPunyaGPS) {
              const jarakA = hitungJarakKm(lokasiSendiri.lat, lokasiSendiri.lng, aLat, aLng);
              const jarakB = hitungJarakKm(lokasiSendiri.lat, lokasiSendiri.lng, bLat, bLng);
              return jarakA - jarakB;
            }
            if (aPunyaGPS && !bPunyaGPS) return -1;
            if (!aPunyaGPS && bPunyaGPS) return 1;
            return 0;
          });
        }
        setUsers(dataUrut);
        applyFilter(dataUrut, search, filter);
      }
    } catch (e) {
      // ignore
    }
  };

  const applyFilter = (list: User[], q: string, f: string) => {
    let r = list;
    if (f !== 'Semua') r = r.filter((u) => u.Peran === f);
    if (q) {
      r = r.filter(
        (u) =>
          u.Nama?.toLowerCase().includes(q.toLowerCase()) ||
          u.Keahlian?.toLowerCase().includes(q.toLowerCase())
      );
    }
    setFiltered(r);
  };

  const onSearch = (txt: string) => {
    setSearch(txt);
    applyFilter(users, txt, filter);
  };

  const onFilter = (f: string) => {
    setFilter(f);
    applyFilter(users, search, f);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // hitung & format jarak untuk ditampilkan di card (null kalau tidak ada GPS)
  const getJarakText = (item: any): string | null => {
    if (myLat === null || myLng === null) return null;
    const itemLat = parseFloat(item.Lokasi_Lat);
    const itemLng = parseFloat(item.Lokasi_Lng);
    if (isNaN(itemLat) || isNaN(itemLng)) return null;
    const jarak = hitungJarakKm(myLat, myLng, itemLat, itemLng);
    if (jarak < 1) return Math.round(jarak * 1000) + ' m';
    return jarak.toFixed(1) + ' km';
  };

  const renderItem = ({ item, index }: { item: User; index: number }) => {
    const peranColor =
      item.Peran === 'Owner' ? '#1565c0' : item.Peran === 'Tukang' ? '#2e7d32' : '#e65100';
    const avatarSource = item.Foto
      ? { uri: item.Foto }
      : { uri: 'https://img.icons8.com/fluency/96/user-male-circle.png' };
    const jarakText = getJarakText(item);

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <Image source={avatarSource} style={s.avatar} />
          <View style={s.cardTopInfo}>
            <Text style={s.name}>{item.Nama}</Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: peranColor }]}>
                <Text style={s.badgeTxt}>{item.Peran}</Text>
              </View>
              {jarakText && (
                <View style={s.jarakBadge}>
                  <Image source={{ uri: 'https://img.icons8.com/color/96/marker.png' }} style={s.jarakIcon} />
                  <Text style={s.jarakTxt}>{jarakText}</Text>
                </View>
              )}
            </View>
            {item.Keahlian ? <Text style={s.keahlian}>{item.Keahlian}</Text> : null}
            {!jarakText && item.Provinsi ? <Text style={s.lokasiFallback}>📍 {item.Provinsi}</Text> : null}
          </View>
        </View>

        {/* FIX: tombol WhatsApp dihapus total — komunikasi awal wajib lewat Chat
            in-app. Nomor WA tetap tersimpan untuk keperluan internal (verifikasi
            akun/notifikasi), tidak dibagikan terbuka di sini. */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={s.chatBtn}
            onPress={() =>
              router.push({ pathname: '/chat-room', params: { penerima: item.Nama } } as any)
            }
          >
            <Image source={{ uri: 'https://img.icons8.com/fluency/96/speech-bubble.png' }} style={s.btnIcon} />
            <Text style={s.chatTxt}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.ajakBtn}
            onPress={() =>
              router.push({ pathname: '/create-contract', params: { penerima: item.Nama } } as any)
            }
          >
            <Image source={{ uri: 'https://img.icons8.com/fluency/96/handshake.png' }} style={s.btnIcon} />
            <Text style={s.ajakTxt}>Ajak Kerja</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={s.flexFull}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>Cari Tukang & Mitra</Text>
          <View style={s.searchBox}>
            <Image source={{ uri: 'https://img.icons8.com/fluency/96/search.png' }} style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Cari nama atau keahlian..."
              value={search}
              onChangeText={onSearch}
              placeholderTextColor="#aaa"
            />
          </View>
          {myLat !== null && (
            <Text style={s.gpsInfo}>📍 Diurutkan dari yang terdekat dengan lokasimu</Text>
          )}
        </View>

        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f ? s.filterActive : null]}
              onPress={() => onFilter(f)}
            >
              <Text style={[s.filterTxt, filter === f ? s.filterActiveTxt : null]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item, index) => (item.User_ID ? String(item.User_ID) : 'user-' + index)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Image source={{ uri: 'https://img.icons8.com/fluency/96/worker-male.png' }} style={s.emptyIcon} />
              <Text style={s.emptyText}>Tidak ada hasil</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  flexFull: { flex: 1 },
  header: {
    backgroundColor: '#0d47a1',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  searchBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { width: 18, height: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  gpsInfo: { color: '#FFC400', fontSize: 11, fontWeight: '600', marginTop: 8 },

  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterActive: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  filterTxt: { fontSize: 13, fontWeight: '700', color: '#555' },
  filterActiveTxt: { color: '#fff' },

  listContent: { padding: 12, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  cardTopInfo: { flex: 1, marginLeft: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0' },
  name: { fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { color: '#fff', fontWeight: '700', fontSize: 11 },
  jarakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  jarakIcon: { width: 11, height: 11, marginRight: 3 },
  jarakTxt: { color: '#f57f17', fontWeight: '700', fontSize: 10 },
  keahlian: { color: '#666', fontSize: 12 },
  lokasiFallback: { color: '#999', fontSize: 11, marginTop: 2 },

  btnRow: { flexDirection: 'row', gap: 6 },
  btnIcon: { width: 16, height: 16, marginRight: 4 },
  chatBtn: { flex: 1, backgroundColor: '#e3f2fd', borderRadius: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chatTxt: { color: '#1565c0', fontWeight: '700', fontSize: 12 },
  ajakBtn: { flex: 1, backgroundColor: '#fff8e1', borderRadius: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ajakTxt: { color: '#f57f17', fontWeight: '700', fontSize: 12 },

  emptyBox: { alignItems: 'center', padding: 60 },
  emptyIcon: { width: 64, height: 64, opacity: 0.3, marginBottom: 12 },
  emptyText: { color: '#999', fontSize: 15 },
});