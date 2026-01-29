
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, History, ChevronRight, Zap, ClipboardCheck, LayoutDashboard, Settings, X, Database, Key } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Button, Input, Label, Card, CardContent } from '../components/UI';

const NavCard: React.FC<{
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'green' | 'orange' | 'blue';
}> = ({ to, title, description, icon, color }) => {
  const colorMap = {
    green: 'from-green-400 to-green-600 group-hover:shadow-green-500/20 border-green-400/50 text-green-400',
    orange: 'from-orange-400 to-orange-600 group-hover:shadow-orange-500/20 border-orange-400/50 text-orange-400',
    blue: 'from-blue-400 to-blue-600 group-hover:shadow-blue-500/20 border-blue-400/50 text-blue-400',
  };

  const gradientMap = {
    green: 'from-green-500/10',
    orange: 'from-orange-500/10',
    blue: 'from-blue-500/10',
  };

  return (
    <Link to={to} className="group">
      <div className={`relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:border-opacity-100 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:-translate-y-2 h-full ${colorMap[color].split(' ')[2]}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientMap[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
        <div className="relative p-8 flex flex-col h-full">
          <div className={`w-16 h-16 bg-gradient-to-br ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
          <p className="text-slate-200 mb-6 leading-relaxed flex-grow">
            {description}
          </p>
          <div className={`flex items-center font-medium group-hover:gap-3 gap-2 transition-all mt-auto ${colorMap[color].split(' ')[3]}`}>
            <span>Acessar</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const [showConfig, setShowConfig] = useState(!dataService.isConfigured());
  const [config, setConfig] = useState({
    url: localStorage.getItem('SUPABASE_URL') || '',
    key: localStorage.getItem('SUPABASE_ANON_KEY') || '',
    gemini: localStorage.getItem('API_KEY') || ''
  });

  const handleSaveConfig = () => {
    if (!config.url || !config.key || !config.gemini) return alert("Preencha todos os campos.");
    dataService.setCredentials(config.url, config.key, config.gemini);
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans" style={{
      background: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)'
    }}>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px),
                          repeating-linear-gradient(90deg, transparent, transparent 2px, #fff 2px, #fff 4px)`
      }}></div>
      
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setShowConfig(true)}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white transition-all shadow-xl"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d0a9200ced41a30cb2042/2614e7d21_image.png" 
              alt="Tecnoloc"
              className="h-24 object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Diagnóstico Técnico Inteligente
          </h1>
          <p className="text-xl text-green-100 max-w-2xl mx-auto">
            Análise especializada baseada em manuais técnicos e experiência acumulada.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-400/30">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-100 font-medium">IA Integrada</span>
            </div>
            {!dataService.isConfigured() && (
              <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-red-400/30">
                <Database className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-100 font-medium">Configuração Pendente</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <NavCard to="/diagnostico" title="Novo Diagnóstico" description="Inicie uma análise completa de defeitos com apoio da inteligência artificial e visão computacional." icon={<Search className="w-8 h-8 text-white" />} color="green" />
          <NavCard to="/dashboard" title="Dashboard" description="Visualize o status da frota, manutenções pendentes e indicadores de performance em tempo real." icon={<LayoutDashboard className="w-8 h-8 text-white" />} color="blue" />
          <NavCard to="/manuais" title="Manuais Técnicos" description="Biblioteca digital completa com documentação técnica de todos os modelos de frota." icon={<FileText className="w-8 h-8 text-white" />} color="orange" />
          <NavCard to="/checklist" title="Checklist" description="Inspeção rigorosa de entrada e saída para garantir a qualidade dos equipamentos alugados." icon={<ClipboardCheck className="w-8 h-8 text-white" />} color="orange" />
          <NavCard to="/historico" title="Histórico" description="Acesse o registro completo de diagnósticos anteriores e soluções aplicadas pelos técnicos." icon={<History className="w-8 h-8 text-white" />} color="green" />
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg"><Settings className="w-5 h-5" /></div>
                <h2 className="text-xl font-bold">Configuração Geral</h2>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="pb-2 border-b">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Database className="w-4 h-4" /> Supabase</h3>
                </div>
                <div className="space-y-2">
                  <Label>Project URL (do seu print)</Label>
                  <Input value={config.url} onChange={e => setConfig({...config, url: e.target.value})} placeholder="https://abcde123.supabase.co" />
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key (do seu print)</Label>
                  <Input type="password" value={config.key} onChange={e => setConfig({...config, key: e.target.value})} placeholder="sb_publishable-..." />
                </div>

                <div className="pt-4 pb-2 border-b">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key className="w-4 h-4" /> Inteligência Artificial</h3>
                </div>
                <div className="space-y-2">
                  <Label>Gemini API Key</Label>
                  <Input type="password" value={config.gemini} onChange={e => setConfig({...config, gemini: e.target.value})} placeholder="Sua chave do Google Gemini" />
                  <p className="text-[10px] text-slate-500">Obtenha em: <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline">AI Studio API Key</a></p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfig(false)}>Cancelar</Button>
                <Button className="flex-1 h-12 bg-indigo-600 font-bold" onClick={handleSaveConfig}>Salvar e Reiniciar</Button>
              </div>
            </CardContent>
          </div>
        </div>
      )}
    </div>
  );
}
