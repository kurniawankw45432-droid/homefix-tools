export interface User {
  User_ID: string;
  Nama: string;
  WhatsApp: string;
  Email: string;
  Sandi?: string;
  Peran: string;
  Provinsi: string;
  Foto: string;
  Keahlian: string;
  Pengalaman: string;
  Alamat_KTP: string;
  Alamat_Domisili: string;
  NIK: string;
  No_KTA: string;
  Saldo_Dompet: string;
  TglDaftar: string;
}

export interface Kontrak {
  Kontrak_ID: string;
  ID_Owner: string;
  ID_Mitra: string;
  Nama_Pekerjaan: string;
  Nilai_Borongan: string;
  Persen_DP: string;
  Nilai_Dp_Rupiah: string;
  TglMulai: string;
  Estimasi_Hari: string;
  TglKontrak: string;
  Status_Kontrak: string;
  Termin: string;
  Fee_HF: string;
}

export interface Kasbon {
  Kasbon_ID: string;
  Kontrak_ID: string;
  ID_Mitra: string;
  ID_Owner: string;
  Nominal: string;
  Status: string;
  TglAjuan: string;
  TglProses: string;
  Catatan: string;
}

export interface Postingan {
  Post_ID: string;
  User_ID_Pembuat: string;
  Jenis_Postingan: string;
  Judul: string;
  Deskripsi: string;
  Foto_Kerja: string;
  Budget: string;
  Provinsi: string;
  Kota: string;
}

export interface Chat {
  Chat_ID: string;
  Pengirim: string;
  Penerima: string;
  Pesan: string;
  Waktu: string;
  Status: string;
}

export interface Aktivitas {
  ID: string;
  Penerima: string;
  Pengirim: string;
  Tipe: string;
  Post_ID: string;
  Pesan: string;
  Waktu: string;
  Status: string;
}
