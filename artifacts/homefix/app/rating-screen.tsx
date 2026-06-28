import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Image,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BASE_URL } from '../constants';

const ICON = {
  back:      "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  starFull:  "https://img.icons8.com/color/96/star--v1.png",
  starEmpty: "https://img.icons8.com/ios/96/cccccc/star--v1.png",
  done:      "https://img.icons8.com/color/96/checked--v1.png",
};

export default function RatingScreen() {
  const router = useRouter();
  const { kontrak_id, dari, untuk } = useLocalSearchParams();

  const [bintang, setBintang] = useState(0);
  const [ulasan, setUlasan]   = useState('');
  const [proc, setProc]       = useState(false);

  const handleKirim = async () => {
    if (bintang === 0) {
      Alert.alert('Pilih Rating', 'Tap bintang untuk memberi nilai dulu ya.');
      return;
    }
    setProc(true);
    try {
      const res = await fetch(BASE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahRating',
          data: {
            Rating_ID:  'RTG-' + Date.now(),
            Kontrak_ID: kontrak_id,
            Dari:       dari,
            Untuk:      untuk,
            Bintang:    bintang,
            Ulasan:     ulasan.trim(),
          }
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        Alert.alert('✅ Terima Kasih!', 'Rating kamu sudah tersimpan permanen.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Info', result.error || 'Gagal mengirim rating.');
      }
    } catch {
      Alert.alert('Gagal', 'Koneksi error. Coba lagi.');
    } finally {
      setProc(false);
    }
  };

  const labelBintang = (n: number) => {
    const labels: any = { 1: 'Sangat Kurang', 2: 'Kurang', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' };
    return labels[n] || '';
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Beri Rating</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.infoBox}>
            <Image source={{ uri: ICON.done }} style={{ width: 28, height: 28 }} />
            <Text style={s.infoText}>
              Bagaimana pengalaman kerjasamamu dengan{'\n'}
              <Text style={s.infoNama}>{untuk}</Text>?
            </Text>
          </View>

          <View style={s.starCard}>
            <View style={s.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setBintang(n)}>
                  <Image
                    source={{ uri: n <= bintang ? ICON.starFull : ICON.starEmpty }}
                    style={s.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {bintang > 0 && (
              <Text style={s.starLabel}>{labelBintang(bintang)}</Text>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.label}>TULIS ULASAN (Opsional)</Text>
            <TextInput
              style={s.textArea}
              value={ulasan}
              onChangeText={setUlasan}
              placeholder="Ceritakan pengalaman kerjasamamu..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={s.note}>
              ⚠️ Rating & ulasan bersifat permanen dan tidak bisa dihapus atau diubah, demi menjaga kepercayaan komunitas HomeFix.
            </Text>
          </View>

          <TouchableOpacity style={s.btnKirim} onPress={handleKirim} disabled={proc}>
            {proc
              ? <ActivityIndicator color="#0d47a1" />
              : <Text style={s.btnKirimText}>KIRIM RATING</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f7fa' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 3 },
  headerTitle:  { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
  scroll:       { padding: 20 },

  infoBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 16, borderRadius: 16, marginBottom: 20 },
  infoText:     { flex: 1, marginLeft: 12, fontSize: 13, color: '#0d47a1', lineHeight: 19 },
  infoNama:     { fontWeight: 'bold', fontSize: 15 },

  starCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 4, marginBottom: 16 },
  starRow:      { flexDirection: 'row', gap: 8 },
  starIcon:     { width: 48, height: 48 },
  starLabel:    { marginTop: 12, fontSize: 14, fontWeight: 'bold', color: '#FFC400' },

  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 4 },
  label:        { fontSize: 11, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8, letterSpacing: 0.5 },
  textArea:     { backgroundColor: '#f5f7f9', borderRadius: 14, padding: 14, fontSize: 14, color: '#333', height: 120, borderWidth: 1, borderColor: '#eee' },
  note:         { fontSize: 10, color: '#999', lineHeight: 15, marginTop: 12, fontStyle: 'italic' },

  btnKirim:     { backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 25, elevation: 5 },
  btnKirimText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
});