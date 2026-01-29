
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, CheckCircle, ArrowLeft,
  ShieldCheck, Camera, X, ImageIcon, AlertTriangle, 
  Wrench, Zap, Layers, FileText, Send
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { DiagnosticResult } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea, Badge } from '../components/UI';

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    equipment_name: '',
    brand: '',
    model: '',
    defect_description: '',
    defect_category: 'ambos' as 'eletrico' | 'mecanico' | 'ambos'
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null); 
  const [imagePreview, setImagePreview] = useState<string | null>(null);   
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosticResult | null>(null);
  
  // Feedback States
  const [resolutionType, setResolutionType] = useState<'salvar_depois' | 'conforme_manual' | 'forma_diferente'>('conforme_manual');
  const [technicianName, setTechnicianName] = useState("");
  const [actualSolution, setActualSolution] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!formData.equipment_name || (!formData.defect_description && !selectedImage)) {
      alert('Por favor, identifique o equipamento e descreva o defeito ou envie uma foto.');
      return;
    }

    setIsAnalyzing(true);
    setDiagnosisResult(null);

    try {
      const manual = await dataService.findManualByModel(formData.model);
      const allLogs = await dataService.getLogs();
      const relevantLogs = allLogs.filter(l => 
        l.equipment_model === formData.model || l.defect_category === formData.defect_category
      ).slice(0, 5);
      
      const fieldTips = relevantLogs.length > 0 
        ? relevantLogs.map((l, i) => `Caso ${i+1} (${l.defect_category}): ${l.defect_description} -> Solução Técnica: ${l.technician_notes}`).join('\n')
        : null;

      let base64Image = null;
      if (selectedImage) {
        base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(selectedImage);
        });
      }

      const result = await geminiService.analyzeEquipment(
        { 
          name: formData.equipment_name, 
          brand: formData.brand, 
          model: formData.model, 
          defect: formData.defect_description,
          category: formData.defect_category
        },
        manual?.description || null,
        fieldTips,
        base64Image
      );

      setDiagnosisResult(result);
    } catch (error) {
      console.error("Erro na análise:", error);
      alert(`Erro no processamento: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!diagnosisResult) return;
    if (!technicianName) {
      alert("Por favor, informe seu nome.");
      return;
    }
    
    setIsSaving(true);
    try {
      await dataService.saveLog({
        equipment_model: formData.model,
        equipment_name: formData.equipment_name,
        brand: formData.brand,
        defect_category: formData.defect_category,
        diagnosis: diagnosisResult,
        status: resolutionType !== 'salvar_depois' ? 'Resolvido' : 'Pendente',
        resolution_type: resolutionType,
        defect_description: formData.defect_description,
        technician_notes: actualSolution,
        attachment_notes: attachmentNotes
      });
      alert("Diagnóstico e resolução salvos no histórico!");
      navigate('/historico');
    } catch (error) {
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    'Fácil': 'bg-green-100 text-green-800 border-green-200',
    'Média': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Difícil': 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Painel Principal
        </Button>

        <Card className="border-t-4 border-t-indigo-600 shadow-xl mb-8">
          <CardHeader className="bg-slate-50/50">
            <h2 className="flex items-center gap-3 text-indigo-900 text-xl font-black">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              Novo Diagnóstico IA
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wider">Cruzamento de Manual + Experiência de Campo</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label>Equipamento</Label>
                <Input 
                  value={formData.equipment_name} 
                  onChange={(e) => setFormData({...formData, equipment_name: e.target.value})}
                  placeholder="Ex: Torre de Iluminação"
                />
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input 
                  value={formData.brand} 
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="Ex: Generac"
                />
              </div>
              <div className="space-y-1">
                <Label>Modelo Exato</Label>
                <Input 
                  value={formData.model} 
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="Ex: V20"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipo de Falha</Label>
              <div className="flex gap-4">
                {[
                  { id: 'eletrico', label: 'Elétrico', icon: <Zap className="w-4 h-4" /> },
                  { id: 'mecanico', label: 'Mecânico', icon: <Wrench className="w-4 h-4" /> },
                  { id: 'ambos', label: 'Ambos', icon: <Layers className="w-4 h-4" /> }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFormData({...formData, defect_category: cat.id as any})}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold ${
                      formData.defect_category === cat.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Relato do Técnico & Evidência Visual</Label>
              <div className="relative group">
                <Textarea 
                  className="min-h-[120px] pr-14 resize-none shadow-inner"
                  value={formData.defect_description} 
                  onChange={(e) => setFormData({...formData, defect_description: e.target.value})}
                  placeholder="Descreva o que está acontecendo..."
                />
                <div className="absolute bottom-4 right-4">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-90"
                    title="Adicionar Foto"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {imagePreview && (
                <div className="mt-4 inline-flex relative animate-in zoom-in-95 duration-200">
                  <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-xl border-4 border-white shadow-lg" />
                  <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="w-full h-14 text-lg font-black"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-6 w-6 animate-spin mr-3" /> Processando com Gemini IA...</>
              ) : (
                <><ImageIcon className="h-5 w-5 mr-3" /> Gerar Diagnóstico Especializado</>
              )}
            </Button>
          </CardContent>
        </Card>

        {diagnosisResult && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-24">
            <Card className="border-l-[12px] border-l-green-600 shadow-2xl">
              <CardHeader className="bg-green-50/50">
                <h3 className="text-green-800 flex items-center gap-3 font-black text-lg">
                  <CheckCircle className="h-6 w-6" /> Diagnóstico Baseado em Experiência
                </h3>
              </CardHeader>
              
              <div className="p-8 space-y-10">
                <div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Causas Prováveis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {diagnosisResult.possible_causes.map((cause, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 flex gap-3 font-medium">
                        <span className="text-green-600">•</span> {cause}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Plano de Manutenção Sugerido</h4>
                  <div className="space-y-6">
                    {diagnosisResult.solutions.map((sol, idx) => (
                      <div key={idx} className="bg-white border-2 rounded-2xl p-6 border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                          <h5 className="font-bold text-xl text-slate-800">{sol.title}</h5>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${difficultyColors[sol.difficulty] || 'bg-slate-100'}`}>
                            {sol.difficulty}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {sol.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex gap-5">
                              <span className="shrink-0 w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                {sIdx + 1}
                              </span>
                              <p className="text-slate-600 pt-1 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Registro de Resolução - Inspirado na imagem do usuário */}
            <Card className="bg-[#f0f9f1] border border-[#d1e7d3] overflow-hidden">
              <CardHeader className="border-b-0 pb-2">
                <div className="flex items-center gap-2 text-[#2e7d32] font-bold">
                  <Wrench className="w-5 h-5" />
                  Registro de Resolução
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    { id: 'salvar_depois', title: 'Salvar para depois', desc: 'O problema ainda não foi resolvido' },
                    { id: 'conforme_manual', title: 'Resolvido conforme Manual', desc: 'Seguiu as instruções do manual técnico' },
                    { id: 'forma_diferente', title: 'Resolvido de forma diferente', desc: 'Usou uma solução alternativa que funcionou' }
                  ].map((opt) => (
                    <div 
                      key={opt.id} 
                      onClick={() => setResolutionType(opt.id as any)}
                      className="flex items-start gap-4 cursor-pointer group"
                    >
                      <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${resolutionType === opt.id ? 'border-slate-900' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {resolutionType === opt.id && <div className="w-3 h-3 rounded-full bg-slate-900" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none mb-1">{opt.title}</p>
                        <p className="text-sm text-slate-500">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-[#d1e7d3]">
                  <div>
                    <Label className="text-[#1b5e20] font-black">Nome do Técnico *</Label>
                    <Input 
                      className="bg-white border-[#d1e7d3] focus:ring-[#2e7d32]"
                      placeholder="Seu nome completo"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                    />
                  </div>

                  {resolutionType === 'forma_diferente' && (
                    <div className="animate-in fade-in zoom-in-95">
                      <Label className="text-[#1b5e20] font-black">Descreva a solução alternativa *</Label>
                      <Textarea 
                        className="bg-white border-[#d1e7d3] focus:ring-[#2e7d32] min-h-[100px]"
                        placeholder="Explique detalhadamente como você resolveu o problema de forma diferente do manual..."
                        value={actualSolution}
                        onChange={(e) => setActualSolution(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="bg-[#e8f5e9] p-4 rounded-xl border border-[#c8e6c9]">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-[#2e7d32]" />
                      <Label className="text-[#1b5e20] mb-0">Segue anexo</Label>
                    </div>
                    <Textarea 
                      className="bg-white border-[#d1e7d3] focus:ring-[#2e7d32] min-h-[80px]"
                      placeholder="Adicione observações sobre peças, fotos ou documentos em anexo..."
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#2e7d32] font-medium opacity-80">
                    <Zap className="w-3 h-3" />
                    Esta experiência será compartilhada em diagnósticos futuros semelhantes
                  </div>

                  <Button 
                    onClick={handleSaveFeedback} 
                    disabled={isSaving} 
                    className="w-full h-14 bg-[#2e7d32] hover:bg-[#1b5e20] text-white rounded-xl shadow-lg font-black"
                  >
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : (
                      <span className="flex items-center justify-center gap-2 uppercase tracking-widest">
                        <Send className="w-5 h-5" />
                        Confirmar e Salvar no Sistema
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
