
import React, { useState } from 'react';
import { Search, MapPin, Phone, User as UserIcon, Plus, X, Tag, ArrowRight, Navigation, Clock, CheckCircle, ExternalLink, Edit, Trash2, Calendar, AlertCircle, Filter } from 'lucide-react';
import { Resident, User, UserRole, MoveRequest, MoveStatus } from '../types';
import { analyzeRoute } from '../services/geminiService';

interface ResidentsManagerProps {
  residents: Resident[];
  employees: User[];
  onAddResident: (resident: Resident) => Promise<Resident | void>;
  onUpdateResident: (resident: Resident) => void;
  onDeleteResident: (id: string) => void;
  onAddMove: (move: MoveRequest) => void;
}

export const ResidentsManager: React.FC<ResidentsManagerProps> = ({
  residents, employees, onAddResident, onUpdateResident, onDeleteResident, onAddMove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sorting State
  const [sortOption, setSortOption] = useState<'NAME_ASC' | 'NAME_DESC' | 'DATE_DESC' | 'DATE_ASC'>('NAME_ASC');

  // Route Calculation State
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    seal: '',
    name: '',
    phone: '',
    originStreet: '',
    originNumber: '',
    originNeighborhood: '',
    originCity: '',
    destinationStreet: '',
    destinationNumber: '',
    destinationNeighborhood: '',
    destinationCity: '',
    notes: '',
    // Scheduling Fields
    scheduleDate: '',
    scheduleTime: '',
    coordinatorId: ''
  });

  const filteredResidents = residents
    .filter(r => {
      const term = searchTerm.toLowerCase();
      return (
        r.name.toLowerCase().includes(term) ||
        (r.seal && r.seal.toLowerCase().includes(term)) ||
        r.originStreet.toLowerCase().includes(term) ||
        r.originNeighborhood.toLowerCase().includes(term) ||
        r.phone.includes(term)
      );
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'NAME_ASC':
          return a.name.localeCompare(b.name);
        case 'NAME_DESC':
          return b.name.localeCompare(a.name);
        case 'DATE_DESC':
          // Sort by createdAt desc (if available), else fallback to ID
          if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
          return 0; // Fallback or assume array order
        case 'DATE_ASC':
          if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt);
          return 0;
        default:
          return 0;
      }
    });

  const coordinators = employees.filter(e => e.role === UserRole.COORDINATOR && e.status === 'Ativo');

  const handleOpenModal = (resident?: Resident) => {
    if (resident) {
      setEditingId(resident.id);
      setFormData({
        seal: resident.seal || '',
        name: resident.name,
        phone: resident.phone,
        originStreet: resident.originStreet,
        originNumber: resident.originNumber,
        originNeighborhood: resident.originNeighborhood,
        originCity: resident.originCity,
        destinationStreet: resident.destinationStreet,
        destinationNumber: resident.destinationNumber,
        destinationNeighborhood: resident.destinationNeighborhood,
        destinationCity: resident.destinationCity,
        notes: resident.notes || '',
        scheduleDate: '',
        scheduleTime: '',
        coordinatorId: ''
      });
    } else {
      setEditingId(null);
      setFormData({
        seal: '', name: '', phone: '',
        originStreet: '', originNumber: '', originNeighborhood: '', originCity: '',
        destinationStreet: '', destinationNumber: '', destinationNeighborhood: '', destinationCity: '',
        notes: '',
        scheduleDate: '',
        scheduleTime: '',
        coordinatorId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // DUPLICATE CHECK: Resident Name
    const normalizeName = (str: string) => str.trim().toLowerCase();
    const isDuplicate = residents.some(r =>
      normalizeName(r.name) === normalizeName(formData.name) &&
      r.id !== editingId
    );

    if (isDuplicate) {
      alert("Erro: Já existe um morador cadastrado com este nome. Por favor, verifique ou use um identificador diferente.");
      return;
    }

    const newId = editingId || `r${Date.now()}`;
    const originalResident = residents.find(r => r.id === editingId);

    // Create resident object
    const residentData: Resident = {
      id: newId,
      name: formData.name.toUpperCase(),
      seal: (formData.seal || 'S/N').toUpperCase(),
      phone: formData.phone || '',
      originStreet: formData.originStreet.toUpperCase(),
      originNumber: formData.originNumber.toUpperCase(),
      originNeighborhood: formData.originNeighborhood.toUpperCase(),
      originCity: formData.originCity.toUpperCase(),
      destinationStreet: formData.destinationStreet.toUpperCase(),
      destinationNumber: formData.destinationNumber.toUpperCase(),
      destinationNeighborhood: formData.destinationNeighborhood.toUpperCase(),
      destinationCity: formData.destinationCity.toUpperCase(),
      notes: formData.notes.toUpperCase(),
      totalMoves: editingId ? (originalResident?.totalMoves || 0) : 0,
      lastMoveDate: editingId ? (originalResident?.lastMoveDate || 'N/A') : 'N/A',
      createdAt: editingId ? (originalResident?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    try {
      if (editingId) {
        onUpdateResident(residentData);
      } else {
        // Await the creation to get real ID
        const createdResident = await onAddResident(residentData);

        // Check if scheduling info was provided to create a MoveRequest automatically
        if (createdResident && formData.scheduleDate && formData.scheduleTime) {
          const originAddress = `${formData.originStreet}, ${formData.originNumber} - ${formData.originNeighborhood}, ${formData.originCity}`.toUpperCase();
          const destinationAddress = `${formData.destinationStreet}, ${formData.destinationNumber} - ${formData.destinationNeighborhood}, ${formData.destinationCity}`.toUpperCase();

          const newMove: MoveRequest = {
            id: `OS-${Date.now().toString().slice(-4)}`,
            residentId: createdResident.id, // Use REAL UUID
            residentName: formData.name.toUpperCase(),
            originAddress: originAddress,
            destinationAddress: destinationAddress,
            date: formData.scheduleDate,
            time: formData.scheduleTime,
            status: MoveStatus.PENDING,
            itemsVolume: 0,
            estimatedCost: 0,
            createdAt: new Date().toISOString(),
            coordinatorId: formData.coordinatorId || '',
            notes: formData.notes.toUpperCase()
          };
          onAddMove(newMove);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving resident:", error);
      alert("Ocorreu um erro ao salvar. Tente novamente.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setRouteInfo(null);
    setFormData({
      seal: '', name: '', phone: '',
      originStreet: '', originNumber: '', originNeighborhood: '', originCity: '',
      destinationStreet: '', destinationNumber: '', destinationNeighborhood: '', destinationCity: '',
      notes: '',
      scheduleDate: '',
      scheduleTime: '',
      coordinatorId: ''
    });
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o morador ${name}?`)) {
      onDeleteResident(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Force Uppercase for text fields (except scheduleDate/Time/coordinatorId which are selection/dates)
    const isTextField = !['scheduleDate', 'scheduleTime', 'coordinatorId'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isTextField ? value.toUpperCase() : value }));
  };

  const handleCalculateRoute = async () => {
    if (!formData.originStreet || !formData.destinationStreet) {
      alert("Preencha pelo menos as ruas de origem e destino para calcular a rota.");
      return;
    }

    setCalculatingRoute(true);
    const origin = `${formData.originStreet}, ${formData.originNumber} - ${formData.originCity}`;
    const destination = `${formData.destinationStreet}, ${formData.destinationNumber} - ${formData.destinationCity}`;

    const analysis = await analyzeRoute(origin, destination);
    setRouteInfo(analysis);
    setCalculatingRoute(false);
  };

  const openGoogleMaps = () => {
    if (!formData.originStreet || !formData.destinationStreet) return;

    const origin = encodeURIComponent(`${formData.originStreet}, ${formData.originNumber} - ${formData.originCity}`);
    const destination = encodeURIComponent(`${formData.destinationStreet}, ${formData.destinationNumber} - ${formData.destinationCity}`);

    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank');
  };

  // Shared input class for consistency
  const inputClass = "w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 bg-white placeholder-gray-400 uppercase";

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Gerenciamento de Moradores</h2>
          <p className="text-sm text-gray-500">Cadastro de clientes e endereços de mudança</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm uppercase text-sm font-medium"
        >
          <Plus size={18} /> Novo Cadastro
        </button>
      </div>

      {/* Search and Sort Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-white" size={20} />
          <input
            type="text"
            placeholder="BUSCAR POR NOME, SELO, ENDEREÇO OU TELEFONE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm uppercase bg-gray-900 text-white placeholder-gray-400 border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 md:w-64">
          <div className="relative w-full h-full">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="w-full h-full pl-3 pr-10 py-3 appearance-none bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase text-sm cursor-pointer shadow-sm"
            >
              <option value="NAME_ASC">Ordem Alfabética (A-Z)</option>
              <option value="NAME_DESC">Ordem Alfabética (Z-A)</option>
              <option value="DATE_DESC">Data Inclusão (Recentes)</option>
              <option value="DATE_ASC">Data Inclusão (Antigos)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <Filter size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Residents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResidents.map(resident => (
          <div key={resident.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">

            {/* Edit/Delete Actions */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm z-10">
              <button
                onClick={() => handleOpenModal(resident)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Editar"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => handleDeleteClick(resident.id, resident.name)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {resident.seal && resident.seal !== 'S/N' && (
              <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 group-hover:opacity-0 transition-opacity">
                <Tag size={12} /> {resident.seal}
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-wide">{resident.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Phone size={12} /> {resident.phone || 'NÃO INFORMADO'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-gray-600 border-t border-gray-50 pt-3">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div className="text-xs">
                  <span className="font-bold text-gray-700 block mb-1 uppercase tracking-wider text-[10px]">Origem</span>
                  <p className="line-clamp-3 leading-relaxed uppercase">
                    {resident.originStreet}, {resident.originNumber}
                    <br />
                    <span className="text-gray-500">{resident.originNeighborhood}</span>
                    <br />
                    <span className="font-medium text-gray-700">{resident.originCity}</span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center h-full pt-4">
                  <ArrowRight size={16} className="text-blue-300" />
                </div>
                <div className="text-xs text-right">
                  <span className="font-bold text-gray-700 block mb-1 uppercase tracking-wider text-[10px]">Destino</span>
                  <p className="line-clamp-3 leading-relaxed uppercase">
                    {resident.destinationStreet}, {resident.destinationNumber}
                    <br />
                    <span className="text-gray-500">{resident.destinationNeighborhood}</span>
                    <br />
                    <span className="font-medium text-gray-700">{resident.destinationCity}</span>
                  </p>
                </div>
              </div>

              {resident.notes && (
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs italic text-gray-500 border border-gray-100 flex gap-2 uppercase">
                  <span className="font-bold not-italic">OBS:</span> {resident.notes}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredResidents.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-400 uppercase">
            Nenhum morador encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800 uppercase">{editingId ? 'Editar Morador' : 'Cadastro de Morador'}</h3>
                <p className="text-xs text-gray-500">Preencha os dados pessoais e endereços</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-8 overflow-y-auto flex-1">

                {/* Identificação */}
                <section>
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 uppercase">
                    <UserIcon size={16} className="text-blue-600" /> Dados Pessoais
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label htmlFor="seal" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Selo / ID (Opcional)</label>
                      <input
                        type="text"
                        id="seal"
                        name="seal"
                        value={formData.seal}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="EX: A-102"
                        autoComplete="off"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="name" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Nome Completo *</label>
                      <input
                        type="text"
                        id="name"
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="NOME DO RESPONSÁVEL"
                        autoComplete="off"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Telefone (Opcional)</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="(00) 90000-0000"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </section>

                {/* Endereços */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* ORIGEM */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 text-xs">1</span>
                        Origem
                      </h4>
                      <MapPin className="text-gray-300" size={20} />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Endereço (Rua/Av) *</label>
                          <input
                            type="text"
                            required
                            name="originStreet"
                            value={formData.originStreet}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: RUA DAS FLORES"
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Número *</label>
                          <input
                            type="text"
                            required
                            name="originNumber"
                            value={formData.originNumber}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="123"
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Bairro *</label>
                          <input
                            type="text"
                            required
                            name="originNeighborhood"
                            value={formData.originNeighborhood}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: CENTRO"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Cidade *</label>
                          <input
                            type="text"
                            required
                            name="originCity"
                            value={formData.originCity}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: SÃO PAULO"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DESTINO */}
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-blue-200 flex items-center justify-center text-blue-700 text-xs">2</span>
                        Destino
                      </h4>
                      <MapPin className="text-blue-300" size={20} />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Endereço (Rua/Av) *</label>
                          <input
                            type="text"
                            required
                            name="destinationStreet"
                            value={formData.destinationStreet}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: AV. BRASIL"
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Número *</label>
                          <input
                            type="text"
                            required
                            name="destinationNumber"
                            value={formData.destinationNumber}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="500"
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Bairro *</label>
                          <input
                            type="text"
                            required
                            name="destinationNeighborhood"
                            value={formData.destinationNeighborhood}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: JARDINS"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Cidade *</label>
                          <input
                            type="text"
                            required
                            name="destinationCity"
                            value={formData.destinationCity}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="EX: CAMPINAS"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scheduling Section - Only for New Residents */}
                {!editingId && (
                  <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="text-sm font-bold text-orange-800 mb-4 flex items-center gap-2 uppercase">
                      <Calendar size={18} className="text-orange-600" /> Agendamento Inicial (Opcional)
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Deseja já criar a Ordem de Serviço para este morador? Preencha abaixo.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Data da Mudança</label>
                        <input
                          type="date"
                          name="scheduleDate"
                          value={formData.scheduleDate}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Horário</label>
                        <input
                          type="time"
                          name="scheduleTime"
                          value={formData.scheduleTime}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Coordenador Responsável</label>
                        <select
                          name="coordinatorId"
                          value={formData.coordinatorId}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="">SELECIONE...</option>
                          {coordinators.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extras & AI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase">Observações Adicionais</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-gray-50 focus:bg-white text-gray-900 uppercase"
                      placeholder="INFORMAÇÕES SOBRE RESTRIÇÕES DE HORÁRIO, ITENS FRÁGEIS, ETC..."
                    />
                  </div>

                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 uppercase">
                          <Navigation size={18} /> Otimização de Rota (IA)
                        </h4>
                        {!routeInfo && (
                          <button
                            type="button"
                            onClick={handleCalculateRoute}
                            disabled={calculatingRoute}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm uppercase"
                          >
                            {calculatingRoute ? 'Calculando...' : 'Calcular Estimativa'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        O sistema calculará automaticamente a distância e tempo baseando-se nos endereços inseridos.
                      </p>
                    </div>

                    {routeInfo && (
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm animate-fade-in space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center">
                            <Clock size={16} className="text-blue-500 mx-auto mb-1" />
                            <span className="block text-sm font-bold text-gray-800 uppercase">{routeInfo.duration}</span>
                          </div>
                          <div className="text-center border-l border-gray-100">
                            <Navigation size={16} className="text-green-500 mx-auto mb-1" />
                            <span className="block text-sm font-bold text-gray-800 uppercase">{routeInfo.distance}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={openGoogleMaps}
                          className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 p-2 rounded-lg text-xs font-bold transition-colors border border-green-200 uppercase"
                        >
                          <ExternalLink size={12} />
                          Ver rota no Google Maps
                        </button>

                        <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-500 flex items-center gap-1 justify-center uppercase">
                          <CheckCircle size={10} className="text-green-500" /> Estimativa calculada com sucesso
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2 uppercase"
                >
                  <CheckCircle size={18} />
                  {editingId ? 'Salvar Alterações' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};