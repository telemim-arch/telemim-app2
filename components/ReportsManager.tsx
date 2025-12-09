
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Sparkles, FileText, Download, TrendingUp, DollarSign, Activity, Filter, Share2, Printer, Lock, Truck, Eye, EyeOff, Calculator, CheckCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateReportSummary } from '../services/geminiService';
import { MoveStatus, User, Resident, UserRole, DailyOperationalRecord, AssignmentStatus } from '../types';

interface ReportsManagerProps {
  financialData: any[];
  movesData: any[];
  employees: User[];
  residents: Resident[];
  userRole: UserRole;
  operationalRecords: DailyOperationalRecord[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  financialData, movesData, employees, residents, userRole, operationalRecords
}) => {
  const isAdmin = userRole === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'operational' | 'financial'>('operational');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // -- FINANCIAL FILTERS --
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // -- OPERATIONAL FILTERS --
  const [opStartDate, setOpStartDate] = useState('');
  const [opEndDate, setOpEndDate] = useState('');
  const [opEmployeeId, setOpEmployeeId] = useState('ALL');
  const [opResidentId, setOpResidentId] = useState('ALL');

  // ============================================
  // LOGIC: FINANCIAL REPORT
  // ============================================

  const filteredFinancials = useMemo(() => {
    return financialData.filter(item => {
      const dateStr = item.date;
      let dateObj;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        dateObj = new Date(dateStr);
      }

      const itemYear = dateObj.getFullYear().toString();
      const itemMonth = (dateObj.getMonth() + 1).toString();

      if (filterYear !== 'ALL' && itemYear !== filterYear) return false;
      if (filterMonth !== 'ALL' && itemMonth !== filterMonth) return false;
      return true;
    });
  }, [financialData, filterMonth, filterYear]);

  const totalRevenue = filteredFinancials.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalCost = filteredFinancials.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  // Mock data for charts
  const monthlyData = [
    { name: 'Jan', revenue: 45000, cost: 20000, moves: 12 },
    { name: 'Fev', revenue: 52000, cost: 25000, moves: 15 },
    { name: 'Mar', revenue: 48000, cost: 22000, moves: 14 },
    { name: 'Abr', revenue: 61000, cost: 28000, moves: 19 },
    { name: 'Mai', revenue: 55000, cost: 24000, moves: 17 },
    { name: 'Jun', revenue: 67000, cost: 31000, moves: 22 },
  ];

  const handleGenerateAI = async () => {
    setLoadingAi(true);
    const dataContext = {
      summary: `Relatório Financeiro ${filterMonth}/${filterYear}`,
      financials: { totalRevenue, totalCost, profit: totalRevenue - totalCost },
      note: "Gerar insights sobre lucratividade."
    };
    const text = await generateReportSummary(dataContext);
    setAiAnalysis(text);
    setLoadingAi(false);
  };

  // ============================================
  // LOGIC: OPERATIONAL REPORT (Mudanças)
  // ============================================

  const filteredMoves = useMemo(() => {
    return movesData.filter(move => {
      // 1. Date Range Filter
      if (opStartDate && move.date < opStartDate) return false;
      if (opEndDate && move.date > opEndDate) return false;

      // 2. Employee Filter (Check if employee ID matches Coord, Sup or Driver)
      if (opEmployeeId !== 'ALL') {
        const isAssigned =
          move.coordinatorId === opEmployeeId ||
          move.supervisorId === opEmployeeId ||
          move.driverId === opEmployeeId;
        if (!isAssigned) return false;
      }

      // 3. Resident Filter
      if (opResidentId !== 'ALL') {
        if (move.residentId !== opResidentId) return false;
      }

      return true;
    });
  }, [movesData, opStartDate, opEndDate, opEmployeeId, opResidentId]);

  const handleClearOpFilters = () => {
    setOpStartDate('');
    setOpEndDate('');
    setOpEmployeeId('ALL');
    setOpResidentId('ALL');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`RELATÓRIO OPERACIONAL DE MUDANÇAS`, 105, 13, { align: 'center' });

    // Filter Info
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text(`Período: ${opStartDate ? new Date(opStartDate).toLocaleDateString('pt-BR') : 'Início'} a ${opEndDate ? new Date(opEndDate).toLocaleDateString('pt-BR') : 'Hoje'}`, 14, 28);
    doc.text(`Registros: ${filteredMoves.length}`, 14, 33);

    // Table
    const tableData = filteredMoves.map(move => {
      const coord = employees.find(e => e.id === move.coordinatorId)?.name.split(' ')[0] || '-';
      const sup = employees.find(e => e.id === move.supervisorId)?.name.split(' ')[0] || '-';
      const driver = employees.find(e => e.id === move.driverId)?.name.split(' ')[0] || '-';

      return [
        new Date(move.date).toLocaleDateString('pt-BR'),
        move.residentName,
        move.originAddress,
        move.destinationAddress,
        `${move.itemsVolume} m³`,
        `C:${coord} S:${sup} M:${driver}`,
        move.status
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Cliente', 'Origem', 'Destino', 'Vol', 'Equipe', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
      }
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} - Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`Relatorio_Mudancas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleForwardEmail = () => {
    alert("Funcionalidade: Encaminhando relatório por email...");
  };

  // Operational Costs Analysis
  const opCostBreakdown = useMemo(() => {
    const breakdown = { truck: 0, helpers: 0, supervisor: 0, lunch: 0, total: 0 };
    operationalRecords.forEach(rec => {
      breakdown.truck += rec.costTruck;
      breakdown.helpers += rec.costHelpers;
      breakdown.supervisor += rec.costSupervisor;
      breakdown.lunch += rec.costLunch;
      breakdown.total += rec.totalCost;
    });
    return breakdown;
  }, [operationalRecords]);

  const pieData = [
    { name: 'Caminhão', value: opCostBreakdown.truck },
    { name: 'Ajudantes', value: opCostBreakdown.helpers },
    { name: 'Supervisão', value: opCostBreakdown.supervisor },
    { name: 'Almoço', value: opCostBreakdown.lunch },
  ];

  const ConfirmationIcon = ({ status }: { status?: AssignmentStatus }) => {
    if (status === 'CONFIRMED') return <CheckCircle size={12} className="text-green-500 inline ml-1" />;
    if (status === 'DECLINED') return <XCircle size={12} className="text-red-500 inline ml-1" />;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Central de Relatórios</h2>
          <p className="text-sm text-gray-500">Análise de dados e insights estratégicos</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
          <button
            onClick={() => setActiveTab('operational')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'operational' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Operacional (Mudanças)
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'financial' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Financeiro <Lock size={12} className="opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* VIEW: OPERATIONAL REPORT */}
      {/* ========================================================== */}
      {activeTab === 'operational' && (
        <div className="space-y-6">
          {/* Filters Section */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Filter size={18} className="text-blue-600" /> Filtros do Relatório
              </h3>
              <button onClick={handleClearOpFilters} className="text-xs text-blue-600 hover:underline">Limpar filtros (Relatório Geral)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Período (Início)</label>
                <input
                  type="date"
                  value={opStartDate}
                  onChange={e => setOpStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Período (Fim)</label>
                <input
                  type="date"
                  value={opEndDate}
                  onChange={e => setOpEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Funcionário Envolvido</label>
                <select
                  value={opEmployeeId}
                  onChange={e => setOpEmployeeId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="ALL">Todos</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Morador / Cliente</label>
                <select
                  value={opResidentId}
                  onChange={e => setOpResidentId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="ALL">Todos</option>
                  {residents.map(res => (
                    <option key={res.id} value={res.id}>{res.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Operational KPIs Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total de Mudanças</p>
                <h3 className="text-2xl font-bold text-gray-800">{filteredMoves.length}</h3>
                <p className="text-xs text-gray-400 mt-1">Registros filtrados</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                <Truck size={24} />
              </div>
            </div>
          </div>

          {/* Results Table (Detailed) - ALWAYS VISIBLE */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800">Relatório Completo (Detalhado)</h3>
                <p className="text-xs text-gray-500">Dados brutos para análise operacional</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleForwardEmail}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium"
                >
                  <Share2 size={14} /> Encaminhar
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
                >
                  <Printer size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600">Data</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Cliente</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Origem / Destino</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Equipe</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Volume</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMoves.length > 0 ? (
                    filteredMoves.map(move => {
                      const coord = employees.find(e => e.id === move.coordinatorId)?.name.split(' ')[0] || '-';
                      const sup = employees.find(e => e.id === move.supervisorId)?.name.split(' ')[0] || '-';
                      const driver = employees.find(e => e.id === move.driverId)?.name.split(' ')[0] || '-';
                      const van = employees.find(e => e.id === move.vanId)?.name.split(' ')[0] || '-';

                      return (
                        <tr key={move.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-800 whitespace-nowrap">{new Date(move.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-3 font-medium text-gray-800">{move.residentName}</td>
                          <td className="px-6 py-3 text-xs text-gray-500">
                            <div className="font-medium text-gray-700 truncate max-w-[150px]" title={move.originAddress}>De: {move.originAddress}</div>
                            <div className="truncate max-w-[150px]" title={move.destinationAddress}>Para: {move.destinationAddress}</div>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">
                            <div><span className="font-bold text-gray-600">C:</span> {coord}</div>
                            <div><span className="font-bold text-gray-600">S:</span> {sup}</div>
                            <div>
                              <span className="font-bold text-gray-600">M:</span> {driver}
                              <ConfirmationIcon status={move.driverConfirmation} />
                            </div>
                            <div>
                              <span className="font-bold text-gray-600">V:</span> {van}
                              <ConfirmationIcon status={move.vanConfirmation} />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-800 font-medium">
                            {move.itemsVolume} m³
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${move.status === MoveStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {move.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum registro encontrado com os filtros atuais.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: FINANCIAL REPORT (ADMIN ONLY) */}
      {/* ========================================================== */}
      {activeTab === 'financial' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <DollarSign size={18} className="text-green-600" /> Filtros Financeiros
            </h3>
            <div className="flex gap-2">
              <select
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>

              <select
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="ALL">Todo o Ano</option>
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>
          </div>

          {/* Operational Consolidated Costs (From Daily Inputs) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" /> Consolidação de Custo Operacional
              </h3>
              <div className="flex justify-center">
                <PieChart width={300} height={200}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-600">Caminhões</span>
                  <span className="font-bold">R$ {opCostBreakdown.truck.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-600">Ajudantes</span>
                  <span className="font-bold">R$ {opCostBreakdown.helpers.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-600">Supervisores</span>
                  <span className="font-bold">R$ {opCostBreakdown.supervisor.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-600">Alimentação</span>
                  <span className="font-bold">R$ {opCostBreakdown.lunch.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-gray-800">TOTAL OPERACIONAL</span>
                  <span className="font-bold text-blue-600">R$ {opCostBreakdown.total.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* General Finance Stats */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Receita Total</p>
                  <h3 className="text-2xl font-bold text-gray-800">R$ {totalRevenue.toLocaleString('pt-BR')}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Despesas Totais</p>
                  <h3 className="text-2xl font-bold text-gray-800">R$ {totalCost.toLocaleString('pt-BR')}</h3>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-full">
                  <Activity size={20} />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Margem de Lucro</p>
                  <h3 className="text-2xl font-bold text-gray-800">{profitMargin.toFixed(1)}%</h3>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-full">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>
          </div>


          {/* AI Analysis Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Análise Inteligente (Gemini AI)</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {aiAnalysis || "Clique no botão abaixo para gerar uma análise estratégica baseada nos dados do período selecionado."}
                </p>
                {!aiAnalysis ? (
                  <button
                    onClick={handleGenerateAI}
                    disabled={loadingAi}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingAi ? 'Processando...' : 'Gerar Insights com IA'}
                    {!loadingAi && <Sparkles size={16} />}
                  </button>
                ) : (
                  <div className="mt-2 text-indigo-900 font-medium bg-white/50 p-4 rounded-lg border border-indigo-100 leading-relaxed text-sm">
                    {aiAnalysis}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                Performance Semestral
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" name="Receita" />
                    <Area type="monotone" dataKey="cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" name="Custos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                Volume de Mudanças
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="moves" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Mudanças Realizadas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};