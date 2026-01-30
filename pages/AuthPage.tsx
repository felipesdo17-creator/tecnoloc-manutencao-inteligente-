
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, ArrowRight, ShieldCheck, Database, Loader2, KeyRound, AlertTriangle, X } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await dataService.signIn(email, password);
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsForcedChange(true);
          toast.info("Acesso Administrativo: Atualização de segurança necessária.");
        } else {
          toast.success("Bem-vindo!");
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
        toast.error(error.message || "Erro de login. Verifique se o usuário existe no Supabase.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem.");
    
    setLoading(true);
    try {
      await dataService.updatePassword(newPassword);
      toast.success("Senha administrativa atualizada!");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    if (!dbConfig.url || !dbConfig.key) return toast.error("Preencha todos os campos.");
    dataService.setSupabaseCredentials(dbConfig.url, dbConfig.key);
    setShowConfig(false);
    toast.success("Credenciais de banco salvas!");
    window.location.reload();
  };

  if (isForcedChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-indigo-600 rounded-3xl mb-4 shadow-2xl">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Alterar Senha</h1>
            <p className="text-slate-400 mt-2">Segurança Administrativa Felipe</p>
          </div>

          <Card className="border-indigo-500/30 bg-slate-900 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                  Identificado como Administrador. Por favor, substitua a senha padrão '123456' por uma credencial forte de sua escolha.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-400">Nova Senha</Label>
                  <Input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" 
                    placeholder="Mínimo 6 caracteres" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400">Confirmar Senha</Label>
                  <Input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" 
                    placeholder="Repita a nova senha" 
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 font-black uppercase text-lg">
                  {loading ? <Loader2 className="animate-spin" /> : 'Salvar Nova Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 overflow-hidden relative font-sans">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-3xl mb-4 shadow-2xl">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d0a9200ced41a30cb2042/2614e7d21_image.png" 
              alt="Tecnoloc"
              className="h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Portal Técnico</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <Input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-11 bg-slate-800 border-slate-700 text-white focus:ring-indigo-500" 
                    placeholder="Ex: felipe.sdo17@gmail.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <Input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-11 bg-slate-800 border-slate-700 text-white focus:ring-indigo-500" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className={`w-full h-14 font-black uppercase text-lg ${isLogin ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-green-600 hover:bg-green-500'}`}>
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>{isLogin ? <LogIn className="mr-2" /> : <UserPlus className="mr-2" />} {isLogin ? 'Entrar' : 'Criar Conta'}</>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-slate-400 hover:text-white text-sm font-bold flex items-center justify-center gap-2 mx-auto">
                {isLogin ? 'Não tem acesso? Solicitar' : 'Já tem acesso? Login'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <button onClick={() => setShowConfig(true)} className="text-slate-600 hover:text-indigo-400 text-xs flex items-center gap-2 transition-colors">
            <Database className="w-4 h-4" /> Configurar Banco
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Database /></div>
                  <h2 className="text-xl font-black text-slate-900">Banco de Dados</h2>
                </div>
                <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Supabase URL</Label>
                  <Input value={dbConfig.url} onChange={e => setDbConfig({...dbConfig, url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label>Anon Key</Label>
                  <Input type="password" value={dbConfig.key} onChange={e => setDbConfig({...dbConfig, key: e.target.value})} placeholder="eyJ..." />
                </div>
              </div>

              <Button className="w-full bg-indigo-600 font-bold" onClick={saveConfig}>Salvar Configurações</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
