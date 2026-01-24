// Convert number to Indonesian words (Terbilang)
export function terbilang(angka) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas'
  ];

  if (angka < 12) return bilangan[angka];
  if (angka < 20) return bilangan[angka - 10] + ' Belas';
  if (angka < 100) {
    return bilangan[Math.floor(angka / 10)] + ' Puluh ' + bilangan[angka % 10];
  }
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
  if (angka < 1000) {
    return bilangan[Math.floor(angka / 100)] + ' Ratus ' + terbilang(angka % 100);
  }
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
  if (angka < 1000000) {
    return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  }
  if (angka < 1000000000) {
    return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  }
  if (angka < 1000000000000) {
    return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
  }
  return terbilang(Math.floor(angka / 1000000000000)) + ' Triliun ' + terbilang(angka % 1000000000000);
}

export function formatTerbilang(nominal) {
  const rupiah = Math.floor(nominal);
  const terbilangText = terbilang(rupiah);
  return terbilangText.trim() + ' Rupiah';
}
