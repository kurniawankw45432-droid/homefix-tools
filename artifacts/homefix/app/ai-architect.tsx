import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Share, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fromByteArray } from 'base64-js';

const { width } = Dimensions.get('window');

// -----------------------------------------------------------------------
// Konfigurasi OpenRouter (teks AI)
// PENTING: API key TIDAK ditulis langsung di kode. Ambil dari environment
// variable supaya tidak ketahuan/tertanam di repository (GitHub akan
// memblokir push jika ada secret yang tertulis langsung di kode).
// Tambahkan di file .env (jangan di-commit ke git):
//   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
// -----------------------------------------------------------------------
const OR_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const OR_MODEL   = 'openrouter/free';
const OR_URL     = 'https://openrouter.ai/api/v1/chat/completions';

const ICON_PNG = {
  back:      'https://img.icons8.com/ios-filled/50/ffffff/left.png',
  ai:        'https://img.icons8.com/fluency/96/artificial-intelligence.png',
  estimator: 'https://img.icons8.com/fluency/96/calculator.png',
  material:  'https://img.icons8.com/fluency/96/bricks.png',
  konsultan: 'https://img.icons8.com/fluency/96/maintenance.png',
  rab:       'https://img.icons8.com/fluency/96/financial-analytics.png',
  desain:    'https://img.icons8.com/fluency/96/design.png',
  send:      'https://img.icons8.com/fluency/96/sent.png',
  share:     'https://img.icons8.com/fluency/96/share--v1.png',
  bot:       'https://img.icons8.com/fluency/96/robot-vacuum.png',
};

// -----------------------------------------------------------------------
// Definisi fitur - 5 tab
// -----------------------------------------------------------------------
type FiturId = 'estimator' | 'material' | 'konsultan' | 'rab' | 'desain';

interface FiturDef {
  id: FiturId;
  label: string;
  icon: string;
  warna: string;
  placeholder: string;
  systemPrompt?: string;
  contoh: string[];
}

