
import { createClient } from '@supabase/supabase-js';
import { MaintenanceLog, Manual } from '../types';

// Função auxiliar para acessar env de forma segura no navegador
const getEnv = (key: string): string | undefined => {
  try {
    return (process.env as any)[key];
  } catch {
    return undefined;
  }
};

const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://placeholder-url.supabase.co';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isConfigured = () => {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');
  return url && url !== '' && key && key !== '';
};

export const dataService = {
  getLogs: async (): Promise<MaintenanceLog[]> => {
    if (!isConfigured()) {
      console.warn("Supabase não configurado.");
      return [];
    }
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveLog: async (log: Omit<MaintenanceLog, 'id' | 'date'>): Promise<void> => {
    if (!isConfigured()) throw new Error("Supabase não configurado.");
    const { error } = await supabase
      .from('maintenance_logs')
      .insert([{ ...log, date: new Date().toISOString() }]);
    if (error) throw error;
  },

  getManuals: async (): Promise<Manual[]> => {
    if (!isConfigured()) return [];
    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveManual: async (manual: Omit<Manual, 'id'>): Promise<Manual> => {
    if (!isConfigured()) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from('manuals')
      .insert([manual])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteManual: async (id: string): Promise<void> => {
    if (!isConfigured()) throw new Error("Supabase não configurado.");
    const { error } = await supabase.from('manuals').delete().eq('id', id);
    if (error) throw error;
  },

  findManualByModel: async (modelName: string): Promise<Manual | undefined> => {
    if (!isConfigured() || !modelName) return undefined;
    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .ilike('model', `%${modelName}%`)
      .limit(1);
    return error ? undefined : data?.[0];
  },

  uploadFile: async (file: File): Promise<{ file_url: string; file_name: string }> => {
    if (!isConfigured()) throw new Error("Supabase não configurado.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `manuals/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('tecnoloc_assets')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('tecnoloc_assets').getPublicUrl(filePath);
    return { file_url: data.publicUrl, file_name: file.name };
  }
};
