
import { createClient } from '@supabase/supabase-js';
import { MaintenanceLog, Manual } from '../types';

// Use placeholders to prevent createClient from throwing "supabaseUrl is required"
const SUPABASE_URL = (process.env as any).SUPABASE_URL || 'https://placeholder-url.supabase.co';
const SUPABASE_ANON_KEY = (process.env as any).SUPABASE_ANON_KEY || 'placeholder-key';

// Initialize the client. It won't throw as long as URL is a valid string format.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isConfigured = () => {
  return (process.env as any).SUPABASE_URL && (process.env as any).SUPABASE_ANON_KEY;
};

export const dataService = {
  // Maintenance Logs
  getLogs: async (): Promise<MaintenanceLog[]> => {
    if (!isConfigured()) {
      console.warn("Supabase is not configured. Returning empty logs.");
      return [];
    }
    
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching logs from Supabase:", error);
      return [];
    }
    return data || [];
  },

  saveLog: async (log: Omit<MaintenanceLog, 'id' | 'date'>): Promise<void> => {
    if (!isConfigured()) throw new Error("Supabase is not configured.");

    const { error } = await supabase
      .from('maintenance_logs')
      .insert([{
        ...log,
        date: new Date().toISOString()
      }]);
    
    if (error) throw error;
  },

  // Manuals
  getManuals: async (): Promise<Manual[]> => {
    if (!isConfigured()) {
      console.warn("Supabase is not configured. Returning empty manuals.");
      return [];
    }

    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching manuals from Supabase:", error);
      return [];
    }
    return data || [];
  },

  saveManual: async (manual: Omit<Manual, 'id'>): Promise<Manual> => {
    if (!isConfigured()) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from('manuals')
      .insert([manual])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteManual: async (id: string): Promise<void> => {
    if (!isConfigured()) throw new Error("Supabase is not configured.");

    const { error } = await supabase
      .from('manuals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  findManualByModel: async (modelName: string): Promise<Manual | undefined> => {
    if (!isConfigured() || !modelName) return undefined;

    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .ilike('model', `%${modelName}%`)
      .limit(1);
    
    if (error) return undefined;
    return data?.[0];
  },

  // Storage
  uploadFile: async (file: File): Promise<{ file_url: string; file_name: string }> => {
    if (!isConfigured()) throw new Error("Supabase is not configured.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `manuals/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tecnoloc_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('tecnoloc_assets')
      .getPublicUrl(filePath);

    return {
      file_url: data.publicUrl,
      file_name: file.name
    };
  }
};
