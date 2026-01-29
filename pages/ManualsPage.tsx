
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Upload, Trash2, ExternalLink, Loader2, Zap, Settings, 
  ArrowLeft, Search, Download, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { dataService } from '../services/dataService';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select, Textarea, Badge } from '../components/UI';
import { Manual } from '../types';

export default function ManualsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Manual, 'id'>>({
    equipment_name: '',
    brand: '',
    model: '',
    manual_type: 'usuario',
    manual_category: 'ambos',
    description: '',
    file_url: '',
    file_name: ''
  });

  const { data: manuals = [], isLoading } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => dataService.getManuals(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Manual, 'id'>) => dataService.saveManual(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
      setShowForm(false);
      setFormData({
        equipment_name: '',
        brand: '',
        model: '',
        manual_type: 'usuario',
        manual_category: 'ambos',
        description: '',
        file_url: '',
        file_name: ''
      });
      toast.success('Manual adicionado ao Supabase!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar no banco de dados: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteManual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
      toast.success('Manual excluído!');
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await dataService.uploadFile(file);
      setFormData(prev => ({
        ...prev,
        file_url: result.file_url,
        file_name: result.file_name
      }));
      toast.success('Upload concluído!');
    } catch (error: any) {
      toast.error('Erro no Supabase Storage: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_name || !formData.file_url) {
      toast.error('Preencha os campos obrigatórios e anexe o arquivo');
      return;
    }
    createMutation.mutate(formData);
  };

  const manualTypeLabels: Record<string, string> = {
    usuario: 'Usuário',
    tecnico: 'Técnico',
    manutencao: 'Manutenção',
    outro: 'Outro'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="pl-0 mb-2 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início
            </Button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manuais Técnicos</h1>
            <p className="text-slate-500 mt-1 font-medium">Biblioteca integrada com Supabase.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant="orange" className="h-11 px-6 shadow-lg">
            <Upload className="w-4 h-4 mr-2" />
            Adicionar Manual
          </Button>
        </div>

        {showForm && (
          <Card className="mb-10 border-indigo-100 shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="bg-indigo-50/40">
              <CardTitle className="text-indigo-900">Novo Cadastro (Supabase)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <Label>Equipamento *</Label>
                    <Input
                      value={formData.equipment_name}
                      onChange={(e) => setFormData({...formData, equipment_name: e.target.value})}
                      placeholder="Ex: Gerador, Escavadeira..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Marca</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      placeholder="Ex: Komatsu, Caterpillar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Modelo</Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      placeholder="Ex: PC200, CAT-320..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo de Manual</Label>
                    <Select value={formData.manual_type} onValueChange={(value: any) => setFormData({...formData, manual_type: value})}>
                      <option value="usuario">Usuário</option>
                      <option value="tecnico">Técnico</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="outro">Outro</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria do Manual *</Label>
                    <Select value={formData.manual_category} onValueChange={(value: any) => setFormData({...formData, manual_category: value})}>
                      <option value="ambos">Ambos</option>
                      <option value="eletrico">Elétrico</option>
                      <option value="mecanico">Mecânico</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Notas para indexação..."
                    rows={3}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Arquivo do Manual *</Label>
                  <div className="flex items-center gap-4 mt-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 group">
                    <div className="flex-1">
                      <Input
                        type="file"
                        className="border-none shadow-none focus:ring-0 p-0 h-auto cursor-pointer"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </div>
                    {isUploading && <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />}
                  </div>
                  {formData.file_name && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-bold">{formData.file_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="px-8">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || isUploading} className="px-12">
                    {createMutation.isPending ? 'Salvando...' : 'Confirmar Cadastro'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-32">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600" />
              <p className="text-slate-500 font-bold mt-4 uppercase tracking-widest text-sm">Carregando do Supabase...</p>
            </div>
          ) : manuals.length === 0 ? (
            <div className="col-span-full text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
              <FileText className="w-24 h-24 mx-auto text-slate-100 mb-6" />
              <p className="text-slate-400 font-black text-2xl tracking-tight">Biblioteca Supabase Vazia</p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-8 mx-auto px-8">Novo Manual</Button>
            </div>
          ) : (
            manuals.map((manual) => (
              <Card key={manual.id} className="group hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 relative border-slate-100 flex flex-col h-full">
                <CardContent className="pt-8 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                      <FileText className="w-9 h-9" />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if(confirm('Deseja excluir este manual do Supabase?')) {
                          deleteMutation.mutate(manual.id);
                        }
                      }}
                      className="text-slate-300 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                      {manual.equipment_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-wider mt-2">
                      {manual.brand} | {manual.model}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
                        {manualTypeLabels[manual.manual_type]}
                      </Badge>
                      {manual.manual_category === 'eletrico' && <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200"><Zap className="w-3 h-3" /> ELÉTRICO</Badge>}
                      {manual.manual_category === 'mecanico' && <Badge className="bg-slate-50 text-slate-500 border border-slate-200"><Settings className="w-3 h-3" /> MECÂNICO</Badge>}
                      {manual.manual_category === 'ambos' && <Badge className="bg-indigo-600 text-white">HÍBRIDO</Badge>}
                    </div>
                  </div>

                  <a
                    href={manual.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full mt-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-xl"
                  >
                    <ExternalLink className="w-4 h-4" />
                    VISUALIZAR ARQUIVO
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
