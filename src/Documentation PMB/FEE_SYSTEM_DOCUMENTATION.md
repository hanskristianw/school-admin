# 💰 Fee System Documentation (UDP & USEK)

## 📋 Overview
Sistem pembayaran sekolah yang mendukung:
- **USEK (Uang Sekolah)**: Biaya bulanan per unit & tahun ajaran
- **UDP (Uang Daftar & Pengembangan)**: Biaya sekali bayar dengan opsi cicilan
- **Sistem Diskon**: Potongan persentase atau nominal tetap
- **Payment Tracking**: Tracking pembayaran per siswa

---

## 🗄️ Database Tables

### 1. `school_fee_definition`
Definisi biaya sekolah bulanan (USEK).

**Columns:**
- `fee_def_id`: Primary key
- `unit_id`: FK ke tabel `unit`
- `year_id`: FK ke tabel `year`
- `default_amount`: Biaya default untuk semua bulan
- `monthly_amounts`: Array 12 elemen untuk override per-bulan (NULL = pakai default)
- `is_active`: Status aktif/non-aktif
- `effective_from`, `effective_until`: Periode berlaku
- `notes`: Catatan tambahan
- `created_by`, `updated_by`: Audit trail

**Unique Constraint:** `(unit_id, year_id)` - satu unit hanya punya 1 definisi fee per tahun ajaran

**Example:**
```sql
-- USEK SD = Rp 1.500.000/bulan
INSERT INTO school_fee_definition (unit_id, year_id, default_amount, is_active)
VALUES (1, 1, 1500000, true);

-- USEK SMP = Rp 2.000.000/bulan, tapi Desember dan Januari gratis
INSERT INTO school_fee_definition (
  unit_id, year_id, default_amount, 
  monthly_amounts, is_active
) VALUES (
  2, 1, 2000000, 
  ARRAY[0, 0, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 0],
  true
);
-- Index array: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
```

---

### 2. `udp_definition`
Definisi UDP (Uang Daftar & Pengembangan).

**Columns:**
- `udp_def_id`: Primary key
- `unit_id`: FK ke tabel `unit`
- `year_id`: FK ke tabel `year`
- `total_amount`: Total biaya UDP
- `default_installments`: Jumlah cicilan default (opsional)
- `is_active`: Status aktif/non-aktif
- `effective_from`, `effective_until`: Periode berlaku
- `notes`: Catatan tambahan

**Example:**
```sql
-- UDP SD = Rp 15.000.000 (bisa dicicil 3x)
INSERT INTO udp_definition (unit_id, year_id, total_amount, default_installments, is_active)
VALUES (1, 1, 15000000, 3, true);
```

---

### 3. `udp_installment_plan`
Rencana cicilan UDP per bulan.

**Columns:**
- `plan_id`: Primary key
- `udp_def_id`: FK ke `udp_definition`
- `seq`: Urutan cicilan (1, 2, 3, ...)
- `month`: Bulan jatuh tempo (1=Jan, 12=Des)
- `amount`: Nominal cicilan
- `due_date`: Tanggal jatuh tempo spesifik (opsional)

**Validation:**
- `SUM(amount)` untuk semua installment harus = `udp_definition.total_amount`
- Setiap `month` harus unique per `udp_def_id`

**Example:**
```sql
-- UDP Rp 15.000.000 dicicil 3x
-- Cicilan 1: Mei Rp 5.000.000
-- Cicilan 2: Juli Rp 5.000.000
-- Cicilan 3: September Rp 5.000.000
INSERT INTO udp_installment_plan (udp_def_id, seq, month, amount) VALUES
(1, 1, 5, 5000000),  -- Mei
(1, 2, 7, 5000000),  -- Juli
(1, 3, 9, 5000000);  -- September
```

---

### 4. `fee_discount`
Sistem potongan/diskon untuk UDP dan USEK.

**Columns:**
- `discount_id`: Primary key
- `unit_id`, `year_id`: Scope diskon
- `discount_code`: Kode unik (misal: `SIBLING10`, `EARLYBIRD`)
- `discount_name`: Nama diskon
- `discount_type`: `'percentage'` atau `'fixed'`
- `discount_value`: Nilai diskon (0-100 untuk persen, nominal untuk fixed)
- `applies_to`: `'udp'`, `'usek'`, atau `'both'`
- `valid_from`, `valid_until`: Periode berlaku
- `max_usage`: Limit penggunaan (NULL = unlimited)
- `current_usage`: Jumlah sudah dipakai
- `conditions`: Kondisi tambahan dalam format JSON
- `is_active`: Status aktif

