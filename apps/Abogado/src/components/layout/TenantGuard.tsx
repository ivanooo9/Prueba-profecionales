import React, { useState, useEffect } from 'react';
import { ShieldAlert, Building2, ArrowRight, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { legalService } from '../../services/legalService';
import { apiClient } from '../../services/api/apiClient';

interface NormalizedOrg {
  id: number;
  name: string;
  role: string;
  slug?: string;
}

interface TenantGuardProps {
  children: React.ReactNode;
}

export const TenantGuard: React.FC<TenantGuardProps> = ({ children }) => {
  const [organizationId, setOrganizationIdState] = useState<number | null>(
    legalService.getOrganizationId()
  );
  const [userOrgs, setUserOrgs] = useState<NormalizedOrg[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState<boolean>(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState<boolean>(false);
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [manualOrgId, setManualOrgId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUserOrganizations = async () => {
    setIsLoadingOrgs(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get<any[]>('/api/organizations');
      if (res.data && Array.isArray(res.data)) {
        // Normalizar estructura del backend ({ membershipId, role, organization: { id, name } })
        const normalized: NormalizedOrg[] = res.data
          .map((item: any) => {
            const orgData = item.organization || item;
            const id = Number(orgData.id);
            const name = orgData.name || `Despacho #${id}`;
            const role = item.role || orgData.role || 'OWNER';
            const slug = orgData.slug;
            return { id, name, role, slug };
          })
          .filter((org) => org.id && !isNaN(org.id) && org.id > 0);

        setUserOrgs(normalized);

        // Si el usuario solo tiene una organización y no tiene seleccionada ninguna, autoconectar
        if (normalized.length === 1 && (!legalService.getOrganizationId() || legalService.getOrganizationId()! <= 0)) {
          legalService.setOrganizationId(normalized[0].id);
        }
      }
    } catch (err: any) {
      console.warn('[TenantGuard] No se pudieron cargar organizaciones automáticamente:', err);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    setOrganizationIdState(legalService.getOrganizationId());
    fetchUserOrganizations();

    const unsubscribe = legalService.subscribe(() => {
      setOrganizationIdState(legalService.getOrganizationId());
    });

    return () => unsubscribe();
  }, []);

  const handleSelectOrg = (id: number) => {
    setErrorMessage(null);
    legalService.setOrganizationId(id);
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedId = parseInt(manualOrgId.trim(), 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      setErrorMessage('Por favor ingrese un ID numérico de organización válido.');
      return;
    }

    legalService.setOrganizationId(parsedId);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setErrorMessage(null);
    try {
      const res = await apiClient.post<any>('/api/organizations', {
        name: newOrgName.trim(),
        type: 'INDIVIDUAL',
      });

      const createdOrg = res.data?.organization || res.data;
      if (createdOrg?.id) {
        legalService.setOrganizationId(Number(createdOrg.id));
        setIsCreatingOrg(false);
        setNewOrgName('');
      } else {
        await fetchUserOrganizations();
        setIsCreatingOrg(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la organización.');
    }
  };

  if (!organizationId || organizationId <= 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
              <Building2 className="w-8 h-8" />
            </div>
            <button
              onClick={fetchUserOrganizations}
              disabled={isLoadingOrgs}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1.5 cursor-pointer"
              title="Actualizar organizaciones"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOrgs ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Refrescar</span>
            </button>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Seleccionar Despacho Jurídico
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Elija la organización o despacho activo al que desea acceder para gestionar expedientes, causas y clientes.
          </p>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Listado de Organizaciones Disponibles */}
          {userOrgs.length > 0 && !isCreatingOrg && (
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mis Organizaciones Registradas ({userOrgs.length})
              </label>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {userOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className="w-full text-left p-4 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition">
                        {org.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <span>ID: <strong className="text-amber-300 font-mono">#{org.id}</strong></span>
                        {org.role && <span>• Rol: <span className="text-slate-300 font-medium">{org.role}</span></span>}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition shrink-0 ml-3">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de Creación Rápida */}
          {isCreatingOrg ? (
            <form onSubmit={handleCreateOrg} className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre del Nuevo Despacho / Bufete
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Ej. Despacho Jurídico Peralta & Asociados"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrg(false)}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Guardar y Acceder
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setIsCreatingOrg(true)}
                className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition text-xs border border-dashed border-slate-700 hover:border-slate-600 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Crear nuevo despacho u organización</span>
              </button>
            </div>
          )}

          {/* Entrada Manual de ID como alternativa */}
          {!isCreatingOrg && (
            <form onSubmit={handleManualConnect} className="pt-4 border-t border-slate-800 space-y-3">
              <label htmlFor="orgIdInput" className="block text-xs font-medium text-slate-400">
                O ingrese manualmente el ID del despacho:
              </label>
              <div className="flex gap-2">
                <input
                  id="orgIdInput"
                  type="number"
                  min="1"
                  value={manualOrgId}
                  onChange={(e) => setManualOrgId(e.target.value)}
                  placeholder="ID ej. 2"
                  className="w-28 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Conectar ID</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Tip: También puede añadir <code className="bg-slate-800 text-amber-400 px-1 py-0.5 rounded font-mono text-[10px]">?orgId=TU_ID</code> a la URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
