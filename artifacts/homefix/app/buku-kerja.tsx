import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { BASE_URL } from '../constants';

const ICON_PNG = {
  back:     "https://img.icons8.com/ios-filled/50/ffffff/left.png",
  plus:     "https://img.icons8.com/color/96/plus--v1.png",
  save:     "https://img.icons8.com/color/96/checked--v1.png",
  trash:    "https://img.icons8.com/color/96/trash.png",
  edit:     "https://img.icons8.com/color/96/edit--v1.png",
  close:    "https://img.icons8.com/color/96/multiply.png",
  download: "https://img.icons8.com/color/96/download--v1.png",
  folder:   "https://img.icons8.com/color/96/folder-invoices.png",
  check:    "https://img.icons8.com/color/96/checked-checkbox.png",
  user:     "https://img.icons8.com/color/96/user-male-circle.png",
  chevDown: "https://img.icons8.com/ios-filled/50/666666/chevron-down.png",
  chevUp:   "https://img.icons8.com/ios-filled/50/666666/chevron-up.png",
};

type ModeBuku = 'Tukang' | 'Mandor';

// Data pekerja yang dipilih di Mode Mandor (chip sistem baru)
interface PekerjaSelected {
  nama: string;
  gaji: string;       // otomatis dari riwayat, bisa diubah
  kasbon: string;     // opsional, diisi manual
}

interface RingkasanPekerja {
  nama: string;
  totalHari: number;
  totalGaji: number;
  totalKasbon: number;
  sisa: number;
  catatanIds: string[];
  detailHarian: any[];
}

// -----------------------------------------------------------------------
// Helper: normalisasi tanggal dari berbagai format jadi "DD/M/YYYY"
// Menangani: "26/6/2026", "2026-06-26", "2026-06-26T07:00:00.000Z", dll
// -----------------------------------------------------------------------
const formatTanggal = (str: string): string => {
  if (!str) return '-';
  // sudah format Indonesia DD/M/YYYY atau DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return str;
  // format ISO atau string yang bisa di-parse Date
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID');
    }
  } catch (_) {}
  return str;
};

// Tanggal hari ini dalam format Indonesia (konsisten dengan simpan)
const hariIniStr = (): string => new Date().toLocaleDateString('id-ID');

