import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Fuel, CheckCircle, Search } from 'lucide-react';
import { analyzeRoute } from '../services/geminiService';

export const RoutePlanner: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    
    setLoading(true);
    const analysis = await analyzeRoute(origin, destination);
    setResult(analysis);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Navigation className="text-blue-600" />
          Planejador de Rotas
        </h2>
        
        <form onSubmit={handleCalculate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Ex: Rua das Flores, 123"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
             <div className="relative">
              <MapPin className="absolute left-3 top-3 text-red-400" size={18} />
              <input 
                type="text" 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: Av. Central, 500"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Calculando Inteligência...' : 'Otimizar Rota'}
            {!loading && <Search size={18} />}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-4 animate-fade-in">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Resumo da Rota</h3>
              <p className="text-sm text-gray-600 mb-3">{result.pathDescription}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2 rounded shadow-sm flex flex-col items-center">
                   <Clock size={16} className="text-blue-500 mb-1" />
                   <span className="text-sm font-bold">{result.duration}</span>
                   <span className="text-xs text-gray-500">Tempo Estimado</span>
                </div>
                <div className="bg-white p-2 rounded shadow-sm flex flex-col items-center">
                   <Navigation size={16} className="text-green-500 mb-1" />
                   <span className="text-sm font-bold">{result.distance}</span>
                   <span className="text-xs text-gray-500">Distância</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="text-blue-600" size={18} />
                <h3 className="font-semibold text-blue-800">Eficiência</h3>
              </div>
              <p className="text-sm text-blue-700">
                Consumo estimado: <strong>{result.fuelEstimate}</strong>
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
               <h3 className="font-semibold text-yellow-800 text-sm mb-1">Sugestão do Assistente:</h3>
               <p className="text-xs text-yellow-700 italic">"{result.suggestion}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Visualization (Placeholder for Demo) */}
      <div className="lg:col-span-2 bg-gray-200 rounded-xl overflow-hidden shadow-inner relative flex flex-col items-center justify-center border border-gray-300">
        <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: "url('https://picsum.photos/1200/800?grayscale')",
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}></div>
        
        {/* Mock Map UI Overlay */}
        <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md z-10 flex flex-col gap-2">
           <button className="p-2 hover:bg-gray-100 rounded text-gray-600"><Navigation size={20}/></button>
           <button className="p-2 hover:bg-gray-100 rounded text-gray-600"><Search size={20}/></button>
        </div>

        <div className="relative z-0 text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-xl max-w-md mx-4">
          <MapPin size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Visualização do Mapa</h3>
          <p className="text-gray-600 mb-4">
            A integração completa exibe o Google Maps interativo aqui. 
            <br/><span className="text-xs text-gray-500">(Simulação visual para demonstração sem API Key do Maps)</span>
          </p>
          {result && (
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <CheckCircle size={18} />
              Rota Otimizada Carregada
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
