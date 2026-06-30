import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back: "https://img.icons8.com/ios-filled/50/0d47a1/left.png",
  trash: "https://img.icons8.com/color/96/trash.png",
  shield: "https://img.icons8.com/color/96/shield-with-check.png",
  download: "https://img.icons8.com/color/96/download--v1.png",
  gps: "https://img.icons8.com/color/96/gps-signal.png",
  star: "https://img.icons8.com/color/96/star--v1.png",
  check2: "https://img.icons8.com/color/96/double-tick.png",
  lock: "https://img.icons8.com/color/96/lock--v1.png",
  topup: "https://img.icons8.com/color/96/add-money.png",
  close: "https://img.icons8.com/color/96/multiply.png",
  warning: "https://img.icons8.com/color/96/error--v1.png",
  money2: "https://img.icons8.com/color/96/money-bag.png",
  history: "https://img.icons8.com/color/96/transaction-list.png",
};

export default function ContractDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const paperRef = useRef<any>(null);

  const [myUser, setMyUser] = useState<any>(null);
  const [kontrak, setKontrak] = useState<any>(null);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [mitraData, setMitraData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proc, setProc] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sudahRating, setSudahRating] = useState(false);

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [nominalTopup, setNominalTopup] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [lunasiLoading, setLunasiLoading] = useState(false);

  const [deadlineLewat, setDeadlineLewat] = useState(false);

  useEffect(() => { ambilDetail(); }, [id]);

  const cekDanSetModeProyek = async (find: any) => {
    if (find.Mode_Proyek) return;

    const sudahLunas = find.Saldo_Kontrak_Terkunci >= find.Nilai_Borongan;
    if (sudahLunas) {
      try {
        await fetch(BASE_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'setModeProyek', id: find.Kontrak_ID, mode: 'HF-Penuh' }),
        });
      } catch (eMode) {}
      return;
    }

    if (find.Status_Kontrak!== 'Pengerjaan') return;
    if (!find.TglMulai ||!find.Estimasi_Hari) return;

    try {
      const tglMulai = new Date(find.TglMulai);
      const tengahHari = Math.floor(parseInt(find.Estimasi_Hari) / 2);
      const deadline = new Date(tglMulai);
      deadline.setDate(deadline.getDate() + tengahHari);
      const sekarang = new Date();
      if (sekarang <= deadline) return;

      await fetch(BASE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setModeProyek', id: find.Kontrak_ID, mode: 'Mandiri' }),
      });
    } catch (eMode) {}
  };

  const ambilDetail = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      let parsedUser: any = null;
      if (session) {
        parsedUser = JSON.parse(session);
        setMyUser(parsedUser);
      }
      const res = await fetch(`${BASE_URL}?sheet=Kontrak`);
      const data = await res.json();
      const find = data.find((k: any) => k.Kontrak_ID === id);
      if (find) {
        find.Nilai_Borongan = Number(find.Nilai_Borongan) || 0;
        find.Nilai_Dp_Rupiah = Number(find.Nilai_Dp_Rupiah) || 0;
        find.Persen_DP = Number(find.Persen_DP) || 10;
        find.Saldo_Kontrak_Terkunci = Number(find.Saldo_Kontrak_Terkunci) || 0;
        find.Total_Topup_Kontrak = Number(find.Total_Topup_Kontrak) || 0;
        find.Jumlah_Topup_Ke = Number(find.Jumlah_Topup_Ke) || 0;
        setKontrak(find);
        const resU = await fetch(`${BASE_URL}?sheet=Pengguna`);
        const users = await resU.json();
        setOwnerData(users.find((u: any) => u.Nama === find.ID_Owner) || null);
        setMitraData(users.find((u: any) => u.Nama === find.ID_Mitra) || null);

        if (find.Status_Kontrak === 'Selesai' && parsedUser) {
          const resR = await fetch(`${BASE_URL}?sheet=Rating`);
          const ratingData = await resR.json();
          if (Array.isArray(ratingData)) {
            const sudah = ratingData.some((r: any) =>
              r.Kontrak_ID === find.Kontrak_ID && r.Dari === parsedUser.Nama
            );
            setSudahRating(sudah);
          }
        }

        if (find.Status_Kontrak === 'Pengerjaan' && find.TglMulai && find.Estimasi_Hari) {
          const belumLunas = find.Saldo_Kontrak_Terkunci < find.Nilai_Borongan;
          if (belumLunas &&!find.Mode_Proyek) {
            try {
              const tglMulai = new Date(find.TglMulai);
              const tengahHari = Math.floor(parseInt(find.Estimasi_Hari) / 2);
              const deadline = new Date(tglMulai);
              deadline.setDate(deadline.getDate() + tengahHari);
              const sekarang = new Date();

              if (sekarang > deadline) {
                setDeadlineLewat(true);
                if (parsedUser && parsedUser.Nama === find.ID_Owner) {
                  fetch(BASE_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'tambahAktivitas', sheet: 'Aktivitas',
                      data: {
                        ID: 'AKT-' + Date.now(), Penerima: find.ID_Owner,
                        Pengirim: 'Sistem HomeFix', Tipe: 'topup_jatuh_tempo',
                        Post_ID: find.Kontrak_ID,
                        Pesan: `Saldo kontrak "${find.Nama_Pekerjaan}" belum lunas dan sudah lewat jatuh tempo pengisian. Segera isi saldo kontrak.`,
                        Waktu: new Date().toLocaleString('id-ID'),
                      },
                    }),
                  }).catch(() => {});
                }
              } else {
                setDeadlineLewat(false);
              }
            } catch (eDeadline) {}
          }
        }

        await cekDanSetModeProyek(find);
      }
    } catch { Alert.alert('Error', 'Gagal muat data.'); }
    finally { setLoading(false); }
  };

  const tglFormatted = (iso: string) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return iso; }
  };

  const tglSelesai = () => {
    if (!kontrak?.TglMulai ||!kontrak?.Estimasi_Hari) return '-';
    try {
      const d = new Date(kontrak.TglMulai);
      d.setDate(d.getDate() + parseInt(kontrak.Estimasi_Hari));
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return '-'; }
  };

  const hitungTermin = () => {
    const total = kontrak?.Nilai_Borongan || 0;
    const dp = kontrak?.Nilai_Dp_Rupiah || 0;
    const sisa = total - dp;
    const t1 = Math.round(sisa * 0.5);
    const t2 = sisa - t1;
    return { dp, t1, t2 };
  };

  const hitungFeeHF = (nilaiBorongan: number, hanyaDP: boolean) => {
    if (hanyaDP) return Math.round(kontrak.Nilai_Dp_Rupiah * 0.02);
    if (nilaiBorongan > 80_000_000) return Math.round(nilaiBorongan * 0.01);
    if (nilaiBorongan > 40_000_000) return Math.round(nilaiBorongan * 0.015);
    return Math.round(nilaiBorongan * 0.02);
  };

  const handleDownloadPDF = async () => {
    if (!paperRef.current) { Alert.alert('Error', 'Gagal capture dokumen.'); return; }
    setDownloading(true);
    try {
      const uri = await paperRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Info', 'Fitur berbagi tidak tersedia.'); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `SPK-${kontrak?.Kontrak_ID}`, UTI: 'public.png' });
    } catch { Alert.alert('Gagal', 'Tidak bisa download. Coba lagi.'); }
    finally { setDownloading(false); }
  };

  const handleBayarDP = async () => {
    Alert.alert('Konfirmasi', 'Setujui kontrak dan bayar DP? Saldo dompetmu akan dipotong sejumlah DP.', [
      { text: 'Batal' },
      { text: 'Bayar DP', onPress: async () => {
        setProc(true);
        try {
          const res = await fetch(BASE_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatusKontrak', sheet: 'Kontrak', id: kontrak.Kontrak_ID, status: 'Berjalan' }),
          });
          const result = await res.json();
          if (result && result.error) {
            Alert.alert('Gagal', result.error);
            return;
          }
          ambilDetail();
        } catch { Alert.alert('Gagal', 'Koneksi error.'); }
        finally { setProc(false); }
      }},
    ]);
  };

  const handleLaporTiba = async () => {
    setProc(true);
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert('Izin Kamera', 'Wajib izinkan akses kamera untuk verifikasi lokasi.');
        setProc(false); return;
      }
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (!locPerm.granted) {
        Alert.alert('Izin Lokasi', 'Wajib izinkan akses GPS untuk verifikasi lokasi.');
        setProc(false); return;
      }
      const foto = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.6 });
      if (foto.canceled) { setProc(false); return; }
      const lokasi = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const koordinat = `${lokasi.coords.latitude},${lokasi.coords.longitude}`;
      const googleMaps = `https://maps.google.com/?q=${koordinat}`;
      await fetch(BASE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatusKontrak', sheet: 'Kontrak',
          id: kontrak.Kontrak_ID, status: 'Menunggu Verifikasi',
          koordinat, foto_lokasi: foto.assets[0].uri,
        }),
      });
      await fetch(BASE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tambahAktivitas', sheet: 'Aktivitas',
          data: {
            ID: 'AKT-' + Date.now(), Penerima: kontrak.ID_Owner,
            Pengirim: kontrak.ID_Mitra, Tipe: 'verifikasi_lokasi',
            Post_ID: kontrak.Kontrak_ID,
            Pesan: `${kontrak.ID_Mitra} sudah tiba di lokasi. GPS: ${googleMaps}`,
            Waktu: new Date().toLocaleString('id-ID'),
          },
        }),
      });
      Alert.alert('âœ… Laporan Terkirim', 'Owner akan memverifikasi kehadiranmu. DP akan cair setelah dikonfirmasi.');
      ambilDetail();
    } catch { Alert.alert('Error', 'Gagal lapor lokasi. Pastikan GPS aktif.'); }
    finally { setProc(false); }
  };

  const handleCairkanDP = async () => {
    const feeHF = hitungFeeHF(kontrak.Nilai_Borongan, true);
    const cairBersih = kontrak.Nilai_Dp_Rupiah - feeHF;
    Alert.alert('ðŸ’¸ Cairkan DP',
      `Rincian pencairan:\n\nDP Bruto : Rp ${kontrak.Nilai_Dp_Rupiah.toLocaleString('id-ID')}\nFee HF (2%): Rp ${feeHF.toLocaleString('id-ID')}\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\nCair ke Tukang: Rp ${cairBersih.toLocaleString('id-ID')}\n\nLanjutkan?`,
      [
        { text: 'Batal' },
        { text: 'Cairkan', onPress: async () => {
          setProc(true);
          try {
            await fetch(BASE_URL, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'updateStatusKontrak', sheet: 'Kontrak',
                id: kontrak.Kontrak_ID, status: 'Pengerjaan',
                cairkan: true, target: kontrak.ID_Mitra, jumlah: cairBersih,
                fee: feeHF,
              }),
            });
            const session = await AsyncStorage.getItem('user_hf');
            if (session) {
              const userData = JSON.parse(session);
              if (userData.Nama === kontrak.ID_Mitra) {
                userData.Saldo_Dompet = (Number(userData.Saldo_Dompet) || 0) + cairBersih;
                await AsyncStorage.setItem('user_hf', JSON.stringify(userData));
              }
            }
            await fetch(BASE_URL, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'tambahAktivitas', sheet: 'Aktivitas',
                data: {
                  ID: 'AKT-' + Date.now(), Penerima: kontrak.ID_Mitra,
                  Pengirim: kontrak.ID_Owner, Tipe: 'dp_cair',
                  Post_ID: kontrak.Kontrak_ID,
                  Pesan: `DP Rp ${cairBersih.toLocaleString('id-ID')} telah masuk ke saldo kamu!`,
                  Waktu: new Date().toLocaleString('id-ID'),
                },
              }),
            });
            Alert.alert('âœ… DP Dicairkan!', `Rp ${cairBersih.toLocaleString('id-ID')} masuk ke saldo tukang.\nFee HF Rp ${feeHF.toLocaleString('id-ID')} dipotong.`);
            ambilDetail();
          } catch { Alert.alert('Gagal', 'Proses gagal. Coba lagi.'); }
          finally { setProc(false); }
        }},
      ]
    );
  };

  const handleTopupKontrak = async () => {
    const nom = parseInt(nominalTopup.replace(/\D/g, ''));
    if (!nom || nom < 10000) {
      Alert.alert('Error', 'Nominal minimal Rp 10.000');
      return;
    }
    setTopupLoading(true);
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'topupKontrak',
          data: { Kontrak_ID: kontrak.Kontrak_ID, User_ID: myUser.Nama, Nominal: nom },
        }),
      });
      const result = await res.json();
      if (result && result.error) {
        Alert.alert('Gagal', result.error);
        return;
      }
      Alert.alert('âœ… Berhasil', `Rp ${nom.toLocaleString('id-ID')} berhasil dikunci ke saldo kontrak ini.`);
      setNominalTopup('');
      setShowTopupModal(false);
      ambilDetail();
    } catch {
      Alert.alert('Gagal', 'Koneksi error. Coba lagi.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleLunasiKontrak = async () => {
    if (kontrak.Saldo_Kontrak_Terkunci <= 0) {
      Alert.alert(
        'Saldo Kontrak Kosong',
        'Saldo kontrak belum/sudah tidak ada. Mohon isi saldo kontrak dulu sebelum melunasi pembayaran ke tukang.'
      );
      return;
    }
    const feeEstimasi = Math.round(kontrak.Saldo_Kontrak_Terkunci * 0.02);
    const cairEstimasi = kontrak.Saldo_Kontrak_Terkunci - feeEstimasi;
    Alert.alert(
      'ðŸ’¸ Lunasi Pembayaran',
      `Sisa saldo kontrak: Rp ${kontrak.Saldo_Kontrak_Terkunci.toLocaleString('id-ID')}\nFee HF (2%): Rp ${feeEstimasi.toLocaleString('id-ID')}\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\nCair ke Tukang: Rp ${cairEstimasi.toLocaleString('id-ID')}\n\nKontrak akan ditandai Selesai. Lanjutkan?`,
      [
        { text: 'Batal' },
        { text: 'Lunasi', onPress: async () => {
          setLunasiLoading(true);
          try {
            const res = await fetch(BASE_URL, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'lunasiKontrak',
                id: kontrak.Kontrak_ID,
                id_owner: kontrak.ID_Owner,
              }),
            });
            const result = await res.json();
            if (result && result.error) {
              Alert.alert('Gagal', result.error);
              return;
            }
            Alert.alert('âœ… Pelunasan Berhasil', `Rp ${Number(result.cair_bersih).toLocaleString('id-ID')} masuk ke saldo tukang.\nKontrak sudah selesai.`);
            ambilDetail();
          } catch {
            Alert.alert('Gagal', 'Koneksi error. Coba lagi.');
          } finally {
            setLunasiLoading(false);
          }
        }},
      ]
    );
  };

  const handleTandaiSelesai = async () => {
    const peranSaya = myUser?.Nama === kontrak.ID_Owner? 'Owner' : 'Mitra';
    Alert.alert('Tandai Selesai', 'Yakin pekerjaan ini sudah selesai? Kedua pihak harus konfirmasi.', [
      { text: 'Batal' },
      { text: 'Ya, Selesai', onPress: async () => {
        setProc(true);
        try {
          const res = await fetch(BASE_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'tandaiSelesai', id: kontrak.Kontrak_ID, peran: peranSaya }),
          });
          const result = await res.json();
          if (result.selesai) {
            Alert.alert('ðŸŽ‰ Kontrak Selesai!', 'Kedua pihak sudah konfirmasi. Silakan beri rating.');
          } else {
            Alert.alert('âœ… Tercatat', 'Menunggu konfirmasi dari pihak satunya. Owner/tukang lain sudah diberi notifikasi.');
          }
          ambilDetail();
        } catch { Alert.alert('Gagal', 'Koneksi error.'); }
        finally { setProc(false); }
      }},
    ]);
  };

  const handleHapus = async () => {
    Alert.alert('Hapus', 'Hapus kontrak ini?', [
      { text: 'Batal' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
          await fetch(BASE_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action:'deleteData', sheet: 'Kontrak', id: kontrak.Kontrak_ID }),
          });
          router.replace('/(tabs)/contract-list' as any);
        }},
    ]);
  };

  const bukaHalamanKasbon = () => {
    router.push({ pathname: '/kasbon-request', params: {
      kontrak_id: kontrak.Kontrak_ID, id_owner: kontrak.ID_Owner,
      id_mitra: kontrak.ID_Mitra, nama_pekerjaan: kontrak.Nama_Pekerjaan,
      nilai_borongan: String(kontrak.Nilai_Borongan),
    }} as any);
  };

  // FIX-AUDIT: buka layar Riwayat Transaksi khusus kontrak ini
  const bukaHalamanRiwayat = () => {
    router.push({ pathname: '/riwayat-transaksi', params: {
      kontrak_id: kontrak.Kontrak_ID,
      nama_pekerjaan: kontrak.Nama_Pekerjaan,
    }} as any);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#0d47a1" size="large" /></View>;

    const isOwner = myUser?.Nama === kontrak?.ID_Owner;
    const isMitra = myUser?.Nama === kontrak?.ID_Mitra;
    const termin = hitungTermin();
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const sudahTandaiSaya = isOwner? kontrak?.Owner_Selesai === 'Ya' : kontrak?.Mitra_Selesai === 'Ya';

    const persenTerisi = kontrak?.Nilai_Borongan > 0
   ? Math.min(100, Math.round((kontrak.Saldo_Kontrak_Terkunci / kontrak.Nilai_Borongan) * 100))
      : 0;
    const sisaKebutuhan = Math.max(0, (kontrak?.Nilai_Borongan || 0) - (kontrak?.Saldo_Kontrak_Terkunci || 0));

    const modeMandiri = kontrak?.Mode_Proyek === 'Mandiri';

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>E-KONTRAK (SPK)</Text>
          <TouchableOpacity onPress={handleHapus}>
            <Image source={{ uri: ICON_PNG.trash }} style={{ width: 22, height: 22 }} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll}>

          {deadlineLewat && (isOwner || isMitra) && (
            <View style={s.deadlineBanner}>
              <Image source={{ uri: ICON_PNG.warning }} style={{ width: 22, height: 22 }} />
              <Text style={s.deadlineBannerText}>
                {isOwner
               ? 'Jatuh tempo pengisian saldo kontrak sudah lewat. Segera isi saldo kontrak.'
                  : 'Owner belum melunasi saldo kontrak sesuai jadwal. Sistem sudah mengingatkan owner.'}
              </Text>
            </View>
          )}

          {modeMandiri && (isOwner || isMitra) && (
            <View style={s.mandiriBanner}>
              <Image source={{ uri: ICON_PNG.shield }} style={{ width: 20, height: 20 }} />
              <Text style={s.mandiriBannerText}>
                Proyek ini berjalan MANDIRI (tanpa pengawalan HomeFix). Fitur Kasbon & Pelunasan via app tidak tersedia untuk kontrak ini.
              </Text>
            </View>
          )}

          <ViewShot ref={paperRef} options={{ format: 'png', quality: 1.0 }}>
            <View style={s.paper}>
              <Text style={s.judul}>SURAT PERJANJIAN KERJA (SPK)</Text>
              <View style={s.garisTebal} />
              <Text style={s.nomor}>Nomor: {kontrak?.Kontrak_ID}</Text>
              {/* FIX-TANGGAL: pakai Tanggal_Buat_Kontrak (diisi sekali & permanen di backend
                  saat kontrak dibuat). Tidak ada lagi fallback ke tanggal hari ini, supaya
                  tanggal kontrak tidak berubah-ubah setiap dibuka di hari yang berbeda. */}
              <Text style={s.tglText}>Dibuat pada: {tglFormatted(kontrak?.Tanggal_Buat_Kontrak)}</Text>
              <View style={s.garis} />
              <Text style={s.paragraf}>Pada hari ini telah disepakati perjanjian kerja antara pihak-pihak di bawah ini:</Text>

              <View style={s.pihakBox}>
                <Text style={s.pihakJudul}>I. PIHAK PERTAMA (OWNER)</Text>
                <View style={s.pihakRow}><Text style={s.pKey}>Nama</Text><Text style={s.pVal}>: {ownerData?.Nama || kontrak?.ID_Owner}</Text></View>
                <View style={s.pihakRow}><Text style={s.pKey}>No. KTP</Text><Text style={s.pVal}>: {ownerData?.NIK || '-'}</Text></View>
                <View style={s.pihakRow}><Text style={s.pKey}>Alamat</Text><Text style={s.pVal}>: {ownerData?.Alamat_KTP || ownerData?.Alamat_Domisili || '-'}</Text></View>
                <Text style={s.pihakSub}>Selanjutnya disebut sebagai <Text style={s.bold}>PIHAK PERTAMA.</Text></Text>
              </View>

              <View style={s.pihakBox}>
                <Text style={s.pihakJudul}>II. PIHAK KEDUA (PELAKSANA)</Text>
                <View style={s.pihakRow}><Text style={s.pKey}>Nama</Text><Text style={s.pVal}>: {mitraData?.Nama || kontrak?.ID_Mitra}</Text></View>
                <View style={s.pihakRow}><Text style={s.pKey}>No. KTP</Text><Text style={s.pVal}>: {mitraData?.NIK || '-'}</Text></View>
                <View style={s.pihakRow}><Text style={s.pKey}>Alamat</Text><Text style={s.pVal}>: {mitraData?.Alamat_KTP || mitraData?.Alamat_Domisili || '-'}</Text></View>
                <Text style={s.pihakSub}>Selanjutnya disebut sebagai <Text style={s.bold}>PIHAK KEDUA.</Text></Text>
              </View>

              <Text style={s.paragraf}>Kedua pihak sepakat dengan ketentuan sebagai berikut:</Text>
              <View style={s.garis} />

              <View style={s.item}><Text style={s.iNo}>1.</Text><Text style={s.iKey}>NAMA PEKERJAAN</Text><Text style={s.iVal}>: {kontrak?.Nama_Pekerjaan}</Text></View>
              <View style={s.item}><Text style={s.iNo}>2.</Text><Text style={s.iKey}>NILAI KONTRAK</Text><Text style={s.iVal}>: Rp {(kontrak?.Nilai_Borongan||0).toLocaleString('id-ID')}</Text></View>
              <View style={s.item}>
                <Text style={s.iNo}>3.</Text>
                <Text style={s.iKey}>CARA BAYAR</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.terminItem}>: DP {kontrak?.Persen_DP}% (tgl mulai) â†’ Rp {termin.dp.toLocaleString('id-ID')}</Text>
                  <Text style={s.terminItem}> Termin I (progres 50%) â†’ Rp {termin.t1.toLocaleString('id-ID')}</Text>
                  <Text style={s.terminItem}> Pelunasan (selesai 100%) â†’ Rp {termin.t2.toLocaleString('id-ID')}</Text>
                </View>
              </View>
              <View style={s.item}><Text style={s.iNo}>4.</Text><Text style={s.iKey}>JANGKA WAKTU</Text><Text style={s.iVal}>: {kontrak?.Estimasi_Hari} hari{'\n'} Mulai: {kontrak?.TglMulai} s/d {tglSelesai()}</Text></View>
              <View style={s.item}><Text style={s.iNo}>5.</Text><Text style={s.iKey}>MUTU KERJA</Text><Text style={s.iVal}>: Sesuai standar yang disepakati kedua pihak.</Text></View>
              <View style={s.item}><Text style={s.iNo}>6.</Text><Text style={s.iKey}>KEWAJIBAN P.2</Text><Text style={s.iVal}>: Selesai tepat waktu, jaga kualitas & kebersihan lokasi.</Text></View>
              <View style={s.item}><Text style={s.iNo}>7.</Text><Text style={s.iKey}>KEWAJIBAN P.1</Text><Text style={s.iVal}>: Bayar sesuai jadwal & sediakan akses lokasi kerja.</Text></View>
              <View style={s.item}><Text style={s.iNo}>8.</Text><Text style={s.iKey}>SENGKETA</Text><Text style={s.iVal}>: Musyawarah mufakat. Jika gagal, difasilitasi HomeFix.</Text></View>
              <View style={s.item}><Text style={s.iNo}>9.</Text><Text style={s.iKey}>LAIN-LAIN</Text><Text style={s.iVal}>: Hal belum diatur disepakati bersama kedua pihak.</Text></View>

              <View style={s.garis} />
              <Text style={s.paragrafKecil}>
                Demikian SPK ini dibuat dengan kesadaran penuh tanpa paksaan, difasilitasi oleh platform <Text style={s.bold}>HomeFix</Text>.
              </Text>
              <View style={s.statusBox}>
                <Image source={{ uri: ICON_PNG.shield }} style={{ width: 16, height: 16 }} />
                <Text style={s.statusVal}>Status: {kontrak?.Status_Kontrak || 'Menunggu DP'}</Text>
              </View>
              <View style={s.ttdRow}>
                <View style={s.ttdBox}>
                  <Text style={s.ttdLabel}>PIHAK PERTAMA{'\n'}(OWNER)</Text>
                  <View style={s.ttdSpace} />
                  <Text style={s.ttdNama}>{kontrak?.ID_Owner}</Text>
                </View>
                <View style={s.ttdBox}>
                  <Text style={s.ttdLabel}>PIHAK KEDUA{'\n'}(PELAKSANA)</Text>
                  <View style={s.ttdSpace} />
                  <Text style={s.ttdNama}>{kontrak?.ID_Mitra}</Text>
                </View>
              </View>
              <Text style={s.powered}>Difasilitasi HomeFix â€¢ {today}</Text>
            </View>
          </ViewShot>

          <TouchableOpacity style={s.btnDownload} onPress={handleDownloadPDF} disabled={downloading}>
            {downloading
           ? <ActivityIndicator color="#fff" />
              : <><Image source={{ uri: ICON_PNG.download }} style={{ width: 20, height: 20, marginRight: 8 }} />
                 <Text style={s.btnDownloadText}>DOWNLOAD / BAGIKAN SPK</Text></>
            }
          </TouchableOpacity>

          {/* FIX-AUDIT: tombol Riwayat Transaksi, selalu tersedia kalau kontrak sudah punya ID */}
          {kontrak?.Kontrak_ID ? (
            <TouchableOpacity style={s.btnRiwayat} onPress={bukaHalamanRiwayat}>
              <Image source={{ uri: ICON_PNG.history }} style={{ width: 18, height: 18, marginRight: 8 }} />
              <Text style={s.btnRiwayatText}>LIHAT RIWAYAT TRANSAKSI</Text>
            </TouchableOpacity>
          ) : null}

          {kontrak?.Status_Kontrak === 'Pengerjaan' &&!modeMandiri && (
            <View style={s.saldoKontrakBox}>
              <View style={s.saldoKontrakHeader}>
                <Image source={{ uri: ICON_PNG.lock }} style={{ width: 20, height: 20 }} />
                <Text style={s.saldoKontrakTitle}>Saldo Kontrak Terkunci</Text>
              </View>
              <Text style={s.saldoKontrakValue}>Rp {kontrak.Saldo_Kontrak_Terkunci.toLocaleString('id-ID')}</Text>
              <Text style={s.saldoKontrakSub}>dari total Rp {kontrak.Nilai_Borongan.toLocaleString('id-ID')} ({persenTerisi}%)</Text>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: persenTerisi + '%' }]} />
              </View>
              {sisaKebutuhan > 0 && (
                <Text style={s.saldoKontrakSisa}>Sisa perlu diisi: Rp {sisaKebutuhan.toLocaleString('id-ID')}</Text>
              )}

              {isOwner && sisaKebutuhan > 0 && (
                <TouchableOpacity style={s.btnTopupKontrak} onPress={() => setShowTopupModal(true)}>
                  <Image source={{ uri: ICON_PNG.topup }} style={{ width: 18, height: 18, marginRight: 8 }} />
                  <Text style={s.btnTopupKontrakText}>ISI SALDO KONTRAK</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <>
            {kontrak?.Status_Kontrak === 'Pengerjaan' && isMitra &&!modeMandiri && (
              <TouchableOpacity
                style={[s.btnMain, { backgroundColor: '#7b1fa2' }]}
                onPress={bukaHalamanKasbon}
              >
                <Image source={{ uri: ICON_PNG.money2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={[s.btnText, { color: '#fff' }]}>AJUKAN KASBON</Text>
              </TouchableOpacity>
            )}

            {kontrak?.Status_Kontrak === 'Pengerjaan' && isOwner &&!modeMandiri && (
              <TouchableOpacity
                style={[s.btnMain, { backgroundColor: '#5e35b1' }]}
                onPress={bukaHalamanKasbon}
              >
                <Image source={{ uri: ICON_PNG.money2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={[s.btnText, { color: '#fff' }]}>CEK & SETUJUI KASBON</Text>
              </TouchableOpacity>
            )}
          </>

          {kontrak?.Status_Kontrak === 'Menunggu DP' && isOwner && (
            <TouchableOpacity style={s.btnMain} onPress={handleBayarDP} disabled={proc}>
              {proc? <ActivityIndicator color="#0d47a1" /> : <Text style={s.btnText}>âœ… SETUJUI & BAYAR DP</Text>}
            </TouchableOpacity>
          )}

          {kontrak?.Status_Kontrak === 'Berjalan' && isMitra && (
            <TouchableOpacity style={[s.btnMain, { backgroundColor: '#4caf50' }]} onPress={handleLaporTiba} disabled={proc}>
              {proc? <ActivityIndicator color="#fff" /> : <>
                <Text style={[s.btnText, { color: '#fff' }]}>ðŸ“ SAYA SUDAH DI LOKASI</Text>
                <Text style={{ color: '#e8f5e9', fontSize: 10, marginTop: 4 }}>Wajib foto + GPS otomatis</Text>
              </>}
            </TouchableOpacity>
          )}

          {kontrak?.Status_Kontrak === 'Menunggu Verifikasi' && isOwner && (
            <View>
              <View style={s.infoVerif}>
                <Image source={{ uri: ICON_PNG.gps }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#e65100', flex: 1 }}>
                  Tukang sudah lapor tiba. Cek foto & lokasi sebelum verifikasi dan cairkan DP.
                </Text>
              </View>

              {kontrak?.Foto_Lokasi_Verifikasi && (
                <View style={s.fotoVerifBox}>
                  <Text style={s.fotoVerifLabel}>Foto Bukti Lokasi</Text>
                  <Image source={{ uri: kontrak.Foto_Lokasi_Verifikasi }} style={s.fotoVerifImg} />
                </View>
              )}

              {kontrak?.Koordinat_Verifikasi && (
                <TouchableOpacity
                  style={s.btnLihatMaps}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${kontrak.Koordinat_Verifikasi}`)}
                >
                  <Image source={{ uri: ICON_PNG.gps }} style={{ width: 18, height: 18, marginRight: 8 }} />
                  <Text style={s.btnLihatMapsText}>LIHAT LOKASI DI GOOGLE MAPS</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[s.btnMain, { backgroundColor: '#ff9800' }]} onPress={handleCairkanDP} disabled={proc}>
                {proc? <ActivityIndicator color="#fff" /> : <Text style={[s.btnText, { color: '#fff' }]}>ðŸ’¸ VERIFIKASI & CAIRKAN DP</Text>}
              </TouchableOpacity>
            </View>
          )}

          {kontrak?.Status_Kontrak === 'Pengerjaan' && !modeMandiri && isMitra && !sudahTandaiSaya && (
            <TouchableOpacity style={[s.btnMain, { backgroundColor: '#00897b' }]} onPress={handleTandaiSelesai} disabled={proc}>
              {proc
                ? <ActivityIndicator color="#fff" />
                : <><Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                   <Text style={[s.btnText, { color: '#fff' }]}>TANDAI PEKERJAAN SELESAI</Text></>
              }
            </TouchableOpacity>
          )}

          {kontrak?.Status_Kontrak === 'Pengerjaan' && modeMandiri && (isOwner || isMitra) && !sudahTandaiSaya && (
            <TouchableOpacity style={[s.btnMain, { backgroundColor: '#00897b' }]} onPress={handleTandaiSelesai} disabled={proc}>
              {proc
                ? <ActivityIndicator color="#fff" />
                : <><Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                   <Text style={[s.btnText, { color: '#fff' }]}>TANDAI PEKERJAAN SELESAI</Text></>
              }
            </TouchableOpacity>
          )}

          {kontrak?.Status_Kontrak === 'Pengerjaan' && !modeMandiri && isOwner && kontrak?.Mitra_Selesai === 'Ya' && (
              <View>
                <View style={s.infoVerif}>
                  <Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: '#e65100', flex: 1 }}>
                    Tukang sudah menandai pekerjaan selesai. Cek lokasi dan lunasi pembayaran.
                  </Text>
                </View>
                <TouchableOpacity style={[s.btnMain, { backgroundColor: '#d81b60' }]} onPress={handleLunasiKontrak} disabled={lunasiLoading}>
                  {lunasiLoading
                    ? <ActivityIndicator color="#fff" />
                    : <><Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                       <Text style={[s.btnText, { color: '#fff' }]}>VERIFIKASI & LUNASI PEMBAYARAN</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}

            {kontrak?.Status_Kontrak === 'Pengerjaan' && !modeMandiri && isMitra && sudahTandaiSaya && (
              <View style={s.infoVerif}>
                <Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#00695c', flex: 1 }}>
                  Kamu sudah menandai selesai. Menunggu owner cek lokasi dan melunasi pembayaran.
                </Text>
              </View>
            )}

            {kontrak?.Status_Kontrak === 'Pengerjaan' && modeMandiri && sudahTandaiSaya && (
              <View style={s.infoVerif}>
                <Image source={{ uri: ICON_PNG.check2 }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#00695c', flex: 1 }}>
                  Kamu sudah konfirmasi selesai. Menunggu pihak satunya.
                </Text>
              </View>
            )}

            {kontrak?.Status_Kontrak === 'Selesai' && !sudahRating && (
              <TouchableOpacity
                style={[s.btnMain, { backgroundColor: '#FFC400' }]}
                onPress={() => router.push({
                  pathname: '/rating-screen',
                  params: {
                    kontrak_id: kontrak.Kontrak_ID,
                    dari: myUser?.Nama,
                    untuk: isOwner ? kontrak.ID_Mitra : kontrak.ID_Owner,
                  }
                } as any)}
              >
                <Image source={{ uri: ICON_PNG.star }} style={{ width: 22, height: 22, marginRight: 8 }} />
                <Text style={s.btnText}>BERI RATING & ULASAN</Text>
              </TouchableOpacity>
            )}

            {kontrak?.Status_Kontrak === 'Selesai' && sudahRating && (
              <View style={[s.infoVerif, { backgroundColor: '#fff8e1' }]}>
                <Image source={{ uri: ICON_PNG.star }} style={{ width: 20, height: 20, marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#f57f17', flex: 1 }}>
                  Terima kasih sudah memberi rating untuk kontrak ini!
                </Text>
              </View>
            )}

            <View style={{ height: 60 }} />
            </ScrollView>

            <Modal visible={showTopupModal} transparent animationType="slide">
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={s.modalOverlay}>
                <View style={s.modalBox}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Isi Saldo Kontrak</Text>
                    <TouchableOpacity onPress={() => setShowTopupModal(false)}>
                      <Image source={{ uri: ICON_PNG.close }} style={{ width: 20, height: 20 }} />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.modalSub}>
                    Dana akan dipotong dari saldo dompetmu dan dikunci khusus untuk kontrak ini.{'\n'}
                    Sisa yang perlu diisi: Rp {sisaKebutuhan.toLocaleString('id-ID')}
                  </Text>
                  <View style={s.inputRow}>
                    <Text style={s.rpLabel}>Rp</Text>
                    <TextInput
                      style={s.input}
                      keyboardType="numeric"
                      placeholder="0"
                      value={nominalTopup}
                      onChangeText={v => setNominalTopup(v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                      placeholderTextColor="#aaa"
                    />
                  </View>
                  <View style={s.modalBtnRow}>
                    <TouchableOpacity
                      style={s.modalBtnBatal}
                      onPress={() => { setShowTopupModal(false); setNominalTopup(''); }}
                    >
                      <Text style={s.modalBtnBatalText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.modalBtnKirim} onPress={handleTopupKontrak} disabled={topupLoading}>
                      {topupLoading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.modalBtnKirimText}>Kunci ke Kontrak</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
            </Modal>

            </SafeAreaView>
            );
            }

            const s = StyleSheet.create({
            container:       { flex: 1, backgroundColor: '#f0f2f5' },
            center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
            header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 3 },
            headerTitle:     { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
            scroll:          { padding: 16 },
            paper:           { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5, borderTopWidth: 5, borderTopColor: '#0d47a1' },
            judul:           { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center', textDecorationLine: 'underline', letterSpacing: 1 },
            garisTebal:      { height: 2, backgroundColor: '#0d47a1', marginVertical: 6 },
            nomor:           { fontSize: 11, color: '#333', textAlign: 'center', fontWeight: 'bold' },
            tglText:         { fontSize: 10, color: '#888', textAlign: 'center', marginBottom: 4 },
            garis:           { height: 1, backgroundColor: '#ddd', marginVertical: 10 },
            paragraf:        { fontSize: 11, color: '#444', lineHeight: 17, marginVertical: 4 },
            paragrafKecil:   { fontSize: 10, color: '#666', lineHeight: 15, marginVertical: 6, fontStyle: 'italic' },
            bold:            { fontWeight: 'bold' },
            pihakBox:        { marginVertical: 5, paddingLeft: 4 },
            pihakJudul:      { fontSize: 11, fontWeight: 'bold', color: '#0d47a1', marginBottom: 3 },
            pihakRow:        { flexDirection: 'row', marginBottom: 2 },
            pKey:            { fontSize: 10, color: '#555', width: 65 },
            pVal:            { fontSize: 10, color: '#333', flex: 1 },
            pihakSub:        { fontSize: 10, color: '#555', marginTop: 3, fontStyle: 'italic' },
            item:            { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
            iNo:             { fontSize: 10, color: '#333', width: 16, fontWeight: 'bold' },
            iKey:            { fontSize: 10, color: '#333', width: 100, fontWeight: 'bold' },
            iVal:            { fontSize: 10, color: '#444', flex: 1, lineHeight: 15 },
            terminItem:      { fontSize: 9, color: '#444', lineHeight: 14 },
            statusBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4ff', padding: 8, borderRadius: 8, marginTop: 8 },
            statusVal:       { fontSize: 10, fontWeight: 'bold', color: '#0d47a1', marginLeft: 6 },
            ttdRow:          { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
            ttdBox:          { width: '45%', alignItems: 'center' },
            ttdLabel:        { fontSize: 10, color: '#333', textAlign: 'center', fontWeight: 'bold', lineHeight: 15 },
            ttdSpace:        { height: 40, borderBottomWidth: 1, borderBottomColor: '#333', width: '80%', marginVertical: 6 },
            ttdNama:         { fontSize: 10, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center' },
            powered:         { fontSize: 9, color: '#bbb', textAlign: 'center', marginTop: 10 },
            btnDownload:     { flexDirection: 'row', backgroundColor: '#0d47a1', padding: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 16, elevation: 4 },
            btnDownloadText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
            btnRiwayat:      { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0d47a1', padding: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
            btnRiwayatText:  { color: '#0d47a1', fontWeight: 'bold', fontSize: 12 },
            btnMain:         { flexDirection: 'row', backgroundColor: '#FFC400', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 12, elevation: 4 },
            btnText:         { color: '#0d47a1', fontWeight: 'bold', fontSize: 14 },
            infoVerif:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3e0', padding: 12, borderRadius: 12, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
            saldoKontrakBox:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 16, elevation: 4, borderLeftWidth: 4, borderLeftColor: '#0d47a1' },
            saldoKontrakHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
            saldoKontrakTitle:    { fontSize: 12, fontWeight: 'bold', color: '#0d47a1', marginLeft: 8 },
            saldoKontrakValue:    { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginTop: 4 },
            saldoKontrakSub:      { fontSize: 11, color: '#888', marginTop: 2 },
            progressBarBg:        { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
            progressBarFill:      { height: 8, backgroundColor: '#4caf50', borderRadius: 4 },
            saldoKontrakSisa:     { fontSize: 11, color: '#e65100', fontWeight: 'bold', marginTop: 8 },
            btnTopupKontrak:      { flexDirection: 'row', backgroundColor: '#e3f2fd', borderRadius: 12, paddingVertical: 12, marginTop: 12, justifyContent: 'center', alignItems: 'center' },
            btnTopupKontrakText:  { color: '#0d47a1', fontWeight: 'bold', fontSize: 12 },
            deadlineBanner:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f44336' },
            deadlineBannerText:   { flex: 1, marginLeft: 10, fontSize: 11, color: '#c62828', lineHeight: 16, fontWeight: 'bold' },
            mandiriBanner:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eceff1', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#607d8b' },
            mandiriBannerText:    { flex: 1, marginLeft: 10, fontSize: 11, color: '#37474f', lineHeight: 16, fontWeight: 'bold' },
            fotoVerifBox:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 12, elevation: 3 },
            fotoVerifLabel:       { fontSize: 12, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8 },
            fotoVerifImg:         { width: '100%', height: 220, borderRadius: 12, resizeMode: 'cover', backgroundColor: '#f0f2f5' },
            btnLihatMaps:         { flexDirection: 'row', backgroundColor: '#e8f5e9', borderRadius: 14, paddingVertical: 12, marginTop: 10, justifyContent: 'center', alignItems: 'center' },
            btnLihatMapsText:     { color: '#2e7d32', fontWeight: 'bold', fontSize: 12 },
            modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
            modalBox:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
            modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
            modalTitle:      { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
            modalSub:        { fontSize: 11, color: '#888', marginBottom: 16, lineHeight: 16 },
            inputRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0d47a1', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
            rpLabel:         { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginRight: 6 },
            input:           { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#333', paddingVertical: 12 },
            modalBtnRow:     { flexDirection: 'row', gap: 10, marginTop: 10 },
            modalBtnBatal:      { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#0d47a1', alignItems: 'center' },
            modalBtnBatalText:  { color: '#0d47a1', fontWeight: 'bold' },
            modalBtnKirim:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0d47a1', alignItems: 'center' },
            modalBtnKirimText:  { color: '#fff', fontWeight: 'bold', fontSize: 12 },
            });