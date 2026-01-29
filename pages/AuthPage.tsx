
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, ArrowRight, ShieldCheck, Database, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
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
        
        // Regra especial solicitada: Se for o felipe, forçar troca de senha
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsForcedChange(true);
          toast.info("Acesso Administrativo: Por favor, altere sua senha inicial.");
        } else {
          toast.success("Bem-vindo de volta!");
          navigate(from, { replace: true });
        }
      } else {
        await dataService.signUp(email, password);
        toast.success("Conta criada! Verifique seu e-mail.");
        setIsLogin(true);
      }
    } catch (error: any) {
      if (error.message?.includes("Backend não configurado")) {
        toast.error("Erro de conexão: Banco de dados não configurado.");
        setShowConfig(true);
      } else {
        toast.error(error.message || "Falha na autenticação. Verifique e-mail e senha.");
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
      toast.success("Senha alterada com sucesso!");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error("Erro ao atualizar senha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    if (!dbConfig.url || !dbConfig.key) return toast.error("Preencha os dados do Supabase.");
    dataService.setSupabaseCredentials(dbConfig.url, dbConfig.key);
    setShowConfig(false);
    toast.success("Configuração manual salva!");
    window.location.reload();
  };

  if (isForcedChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px]" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-indigo-600 rounded-3xl mb-4 shadow-2xl animate-pulse">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Redefinir Senha</h1>
            <p className="text-slate-400 mt-2">Segurança Administrativa Tecnoloc</p>
          </div>

          <Card className="border-indigo-500/30 bg-slate-900/80 backdrop-blur-xl shadow-2xl border-2">
            <CardContent className="p-8 space-y-6">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                  Olá felipe.sdo17@gmail.com, por motivos de segurança do portal, sua primeira ação deve ser a atualização da sua credencial privada.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <Input 
                      type="password" 
                      required 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pl-11 bg-slate-800 border-slate-700 text-white focus:ring-indigo-500" 
                      placeholder="No mínimo 6 caracteres" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <Input 
                      type="password" 
                      required 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-11 bg-slate-800 border-slate-700 text-white focus:ring-indigo-500" 
                      placeholder="Repita a nova senha" 
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-widest text-lg shadow-indigo-600/20 shadow-xl"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Atualizar Credencial'}
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
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500 rounded-full blur-[120px]" />
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
          <p className="text-slate-400 mt-2">Acesse o sistema de diagnóstico inteligente.</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <Input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-11 bg-slate-800 border-slate-700 text-white focus:ring-indigo-500" 
                    placeholder="tecnico@tecnoloc.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Senha de Acesso</Label>
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

              <Button 
                type="submit" 
                disabled={loading}
                className={`w-full h-14 font-black uppercase tracking-widest text-lg ${isLogin ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-green-600 hover:bg-green-500'}`}
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>{isLogin ? <LogIn className="mr-2" /> : <UserPlus className="mr-2" />} {isLogin ? 'Entrar no Sistema' : 'Criar minha Conta'}</>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-400 hover:text-white text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Solicitar acesso' : 'Já possui uma conta? Fazer login'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-6">
          <button onClick={() => setShowConfig(true)} className="text-slate-500 hover:text-indigo-400 text-xs flex items-center gap-2 transition-colors">
            <Database className="w-4 h-4" /> Configurar Banco (Manual)
          </button>
          <div className="text-slate-700 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Acesso Seguro
          </div>
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Database /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Configuração de Emergência</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold italic">Use apenas se o Vercel falhar</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Project URL</Label>
                  <Input 
                    value={dbConfig.url} 
                    onChange={e => setDbConfig({...dbConfig, url: e.target.value})}
                    placeholder="https://xyz.supabase.co" 
                  />
                </div>
                <div className="space-y-1">
                  <Label>API Key (Anon)</Label>
                  <Input 
                    type="password"
                    value={dbConfig.key} 
                    onChange={e => setDbConfig({...dbConfig, key: e.target.value})}
                    placeholder="eyJhbG..." 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1" onClick={() => setShowConfig(false)}>Fechar</Button>
                <Button className="flex-1 bg-indigo-600 font-bold" onClick={saveConfig}>Salvar Local</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
