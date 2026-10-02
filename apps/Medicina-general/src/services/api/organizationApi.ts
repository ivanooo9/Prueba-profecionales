import { apiClient } from './apiClient';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  role?: string;
  memberStatus?: string;
}

export interface ProfessionalModuleInfo {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: string;
}

export interface OrganizationModuleRecord {
  id: number;
  organizationId: number;
  moduleId: number;
  status: string;
  module: ProfessionalModuleInfo;
}

export const organizationApi = {
  /**
   * Obtiene la sesión del usuario actualmente autenticado en el Core.
   */
  async getCurrentUser(): Promise<UserSession | null> {
    try {
      const response = await apiClient.get<UserSession>('/api/auth/me');
      return response.data || (response as any).user || null;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene las organizaciones en las que el usuario es miembro activo.
   */
  async getUserOrganizations(): Promise<Organization[]> {
    const response = await apiClient.get<any[]>('/api/organizations');
    if (!response.data) return [];
    return response.data.map((item: any) => {
      if (item.organization) {
        return {
          id: item.organization.id,
          name: item.organization.name,
          slug: item.organization.slug,
          type: item.organization.type,
          status: item.organization.status,
          role: item.role,
          memberStatus: item.status,
        };
      }
      return item;
    });
  },

  /**
   * Obtiene los detalles de una organización específica.
   */
  async getOrganization(id: number): Promise<Organization | null> {
    const response = await apiClient.get<{ organization: Organization; membership?: any }>(
      `/api/organizations/${id}`
    );
    const org = response.data?.organization || (response.data as any) || null;
    if (org && response.data?.membership) {
      org.role = response.data.membership.role;
    }
    return org;
  },

  /**
   * Crea una nueva organización en el Core asignando al creador como OWNER.
   */
  async createOrganization(name: string, type: string = 'CLINIC'): Promise<Organization> {
    const response = await apiClient.post<any>('/api/organizations', { name, type });
    const org = response.data?.organization || response.data;
    if (org && response.data?.membership) {
      org.role = response.data.membership.role;
    }
    return org;
  },

  /**
   * Obtiene los módulos habilitados para una organización.
   */
  async getOrganizationModules(organizationId: number): Promise<OrganizationModuleRecord[]> {
    const response = await apiClient.get<OrganizationModuleRecord[]>(
      `/api/organizations/${organizationId}/modules`
    );
    return response.data || [];
  },

  /**
   * Verifica si el módulo MEDICINE está habilitado y activo para la organización.
   */
  async isMedicineModuleEnabled(organizationId: number): Promise<boolean> {
    try {
      const modules = await this.getOrganizationModules(organizationId);
      return modules.some(
        (m) =>
          m.status === 'ACTIVE' &&
          m.module &&
          m.module.code === 'MEDICINE'
      );
    } catch {
      return false;
    }
  },

  /**
   * Habilita el módulo MEDICINE para la organización (requiere ser OWNER o ADMIN en la organización).
   */
  async enableMedicineModule(organizationId: number): Promise<OrganizationModuleRecord> {
    const response = await apiClient.post<OrganizationModuleRecord>(
      `/api/organizations/${organizationId}/modules/MEDICINE/enable`
    );
    return response.data!;
  },
};