const FITUR: FiturDef[] = [
  {
    id: 'estimator',
    label: 'Estimator',
    icon: ICON_PNG.estimator,
    warna: '#1565c0',
    placeholder: 'Deskripsikan pekerjaan yang mau dikerjakan...\nContoh: Pasang keramik 30x30 luas 20m2 kamar mandi',
    systemPrompt: `Kamu adalah estimator bangunan profesional Indonesia. 
Dari deskripsi pekerjaan yang diberikan, buat estimasi yang rapi dan mudah dipahami.
Gunakan format teks biasa yang mudah dibaca, bukan kode atau tabel rumit.
Tulis dengan paragraf dan poin-poin sederhana.

Struktur jawaban:
ESTIMASI PEKERJAAN: [nama pekerjaan]

Biaya:
- Upah tenaga: Rp [angka]
- Material: Rp [angka]  
- Total estimasi: Rp [angka]

Durasi: [X hari / X minggu]

Tenaga kerja: [X tukang, X kenek]

Catatan penting:
[catatan asumsi yang dipakai]

Gunakan harga pasar Indonesia saat ini. Jawab singkat dan mudah dimengerti awam.`,
    contoh: [
      'Pasang keramik 60x60 ruang tamu 25m2',
      'Plester dan acian dinding 50m2',
      'Pasang bata ringan partisi 3x4 meter',
      'Cat ulang eksterior rumah tipe 45',
    ],
  },
  {
    id: 'material',
    label: 'Material',
    icon: ICON_PNG.material,
    warna: '#2e7d32',
    placeholder: 'Deskripsikan pekerjaan untuk dihitung kebutuhan materialnya...\nContoh: Pasang keramik 40x40 kamar tidur 12m2',
    systemPrompt: `Kamu adalah quantity surveyor bangunan profesional Indonesia.
Dari deskripsi pekerjaan, hitung kebutuhan material secara detail dan akurat.
Tulis dengan format mudah dibaca, hindari tabel ASCII yang rumit.

Struktur jawaban:
KEBUTUHAN MATERIAL: [nama pekerjaan]
Luas/Volume: [ukuran]

Daftar Material:
1. [nama material] - [jumlah] [satuan] - Rp [harga satuan] = Rp [total]
2. [nama material] - [jumlah] [satuan] - Rp [harga satuan] = Rp [total]
(dan seterusnya)

Total Material: Rp [angka]

Catatan:
- [asumsi penting]
- Tambahkan 10% untuk susut/cadangan

Gunakan harga material standar Indonesia saat ini.`,
    contoh: [
      'Pasang keramik 40x40 kamar tidur 12m2',
      'Plester acian dinding 1 kamar 3x4 meter tinggi 3m',
      'Pasang plafon gypsum ruang tamu 5x6 meter',
      'Cor lantai kerja 10cm tebal 20m2',
    ],
  },
  {
    id: 'konsultan',
    label: 'Konsultan',
    icon: ICON_PNG.konsultan,
    warna: '#e65100',
    placeholder: 'Ceritakan masalah teknis bangunan yang kamu hadapi...\nContoh: Dinding kamar mandi rembes air, cat menggelembung',
    systemPrompt: `Kamu adalah konsultan teknis bangunan profesional Indonesia dengan pengalaman 20 tahun.
Diagnosa masalah teknis bangunan dan berikan solusi praktis yang bisa langsung dikerjakan.
Tulis dengan bahasa yang mudah dimengerti pemilik rumah dan tukang.

Struktur jawaban:
DIAGNOSA: [nama masalah]

Penyebab utama:
1. [penyebab 1]
2. [penyebab 2]

Solusi yang disarankan:
[Penjelasan solusi terbaik dalam 2-3 kalimat]

Langkah perbaikan:
1. [langkah 1]
2. [langkah 2]
3. [dst]

Estimasi biaya perbaikan:
- Ringan: Rp [angka]
- Sedang: Rp [angka]
- Berat: Rp [angka]

Tips pencegahan:
[tips singkat agar tidak terulang]`,
    contoh: [
      'Dinding retak rambut di sudut ruangan',
      'Lantai keramik terangkat sendiri',
      'Atap bocor waktu hujan deras di sudut',
      'Cat tembok luar mengelupas dan jamur',
    ],
  },
  {
    id: 'rab',
    label: 'AI RAB',
    icon: ICON_PNG.rab,
    warna: '#6a1b9a',
    placeholder: 'Deskripsikan proyek untuk dibuatkan RAB-nya...\nContoh: Renovasi kamar mandi 2x2 meter, ganti keramik, plafon, dan cat',
    systemPrompt: `Kamu adalah estimator RAB (Rencana Anggaran Biaya) profesional Indonesia.
Dari deskripsi proyek, buat RAB lengkap dan terstruktur.
Tulis dengan format mudah dibaca, hindari tabel ASCII yang berantakan di layar HP.

Struktur jawaban:
RENCANA ANGGARAN BIAYA (RAB)
Proyek: [nama proyek]
Tanggal: [tanggal]

A. PEKERJAAN PERSIAPAN
1. [nama pekerjaan] - [volume] [satuan] x Rp [harga] = Rp [total]

B. PEKERJAAN UTAMA  
1. [nama pekerjaan] - [volume] [satuan] x Rp [harga] = Rp [total]
2. (dst)

C. PEKERJAAN FINISHING
1. [nama pekerjaan] - [volume] [satuan] x Rp [harga] = Rp [total]

REKAPITULASI
A. Pekerjaan Persiapan : Rp [angka]
B. Pekerjaan Utama    : Rp [angka]
C. Pekerjaan Finishing : Rp [angka]
Total RAB             : Rp [angka]
PPN 11%               : Rp [angka]
TOTAL + PPN           : Rp [angka]

Catatan: [asumsi penting]

Gunakan harga standar Indonesia saat ini.`,
    contoh: [
      'Renovasi kamar mandi 2x2 meter total',
      'Bangun teras depan 3x4 meter atap kanopi',
      'Renovasi dapur pasang kitchen set dan keramik',
      'Perbaikan atap bocor rumah tipe 36',
    ],
  },
  {
    id: 'desain',
    label: 'AI Desain',
    icon: ICON_PNG.desain,
    warna: '#00838f',
    placeholder: 'Deskripsikan bangunan yang ingin digambar...\nContoh: Rumah minimalis modern 2 lantai cat putih dengan carport',
    contoh: [
      'Villa tropis 2 lantai kolam renang',
      'Rumah minimalis modern cat putih',
      'Ruko 3 lantai fasad industrial',
      'Dapur modern kitchen set putih',
    ],
  },
];

// -----------------------------------------------------------------------
// Pollinations image generator
// -----------------------------------------------------------------------
const BUMBU = 'realistic rendering, high quality, sharp focus, detailed, architectural visualization';

const fetchPollinations = async (promptText: string): Promise<string> => {
  const fullPrompt = promptText.trim() + ', ' + BUMBU;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  const url =
    'https://image.pollinations.ai/prompt/' + encoded +
    '?width=1024&height=1024&model=flux&nologo=true&seed=' + seed;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Pollinations ' + res.status);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const base64 = fromByteArray(bytes);
  return 'data:image/jpeg;base64,' + base64;
};

// -----------------------------------------------------------------------
// OpenRouter teks AI
// -----------------------------------------------------------------------
const tanyaAI = async (systemPrompt: string, userInput: string): Promise<string> => {
  if (!OR_API_KEY) {
    throw new Error('API key belum diatur. Tambahkan EXPO_PUBLIC_OPENROUTER_API_KEY di file .env');
  }
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OR_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://homefix.app',
      'X-Title': 'HomeFix AI',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userInput },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('OpenRouter ' + res.status + ': ' + txt.slice(0, 300));
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respons AI kosong.');
  return content.trim();
};

