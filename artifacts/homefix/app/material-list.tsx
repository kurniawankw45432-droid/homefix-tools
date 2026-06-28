import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back: 'https://img.icons8.com/ios-filled/50/0d47a1/left.png',
  search: 'https://img.icons8.com/color/96/search--v1.png',
  truck: 'https://img.icons8.com/color/96/truck.png',
  map: 'https://img.icons8.com/color/96/marker.png',
  store: 'https://img.icons8.com/color/96/shop.png',
  arrow: 'https://img.icons8.com/ios-glyphs/60/999999/forward.png',
};

interface Toko {
  User_ID: string;
  Nama: string;
  Peran: string;
  Keahlian: string;
  Foto: string;
  Koordinat_GPS: string;
  distance?: number;
}

export default function MaterialListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [search, setSearch] = useState('');

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const ambilToko = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      let myLat = 0;
      let myLon = 0;

      if (session) {
        const u = JSON.parse(session);
        const coords = (u.Koordinat_GPS || '0,0').split(',');
        myLat = parseFloat(coords[0]);
        myLon = parseFloat(coords[1]);
      }

      const res = await fetch(BASE_URL + '?sheet=Pengguna');
      const data = await res.json();

      if (Array.isArray(data)) {
        const list = data
          .filter((t: Toko) => t.Peran === 'Toko' || t.Peran === 'Material')
          .map((t: Toko) => {
            const tCoords = (t.Koordinat_GPS || '0,0').split(',');
            const tLat = parseFloat(tCoords[0]);
            const tLon = parseFloat(tCoords[1]);
            const dist = calculateDistance(myLat, myLon, tLat, tLon);
            return { ...t, distance: dist };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setTokos(list);
      }
    } catch (e) {
      console.log('Store Radar Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    ambilToko();
  }, []);

  const filtered = tokos.filter(
    (t) =>
      (t.Nama || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.Keahlian || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item, index }: { item: Toko; index: number }) => {
    const avatarSource = item.Foto ? { uri: item.Foto } : { uri: ICON_PNG.truck };
    const distText = (item.distance ? item.distance.toFixed(1) : '0.0') + ' KM dari lokasi lo';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/view-profile', params: { userName: item.Nama } } as any)}
      >
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.Nama}</Text>
          <Text style={styles.skill} numberOfLines={1}>
            {item.Keahlian || 'Menyediakan Bahan Bangunan'}
          </Text>
          <View style={styles.distRow}>
            <Image source={{ uri: ICON_PNG.map }} style={styles.iconMap} />
            <Text style={styles.distText}>{distText}</Text>
          </View>
        </View>
        <Image source={{ uri: ICON_PNG.arrow }} style={styles.iconArrow} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flexFull}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Image source={{ uri: ICON_PNG.back }} style={styles.iconBack} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Marketplace Material</Text>
            <Text style={styles.subtitle}>Cari toko & logistik terdekat</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Image source={{ uri: ICON_PNG.search }} style={styles.iconSearch} />
            <TextInput
              style={styles.input}
              placeholder="Cari Semen, Pasir, Alat Teknik..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0d47a1" size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => (item.User_ID ? String(item.User_ID) : 'toko-' + index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  ambilToko();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Image source={{ uri: ICON_PNG.store }} style={styles.iconEmpty} />
                <Text style={styles.emptyText}>Belum ada toko material di sekitar lo.</Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  flexFull: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  backBtn: { marginRight: 15 },
  iconBack: { width: 24, height: 24 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  subtitle: { fontSize: 11, color: '#999' },

  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7f9',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
  },
  iconSearch: { width: 20, height: 20 },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },

  listContent: { padding: 20, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  avatar: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#f0f2f5' },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  skill: { fontSize: 12, color: '#666', marginVertical: 3 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  iconMap: { width: 12, height: 12 },
  distText: { fontSize: 11, color: '#0d47a1', marginLeft: 5, fontWeight: 'bold' },
  iconArrow: { width: 15, height: 15, opacity: 0.2 },

  empty: { alignItems: 'center', marginTop: 100 },
  iconEmpty: { width: 80, height: 80, opacity: 0.2, marginBottom: 15 },
  emptyText: { color: '#999', fontSize: 14, fontWeight: '500' },
});