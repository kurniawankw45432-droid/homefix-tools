import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, ScrollView, Alert, Dimensions 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

const { width } = Dimensions.get('window');

const ICON_PNG = {
  back:     "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  chat:     "https://img.icons8.com/color/96/speech-bubble-with-dots.png",
  verified: "https://img.icons8.com/color/96/verified-badge.png",
  star:     "https://img.icons8.com/color/96/star--v1.png",
  wa:       "https://img.icons8.com/color/96/whatsapp.png",
  map:      "https://img.icons8.com/color/96/marker.png",
  worker:   "https://img.icons8.com/color/96/worker-male--v1.png"
};

export default function ViewProfileScreen() {
  const router = useRouter();
  const { nama } = useLocalSearchParams();
  const [targetUser, setTargetUser] = useState<any>(null);
  const [myUser, setMyUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = await AsyncStorage.getItem('user_hf');
        if (session) setMyUser(JSON.parse(session));

        const res = await fetch(`${BASE_URL}?sheet=Pengguna`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(u => u.Nama === nama);
          setTargetUser(found);
        }
      } catch (e) {
        console.log("Error load profile");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [nama]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0d47a1" /></View>
  );

  const isMilikSendiri = myUser?.Nama === targetUser?.Nama;
  const waDisplay = isMilikSendiri ? targetUser?.WhatsApp : "08xx-xxxx-xxxx (Tersembunyi)";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Anggota</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: targetUser?.Foto || "https://i.pravatar.cc/300" }} style={styles.avatar} />
            <View style={styles.badgePos}>
              <Image source={{ uri: ICON_PNG.verified }} style={{ width: 30, height: 30 }} />
            </View>
          </View>

          <Text style={styles.name}>{targetUser?.Nama || 'User HomeFix'}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>{targetUser?.Peran?.toUpperCase() || 'MITRA'}</Text>
          </View>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Image key={i} source={{ uri: ICON_PNG.star }} style={{ width: 18, height: 18 }} />
            ))}
            <Text style={styles.ratingText}>(5.0)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Image source={{ uri: ICON_PNG.worker }} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>KEAHLIAN</Text>
                <Text style={styles.infoVal}>{targetUser?.Keahlian || 'Umum'}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Image source={{ uri: ICON_PNG.wa }} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>WHATSAPP</Text>
                <Text style={[styles.infoVal, !isMilikSendiri && { color: '#888', fontStyle: 'italic' }]}>{waDisplay}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Image source={{ uri: ICON_PNG.map }} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>DOMISILI</Text>
                <Text style={styles.infoVal}>{targetUser?.Alamat_Domisili || '-'}</Text>
              </View>
            </View>
          </View>

          {/* FIX: Hapus <Link asChild> — langsung pakai router.push di onPress */}
          {!isMilikSendiri && targetUser && (
            <TouchableOpacity
              style={styles.btnChat}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/chat-room', params: { penerima: targetUser.Nama } } as any)}
            >
              <Image source={{ uri: ICON_PNG.chat }} style={{ width: 24, height: 24, marginRight: 10 }} />
              <Text style={styles.btnChatText}>JAPRI / CHAT SEKARANG</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>HomeFix Professional ID</Text>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f7fa' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backBtn:     { padding: 5 },
  scroll:      { padding: 20 },
  profileCard: { backgroundColor: '#fff', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  avatarWrapper: { marginBottom: 15 },
  avatar:      { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFC400', backgroundColor: '#eee' },
  badgePos:    { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 15 },
  name:        { fontSize: 22, fontWeight: 'bold', color: '#1a1a1e', textAlign: 'center' },
  roleTag:     { backgroundColor: '#e3f2fd', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginTop: 8 },
  roleText:    { fontSize: 11, fontWeight: 'bold', color: '#0d47a1' },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ratingText:  { marginLeft: 8, fontSize: 12, color: '#666', fontWeight: 'bold' },
  divider:     { height: 1, backgroundColor: '#f0f0f0', width: '100%', marginVertical: 25 },
  infoList:    { width: '100%', gap: 20 },
  infoItem:    { flexDirection: 'row', alignItems: 'center' },
  infoIcon:    { width: 35, height: 35, marginRight: 15 },
  infoLabel:   { fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 1 },
  infoVal:     { fontSize: 14, color: '#333', fontWeight: '600' },
  btnChat:     { backgroundColor: '#0d47a1', width: '100%', padding: 18, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, elevation: 5 },
  btnChatText: { color: '#FFC400', fontWeight: 'bold', fontSize: 15 },
  footer:      { marginTop: 30, alignItems: 'center' },
  footerText:  { fontSize: 10, color: '#cccccc' },
});