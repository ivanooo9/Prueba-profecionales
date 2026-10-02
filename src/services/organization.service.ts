import { db } from "../lib/db";
import { generateSlug } from "../lib/slug";
import {
  ORGANIZATION_TYPE,
  ORGANIZATION_STATUS,
  ORGANIZATION_MEMBER_ROLE,
  ORGANIZATION_MEMBER_STATUS,
  VALID_ORGANIZATION_TYPES,
  OrganizationType,
} from "../constants/organization.constants";

export interface CreateOrganizationInput {
  userId: number;
  name: string;
  type?: OrganizationType;
}

export class OrganizationService {
  /**
   * Generates a collision-resistant unique slug for an organization.
   */
  public static async generateUniqueSlug(baseName: string, client = db): Promise<string> {
    const baseSlug = generateSlug(baseName) || "organizacion";
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await client.organization.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Atomically creates an Organization and associates the creator as OWNER and ACTIVE member.
   * Enforces that global role allows organization creation (e.g. PROFESSIONAL or ADMIN).
   */
  public static async createOrganization(input: CreateOrganizationInput, client?: any) {
    const { userId, name, type = ORGANIZATION_TYPE.INDIVIDUAL } = input;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("El nombre de la organización es obligatorio.");
    }

    if (!VALID_ORGANIZATION_TYPES.includes(type)) {
      throw new Error(`Tipo de organización inválido. Valores permitidos: ${VALID_ORGANIZATION_TYPES.join(", ")}`);
    }

    const runner = client || db;

    // Verify creator exists and check role
    const user = await runner.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("El usuario no se encuentra activo en la plataforma.");
    }

    const roleName = user.role?.name;
    if (roleName !== "PROFESSIONAL" && roleName !== "ADMIN") {
      throw new Error("Solo usuarios con rol profesional o administrador pueden crear organizaciones.");
    }

    const execute = async (tx: any) => {
      const slug = await this.generateUniqueSlug(name.trim(), tx);

      const organization = await tx.organization.create({
        data: {
          name: name.trim(),
          slug,
          type,
          status: ORGANIZATION_STATUS.ACTIVE,
        },
      });

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: ORGANIZATION_MEMBER_ROLE.OWNER,
          status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
        },
      });

      return {
        organization,
        membership,
      };
    };

    if (client) {
      return await execute(client);
    }

    return await db.$transaction(execute);
  }

  /**
   * Retrieves an organization by its ID.
   */
  public static async getOrganizationById(organizationId: number) {
    if (!organizationId || isNaN(organizationId)) {
      return null;
    }

    return await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves an organization by its slug.
   */
  public static async getOrganizationBySlug(slug: string) {
    if (!slug || typeof slug !== "string") {
      return null;
    }

    return await db.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lists all active organizations to which the user belongs.
   */
  public static async getUserOrganizations(userId: number) {
    return await db.organizationMember.findMany({
      where: {
        userId,
        status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
        organization: {
          status: ORGANIZATION_STATUS.ACTIVE,
        },
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Retrieves the specific membership of a user in an organization.
   */
  public static async getOrganizationMembership(userId: number, organizationId: number) {
    if (!userId || !organizationId) {
      return null;
    }

    return await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });
  }

  /**
   * Checks if a user is an active member of an organization with optional role verification.
   */
  public static async isOrganizationMember(
    userId: number,
    organizationId: number,
    requiredRoles?: string[]
  ): Promise<{ isMember: boolean; membership: any | null }> {
    const membership = await this.getOrganizationMembership(userId, organizationId);

    if (!membership || membership.status !== ORGANIZATION_MEMBER_STATUS.ACTIVE) {
      return { isMember: false, membership: null };
    }

    if (membership.organization.status !== ORGANIZATION_STATUS.ACTIVE) {
      return { isMember: false, membership: null };
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        return { isMember: false, membership };
      }
    }

    return { isMember: true, membership };
  }
}
