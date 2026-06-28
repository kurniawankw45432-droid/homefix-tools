import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, Image, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, Dimensions, Keyboard,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const ICON_PNG = {
  back:     "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  atap:     "https://img.icons8.com/color/96/roofing.png",
  dinding:  "https://img.icons8.com/color/96/brick-wall.png",
  pondasi:  "https://img.icons8.com/color/96/trowel.png",
  lantai:   "https://img.icons8.com/color/96/ceramic-tiles.png",
  besi:     "https://img.icons8.com/color/96/steel-i-beam.png",
  plafon:   "https://img.icons8.com/color/96/ceiling.png",
  result:   "https://img.icons8.com/color/96/calculator--v1.png",
  check:    "https://img.icons8.com/color/96/checked--v1.png",
  genteng:  "https://img.icons8.com/color/96/roofing.png",
  galvalum: "https://img.icons8.com/color/96/metal.png",
  bata:     "https://img.icons8.com/color/96/brick-wall.png",
  hebel:    "https://img.icons8.com/color/96/cinder-block.png",
  gypsum:   "https://img.icons8.com/color/96/drywall.png",
  pvc:      "https://img.icons8.com/color/96/plastic.png",
  keramik:  "https://img.icons8.com/color/96/floor.png",
  panjang:  "https://img.icons8.com/color/96/ruler.png",
  lebar:    "https://img.icons8.com/color/96/resize-horizontal.png",
  tinggi:   "https://img.icons8.com/color/96/height.png",
  volume:   "https://img.icons8.com/color/96/box.png",
  sni:      "https://img.icons8.com/color/96/certificate.png",
  sudut:    "https://img.icons8.com/color/96/triangle.png",
};

type KategoriType = 'Atap' | 'Dinding' | 'Pondasi' | 'Lantai' | 'Struktur Pembesian' | 'Plafon' | '';
type BentukAtap   = 'pelana' | 'limasan' | 'perisai' | 'datar' | 'sandar';

