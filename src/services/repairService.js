import { supabase } from '../lib/supabase';

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export async function getRepairs() {
  const { data, error } = await supabase
    .from('repairs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRepairById(id) {
  const { data, error } = await supabase
    .from('repairs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNextRepairId() {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_json')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const prefix = data?.config_json?.auto_id_prefix || 'REP';
  const year = new Date().getFullYear();

  const { count } = await supabase
    .from('repairs')
    .select('*', { count: 'exact', head: true });

  return `${prefix}-${year}-${(count || 0) + 1}`;
}

export async function createRepair(formData) {
  const repairId = await getNextRepairId();
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    id: crypto.randomUUID(),
    repair_id: repairId,
    customer_name: formData.customerName || '',
    mof: formData.mof || '',
    phone: formData.phone || '',
    phone_norm: normalizePhone(formData.phone),
    address: formData.address || '',
    email: formData.email || '',
    website: formData.website || '',
    brand: formData.brand || '',
    model: formData.model || '',
    serial: formData.serial || '',
    condition: formData.condition || '',
    problem: formData.problem || '',
    device_notes: formData.deviceNotes || '',
    status: formData.status || 'Received',
    technician: formData.technician || '',
    technician_notes: formData.technicianNotes || '',
    warranty: formData.warranty ? parseInt(formData.warranty) : 0,
    price: formData.price ? parseFloat(formData.price) : 0,
    notes: formData.notes || '',
    date_in: formData.dateIn || today,
    date_out: formData.dateOut || null,
    is_corporate: formData.isCorporate || false,
    corporate_mof: formData.isCorporate ? (formData.corporateMof || null) : null,
    corporate_address: formData.isCorporate ? (formData.corporateAddress || null) : null,
    corporate_email: formData.isCorporate ? (formData.corporateEmail || null) : null,
    corporate_website: formData.isCorporate ? (formData.corporateWebsite || null) : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('repairs')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRepair(id, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  if ('phone' in updates) {
    payload.phone_norm = normalizePhone(updates.phone);
  }
  const { data, error } = await supabase
    .from('repairs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRepair(id) {
  const { error } = await supabase.from('repairs').delete().eq('id', id);
  if (error) throw error;
}

export async function getSystemConfig() {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_json')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.config_json || {};
}

export async function getTechnicians() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role')
    .order('username');
  if (error) throw error;
  return data || [];
}
