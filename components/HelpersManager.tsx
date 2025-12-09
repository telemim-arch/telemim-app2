import React, { useState } from 'react';
import { Helper, AttendanceRecord, User, DailyOperationalRecord, FinancialSettings, UserRole } from '../types';
import { Users, Plus, X, Edit, Trash2, Wallet, CheckCircle2, XCircle, Lock, DollarSign, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface HelpersManagerProps {
  helpers: Helper[];
  attendanceRecords: AttendanceRecord[];
  onAddHelper: (helper: Helper) => void;
  onUpdateHelper: (helper: Helper) => void;
  onDeleteHelper: (id: string) => void;
  onUpdateAttendance: (date: string, helperId: string, isPresent: boolean, recordedById: string, recordedByName: string) => void;
  currentUser: User;
  operationalRecords: DailyOperationalRecord[];
  financialSettings: FinancialSettings;
}

export const HelpersManager: React.FC<HelpersManagerProps> = ({ 
  helpers, attendanceRecords, onAddHelper, onUpdateHelper, onDeleteHelper, onUpdateAttendance, currentUser, operationalRecords, financialSettings
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'financial'>('team');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Helper>>({ name: '', pixKey: '', active: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Attendance State - defaults to today (Local Time safe)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStartOfMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const [attendanceDate, setAttendanceDate] = useState(getTodayString());

  // Financial Filter State
  const [finStartDate, setFinStartDate] = useState(getStartOfMonthString());
  const [finEndDate, setFinEndDate] = useState(getTodayString());
  const [expandedHelper, setExpandedHelper] = useState<string | null>(null);

  const handleOpenModal = (helper?: Helper) => {
    if (helper) {
      setEditingId(helper.id);
      setFormData({ ...helper });
    } else {
      setEditingId(null);
      setFormData({ name: '', pixKey: '', active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      onUpdateHelper({ 
        id: editingId, 
        name: formData.name.toUpperCase(), 
        pixKey: formData.pixKey, 
        active: formData.active ?? true 
      });
    } else {
      onAddHelper({
        id: Date.now().toString(),
        name: formData.name.toUpperCase(),
        pixKey: formData.pixKey,
        active: true
      });
    }
    setIsModalOpen(false);
  };

  // Get attendance stats for selected date
  const getAttendanceStats = () => {
    const records = attendanceRecords.filter(r => r.date === attendanceDate);
    const presentCount = records.filter(r => r.isPresent).length;
    const absentCount = records.filter(r => !r.isPresent).length;
    return { presentCount, absentCount };
  };

  const stats = getAttendanceStats();

  // --- FINANCIAL CALCULATIONS ---
  const calculateHelperFinancials = () => {
    const filteredRecords = operationalRecords.filter(rec => {
        // 1. Date Filter
        if (rec.date < finStartDate || rec.date > finEndDate) return false;
        
        // 2. Supervisor Security Filter
        if (currentUser.role !== UserRole.ADMIN && rec.supervisorId !== currentUser.id) {
            return false;
        }
        return true;
    });

    // Map: Helper Name -> Data
    const helperMap: Record<string, { total: number, details: any[] }> = {};

    filteredRecords.forEach(rec => {
        // Avoid division by zero
        if (!rec.helperNames || rec.helperNames.length === 0) return;

        // Calculate individual value for this specific day
        const individualValue = rec.costHelpers / rec.helperNames.length;

        rec.helperNames.forEach(helperName => {
            if (!helperMap[helperName]) {
                helperMap[helperName] = { total: 0, details: [] };
            }

            helperMap[helperName].total += individualValue;
            helperMap[helperName].details.push({
                date: rec.date,
                supervisorId: rec.supervisorId, // Can fetch name if needed
                totalTrips: rec.totalTrips,
                value: individualValue
            });
        });
    });

    return helperMap;
  };

  const financialData = calculateHelperFinancials();
  const financialHelperNames = Object.keys(financialData).sort();

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Equipe de Ajudantes</h2>
          <p className="text-sm text-gray-500">Gestão integrada de cadastro, presença e pagamentos</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
            <button 
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'} uppercase`}
            >
                <Users size={16}/> Equipe & Presença
            </button>
            <button 
                onClick={() => setActiveTab('financial')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'financial' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'} uppercase`}
            >
                <DollarSign size={16}/> Extrato Financeiro
            </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* TAB: TEAM & ATTENDANCE */}
      {/* ========================================================== */}
      {activeTab === 'team' && (
        <>
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 uppercase">Controle de Presença (Data):</span>
                    <input 
                        type="date" 
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="p-1 border border-gray-200 rounded font-semibold text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
                    />
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase font-medium"
                >
                    <Plus size={16} /> Novo Ajudante
                </button>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={20} />
                    <span className="font-medium text-sm uppercase">Presentes</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700">{stats.presentCount}</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-600">
                    <XCircle size={20} />
                    <span className="font-medium text-sm uppercase">Faltas</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{stats.absentCount}</span>
                </div>
            </div>

            {/* Integrated Grid: Info + Attendance + Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {helpers.map(helper => {
                // Attendance Logic for this specific helper/date
                const record = attendanceRecords.find(r => r.helperId === helper.id && r.date === attendanceDate);
                const isPresent = record?.isPresent === true;
                const isAbsent = record?.isPresent === false;
                const isLocked = record && record.recordedByUserId !== currentUser.id;

                return (
                    <div key={helper.id} className={`bg-white rounded-xl shadow-sm border p-0 flex flex-col group transition-all ${helper.active ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                    
                    {/* Header: Info & Actions */}
                    <div className="p-5 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${helper.active ? 'bg-orange-50 text-orange-600' : 'bg-gray-200 text-gray-400'}`}>
                            <Users size={24} />
                            </div>
                            <div>
                            <h3 className="font-bold text-gray-800 uppercase">{helper.name}</h3>
                            {helper.pixKey ? (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                    <Wallet size={12} className="text-green-500"/> 
                                    <span className="truncate max-w-[120px]" title={helper.pixKey}>{helper.pixKey}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 italic mt-1 block uppercase">Sem chave PIX</span>
                            )}
                            </div>
                        </div>

                        {/* Actions Dropdown/Buttons */}
                        <div className="flex gap-1">
                            <button 
                                onClick={() => handleOpenModal(helper)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Dados"
                            >
                                <Edit size={16} />
                            </button>
                            <button 
                                onClick={() => {
                                if(window.confirm(`Excluir ${helper.name}?`)) onDeleteHelper(helper.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Attendance Control Section (Bottom) */}
                    <div className="mt-auto bg-gray-50 p-4 border-t border-gray-100 rounded-b-xl">
                        {helper.active ? (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Presença ({new Date(attendanceDate + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})})</span>
                                {record && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase">
                                        {isLocked && <Lock size={10} />}
                                        Por: {record.recordedByName.split(' ')[0]}
                                    </span>
                                )}
                                </div>
                                <div className="flex gap-2">
                                <button 
                                    onClick={() => !isLocked && onUpdateAttendance(attendanceDate, helper.id, true, currentUser.id, currentUser.name)}
                                    disabled={isLocked}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border uppercase ${
                                    isPresent 
                                    ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]' 
                                    : (isLocked ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-600')
                                    }`}
                                >
                                    <CheckCircle2 size={16} /> Presente
                                </button>
                                
                                <button 
                                    onClick={() => !isLocked && onUpdateAttendance(attendanceDate, helper.id, false, currentUser.id, currentUser.name)}
                                    disabled={isLocked}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border uppercase ${
                                    isAbsent 
                                    ? 'bg-red-500 text-white border-red-500 shadow-md transform scale-[1.02]' 
                                    : (isLocked ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500')
                                    }`}
                                >
                                    <XCircle size={16} /> Falta
                                </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-2">
                                <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded-full font-medium uppercase">Cadastro Inativo</span>
                            </div>
                        )}
                    </div>
                    </div>
                );
                })}

                {helpers.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 uppercase">
                    <Users size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhum ajudante cadastrado na equipe.</p>
                </div>
                )}
            </div>
        </>
      )}

      {/* ========================================================== */}
      {/* TAB: FINANCIAL STATEMENT */}
      {/* ========================================================== */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                   <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase">
                       <Filter size={18} className="text-green-600"/> Filtro por Período
                   </h3>
                   <p className="text-xs text-gray-500 mt-1 uppercase">Visualize os valores acumulados por ajudante</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 font-bold uppercase">De:</span>
                        <input 
                            type="date" 
                            value={finStartDate} 
                            onChange={(e) => setFinStartDate(e.target.value)}
                            className="bg-white text-sm font-semibold text-gray-900 outline-none rounded p-1"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 font-bold uppercase">Até:</span>
                        <input 
                            type="date" 
                            value={finEndDate} 
                            onChange={(e) => setFinEndDate(e.target.value)}
                            className="bg-white text-sm font-semibold text-gray-900 outline-none rounded p-1"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {financialHelperNames.length > 0 ? (
                    financialHelperNames.map(helperName => {
                        const data = financialData[helperName];
                        const isExpanded = expandedHelper === helperName;
                        const helperInfo = helpers.find(h => h.name === helperName);

                        return (
                            <div key={helperName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                                <div 
                                    className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedHelper(isExpanded ? null : helperName)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold">
                                            {helperName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg uppercase">{helperName}</h4>
                                            {helperInfo?.pixKey && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Wallet size={12}/> {helperInfo.pixKey}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="block text-xs text-gray-400 uppercase font-bold">Total no Período</span>
                                            <span className="text-xl font-bold text-green-600">R$ {data.total.toFixed(2)}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-gray-50 p-4 border-t border-gray-100 animate-fade-in">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-xs text-gray-500 uppercase font-bold border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-2">Data</th>
                                                    <th className="px-4 py-2">Supervisor (ID)</th>
                                                    <th className="px-4 py-2 text-right">Viagens da Equipe</th>
                                                    <th className="px-4 py-2 text-right">Valor Dia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {data.details.map((detail, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-100">
                                                        <td className="px-4 py-2 font-medium text-gray-800">
                                                            {new Date(detail.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-500 text-xs uppercase">
                                                            {detail.supervisorId === currentUser.id ? <span className="text-blue-600 font-bold uppercase">Você</span> : detail.supervisorId}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-gray-600">
                                                            {detail.totalTrips}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-bold text-green-700">
                                                            R$ {detail.value.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 uppercase">
                        <Calendar size={32} className="mx-auto mb-2 opacity-20"/>
                        <p>Nenhum registro financeiro encontrado neste período.</p>
                        {currentUser.role !== UserRole.ADMIN && (
                            <p className="text-xs mt-2 text-gray-300">Nota: Você só pode visualizar registros da sua própria equipe.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 uppercase">
                {editingId ? 'Editar Ajudante' : 'Novo Ajudante'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Nome Completo *</label>
                <input 
                  type="text" required 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                  placeholder="EX: JOÃO DA SILVA"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 uppercase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Chave Pix (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.pixKey}
                  onChange={e => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                  placeholder="CPF, EMAIL OU TELEFONE"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                />
              </div>

              <div className="flex items-center gap-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <input 
                   type="checkbox" 
                   id="active"
                   checked={formData.active}
                   onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                   className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                 />
                 <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer select-none uppercase">Cadastro Ativo</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                 <button 
                   type="button" 
                   onClick={() => setIsModalOpen(false)}
                   className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium uppercase"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit"
                   className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 uppercase"
                 >
                   Salvar
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};