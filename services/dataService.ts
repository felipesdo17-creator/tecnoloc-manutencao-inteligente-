
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { MaintenanceLog, Manual } from '../types.ts';

const getCredential = (key: string): string | undefined => {
  try {
    // Acesso seguro ao process.env para evitar erros de build em ambientes não-node
    let envValue = undefined;
    if (typeof process !== 'undefined' && process.env) {
      envValue = (process.env as any)[key];
    }
    
    if (envValue && envValue !== '') return envValue;
    
    // Fallback: Local Storage (apenas se não houver no ambiente)
    const localValue = localStorage.getItem(key);
    if (localValue && localValue !== '') return localValue;
  } catch {
    return undefined;
  }
  return undefined;
};

let supabaseInstance: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = getCredential('SUPABASE_URL');
  const key = getCredential('SUPABASE_ANON_KEY');

  if (!url || !url.startsWith('https://') || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (error) {
    console.error("Erro crítico ao inicializar Supabase:", error);
    return null;
  }
};

const isConfigured = () => {
  const url = getCredential('SUPABASE_URL');
  const key = getCredential('SUPABASE_ANON_KEY');
  return !!(url && key);
};

export const dataService = {
  isConfigured,
  
  // Auth Methods
  signIn: async (email: string, pass: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Backend não configurado. Verifique as variáveis de ambiente no Vercel (SUPABASE_URL e SUPABASE_ANON_KEY).");
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  },

  signUp: async (email: string, pass: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Backend não configurado.");
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    window.location.href = '#/login';
  },

  getCurrentUser: async (): Promise<User | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  setSupabaseCredentials: (url: string, key: string) => {
    localStorage.setItem('SUPABASE_URL', url.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', key.trim());
  },

  // Data Methods
  getLogs: async (): Promise<MaintenanceLog[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('maintenance_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveLog: async (log: Omit<MaintenanceLog, 'id' | 'date'>): Promise<void> => {
    const sb = getSupabase();
    if (!sb) throw new Error("Configuração incompleta.");
    const { error } = await sb
      .from('maintenance_logs')
      .insert([{ ...log, date: new Date().toISOString() }]);
    if (error) throw error;
  },

  getManuals: async (): Promise<Manual[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('manuals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveManual: async (manual: Omit<Manual, 'id'>): Promise<Manual> => {
    const sb = getSupabase();
    if (!sb) throw new Error("Configuração incompleta.");
    const { data, error } = await sb
      .from('manuals')
      .insert([manual])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteManual: async (id: string): Promise<void> => {
    const sb = getSupabase();
    if (!sb) throw new Error("Configuração incompleta.");
    const { error } = await sb.from('manuals').delete().eq('id', id);
    if (error) throw error;
  },

  findManualByModel: async (modelName: string): Promise<Manual | undefined> => {
    const sb = getSupabase();
    if (!sb || !modelName) return undefined;
    const { data, error } = await sb
      .from('manuals')
      .select('*')
      .ilike('model', `%${modelName}%`)
      .limit(1);
    return error ? undefined : data?.[0];
  },

  uploadFile: async (file: File): Promise<{ file_url: string; file_name: string }> => {
    const sb = getSupabase();
    if (!sb) throw new Error("Configuração incompleta.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `manuals/${fileName}`;
    const { error: uploadError } = await sb.storage
      .from('tecnoloc_assets')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = sb.storage.from('tecnoloc_assets').getPublicUrl(filePath);
    return { file_url: data.publicUrl, file_name: file.name };
  }
};