export default function BukuKerjaScreen() {
  const router = useRouter();
  const rekapRef = useRef<any>(null);

  const [myUser, setMyUser] = useState<any>(null);
  const [mode, setMode] = useState<ModeBuku>('Tukang');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [daftarProyek, setDaftarProyek] = useState<string[]>([]);
  const [proyekAktif, setProyekAktif] = useState('');
  const [showProyekModal, setShowProyekModal] = useState(false);
  const [proyekBaruInput, setProyekBaruInput] = useState('');

  // --- Mode Tukang ---
  const [jamMasuk, setJamMasuk] = useState('');
  const [jamPulang, setJamPulang] = useState('');
  const [aktivitas, setAktivitas] = useState('');
  const [upahTukang, setUpahTukang] = useState('');
  const [kasbonTukang, setKasbonTukang] = useState('');
  const [tukangSudahAbsen, setTukangSudahAbsen] = useState(false);

  // --- Mode Mandor (sistem baru) ---
  // daftar nama unik yang pernah tercatat di proyek aktif
  const [daftarPekerjaProyek, setDaftarPekerjaProyek] = useState<string[]>([]);
  // nama-nama yang dipilih hari ini beserta gaji & kasbon-nya
  const [selectedPekerja, setSelectedPekerja] = useState<{ [nama: string]: PekerjaSelected }>({});
  // nama yang sudah absen hari ini (tidak bisa dipilih lagi)
  const [sudahAbsenHariIni, setSudahAbsenHariIni] = useState<string[]>([]);
  // form tambah pekerja baru (manual)
  const [showTambahBaru, setShowTambahBaru] = useState(false);
  const [namaBaru, setNamaBaru] = useState('');
  const [gajiBaru, setGajiBaru] = useState('');
  const [kasbonBaru, setKasbonBaru] = useState('');

  const [semuaAbsensi, setSemuaAbsensi] = useState<any[]>([]);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [pekerjaTerbuka, setPekerjaTerbuka] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  // Setiap kali proyek aktif berubah, hitung ulang daftar pekerja & status absen
  useEffect(() => {
    if (proyekAktif && myUser) {
      hitungDaftarMandor();
      cekAbsenTukang();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekAktif, semuaAbsensi]);

  const init = async () => {
    try {
      const session = await AsyncStorage.getItem('user_hf');
      if (session) {
        const parsed = JSON.parse(session);
        setMyUser(parsed);
        await muatAbsensi(parsed.Nama);
      }
    } catch (e) {
      console.log("Gagal init:", e);
    } finally {
      setLoading(false);
    }
  };

  const muatAbsensi = async (namaUser: string) => {
    try {
      const res  = await fetch(`${BASE_URL}?sheet=Absensi`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const milikSaya = data.filter((a: any) => a.Dicatat_Oleh === namaUser);
        setSemuaAbsensi(milikSaya);

        const proyekUnik = Array.from(new Set(milikSaya.map((a: any) => a.Nama_Proyek).filter(Boolean)));
        setDaftarProyek(proyekUnik as string[]);

        setProyekAktif(prev => {
          if (!prev && proyekUnik.length > 0) return proyekUnik[proyekUnik.length - 1] as string;
          if (prev && !proyekUnik.includes(prev)) return proyekUnik.length > 0 ? (proyekUnik[proyekUnik.length - 1] as string) : '';
          return prev;
        });
      }
    } catch (e) {
      console.log("Gagal muat absensi:", e);
    }
  };

  // -----------------------------------------------------------------------
  // Hitung daftar pekerja unik & siapa yang sudah absen hari ini (Mode Mandor)
  // -----------------------------------------------------------------------
  const hitungDaftarMandor = () => {
    const dataProyek = semuaAbsensi.filter(
      (a: any) => a.Nama_Proyek === proyekAktif
    );
    // nama unik semua yang pernah tercatat
    const namaUnik = Array.from(new Set(dataProyek.map((a: any) => a.User_ID).filter(Boolean))) as string[];
    setDaftarPekerjaProyek(namaUnik);

    // siapa yang sudah absen HARI INI di proyek ini
    const hariIni = hariIniStr();
    const sudahHariIni = dataProyek
      .filter((a: any) => formatTanggal(a.Tanggal) === hariIni)
      .map((a: any) => a.User_ID as string);
    setSudahAbsenHariIni(sudahHariIni);

    // reset pilihan yang sudah tidak relevan (ganti proyek)
    setSelectedPekerja({});
  };

  // -----------------------------------------------------------------------
  // Cek apakah tukang sudah absen hari ini di proyek aktif (Mode Tukang)
  // -----------------------------------------------------------------------
  const cekAbsenTukang = () => {
    if (!myUser || !proyekAktif) return;
    const hariIni = hariIniStr();
    const sudah = semuaAbsensi.some(
      (a: any) =>
        a.User_ID === myUser.Nama &&
        a.Nama_Proyek === proyekAktif &&
        formatTanggal(a.Tanggal) === hariIni
    );
    setTukangSudahAbsen(sudah);
  };

  // -----------------------------------------------------------------------
  // Ambil gaji harian terakhir seorang pekerja di proyek aktif
  // -----------------------------------------------------------------------
  const ambilGajiTerakhir = (namaPekerja: string): string => {
    const riwayat = semuaAbsensi
      .filter((a: any) => a.User_ID === namaPekerja && a.Nama_Proyek === proyekAktif)
      .sort((a: any, b: any) => {
        const parse = (s: string) => {
          const p = formatTanggal(s).split('/').map(Number);
          return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]).getTime() : 0;
        };
        return parse(b.Tanggal) - parse(a.Tanggal);
      });
    if (riwayat.length > 0 && riwayat[0].Gaji_Harian) {
      return String(riwayat[0].Gaji_Harian);
    }
    return '';
  };

  // -----------------------------------------------------------------------
  // Toggle pilih/batal pekerja di Mode Mandor
  // -----------------------------------------------------------------------
  const togglePilihPekerja = (nama: string) => {
    if (sudahAbsenHariIni.includes(nama)) return; // sudah absen, tidak bisa
    setSelectedPekerja(prev => {
      if (prev[nama]) {
        // batalkan pilihan
        const copy = { ...prev };
        delete copy[nama];
        return copy;
      } else {
        // pilih & isi gaji otomatis
        return {
          ...prev,
          [nama]: { nama, gaji: ambilGajiTerakhir(nama), kasbon: '' }
        };
      }
    });
  };

  const updateSelectedPekerja = (nama: string, field: 'gaji' | 'kasbon', value: string) => {
    setSelectedPekerja(prev => ({
      ...prev,
      [nama]: { ...prev[nama], [field]: value }
    }));
  };

  // -----------------------------------------------------------------------
  // Proyek
  // -----------------------------------------------------------------------
  const pilihAtauBuatProyek = (nama: string) => {
    setProyekAktif(nama);
    setShowProyekModal(false);
    setProyekBaruInput('');
  };

  const buatProyekBaru = () => {
    if (!proyekBaruInput.trim()) return;
    const nama = proyekBaruInput.trim();
    if (!daftarProyek.includes(nama)) {
      setDaftarProyek(prev => [...prev, nama]);
    }
    pilihAtauBuatProyek(nama);
  };

  const hapusFolderProyek = (namaProyek: string) => {
    Alert.alert(
      'Hapus Folder Proyek',
      `Hapus folder "${namaProyek}"? SEMUA catatan absensi di proyek ini (termasuk yang sudah dibayar) akan terhapus permanen.`,
      [
        { text: 'Batal' },
        { text: 'Hapus Permanen', style: 'destructive', onPress: async () => {
          setSaving(true);
          try {
            const res = await fetch(BASE_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: 'hapusProyekAbsensi',
                sheet: 'Absensi',
                nama_proyek: namaProyek,
                dicatat_oleh: myUser.Nama,
              })
            });
            const result = await res.json();
            Alert.alert('Terhapus', `Folder "${namaProyek}" dan ${result.jumlah_dihapus || 0} catatan sudah dihapus.`);
            await muatAbsensi(myUser.Nama);
          } catch (e) {
            Alert.alert('Error', 'Gagal menghapus folder. Coba lagi.');
          } finally {
            setSaving(false);
          }
        }}
      ]
    );
  };

  // -----------------------------------------------------------------------
  // Simpan Mode Tukang
  // -----------------------------------------------------------------------
  const simpanModeTukang = async () => {
    if (!proyekAktif) { Alert.alert('Pilih Proyek', 'Pilih atau buat nama proyek dulu.'); return; }
    if (!upahTukang)  { Alert.alert('Data Kurang', 'Isi upah hari ini.'); return; }
    setSaving(true);
    try {
      const payload = {
        action: 'tambahAbsensi',
        sheet:  'Absensi',
        data: {
          Absen_ID:     'ABS-' + Date.now(),
          User_ID:      myUser.Nama,
          Nama_Proyek:  proyekAktif,
          Tanggal:      hariIniStr(),
          Jam_Masuk:    jamMasuk,
          Jam_Pulang:   jamPulang,
          Gaji_Harian:  Number(upahTukang) || 0,
          Kasbon:       Number(kasbonTukang) || 0,
          Status:       aktivitas || '-',
          GPS_Lokasi:   '',
          Dicatat_Oleh: myUser.Nama,
          Mode:         'Tukang',
        }
      };
      await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payload) });
      setJamMasuk(''); setJamPulang(''); setAktivitas(''); setUpahTukang(''); setKasbonTukang('');
      Alert.alert('Tersimpan', 'Catatan hari ini berhasil disimpan.');
      await muatAbsensi(myUser.Nama);
    } catch (e) {
      Alert.alert('Error', 'Gagal simpan ke server.');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Simpan Mode Mandor (sistem chip baru)
  // -----------------------------------------------------------------------
  const simpanModeMandor = async () => {
    if (!proyekAktif) { Alert.alert('Pilih Proyek', 'Pilih atau buat nama proyek dulu.'); return; }

    // kumpulkan: yang dipilih dari chip + pekerja baru (kalau ada)
    const listDipilih = Object.values(selectedPekerja).filter(p => p.nama.trim());

    if (listDipilih.length === 0) {
      Alert.alert('Kosong', 'Pilih minimal satu pekerja yang hadir hari ini.');
      return;
    }

    // validasi gaji tidak boleh kosong
    const adaGajiKosong = listDipilih.some(p => !p.gaji || !Number(p.gaji));
    if (adaGajiKosong) {
      Alert.alert('Gaji Kosong', 'Pastikan semua pekerja yang dipilih sudah ada nominal gajinya.');
      return;
    }

    setSaving(true);
    try {
      const tgl = hariIniStr();
      await Promise.all(
        listDipilih.map((p) =>
          fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'tambahAbsensi',
              sheet:  'Absensi',
              data: {
                Absen_ID:     'ABS-' + Date.now() + '-' + p.nama.replace(/\s/g, ''),
                User_ID:      p.nama.trim(),
                Nama_Proyek:  proyekAktif,
                Tanggal:      tgl,
                Jam_Masuk:    '',
                Jam_Pulang:   '',
                Gaji_Harian:  Number(p.gaji) || 0,
                Kasbon:       Number(p.kasbon) || 0,
                Status:       '-',
                GPS_Lokasi:   '',
                Dicatat_Oleh: myUser.Nama,
                Mode:         'Mandor',
              }
            })
          })
        )
      );
      setSelectedPekerja({});
      setShowTambahBaru(false);
      setNamaBaru(''); setGajiBaru(''); setKasbonBaru('');
      Alert.alert('Tersimpan', `Absensi ${listDipilih.length} pekerja hari ini berhasil disimpan.`);
      await muatAbsensi(myUser.Nama);
    } catch (e) {
      Alert.alert('Error', 'Gagal simpan ke server.');
    } finally {
      setSaving(false);
    }
  };

  // Tambah pekerja baru ke selectedPekerja lalu reset form
  const konfirmasiTambahPekerjaBaru = () => {
    if (!namaBaru.trim()) { Alert.alert('Nama Kosong', 'Isi nama pekerja baru.'); return; }
    if (!gajiBaru) { Alert.alert('Gaji Kosong', 'Isi nominal gaji pekerja baru.'); return; }
    const nama = namaBaru.trim();
    setSelectedPekerja(prev => ({
      ...prev,
      [nama]: { nama, gaji: gajiBaru, kasbon: kasbonBaru }
    }));
    // tambahkan ke daftar lokal supaya muncul sebagai chip juga
    if (!daftarPekerjaProyek.includes(nama)) {
      setDaftarPekerjaProyek(prev => [...prev, nama]);
    }
    setShowTambahBaru(false);
    setNamaBaru(''); setGajiBaru(''); setKasbonBaru('');
  };

  // -----------------------------------------------------------------------
  // Edit & Hapus catatan
  // -----------------------------------------------------------------------
  const bukaEdit = (item: any) => {
    setEditTarget(item);
    setEditForm({
      Nama_Proyek: item.Nama_Proyek,
      Tanggal:     formatTanggal(item.Tanggal),
      Jam_Masuk:   item.Jam_Masuk,
      Jam_Pulang:  item.Jam_Pulang,
      Gaji_Harian: String(item.Gaji_Harian),
      Kasbon:      String(item.Kasbon),
      Status:      item.Status,
      User_ID:     item.User_ID,
    });
    setShowEditModal(true);
  };

  const simpanEdit = async () => {
    setSaving(true);
    try {
      await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'editAbsensi',
          sheet:  'Absensi',
          id:     editTarget.Absen_ID,
          data: {
            Nama_Proyek: editForm.Nama_Proyek,
            Tanggal:     editForm.Tanggal,
            Jam_Masuk:   editForm.Jam_Masuk,
            Jam_Pulang:  editForm.Jam_Pulang,
            Gaji_Harian: Number(editForm.Gaji_Harian) || 0,
            Kasbon:      Number(editForm.Kasbon) || 0,
            Status:      editForm.Status,
            User_ID:     editForm.User_ID,
          }
        })
      });
      setShowEditModal(false);
      setEditTarget(null);
      await muatAbsensi(myUser.Nama);
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const hapusCatatan = (item: any) => {
    Alert.alert('Hapus Catatan', `Hapus catatan ${item.User_ID} tanggal ${formatTanggal(item.Tanggal)}?`, [
      { text: 'Batal' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteData', sheet: 'Absensi', id: item.Absen_ID })
          });
          await muatAbsensi(myUser.Nama);
        } catch (e) {
          Alert.alert('Error', 'Gagal hapus.');
        }
      }}
    ]);
  };

  const tandaiSudahDibayar = (ringkasan: RingkasanPekerja) => {
    Alert.alert(
      'Tandai Sudah Dibayar',
      `Tandai semua catatan ${ringkasan.nama} (Rp ${ringkasan.sisa.toLocaleString('id-ID')}) sebagai SUDAH DIBAYAR?\n\nCatatan tidak dihapus, hanya tidak ikut terhitung lagi.`,
      [
        { text: 'Batal' },
        { text: 'Ya, Sudah Dibayar', onPress: async () => {
          setSaving(true);
          try {
            await fetch(BASE_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: 'tandaiBayarAbsensi',
                sheet: 'Absensi',
                ids: ringkasan.catatanIds,
              })
            });
            Alert.alert('Berhasil', `Catatan ${ringkasan.nama} sudah ditandai lunas.`);
            await muatAbsensi(myUser.Nama);
          } catch (e) {
            Alert.alert('Error', 'Gagal menandai. Coba lagi.');
          } finally {
            setSaving(false);
          }
        }}
      ]
    );
  };

  // -----------------------------------------------------------------------
  // Rekap
  // -----------------------------------------------------------------------
  const getRingkasanPerPekerja = (): RingkasanPekerja[] => {
    const dataProyek = semuaAbsensi.filter(
      a => a.Nama_Proyek === proyekAktif && a.Status_Bayar !== 'Sudah'
    );
    const grouped: { [nama: string]: RingkasanPekerja } = {};
    dataProyek.forEach((item) => {
      const nama = item.User_ID;
      if (!grouped[nama]) {
        grouped[nama] = { nama, totalHari: 0, totalGaji: 0, totalKasbon: 0, sisa: 0, catatanIds: [], detailHarian: [] };
      }
      grouped[nama].totalHari += 1;
      grouped[nama].totalGaji += Number(item.Gaji_Harian) || 0;
      grouped[nama].totalKasbon += Number(item.Kasbon) || 0;
      grouped[nama].catatanIds.push(item.Absen_ID);
      grouped[nama].detailHarian.push(item);
    });
    Object.values(grouped).forEach((g) => {
      g.sisa = g.totalGaji - g.totalKasbon;
      g.detailHarian.sort((a, b) => {
        const parse = (s: string) => {
          const p = formatTanggal(s).split('/').map(Number);
          return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]).getTime() : 0;
        };
        return parse(b.Tanggal) - parse(a.Tanggal);
      });
    });
    return Object.values(grouped).sort((a, b) => a.nama.localeCompare(b.nama));
  };

  const handleDownloadRekap = async () => {
    if (!rekapRef.current) { Alert.alert('Error', 'Gagal ambil gambar rekap.'); return; }
    setDownloading(true);
    try {
      const uri = await rekapRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Info', 'Fitur berbagi tidak tersedia.'); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: `Rekap-${proyekAktif}`, UTI: 'public.jpeg' });
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa download. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color="#0d47a1" /></View>
  );

  const ringkasanList = getRingkasanPerPekerja();
  const totalSemuaGaji   = ringkasanList.reduce((sum, r) => sum + r.totalGaji, 0);
  const totalSemuaKasbon = ringkasanList.reduce((sum, r) => sum + r.totalKasbon, 0);
  const totalSemuaSisa   = totalSemuaGaji - totalSemuaKasbon;
  const jumlahDipilih    = Object.keys(selectedPekerja).length;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={{ uri: ICON_PNG.back }} style={{ width: 24, height: 24 }} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Buku Kerja</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={s.modeToggleRow}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'Tukang' && s.modeBtnActive]}
            onPress={() => setMode('Tukang')}
          >
            <Text style={[s.modeBtnText, mode === 'Tukang' && s.modeBtnTextActive]}>MODE TUKANG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'Mandor' && s.modeBtnActive]}
            onPress={() => setMode('Mandor')}
          >
            <Text style={[s.modeBtnText, mode === 'Mandor' && s.modeBtnTextActive]}>MODE MANDOR</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Pilih Proyek */}
          <TouchableOpacity style={s.proyekBox} onPress={() => setShowProyekModal(true)}>
            <Image source={{ uri: ICON_PNG.folder }} style={{ width: 22, height: 22 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.proyekLabel}>Proyek Aktif</Text>
              <Text style={s.proyekNama}>{proyekAktif || 'Tap untuk pilih/buat proyek'}</Text>
            </View>
          </TouchableOpacity>

          {/* ============================================================
              MODE TUKANG
          ============================================================ */}
          {mode === 'Tukang' && (
            <View style={s.formCard}>
              <Text style={s.formTitle}>Catatan Hari Ini</Text>

              {tukangSudahAbsen ? (
                /* Pengaman: sudah absen hari ini */
                <View style={s.sudahAbsenBox}>
                  <Text style={s.sudahAbsenIcon}>âœ“</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.sudahAbsenJudul}>Kamu sudah absen hari ini</Text>
                    <Text style={s.sudahAbsenSub}>
                      Catatan untuk proyek "{proyekAktif}" pada {hariIniStr()} sudah tersimpan.
                      Kalau ada yang perlu diubah, edit lewat rekap di bawah.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={s.row2}>
                    <View style={s.flex1}>
                      <Text style={s.label}>Jam Masuk</Text>
                      <TextInput style={s.input} placeholder="08:00" value={jamMasuk} onChangeText={setJamMasuk} placeholderTextColor="#bbb" />
                    </View>
                    <View style={s.flex1}>
                      <Text style={s.label}>Jam Pulang</Text>
                      <TextInput style={s.input} placeholder="17:00" value={jamPulang} onChangeText={setJamPulang} placeholderTextColor="#bbb" />
                    </View>
                  </View>

                  <Text style={s.label}>Aktivitas Hari Ini</Text>
                  <TextInput
                    style={s.inputMulti}
                    placeholder="Contoh: Pasang keramik kamar mandi"
                    value={aktivitas}
                    onChangeText={setAktivitas}
                    multiline
                    placeholderTextColor="#bbb"
                  />

                  <View style={s.row2}>
                    <View style={s.flex1}>
                      <Text style={s.label}>Upah Hari Ini</Text>
                      <TextInput style={s.input} placeholder="0" keyboardType="numeric" value={upahTukang} onChangeText={setUpahTukang} placeholderTextColor="#bbb" />
                    </View>
                    <View style={s.flex1}>
                      <Text style={s.label}>Kasbon (opsional)</Text>
                      <TextInput style={s.input} placeholder="0" keyboardType="numeric" value={kasbonTukang} onChangeText={setKasbonTukang} placeholderTextColor="#bbb" />
                    </View>
                  </View>

                  <TouchableOpacity style={s.btnSave} onPress={simpanModeTukang} disabled={saving}>
                    {saving ? <ActivityIndicator color="#0d47a1" /> : (
                      <>
                        <Image source={{ uri: ICON_PNG.save }} style={{ width: 20, height: 20, marginRight: 8 }} />
                        <Text style={s.btnSaveText}>SIMPAN CATATAN</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ============================================================
              MODE MANDOR - sistem chip baru
          ============================================================ */}
          {mode === 'Mandor' && (
            <View style={s.formCard}>
              <Text style={s.formTitle}>Absensi Pekerja Hari Ini</Text>
              <Text style={s.formSub}>{hariIniStr()} - Tap nama untuk pilih siapa yang hadir</Text>

              {/* Chip daftar pekerja */}
              {daftarPekerjaProyek.length === 0 && !showTambahBaru ? (
                <View style={s.emptyChipBox}>
                  <Text style={s.emptyChipText}>
                    Belum ada pekerja tercatat di proyek ini.{'\n'}Tambah pekerja baru di bawah.
                  </Text>
                </View>
              ) : (
                <View style={s.chipGrid}>
                  {daftarPekerjaProyek.map((nama) => {
                    const sudah    = sudahAbsenHariIni.includes(nama);
                    const dipilih  = !!selectedPekerja[nama];
                    return (
                      <TouchableOpacity
                        key={nama}
                        style={[
                          s.chip,
                          dipilih  && s.chipDipilih,
                          sudah    && s.chipSudah,
                        ]}
                        onPress={() => togglePilihPekerja(nama)}
                        disabled={sudah}
                        activeOpacity={sudah ? 1 : 0.7}
                      >
                        <Text style={[s.chipText, dipilih && s.chipTextDipilih, sudah && s.chipTextSudah]}>
                          {nama}
                        </Text>
                        {sudah && <Text style={s.chipBadgeSudah}> - sudah absen</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Detail gaji & kasbon untuk pekerja yang dipilih */}
              {Object.values(selectedPekerja).map((p) => (
                <View key={p.nama} style={s.selectedDetailRow}>
                  <Text style={s.selectedNama}>{p.nama}</Text>
                  <View style={s.row2}>
                    <View style={s.flex1}>
                      <Text style={s.label}>Gaji Hari Ini</Text>
                      <TextInput
                        style={s.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={p.gaji}
                        onChangeText={(v) => updateSelectedPekerja(p.nama, 'gaji', v)}
                        placeholderTextColor="#bbb"
                      />
                    </View>
                    <View style={s.flex1}>
                      <Text style={s.label}>Kasbon (opsional)</Text>
                      <TextInput
                        style={s.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={p.kasbon}
                        onChangeText={(v) => updateSelectedPekerja(p.nama, 'kasbon', v)}
                        placeholderTextColor="#bbb"
                      />
                    </View>
                  </View>
                </View>
              ))}

              {/* Form tambah pekerja baru */}
              {showTambahBaru ? (
                <View style={s.tambahBaruBox}>
                  <Text style={s.tambahBaruJudul}>Pekerja Baru</Text>
                  <Text style={s.label}>Nama Lengkap</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Nama pekerja..."
                    value={namaBaru}
                    onChangeText={setNamaBaru}
                    placeholderTextColor="#bbb"
                  />
                  <View style={s.row2}>
                    <View style={s.flex1}>
                      <Text style={s.label}>Gaji Hari Ini</Text>
                      <TextInput
                        style={s.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={gajiBaru}
                        onChangeText={setGajiBaru}
                        placeholderTextColor="#bbb"
                      />
                    </View>
                    <View style={s.flex1}>
                      <Text style={s.label}>Kasbon (opsional)</Text>
                      <TextInput
                        style={s.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={kasbonBaru}
                        onChangeText={setKasbonBaru}
                        placeholderTextColor="#bbb"
                      />
                    </View>
                  </View>
                  <View style={s.row2}>
                    <TouchableOpacity style={s.btnBatalBaru} onPress={() => { setShowTambahBaru(false); setNamaBaru(''); setGajiBaru(''); setKasbonBaru(''); }}>
                      <Text style={s.btnBatalBaruText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btnSave, { flex: 1, marginTop: 0 }]} onPress={konfirmasiTambahPekerjaBaru}>
                      <Text style={s.btnSaveText}>Tambahkan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={s.btnAddRow} onPress={() => setShowTambahBaru(true)}>
                  <Image source={{ uri: ICON_PNG.plus }} style={{ width: 16, height: 16, marginRight: 6 }} />
                  <Text style={s.btnAddRowText}>+ TAMBAH PEKERJA BARU</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.btnSave, jumlahDipilih === 0 && s.btnSaveDisabled]}
                onPress={simpanModeMandor}
                disabled={saving || jumlahDipilih === 0}
              >
                {saving ? <ActivityIndicator color="#0d47a1" /> : (
                  <>
                    <Image source={{ uri: ICON_PNG.save }} style={{ width: 20, height: 20, marginRight: 8 }} />
                    <Text style={s.btnSaveText}>
                      SIMPAN ABSENSI{jumlahDipilih > 0 ? ` (${jumlahDipilih} orang)` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================
              REKAP
          ============================================================ */}
          <ViewShot ref={rekapRef} options={{ format: 'jpg', quality: 0.9 }}>
            <View style={s.rekapWrapper}>
              <View style={s.rekapHeaderCard}>
                <Text style={s.rekapTitle}>Rekap Belum Dibayar - {proyekAktif || '-'}</Text>
                <Text style={s.rekapSub}>{ringkasanList.length} pekerja . Total sisa Rp {totalSemuaSisa.toLocaleString('id-ID')}</Text>
              </View>

              {ringkasanList.length === 0 ? (
                <View style={s.rekapEmptyBox}>
                  <Text style={s.rekapEmpty}>Tidak ada tagihan tertunda di proyek ini.</Text>
                </View>
              ) : (
                ringkasanList.map((r) => (
                  <View key={r.nama} style={s.pekerjaCard}>
                    <TouchableOpacity
                      style={s.pekerjaCardHeader}
                      onPress={() => setPekerjaTerbuka(pekerjaTerbuka === r.nama ? null : r.nama)}
                    >
                      <Image source={{ uri: ICON_PNG.user }} style={{ width: 36, height: 36 }} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.pekerjaCardNama}>{r.nama}</Text>
                        <Text style={s.pekerjaCardHari}>{r.totalHari} hari kerja</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.pekerjaCardSisa}>Rp {r.sisa.toLocaleString('id-ID')}</Text>
                        <Text style={s.pekerjaCardSisaLabel}>sisa wajib bayar</Text>
                      </View>
                      <Image
                        source={{ uri: pekerjaTerbuka === r.nama ? ICON_PNG.chevUp : ICON_PNG.chevDown }}
                        style={{ width: 14, height: 14, marginLeft: 8 }}
                      />
                    </TouchableOpacity>

                    {pekerjaTerbuka === r.nama && (
                      <View style={s.pekerjaDetailBox}>
                        <View style={s.pekerjaTotalRow}>
                          <Text style={s.pekerjaTotalLabel}>Total Gaji</Text>
                          <Text style={s.pekerjaTotalVal}>Rp {r.totalGaji.toLocaleString('id-ID')}</Text>
                        </View>
                        <View style={s.pekerjaTotalRow}>
                          <Text style={s.pekerjaTotalLabel}>Total Kasbon</Text>
                          <Text style={s.pekerjaTotalValDanger}>-Rp {r.totalKasbon.toLocaleString('id-ID')}</Text>
                        </View>
                        <View style={s.divider} />
                        {r.detailHarian.map((item, i) => (
                          <View key={i} style={s.detailRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.detailTgl}>{formatTanggal(item.Tanggal)}</Text>
                              {item.Status && item.Status !== '-' ? <Text style={s.detailAktivitas}>{item.Status}</Text> : null}
                            </View>
                            <Text style={s.detailGaji}>Rp {Number(item.Gaji_Harian).toLocaleString('id-ID')}</Text>
                            <TouchableOpacity onPress={() => bukaEdit(item)} style={s.detailBtn}>
                              <Image source={{ uri: ICON_PNG.edit }} style={{ width: 14, height: 14 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => hapusCatatan(item)} style={s.detailBtn}>
                              <Image source={{ uri: ICON_PNG.trash }} style={{ width: 14, height: 14 }} />
                            </TouchableOpacity>
                          </View>
                        ))}

                        <TouchableOpacity style={s.btnTandaiBayar} onPress={() => tandaiSudahDibayar(r)} disabled={saving}>
                          <Image source={{ uri: ICON_PNG.check }} style={{ width: 18, height: 18, marginRight: 8 }} />
                          <Text style={s.btnTandaiBayarText}>TANDAI SUDAH DIBAYAR (Rp {r.sisa.toLocaleString('id-ID')})</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
              <Text style={s.rekapFooter}>Dibuat via HomeFix - {new Date().toLocaleDateString('id-ID')}</Text>
            </View>
          </ViewShot>

          {ringkasanList.length > 0 && (
            <TouchableOpacity style={s.btnDownload} onPress={handleDownloadRekap} disabled={downloading}>
              {downloading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Image source={{ uri: ICON_PNG.download }} style={{ width: 20, height: 20, marginRight: 8 }} />
                  <Text style={s.btnDownloadText}>DOWNLOAD REKAP (JPG)</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL PILIH/BUAT/HAPUS PROYEK */}
      <Modal visible={showProyekModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Kelola Proyek</Text>
              <TouchableOpacity onPress={() => setShowProyekModal(false)}>
                <Image source={{ uri: ICON_PNG.close }} style={{ width: 20, height: 20 }} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {daftarProyek.length === 0 ? (
                <Text style={{ color: '#999', fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>
                  Belum ada proyek. Buat di bawah.
                </Text>
              ) : (
                daftarProyek.map((p) => (
                  <View key={p} style={s.proyekItem}>
                    <TouchableOpacity style={s.proyekItemTap} onPress={() => pilihAtauBuatProyek(p)}>
                      <Image source={{ uri: ICON_PNG.folder }} style={{ width: 18, height: 18, marginRight: 10 }} />
                      <Text style={s.proyekItemText}>{p}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.proyekHapusBtn} onPress={() => hapusFolderProyek(p)}>
                      <Image source={{ uri: ICON_PNG.trash }} style={{ width: 16, height: 16 }} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={s.divider} />
            <Text style={s.label}>Buat Proyek Baru</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.inputFlex}
                placeholder="Nama proyek baru..."
                value={proyekBaruInput}
                onChangeText={setProyekBaruInput}
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity style={s.btnTambahProyek} onPress={buatProyekBaru}>
                <Text style={s.btnTambahProyekText}>Buat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDIT CATATAN */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Edit Catatan</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Image source={{ uri: ICON_PNG.close }} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Nama</Text>
              <TextInput style={s.input} value={editForm.User_ID} onChangeText={(v) => setEditForm({...editForm, User_ID: v})} placeholderTextColor="#bbb" />

              <Text style={s.label}>Tanggal</Text>
              <TextInput style={s.input} value={editForm.Tanggal} onChangeText={(v) => setEditForm({...editForm, Tanggal: v})} placeholderTextColor="#bbb" />

              <View style={s.row2}>
                <View style={s.flex1}>
                  <Text style={s.label}>Jam Masuk</Text>
                  <TextInput style={s.input} value={editForm.Jam_Masuk} onChangeText={(v) => setEditForm({...editForm, Jam_Masuk: v})} placeholderTextColor="#bbb" />
                </View>
                <View style={s.flex1}>
                  <Text style={s.label}>Jam Pulang</Text>
                  <TextInput style={s.input} value={editForm.Jam_Pulang} onChangeText={(v) => setEditForm({...editForm, Jam_Pulang: v})} placeholderTextColor="#bbb" />
                </View>
              </View>

              <View style={s.row2}>
                <View style={s.flex1}>
                  <Text style={s.label}>Gaji</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={editForm.Gaji_Harian} onChangeText={(v) => setEditForm({...editForm, Gaji_Harian: v})} placeholderTextColor="#bbb" />
                </View>
                <View style={s.flex1}>
                  <Text style={s.label}>Kasbon</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={editForm.Kasbon} onChangeText={(v) => setEditForm({...editForm, Kasbon: v})} placeholderTextColor="#bbb" />
                </View>
              </View>

              <Text style={s.label}>Aktivitas/Catatan</Text>
              <TextInput style={s.inputMulti} value={editForm.Status} onChangeText={(v) => setEditForm({...editForm, Status: v})} multiline placeholderTextColor="#bbb" />

              <TouchableOpacity style={s.btnSave} onPress={simpanEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="#0d47a1" /> : <Text style={s.btnSaveText}>SIMPAN PERUBAHAN</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#0d47a1' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  modeToggleRow: { flexDirection: 'row', backgroundColor: '#0d47a1', paddingHorizontal: 20, paddingBottom: 15, gap: 10 },
  modeBtn:           { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  modeBtnActive:     { backgroundColor: '#FFC400' },
  modeBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  modeBtnTextActive: { color: '#0d47a1' },

  scroll: { padding: 16 },

  proyekBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, elevation: 3 },
  proyekLabel: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  proyekNama:  { fontSize: 15, fontWeight: 'bold', color: '#0d47a1', marginTop: 2 },

  formCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, elevation: 4 },
  formTitle: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  formSub:   { fontSize: 11, color: '#999', marginBottom: 14 },

  row2:  { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 6 },

  input:      { backgroundColor: '#f5f7fa', borderRadius: 12, padding: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee' },
  inputMulti: { backgroundColor: '#f5f7fa', borderRadius: 12, padding: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee', minHeight: 70, textAlignVertical: 'top' },

  // Pengaman tukang sudah absen
  sudahAbsenBox:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#e8f5e9', borderRadius: 14, padding: 14 },
  sudahAbsenIcon:  { fontSize: 22, color: '#2e7d32', fontWeight: 'bold' },
  sudahAbsenJudul: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  sudahAbsenSub:   { fontSize: 11, color: '#555', marginTop: 4, lineHeight: 17 },

  // Chip Mode Mandor
  emptyChipBox:  { backgroundColor: '#f5f7fa', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 12 },
  emptyChipText: { color: '#999', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  chipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:            { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f0f4ff', borderWidth: 1.5, borderColor: '#c5cae9' },
  chipDipilih:     { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  chipSudah:       { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0', opacity: 0.6 },
  chipText:        { fontSize: 12, fontWeight: '600', color: '#3949ab' },
  chipTextDipilih: { color: '#fff' },
  chipTextSudah:   { color: '#bbb' },
  chipBadgeSudah:  { fontSize: 10, color: '#bbb' },

  // Detail gaji pekerja yang dipilih
  selectedDetailRow: { backgroundColor: '#f0f4ff', borderRadius: 14, padding: 12, marginBottom: 8 },
  selectedNama:      { fontSize: 13, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },

  // Form tambah pekerja baru
  tambahBaruBox:   { backgroundColor: '#fff8e1', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ffe082' },
  tambahBaruJudul: { fontSize: 12, fontWeight: 'bold', color: '#f57f17', marginBottom: 4 },
  btnBatalBaru:    { flex: 1, backgroundColor: '#eee', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnBatalBaruText:{ color: '#666', fontWeight: 'bold', fontSize: 12 },

  btnAddRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, marginBottom: 10 },
  btnAddRowText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 12 },

  btnSave:         { flexDirection: 'row', backgroundColor: '#FFC400', borderRadius: 16, padding: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnSaveDisabled: { backgroundColor: '#e0e0e0' },
  btnSaveText:     { color: '#0d47a1', fontWeight: 'bold', fontSize: 13 },

  rekapWrapper:    {},
  rekapHeaderCard: { backgroundColor: '#0d47a1', borderRadius: 20, padding: 18, marginBottom: 12 },
  rekapTitle:      { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  rekapSub:        { fontSize: 11, color: '#FFC400', marginTop: 4, fontWeight: 'bold' },

  rekapEmptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', elevation: 2 },
  rekapEmpty:    { color: '#999', fontSize: 12, textAlign: 'center' },

  pekerjaCard:       { backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, elevation: 3, overflow: 'hidden' },
  pekerjaCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  pekerjaCardNama:   { fontSize: 14, fontWeight: 'bold', color: '#333' },
  pekerjaCardHari:   { fontSize: 10, color: '#999', marginTop: 2 },
  pekerjaCardSisa:      { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
  pekerjaCardSisaLabel: { fontSize: 9, color: '#999', marginTop: 1 },

  pekerjaDetailBox:    { backgroundColor: '#f9fafb', padding: 14, borderTopWidth: 1, borderTopColor: '#eee' },
  pekerjaTotalRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pekerjaTotalLabel:   { fontSize: 11, color: '#666' },
  pekerjaTotalVal:     { fontSize: 12, fontWeight: 'bold', color: '#2e7d32' },
  pekerjaTotalValDanger: { fontSize: 12, fontWeight: 'bold', color: '#e53935' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },

  detailRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailTgl:       { fontSize: 11, fontWeight: 'bold', color: '#333' },
  detailAktivitas: { fontSize: 10, color: '#888', marginTop: 2, fontStyle: 'italic' },
  detailGaji:      { fontSize: 12, fontWeight: 'bold', color: '#333', marginRight: 8 },
  detailBtn:       { padding: 6 },

  btnTandaiBayar:     { flexDirection: 'row', backgroundColor: '#2e7d32', borderRadius: 14, padding: 13, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnTandaiBayarText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  rekapFooter: { fontSize: 9, color: '#bbb', textAlign: 'center', marginTop: 10, marginBottom: 10 },

  btnDownload:     { flexDirection: 'row', backgroundColor: '#0d47a1', borderRadius: 16, padding: 15, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  btnDownloadText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '85%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle:   { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },

  proyekItem:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proyekItemTap:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f5f7fa', borderRadius: 12 },
  proyekItemText: { fontSize: 13, color: '#333', fontWeight: '600' },
  proyekHapusBtn: { padding: 12, marginLeft: 8, backgroundColor: '#ffebee', borderRadius: 12 },

  inputRow:      { flexDirection: 'row', gap: 8 },
  inputFlex:     { flex: 1, backgroundColor: '#f5f7fa', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#eee' },
  btnTambahProyek:     { backgroundColor: '#0d47a1', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  btnTambahProyekText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});