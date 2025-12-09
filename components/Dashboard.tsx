
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { MoveRequest, MoveStatus, UserRole, Helper, AttendanceRecord, User } from '../types';
import { TrendingUp, Truck, CheckCircle2, AlertCircle, CheckSquare, CalendarDays, Users, CheckCircle, XCircle, HardHat, Clock, Calendar } from 'lucide-react';

interface DashboardProps {
  moves: MoveRequest[];
  onNavigate?: (target: string, filter?: string) => void;
  userRole?: UserRole;
  helpers: Helper[];
  attendanceRecords: AttendanceRecord[];
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  moves, onNavigate, userRole, helpers, attendanceRecords, currentUser 
}) => {
  
  // 1. Filter moves based on User Role ("My Moves" vs "All Moves")
  const relevantMoves = React.useMemo(() => {
    if (userRole === UserRole.ADMIN) {
      return moves;
    }
    return moves.filter(m => 
      m.coordinatorId === currentUser.id || 
      m.supervisorId === currentUser.id || 
      m.driverId === currentUser.id ||
      m.vanId === currentUser.id
    );
  }, [moves, userRole, currentUser.id]);

  // 2. Filter moves for TODAY (Day of Access)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const todaysMoves = relevantMoves.filter(m => m.date === todayStr);

  // Volume Data for Admin View
  const volumeData = [
    { name: 'Sem 1', value: 12 },
    { name: 'Sem 2', value: 19 },
    { name: 'Sem 3', value: 15 },
    { name: 'Sem 4', value: 22 },
  ];

  // 3. Calculate KPIs based on RELEVANT moves
  const totalTodayMoves = todaysMoves.length;
  
  // Split Pending into Today vs Others
  const allPendingMoves = relevantMoves.filter(m => m.status === MoveStatus.PENDING);
  const pendingToday = allPendingMoves.filter(m => m.date === todayStr).length;
  const pendingOthers = allPendingMoves.filter(m => m.date !== todayStr).length;

  const activeMoves = relevantMoves.filter(m => m.status === MoveStatus.IN_PROGRESS).length;
  const approvedMoves = relevantMoves.filter(m => m.status === MoveStatus.APPROVED).length;
  const completedMoves = relevantMoves.filter(m => m.status === MoveStatus.COMPLETED).length;

  // 4. Attendance Logic
  const activeHelpers = helpers.filter(h => h.active);
  const todaysAttendance = attendanceRecords.filter(r => r.date === todayStr);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Header Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-[-10px]">
        <CalendarDays size={16} />
        <span>Resumo Diário: <strong>{today.toLocaleDateString('pt-BR')}</strong></span>
        {userRole !== UserRole.ADMIN && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 ml-2 uppercase">Minha Visão</span>}
      </div>

      {/* KPI Cards - Expanded to 6 columns for new card */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        
        {/* 1. Total Hoje */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', 'ALL')}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-blue-600 transition-colors truncate uppercase">Total Hoje</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalTodayMoves}</h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
            <Truck size={18} />
          </div>
        </div>

        {/* 2. Pendentes HOJE -> Renamed to Esperando Aprovação */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', MoveStatus.PENDING)}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-red-600 transition-colors truncate uppercase">Esperando Aprovação</p>
            <h3 className="text-2xl font-bold text-gray-800">{pendingToday}</h3>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
            <AlertCircle size={18} />
          </div>
        </div>

        {/* 3. Aprovadas */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', MoveStatus.APPROVED)}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-cyan-600 transition-colors truncate uppercase">Aprovadas</p>
            <h3 className="text-2xl font-bold text-gray-800">{approvedMoves}</h3>
          </div>
          <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* 4. Em Andamento */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', MoveStatus.IN_PROGRESS)}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-indigo-600 transition-colors truncate uppercase">Em Rota</p>
            <h3 className="text-2xl font-bold text-gray-800">{activeMoves}</h3>
          </div>
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* 5. Concluídas */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', MoveStatus.COMPLETED)}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-green-600 transition-colors truncate uppercase">Concluídas</p>
            <h3 className="text-2xl font-bold text-gray-800">{completedMoves}</h3>
          </div>
          <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors shrink-0">
            <CheckSquare size={18} />
          </div>
        </div>

        {/* 6. Pendentes OUTROS (Reordered & Color Changed) */}
        <div 
          onClick={() => onNavigate && onNavigate('moves', MoveStatus.PENDING)}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="overflow-hidden">
            <p className="text-xs text-gray-500 font-medium group-hover:text-purple-600 transition-colors truncate uppercase">Pendentes (Outros)</p>
            <h3 className="text-2xl font-bold text-gray-800">{pendingOthers}</h3>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
            <Clock size={18} />
          </div>
        </div>

      </div>

      {/* Main Grid: Attendance (Large) vs Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ATTENDANCE LIST (Replaces Status Pie Chart) - ONLY VISIBLE TO SUPERVISOR */}
        {userRole === UserRole.SUPERVISOR ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full animate-fade-in">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase">
                    <HardHat className="text-blue-600"/> Lista de Presença de Hoje
                  </h3>
                  <p className="text-xs text-gray-500">Controle diário de ajudantes</p>
               </div>
               <button 
                  onClick={() => onNavigate && onNavigate('helpers')}
                  className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors uppercase"
               >
                  Gerenciar
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-2">
               {activeHelpers.length > 0 ? (
                 activeHelpers.map(helper => {
                   const record = todaysAttendance.find(r => r.helperId === helper.id);
                   const hasRecord = !!record;
                   const isPresent = record?.isPresent;
                   
                   return (
                      <div key={helper.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-gray-50/50">
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${hasRecord ? (isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-200 text-gray-500'}`}>
                                {helper.name.charAt(0)}
                             </div>
                             <div>
                                <p className="text-sm font-semibold text-gray-800 uppercase">{helper.name}</p>
                                {hasRecord && (
                                  <p className="text-[10px] text-gray-400 uppercase">
                                     Reg. por: {record?.recordedByName}
                                  </p>
                                )}
                             </div>
                          </div>
                          
                          <div>
                             {hasRecord ? (
                                isPresent ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase">
                                     <CheckCircle size={12}/> Presente
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded uppercase">
                                     <XCircle size={12}/> Falta
                                  </span>
                                )
                             ) : (
                                <span className="text-xs text-gray-400 italic bg-gray-100 px-2 py-1 rounded uppercase">
                                   Pendente
                                </span>
                             )}
                          </div>
                      </div>
                   );
                 })
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm uppercase">
                    <Users size={32} className="mb-2 opacity-20"/>
                    Nenhum ajudante ativo cadastrado.
                 </div>
               )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4 text-center">
               <div className="bg-green-50 rounded-lg p-2">
                  <span className="block text-xl font-bold text-green-600">{todaysAttendance.filter(r => r.isPresent).length}</span>
                  <span className="text-xs text-green-800 uppercase font-bold">Presentes</span>
               </div>
               <div className="bg-red-50 rounded-lg p-2">
                  <span className="block text-xl font-bold text-red-500">{todaysAttendance.filter(r => !r.isPresent).length}</span>
                  <span className="text-xs text-red-800 uppercase font-bold">Faltas</span>
               </div>
            </div>
          </div>
        ) : (
          /* Placeholder for non-supervisors to maintain grid layout or show something else */
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
             <div className="text-center text-gray-400">
                <Truck size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm uppercase">Selecione uma opção no menu para começar</p>
             </div>
          </div>
        )}

        {/* Volume Chart - Visible Only to Admin */}
        {userRole === UserRole.ADMIN && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">Volume de Mudanças (Mensal)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};