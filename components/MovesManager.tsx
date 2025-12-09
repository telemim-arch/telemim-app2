
import React, { useState, useEffect } from 'react';
import { MoveRequest, MoveStatus, UserRole, User, Resident, AssignmentStatus } from '../types';
import { Calendar, MapPin, Truck, Users, Plus, X, Clock, CheckCircle, ArrowRight, Play, AlertCircle, Edit2, Filter, Shield, Box, ThumbsUp, ThumbsDown, MessageSquare, ExternalLink, Share2, FileText, FileBarChart } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MovesManagerProps {
  moves: MoveRequest[];
  residents: Resident[];
  employees: User[];
  onStatusChange: (id: string, status: MoveStatus) => void;
  onAddMove: (move: MoveRequest) => void;
  onUpdateMove: (move: MoveRequest) => void;
  onVolumeValidation: (id: string, status: 'APPROVED' | 'REJECTED', contestedVolume?: number, notes?: string) => void;
  onAssignmentConfirmation?: (id: string, role: UserRole, status: AssignmentStatus) => void;
  userRole: UserRole;
  initialFilter?: MoveStatus | 'ALL';
  currentUserId: string;
}

export const MovesManager: React.FC<MovesManagerProps> = ({
  moves, residents, employees, onStatusChange, onAddMove, onUpdateMove, onVolumeValidation, onAssignmentConfirmation, userRole, initialFilter = 'ALL', currentUserId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<MoveStatus | 'ALL'>(initialFilter);

  // Date Range Filters
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Contestation Form State
  const [contestingId, setContestingId] = useState<string | null>(null);
  const [contestationData, setContestationData] = useState({ volume: '', notes: '' });

  // Sync filter when prop changes
  useEffect(() => {
    setFilterStatus(initialFilter);
  }, [initialFilter]);

  // New Move State
  const [moveForm, setMoveForm] = useState<Partial<MoveRequest>>({
    date: '',
    time: '',
    residentId: '',
    residentName: '',
    coordinatorId: '',
    supervisorId: '',
    driverId: '',
    vanId: '',
    itemsVolume: 0,
    distance: '',
    notes: ''
  });

  const [selectedResidentPreview, setSelectedResidentPreview] = useState<Resident | null>(null);

  const filteredMoves = moves.filter(m => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;

    // 2. Assignment Filter (If not Admin)
    if (userRole !== UserRole.ADMIN) {
      const isAssigned =
        m.coordinatorId === currentUserId ||
        m.supervisorId === currentUserId ||
        m.driverId === currentUserId ||
        m.vanId === currentUserId; // Allow VAN users to see their moves

      if (!isAssigned) return false;
    }

    // 3. Date Range & Completed Visibility Logic
    if (filterStartDate || filterEndDate) {
      // Range Logic
      if (filterStartDate && m.date < filterStartDate) return false;
      if (filterEndDate && m.date > filterEndDate) return false;
    } else {
      // Default Logic (No dates selected):
      // Hide COMPLETED moves that are NOT from TODAY.
      if (m.status === MoveStatus.COMPLETED) {
        const today = new Date().toISOString().split('T')[0];
        if (m.date !== today) return false;
      }
    }

    return true;
  });

  const coordinators = employees.filter(e => e.role === UserRole.COORDINATOR && e.status === 'Ativo');
  const supervisors = employees.filter(e => e.role === UserRole.SUPERVISOR && e.status === 'Ativo');
  const drivers = employees.filter(e => e.role === UserRole.DRIVER && e.status === 'Ativo');
  const vans = employees.filter(e => e.role === UserRole.VAN && e.status === 'Ativo');

  const handleResidentChange = (residentId: string) => {
    const resident = residents.find(r => r.id === residentId);
    if (resident) {
      setMoveForm(prev => ({
        ...prev,
        residentId: resident.id,
        residentName: resident.name.toUpperCase()
      }));
      setSelectedResidentPreview(resident);
    } else {
      setSelectedResidentPreview(null);
    }
  };

  const handleOpenModal = (move?: MoveRequest) => {
    if (move) {
      setEditingId(move.id);
      setMoveForm({
        ...move,
        residentName: move.residentName.toUpperCase(),
        coordinatorId: move.coordinatorId || '',
        supervisorId: move.supervisorId || '',
        driverId: move.driverId || '',
        vanId: move.vanId || '',
        distance: move.distance || '',
        notes: (move.notes || '').toUpperCase()
      });
      const resident = residents.find(r => r.id === move.residentId);
      setSelectedResidentPreview(resident || null);
    } else {
      setEditingId(null);
      setMoveForm({
        date: '',
        time: '',
        residentId: '',
        residentName: '',
        coordinatorId: '',
        supervisorId: '',
        driverId: '',
        vanId: '',
        itemsVolume: 0,
        distance: '',
        notes: ''
      });
      setSelectedResidentPreview(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveForm.residentName || !moveForm.date) return;

    // DUPLICATE CHECK: Resident uniqueness regardless of date
    const hasExistingMove = moves.some(m =>
      m.residentId === moveForm.residentId &&
      m.id !== editingId
    );

    if (hasExistingMove) {
      alert("Notificação: Cliente já realizou o agendamento.");
      return;
    }

    if (editingId) {
      // Update existing
      const originalMove = moves.find(m => m.id === editingId);
      if (originalMove) {
        const updatedMove: MoveRequest = {
          ...originalMove,
          ...moveForm,
          itemsVolume: Number(moveForm.itemsVolume)
        } as MoveRequest;
        onUpdateMove(updatedMove);
      }
    } else {
      // Create new
      if (!selectedResidentPreview) return;

      const originAddress = `${selectedResidentPreview.originStreet}, ${selectedResidentPreview.originNumber} - ${selectedResidentPreview.originNeighborhood}, ${selectedResidentPreview.originCity}`.toUpperCase();
      const destinationAddress = `${selectedResidentPreview.destinationStreet}, ${selectedResidentPreview.destinationNumber} - ${selectedResidentPreview.destinationNeighborhood}, ${selectedResidentPreview.destinationCity}`.toUpperCase();

      const move: MoveRequest = {
        id: `OS-${Date.now().toString().slice(-4)}`,
        residentName: moveForm.residentName!.toUpperCase(),
        originAddress,
        destinationAddress,
        date: moveForm.date!,
        time: moveForm.time || '08:00',
        status: MoveStatus.PENDING,
        itemsVolume: Number(moveForm.itemsVolume) || 0,
        estimatedCost: 0,
        createdAt: new Date().toISOString(),
        residentId: moveForm.residentId,
        coordinatorId: moveForm.coordinatorId || '',
        supervisorId: moveForm.supervisorId || '',
        driverId: moveForm.driverId || '',
        vanId: moveForm.vanId || '',
        distance: moveForm.distance || '',
        notes: (moveForm.notes || '').toUpperCase(),
        driverConfirmation: 'PENDING',
        vanConfirmation: 'PENDING'
      };
      onAddMove(move);
    }

    setIsModalOpen(false);
    setSelectedResidentPreview(null);
  };

  // Permission Logic
  const canEditStatus = [UserRole.ADMIN, UserRole.SUPERVISOR].includes(userRole);
  // Van role is Read Only same as Driver
  const isReadOnly = userRole === UserRole.DRIVER || userRole === UserRole.VAN;
  const isVolumeReadOnly = userRole === UserRole.DRIVER || userRole === UserRole.COORDINATOR || userRole === UserRole.VAN;
  const canValidateVolume = [UserRole.ADMIN, UserRole.COORDINATOR].includes(userRole);

  const validateAssignments = (move: MoveRequest) => {
    // Van is optional, so we don't check for vanId
    if (!move.coordinatorId || !move.supervisorId || !move.driverId) {
      alert("Ação Bloqueada: Para aprovar o agendamento, é obrigatório selecionar:\n- Coordenador\n- Supervisor\n- Motorista");
      return false;
    }
    return true;
  };

  const handleQuickStatusUpdate = (move: MoveRequest, currentStatus: MoveStatus) => {
    let nextStatus: MoveStatus | null = null;

    switch (currentStatus) {
      case MoveStatus.PENDING: nextStatus = MoveStatus.APPROVED; break;
      case MoveStatus.APPROVED: nextStatus = MoveStatus.IN_PROGRESS; break;
      case MoveStatus.IN_PROGRESS: nextStatus = MoveStatus.COMPLETED; break;
      default: nextStatus = null;
    }

    if (nextStatus) {
      // RULE: Check assignments before approving
      if (nextStatus === MoveStatus.APPROVED) {
        if (!validateAssignments(move)) return;
      }
      // RULE: Check Volume > 0 before completing
      if (nextStatus === MoveStatus.COMPLETED) {
        if (!move.itemsVolume || move.itemsVolume <= 0) {
          alert("Ação Bloqueada: Informe o volume medido (maior que 0) antes de concluir a mudança.");
          return;
        }
      }

      onStatusChange(move.id, nextStatus);
    }
  };

  const handleStatusDropdownChange = (move: MoveRequest, newStatus: MoveStatus) => {
    // RULE: Check assignments before approving
    if (newStatus === MoveStatus.APPROVED) {
      if (!validateAssignments(move)) return;
    }

    // RULE: Check Volume > 0 before completing
    if (newStatus === MoveStatus.COMPLETED) {
      if (!move.itemsVolume || move.itemsVolume <= 0) {
        alert("Ação Bloqueada: Informe o volume medido (maior que 0) antes de concluir a mudança.");
        return;
      }
    }

    onStatusChange(move.id, newStatus);
  };

  const handleVolumeChange = (move: MoveRequest, newVolume: string) => {
    const vol = parseFloat(newVolume);
    if (!isNaN(vol)) {
      onUpdateMove({ ...move, itemsVolume: vol });
    } else if (newVolume === '') {
      onUpdateMove({ ...move, itemsVolume: 0 });
    }
  };

  const startContestation = (move: MoveRequest) => {
    setContestingId(move.id);
    setContestationData({ volume: move.itemsVolume.toString(), notes: '' });
  };

  const submitContestation = () => {
    if (contestingId) {
      onVolumeValidation(contestingId, 'REJECTED', Number(contestationData.volume), contestationData.notes?.toUpperCase());
      setContestingId(null);
    }
  };

  const cancelContestation = () => {
    setContestingId(null);
    setContestationData({ volume: '', notes: '' });
  };

  // --- REPORTING ACTIONS ---
  const handleShareMove = (move: MoveRequest) => {
    const driver = employees.find(e => e.id === move.driverId);
    const coordinator = employees.find(e => e.id === move.coordinatorId);
    const supervisor = employees.find(e => e.id === move.supervisorId);
    const van = employees.find(e => e.id === move.vanId);

    // Format timestamp if completed
    const completionInfo = move.status === MoveStatus.COMPLETED
      ? `\nConcluído em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
      : '';

    const text = `
*ORDEM DE SERVIÇO ${move.id}*
--------------------------------
CLIENTE: ${move.residentName}
DATA: ${formatDate(move.date)} às ${move.time}

ORIGEM: ${move.originAddress}
DESTINO: ${move.destinationAddress}

VOLUME: ${move.itemsVolume}m³

*EQUIPE ALOCADA*:
COORDENADOR: ${coordinator ? coordinator.name : 'N/A'}
SUPERVISOR: ${supervisor ? supervisor.name : 'N/A'}
MOTORISTA: ${driver ? driver.name : 'N/A'}
VAN/APOIO: ${van ? van.name : 'N/A'}
${completionInfo}
--------------------------------
`.toUpperCase();

    if (navigator.share) {
      navigator.share({
        title: `OS ${move.id} - ${move.residentName}`,
        text: text
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Dados da mudança copiados para a área de transferência!');
    }
  };

  const handleExportPDF = (move: MoveRequest) => {
    const doc = new jsPDF();

    const driver = employees.find(e => e.id === move.driverId);
    const coordinator = employees.find(e => e.id === move.coordinatorId);
    const supervisor = employees.find(e => e.id === move.supervisorId);
    const van = employees.find(e => e.id === move.vanId);

    // Header
    doc.setFillColor(41, 128, 185); // Blue
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORDEM DE SERVIÇO: ${move.id}`, 105, 13, { align: 'center' });

    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    autoTable(doc, {
      startY: 30,
      head: [['DADOS DO CLIENTE']],
      body: [
        [`NOME: ${move.residentName}`],
        [`DATA AGENDADA: ${formatDate(move.date)} às ${move.time}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] }
    });

    // Addresses
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['ORIGEM', 'DESTINO']],
      body: [
        [move.originAddress, move.destinationAddress]
      ],
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] }
    });

    // Logistics
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['LOGÍSTICA E EQUIPE']],
      body: [
        [`VOLUME ESTIMADO: ${move.itemsVolume} m³`],
        [`COORDENADOR: ${coordinator ? coordinator.name : 'NÃO DEFINIDO'}`],
        [`SUPERVISOR: ${supervisor ? supervisor.name : 'NÃO DEFINIDO'}`],
        [`MOTORISTA: ${driver ? driver.name : 'NÃO DEFINIDO'}`],
        [`VAN DE APOIO: ${van ? van.name : 'N/A'}`],
        [`DISTÂNCIA: ${move.distance || 'N/A'}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113] }
    });

    // Notes
    if (move.notes) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['OBSERVAÇÕES']],
        body: [[move.notes]],
        theme: 'plain',
        headStyles: { fillColor: [149, 165, 166] }
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, 290, { align: 'center' });

    doc.save(`OS_${move.id}_${move.residentName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleFullReport = (move: MoveRequest) => {
    alert(`Abrindo relatório detalhado da mudança de ${move.residentName}...\n\nInclui: Tempos, Custos, Lista de Itens e Ocorrências.`);
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  const StatusBadge = ({ status }: { status: MoveStatus }) => {
    const colors = {
      [MoveStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
      [MoveStatus.APPROVED]: 'bg-blue-100 text-blue-700',
      [MoveStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-700 animate-pulse',
      [MoveStatus.COMPLETED]: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const ConfirmationStatusBadge = ({ status }: { status?: AssignmentStatus }) => {
    if (!status || status === 'PENDING') return <span className="text-[10px] text-gray-400 font-normal italic uppercase">Pendente</span>;
    if (status === 'CONFIRMED') return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5"><CheckCircle size={10} /> Confirmado</span>;
    if (status === 'DECLINED') return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5"><X size={10} /> Recusado</span>;
    return null;
  };

  const clearDateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Agendamento de Mudanças</h2>
          <p className="text-sm text-gray-500">Controle de ordens de serviço e alocação de equipe</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">

          {/* DATE RANGE FILTER */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1 gap-2">
            <Calendar size={14} className="text-gray-400" />
            <div className="flex items-center gap-1">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">De</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="text-xs text-gray-700 outline-none uppercase bg-transparent p-0 w-[110px]"
                />
              </div>
              <span className="text-gray-300">-</span>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">Até</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="text-xs text-gray-700 outline-none uppercase bg-transparent p-0 w-[110px]"
                />
              </div>
            </div>
            {(filterStartDate || filterEndDate) && (
              <button onClick={clearDateFilters} className="ml-1 text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative h-10">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-full uppercase"
            >
              <option value="ALL">Todos os Status</option>
              {Object.values(MoveStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-700 transition-colors flex items-center gap-2 uppercase h-10"
            >
              <Plus size={18} /> Novo
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterStatus !== 'ALL' || filterStartDate || filterEndDate) && (
        <div className="flex gap-2 flex-wrap">
          {filterStatus !== 'ALL' && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
              <span>Status: <strong>{filterStatus}</strong></span>
              <button onClick={() => setFilterStatus('ALL')} className="text-blue-500 hover:text-blue-700"><X size={14} /></button>
            </div>
          )}
          {(filterStartDate || filterEndDate) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
              <span>Período: <strong>{formatDate(filterStartDate) || '...'}</strong> até <strong>{formatDate(filterEndDate) || '...'}</strong></span>
              <button onClick={clearDateFilters} className="text-blue-500 hover:text-blue-700"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMoves.map(move => {
          const driver = employees.find(e => e.id === move.driverId);
          const coordinator = employees.find(e => e.id === move.coordinatorId);
          const supervisor = employees.find(e => e.id === move.supervisorId);
          const van = employees.find(e => e.id === move.vanId);

          const isMyDriverAssignment = userRole === UserRole.DRIVER && move.driverId === currentUserId;
          const isMyVanAssignment = userRole === UserRole.VAN && move.vanId === currentUserId;

          return (
            <div key={move.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col justify-between group relative">

              {!isReadOnly && (
                <button
                  onClick={() => handleOpenModal(move)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Editar Agendamento"
                >
                  <Edit2 size={16} />
                </button>
              )}

              <div>
                <div className="flex justify-between items-start mb-4 pr-6">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{move.id}</span>
                  <StatusBadge status={move.status} />
                </div>

                <div className="mb-4">
                  {/* RESIDENT NAME - BOLD AND UPPERCASE */}
                  <h3 className="font-black text-lg text-gray-800 mb-1 uppercase tracking-wide">{move.residentName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} /> {formatDate(move.date)}
                    <span className="text-gray-300">|</span>
                    <Clock size={14} /> {move.time}
                  </div>
                  {move.distance && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <ArrowRight size={12} className="text-blue-500" /> Distância: <span className="font-semibold text-gray-900">{move.distance}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-2">
                    <div className="w-4 mt-0.5 text-blue-500"><MapPin size={14} /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="line-clamp-2 text-xs text-gray-500 leading-tight uppercase">Origem</p>
                          <p className="line-clamp-2 font-medium leading-tight uppercase">{move.originAddress}</p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(move.originAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors"
                          title="Abrir no Google Maps"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="border-l border-dashed border-gray-300 ml-2 h-2"></div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 mt-0.5 text-green-500"><MapPin size={14} /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="line-clamp-2 text-xs text-gray-500 leading-tight uppercase">Destino</p>
                          <p className="line-clamp-2 font-medium leading-tight uppercase">{move.destinationAddress}</p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(move.destinationAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-1.5 rounded transition-colors"
                          title="Abrir no Google Maps"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume Edit/Display - UPDATED */}
                <div className="flex items-center gap-2 mb-4 bg-gray-50/50 p-2 rounded border border-gray-100">
                  <Box size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap uppercase">Volume Final (m³):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={isVolumeReadOnly}
                    value={move.itemsVolume || ''}
                    onChange={(e) => handleVolumeChange(move, e.target.value)}
                    className={`w-20 p-1 text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center ${isVolumeReadOnly ? 'bg-transparent border-none' : ''}`}
                    placeholder="0.0"
                  />
                  {move.itemsVolume <= 0 && move.status === MoveStatus.IN_PROGRESS && !isVolumeReadOnly && (
                    <span className="text-[10px] text-red-500 font-bold animate-pulse ml-auto bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase">
                      Obrigatório
                    </span>
                  )}
                </div>

                {/* --- VOLUME VALIDATION SECTION (Only when COMPLETED) --- */}
                {move.status === MoveStatus.COMPLETED && (
                  <div className="mb-4 border-t border-gray-100 pt-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Validação de Volume Final</p>

                    {contestingId === move.id ? (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 space-y-2 animate-fade-in">
                        <h4 className="text-xs font-bold text-orange-800 flex items-center gap-1 uppercase"><AlertCircle size={12} /> Contestação de Volume</h4>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Volume Correto (m³)</label>
                          <input
                            type="number"
                            value={contestationData.volume}
                            onChange={(e) => setContestationData({ ...contestationData, volume: e.target.value })}
                            className="w-full text-xs p-1 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Observação / Motivo</label>
                          <textarea
                            value={contestationData.notes}
                            onChange={(e) => setContestationData({ ...contestationData, notes: e.target.value.toUpperCase() })}
                            className="w-full text-xs p-1 border rounded resize-none uppercase"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={cancelContestation} className="flex-1 text-xs bg-white border border-gray-200 py-1 rounded text-gray-600 uppercase">Cancelar</button>
                          <button onClick={submitContestation} className="flex-1 text-xs bg-orange-600 text-white py-1 rounded font-bold uppercase">Confirmar</button>
                        </div>
                      </div>
                    ) : (
                      !move.volumeValidationStatus || move.volumeValidationStatus === 'PENDING' ? (
                        canValidateVolume ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onVolumeValidation(move.id, 'APPROVED')}
                              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors uppercase"
                            >
                              <ThumbsUp size={12} /> Aprovar
                            </button>
                            <button
                              onClick={() => startContestation(move)}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors uppercase"
                            >
                              <ThumbsDown size={12} /> Contestar
                            </button>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-100 flex items-center gap-1 uppercase">
                            <Clock size={12} /> Aguardando aprovação
                          </div>
                        )
                      ) : (
                        move.volumeValidationStatus === 'APPROVED' ? (
                          <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded border border-green-100 flex items-center gap-1 uppercase">
                            <CheckCircle size={12} /> Volume Aprovado
                          </div>
                        ) : (
                          <div className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-100 flex flex-col gap-1 items-start uppercase">
                            <div className="flex items-center gap-1">
                              <AlertCircle size={12} /> Volume Contestado
                            </div>
                            {move.contestedVolume && (
                              <div className="text-[10px] font-normal pl-4">
                                Real: {move.contestedVolume}m³ <br />
                                <span className="italic">"{move.contestationNotes}"</span>
                              </div>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                )}

                {/* Assigned Staff */}
                <div className="mb-4 bg-white/50 border border-gray-100 rounded-lg p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Users size={12} />
                    </div>
                    <div className="flex items-baseline gap-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Coord:</span>
                      <span className="text-xs text-gray-900 font-semibold truncate uppercase">
                        {coordinator ? coordinator.name : <span className="text-gray-400 font-normal italic">-</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Shield size={12} />
                    </div>
                    <div className="flex items-baseline gap-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Sup:</span>
                      <span className="text-xs text-gray-900 font-semibold truncate uppercase">
                        {supervisor ? supervisor.name : <span className="text-gray-400 font-normal italic">-</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Truck size={12} />
                    </div>
                    <div className="flex items-baseline gap-1 overflow-hidden flex-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Mot:</span>
                      <span className="text-xs text-gray-900 font-semibold truncate uppercase">
                        {driver ? driver.name : <span className="text-gray-400 font-normal italic">-</span>}
                      </span>
                    </div>
                    {userRole === UserRole.ADMIN ? (
                      <select
                        value={move.driverConfirmation || 'PENDING'}
                        onChange={(e) => onAssignmentConfirmation && onAssignmentConfirmation(move.id, UserRole.DRIVER, e.target.value as AssignmentStatus)}
                        className={`text-[10px] uppercase font-bold py-0.5 px-1 rounded border outline-none cursor-pointer ${move.driverConfirmation === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                          move.driverConfirmation === 'DECLINED' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                      >
                        <option value="PENDING">Pendente</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="DECLINED">Recusado</option>
                      </select>
                    ) : (
                      <ConfirmationStatusBadge status={move.driverConfirmation} />
                    )}
                  </div>

                  {/* Van Display */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Truck size={12} />
                    </div>
                    <div className="flex items-baseline gap-1 overflow-hidden flex-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Van:</span>
                      <span className="text-xs text-gray-900 font-semibold truncate uppercase">
                        {van ? van.name : <span className="text-gray-400 font-normal italic">-</span>}
                      </span>
                    </div>
                    {userRole === UserRole.ADMIN ? (
                      <select
                        value={move.vanConfirmation || 'PENDING'}
                        onChange={(e) => onAssignmentConfirmation && onAssignmentConfirmation(move.id, UserRole.VAN, e.target.value as AssignmentStatus)}
                        className={`text-[10px] uppercase font-bold py-0.5 px-1 rounded border outline-none cursor-pointer ${move.vanConfirmation === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                          move.vanConfirmation === 'DECLINED' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                      >
                        <option value="PENDING">Pendente</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="DECLINED">Recusado</option>
                      </select>
                    ) : (
                      <ConfirmationStatusBadge status={move.vanConfirmation} />
                    )}
                  </div>
                </div>
              </div>

              {/* Status Actions - Moved ABOVE Sharing actions */}
              <div className="border-t border-gray-100 pt-3 mt-auto mb-3">
                {canEditStatus ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Ações do Status</p>
                    <div className="flex gap-2">
                      {move.status === MoveStatus.PENDING && (
                        <button onClick={() => handleQuickStatusUpdate(move, MoveStatus.PENDING)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors uppercase">
                          <CheckCircle size={14} /> Aprovar
                        </button>
                      )}
                      {move.status === MoveStatus.APPROVED && (
                        <button onClick={() => handleQuickStatusUpdate(move, MoveStatus.APPROVED)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors uppercase">
                          <Play size={14} /> Iniciar
                        </button>
                      )}
                      {move.status === MoveStatus.IN_PROGRESS && (
                        <button onClick={() => handleQuickStatusUpdate(move, MoveStatus.IN_PROGRESS)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors uppercase">
                          <CheckCircle size={14} /> Concluir
                        </button>
                      )}
                      {move.status === MoveStatus.COMPLETED && (
                        <div className="flex-1 bg-gray-100 text-gray-500 text-xs py-2 rounded flex items-center justify-center gap-1 cursor-default uppercase">
                          <CheckCircle size={14} /> Finalizado
                        </div>
                      )}

                      <div className="relative group">
                        <select
                          value={move.status}
                          onChange={(e) => handleStatusDropdownChange(move, e.target.value as MoveStatus)}
                          className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 pl-3 pr-8 rounded outline-none cursor-pointer transition-colors h-full uppercase"
                        >
                          {Object.values(MoveStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                          <ArrowRight size={12} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 italic uppercase">Apenas leitura</span>
                  </div>
                )}

                {/* Confirmation Buttons for Driver/Van - ONLY VISIBLE IF STATUS IS APPROVED */}
                {onAssignmentConfirmation && move.status === MoveStatus.APPROVED && (
                  <div className="mt-2 space-y-2">
                    {isMyDriverAssignment && (!move.driverConfirmation || move.driverConfirmation === 'PENDING') && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                        <p className="text-[10px] font-bold text-yellow-800 mb-1 uppercase text-center">Confirmar Escala (Motorista)?</p>
                        <div className="flex gap-2">
                          <button onClick={() => onAssignmentConfirmation(move.id, UserRole.DRIVER, 'CONFIRMED')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded uppercase">Confirmar</button>
                          <button onClick={() => onAssignmentConfirmation(move.id, UserRole.DRIVER, 'DECLINED')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded uppercase">Recusar</button>
                        </div>
                      </div>
                    )}
                    {isMyVanAssignment && (!move.vanConfirmation || move.vanConfirmation === 'PENDING') && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                        <p className="text-[10px] font-bold text-yellow-800 mb-1 uppercase text-center">Confirmar Escala (Van)?</p>
                        <div className="flex gap-2">
                          <button onClick={() => onAssignmentConfirmation(move.id, UserRole.VAN, 'CONFIRMED')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded uppercase">Confirmar</button>
                          <button onClick={() => onAssignmentConfirmation(move.id, UserRole.VAN, 'DECLINED')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded uppercase">Recusar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* REPORTING & SHARING ACTIONS (Excluded for Drivers/Van) - Moved BELOW Status Actions */}
              {!isReadOnly && (
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleShareMove(move)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200 transition-colors uppercase"
                    title="Compartilhar Detalhes"
                  >
                    <Share2 size={14} /> Compartilhar
                  </button>
                  <button
                    onClick={() => handleExportPDF(move)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-medium border border-gray-200 hover:border-red-100 transition-colors uppercase"
                    title="Exportar PDF da OS"
                  >
                    <FileText size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handleFullReport(move)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs font-medium border border-gray-200 hover:border-blue-100 transition-colors uppercase"
                    title="Relatório Detalhado"
                  >
                    <FileBarChart size={14} /> Detalhes
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredMoves.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-100 rounded-xl border border-dashed border-gray-200 uppercase">
            <p>Nenhum agendamento encontrado.</p>
            {!(filterStartDate || filterEndDate) && (
              <p className="text-xs mt-2 text-gray-300">Dica: Mudanças concluídas de outros dias estão ocultas. Use o filtro de data para vê-las.</p>
            )}
            {userRole !== UserRole.ADMIN && (
              <p className="text-xs mt-2 text-gray-400">Nota: Você só visualiza as mudanças em que foi escalado.</p>
            )}
          </div>
        )}
      </div>

      {isModalOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase">
                <Calendar size={20} className="text-blue-600" />
                {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Selecionar Morador</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 uppercase"
                  onChange={(e) => handleResidentChange(e.target.value)}
                  value={moveForm.residentId}
                  disabled={!!editingId}
                >
                  <option value="">SELECIONE UM MORADOR CADASTRADO...</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.seal || 'SEM SELO'}</option>
                  ))}
                </select>

                {selectedResidentPreview ? (
                  <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                    <p className="font-bold text-blue-800 text-xs uppercase mb-2">Rota Automática</p>
                    <div className="flex gap-2 items-center text-gray-700">
                      <MapPin size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate uppercase">{selectedResidentPreview.originStreet}, {selectedResidentPreview.originNumber}</span>
                    </div>
                    <div className="ml-1.5 h-3 border-l border-blue-300 my-0.5"></div>
                    <div className="flex gap-2 items-center text-gray-700">
                      <MapPin size={14} className="text-green-500 shrink-0" />
                      <span className="truncate uppercase">{selectedResidentPreview.destinationStreet}, {selectedResidentPreview.destinationNumber}</span>
                    </div>
                  </div>
                ) : (
                  !editingId && (
                    <p className="text-xs text-gray-500 mt-1 italic uppercase">
                      <AlertCircle size={12} className="inline mr-1" />
                      Os endereços de origem e destino serão carregados automaticamente do perfil do morador.
                    </p>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Data</label>
                  <input
                    type="date" required
                    value={moveForm.date}
                    onChange={e => setMoveForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Horário</label>
                  <input
                    type="time" required
                    value={moveForm.time}
                    onChange={e => setMoveForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                {editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Volume Est. (m³)</label>
                    <input
                      type="number"
                      value={moveForm.itemsVolume}
                      onChange={e => setMoveForm(prev => ({ ...prev, itemsVolume: Number(e.target.value) }))}
                      className={`w-full p-2 border border-gray-300 rounded-lg text-gray-900 ${isVolumeReadOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                      disabled={isVolumeReadOnly}
                    />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2 uppercase">
                  <Users size={16} /> Alocação de Equipe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Coordenador</label>
                    <select
                      value={moveForm.coordinatorId || ''}
                      onChange={e => setMoveForm(prev => ({ ...prev, coordinatorId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-900 uppercase"
                    >
                      <option value="">SELECIONE...</option>
                      {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Supervisor</label>
                    <select
                      value={moveForm.supervisorId || ''}
                      onChange={e => setMoveForm(prev => ({ ...prev, supervisorId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-900 uppercase"
                    >
                      <option value="">SELECIONE...</option>
                      {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Motorista</label>
                    <select
                      value={moveForm.driverId || ''}
                      onChange={e => setMoveForm(prev => ({ ...prev, driverId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-900 uppercase"
                    >
                      <option value="">SELECIONE...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Van (Opcional)</label>
                    <select
                      value={moveForm.vanId || ''}
                      onChange={e => setMoveForm(prev => ({ ...prev, vanId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-900 uppercase"
                    >
                      <option value="">SELECIONE...</option>
                      {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Observações</label>
                <textarea
                  value={moveForm.notes || ''}
                  onChange={e => setMoveForm(prev => ({ ...prev, notes: e.target.value.toUpperCase() }))}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 uppercase"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow uppercase"
                >
                  {editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
