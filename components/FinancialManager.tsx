import React, { useState, useEffect } from 'react';
import { FinancialRecord, FinancialSettings, DailyOperationalRecord, User, UserRole } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Filter, Download, Plus, X, Truck, Users, Coffee, UserCheck, Settings, Calculator, AlertCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface FinancialManagerProps {
  records: FinancialRecord[];
  onAddRecord?: (record: FinancialRecord) => void;
  settings: FinancialSettings;
  onSaveSettings: (settings: FinancialSettings) => void;
  operationalRecords: DailyOperationalRecord[];
  onAddOperationalRecord: (record: DailyOperationalRecord) => void;
  employees: User[];
  userRole: UserRole;
  currentUser: User;
}

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  records, onAddRecord, settings, onSaveSettings,
  operationalRecords, onAddOperationalRecord, employees, userRole, currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'daily_input'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // -- OVERVIEW STATE --
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pago' as 'Pago' | 'Pendente'
  });

  // -- SETTINGS STATE (ADMIN) --
  const [settingsForm, setSettingsForm] = useState<FinancialSettings>(settings);

  // -- DAILY INPUT STATE (SUPERVISOR) --
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    driverId: '',
    totalTrips: 1,
    totalLunches: 0,
    helperNameInput: '',
    helperNames: [] as string[]
  });
  const [calculatedCost, setCalculatedCost] = useState({
    truck: 0, helpers: 0, supervisor: 0, lunch: 0, total: 0
  });

  // Calculate costs whenever dailyForm or settings change
  useEffect(() => {
    const truckCost = settings.truckFirstTrip + Math.max(0, dailyForm.totalTrips - 1) * settings.truckAdditionalTrip;

    // Helper Formula: Base + (Trips > 2 ? (Trips-2)*Add : 0) per helper
    const costPerHelper = settings.helperBase + Math.max(0, dailyForm.totalTrips - 2) * settings.helperAdditionalTrip;
    const helpersCost = costPerHelper * dailyForm.helperNames.length;

    const supervisorCost = settings.supervisorDaily;
    const lunchCost = dailyForm.totalLunches * settings.lunchUnitCost;

    setCalculatedCost({
      truck: truckCost,
      helpers: helpersCost,
      supervisor: supervisorCost,
      lunch: lunchCost,
      total: truckCost + helpersCost + supervisorCost + lunchCost
    });
  }, [dailyForm, settings]);


  const totalIncome = records.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const operationalCategories = ['Caminhão', 'Ajudantes', 'Almoço', 'Supervisores'];
  const operationalCosts = records.filter(r => r.type === 'expense' && operationalCategories.includes(r.category));
  const totalOperationalCosts = operationalCosts.reduce((acc, curr) => acc + curr.amount, 0);

  // Chart data preparation (Mocked trend for demo)
  const chartData = [
    { name: 'Sem 1', income: 12000, expense: 4000 },
    { name: 'Sem 2', income: 15000, expense: 8000 },
    { name: 'Sem 3', income: 10000, expense: 2000 },
    { name: 'Sem 4', income: 18000, expense: 5500 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddRecord) return;

    const newRecord: FinancialRecord = {
      id: Date.now().toString(),
      type: formData.type,
      description: formData.description.toUpperCase(),
      amount: Number(formData.amount),
      category: formData.category,
      date: new Date(formData.date).toLocaleDateString('pt-BR'),
      status: formData.status
    };

    onAddRecord(newRecord);
    setIsModalOpen(false);
    setFormData({
      type: 'income',
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Pago'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Force uppercase for description
    const isText = name === 'description';
    setFormData(prev => ({ ...prev, [name]: isText ? value.toUpperCase() : value }));
  };

  // -- SETTINGS HANDLERS --
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settingsForm);
    alert('Configurações financeiras atualizadas com sucesso!');
  };

  // -- DAILY INPUT HANDLERS --
  const handleAddHelper = () => {
    if (dailyForm.helperNameInput.trim()) {
      // Check duplicate in current form
      if (dailyForm.helperNames.includes(dailyForm.helperNameInput.trim().toUpperCase())) {
        alert('Este ajudante já foi adicionado na lista de hoje.');
        return;
      }

      // Check duplicate across ALL records for THIS DATE (Simulated Backend Check)
      const isDuplicateInOtherRecords = operationalRecords.some(r =>
        r.date === dailyForm.date && r.helperNames.includes(dailyForm.helperNameInput.trim().toUpperCase())
      );

      if (isDuplicateInOtherRecords) {
        alert(`ERRO: O ajudante "${dailyForm.helperNameInput}" já está alocado em outra equipe nesta data (${dailyForm.date}).`);
        return;
      }

      setDailyForm(prev => ({
        ...prev,
        helperNames: [...prev.helperNames, prev.helperNameInput.trim().toUpperCase()],
        helperNameInput: ''
      }));
    }
  };

  const handleRemoveHelper = (name: string) => {
    setDailyForm(prev => ({
      ...prev,
      helperNames: prev.helperNames.filter(n => n !== name)
    }));
  };

  const handleSubmitDailyRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyForm.helperNames.length === 0) {
      alert("Adicione pelo menos um ajudante.");
      return;
    }
    if (!dailyForm.driverId) {
      alert("Selecione um motorista.");
      return;
    }

    const newOpRecord: DailyOperationalRecord = {
      id: `op-${Date.now()}`,
      date: dailyForm.date,
      supervisorId: currentUser.id,
      driverId: dailyForm.driverId,
      totalTrips: Number(dailyForm.totalTrips),
      totalLunches: Number(dailyForm.totalLunches),
      helperNames: dailyForm.helperNames,

      costTruck: calculatedCost.truck,
      costHelpers: calculatedCost.helpers,
      costSupervisor: calculatedCost.supervisor,
      costLunch: calculatedCost.lunch,
      totalCost: calculatedCost.total
    };

    onAddOperationalRecord(newOpRecord);
    alert("Registro diário salvo e enviado para o Financeiro.");

    // Reset
    setDailyForm({
      date: new Date().toISOString().split('T')[0],
      driverId: '',
      totalTrips: 1,
      totalLunches: 0,
      helperNameInput: '',
      helperNames: []
    });
  };

  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Gestão Financeira</h2>
          <p className="text-sm text-gray-500">Fluxo de caixa e custos operacionais</p>
        </div>

        {/* Module Navigation */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all uppercase ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('daily_input')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 uppercase ${activeTab === 'daily_input' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Calculator size={14} /> Registro Diário
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 uppercase ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Settings size={14} /> Configurações
            </button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* TAB: SETTINGS (ADMIN) */}
      {/* ========================================================== */}
      {activeTab === 'settings' && isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
          <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2 uppercase">
            <Settings className="text-blue-600" /> Parametrização de Custos
          </h3>
          <p className="text-sm text-gray-500 mb-6 uppercase">Defina os valores base que serão utilizados para o cálculo automático dos pagamentos operacionais.</p>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-800 mb-3 text-sm uppercase">Caminhão / Frete</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Valor 1ª Viagem (V_C1)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.truckFirstTrip}
                    onChange={e => setSettingsForm(prev => ({ ...prev, truckFirstTrip: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Valor Viagem Adicional (V_CA)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.truckAdditionalTrip}
                    onChange={e => setSettingsForm(prev => ({ ...prev, truckAdditionalTrip: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Auxílio Almoço (V_CL)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.truckLunch}
                    onChange={e => setSettingsForm(prev => ({ ...prev, truckLunch: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <h4 className="font-bold text-green-800 mb-3 text-sm uppercase">Ajudantes</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Valor Base (Até 2 viagens) (V_AB)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.helperBase}
                    onChange={e => setSettingsForm(prev => ({ ...prev, helperBase: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Adicional p/ Viagem (após 2ª) (V_AA)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.helperAdditionalTrip}
                    onChange={e => setSettingsForm(prev => ({ ...prev, helperAdditionalTrip: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Auxílio Almoço (V_AL)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.helperLunch}
                    onChange={e => setSettingsForm(prev => ({ ...prev, helperLunch: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <h4 className="font-bold text-orange-800 mb-3 text-sm uppercase">Supervisão & Alimentação</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Diária Supervisor (V_SD)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.supervisorDaily}
                    onChange={e => setSettingsForm(prev => ({ ...prev, supervisorDaily: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Custo Unitário Almoço (V_UA)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.lunchUnitCost}
                    onChange={e => setSettingsForm(prev => ({ ...prev, lunchUnitCost: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h4 className="font-bold text-purple-800 mb-3 text-sm uppercase">Van / Apoio</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Valor Diária Van (V_VD)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.vanDaily}
                    onChange={e => setSettingsForm(prev => ({ ...prev, vanDaily: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Auxílio Almoço Van (V_VL)</label>
                  <input
                    type="number" step="0.01" required
                    value={settingsForm.vanLunch}
                    onChange={e => setSettingsForm(prev => ({ ...prev, vanLunch: parseFloat(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md uppercase">
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: DAILY INPUT (SUPERVISOR) */}
      {/* ========================================================== */}
      {activeTab === 'daily_input' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2 uppercase">
              <Calculator className="text-blue-600" /> Registro Operacional Diário
            </h3>
            <p className="text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 uppercase">
              <AlertCircle size={14} className="inline mr-1 text-blue-600" />
              Preencha os dados abaixo ao final do dia. Os valores serão calculados automaticamente conforme tabela vigente.
            </p>

            <form onSubmit={handleSubmitDailyRecord} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Data</label>
                  <input
                    type="date" required
                    value={dailyForm.date}
                    onChange={e => setDailyForm({ ...dailyForm, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Motorista</label>
                  <select
                    required
                    value={dailyForm.driverId}
                    onChange={e => setDailyForm({ ...dailyForm, driverId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 uppercase"
                  >
                    <option value="">SELECIONE...</option>
                    {employees.filter(e => e.role === UserRole.DRIVER).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Total de Viagens no Dia</label>
                  <input
                    type="number" min="1" required
                    value={dailyForm.totalTrips}
                    onChange={e => setDailyForm({ ...dailyForm, totalTrips: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Total de Almoços</label>
                  <input
                    type="number" min="0" required
                    value={dailyForm.totalLunches}
                    onChange={e => setDailyForm({ ...dailyForm, totalLunches: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2 uppercase">Equipe de Ajudantes (Adicionar Nomes)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="NOME DO AJUDANTE"
                    value={dailyForm.helperNameInput}
                    onChange={e => setDailyForm({ ...dailyForm, helperNameInput: e.target.value.toUpperCase() })}
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHelper())}
                  />
                  <button type="button" onClick={handleAddHelper} className="bg-green-600 text-white px-4 rounded-lg font-bold hover:bg-green-700">+</button>
                </div>

                {dailyForm.helperNames.length === 0 ? (
                  <p className="text-xs text-gray-400 italic uppercase">Nenhum ajudante adicionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dailyForm.helperNames.map((name, idx) => (
                      <span key={idx} className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 uppercase">
                        {name} <button type="button" onClick={() => handleRemoveHelper(name)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 uppercase">
                  <DollarSign size={18} /> Salvar Registro
                </button>
              </div>
            </form>
          </div>

          {/* LIVE CALCULATION PREVIEW */}
          <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 h-fit sticky top-6">
            <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2 uppercase">Prévia de Custos (Cálculo)</h4>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase">Supervisor (Diária)</span>
                <span className="font-bold text-gray-900">R$ {calculatedCost.supervisor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase">Caminhão ({dailyForm.totalTrips} viagens)</span>
                <span className="font-bold text-gray-900">R$ {calculatedCost.truck.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase">Ajudantes ({dailyForm.helperNames.length}x)</span>
                <span className="font-bold text-gray-900">R$ {calculatedCost.helpers.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 uppercase">Alimentação ({dailyForm.totalLunches}x)</span>
                <span className="font-bold text-gray-900">R$ {calculatedCost.lunch.toFixed(2)}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-lg">
                <span className="font-bold text-gray-800 uppercase">Total do Dia</span>
                <span className="font-bold text-blue-600">R$ {calculatedCost.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: OVERVIEW (Existing) */}
      {/* ========================================================== */}
      {activeTab === 'overview' && (
        <>
          <div className="flex gap-2 justify-end mb-4">
            {onAddRecord && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase"
              >
                <Plus size={18} /> Nova Transação Manual
              </button>
            )}
            <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"><Filter size={18} /></button>
            <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"><Download size={18} /></button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1 uppercase">Receita Total</p>
                  <h3 className="text-2xl font-bold text-gray-800">R$ {totalIncome.toLocaleString('pt-BR')}</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1 uppercase">Despesas Totais</p>
                  <h3 className="text-2xl font-bold text-gray-800">R$ {totalExpense.toLocaleString('pt-BR')}</h3>
                </div>
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <TrendingDown size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1 uppercase">Saldo Líquido</p>
                  <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    R$ {balance.toLocaleString('pt-BR')}
                  </h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <DollarSign size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 uppercase">Últimas Transações (Geral)</h3>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Descrição</th>
                      <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Categoria</th>
                      <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Data</th>
                      <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Valor</th>
                      <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.slice(0, 8).map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800 uppercase">{rec.description}</td>
                        <td className="px-6 py-3 text-gray-500 uppercase">{rec.category}</td>
                        <td className="px-6 py-3 text-gray-500">{rec.date}</td>
                        <td className={`px-6 py-3 font-bold ${rec.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {rec.type === 'income' ? '+' : '-'} R$ {rec.amount.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${rec.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="font-bold text-gray-800 mb-4 uppercase">Fluxo de Caixa Mensal</h3>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1 uppercase"><div className="w-2 h-2 rounded-full bg-green-500"></div>Receitas</div>
                <div className="flex items-center gap-1 uppercase"><div className="w-2 h-2 rounded-full bg-red-500"></div>Despesas</div>
              </div>
            </div>
          </div>

          {/* Operational Costs Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase">
                  <Truck size={20} className="text-gray-500" />
                  Tabela de Custos Operacionais
                </h3>
                <p className="text-xs text-gray-500 uppercase">Despesas específicas com Caminhão, Ajudantes, Almoço e Supervisão</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 uppercase font-bold">Total Operacional</span>
                <h4 className="text-xl font-bold text-red-600">R$ {totalOperationalCosts.toLocaleString('pt-BR')}</h4>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Descrição</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Tipo de Custo</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {operationalCosts.length > 0 ? (
                    operationalCosts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-500">{rec.date}</td>
                        <td className="px-6 py-3 font-medium text-gray-800 uppercase">{rec.description}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium uppercase">
                            {rec.category === 'Caminhão' && <Truck size={12} />}
                            {rec.category === 'Ajudantes' && <Users size={12} />}
                            {rec.category === 'Almoço' && <Coffee size={12} />}
                            {rec.category === 'Supervisores' && <UserCheck size={12} />}
                            {rec.category}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-red-600">
                          - R$ {rec.amount.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold uppercase ${rec.status === 'Pago' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic uppercase">
                        Nenhum custo operacional específico registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Transaction Modal (Manual) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 uppercase">Nova Transação Financeira</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Type Selection */}
              <div className="flex gap-4">
                <label className={`flex-1 cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'income' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'border-gray-200 text-gray-600 bg-white'}`}>
                  <input type="radio" name="type" value="income" className="hidden" checked={formData.type === 'income'} onChange={handleInputChange} />
                  ENTRADA (RECEITA)
                </label>
                <label className={`flex-1 cursor-pointer border rounded-lg p-3 text-center transition-all ${formData.type === 'expense' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'border-gray-200 text-gray-600 bg-white'}`}>
                  <input type="radio" name="type" value="expense" className="hidden" checked={formData.type === 'expense'} onChange={handleInputChange} />
                  SAÍDA (DESPESA)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Descrição</label>
                <input
                  type="text" required name="description"
                  value={formData.description} onChange={handleInputChange}
                  placeholder="EX: PAGAMENTO CLIENTE X OU COMBUSTÍVEL"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Valor (R$)</label>
                  <input
                    type="number" required name="amount"
                    value={formData.amount} onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Data</label>
                  <input
                    type="date" required name="date"
                    value={formData.date} onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Categoria</label>
                  <select
                    name="category" required value={formData.category} onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-gray-900 uppercase"
                  >
                    <option value="">SELECIONE...</option>
                    <optgroup label="Geral">
                      <option value="Serviço">SERVIÇO</option>
                      <option value="Material">MATERIAL</option>
                      <option value="Salário">SALÁRIO</option>
                      <option value="Outros">OUTROS</option>
                    </optgroup>
                    <optgroup label="Custos Operacionais">
                      <option value="Caminhão">CAMINHÃO</option>
                      <option value="Ajudantes">AJUDANTES</option>
                      <option value="Almoço">ALMOÇO</option>
                      <option value="Supervisores">SUPERVISORES</option>
                      <option value="Manutenção">MANUTENÇÃO</option>
                      <option value="Combustível">COMBUSTÍVEL</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Status</label>
                  <select
                    name="status" value={formData.status} onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-gray-900 uppercase"
                  >
                    <option value="Pago">PAGO / RECEBIDO</option>
                    <option value="Pendente">PENDENTE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg uppercase">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow uppercase">Salvar Registro</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};