**Example:**
```sql
-- Diskon 10% untuk anak kedua (sibling)
INSERT INTO fee_discount (
  unit_id, year_id, discount_code, discount_name,
  discount_type, discount_value, applies_to, is_active
) VALUES (
  1, 1, 'SIBLING10', 'Potongan Anak Kedua 10%',
  'percentage', 10, 'both', true
);

-- Early bird Rp 500.000 (hanya untuk UDP)
INSERT INTO fee_discount (
  unit_id, year_id, discount_code, discount_name,
  discount_type, discount_value, applies_to, 
  valid_from, valid_until, max_usage, is_active
) VALUES (
  1, 1, 'EARLYBIRD', 'Early Bird Rp 500K',
  'fixed', 500000, 'udp',
  '2025-01-01', '2025-06-30', 100, true
);

-- Beasiswa penuh (100%)
INSERT INTO fee_discount (
  unit_id, year_id, discount_code, discount_name,
  discount_type, discount_value, applies_to, is_active
) VALUES (
  1, 1, 'SCHOLARSHIP100', 'Beasiswa Penuh',
  'percentage', 100, 'both', true
);
```

---

### 5. `student_fee_payment`
Tracking pembayaran aktual per siswa.

**Columns:**
- `payment_id`: Primary key
- `student_id`: ID siswa (bisa dari `users` atau `student_applications`)
- `student_name`: Nama siswa
- `unit_id`, `year_id`: Unit & tahun ajaran
- `fee_type`: `'udp'` atau `'usek'`
- `payment_period`: Periode pembayaran (misal: `'Month 1'`, `'Cicilan 1'`)
- `base_amount`: Nominal dasar (sebelum diskon)
- `discount_amount`: Nominal diskon
- `final_amount`: Nominal akhir (base - discount)
- `discount_id`: FK ke `fee_discount` (jika pakai diskon)
- `payment_date`: Tanggal bayar
- `payment_method`: Metode pembayaran (`'transfer'`, `'cash'`, etc)
- `payment_proof_url`: URL bukti transfer
- `status`: `'pending'`, `'paid'`, `'confirmed'`, `'cancelled'`

**Example:**
```sql
-- Bayar USEK bulan Januari siswa A (dengan diskon sibling 10%)
INSERT INTO student_fee_payment (
  student_id, student_name, unit_id, year_id,
  fee_type, payment_period,
  base_amount, discount_amount, final_amount,
  discount_id, payment_date, payment_method, status
) VALUES (
  123, 'Andi Wijaya', 1, 1,
  'usek', 'Month 1',
  1500000, 150000, 1350000,
  1, '2025-01-10', 'transfer', 'paid'
);

-- Bayar UDP cicilan 1 siswa B (tanpa diskon)
INSERT INTO student_fee_payment (
  student_id, student_name, unit_id, year_id,
  fee_type, payment_period,
  base_amount, discount_amount, final_amount,
  payment_date, payment_method, status
) VALUES (
  456, 'Budi Santoso', 1, 1,
  'udp', 'Cicilan 1',
  5000000, 0, 5000000,
  '2025-05-15', 'cash', 'confirmed'
);
```

---

## 📊 Helper Views

### `v_school_fee_monthly`
View untuk melihat fee bulanan dengan fallback ke default.

```sql
SELECT * FROM v_school_fee_monthly 
WHERE unit_id = 1 AND year_id = 1;

-- Output:
-- fee_def_id | unit_id | unit_name | year_id | year_name | month | amount    | is_active
-- -----------+---------+-----------+---------+-----------+-------+-----------+-----------
-- 1          | 1       | SD        | 1       | 2025/2026 | 1     | 1500000   | true
-- 1          | 1       | SD        | 1       | 2025/2026 | 2     | 1500000   | true
-- ...        | ...     | ...       | ...     | ...       | 12    | 1500000   | true
```

