import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText,
  LogOut, Bell, Menu, X, DollarSign, Calendar, History, CheckCircle, Mail, HardHat
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ResidentsManager } from './components/ResidentsManager';
import { EmployeesManager } from './components/EmployeesManager';
import { FinancialManager } from './components/FinancialManager';
import { ReportsManager } from './components/ReportsManager';
import { MovesManager } from './components/MovesManager';
import { HelpersManager } from './components/HelpersManager';
import { User, UserRole, MoveStatus, MoveRequest, LogEntry, Resident, FinancialRecord, Notification, FinancialSettings, DailyOperationalRecord, Helper, AttendanceRecord, AssignmentStatus } from './types';
import { dbService } from './services/database';

// --- MAIN COMPONENT ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data States
  const [moves, setMoves] = useState<MoveRequest[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // NEW STATES
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({
    truckFirstTrip: 450, truckAdditionalTrip: 0, helperBase: 0, helperAdditionalTrip: 0, supervisorDaily: 0, lunchUnitCost: 0, vanDaily: 0, vanLunch: 0
  });
  const [operationalRecords, setOperationalRecords] = useState<DailyOperationalRecord[]>([]);

  // App Navigation State
  const [moveFilter, setMoveFilter] = useState<MoveStatus | 'ALL'>('ALL');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Computed: User specific notifications
  const userNotifications = notifications.filter(n => n.userId === user?.id);
  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await dbService.loadInitialData();
      setEmployees(data.users);
      setResidents(data.residents);
      setMoves(data.moves);
      setHelpers(data.helpers);
      setAttendanceRecords(data.attendance);
      setFinancials(data.financials);
      setOperationalRecords(data.operational);
      setNotifications(data.notifications);
      setLogs(data.logs);
      if (data.settings) setFinancialSettings(data.settings);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao conectar com o banco de dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Login Logic
  const handleLogin = (email: string, passwordInput: string) => {
    const foundUser = employees.find(u => u.email === email);

    if (foundUser) {
      if (foundUser.status === 'Inativo') {
        alert("Acesso Negado: Sua conta está desativada. Entre em contato com o administrador.");
        return;
      }

      if (foundUser.password && foundUser.password !== passwordInput) {
        alert("Senha incorreta. Tente novamente.");
        return;
      }
      setUser(foundUser);
      addLog(foundUser.id, foundUser.name, 'Login', 'Usuário entrou no sistema');
    } else {
      alert("Usuário não encontrado. Verifique o email.");
    }
  };

  // Helper to add logs to DB and State
  const addLog = async (userId: string, userName: string, action: string, details: string) => {
    // Optimistic update
    const newLog: LogEntry = {
      id: Date.now().toString(), // temporary ID
      timestamp: new Date().toISOString(),
      userId, userName, action, details
    };
    setLogs(prev => [newLog, ...prev]);

    // DB call
    await dbService.createLog({ userId, userName, action, details });
  };

  // Helper to create notifications
  const createNotification = async (userId: string, title: string, message: string) => {
    // DB Call
    const newNotif = await dbService.createNotification({ userId, title, message, type: 'info' });
    if (newNotif) {
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleStatusChange = async (moveId: string, newStatus: MoveStatus) => {
    const targetMove = moves.find(m => m.id === moveId);
    if (!targetMove) return;

    const prevStatus = targetMove.status;
    const updatedMove = { ...targetMove, status: newStatus };

    try {
      // DB Update
      await dbService.updateMove(updatedMove);

      // State Update
      setMoves(prev => prev.map(m => m.id === moveId ? updatedMove : m));

      if (user) {
        addLog(user.id, user.name, 'Edição', `Alterou status da ${moveId} para ${newStatus}`);

        // NOTIFICATION: Notify Admin if Coord/Sup makes changes
        if (user.role === UserRole.COORDINATOR || user.role === UserRole.SUPERVISOR) {
          const admins = employees.filter(e => e.role === UserRole.ADMIN);
          admins.forEach(admin => {
            createNotification(
              admin.id,
              'Atualização de Status',
              `${user.name} (${user.role}) alterou o status da mudança ${moveId} para ${newStatus}.`
            );
          });
        }
      }

      // SPECIAL NOTIFICATION: Notify ALL Coordinators when Admin or Supervisor sets status to APPROVED or COMPLETED
      if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR)) {
        if (newStatus === MoveStatus.APPROVED || newStatus === MoveStatus.COMPLETED) {
          const coordinators = employees.filter(e => e.role === UserRole.COORDINATOR);
          coordinators.forEach(coord => {
            createNotification(
              coord.id,
              'Atualização de Mudança',
              `A mudança ${moveId} foi atualizada para ${newStatus} por ${user.name}.`
            );
          });
        }
      }
    } catch (err) {
      alert("Erro ao atualizar status.");
      console.error(err);
    }
  };

  const handleVolumeValidation = async (moveId: string, status: 'APPROVED' | 'REJECTED', contestedVolume?: number, notes?: string) => {
    const targetMove = moves.find(m => m.id === moveId);
    if (!targetMove) return;

    const updatedMove = {
      ...targetMove,
      volumeValidationStatus: status,
      contestedVolume: contestedVolume,
      contestationNotes: notes
    };

    try {
      await dbService.updateMove(updatedMove);
      setMoves(prev => prev.map(m => m.id === moveId ? updatedMove : m));

      if (user) {
        const action = status === 'APPROVED' ? 'Aprovou' : 'Contestou';
        const detail = notes ? ` - Obs: ${notes} (Vol. Correto: ${contestedVolume}m³)` : '';
        addLog(user.id, user.name, 'Validação de Volume', `${action} o volume final da mudança ${moveId}${detail}`);
      }
    } catch (err) {
      alert("Erro ao validar volume.");
    }
  };

  const handleAssignmentConfirmation = async (moveId: string, role: UserRole, status: AssignmentStatus) => {
    const targetMove = moves.find(m => m.id === moveId);
    if (!targetMove) return;

    const updatedMove = { ...targetMove };
    if (role === UserRole.DRIVER) updatedMove.driverConfirmation = status;
    if (role === UserRole.VAN) updatedMove.vanConfirmation = status;

    try {
      await dbService.updateMove(updatedMove);
      setMoves(prev => prev.map(m => m.id === moveId ? updatedMove : m));

      if (user) {
        const roleName = role === UserRole.DRIVER ? 'Motorista' : 'Van';
        const action = status === 'CONFIRMED' ? 'Confirmou' : 'Recusou';
        addLog(user.id, user.name, 'Confirmação', `${roleName} ${action} a escala na mudança ${moveId}`);

        // Notify Coordinators if declined
        if (status === 'DECLINED') {
          const coordinators = employees.filter(e => e.role === UserRole.COORDINATOR);
          coordinators.forEach(coord => {
            createNotification(
              coord.id,
              'Escala Recusada',
              `O ${roleName} ${user.name} recusou a escala na mudança ${moveId}.`
            );
          });
        }
      }
    } catch (err) {
      alert("Erro ao confirmar escala.");
    }
  };

  const handleAddMove = async (newMoveInput: MoveRequest) => {
    try {
      const createdMove = await dbService.createMove({
        ...newMoveInput,
        driverConfirmation: 'PENDING',
        vanConfirmation: 'PENDING'
      });

      setMoves(prev => [createdMove, ...prev]);

      if (user) {
        addLog(user.id, user.name, 'Agendamento', `Nova mudança agendada para ${createdMove.residentName}`);
      }

      // NOTIFICATION LOGIC
      const assignedStaffIds = [createdMove.coordinatorId, createdMove.supervisorId, createdMove.driverId, createdMove.vanId].filter(id => id);
      assignedStaffIds.forEach(staffId => {
        if (staffId && staffId !== user?.id) {
          const staffMember = employees.find(e => e.id === staffId);
          if (staffMember) {
            createNotification(
              staffId,
              'Nova Alocação de Mudança',
              `Você foi escalado para a mudança de ${createdMove.residentName} no dia ${createdMove.date}.`
            );
          }
        }
      });

      if (user) {
        createNotification(
          user.id,
          'Agendamento Realizado',
          `A mudança de ${createdMove.residentName} foi agendada com sucesso para ${createdMove.date}.`
        );
      }
    } catch (err) {
      alert("Erro ao criar agendamento.");
      console.error(err);
    }
  };

  const handleUpdateMove = async (updatedMove: MoveRequest) => {
    try {
      await dbService.updateMove(updatedMove);
      setMoves(prev => prev.map(m => m.id === updatedMove.id ? updatedMove : m));

      if (user) {
        addLog(user.id, user.name, 'Edição', `Atualizou detalhes do agendamento ${updatedMove.id}`);

        if (user.role === UserRole.COORDINATOR || user.role === UserRole.SUPERVISOR) {
          const admins = employees.filter(e => e.role === UserRole.ADMIN);
          admins.forEach(admin => {
            createNotification(
              admin.id,
              'Edição de Agendamento',
              `${user.name} (${user.role}) editou os detalhes da mudança de ${updatedMove.residentName}.`
            );
          });
        }
      }
    } catch (err) {
      alert("Erro ao atualizar agendamento.");
    }
  };

  const handleAddResident = async (newResident: Resident) => {
    try {
      const created = await dbService.createResident({ ...newResident, createdAt: new Date().toISOString() });
      setResidents(prev => [created, ...prev]);
      if (user) addLog(user.id, user.name, 'Cadastro', `Novo morador cadastrado: ${created.name}`);
      return created;
    } catch (err: any) {
      console.error(err);
      alert("Erro ao cadastrar morador: " + (err.message || JSON.stringify(err)));
      throw err;
    }
  };

  const handleUpdateResident = async (updatedResident: Resident) => {
    try {
      await dbService.updateResident(updatedResident);
      setResidents(prev => prev.map(r => r.id === updatedResident.id ? updatedResident : r));
      if (user) addLog(user.id, user.name, 'Atualização', `Cadastro atualizado: ${updatedResident.name}`);
    } catch (err) { alert("Erro ao atualizar morador."); }
  };

  const handleDeleteResident = async (residentId: string) => {
    if (!window.confirm("Deseja realmente excluir este morador?")) return;
    try {
      await dbService.deleteResident(residentId);
      setResidents(prev => prev.filter(r => r.id !== residentId));
      if (user) addLog(user.id, user.name, 'Exclusão', `Morador removido ID: ${residentId}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir morador. Verifique se existem mudanças vinculadas a ele.");
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: User) => {
    try {
      const exists = employees.find(e => e.id === updatedEmployee.id);
      if (exists) {
        const up = await dbService.updateUser(updatedEmployee);
        setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? up : e));
        if (user) addLog(user.id, user.name, 'RH', `Funcionário atualizado: ${up.name}`);
      } else {
        const created = await dbService.createUser(updatedEmployee);
        setEmployees(prev => [created, ...prev]);
        if (user) addLog(user.id, user.name, 'RH', `Novo funcionário contratado: ${created.name}`);
      }
    } catch (err) { alert("Erro ao salvar funcionário."); }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await dbService.deleteUser(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      if (user) addLog(user.id, user.name, 'RH', `Funcionário demitido/removido ID: ${id}`);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao excluir funcionário: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleAddFinancialRecord = async (record: FinancialRecord) => {
    try {
      const created = await dbService.createFinancial(record);
      setFinancials(prev => [created, ...prev]);
      if (user) addLog(user.id, user.name, 'Financeiro', `Nova transação: ${created.description} (${created.type})`);
    } catch (err) { alert("Erro no registro financeiro."); }
  };

  const handleSaveSettings = async (settings: FinancialSettings) => {
    try {
      await dbService.updateSettings(settings);
      setFinancialSettings(settings);
      if (user) addLog(user.id, user.name, 'Configuração', `Atualizou parâmetros de custos financeiros`);
    } catch (err) { alert("Erro ao salvar configurações."); }
  };

  const handleAddOperationalRecord = async (record: DailyOperationalRecord) => {
    try {
      const createdOp = await dbService.createOperational(record);
      setOperationalRecords(prev => [createdOp, ...prev]);
      if (user) addLog(user.id, user.name, 'Operacional', `Registrou custos diários da equipe (Data: ${createdOp.date})`);

      // Auto-create Financial Records (Expenses)
      const newExpensesInputs: FinancialRecord[] = [
        { id: 'tmpo1', type: 'expense', amount: createdOp.costTruck, description: `Custo Diário Caminhão (Motorista ID: ${createdOp.driverId})`, date: new Date(createdOp.date).toLocaleDateString('pt-BR'), category: 'Caminhão', status: 'Pendente' },
        { id: 'tmpo2', type: 'expense', amount: createdOp.costHelpers, description: `Custo Diário Ajudantes (${createdOp.helperNames.length} pessoas)`, date: new Date(createdOp.date).toLocaleDateString('pt-BR'), category: 'Ajudantes', status: 'Pendente' },
        { id: 'tmpo3', type: 'expense', amount: createdOp.costSupervisor, description: `Diária Supervisor ID: ${createdOp.supervisorId}`, date: new Date(createdOp.date).toLocaleDateString('pt-BR'), category: 'Supervisores', status: 'Pendente' },
        { id: 'tmpo4', type: 'expense', amount: createdOp.costLunch, description: `Custo Almoço (${createdOp.totalLunches} un)`, date: new Date(createdOp.date).toLocaleDateString('pt-BR'), category: 'Almoço', status: 'Pendente' },
      ];

      // Create expenses in DB
      for (const exp of newExpensesInputs) {
        const createdExp = await dbService.createFinancial(exp);
        setFinancials(prev => [createdExp, ...prev]);
      }
    } catch (err) { alert("Erro ao registrar operacional."); }
  };

  const handleAddHelper = async (helper: Helper) => {
    try {
      const created = await dbService.createHelper(helper);
      setHelpers(prev => [created, ...prev]);
      if (user) addLog(user.id, user.name, 'Ajudantes', `Novo ajudante cadastrado: ${created.name}`);
    } catch (err) { alert("Erro ao adicionar ajudante."); }
  };

  const handleUpdateHelper = async (helper: Helper) => {
    try {
      await dbService.updateHelper(helper);
      setHelpers(prev => prev.map(h => h.id === helper.id ? helper : h));
      if (user) addLog(user.id, user.name, 'Ajudantes', `Ajudante atualizado: ${helper.name}`);
    } catch (err) { alert("Erro ao atualizar ajudante."); }
  };

  const handleDeleteHelper = async (id: string) => {
    try {
      await dbService.deleteHelper(id);
      setHelpers(prev => prev.filter(h => h.id !== id));
      if (user) addLog(user.id, user.name, 'Ajudantes', `Ajudante removido ID: ${id}`);
    } catch (err) { alert("Erro ao remover ajudante."); }
  };

  const handleUpdateAttendance = async (date: string, helperId: string, isPresent: boolean, recordedById: string, recordedByName: string) => {
    try {
      const createdAtt = await dbService.updateAttendance({
        id: '', // let DB handle
        date, helperId, isPresent, recordedByUserId: recordedById, recordedByName: recordedByName
      });

      setAttendanceRecords(prev => {
        const filtered = prev.filter(r => !(r.date === date && r.helperId === helperId));
        return [...filtered, createdAtt];
      });

      if (user) {
        addLog(user.id, user.name, 'Presença', `Registrou ${isPresent ? 'presença' : 'falta'} para o ajudante (ID: ${helperId}) na data ${date}`);
      }
    } catch (err) { alert("Erro ao atualizar presença."); }
  };

  const handleDashboardNavigate = (target: string, filter?: string) => {
    setActiveTab(target);
    if (target === 'moves') {
      setMoveFilter(filter as MoveStatus || 'ALL');
    } else {
      setMoveFilter('ALL');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await dbService.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await dbService.markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, isRead: true } : n));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Conectando ao banco de dados...</p>
      </div>
    );
  }

  if (!user) {
    // If we have no employees yet (first run), maybe show a setup hint or just empty
    return <LoginScreen onLogin={handleLogin} users={employees} />;
  }

  // --- ACCESS CONTROL HELPERS ---
  const canAccessResidents = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPERVISOR].includes(user.role);
  const canAccessReports = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPERVISOR].includes(user.role);
  const canAccessEmployees = [UserRole.ADMIN].includes(user.role);
  const canAccessFinanceModule = [UserRole.ADMIN].includes(user.role);
  const canAccessHistory = [UserRole.ADMIN].includes(user.role);
  const canAccessHelpers = [UserRole.ADMIN, UserRole.SUPERVISOR].includes(user.role);

  // --- RENDER HELPERS ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Dashboard Geral</h2>
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm text-gray-500 border border-gray-100">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <Dashboard
              moves={moves}
              onNavigate={handleDashboardNavigate}
              userRole={user.role}
              helpers={helpers}
              attendanceRecords={attendanceRecords}
              currentUser={user}
            />
          </div>
        );
      case 'moves':
        return (
          <MovesManager
            moves={moves}
            residents={residents}
            employees={employees}
            onStatusChange={handleStatusChange}
            onAddMove={handleAddMove}
            onUpdateMove={handleUpdateMove}
            onVolumeValidation={handleVolumeValidation}
            onAssignmentConfirmation={handleAssignmentConfirmation}
            userRole={user.role}
            initialFilter={moveFilter}
            currentUserId={user.id}
          />
        );
      case 'residents':
        return canAccessResidents ? (
          <ResidentsManager
            residents={residents}
            employees={employees}
            onAddResident={handleAddResident}
            onUpdateResident={handleUpdateResident}
            onDeleteResident={handleDeleteResident}
            onAddMove={handleAddMove}
            currentUserRole={user.role}
          />
        ) : <AccessDenied />;
      case 'helpers':
        return canAccessHelpers ? (
          <HelpersManager
            helpers={helpers}
            attendanceRecords={attendanceRecords}
            onAddHelper={handleAddHelper}
            onUpdateHelper={handleUpdateHelper}
            onDeleteHelper={handleDeleteHelper}
            onUpdateAttendance={handleUpdateAttendance}
            currentUser={user}
            operationalRecords={operationalRecords}
            financialSettings={financialSettings}
          />
        ) : <AccessDenied />;
      case 'employees':
        return canAccessEmployees ? (
          <EmployeesManager
            employees={employees}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            currentUserRole={user.role}
          />
        ) : <AccessDenied />;
      case 'finance':
        return canAccessFinanceModule ? (
          <FinancialManager
            records={financials}
            onAddRecord={handleAddFinancialRecord}
            settings={financialSettings}
            onSaveSettings={handleSaveSettings}
            operationalRecords={operationalRecords}
            onAddOperationalRecord={handleAddOperationalRecord}
            employees={employees}
            userRole={user.role}
            currentUser={user}
          />
        ) : <AccessDenied />;
      case 'reports':
        return canAccessReports ? (
          <ReportsManager
            financialData={financials}
            movesData={moves}
            employees={employees}
            residents={residents}
            userRole={user.role}
            operationalRecords={operationalRecords}
          />
        ) : <AccessDenied />;
      case 'history':
        return canAccessHistory ? (
          <HistoryLog logs={logs} />
        ) : <AccessDenied />;
      case 'notifications':
        return <NotificationsView notifications={userNotifications} onMarkRead={handleMarkAsRead} onMarkAllRead={handleMarkAllRead} />;
      default:
        return <div className="p-10 text-center text-gray-500">Módulo em desenvolvimento: {activeTab}</div>;
    }
  };

  const renderNavItems = (onItemClick: (tab: string, filter?: string) => void) => (
    <>
      <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => onItemClick('dashboard')} />

      {canAccessResidents && (
        <NavItem icon={<Users size={20} />} label="Moradores" active={activeTab === 'residents'} onClick={() => onItemClick('residents')} />
      )}

      <NavItem icon={<Calendar size={20} />} label="Agendamento" active={activeTab === 'moves'} onClick={() => onItemClick('moves', 'ALL')} />

      {canAccessHelpers && (
        <NavItem icon={<HardHat size={20} />} label="Ajudantes" active={activeTab === 'helpers'} onClick={() => onItemClick('helpers')} />
      )}

      {canAccessReports && (
        <NavItem icon={<FileText size={20} />} label="Relatórios" active={activeTab === 'reports'} onClick={() => onItemClick('reports')} />
      )}

      {canAccessEmployees && (
        <NavItem icon={<Users size={20} />} label="Funcionários" active={activeTab === 'employees'} onClick={() => onItemClick('employees')} />
      )}

      {canAccessFinanceModule && (
        <NavItem icon={<DollarSign size={20} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => onItemClick('finance')} />
      )}

      {canAccessHistory && (
        <NavItem icon={<History size={20} />} label="Histórico" active={activeTab === 'history'} onClick={() => onItemClick('history')} />
      )}

      <div className="my-2 border-t border-gray-100"></div>

      <NavItem
        icon={<Bell size={20} />}
        label="Notificações"
        active={activeTab === 'notifications'}
        onClick={() => onItemClick('notifications')}
        badge={unreadCount > 0 ? unreadCount : undefined}
      />
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 shadow-sm z-10">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">TELEMIM</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {renderNavItems(handleDashboardNavigate)}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="flex items-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 px-2 py-2 rounded w-full transition-colors">
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
            <span className="font-bold text-gray-800">TELEMIM</span>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={() => setActiveTab('notifications')} className="relative text-gray-600">
              <Bell />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600">
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 bg-white z-30 flex flex-col p-4 animate-in fade-in slide-in-from-top-10">
            <div className="flex justify-end mb-4">
              <button onClick={() => setMobileMenuOpen(false)}><X className="text-gray-500" /></button>
            </div>
            <nav className="space-y-2">
              {renderNavItems((tab, filter) => { handleDashboardNavigate(tab, filter); setMobileMenuOpen(false); })}
            </nav>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const AccessDenied = () => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100 max-w-md">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
        <LogOut size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h3>
      <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
    </div>
  </div>
);

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${active
      ? 'bg-blue-50 text-blue-700 shadow-sm'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    <span className={`${active ? 'text-blue-600' : 'text-gray-400'}`}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge > 0 && (
      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
        {badge}
      </span>
    )}
  </button>
);

const NotificationsView = ({ notifications, onMarkRead, onMarkAllRead }: { notifications: Notification[], onMarkRead: (id: string) => void, onMarkAllRead: () => void }) => (
  <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Notificações</h2>
        <p className="text-sm text-gray-500">Alertas de novas alocações e mensagens</p>
      </div>
      {notifications.some(n => !n.isRead) && (
        <button
          onClick={onMarkAllRead}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          Marcar todas como lidas
        </button>
      )}
    </div>

    <div className="space-y-3">
      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="text-gray-300" size={32} />
          </div>
          <h3 className="text-gray-800 font-medium mb-1">Tudo limpo por aqui!</h3>
          <p className="text-gray-500 text-sm">Você não tem novas notificações.</p>
        </div>
      ) : (
        notifications.map(notif => (
          <div
            key={notif.id}
            className={`bg-white p-4 rounded-xl shadow-sm border flex items-start gap-4 transition-all ${notif.isRead ? 'border-gray-100 opacity-75' : 'border-blue-100 ring-1 ring-blue-50'}`}
          >
            <div className={`p-2 rounded-full shrink-0 ${notif.isRead ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className={`font-bold text-sm ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</h4>
                <span className="text-xs text-gray-400">{notif.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
              {!notif.isRead && (
                <button
                  onClick={() => onMarkRead(notif.id)}
                  className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCircle size={12} /> Marcar como lida
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const LoginScreen = ({ onLogin, users }: { onLogin: (email: string, password: string) => void, users: User[] }) => {
  const [email, setEmail] = useState('admin@telemim.com');
  const [password, setPassword] = useState('123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-blue-200">T</div>
          <h1 className="text-2xl font-bold text-gray-800">TELEMIM MUDANÇAS</h1>
          <p className="text-gray-500 mt-2">Faça login para gerenciar operações</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md shadow-blue-200">
            Entrar no Sistema
          </button>
        </form>
        <div className="mt-6">
          <p className="text-center text-xs text-gray-400 mb-2">Usuários Disponíveis (Do Banco de Dados):</p>
          {users.length === 0 ? (
            <p className="text-center text-xs text-orange-500">Nenhum usuário carregado. Banco vazio ou erro de conexão.</p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {users.slice(0, 3).map(u => (
                <button key={u.id} onClick={() => { setEmail(u.email); setPassword('123'); }} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600">
                  {u.role}: {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HistoryLog = ({ logs }: { logs: LogEntry[] }) => (
  <div className="space-y-6 animate-fade-in">
    <h2 className="text-2xl font-bold text-gray-800">Auditoria e Histórico</h2>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Data/Hora</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Usuário</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Ação</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3 font-medium text-gray-800">{log.userName}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