// -----------------------------------------------------------------------
// Komponen utama
// -----------------------------------------------------------------------
export default function AiArchitectScreen() {
  const router = useRouter();

  const [fiturAktif, setFiturAktif] = useState<FiturId>('estimator');
  const [inputs, setInputs] = useState<Record<FiturId, string>>({
    estimator: '', material: '', konsultan: '', rab: '', desain: '',
  });
  const [hasil, setHasil] = useState<Record<FiturId, string>>({
    estimator: '', material: '', konsultan: '', rab: '', desain: '',
  });
  const [gambarUri, setGambarUri] = useState('');
  const [loading, setLoading] = useState<Record<FiturId, boolean>>({
    estimator: false, material: false, konsultan: false, rab: false, desain: false,
  });

  const fitur        = FITUR.find(f => f.id === fiturAktif)!;
  const inputSaatIni  = inputs[fiturAktif];
  const hasilSaatIni  = hasil[fiturAktif];
  const loadingSaatIni = loading[fiturAktif];
  const isDesain      = fiturAktif === 'desain';

  const setInput = (v: string) => setInputs(prev => ({ ...prev, [fiturAktif]: v }));

  const kirim = async () => {
    if (!inputSaatIni.trim()) {
      Alert.alert('Kosong', 'Tulis deskripsi dulu ya.');
      return;
    }
    setLoading(prev => ({ ...prev, [fiturAktif]: true }));
    setHasil(prev => ({ ...prev, [fiturAktif]: '' }));
    setGambarUri('');

    try {
      if (isDesain) {
        const uri = await fetchPollinations(inputSaatIni.trim());
        setGambarUri(uri);
      } else {
        const jawaban = await tanyaAI(fitur.systemPrompt!, inputSaatIni.trim());
        setHasil(prev => ({ ...prev, [fiturAktif]: jawaban }));
      }
    } catch (e: any) {
      Alert.alert('Gagal', 'AI tidak bisa dihubungi saat ini.\n\n' + (e?.message || 'Coba lagi.'));
    } finally {
      setLoading(prev => ({ ...prev, [fiturAktif]: false }));
    }
  };

  const bagikan = async () => {
    try {
      if (isDesain && gambarUri) {
        await Share.share({ message: 'Desain bangunan dari HomeFix AI!\n\nPrompt: ' + inputSaatIni });
      } else if (hasilSaatIni) {
        await Share.share({
          message: fitur.label + '\n\nInput:\n' + inputSaatIni + '\n\nHasil:\n' + hasilSaatIni + '\n\n- HomeFix AI',
        });
      }
    } catch (_) {}
  };

  const reset = () => {
    setHasil(prev => ({ ...prev, [fiturAktif]: '' }));
    setGambarUri('');
    setInput('');
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.headerTitle}>HF AI</Text>
          <Text style={s.headerSub}>Asisten AI Konstruksi & Bangunan</Text>
        </View>
        <Image source={{ uri: ICON_PNG.ai }} style={{ width: 34, height: 34 }} />
      </View>

      {/* Tab menu COMPACT */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {FITUR.map(f => {
            const aktif = fiturAktif === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.tab, aktif && { backgroundColor: f.warna, borderColor: f.warna }]}
                onPress={() => setFiturAktif(f.id)}
              >
                <Image source={{ uri: f.icon }} style={s.tabIcon} />
                <Text style={[s.tabText, aktif && s.tabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contoh cepat */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {fitur.contoh.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.chipContoh, { borderColor: fitur.warna }]}
                  onPress={() => setInput(c)}
                >
                  <Text style={[s.chipContohText, { color: fitur.warna }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Input */}
          <View style={s.inputCard}>
            <TextInput
              style={s.inputBox}
              placeholder={fitur.placeholder}
              placeholderTextColor="#aaa"
              value={inputSaatIni}
              onChangeText={setInput}
              multiline
              editable={!loadingSaatIni}
            />
            <TouchableOpacity
              style={[s.btnKirim, { backgroundColor: fitur.warna }, (loadingSaatIni || !inputSaatIni.trim()) && s.btnDisabled]}
              onPress={kirim}
              disabled={loadingSaatIni || !inputSaatIni.trim()}
            >
              {loadingSaatIni ? (
                <>
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.btnKirimText}>
                    {isDesain ? 'Sedang render gambar...' : 'AI sedang menganalisis...'}
                  </Text>
                </>
              ) : (
                <>
                  <Image source={{ uri: ICON_PNG.send }} style={{ width: 18, height: 18, marginRight: 8 }} />
                  <Text style={s.btnKirimText}>
                    {isDesain ? 'RENDER DESAIN' : 'TANYA AI SEKARANG'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Hasil teks AI */}
          {hasilSaatIni !== '' && !loadingSaatIni && !isDesain && (
            <View style={s.hasilCard}>
              <View style={[s.hasilHeader, { backgroundColor: fitur.warna }]}>
                <Image source={{ uri: fitur.icon }} style={{ width: 18, height: 18, marginRight: 8 }} />
                <Text style={s.hasilHeaderText}>Hasil {fitur.label}</Text>
              </View>
              <View style={s.hasilBody}>
                <Text style={s.hasilTeks} selectable>{hasilSaatIni}</Text>
              </View>
              <View style={s.hasilActions}>
                <TouchableOpacity style={[s.btnAksi, { borderColor: fitur.warna }]} onPress={bagikan}>
                  <Image source={{ uri: ICON_PNG.share }} style={{ width: 15, height: 15, marginRight: 6 }} />
                  <Text style={[s.btnAksiText, { color: fitur.warna }]}>Bagikan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnAksi, { borderColor: '#ccc' }]} onPress={reset}>
                  <Text style={[s.btnAksiText, { color: '#888' }]}>Hapus & Ulangi</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hasil gambar AI Desain */}
          {isDesain && gambarUri !== '' && !loadingSaatIni && (
            <View style={s.hasilCard}>
              <View style={[s.hasilHeader, { backgroundColor: fitur.warna }]}>
                <Image source={{ uri: fitur.icon }} style={{ width: 18, height: 18, marginRight: 8 }} />
                <Text style={s.hasilHeaderText}>Hasil AI Desain</Text>
              </View>
              <Image
                source={{ uri: gambarUri }}
                style={s.gambarHasil}
                resizeMode="cover"
              />
              <View style={s.hasilActions}>
                <TouchableOpacity style={[s.btnAksi, { borderColor: fitur.warna }]} onPress={bagikan}>
                  <Image source={{ uri: ICON_PNG.share }} style={{ width: 15, height: 15, marginRight: 6 }} />
                  <Text style={[s.btnAksiText, { color: fitur.warna }]}>Bagikan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnAksi, { borderColor: '#ccc' }]} onPress={reset}>
                  <Text style={[s.btnAksiText, { color: '#888' }]}>Ulangi</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Empty state */}
          {hasilSaatIni === '' && !loadingSaatIni && !(isDesain && gambarUri) && (
            <View style={s.emptyBox}>
              <Image source={{ uri: ICON_PNG.bot }} style={{ width: 44, height: 44, marginBottom: 10, opacity: 0.35 }} />
              <Text style={s.emptyText}>
                {isDesain
                  ? 'Tulis deskripsi bangunan\nlalu tap RENDER DESAIN.'
                  : 'Tulis pertanyaan atau masalah\nlalu tap tombol di atas.'}
              </Text>
              <Text style={s.emptySubText}>Atau pilih contoh cepat di atas.</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 50,
    backgroundColor: '#0d47a1',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub:   { fontSize: 10, color: '#FFC400', fontWeight: 'bold', marginTop: 2 },

  // Tab compact - tinggi kecil, tidak makan layar
  tabBar: { backgroundColor: '#0d47a1', paddingBottom: 12, paddingTop: 4 },
  tabRow: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabIcon:       { width: 15, height: 15, marginRight: 5 },
  tabText:       { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },

  scroll: { padding: 14 },

  chipContoh: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  chipContohText: { fontSize: 11, fontWeight: '600' },

  inputCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 14, marginBottom: 14, elevation: 3,
  },
  inputBox: {
    backgroundColor: '#f5f7fa', borderRadius: 12,
    padding: 13, fontSize: 14, color: '#333',
    borderWidth: 1, borderColor: '#e8ecf0',
    minHeight: 100, textAlignVertical: 'top',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  btnKirim: {
    flexDirection: 'row', borderRadius: 12,
    padding: 14, justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnKirimText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Hasil teks
  hasilCard: {
    backgroundColor: '#fff', borderRadius: 18,
    marginBottom: 14, elevation: 4, overflow: 'hidden',
  },
  hasilHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  hasilHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  hasilBody:       { padding: 16 },
  hasilTeks: {
    fontSize: 14,
    color: '#2c2c2c',
    lineHeight: 22,
    // Font sistem yang bersih, seperti Arial/Calibri di HP
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  hasilActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  btnAksi: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5,
  },
  btnAksiText: { fontSize: 12, fontWeight: 'bold' },

  // Gambar desain
  gambarHasil: {
    width: '100%', height: width - 60,
  },

  emptyBox: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 36, alignItems: 'center', elevation: 1,
  },
  emptyText:    { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  emptySubText: { fontSize: 11, color: '#ccc', marginTop: 6 },
});