### `v_active_fees_summary`
Ringkasan fee aktif per unit dan tahun ajaran.

```sql
SELECT * FROM v_active_fees_summary;

-- Output: unit, year, usek_default, udp_total, installment_count
```

### `v_active_discounts`
Daftar diskon yang masih aktif dan bisa digunakan.

```sql
SELECT * FROM v_active_discounts WHERE unit_id = 1;

-- Output: discount_code, discount_name, discount_type, discount_value, remaining_usage
```

---

## 🔧 Business Logic

### Menghitung Diskon
```sql
-- Function untuk calculate discount amount
CREATE OR REPLACE FUNCTION calculate_discount(
  p_base_amount NUMERIC,
  p_discount_type VARCHAR,
  p_discount_value NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF p_discount_type = 'percentage' THEN
    RETURN ROUND(p_base_amount * (p_discount_value / 100), 0);
  ELSIF p_discount_type = 'fixed' THEN
    RETURN LEAST(p_discount_value, p_base_amount); -- Tidak boleh lebih dari base
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage:
SELECT calculate_discount(1500000, 'percentage', 10); -- 150000
SELECT calculate_discount(1500000, 'fixed', 500000);   -- 500000
```

### Auto-increment Discount Usage
```sql
-- Trigger untuk auto-increment current_usage saat payment dibuat dengan discount
CREATE OR REPLACE FUNCTION increment_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discount_id IS NOT NULL THEN
    UPDATE fee_discount 
    SET current_usage = current_usage + 1
    WHERE discount_id = NEW.discount_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_discount_usage
  AFTER INSERT ON student_fee_payment
  FOR EACH ROW
  EXECUTE FUNCTION increment_discount_usage();
```

### Validasi Discount Availability
```sql
-- Function untuk cek apakah discount masih bisa dipakai
CREATE OR REPLACE FUNCTION is_discount_available(p_discount_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_discount RECORD;
BEGIN
  SELECT * INTO v_discount FROM fee_discount WHERE discount_id = p_discount_id;
  
  -- Check if discount exists and active
  IF NOT FOUND OR NOT v_discount.is_active THEN
    RETURN FALSE;
  END IF;
  
  -- Check validity dates
  IF v_discount.valid_from IS NOT NULL AND CURRENT_DATE < v_discount.valid_from THEN
    RETURN FALSE;
  END IF;
  
  IF v_discount.valid_until IS NOT NULL AND CURRENT_DATE > v_discount.valid_until THEN
    RETURN FALSE;
  END IF;
  
  -- Check usage limit
  IF v_discount.max_usage IS NOT NULL AND v_discount.current_usage >= v_discount.max_usage THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Usage:
SELECT is_discount_available(1); -- true/false
```

---

## 🎯 Common Queries

### 1. Get Fee untuk Unit & Year tertentu
```sql
SELECT 
  u.unit_name,
  y.year_name,
  sfd.default_amount AS usek_per_month,
  ud.total_amount AS udp_total,
  ud.default_installments
FROM unit u
INNER JOIN year y ON y.year_id = 1
LEFT JOIN school_fee_definition sfd ON sfd.unit_id = u.unit_id AND sfd.year_id = y.year_id
LEFT JOIN udp_definition ud ON ud.unit_id = u.unit_id AND ud.year_id = y.year_id
WHERE u.unit_id = 1;
```

### 2. Get Installment Plan untuk UDP
```sql
SELECT 
  uip.seq,
  uip.month,
  TO_CHAR(TO_DATE(uip.month::TEXT, 'MM'), 'Month') AS month_name,
  uip.amount,
  uip.due_date
FROM udp_installment_plan uip
WHERE uip.udp_def_id = 1
ORDER BY uip.seq;
```

### 3. Get Discounts Available untuk Unit & Year
```sql
SELECT 
  discount_code,
  discount_name,
  discount_type,
  discount_value,
  applies_to,
  valid_from,
  valid_until,
  remaining_usage
FROM v_active_discounts
WHERE unit_id = 1 AND year_id = 1
ORDER BY discount_code;
```

