function encodeKeyPart(value: string | number | boolean): string {
  return encodeURIComponent(String(value));
}

function cacheKey(model: string, scope: string, ...parts: Array<string | number | boolean>): string {
  const suffix = parts.length > 0 ? `:${parts.map(encodeKeyPart).join(":")}` : "";
  return `cache:${model}:${scope}${suffix}`;
}

export const cacheKeyFactory = {
  systemConfig: {
    singleton: (): string => cacheKey("systemConfig", "singleton"),
    byId: (id: number): string => cacheKey("systemConfig", "byId", id),
  },
  role: {
    all: (): string => cacheKey("role", "all"),
    byName: (name: string): string => cacheKey("role", "byName", name),
  },
  permission: {
    all: (): string => cacheKey("permission", "all"),
  },
  rolePermission: {
    all: (): string => cacheKey("rolePermission", "all"),
  },
  profession: {
    all: (): string => cacheKey("profession", "all"),
    byNombre: (nombre: string): string => cacheKey("profession", "byNombre", nombre),
  },
  specialty: {
    all: (): string => cacheKey("specialty", "all"),
  },
  agreement: {
    all: (): string => cacheKey("agreement", "all"),
  },
  heroCarousel: {
    all: (): string => cacheKey("heroCarousel", "all"),
    byTipo: (tipo: string): string => cacheKey("heroCarousel", "byTipo", tipo),
    byTipoProfession: (tipo: string, professionId: number): string =>
      cacheKey("heroCarousel", "byTipoProfession", tipo, professionId),
  },
  editablePage: {
    all: (): string => cacheKey("editablePage", "all"),
    bySlug: (slug: string): string => cacheKey("editablePage", "bySlug", slug),
  },
  membershipPlan: {
    all: (): string => cacheKey("membershipPlan", "all"),
    byId: (id: number): string => cacheKey("membershipPlan", "byId", id),
  },
  promotionPlan: {
    all: (): string => cacheKey("promotionPlan", "all"),
    byId: (id: number): string => cacheKey("promotionPlan", "byId", id),
  },
  profileTemplate: {
    all: (): string => cacheKey("profileTemplate", "all"),
    byId: (id: number): string => cacheKey("profileTemplate", "byId", id),
    byKey: (key: string): string => cacheKey("profileTemplate", "byKey", key),
  },
  certificateDesign: {
    all: (): string => cacheKey("certificateDesign", "all"),
    byId: (id: number): string => cacheKey("certificateDesign", "byId", id),
  },
  billingPlan: {
    all: (): string => cacheKey("billingPlan", "all"),
    byId: (id: number): string => cacheKey("billingPlan", "byId", id),
  },
} as const;

export type CacheKeyFactory = typeof cacheKeyFactory;
