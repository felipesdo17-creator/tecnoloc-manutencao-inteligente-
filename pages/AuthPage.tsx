
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, ArrowRight, ShieldCheck, Database, Loader2, KeyRound, X } from 'lucide-react';
import { Card, CardContent, Button, Input, Label } from '../components/UI';
import { dataService } from '../services/dataService';
import { toast } from 'sonner';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isForcedChange, setIsForcedChange] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showConfig, setShowConfig] = useState(false);
  
  const [dbConfig, setDbConfig] = useState({
    url: localStorage.getItem('SUPABASE_URL') || '',
    key: localStorage.getItem('SUPABASE_ANON_KEY') || ''
  });

  const from = location.state?.from?.pathname || "/";
  const ADMIN_EMAIL = 'felipe.sdo17@gmail.com';
  const isEnvConfigured = dataService.isConfiguredViaEnv();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await dataService.signIn(email, password);
        
        // CORREÇÃO: Só força a troca de senha se for o felipe E a senha digitada for a padrão '123456'
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === '123456') {
          setIsForcedChange(true);
          toast.info("Acesso Administrativo: Por favor, atualize sua senha inicial.");
        } else {
          toast.success("Acesso autorizado!");
          navigate(from, { replace: true });
        }
      } else {
        await dataService.signUp(email, password);
        toast.success("Conta criada com sucesso!");
        setIsLogin(true);
      }
    } catch (error: any) {
      if (error.message === "CONFIG_MISSING") {
        setShowConfig(true);
      } else {
        toast.error(error.message || "Erro de login. Verifique suas credenciais.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (newPassword === '123456') return toast.error("Por favor, escolha uma senha diferente da padrão.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem.");
    
    setLoading(true);
    try {
      await dataService.updatePassword(newPassword);
      toast.success("Senha administrativa atualizada!");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    if (!dbConfig.url || !dbConfig.key) return toast.error("Preencha todos os campos.");
    dataService.setSupabaseCredentials(dbConfig.url, dbConfig.key);
    setShowConfig(false);
    toast.success("Credenciais salvas localmente!");
    window.location.reload();
  };

  if (isForcedChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0fdf4] font-sans relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-indigo-600 rounded-3xl mb-4 shadow-2xl">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight">Alterar Senha</h1>
            <p className="text-slate-600 mt-2 font-medium uppercase tracking-widest text-xs">Segurança de Acesso</p>
          </div>

          <Card className="border-slate-200 bg-white shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                  Identificamos o uso da senha padrão. Por favor, defina uma nova senha para sua segurança.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-black">Nova Senha Privada</Label>
                  <Input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-white border-slate-300 text-black h-12" 
                    placeholder="Mínimo 6 caracteres" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-black">Confirmar Senha</Label>
                  <Input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-white border-slate-300 text-black h-12" 
                    placeholder="Repita a nova senha" 
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 font-black uppercase text-lg shadow-xl shadow-indigo-600/20">
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Nova Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0fdf4] overflow-hidden relative font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white rounded-[2rem] mb-6 shadow-xl border border-slate-100">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d0a9200ced41a30cb2042/2614e7d21_image.png" 
              alt="Tecnoloc"
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight uppercase">Portal Técnico</h1>
        </div>

        <Card className="border-slate-200 bg-white shadow-2xl">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-black text-xs uppercase font-black tracking-widest">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-11 bg-white border-slate-300 text-black h-12 placeholder:text-slate-400" 
                    placeholder="usuario@tecnoloc.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black text-xs uppercase font-black tracking-widest">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-11 bg-white border-slate-300 text-black h-12 placeholder:text-slate-400" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className={`w-full h-14 font-black uppercase text-lg shadow-lg transition-all ${isLogin ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'}`}>
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>{isLogin ? <LogIn className="mr-2 w-5 h-5" /> : <UserPlus className="mr-2 w-5 h-5" />} {isLogin ? 'Acessar Sistema' : 'Criar Conta'}</>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-slate-500 hover:text-black text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors group">
                {isLogin ? 'Novo por aqui? Criar conta' : 'Já possui conta? Fazer login'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </CardContent>
        </Card>

        {!isEnvConfigured && (
          <div className="mt-8 flex justify-center">
            <button onClick={() => setShowConfig(true)} className="text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Database className="w-3 h-3" /> Configuração do Banco
            </button>
          </div>
        )}
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Database /></div>
                  <h2 className="text-xl font-black text-black">Credenciais</h2>
                </div>
                <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-black"><X /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-black text-xs uppercase font-black tracking-widest">Supabase URL</Label>
                  <Input value={dbConfig.url} onChange={e => setDbConfig({...dbConfig, url: e.target.value})} placeholder="https://..." className="text-black border-slate-300" />
                </div>
                <div className="space-y-1">
                  <Label className="text-black text-xs uppercase font-black tracking-widest">Anon Key</Label>
                  <Input type="password" value={dbConfig.key} onChange={e => setDbConfig({...dbConfig, key: e.target.value})} placeholder="eyJ..." className="text-black border-slate-300" />
                </div>
              </div>

              <Button className="w-full h-12 bg-indigo-600 font-black uppercase" onClick={saveConfig}>Salvar e Conectar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