export default function KalkulatorScreen() {
  const router = useRouter();
  const [tab, setTab]               = useState<'menu' | 'hitung'>('menu');
  const [kategori, setKategori]     = useState<KategoriType>('');
  const [subAtap, setSubAtap]       = useState<'genteng' | 'galvalum'>('genteng');
  const [bentukAtap, setBentukAtap] = useState<BentukAtap>('pelana');
  const [subDinding, setSubDinding] = useState<'merah' | 'hebel'>('merah');
  const [subLantai, setSubLantai]   = useState<'30' | '40' | '60'>('40');
  const [subPlafon, setSubPlafon]   = useState<'gypsum' | 'pvc'>('gypsum');
  const [input1, setInput1]         = useState('');
  const [input2, setInput2]         = useState('');
  const [input3, setInput3]         = useState('');
  const [input4, setInput4]         = useState('');
  const [inputKemiringan, setInputKemiringan] = useState('30');
  const [inputOverstek, setInputOverstek]     = useState('0.5');
  const [jmlBesiUtama, setJmlBesiUtama]       = useState(4);
  const [jarakCincin, setJarakCincin]         = useState(15);
  const [hasil, setHasil]           = useState<any>(null);

  const resetForm = (kat: KategoriType) => {
    setKategori(kat); setTab('hitung'); setHasil(null);
    setInput1(''); setInput2(''); setInput3(''); setInput4('');
  };

  // -----------------------------------------------------------------------
  // Hitung luas bidang atap aktual berdasarkan bentuk & kemiringan
  // -----------------------------------------------------------------------
  const hitungLuasBidangAtap = (
    panjang: number,   // panjang bangunan (m)
    lebar: number,     // lebar bangunan (m)
    kemiringan: number, // derajat
    overstek: number,  // meter
  ): { luasBidang: number; keterangan: string } => {
    const rad = (kemiringan * Math.PI) / 180;
    // panjang miring satu sisi (dari ujung ke puncak)
    const setengahLebar = lebar / 2 + overstek;
    const panjangMiring = setengahLebar / Math.cos(rad);
    const panjangTotal  = panjang + overstek * 2;

    switch (bentukAtap) {
      case 'pelana': {
        // 2 bidang miring x panjang total x panjang miring sisi
        const luasBidang = 2 * panjangTotal * panjangMiring;
        return { luasBidang, keterangan: `Pelana | kemiringan ${kemiringan} derajat | overstek ${overstek}m` };
      }
      case 'limasan': {
        // 4 bidang: 2 trapesium (depan/belakang) + 2 segitiga (sisi)
        const tinggiMiring = setengahLebar / Math.cos(rad);
        const bidangPanjang = 2 * ((panjangTotal + (panjangTotal - lebar)) / 2) * tinggiMiring;
        const bidangSisi    = 2 * (0.5 * (lebar + overstek * 2) * tinggiMiring);
        const luasBidang = bidangPanjang + bidangSisi;
        return { luasBidang, keterangan: `Limasan | kemiringan ${kemiringan} derajat | overstek ${overstek}m` };
      }
      case 'perisai': {
        // Kombinasi: 2 trapesium besar + 2 segitiga ujung
        const tinggiMiring  = setengahLebar / Math.cos(rad);
        const luasTrapesium = 2 * ((panjangTotal + (panjangTotal - lebar)) / 2) * tinggiMiring;
        const luasSegitiga  = 2 * (0.5 * lebar * tinggiMiring);
        const luasBidang = luasTrapesium + luasSegitiga;
        return { luasBidang, keterangan: `Perisai | kemiringan ${kemiringan} derajat | overstek ${overstek}m` };
      }
      case 'datar': {
        // Dak beton - luas datar saja (+ overstek semua sisi)
        const luasBidang = (panjang + overstek * 2) * (lebar + overstek * 2);
        return { luasBidang, keterangan: `Datar/Dak | overstek ${overstek}m` };
      }
      case 'sandar': {
        // 1 bidang miring saja (teras/carport)
        const luasBidang = panjangTotal * panjangMiring;
        return { luasBidang, keterangan: `Sandar | kemiringan ${kemiringan} derajat | overstek ${overstek}m` };
      }
      default:
        return { luasBidang: panjang * lebar, keterangan: '' };
    }
  };

  const hitungMaterial = () => {
    Keyboard.dismiss();
    const P  = parseFloat(input1);
    const L  = parseFloat(input2);
    const T1 = parseFloat(input3);
    const T2 = parseFloat(input4);
    if (!P) return Alert.alert("Waduh", "Isi dulu ukurannya!");
    let data: any = { items: [], sni: '' };
    const luas = P * (L || 0);

    // -----------------------------------------------------------------------
    if (kategori === 'Struktur Pembesian') {
      if (!T1 || !T2) return Alert.alert("Data Cincin", "Isi ukuran sengkang dulu!");
      const totalBesiUtama = P * (1 + Math.floor(P / 12) * 0.2 / P) * jmlBesiUtama;
      const batangUtama    = Math.ceil(totalBesiUtama / 12);
      const jmlCincin      = Math.ceil((P * 100) / jarakCincin) + 2;
      const kelilingCincin = ((T1 * 2) + (T2 * 2) + 10) / 100;
      const batangCincin   = Math.ceil((jmlCincin * kelilingCincin) / 12);
      const bendrat        = (batangUtama + batangCincin) * 0.1;
      data.sni     = 'SNI 07-2052-2002';
      data.summary = `Panjang: ${P}m | ${jmlBesiUtama} Besi Utama | Sengkang @${jarakCincin}cm`;
      data.items   = [
        { icon: ICON_PNG.besi,   nama: "Besi Utama D10/D12 (12m)",  jumlah: batangUtama,        satuan: "Batang" },
        { icon: ICON_PNG.besi,   nama: "Besi Sengkang/Begel (12m)", jumlah: batangCincin,       satuan: "Batang" },
        { icon: ICON_PNG.volume, nama: "Kawat Bendrat",              jumlah: bendrat.toFixed(1), satuan: "Kg"     },
      ];

    // -----------------------------------------------------------------------
    } else if (kategori === 'Plafon') {
      if (!L) return Alert.alert("Waduh", "Isi lebar ruangan!");
      const batangHollow = Math.ceil(luas * 3.5);
      const sekrup       = Math.ceil(luas * 17);
      data.sni     = 'SNI 03-6385-2000';
      data.summary = `Luas Plafon: ${luas.toFixed(2)} m2`;
      if (subPlafon === 'gypsum') {
        // Compound: dihitung dari jumlah sambungan antar board
        // Board ukuran 1.2x2.4m -> per 100m2 ada +-35 lembar -> +-70 sambungan
        // 1 sak 25kg cukup untuk +-20 sambungan -> 100m2 = 70/20 = 3-5 sak
        // Pakai formula: Math.ceil(luas / 20) -> 100m2 = 5 sak OK
        const compound = Math.ceil(luas / 20);
        data.items = [
          { icon: ICON_PNG.gypsum, nama: "Papan Gypsum 9mm (1.2x2.4m)", jumlah: Math.ceil((luas / 2.88) * 1.10), satuan: "Lembar" },
          { icon: ICON_PNG.besi,   nama: "Hollow Rangka 40x40 (4m)",    jumlah: batangHollow,                    satuan: "Batang" },
          { icon: ICON_PNG.check,  nama: "Compound Gypsum (25kg)",       jumlah: compound,                        satuan: "Sak"    },
          { icon: ICON_PNG.check,  nama: "Sekrup Gypsum",                jumlah: sekrup,                          satuan: "Biji"   },
          { icon: ICON_PNG.check,  nama: "Paku Rivet / Fisher",          jumlah: Math.ceil(luas * 2),             satuan: "Biji"   },
        ];
      } else {
        data.items = [
          { icon: ICON_PNG.pvc,   nama: "Panel PVC 20cm (4m)",      jumlah: Math.ceil((luas / 0.8) * 1.05), satuan: "Lembar" },
          { icon: ICON_PNG.besi,  nama: "Hollow Rangka 40x40 (4m)", jumlah: batangHollow,                    satuan: "Batang" },
          { icon: ICON_PNG.check, nama: "List Profil PVC (4m)",     jumlah: Math.ceil((P + L) * 2 / 3.8),   satuan: "Batang" },
          { icon: ICON_PNG.check, nama: "Lem PVC / Sekrup",         jumlah: Math.ceil(luas * 2),             satuan: "Biji"   },
        ];
      }

    // -----------------------------------------------------------------------
    } else if (kategori === 'Atap') {
      if (!L) return Alert.alert("Waduh", "Isi lebar bangunan!");
      const kem = parseFloat(inputKemiringan) || 30;
      const ovs = parseFloat(inputOverstek)   || 0.5;
      const { luasBidang, keterangan } = hitungLuasBidangAtap(P, L, kem, ovs);
      data.sni     = 'SNI 03-2095-1998';
      data.summary = `${keterangan}\nLuas Bidang Atap: ${luasBidang.toFixed(2)} m2`;

      if (subAtap === 'genteng') {
        data.items = [
          { icon: ICON_PNG.genteng, nama: "Genteng Kodok/Morando",    jumlah: Math.ceil(luasBidang * 25 * 1.05), satuan: "Biji"   },
          { icon: ICON_PNG.atap,    nama: "Baja Ringan Kanal C 75mm", jumlah: Math.ceil(luasBidang * 1.2),       satuan: "Batang" },
          { icon: ICON_PNG.atap,    nama: "Reng Baja Ringan 35mm",    jumlah: Math.ceil(luasBidang * 1.4),       satuan: "Batang" },
          { icon: ICON_PNG.check,   nama: "Baut Baja Ringan",         jumlah: Math.ceil(luasBidang * 14),        satuan: "Biji"   },
          { icon: ICON_PNG.check,   nama: "Rabung/Nok Genteng",       jumlah: Math.ceil(P / 0.33),               satuan: "Biji"   },
        ];
      } else {
        data.items = [
          { icon: ICON_PNG.galvalum, nama: "Galvalum/Spandek (4m)",    jumlah: Math.ceil((luasBidang / (4 * 0.80)) * 1.05), satuan: "Lembar" },
          { icon: ICON_PNG.atap,     nama: "Baja Ringan Kanal C 75mm", jumlah: Math.ceil(luasBidang * 1.1),                 satuan: "Batang" },
          { icon: ICON_PNG.check,    nama: "Baut Roofing Karet",       jumlah: Math.ceil(luasBidang * 8),                   satuan: "Biji"   },
          { icon: ICON_PNG.check,    nama: "Lisplang Galvalum (4m)",   jumlah: Math.ceil((P + L) * 2 / 4),                  satuan: "Batang" },
        ];
      }

    // -----------------------------------------------------------------------
    } else if (kategori === 'Dinding') {
      if (!L) return Alert.alert("Waduh", "Isi tinggi dinding!");
      data.summary = `Luas Dinding: ${luas.toFixed(2)} m2`;
      if (subDinding === 'merah') {
        data.sni   = 'SNI 03-6861.1-2002';
        data.items = [
          { icon: ICON_PNG.bata,  nama: "Bata Merah Standar",           jumlah: Math.ceil(luas * 70 * 1.05),   satuan: "Biji" },
          { icon: ICON_PNG.check, nama: "Semen PC 50kg (Pasangan 1:4)", jumlah: Math.ceil(luas * 0.25),        satuan: "Sak"  },
          { icon: ICON_PNG.check, nama: "Pasir Pasang",                  jumlah: (luas * 0.04).toFixed(2),      satuan: "m3"   },
          { icon: ICON_PNG.check, nama: "Semen PC 50kg (Plester 1:4)",  jumlah: Math.ceil(luas * 0.2),         satuan: "Sak"  },
          { icon: ICON_PNG.check, nama: "Pasir Plester",                 jumlah: (luas * 0.02).toFixed(2),      satuan: "m3"   },
          { icon: ICON_PNG.check, nama: "Semen PC 50kg (Acian)",        jumlah: Math.ceil(luas * 0.1),         satuan: "Sak"  },
        ];
      } else {
        data.sni   = 'SNI 03-0349-1989';
        data.items = [
          { icon: ICON_PNG.hebel, nama: "Bata Ringan Hebel 10cm", jumlah: Math.ceil(luas * 8.33 * 1.05), satuan: "Biji" },
          { icon: ICON_PNG.check, nama: "Mortar Perekat (40kg)",  jumlah: Math.ceil(luas / 9),           satuan: "Sak"  },
          { icon: ICON_PNG.check, nama: "Mortar Plester (40kg)",  jumlah: Math.ceil(luas / 7),           satuan: "Sak"  },
          { icon: ICON_PNG.check, nama: "Mortar Acian (40kg)",    jumlah: Math.ceil(luas / 15),          satuan: "Sak"  },
        ];
      }

    // -----------------------------------------------------------------------
    } else if (kategori === 'Pondasi') {
      if (!L || !T1 || !T2) return Alert.alert("Waduh", "Isi semua ukuran pondasi!");
      const vol = P * ((T1 / 100 + T2 / 100) / 2) * (L / 100);
      data.sni     = 'SNI 2836:2008';
      data.summary = `Volume Pondasi: ${vol.toFixed(3)} m3`;
      data.items   = [
        { icon: ICON_PNG.pondasi, nama: "Batu Kali/Belah",            jumlah: (vol * 1.2).toFixed(2),    satuan: "m3"  },
        { icon: ICON_PNG.check,   nama: "Semen PC 50kg",               jumlah: Math.ceil(vol * 3.26),     satuan: "Sak" },
        { icon: ICON_PNG.check,   nama: "Pasir Pasang",                jumlah: (vol * 0.52).toFixed(2),   satuan: "m3"  },
        { icon: ICON_PNG.check,   nama: "Urugan Pasir Bawah Pondasi", jumlah: (P * 0.6 * 0.1).toFixed(2), satuan: "m3"  },
      ];

    // -----------------------------------------------------------------------
    } else if (kategori === 'Lantai') {
      if (!L) return Alert.alert("Waduh", "Isi lebar ruangan!");
      const mPerDus = subLantai === '60' ? 1.44 : subLantai === '40' ? 1.0 : 0.9;
      // FIX: semen 0.26 sak/m2 (bukan 0.36), nat 0.10 bungkus/m2 (bukan 0.18)
      data.sni     = 'SNI 03-4062-1996';
      data.summary = `Luas Lantai: ${luas.toFixed(2)} m2 | Keramik ${subLantai}x${subLantai}cm`;
      data.items   = [
        { icon: ICON_PNG.keramik, nama: `Keramik ${subLantai}x${subLantai}cm`, jumlah: Math.ceil((luas * 1.05) / mPerDus), satuan: "Dus"     },
        { icon: ICON_PNG.check,   nama: "Semen PC 50kg (Adukan 1:3)",          jumlah: Math.ceil(luas * 0.26),             satuan: "Sak"     },
        { icon: ICON_PNG.check,   nama: "Pasir Pasang",                         jumlah: (luas * 0.021).toFixed(3),          satuan: "m3"      },
        { icon: ICON_PNG.check,   nama: "Semen Nat Keramik (1kg)",             jumlah: Math.ceil(luas * 0.10),             satuan: "Bungkus" },
      ];
    }

    setHasil(data);
  };

  const getCatIcon = () => {
    const map: Record<string, string> = {
      'Atap': ICON_PNG.atap, 'Dinding': ICON_PNG.dinding,
      'Pondasi': ICON_PNG.pondasi, 'Lantai': ICON_PNG.lantai,
      'Struktur Pembesian': ICON_PNG.besi, 'Plafon': ICON_PNG.plafon,
    };
    return map[kategori] || ICON_PNG.result;
  };

  const MENU_ITEMS = [
    { id: 'Atap',               icon: ICON_PNG.atap,    label: 'Atap Rumah',         sni: 'SNI 03-2095' },
    { id: 'Dinding',            icon: ICON_PNG.dinding, label: 'Struktur Dinding',   sni: 'SNI 03-6861' },
    { id: 'Pondasi',            icon: ICON_PNG.pondasi, label: 'Pondasi Batu Kali',  sni: 'SNI 2836'    },
    { id: 'Lantai',             icon: ICON_PNG.lantai,  label: 'Pasang Lantai',      sni: 'SNI 03-4062' },
    { id: 'Struktur Pembesian', icon: ICON_PNG.besi,    label: 'Struktur Pembesian', sni: 'SNI 07-2052' },
    { id: 'Plafon',             icon: ICON_PNG.plafon,  label: 'Plafon Ruangan',     sni: 'SNI 03-6385' },
  ];

  // Label bentuk atap
  const BENTUK_ATAP: { id: BentukAtap; label: string; icon: string; desc: string }[] = [
    { id: 'pelana',  label: 'Pelana',  icon: ICON_PNG.atap,     desc: '2 bidang miring' },
    { id: 'limasan', label: 'Limasan', icon: ICON_PNG.atap,     desc: '4 bidang miring' },
    { id: 'perisai', label: 'Perisai', icon: ICON_PNG.sudut,    desc: 'Pelana + limasan' },
    { id: 'datar',   label: 'Datar',   icon: ICON_PNG.lantai,   desc: 'Dak beton' },
    { id: 'sandar',  label: 'Sandar',  icon: ICON_PNG.panjang,  desc: '1 bidang (teras)' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => tab === 'menu' ? router.back() : setTab('menu')}>
          <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Kalkulator Material HF</Text>
          <Text style={styles.headerSub}>Berbasis Standar SNI</Text>
        </View>
        <Image source={{ uri: ICON_PNG.sni }} style={{ width: 28, height: 28 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {tab === 'menu' ? (
            <View>
              <View style={styles.sniNote}>
                <Image source={{ uri: ICON_PNG.sni }} style={{ width: 20, height: 20 }} />
                <Text style={styles.sniNoteText}>Semua formula berdasarkan Standar Nasional Indonesia (SNI)</Text>
              </View>
              <View style={styles.grid}>
                {MENU_ITEMS.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.menuBox} onPress={() => resetForm(item.id as KategoriType)}>
                    <Image source={{ uri: item.icon }} style={styles.menuIcon} />
                    <Text style={styles.menuText}>{item.label}</Text>
                    <View style={styles.sniBadge}>
                      <Text style={styles.sniBadgeText}>{item.sni}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          ) : (
            <View style={styles.card}>
              <View style={styles.katHeader}>
                <Image source={{ uri: getCatIcon() }} style={{ width: 40, height: 40 }} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.kategoriTitle}>{kategori}</Text>
                  {hasil?.sni && <Text style={styles.sniLabel}>Ref: {hasil.sni}</Text>}
                </View>
              </View>

              {/* ========== ATAP ========== */}
              {kategori === 'Atap' && (
                <View>
                  {/* Pilih bentuk atap */}
                  <Text style={styles.label}>Bentuk Atap</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {BENTUK_ATAP.map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.bentukBtn, bentukAtap === b.id && styles.bentukBtnActive]}
                          onPress={() => setBentukAtap(b.id)}
                        >
                          <Image source={{ uri: b.icon }} style={styles.bentukIcon} />
                          <Text style={[styles.bentukLabel, bentukAtap === b.id && styles.bentukLabelActive]}>{b.label}</Text>
                          <Text style={[styles.bentukDesc, bentukAtap === b.id && styles.bentukDescActive]}>{b.desc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Jenis penutup atap */}
                  <Text style={styles.label}>Jenis Penutup Atap</Text>
                  <View style={styles.rowBtn}>
                    <TouchableOpacity style={[styles.optBtn, subAtap === 'genteng' && styles.optActive]} onPress={() => setSubAtap('genteng')}>
                      <Image source={{ uri: ICON_PNG.genteng }} style={styles.optIcon} />
                      <Text style={[styles.optText, subAtap === 'genteng' && styles.optTextActive]}>GENTENG</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.optBtn, subAtap === 'galvalum' && styles.optActive]} onPress={() => setSubAtap('galvalum')}>
                      <Image source={{ uri: ICON_PNG.galvalum }} style={styles.optIcon} />
                      <Text style={[styles.optText, subAtap === 'galvalum' && styles.optTextActive]}>GALVALUM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ========== PLAFON ========== */}
              {kategori === 'Plafon' && (
                <View>
                  <Text style={styles.label}>Jenis Plafon</Text>
                  <View style={styles.rowBtn}>
                    <TouchableOpacity style={[styles.optBtn, subPlafon === 'gypsum' && styles.optActive]} onPress={() => setSubPlafon('gypsum')}>
                      <Image source={{ uri: ICON_PNG.gypsum }} style={styles.optIcon} />
                      <Text style={[styles.optText, subPlafon === 'gypsum' && styles.optTextActive]}>GYPSUM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.optBtn, subPlafon === 'pvc' && styles.optActive]} onPress={() => setSubPlafon('pvc')}>
                      <Image source={{ uri: ICON_PNG.pvc }} style={styles.optIcon} />
                      <Text style={[styles.optText, subPlafon === 'pvc' && styles.optTextActive]}>PVC</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ========== DINDING ========== */}
              {kategori === 'Dinding' && (
                <View>
                  <Text style={styles.label}>Jenis Material Dinding</Text>
                  <View style={styles.rowBtn}>
                    <TouchableOpacity style={[styles.optBtn, subDinding === 'merah' && styles.optActive]} onPress={() => setSubDinding('merah')}>
                      <Image source={{ uri: ICON_PNG.bata }} style={styles.optIcon} />
                      <Text style={[styles.optText, subDinding === 'merah' && styles.optTextActive]}>BATA MERAH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.optBtn, subDinding === 'hebel' && styles.optActive]} onPress={() => setSubDinding('hebel')}>
                      <Image source={{ uri: ICON_PNG.hebel }} style={styles.optIcon} />
                      <Text style={[styles.optText, subDinding === 'hebel' && styles.optTextActive]}>HEBEL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ========== LANTAI ========== */}
              {kategori === 'Lantai' && (
                <View>
                  <Text style={styles.label}>Ukuran Keramik</Text>
                  <View style={styles.rowBtn}>
                    {(['30', '40', '60'] as const).map(x => (
                      <TouchableOpacity key={x} style={[styles.optBtn, subLantai === x && styles.optActive]} onPress={() => setSubLantai(x)}>
                        <Image source={{ uri: ICON_PNG.keramik }} style={styles.optIcon} />
                        <Text style={[styles.optText, subLantai === x && styles.optTextActive]}>{x}x{x} cm</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Input panjang */}
              <View style={styles.labelRow}>
                <Image source={{ uri: ICON_PNG.panjang }} style={styles.labelIcon} />
                <Text style={styles.label}>
                  {kategori === 'Struktur Pembesian' || kategori === 'Pondasi'
                    ? 'Panjang Jalur (Meter)'
                    : 'Panjang Area (Meter)'}
                </Text>
              </View>
              <TextInput style={styles.input} keyboardType="numeric" value={input1} onChangeText={setInput1} placeholder="Contoh: 6" placeholderTextColor="#bbb" />

              {/* Input lebar */}
              <View style={styles.labelRow}>
                <Image source={{ uri: ICON_PNG.lebar }} style={styles.labelIcon} />
                <Text style={styles.label}>
                  {kategori === 'Pondasi' ? 'Tinggi Pondasi (cm)' : 'Lebar / Tinggi Area (Meter)'}
                </Text>
              </View>
              <TextInput style={styles.input} keyboardType="numeric" value={input2} onChangeText={setInput2} placeholder="Contoh: 4" placeholderTextColor="#bbb" />

              {/* Input tambahan atap: kemiringan + overstek */}
              {kategori === 'Atap' && bentukAtap !== 'datar' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.labelRow}>
                        <Image source={{ uri: ICON_PNG.sudut }} style={styles.labelIcon} />
                        <Text style={styles.label}>Kemiringan (Derajat)</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={inputKemiringan}
                        onChangeText={setInputKemiringan}
                        placeholder="30"
                        placeholderTextColor="#bbb"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.labelRow}>
                        <Image source={{ uri: ICON_PNG.lebar }} style={styles.labelIcon} />
                        <Text style={styles.label}>Overstek (m)</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={inputOverstek}
                        onChangeText={setInputOverstek}
                        placeholder="0.5"
                        placeholderTextColor="#bbb"
                      />
                    </View>
                  </View>
                  <Text style={styles.infoTip}>
                    Tips: Kemiringan umum genteng 30-40 derajat, galvalum 10-15 derajat. Overstek = lebar tritisan dari dinding.
                  </Text>
                </View>
              )}

              {/* Struktur pembesian tambahan */}
              {kategori === 'Struktur Pembesian' && (
                <View>
                  <Text style={styles.label}>Jumlah Besi Utama</Text>
                  <View style={styles.rowBtn}>
                    {[4, 6, 8].map(n => (
                      <TouchableOpacity key={n} style={[styles.optBtn, jmlBesiUtama === n && styles.optActive]} onPress={() => setJmlBesiUtama(n)}>
                        <Image source={{ uri: ICON_PNG.besi }} style={styles.optIcon} />
                        <Text style={[styles.optText, jmlBesiUtama === n && styles.optTextActive]}>{n} Btg</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Jarak Sengkang/Begel</Text>
                  <View style={styles.rowBtn}>
                    {[10, 15, 20].map(j => (
                      <TouchableOpacity key={j} style={[styles.optBtn, jarakCincin === j && styles.optActive]} onPress={() => setJarakCincin(j)}>
                        <Text style={[styles.optText, jarakCincin === j && styles.optTextActive]}>{j} cm</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Ukuran Sengkang (cm)</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TextInput style={[styles.input, { width: '48%' }]} placeholder="Lebar (cm)" keyboardType="numeric" value={input3} onChangeText={setInput3} placeholderTextColor="#bbb" />
                    <TextInput style={[styles.input, { width: '48%' }]} placeholder="Tinggi (cm)" keyboardType="numeric" value={input4} onChangeText={setInput4} placeholderTextColor="#bbb" />
                  </View>
                </View>
              )}

              {/* Pondasi tambahan */}
              {kategori === 'Pondasi' && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: '48%' }}>
                    <Text style={styles.label}>Lebar Atas (cm)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={input3} onChangeText={setInput3} placeholder="30" placeholderTextColor="#bbb" />
                  </View>
                  <View style={{ width: '48%' }}>
                    <Text style={styles.label}>Lebar Bawah (cm)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={input4} onChangeText={setInput4} placeholder="60" placeholderTextColor="#bbb" />
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.btnHitung} onPress={hitungMaterial}>
                <Image source={{ uri: ICON_PNG.check }} style={{ width: 22, height: 22, marginRight: 10 }} />
                <Text style={styles.btnText}>PROSES HITUNG MATERIAL</Text>
              </TouchableOpacity>

              {hasil && (
                <View style={styles.resultBox}>
                  <View style={styles.resultHeader}>
                    <Image source={{ uri: ICON_PNG.result }} style={{ width: 25, height: 25 }} />
                    <Text style={styles.resultTitle}>Estimasi Material (SNI)</Text>
                  </View>
                  <Text style={styles.summaryText}>{hasil.summary}</Text>
                  {hasil.sni && (
                    <View style={styles.sniBadgeResult}>
                      <Text style={styles.sniBadgeResultText}>Referensi: {hasil.sni}</Text>
                    </View>
                  )}
                  <View style={styles.divider} />
                  {hasil.items.map((item: any, i: number) => (
                    <View key={i} style={styles.itemRow}>
                      <Image source={{ uri: item.icon }} style={styles.itemIcon} />
                      <Text style={styles.itemText}>
                        {item.nama}: <Text style={styles.itemJumlah}>{item.jumlah} {item.satuan}</Text>
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.disclaimer}>Catatan: Estimasi sudah termasuk waste sesuai SNI. Kondisi lapangan dapat berbeda.</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f5f7fa' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerCenter:       { flex: 1, marginLeft: 12 },
  headerTitle:        { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub:          { fontSize: 10, color: '#FFC400', fontWeight: 'bold', marginTop: 2 },
  scroll:             { padding: 20 },
  sniNote:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 12, borderRadius: 15, marginBottom: 16 },
  sniNoteText:        { flex: 1, fontSize: 11, color: '#0d47a1', marginLeft: 8, fontWeight: 'bold' },
  grid:               { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuBox:            { width: '47%', backgroundColor: '#fff', padding: 18, borderRadius: 25, alignItems: 'center', marginBottom: 20, elevation: 5 },
  menuIcon:           { width: 48, height: 48, marginBottom: 8 },
  menuText:           { fontSize: 11, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 6 },
  sniBadge:           { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sniBadgeText:       { fontSize: 9, color: '#2e7d32', fontWeight: 'bold' },
  card:               { backgroundColor: '#fff', borderRadius: 25, padding: 20, elevation: 8 },
  katHeader:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  kategoriTitle:      { fontSize: 17, fontWeight: 'bold', color: '#0d47a1' },
  sniLabel:           { fontSize: 10, color: '#2e7d32', fontWeight: 'bold', marginTop: 2 },
  label:              { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 12 },
  labelRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 12 },
  labelIcon:          { width: 14, height: 14, marginRight: 5 },
  input:              { backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 15, padding: 14, fontSize: 16, color: '#333', marginBottom: 4 },
  rowBtn:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  optBtn:             { flex: 1, padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', marginHorizontal: 3 },
  optActive:          { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  optIcon:            { width: 18, height: 18, marginBottom: 3 },
  optText:            { fontSize: 9, fontWeight: 'bold', color: '#888' },
  optTextActive:      { color: '#FFC400' },

  // Bentuk atap
  bentukBtn:          { width: 72, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  bentukBtnActive:    { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  bentukIcon:         { width: 26, height: 26, marginBottom: 4 },
  bentukLabel:        { fontSize: 10, fontWeight: 'bold', color: '#555' },
  bentukLabelActive:  { color: '#FFC400' },
  bentukDesc:         { fontSize: 8, color: '#aaa', textAlign: 'center', marginTop: 2 },
  bentukDescActive:   { color: 'rgba(255,196,0,0.8)' },

  infoTip:            { fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 4, marginBottom: 4, lineHeight: 15 },

  btnHitung:          { backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 20, flexDirection: 'row', justifyContent: 'center', elevation: 4 },
  btnText:            { color: '#0d47a1', fontWeight: 'bold', fontSize: 14 },
  resultBox:          { marginTop: 20, backgroundColor: '#fff9e6', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#FFC400', elevation: 2 },
  resultHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  resultTitle:        { fontSize: 14, fontWeight: 'bold', marginLeft: 10, color: '#333' },
  summaryText:        { fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 6, lineHeight: 18 },
  sniBadgeResult:     { backgroundColor: '#e8f5e9', padding: 6, borderRadius: 10, marginBottom: 8, alignSelf: 'flex-start' },
  sniBadgeResultText: { fontSize: 10, color: '#2e7d32', fontWeight: 'bold' },
  divider:            { height: 1, backgroundColor: '#ffe082', marginVertical: 10 },
  itemRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemIcon:           { width: 20, height: 20, marginRight: 8 },
  itemText:           { fontSize: 13, color: '#444', flex: 1 },
  itemJumlah:         { fontWeight: 'bold', color: '#0d47a1' },
  disclaimer:         { marginTop: 12, fontSize: 10, color: '#999', fontStyle: 'italic', textAlign: 'center' },
});