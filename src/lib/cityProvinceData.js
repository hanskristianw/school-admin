// Static mapping of Indonesian cities/kabupaten to provinces
// Used for auto-fill province when city is selected

const cityProvinceData = {
  // ACEH
  'Banda Aceh': 'Aceh',
  'Sabang': 'Aceh',
  'Langsa': 'Aceh',
  'Lhokseumawe': 'Aceh',
  'Subulussalam': 'Aceh',
  'Aceh Besar': 'Aceh',
  'Aceh Barat': 'Aceh',
  'Aceh Selatan': 'Aceh',
  'Aceh Tengah': 'Aceh',
  'Aceh Timur': 'Aceh',
  'Aceh Utara': 'Aceh',
  'Pidie': 'Aceh',
  'Bireuen': 'Aceh',
  'Simeulue': 'Aceh',

  // SUMATERA UTARA
  'Medan': 'Sumatera Utara',
  'Binjai': 'Sumatera Utara',
  'Tebing Tinggi': 'Sumatera Utara',
  'Pematang Siantar': 'Sumatera Utara',
  'Tanjung Balai': 'Sumatera Utara',
  'Sibolga': 'Sumatera Utara',
  'Padang Sidempuan': 'Sumatera Utara',
  'Gunungsitoli': 'Sumatera Utara',
  'Deli Serdang': 'Sumatera Utara',
  'Langkat': 'Sumatera Utara',
  'Karo': 'Sumatera Utara',
  'Simalungun': 'Sumatera Utara',
  'Asahan': 'Sumatera Utara',
  'Labuhanbatu': 'Sumatera Utara',
  'Tapanuli Utara': 'Sumatera Utara',
  'Tapanuli Selatan': 'Sumatera Utara',
  'Nias': 'Sumatera Utara',
  'Samosir': 'Sumatera Utara',
  'Toba Samosir': 'Sumatera Utara',

  // SUMATERA BARAT
  'Padang': 'Sumatera Barat',
  'Bukittinggi': 'Sumatera Barat',
  'Payakumbuh': 'Sumatera Barat',
  'Solok': 'Sumatera Barat',
  'Sawahlunto': 'Sumatera Barat',
  'Pariaman': 'Sumatera Barat',
  'Agam': 'Sumatera Barat',
  'Pasaman': 'Sumatera Barat',
  'Tanah Datar': 'Sumatera Barat',

  // RIAU
  'Pekanbaru': 'Riau',
  'Dumai': 'Riau',
  'Bengkalis': 'Riau',
  'Kampar': 'Riau',
  'Indragiri Hilir': 'Riau',
  'Indragiri Hulu': 'Riau',
  'Siak': 'Riau',
  'Rokan Hilir': 'Riau',
  'Rokan Hulu': 'Riau',

  // KEPULAUAN RIAU
  'Batam': 'Kepulauan Riau',
  'Tanjung Pinang': 'Kepulauan Riau',
  'Bintan': 'Kepulauan Riau',
  'Karimun': 'Kepulauan Riau',
  'Natuna': 'Kepulauan Riau',
  'Lingga': 'Kepulauan Riau',

  // JAMBI
  'Jambi': 'Jambi',
  'Sungai Penuh': 'Jambi',
  'Muaro Jambi': 'Jambi',
  'Bungo': 'Jambi',
  'Merangin': 'Jambi',

  // SUMATERA SELATAN
  'Palembang': 'Sumatera Selatan',
  'Prabumulih': 'Sumatera Selatan',
  'Pagar Alam': 'Sumatera Selatan',
  'Lubuk Linggau': 'Sumatera Selatan',
  'Ogan Komering Ilir': 'Sumatera Selatan',
  'Banyuasin': 'Sumatera Selatan',
  'Musi Rawas': 'Sumatera Selatan',
  'Lahat': 'Sumatera Selatan',

  // BENGKULU
  'Bengkulu': 'Bengkulu',
  'Rejang Lebong': 'Bengkulu',
  'Seluma': 'Bengkulu',

  // LAMPUNG
  'Bandar Lampung': 'Lampung',
  'Metro': 'Lampung',
  'Lampung Selatan': 'Lampung',
  'Lampung Tengah': 'Lampung',
  'Lampung Utara': 'Lampung',
  'Lampung Timur': 'Lampung',
  'Lampung Barat': 'Lampung',
  'Tanggamus': 'Lampung',
  'Pringsewu': 'Lampung',

  // KEPULAUAN BANGKA BELITUNG
  'Pangkal Pinang': 'Kepulauan Bangka Belitung',
  'Bangka': 'Kepulauan Bangka Belitung',
  'Belitung': 'Kepulauan Bangka Belitung',

  // DKI JAKARTA
  'Jakarta Pusat': 'DKI Jakarta',
  'Jakarta Utara': 'DKI Jakarta',
  'Jakarta Barat': 'DKI Jakarta',
  'Jakarta Selatan': 'DKI Jakarta',
  'Jakarta Timur': 'DKI Jakarta',
  'Kepulauan Seribu': 'DKI Jakarta',

  // BANTEN
  'Serang': 'Banten',
  'Cilegon': 'Banten',
  'Tangerang': 'Banten',
  'Tangerang Selatan': 'Banten',
  'Pandeglang': 'Banten',
  'Lebak': 'Banten',

  // JAWA BARAT
  'Bandung': 'Jawa Barat',
  'Bekasi': 'Jawa Barat',
  'Bogor': 'Jawa Barat',
  'Depok': 'Jawa Barat',
  'Cimahi': 'Jawa Barat',
  'Cirebon': 'Jawa Barat',
  'Sukabumi': 'Jawa Barat',
  'Tasikmalaya': 'Jawa Barat',
  'Banjar': 'Jawa Barat',
  'Garut': 'Jawa Barat',
  'Karawang': 'Jawa Barat',
  'Purwakarta': 'Jawa Barat',
  'Subang': 'Jawa Barat',
  'Sumedang': 'Jawa Barat',
  'Cianjur': 'Jawa Barat',
  'Majalengka': 'Jawa Barat',
  'Kuningan': 'Jawa Barat',
  'Indramayu': 'Jawa Barat',

  // JAWA TENGAH
  'Semarang': 'Jawa Tengah',
  'Surakarta': 'Jawa Tengah',
  'Solo': 'Jawa Tengah',
  'Salatiga': 'Jawa Tengah',
  'Magelang': 'Jawa Tengah',
  'Pekalongan': 'Jawa Tengah',
  'Tegal': 'Jawa Tengah',
  'Kudus': 'Jawa Tengah',
  'Jepara': 'Jawa Tengah',
  'Demak': 'Jawa Tengah',
  'Kendal': 'Jawa Tengah',
  'Purworejo': 'Jawa Tengah',
  'Kebumen': 'Jawa Tengah',
  'Cilacap': 'Jawa Tengah',
  'Banyumas': 'Jawa Tengah',
  'Purbalingga': 'Jawa Tengah',
  'Wonosobo': 'Jawa Tengah',
  'Boyolali': 'Jawa Tengah',
  'Klaten': 'Jawa Tengah',
  'Sragen': 'Jawa Tengah',
  'Karanganyar': 'Jawa Tengah',
  'Wonogiri': 'Jawa Tengah',
  'Blora': 'Jawa Tengah',
  'Rembang': 'Jawa Tengah',
  'Pati': 'Jawa Tengah',
  'Grobogan': 'Jawa Tengah',
  'Brebes': 'Jawa Tengah',
  'Pemalang': 'Jawa Tengah',
  'Batang': 'Jawa Tengah',
  'Temanggung': 'Jawa Tengah',
  'Banjarnegara': 'Jawa Tengah',

  // DI YOGYAKARTA
  'Yogyakarta': 'DI Yogyakarta',
  'Sleman': 'DI Yogyakarta',
  'Bantul': 'DI Yogyakarta',
  'Gunung Kidul': 'DI Yogyakarta',
  'Kulon Progo': 'DI Yogyakarta',

  // JAWA TIMUR
  'Surabaya': 'Jawa Timur',
  'Malang': 'Jawa Timur',
  'Batu': 'Jawa Timur',
  'Kediri': 'Jawa Timur',
  'Blitar': 'Jawa Timur',
  'Madiun': 'Jawa Timur',
  'Mojokerto': 'Jawa Timur',
  'Pasuruan': 'Jawa Timur',
  'Probolinggo': 'Jawa Timur',
  'Sidoarjo': 'Jawa Timur',
  'Gresik': 'Jawa Timur',
  'Lamongan': 'Jawa Timur',
  'Tuban': 'Jawa Timur',
  'Bojonegoro': 'Jawa Timur',
  'Ngawi': 'Jawa Timur',
  'Magetan': 'Jawa Timur',
  'Ponorogo': 'Jawa Timur',
  'Pacitan': 'Jawa Timur',
  'Trenggalek': 'Jawa Timur',
  'Tulungagung': 'Jawa Timur',
  'Nganjuk': 'Jawa Timur',
  'Jombang': 'Jawa Timur',
  'Bangkalan': 'Jawa Timur',
  'Sampang': 'Jawa Timur',
  'Pamekasan': 'Jawa Timur',
  'Sumenep': 'Jawa Timur',
  'Banyuwangi': 'Jawa Timur',
  'Jember': 'Jawa Timur',
  'Bondowoso': 'Jawa Timur',
  'Situbondo': 'Jawa Timur',
  'Lumajang': 'Jawa Timur',

  // BALI
  'Denpasar': 'Bali',
  'Badung': 'Bali',
  'Gianyar': 'Bali',
  'Tabanan': 'Bali',
  'Buleleng': 'Bali',
  'Karangasem': 'Bali',
  'Klungkung': 'Bali',
  'Bangli': 'Bali',
  'Jembrana': 'Bali',

  // NUSA TENGGARA BARAT
  'Mataram': 'Nusa Tenggara Barat',
  'Bima': 'Nusa Tenggara Barat',
  'Lombok Barat': 'Nusa Tenggara Barat',
  'Lombok Tengah': 'Nusa Tenggara Barat',
  'Lombok Timur': 'Nusa Tenggara Barat',
  'Sumbawa': 'Nusa Tenggara Barat',
  'Dompu': 'Nusa Tenggara Barat',

  // NUSA TENGGARA TIMUR
  'Kupang': 'Nusa Tenggara Timur',
  'Ende': 'Nusa Tenggara Timur',
  'Maumere': 'Nusa Tenggara Timur',
  'Flores Timur': 'Nusa Tenggara Timur',
  'Manggarai': 'Nusa Tenggara Timur',
  'Sumba Timur': 'Nusa Tenggara Timur',
  'Timor Tengah Selatan': 'Nusa Tenggara Timur',

  // KALIMANTAN BARAT
  'Pontianak': 'Kalimantan Barat',
  'Singkawang': 'Kalimantan Barat',
  'Ketapang': 'Kalimantan Barat',
  'Sambas': 'Kalimantan Barat',
  'Sanggau': 'Kalimantan Barat',
  'Sintang': 'Kalimantan Barat',

  // KALIMANTAN TENGAH
  'Palangkaraya': 'Kalimantan Tengah',
  'Kotawaringin Barat': 'Kalimantan Tengah',
  'Kotawaringin Timur': 'Kalimantan Tengah',
  'Kapuas': 'Kalimantan Tengah',
  'Barito Selatan': 'Kalimantan Tengah',

  // KALIMANTAN SELATAN
  'Banjarmasin': 'Kalimantan Selatan',
  'Banjarbaru': 'Kalimantan Selatan',
  'Banjar': 'Kalimantan Selatan',
  'Tanah Laut': 'Kalimantan Selatan',
  'Hulu Sungai Selatan': 'Kalimantan Selatan',
  'Hulu Sungai Tengah': 'Kalimantan Selatan',
  'Hulu Sungai Utara': 'Kalimantan Selatan',
  'Tabalong': 'Kalimantan Selatan',
  'Kotabaru': 'Kalimantan Selatan',

  // KALIMANTAN TIMUR
  'Samarinda': 'Kalimantan Timur',
  'Balikpapan': 'Kalimantan Timur',
  'Bontang': 'Kalimantan Timur',
  'Kutai Kartanegara': 'Kalimantan Timur',
  'Berau': 'Kalimantan Timur',
  'Paser': 'Kalimantan Timur',

  // KALIMANTAN UTARA
  'Tarakan': 'Kalimantan Utara',
  'Bulungan': 'Kalimantan Utara',
  'Malinau': 'Kalimantan Utara',
  'Nunukan': 'Kalimantan Utara',

  // SULAWESI UTARA
  'Manado': 'Sulawesi Utara',
  'Bitung': 'Sulawesi Utara',
  'Tomohon': 'Sulawesi Utara',
  'Kotamobagu': 'Sulawesi Utara',
  'Minahasa': 'Sulawesi Utara',
  'Bolaang Mongondow': 'Sulawesi Utara',

  // GORONTALO
  'Gorontalo': 'Gorontalo',
  'Bone Bolango': 'Gorontalo',

  // SULAWESI TENGAH
  'Palu': 'Sulawesi Tengah',
  'Donggala': 'Sulawesi Tengah',
  'Poso': 'Sulawesi Tengah',
  'Toli-Toli': 'Sulawesi Tengah',
  'Banggai': 'Sulawesi Tengah',

  // SULAWESI SELATAN
  'Makassar': 'Sulawesi Selatan',
  'Parepare': 'Sulawesi Selatan',
  'Palopo': 'Sulawesi Selatan',
  'Maros': 'Sulawesi Selatan',
  'Gowa': 'Sulawesi Selatan',
  'Bone': 'Sulawesi Selatan',
  'Wajo': 'Sulawesi Selatan',
  'Bulukumba': 'Sulawesi Selatan',
  'Pinrang': 'Sulawesi Selatan',
  'Luwu': 'Sulawesi Selatan',
  'Tana Toraja': 'Sulawesi Selatan',
  'Toraja Utara': 'Sulawesi Selatan',

  // SULAWESI BARAT
  'Mamuju': 'Sulawesi Barat',
  'Majene': 'Sulawesi Barat',
  'Polewali Mandar': 'Sulawesi Barat',

  // SULAWESI TENGGARA
  'Kendari': 'Sulawesi Tenggara',
  'Bau-Bau': 'Sulawesi Tenggara',
  'Konawe': 'Sulawesi Tenggara',
  'Kolaka': 'Sulawesi Tenggara',
  'Muna': 'Sulawesi Tenggara',
  'Buton': 'Sulawesi Tenggara',

  // MALUKU
  'Ambon': 'Maluku',
  'Tual': 'Maluku',
  'Maluku Tengah': 'Maluku',
  'Seram Bagian Barat': 'Maluku',
  'Kepulauan Aru': 'Maluku',

  // MALUKU UTARA
  'Ternate': 'Maluku Utara',
  'Tidore Kepulauan': 'Maluku Utara',
  'Halmahera Utara': 'Maluku Utara',
  'Halmahera Selatan': 'Maluku Utara',

  // PAPUA
  'Jayapura': 'Papua',
  'Merauke': 'Papua',
  'Biak Numfor': 'Papua',
  'Mimika': 'Papua',
  'Nabire': 'Papua',

  // PAPUA BARAT
  'Manokwari': 'Papua Barat',
  'Sorong': 'Papua Barat',
  'Fakfak': 'Papua Barat',
  'Raja Ampat': 'Papua Barat',

  // PAPUA SELATAN
  'Timika': 'Papua Selatan',

  // PAPUA TENGAH
  'Wamena': 'Papua Tengah',
  'Jayawijaya': 'Papua Tengah',

  // PAPUA PEGUNUNGAN
  'Puncak Jaya': 'Papua Pegunungan',

  // PAPUA BARAT DAYA
  'Kaimana': 'Papua Barat Daya',
  'Teluk Bintuni': 'Papua Barat Daya',
}

// Get sorted city list for dropdown
export const getCityList = () => {
  return Object.keys(cityProvinceData).sort((a, b) => a.localeCompare(b, 'id'))
}

// Get province from city
export const getProvinceByCity = (city) => {
  return cityProvinceData[city] || ''
}

// Get all unique provinces
export const getProvinceList = () => {
  return [...new Set(Object.values(cityProvinceData))].sort((a, b) => a.localeCompare(b, 'id'))
}

export default cityProvinceData
