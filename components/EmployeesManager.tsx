
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Truck, Briefcase, Phone, UserCheck, Edit, Plus, X, Lock, Eye, Users } from 'lucide-react';

interface EmployeesManagerProps {
  employees: User[];
  onUpdateEmployee: (user: User) => void;
  currentUserRole?: UserRole;
}

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({ employees, onUpdateEmployee, currentUserRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const isAdmin = currentUserRole === UserRole.ADMIN;

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
    } else {
      setEditingUser({
        name: '', email: '', password: '', phone: '', role: UserRole.DRIVER, status: 'Ativo'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const userToSave: User = {
        id: editingUser.id || Date.now().toString(),
        name: editingUser.name!.toUpperCase(),
        email: editingUser.email!,
        password: editingUser.password, // Save password
        role: editingUser.role!,
        status: 'Ativo', // Defaulting internally
        phone: editingUser.phone,
      };
      onUpdateEmployee(userToSave);
      setIsModalOpen(false);
      setEditingUser(null);
    }
  };
  
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={32} className="text-purple-600" />;
      case UserRole.DRIVER: return <Truck size={32} className="text-green-600" />;
      case UserRole.COORDINATOR: return <Users size={32} className="text-blue-600" />;
      case UserRole.SUPERVISOR: return <Eye size={32} className="text-orange-600" />;
      case UserRole.VAN: return <Truck size={32} className="text-teal-600" />;
      default: return <Briefcase size={32} className="text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 uppercase">Equipe & Acessos</h2>
           <p className="text-sm text-gray-500">Gestão de funcionários e níveis de permissão</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm uppercase font-medium"
          >
            <Plus size={18} /> Novo Funcionário
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {employees.map(emp => {
          return (
            <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all flex flex-col items-center text-center relative group">
              
              {/* Role Icon Circle */}
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 shadow-inner border border-gray-100">
                {getRoleIcon(emp.role)}
              </div>
              
              {/* Name & Role */}
              <div className="mb-4 w-full">
                <h3 className="font-bold text-gray-900 text-lg truncate leading-tight mb-1 uppercase">{emp.name}</h3>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wide">
                  {emp.role}
                </span>
              </div>

              {/* Details */}
              <div className="w-full space-y-3 border-t border-gray-100 pt-4 mt-auto">
                 <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <UserCheck size={14} className="text-gray-400"/>
                    <span className="truncate">{emp.email}</span>
                 </div>
                 <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400"/>
                    <span>{emp.phone || 'Não informado'}</span>
                 </div>
              </div>
              
              {isAdmin && (
                <button 
                  onClick={() => handleOpenModal(emp)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-50 rounded-full"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Access Management Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase">
                <Lock size={20} className="text-blue-600"/>
                {editingUser.id ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Nome Completo</label>
                <input 
                  required
                  value={editingUser.name} 
                  onChange={e => setEditingUser(prev => ({...prev, name: e.target.value.toUpperCase()}))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Email (Login)</label>
                <input 
                  type="email"
                  required
                  value={editingUser.email} 
                  onChange={e => setEditingUser(prev => ({...prev, email: e.target.value}))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Senha de Acesso</label>
                <input 
                  type="password"
                  value={editingUser.password || ''} 
                  onChange={e => setEditingUser(prev => ({...prev, password: e.target.value}))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                  placeholder={editingUser.id ? "Deixe em branco para manter a atual" : "Crie uma senha"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 uppercase">Cargo / Função</label>
                    <select 
                      value={editingUser.role} 
                      onChange={e => setEditingUser(prev => ({...prev, role: e.target.value as UserRole}))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 uppercase"
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">Telefone (Opcional)</label>
                    <input 
                      value={editingUser.phone} 
                      onChange={e => setEditingUser(prev => ({...prev, phone: e.target.value}))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                      placeholder="(00) 00000-0000"
                    />
                 </div>
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
                   Salvar Funcionário
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};