### 4. Calculate Total Payment dengan Discount
```sql
WITH base AS (
  SELECT 1500000 AS base_amount, -- USEK bulan 1
         1 AS discount_id
),
discount_info AS (
  SELECT 
    b.base_amount,
    d.discount_type,
    d.discount_value,
    calculate_discount(b.base_amount, d.discount_type, d.discount_value) AS discount_amount
  FROM base b
  LEFT JOIN fee_discount d ON d.discount_id = b.discount_id
)
SELECT 
  base_amount,
  discount_type,
  discount_value,
  discount_amount,
  base_amount - discount_amount AS final_amount
FROM discount_info;
```

### 5. Student Payment History
```sql
SELECT 
  sfp.payment_date,
  sfp.fee_type,
  sfp.payment_period,
  sfp.base_amount,
  sfp.discount_amount,
  sfp.final_amount,
  sfp.payment_method,
  sfp.status,
  fd.discount_code,
  fd.discount_name
FROM student_fee_payment sfp
LEFT JOIN fee_discount fd ON fd.discount_id = sfp.discount_id
WHERE sfp.student_id = 123
ORDER BY sfp.payment_date DESC;
```

### 6. Monthly Revenue Report
```sql
SELECT 
  DATE_TRUNC('month', payment_date) AS month,
  fee_type,
  COUNT(*) AS payment_count,
  SUM(base_amount) AS total_base,
  SUM(discount_amount) AS total_discount,
  SUM(final_amount) AS total_revenue
FROM student_fee_payment
WHERE status IN ('paid', 'confirmed')
  AND unit_id = 1
  AND year_id = 1
  AND payment_date >= '2025-01-01'
GROUP BY DATE_TRUNC('month', payment_date), fee_type
ORDER BY month, fee_type;
```

---

## 🚀 Frontend Integration Examples

### Load Fee Definition
```javascript
// Get USEK & UDP for specific unit & year
const { data: schoolFee } = await supabase
  .from('school_fee_definition')
  .select('*')
  .eq('unit_id', unitId)
  .eq('year_id', yearId)
  .eq('is_active', true)
  .single();

const { data: udp } = await supabase
  .from('udp_definition')
  .select('*, udp_installment_plan(*)')
  .eq('unit_id', unitId)
  .eq('year_id', yearId)
  .eq('is_active', true)
  .single();
```

### Get Available Discounts
```javascript
const { data: discounts } = await supabase
  .from('v_active_discounts')
  .select('*')
  .eq('unit_id', unitId)
  .eq('year_id', yearId);
```

### Create Payment with Discount
```javascript
const payment = {
  student_id: 123,
  student_name: 'Andi Wijaya',
  unit_id: 1,
  year_id: 1,
  fee_type: 'usek',
  payment_period: 'Month 1',
  base_amount: 1500000,
  discount_amount: 150000, // 10% sibling discount
  final_amount: 1350000,
  discount_id: 1,
  payment_date: '2025-01-10',
  payment_method: 'transfer',
  status: 'paid',
  created_by: currentUserId
};

const { data, error } = await supabase
  .from('student_fee_payment')
  .insert([payment]);
```

---

## ✅ Migration Checklist

1. ✅ Backup existing `supabase-migration-fees.sql` data
2. ✅ Run `improved-fee-system.sql` migration
3. ✅ Verify tables created:
   - `school_fee_definition`
   - `udp_definition`
   - `udp_installment_plan`
   - `fee_discount` (NEW)
   - `student_fee_payment` (NEW)
4. ✅ Update frontend `/data/school-fee/page.jsx` untuk support discount
5. ✅ Create discount management page (opsional)
6. ✅ Update payment flow untuk apply discount

---

## 📝 Notes

- **Audit Trail**: Semua tabel punya `created_by`, `updated_by`, `created_at`, `updated_at`
- **Soft Delete**: Gunakan `is_active = false` daripada DELETE
- **Constraints**: `final_amount = base_amount - discount_amount` dijaga otomatis
- **RLS**: Policies saat ini masih development mode (broad access), perlu di-tighten untuk production
- **Indexes**: Sudah optimized untuk query by `unit_id`, `year_id`, `student_id`

---

## 🔗 Related Files

- Migration: `/migrations/improved-fee-system.sql`
- Frontend: `/src/app/data/school-fee/page.jsx`
- Original: `/migrations/supabase-migration-fees.sql` (backup)
