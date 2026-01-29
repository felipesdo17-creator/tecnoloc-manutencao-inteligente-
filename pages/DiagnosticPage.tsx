
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, CheckCircle, ArrowLeft,
  ShieldCheck, Camera, X, ImageIcon,
  Wrench, Zap, Layers, FileText, Send
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { DiagnosticResult } from '../types';
// Fixed: Added Badge to the UI component imports
import { Card, CardContent, CardHeader, Button, Input, Label, Textarea, Badge } from '../components/UI';

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    equipment_name: '', brand: '', model: '', defect_description: '',
    defect_category: 'ambos' as 'eletrico' | 'mecanico' | 'ambos'
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null); 
  const [imagePreview, setImagePreview] = useState<string | null>(null);   
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosticResult | null>(null);
  
  const [resolutionType, setResolutionType] = useState<'salvar_depois' | 'conforme_manual' | 'forma_diferente'>('conforme_manual');
  const [technicianName, setTechnicianName] = useState("");
  const [actualSolution, setActualSolution] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!formData.equipment_name || (!formData.defect_description && !selectedImage)) {
      alert('Identifique o equipamento e descreva o problema.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const manual = await dataService.findManualByModel(formData.model);
      const allLogs = await dataService.getLogs();
      const fieldTips = allLogs
        .filter(l => l.equipment_model === formData.model || l.defect_category === formData.defect_category)
        .slice(0, 3)
        .map(l => `Experiência: ${l.defect_description} -> Solução: ${l.technician_notes}`)
        .join('\n');

      let base64Image = null;
      if (selectedImage) {
        base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(selectedImage);
        });
      }

      const result = await geminiService.analyzeEquipment(
        { ...formData, category: formData.defect_category },
        manual?.description || null,
        fieldTips || null,
        base64Image
      );
      setDiagnosisResult(result);
    } catch (error) {
      alert("Erro na análise técnica.");
    } finally { setIsAnalyzing(false); }
  };

  const handleSaveFeedback = async () => {
    if (!technicianName) return alert("Informe seu nome.");
    setIsSaving(true);
    try {
      await dataService.saveLog({
        equipment_model: formData.model,
        equipment_name: formData.equipment_name,
        brand: formData.brand,
        defect_category: formData.defect_category,
        diagnosis: diagnosisResult!,
        status: resolutionType !== 'salvar_depois' ? 'Resolvido' : 'Pendente',
        resolution_type: resolutionType,
        defect_description: formData.defect_description,
        technician_notes: actualSolution,
        attachment_notes: attachmentNotes
      });
      alert("Registro salvo com sucesso!");
      navigate('/historico');
    } catch (error) { alert("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <Card className="border-t-4 border-t-indigo-600 shadow-xl mb-8">
          <CardHeader className="bg-slate-50/50">
            <h2 className="flex items-center gap-3 text-indigo-900 text-xl font-black">
              <ShieldCheck className="h-6 w-6 text-indigo-600" /> Novo Diagnóstico IA
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Equipamento</Label>
                <Input value={formData.equipment_name} onChange={e => setFormData({...formData, equipment_name: e.target.value})} placeholder="Ex: Torre" />
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Ex: Generac" />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Ex: V20" />
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
                      formData.defect_category === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Defeito</Label>
              <div className="relative">
                <Textarea value={formData.defect_description} onChange={e => setFormData({...formData, defect_description: e.target.value})} placeholder="O que está acontecendo?" className="min-h-[100px]" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-3 right-3 p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><Camera className="w-5 h-5 text-slate-600" /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
              </div>
              {imagePreview && <div className="mt-2 relative inline-block"><img src={imagePreview} className="h-24 rounded-lg border-2 border-white shadow-md" /><button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>}
            </div>

            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full h-12 font-black uppercase tracking-wider">
              {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <ImageIcon className="mr-2 w-5 h-5" />} Analisar Defeito
            </Button>
          </CardContent>
        </Card>

        {diagnosisResult && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8 pb-24">
            <Card className="border-l-[12px] border-l-green-600 shadow-xl">
              <CardHeader className="bg-green-50/50"><h3 className="text-green-800 flex items-center gap-3 font-black"><CheckCircle className="h-5 w-5" /> Diagnóstico Sugerido</h3></CardHeader>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Causas Prováveis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {diagnosisResult.possible_causes.map((c, i) => <div key={i} className="bg-slate-50 p-3 rounded-lg border text-sm text-slate-700 font-medium">• {c}</div>)}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Plano de Ação</h4>
                  {diagnosisResult.solutions.map((s, i) => (
                    <div key={i} className="mb-4 p-4 border rounded-xl bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-slate-800">{s.title}</h5><Badge className="bg-indigo-50 text-indigo-700 border-indigo-100">{s.difficulty}</Badge></div>
                      <div className="space-y-2">{s.steps.map((step, si) => <p key={si} className="text-sm text-slate-600 flex gap-2"><span className="text-indigo-600 font-bold">{si+1}.</span> {step}</p>)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="bg-[#f0f9f1] border border-[#d1e7d3]">
              <CardHeader className="border-b-0 pb-2"><div className="flex items-center gap-2 text-[#2e7d32] font-bold"><Wrench className="w-5 h-5" /> Registro de Resolução</div></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    { id: 'salvar_depois', title: 'Salvar para depois', desc: 'O problema ainda não foi resolvido' },
                    { id: 'conforme_manual', title: 'Resolvido conforme Manual', desc: 'Seguiu as instruções do manual técnico' },
                    { id: 'forma_diferente', title: 'Resolvido de forma diferente', desc: 'Usou uma solução alternativa que funcionou' }
                  ].map((opt) => (
                    <div key={opt.id} onClick={() => setResolutionType(opt.id as any)} className="flex items-start gap-4 cursor-pointer group">
                      <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${resolutionType === opt.id ? 'border-slate-900' : 'border-slate-300'}`}>{resolutionType === opt.id && <div className="w-3 h-3 rounded-full bg-slate-900" />}</div>
                      <div><p className="font-bold text-slate-900 mb-0.5">{opt.title}</p><p className="text-xs text-slate-500">{opt.desc}</p></div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-[#d1e7d3] space-y-4">
                  <div><Label className="text-[#1b5e20] font-black">Nome do Técnico *</Label><Input className="bg-white border-[#d1e7d3]" placeholder="Seu nome" value={technicianName} onChange={e => setTechnicianName(e.target.value)} /></div>
                  {resolutionType === 'forma_diferente' && <div className="animate-in fade-in"><Label className="text-[#1b5e20] font-black">Solução Alternativa *</Label><Textarea className="bg-white border-[#d1e7d3]" placeholder="Como você resolveu?" value={actualSolution} onChange={e => setActualSolution(e.target.value)} /></div>}
                  <div className="bg-[#e8f5e9] p-4 rounded-xl border border-[#c8e6c9]">
                    <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-[#2e7d32]" /><Label className="text-[#1b5e20] mb-0 font-black">Segue anexo</Label></div>
                    <Textarea className="bg-white border-[#d1e7d3] min-h-[80px]" placeholder="Observações sobre peças ou fotos anexadas..." value={attachmentNotes} onChange={e => setAttachmentNotes(e.target.value)} />
                  </div>
                  <Button onClick={handleSaveFeedback} disabled={isSaving} className="w-full h-14 bg-[#2e7d32] hover:bg-[#1b5e20] font-black uppercase tracking-widest"><Send className="w-5 h-5 mr-2" /> Confirmar e Salvar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
