'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NotificationModal from '@/components/ui/notification-modal';
import { useI18n } from '@/lib/i18n';
import supabase from '@/lib/supabase';

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

  return (
    <div className="space-y-4 pb-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('schoolFee.title')}</h1>
        <p className="text-gray-600 text-sm">{t('schoolFee.subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('schoolFee.filter')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>{t('schoolFee.unit')}</Label>
              <select className="w-full border rounded px-3 py-2" value={unitId} onChange={e=>setUnitId(e.target.value)}>
                <option value="">{t('schoolFee.selectUnit')}</option>
                {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('schoolFee.year')}</Label>
              <select className="w-full border rounded px-3 py-2" value={yearId} onChange={e=>setYearId(e.target.value)}>
                <option value="">{t('schoolFee.selectYear')}</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>
            {/* Auto-load on change; no manual button needed */}
          </div>
        </CardContent>
      </Card>

      {canLoad && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex gap-2">
                <Button type="button" className={tab==='school'? '' : 'bg-gray-600 hover:bg-gray-700'} onClick={()=>setTab('school')}>{t('schoolFee.tabs.school')}</Button>
                <Button type="button" className={tab==='udp'? '' : 'bg-gray-600 hover:bg-gray-700'} onClick={()=>setTab('udp')}>{t('schoolFee.tabs.udp')}</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tab==='school' ? (
              <div className="space-y-4">
                <div>
                  <Label>{t('schoolFee.school.default')}</Label>
                  <Input type="text" inputMode="numeric" value={sfDefault} onChange={e=>setSfDefault(presentIDR(e.target.value))} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {sfMonths.map((v, idx) => (
                    <div key={idx}>
                      <Label>{MONTHS_ID[idx]}</Label>
                      <Input type="text" inputMode="numeric" value={v} onChange={e=>{
                        const arr=[...sfMonths]; arr[idx]=presentIDR(e.target.value); setSfMonths(arr);
                      }} placeholder={t('schoolFee.school.placeholder')}/>
                    </div>
                  ))}
                </div>
                {/* Summary table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-2">{t('schoolFee.udp.month')}</th>
                        <th className="px-2 py-2">{t('schoolFee.udp.amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS_ID.map((m, i)=>{
                        const monthVal = sfMonths[i] !== '' ? toNumber(sfMonths[i]) : toNumber(sfDefault);
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-2">{i+1} - {m}</td>
                            <td className="px-2 py-2">{fmtThousands(String(monthVal))}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t font-semibold">
                        <td className="px-2 py-2">{t('schoolFee.school.total12')}</td>
                        <td className="px-2 py-2">
                          {fmtThousands(String(MONTHS_ID.reduce((sum, _m, i)=>{
                            const v = sfMonths[i] !== '' ? toNumber(sfMonths[i]) : toNumber(sfDefault);
                            return sum + v;
                          }, 0)))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={applyDefaultToEmpty}>{t('schoolFee.school.applyDefault')}</Button>
                  <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={saveSchoolFee} disabled={loading}>{t('schoolFee.school.save')}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>{t('schoolFee.udp.total')}</Label>
                    <Input type="text" inputMode="numeric" value={udpTotal} onChange={e=>setUdpTotal(presentIDR(e.target.value))} />
                  </div>
                  <div>
                    <Label>{t('schoolFee.udp.installments')}</Label>
                    <Input type="number" min="1" step="1" value={udpDefaultInst} onChange={e=>setUdpDefaultInst(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={distributeEqually}>{t('schoolFee.udp.distribute')}</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-2 w-20">{t('schoolFee.udp.seq')}</th>
                        <th className="px-2 py-2 w-40">{t('schoolFee.udp.month')}</th>
                        <th className="px-2 py-2 w-40">{t('schoolFee.udp.amount')}</th>
                        <th className="px-2 py-2 w-32">{t('schoolFee.udp.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {udpRows.map(r => (
                        <tr key={r.seq} className="border-t">
                          <td className="px-2 py-2">{r.seq}</td>
                          <td className="px-2 py-2">
                            <select className="border rounded px-2 py-1" value={r.month} onChange={e=>updateUdpRow(r.seq,{month:e.target.value})}>
                              <option value="">{t('schoolFee.udp.selectMonth')}</option>
                              {MONTHS_ID.map((m, i) => <option key={i+1} value={i+1}>{i+1} - {m}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <Input type="text" inputMode="numeric" value={r.amount} onChange={e=>updateUdpRow(r.seq,{amount: presentIDR(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <Button type="button" className="bg-gray-600 hover:bg-gray-700 text-xs" onClick={()=>removeUdpRow(r.seq)}>{t('roomMaster.delete')}</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {udpRows.length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-3 text-gray-500">{t('schoolFee.udp.empty')}</td></tr>
                      )}
                      {udpRows.length > 0 && (
                        <tr className="border-t font-semibold">
                          <td className="px-2 py-2" colSpan={2}>{t('schoolFee.udp.totalPlan')}</td>
                          <td className="px-2 py-2">{fmtThousands(String(udpRows.reduce((s, r)=> s + toNumber(r.amount), 0)))}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={addUdpRow}>{t('schoolFee.udp.addRow')}</Button>
                  <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={saveUDP} disabled={loading}>{t('schoolFee.udp.save')}</Button>
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
