import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '../../utils/types';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('user_hf').then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      else router.replace('/welcome');
    });
  }, []));

  const logout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('user_hf');
          router.replace('/welcome');
        }
      },
    ]);
  };

  if (!user) return null;

  const peranColor = user.Peran === 'Owner' ? '#1565c0' : user.Peran === 'Tukang' ? '#2e7d32' : '#e65100';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>KTA Digital</Text>
        <Text style={s.headerSub}>HomeFix Member Card</Text>
      </View>

      {/* KTA Card */}
      <View style={s.kta}>
        {/* Top bar */}
        <View style={s.ktaTop}>
          <Image source={{ uri: 'https://i.imgur.com/j1Kh0kR.png' }} style={s.ktaLogo} resizeMode="contain" />
          <View>
            <Text style={s.ktaTitle}>HomeFix</Text>
            <Text style={s.ktaSubtitle}>Member ID Card</Text>
          </View>
          <Image source={{ uri: 'https://img.icons8.com/fluency/96/chip-card.png' }} style={{ width: 36, height: 36 }} />
        </View>

        {/* Photo & Name */}
        <View style={s.ktaBody}>
          <View style={s.photoWrapper}>
            {user.Foto ? (
              <Image source={{ uri: user.Foto }} style={s.ktaPhoto} />
            ) : (
              <Image source={{ uri: 'https://img.icons8.com/fluency/96/user-male-circle.png' }} style={s.ktaPhoto} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={s.ktaName}>{user.Nama}</Text>
            <View style={[s.roleBadge, { backgroundColor: peranColor }]}>
              <Text style={s.roleBadgeTxt}>{user.Peran}</Text>
            </View>
            <View style={s.ktaRow}>
              <Image source={{ uri: 'https://img.icons8.com/fluency/96/phone.png' }} style={s.rowIcon} />
              <Text style={s.ktaInfo}>{user.WhatsApp || '-'}</Text>
            </View>
            <View style={s.ktaRow}>
              <Image source={{ uri: 'https://img.icons8.com/fluency/96/id-card.png' }} style={s.rowIcon} />
              <Text style={s.ktaInfo}>{user.NIK || 'Belum diisi'}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.ktaFooter}>
          <View style={s.ktaRow}>
            <Image source={{ uri: 'https://img.icons8.com/fluency/96/map-marker.png' }} style={s.rowIcon} />
            <Text style={s.ktaFooterTxt} numberOfLines={2}>{user.Alamat_KTP || 'Alamat belum diisi'}</Text>
          </View>
          <Text style={s.ktaNo}>No. KTA: {user.No_KTA || user.User_ID}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={s.btnGroup}>
        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/edit-profile')}>
          <Image source={{ uri: 'https://img.icons8.com/fluency/96/edit.png' }} style={{ width: 20, height: 20, marginRight: 8 }} />
          <Text style={s.btnPrimaryTxt}>SEMPURNAKAN DATA KTA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnHistory} onPress={() => router.push('/history')}>
          <Image source={{ uri: 'https://img.icons8.com/fluency/96/wallet.png' }} style={{ width: 20, height: 20, marginRight: 8 }} />
          <Text style={s.btnHistoryTxt}>Dompet: Rp {parseInt(user.Saldo_Dompet || '0').toLocaleString('id-ID')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnLogout} onPress={logout}>
          <Image source={{ uri: 'https://img.icons8.com/fluency/96/exit.png' }} style={{ width: 20, height: 20, marginRight: 8 }} />
          <Text style={s.btnLogoutTxt}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { backgroundColor: '#0d47a1', paddingTop: 55, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  kta: { margin: 16, backgroundColor: '#0d47a1', borderRadius: 20, padding: 16, elevation: 8, shadowColor: '#0d47a1', shadowOpacity: 0.4, shadowRadius: 12 },
  ktaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 12 },
  ktaLogo: { width: 40, height: 40 },
  ktaTitle: { color: '#FFC400', fontWeight: '900', fontSize: 16 },
  ktaSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  ktaBody: { flexDirection: 'row', marginBottom: 16 },
  photoWrapper: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFC400', overflow: 'hidden' },
  ktaPhoto: { width: 90, height: 90 },
  ktaName: { color: '#fff', fontWeight: '900', fontSize: 18, marginBottom: 6 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  roleBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  ktaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  rowIcon: { width: 14, height: 14 },
  ktaInfo: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1 },
  ktaFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 12 },
  ktaFooterTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },
  ktaNo: { color: '#FFC400', fontWeight: '700', fontSize: 12, marginTop: 6 },
  btnGroup: { paddingHorizontal: 16, gap: 10 },
  btnPrimary: { backgroundColor: '#FFC400', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnPrimaryTxt: { fontWeight: '900', fontSize: 14, color: '#1a1a1a', letterSpacing: 0.5 },
  btnHistory: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0d47a1' },
  btnHistoryTxt: { fontWeight: '800', fontSize: 14, color: '#0d47a1' },
  btnLogout: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e53935', marginBottom: 20 },
  btnLogoutTxt: { fontWeight: '800', fontSize: 14, color: '#e53935' },
});
