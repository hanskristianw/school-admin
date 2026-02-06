'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NotificationModal from '@/components/ui/notification-modal';
import { useI18n } from '@/lib/i18n';
import supabase from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSackDollar, 
  faSchool, 
  faCalendar, 
  faMoneyBillWave,
  faPlus,
  faTrash,
  faSync,
  faSave,
  faCheckCircle,
  faSpinner,
  faReceipt,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';

const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// Currency helpers (IDR style: thousand separator '.')
const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const fmtThousands = (digits) => {
  if (!digits) return '';
  // remove leading zeros
  const cleaned = digits.replace(/^0+(?!$)/, '');
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const presentIDR = (s) => fmtThousands(onlyDigits(s));
const toNumber = (s) => {
  const d = onlyDigits(s);
  return d ? Number(d) : 0;
};

export default function SchoolFeePage() {
  const { t } = useI18n();
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [yearId, setYearId] = useState('');
  const [tab, setTab] = useState('school'); // 'school' | 'udp'
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  // School fee state
  const [sfId, setSfId] = useState(null);
  const [sfDefault, setSfDefault] = useState('0');
  const [sfMonths, setSfMonths] = useState(Array(12).fill(''));

  // UDP state
  const [udpId, setUdpId] = useState(null);
  const [udpTotal, setUdpTotal] = useState('0');
  const [udpDefaultInst, setUdpDefaultInst] = useState('');
  const [udpRows, setUdpRows] = useState([]); // {seq, month, amount}

  const canLoad = useMemo(() => unitId && yearId, [unitId, yearId]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.from('unit').select('unit_id, unit_name, is_school').eq('is_school', true).order('unit_name');
      setUnits(u || []);
      const { data: y } = await supabase.from('year').select('year_id, year_name').order('year_name');
      setYears(y || []);
    })();
  }, []);

  useEffect(() => {
    if (!unitId || !yearId) return;
    loadSchoolFee();
    loadUDP();
  }, [unitId, yearId]);

  const show = (title, message, type='success') => setNotif({ isOpen: true, title, message, type });

  const loadSchoolFee = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('school_fee_definition').select('*').eq('unit_id', Number(unitId)).eq('year_id', Number(yearId)).maybeSingle();
      if (data) {
        setSfId(data.fee_def_id);
  setSfDefault(presentIDR(String(data.default_amount ?? '0')));
  const arr = (data.monthly_amounts || []).map(v => v == null ? '' : presentIDR(String(v)));
        setSfMonths(arr.length === 12 ? arr : Array(12).fill('').map((_,i)=>arr[i]??''));
      } else {
        setSfId(null);
        setSfDefault('');
        setSfMonths(Array(12).fill(''));
      }
    } catch (e) {
      show(t('schoolFee.title'), t('schoolFee.messages.loadSchoolFeeError') + e.message, 'error');
    } finally { setLoading(false); }
  };

  const applyDefaultToEmpty = () => {
  setSfMonths(prev => prev.map(v => v === '' ? sfDefault : v));
  };

  const saveSchoolFee = async () => {
    if (!canLoad) return;
    setLoading(true);
    try {
      const monthly = sfMonths.map(v => (v === '' ? null : toNumber(v)));
      const payload = {
        unit_id: Number(unitId),
        year_id: Number(yearId),
        default_amount: toNumber(sfDefault),
        monthly_amounts: monthly
      };
      if (sfId) {
        const { error } = await supabase.from('school_fee_definition').update({ ...payload, updated_at: new Date().toISOString() }).eq('fee_def_id', sfId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('school_fee_definition').insert([payload]).select().single();
        if (error) throw error;
        setSfId(data.fee_def_id);
      }
      show(t('schoolFee.title'), t('schoolFee.messages.saveSuccess'));
    } catch (e) {
      show(t('schoolFee.title'), t('schoolFee.messages.saveError') + (e?.message || e), 'error');
    } finally { setLoading(false); }
  };

  const loadUDP = async () => {
    try {
      const { data: def } = await supabase.from('udp_definition').select('*').eq('unit_id', Number(unitId)).eq('year_id', Number(yearId)).maybeSingle();
      if (def) {
        setUdpId(def.udp_def_id);
  setUdpTotal(presentIDR(String(def.total_amount ?? '0')));
  setUdpDefaultInst(def.default_installments ? String(def.default_installments) : '');
  const { data: plans } = await supabase.from('udp_installment_plan').select('*').eq('udp_def_id', def.udp_def_id).order('seq');
  setUdpRows((plans||[]).map(p => ({ seq: p.seq, month: p.month, amount: presentIDR(String(p.amount)) })));
      } else {
        setUdpId(null);
        setUdpTotal('0');
        setUdpDefaultInst('');
        setUdpRows([]);
      }
    } catch (e) {
      show('UDP', t('schoolFee.messages.loadUdpError') + e.message, 'error');
    }
  };

  const addUdpRow = () => {
    const nextSeq = (udpRows[udpRows.length-1]?.seq || 0) + 1;
    setUdpRows([...udpRows, { seq: nextSeq, month: '', amount: '' }]);
  };
  const removeUdpRow = (seq) => setUdpRows(udpRows.filter(r => r.seq !== seq));
  const updateUdpRow = (seq, patch) => setUdpRows(udpRows.map(r => r.seq === seq ? { ...r, ...patch } : r));

  const distributeEqually = () => {
    const n = parseInt(udpDefaultInst || '0', 10);
    const tot = toNumber(udpTotal);
  if (!n || n < 1) { show(t('schoolFee.title'), t('schoolFee.messages.fillInstallments')); return; }
    const base = Math.floor((tot / n)); // integer IDR
    const rows = [];
    let acc = 0;
    for (let i=1;i<=n;i++) { rows.push({ seq: i, month: i, amount: presentIDR(String(base)) }); acc += base; }
    const rem = (tot - acc);
    if (rem !== 0 && rows.length > 0) {
      rows[rows.length-1].amount = presentIDR(String(toNumber(rows[rows.length-1].amount) + rem));
    }
    setUdpRows(rows);
  };

  const validateUdp = () => {
    const used = new Set();
    let sum = 0;
    for (const r of udpRows) {
      const m = parseInt(r.month, 10);
  const a = toNumber(r.amount || 0);
      if (!m || m < 1 || m > 12) return 'Bulan harus 1-12';
      if (used.has(m)) return 'Bulan duplikat';
      used.add(m);
      if (a < 0) return 'Nominal tidak boleh negatif';
      sum = Math.round((sum + a)*100)/100;
    }
  const tot = toNumber(udpTotal);
    if (sum !== tot) return 'Total cicilan harus sama dengan total UDP';
    return null;
  };

  const saveUDP = async () => {
    if (!canLoad) return;
    const v = validateUdp();
    if (v) { show('Validasi', v, 'error'); return; }
    setLoading(true);
    try {
      const defPayload = {
        unit_id: Number(unitId),
        year_id: Number(yearId),
  total_amount: toNumber(udpTotal),
        default_installments: udpDefaultInst ? Number(udpDefaultInst) : null
      };
      let defId = udpId;
      if (defId) {
        const { error } = await supabase.from('udp_definition').update({ ...defPayload, updated_at: new Date().toISOString() }).eq('udp_def_id', defId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('udp_definition').insert([defPayload]).select().single();
        if (error) throw error;
        defId = data.udp_def_id;
        setUdpId(defId);
      }
      // Replace plans
      await supabase.from('udp_installment_plan').delete().eq('udp_def_id', defId);
      if (udpRows.length > 0) {
  const payload = udpRows.map(r => ({ udp_def_id: defId, seq: r.seq, month: Number(r.month), amount: toNumber(r.amount) }));
        const { error: insErr } = await supabase.from('udp_installment_plan').insert(payload);
        if (insErr) throw insErr;
      }
      show('UDP', t('schoolFee.messages.udpSaveSuccess'));
    } catch (e) {
      show('UDP', t('schoolFee.messages.udpSaveError') + (e?.message || e), 'error');
    } finally { setLoading(false); }
  };

  // Calculate totals for summary cards
  const usekTotal = useMemo(() => {
    return MONTHS_ID.reduce((sum, _m, i) => {
      const v = sfMonths[i] !== '' ? toNumber(sfMonths[i]) : toNumber(sfDefault);
      return sum + v;
    }, 0);
  }, [sfMonths, sfDefault]);

  const udpPlanTotal = useMemo(() => {
    return udpRows.reduce((s, r) => s + toNumber(r.amount), 0);
  }, [udpRows]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faSackDollar} className="text-xl text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('schoolFee.title')}</h1>
          </div>
          <p className="text-gray-600 text-sm pl-[52px]">{t('schoolFee.subtitle')}</p>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FontAwesomeIcon icon={faSchool} className="text-blue-600" />
            {t('schoolFee.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faSchool} className="text-gray-500" />
                {t('schoolFee.unit')}
              </Label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={unitId} 
                onChange={e=>setUnitId(e.target.value)}
              >
                <option value="">{t('schoolFee.selectUnit')}</option>
                {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faCalendar} className="text-gray-500" />
                {t('schoolFee.year')}
              </Label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={yearId} 
                onChange={e=>setYearId(e.target.value)}
              >
                <option value="">{t('schoolFee.selectYear')}</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {canLoad && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total USEK (12 Bulan)</p>
                  <p className="text-2xl font-bold text-green-700">Rp {fmtThousands(String(usekTotal))}</p>
                  <p className="text-xs text-gray-500 mt-1">Per bulan: Rp {fmtThousands(String(Math.round(usekTotal / 12)))}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-2xl text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total UDP</p>
                  <p className="text-2xl font-bold text-purple-700">Rp {fmtThousands(String(toNumber(udpTotal)))}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {udpRows.length > 0 ? `${udpRows.length} cicilan` : 'Belum ada cicilan'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faReceipt} className="text-2xl text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {canLoad && (
        <Card className="shadow-lg">
          {/* Tab Headers */}
          <CardHeader className="border-b bg-gray-50">
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  tab === 'school'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setTab('school')}
              >
                <FontAwesomeIcon icon={faMoneyBillWave} />
                {t('schoolFee.tabs.school')}
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  tab === 'udp'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setTab('udp')}
              >
                <FontAwesomeIcon icon={faReceipt} />
                {t('schoolFee.tabs.udp')}
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {tab==='school' ? (
              <div className="space-y-6">
                {/* Default Amount */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Label className="flex items-center gap-2 text-green-900 mb-2">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-green-600" />
                    {t('schoolFee.school.default')}
                  </Label>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    value={sfDefault} 
                    onChange={e=>setSfDefault(presentIDR(e.target.value))}
                    className="text-lg font-semibold border-green-300 focus:ring-green-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-green-700 mt-2">
                    💡 Nilai ini akan diterapkan ke bulan yang belum diisi
                  </p>
                </div>

                {/* Monthly Override */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-lg font-semibold text-gray-900">Override Per Bulan (Opsional)</Label>
                    <Button 
                      type="button" 
                      size="sm"
                      variant="outline"
                      onClick={applyDefaultToEmpty}
                      className="text-sm"
                    >
                      <FontAwesomeIcon icon={faSync} className="mr-2" />
                      {t('schoolFee.school.applyDefault')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {sfMonths.map((v, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-green-400 transition-colors">
                        <Label className="text-xs text-gray-600 mb-1 block">{MONTHS_ID[idx]}</Label>
                        <Input 
                          type="text" 
                          inputMode="numeric" 
                          value={v} 
                          onChange={e=>{
                            const arr=[...sfMonths]; arr[idx]=presentIDR(e.target.value); setSfMonths(arr);
                          }} 
                          placeholder={t('schoolFee.school.placeholder')}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartLine} className="text-blue-600" />
                    Ringkasan USEK per Bulan
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm bg-white rounded-lg overflow-hidden">
                      <thead className="bg-gray-100">
                        <tr className="text-left text-gray-700">
                          <th className="px-4 py-3 font-semibold">{t('schoolFee.udp.month')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('schoolFee.udp.amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {MONTHS_ID.map((m, i)=>{
                          const monthVal = sfMonths[i] !== '' ? toNumber(sfMonths[i]) : toNumber(sfDefault);
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold mr-2">
                                  {i+1}
                                </span>
                                {m}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">Rp {fmtThousands(String(monthVal))}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-green-50 font-bold text-green-900">
                          <td className="px-4 py-4">{t('schoolFee.school.total12')}</td>
                          <td className="px-4 py-4 text-right text-lg">Rp {fmtThousands(String(usekTotal))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" 
                    onClick={saveSchoolFee} 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} />
                        {t('schoolFee.school.save')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* UDP Configuration */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-2 text-purple-900 mb-2">
                        <FontAwesomeIcon icon={faReceipt} className="text-purple-600" />
                        {t('schoolFee.udp.total')}
                      </Label>
                      <Input 
                        type="text" 
                        inputMode="numeric" 
                        value={udpTotal} 
                        onChange={e=>setUdpTotal(presentIDR(e.target.value))}
                        className="text-lg font-semibold border-purple-300 focus:ring-purple-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2 text-purple-900 mb-2">
                        <FontAwesomeIcon icon={faChartLine} className="text-purple-600" />
                        {t('schoolFee.udp.installments')}
                      </Label>
                      <Input 
                        type="number" 
                        min="1" 
                        step="1" 
                        value={udpDefaultInst} 
                        onChange={e=>setUdpDefaultInst(e.target.value)}
                        className="border-purple-300 focus:ring-purple-500"
                        placeholder="Jumlah cicilan"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={distributeEqually}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faSync} />
                        {t('schoolFee.udp.distribute')}
                      </Button>
                    </div>
                  </div>
                  {udpPlanTotal !== toNumber(udpTotal) && udpRows.length > 0 && (
                    <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3 text-sm text-red-800">
                      ⚠️ Total cicilan (Rp {fmtThousands(String(udpPlanTotal))}) tidak sama dengan total UDP (Rp {fmtThousands(String(toNumber(udpTotal)))})
                    </div>
                  )}
                </div>

                {/* Installment Plan Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="text-purple-600" />
                      Rencana Cicilan UDP
                    </h3>
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={addUdpRow}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      {t('schoolFee.udp.addRow')}
                    </Button>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr className="text-left text-gray-700">
                          <th className="px-4 py-3 font-semibold w-20">{t('schoolFee.udp.seq')}</th>
                          <th className="px-4 py-3 font-semibold">{t('schoolFee.udp.month')}</th>
                          <th className="px-4 py-3 font-semibold">{t('schoolFee.udp.amount')}</th>
                          <th className="px-4 py-3 font-semibold w-32 text-center">{t('schoolFee.udp.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {udpRows.map(r => (
                          <tr key={r.seq} className="hover:bg-purple-50">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold">
                                {r.seq}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                value={r.month} 
                                onChange={e=>updateUdpRow(r.seq,{month:e.target.value})}
                              >
                                <option value="">{t('schoolFee.udp.selectMonth')}</option>
                                {MONTHS_ID.map((m, i) => <option key={i+1} value={i+1}>{i+1} - {m}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <Input 
                                type="text" 
                                inputMode="numeric" 
                                value={r.amount} 
                                onChange={e=>updateUdpRow(r.seq,{amount: presentIDR(e.target.value)})}
                                className="border-gray-300 focus:ring-purple-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button 
                                type="button" 
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50" 
                                onClick={()=>removeUdpRow(r.seq)}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {udpRows.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              <FontAwesomeIcon icon={faReceipt} className="text-4xl text-gray-300 mb-2" />
                              <p>{t('schoolFee.udp.empty')}</p>
                              <p className="text-xs mt-1">Klik tombol "Tambah Cicilan" untuk memulai</p>
                            </td>
                          </tr>
                        )}
                        {udpRows.length > 0 && (
                          <tr className="bg-purple-50 font-bold text-purple-900">
                            <td className="px-4 py-4" colSpan={2}>{t('schoolFee.udp.totalPlan')}</td>
                            <td className="px-4 py-4 text-lg">Rp {fmtThousands(String(udpPlanTotal))}</td>
                            <td className="px-4 py-4 text-center">
                              {udpPlanTotal === toNumber(udpTotal) && udpRows.length > 0 && (
                                <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xl" />
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2" 
                    onClick={saveUDP} 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} />
                        {t('schoolFee.udp.save')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

  <NotificationModal isOpen={notif.isOpen} title={notif.title} message={notif.message} type={notif.type} onClose={()=>setNotif(p=>({...p,isOpen:false}))} />
    </div>
  );
}
