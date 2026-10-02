"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { validateUpload } from "@/lib/upload-validation";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Trash2,
  Shield,
  Dog,
  LogOut,
  Users,
  Stethoscope,
  CalendarPlus,
  Eye,
  EyeOff,
  Edit,
  PawPrint,
  Calendar,
  Activity,
  Settings,
  Heart,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  X,
  MessageSquare,
  Home,
  Phone,
  Mail,
  User,
  FileText,
  Plus,
  Syringe,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity as PulseIcon,
  History,
  ShoppingBag,
  Tag,
  Package,
  LayoutGrid,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Star,
  ClipboardList,
  PenTool,
  Smartphone,
  MapPin,
  Zap,
  Bell,
  Camera,
  Award,
  Clock,
  Globe,
  Lock,
  Truck,
  Loader2,
  QrCode,
  Power,
  Key,
} from "lucide-react";
import {
  Blogger,
  Mascota,
  Evento,
  EventoInscrito,
  PerroAdopcion,
  SolicitudAdmin,
  UsuarioAdmin,
  Veterinario,
  EventRegistrationAPI,
  TiendaProducto,
  AdminService,
  ProductoFormData,
  Plan,
  PlanFormData,
  SectionContent,
  TechFeature,
  CategoryStore,
  SubcategoryStore,
} from "@/lib/admin-service";

// Reemplazado date-fns con Intl nativo para evitar errores de compilación

type TabType =
  | "estadisticas"
  | "veterinarios"
  | "usuarios"
  | "eventos"
  | "adopciones"
  | "sistema"
  | "blogueros"
  | "tienda"
  | "planes"
  | "beneficios"
  | "plan-qr"
  | "historial";
import { MiauLoading } from "@/components/MiauLoading";
import { LogoHorizontal } from "@/components/LogoHorizontal";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";
import { NotificationMetadata } from "@/lib/notification";
import {
  cn,
  formatDate,
  formatDateTime,
  formatPrefixedSequence,
  formatSequentialId,
  calcularEdad,
} from "@/lib/utils";
import { formatEcuadorPhoneDisplay } from "@/lib/phone";
import { OrderProgressBar } from "../tienda/components/OrderProgressBar";
import {
  DEFAULT_STORE_TAX_SETTINGS,
  StoreTaxSettings,
  buildIvaLabel,
  formatIvaPercent,
  normalizeHexColor,
  normalizeStoreTaxSettings,
} from "@/lib/store-settings";

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
  metadata?: NotificationMetadata;
}

interface AdminHistoryNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  metadata?: NotificationMetadata;
}

interface AdminStats {
  users: {
    total: number;
    admin?: number;
    veterinario?: number;
    usuario?: number;
    bloguer?: number;
    [key: string]: number | undefined;
  };
  pets: {
    total: number;
    userPets: number;
    shelterPets: number;
    shelterPetsAdoptadas?: number;
  };
  adoptions: {
    totalRequests: number;
    pendiente?: number;
    entrevista?: number;
    aprobada?: number;
    rechazada?: number;
    entregadas?: number;
    [key: string]: number | undefined;
  };
  health: {
    diagnoses: number;
    treatments: number;
    vaccinations: number;
    preventives: number;
    totalActions: number;
  };
}

type AdminActivityEntry = {
  id: string;
  type:
    | "veterinario"
    | "usuario"
    | "adopcion"
    | "evento"
    | "blog"
    | "producto";
  title: string;
  detail: string;
  createdAt: string;
  actor?: string;
  beforeAfter?: string;
  action?: string;
  entity?: string;
  entityId?: string;
};

type AdminActivityFilterType = "todos" | AdminActivityEntry["type"];
type AdminActivityDateRange = "todo" | "hoy" | "7d" | "30d";
type AdminHistoryViewMode = "audit_only" | "audit_plus_live";

type HomeHeroExplainerContent = {
  heading: string;
  whatIsTitle: string;
  whatIsDescription: string;
  howToUseTitle: string;
  howToUseDescription: string;
  shortDescriptionTitle: string;
  shortDescription: string;
  /** Fondos neobrutalistas de las 3 tarjetas del hero */
  whatIsCardBg: string;
  howToUseCardBg: string;
  shortDescriptionCardBg: string;
};

const HOME_HERO_EXPLAINER_SECTION_ID = "home-hero-explainer";
const TECH_BENEFITS_SECTION_ID = "products-tech-benefits";

const defaultHomeHeroExplainerContent: HomeHeroExplainerContent = {
  heading: "¿Qué es y cómo se usa MIAUWUAUF?",
  whatIsTitle: "¿Qué es?",
  whatIsDescription:
    "Una plataforma para cuidar mascotas con citas, recordatorios y adopción responsable.",
  howToUseTitle: "¿Cómo se usa?",
  howToUseDescription:
    "Registra tu mascota, agenda servicios y sigue todo desde un solo lugar.",
  shortDescriptionTitle: "Descripción breve",
  shortDescription:
    "Conectamos familias, veterinarios y tecnología para un cuidado más simple y humano.",
  whatIsCardBg: "#e7bef8",
  howToUseCardBg: "#ede986",
  shortDescriptionCardBg: "#9bf6ff",
};

function normalizeExplainerCardColors(content: HomeHeroExplainerContent): HomeHeroExplainerContent {
  return {
    ...content,
    whatIsCardBg: normalizeHexColor(content.whatIsCardBg, defaultHomeHeroExplainerContent.whatIsCardBg),
    howToUseCardBg: normalizeHexColor(content.howToUseCardBg, defaultHomeHeroExplainerContent.howToUseCardBg),
    shortDescriptionCardBg: normalizeHexColor(
      content.shortDescriptionCardBg,
      defaultHomeHeroExplainerContent.shortDescriptionCardBg,
    ),
  };
}

function getListItemTimestamp(item: unknown): number {
  if (!item || typeof item !== "object") return 0;
  const record = item as Record<string, unknown>;

  const candidateDateKeys = ["createdAt", "updatedAt", "fecha", "date"];
  for (const key of candidateDateKeys) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) {
      const ts = new Date(raw).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
  }

  const id = record.id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const objectIdLike = /^[a-f\d]{24}$/i.test(id);
    if (objectIdLike) {
      const ts = parseInt(id.slice(0, 8), 16) * 1000;
      if (!Number.isNaN(ts)) return ts;
    }
    const numeric = Number(id);
    if (!Number.isNaN(numeric)) return numeric;
  }

  return 0;
}

function sortNewestFirst<T>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => getListItemTimestamp(b) - getListItemTimestamp(a),
  );
}

function parseHomeHeroExplainerSubtitle(
  rawSubtitle?: string | null,
): Partial<HomeHeroExplainerContent> {
  if (!rawSubtitle || !rawSubtitle.trim().startsWith("{")) return {};
  try {
    return JSON.parse(rawSubtitle) as Partial<HomeHeroExplainerContent>;
  } catch {
    return {};
  }
}

function filterPlanSections(sections: SectionContent[]): SectionContent[] {
  const filtered = sections.filter(
    (section) => section.sectionId === "products-plans" || section.sectionId.startsWith("plans-"),
  );
  if (filtered.length > 0) return filtered;
  return [{ sectionId: "products-plans", badge: "", title: "", subtitle: "" }];
}

type StoreTaxFormState = Omit<StoreTaxSettings, "ivaRate" | "surchargeRate"> & {
  ivaRate: string;
  surchargeRate: string;
};

function toStoreTaxFormState(settings: StoreTaxSettings): StoreTaxFormState {
  return {
    ...settings,
    ivaRate: String(settings.ivaRate),
    surchargeRate: String(settings.surchargeRate),
  };
}

function parseTaxRateInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("estadisticas");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<AdminActivityFilterType>("todos");
  const [historyDateRange, setHistoryDateRange] = useState<AdminActivityDateRange>("todo");
  const [historyViewMode, setHistoryViewMode] = useState<AdminHistoryViewMode>("audit_plus_live");
  const [historyPage, setHistoryPage] = useState(1);
  const [showDeletedUsersPanel, setShowDeletedUsersPanel] = useState(false);
  const [showAdoptionsPanel, setShowAdoptionsPanel] = useState(false);
  useScrollToTopOnChange(activeTab);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  const [veterinarios, setVeterinarios] = useState<UsuarioAdmin[]>([]);
  const [showVetViewModal, setShowVetViewModal] = useState(false);
  const [selectedVet, setSelectedVet] = useState<Veterinario | null>(null);
  const [editingVetId, setEditingVetId] = useState<string | null>(null);
  const [vetsQuery, setVetsQuery] = useState("");
  const [vetsPage, setVetsPage] = useState(1);
  const [vetsPerPage, setVetsPerPage] = useState<8 | 16 | 24>(8);

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [showUserViewModal, setShowUserViewModal] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UsuarioAdmin | null>(
    null,
  );
  const [selectedPetDetail, setSelectedPetDetail] = useState<Mascota | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [solicitudesAdopcion, setSolicitudesAdopcion] = useState<
    SolicitudAdmin[]
  >([]);
  const [perrosAdopcion, setPerrosAdopcion] = useState<PerroAdopcion[]>([]);
  const [solicitudDetalle, setSolicitudDetalle] =
    useState<SolicitudAdmin | null>(null);

  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEventAttendees, setSelectedEventAttendees] =
    useState<Evento | null>(null);

  // Estado para el modal de observaciones al aceptar o rechazar
  const [observacionModal, setObservacionModal] = useState<{
    isOpen: boolean;
    id: string;
    estado: "entrevista" | "aprobada" | "rechazada";
  } | null>(null);
  const [observacionTexto, setObservacionTexto] = useState("");
  
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    userId: string | number;
    role: "usuario" | "veterinario";
    password: string;
  } | null>(null);

  // Mascotas en adopcion
  const [showPerroForm, setShowPerroForm] = useState(false);
  const [editingPerroId, setEditingPerroId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [perroForm, setPerroForm] = useState({
    nombre: "",
    raza: "",
    edad: "",
    peso: "",
    sexo: "Macho",
    color: "",
    vacunado: true,
    esterilizado: false,
    descripcion: "",
    hogarRecomendado: "",
    foto: "",
  });
  const [adopcionSubTab, setAdopcionSubTab] = useState<
    "mascotas" | "solicitudes"
  >("mascotas");

  const [vetForm, setVetForm] = useState({
    nombre: "",
    email: "",
    password: "",
    especialidad: "",
    telefono: "",
    cedula: "",
    city: "",
    address: "",
    clinicName: "",
    image: "",
  });
  const [eventoForm, setEventoForm] = useState({
    titulo: "",
    fecha: "",
    hora: "",
    lugar: "",
    descripcion: "",
    tipo: "Vacunacion",
    maximo: "100",
    image: "",
  });
  const [showVetForm, setShowVetForm] = useState(false);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVetPasswordAdmin, setShowVetPasswordAdmin] = useState(false);
  const [showBloggerPasswordAdmin, setShowBloggerPasswordAdmin] = useState(false);

  const [blogueros, setBlogueros] = useState<Blogger[]>([]);
  const [showBlogueroForm, setShowBlogueroForm] = useState(false);
  const [showBlogueroViewModal, setShowBlogueroViewModal] = useState(false);
  const [showBlogueroEditModal, setShowBlogueroEditModal] = useState(false);
  const [selectedBloguero, setSelectedBloguero] = useState<Blogger | null>(null);
  
  const [blogueroForm, setBlogueroForm] = useState<BloggerFormData>({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    cedula: "",
    city: "",
    address: "",
  });

  const [productos, setProductos] = useState<TiendaProducto[]>([]);
  const [categories, setCategories] = useState<CategoryStore[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryStore[]>([]);
  const [isTiendaExpanded, setIsTiendaExpanded] = useState(false);
  const [tiendaSubTab, setTiendaSubTab] = useState<"productos" | "categorias" | "pedidos" | "impuestos">("productos");
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings>(DEFAULT_STORE_TAX_SETTINGS);
  const [storeTaxForm, setStoreTaxForm] = useState<StoreTaxFormState>(
    toStoreTaxFormState(DEFAULT_STORE_TAX_SETTINGS),
  );
  const [isSavingStoreIva, setIsSavingStoreIva] = useState(false);
  // Pedidos Admin
  type AdminOrder = {
    id: string; total: number; estado: string; createdAt: string;
    displayId?: number | null;
    orderCode?: string | null;
    pricingSubtotal?: number | null;
    pricingIva?: number | null;
    pricingSurcharge?: number | null;
    ivaRate?: number | null;
    taxName?: string | null;
    taxEnabled?: boolean | null;
    surchargeRate?: number | null;
    surchargeEnabled?: boolean | null;
    nombre?: string; email?: string; metodo?: string; comprobanteUrl?: string;
    cedula?: string; telefono?: string;
    /** Campos en Order (Prisma) — no usar city/address en inglés */
    direccion?: string;
    ciudad?: string;
    user?: { name?: string; email?: string; city?: string; address?: string; phone?: string; cedula?: string };
    items: { id: string; quantity: number; precio: number; precioFinal?: number; product: { nombre: string } }[];
  };
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderModal, setOrderModal] = useState(false);
  const [orderRejecting, setOrderRejecting] = useState(false);
  const [orderObservacion, setOrderObservacion] = useState("");
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState<10 | 20 | 50>(10);

  const pendingOrdersCount = useMemo(
    () =>
      adminOrders.filter((o) => {
        const e = o.estado?.toUpperCase().replace(/\s/g, "_");
        return e === "ESPERANDO_VALIDACION" || e === "ESPERANDO_COMPROBANTE";
      }).length,
    [adminOrders]
  );
  const ORDERS_PAGE_SIZE = ordersPerPage;
  const filteredOrders = useMemo(() => {
    const q = ordersSearch.trim();
    if (!q) return adminOrders;

    const normalizeSearch = (value: unknown) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const qNormalized = normalizeSearch(q);

    return adminOrders.filter((o) => {
      const orderCode = o.orderCode ?? formatPrefixedSequence("ORD", o.displayId, o.id);
      const displaySequence = formatSequentialId(o.displayId, o.id);

      const values = [
        o.id,
        orderCode,
        displaySequence,
        o.nombre,
        o.email,
        o.metodo,
        o.estado,
        String(o.estado ?? "").replace(/_/g, " "),
        o.user?.name,
        o.user?.email,
        o.cedula,
        o.telefono,
        o.total?.toFixed(2),
        formatDate(o.createdAt),
      ].filter(Boolean);

      return values.some((value) => {
        const raw = String(value).toLowerCase();
        if (raw.includes(q.toLowerCase())) return true;
        return qNormalized.length > 0 && normalizeSearch(value).includes(qNormalized);
      });
    });
  }, [adminOrders, ordersSearch]);
  const totalOrdersPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE));
  const currentOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const pagedOrders = useMemo(
    () =>
      filteredOrders.slice(
        (currentOrdersPage - 1) * ORDERS_PAGE_SIZE,
        currentOrdersPage * ORDERS_PAGE_SIZE
      ),
    [filteredOrders, currentOrdersPage, ORDERS_PAGE_SIZE]
  );

  const formatOrderState = (estado: string): string => {
    const map: Record<string, string> = {
      PAGO_ACEPTADO: "Pago Aceptado",
      PAGO_RECHAZADO: "Pago Rechazado",
      ESPERANDO_VALIDACION: "Esperando Validaci\u00f3n",
      "ESPERANDO VALIDACION": "Esperando Validaci\u00f3n",
      ESPERANDO_COMPROBANTE: "Esperando Comprobante",
      PENDIENTE: "Pendiente",
      PREPARANDO: "En Preparación",
      EN_CAMINO: "En Camino",
      COMPLETADA: "Completada",
      completada: "Completada",
      pendiente: "Pendiente",
    };
    return map[estado] ?? estado.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const getOrderStateBg = (estado: string): string => {
    const key = estado?.toUpperCase().replace(/\s/g, '_');
    if (key === 'COMPLETADA') return 'bg-[#93ABD9]';
    if (key === 'VERIFICADO' || key === 'PAGO_ACEPTADO') return 'bg-[#93ABD9]/60';
    if (key === 'PREPARANDO') return 'bg-[#ffd6a5]';
    if (key === 'EN_CAMINO') return 'bg-[#93ABD9]/40';
    if (key === 'PAGO_RECHAZADO') return 'bg-[#ffadad]';
    if (key === 'ESPERANDO_VALIDACION' || key === 'ESPERANDO VALIDACION') return 'bg-[#ffde91]';
    if (key === 'ESPERANDO_COMPROBANTE') return 'bg-[#93ABD9]';
    return 'bg-white';
  };

  const handleOrderAction = async (orderId: string, estado: string, observacion?: string) => {
    if (submitLockRef.current.order || orderActionLoading) return;
    submitLockRef.current.order = true;
    setOrderActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, observacion: observacion || "" })
      });
      const data = await res.json();
      if (data.success) {
        let successMsg = "Estado actualizado y cliente notificado";
        if (estado === "PAGO_ACEPTADO") successMsg = "Pago aceptado correctamente";
        if (estado === "PAGO_RECHAZADO") successMsg = "Pago rechazado y cliente notificado";
        toast.success(successMsg);
        setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado } : o));
        setSelectedOrder(prev => {
          if (prev && prev.id === orderId) {
            return { ...prev, estado };
          }
          return prev;
        });
        if (estado === "PAGO_RECHAZADO") {
           setOrderRejecting(false); 
           setOrderObservacion("");
        }
      } else { toast.error("Error al procesar la acción"); }
    } catch(e) { console.error(e); toast.error("Error de red"); }
    finally {
      submitLockRef.current.order = false;
      setOrderActionLoading(false);
    }
  };
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ nombre: "", icon: "Package" });
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [subcategoryForm, setSubcategoryForm] = useState({ nombre: "", categoryId: "" });
  const [showProductoForm, setShowProductoForm] = useState(false);
  const [editingProductoId, setEditingProductoId] = useState<string | null>(
    null,
  );
  const [productoForm, setProductoForm] = useState<ProductoFormData>({
    nombre: "",
    precio: "",
    categoria: "perros",
    subcategoria: "",
    marca: "",
    stock: "0",
    foto: "",
    imagenes: [],
    descripcion: "",
    etiqueta: "",
    descuento: "0",
    descuentoDias: "0",
  });

  const [modalConfirmacion, setModalConfirmacion] = useState<ConfirmModalState>(
    {
      isOpen: false,
      title: "",
      description: "",
      onConfirm: () => {},
    },
  );

  // Planes de Proteccion
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormData>({
    name: "",
    price: "",
    description: "",
    features: [],
    badge: "",
    color: "bg-primary",
    sectionId: "products-plans",
    billingCycle: "al mes",
  });
  const [featureInput, setFeatureInput] = useState("");
  const [planWhatsappDetailsText, setPlanWhatsappDetailsText] = useState("");

  const [sectionContent, setSectionContent] = useState<SectionContent>({
    sectionId: "products-plans",
    badge: "",
    title: "",
    subtitle: "",
  });
  const [allPlanSections, setAllPlanSections] = useState<SectionContent[]>([]);
  const [planWhatsappPhone, setPlanWhatsappPhone] = useState("");
  const [benefitsSectionContent, setBenefitsSectionContent] = useState<SectionContent>({
    sectionId: TECH_BENEFITS_SECTION_ID,
    badge: "MIAUWUAUF",
    title: "Beneficios Tecnologicos",
    subtitle: "Funciones inteligentes para el cuidado y seguimiento de tu mascota.",
  });
  const [homeHeroExplainerContent, setHomeHeroExplainerContent] =
    useState<HomeHeroExplainerContent>(defaultHomeHeroExplainerContent);

  // Tech Features / Beneficios
  const [techFeatures, setTechFeatures] = useState<TechFeature[]>([]);
  const [showTechFeatureForm, setShowTechFeatureForm] = useState(false);
  const [editingTechFeatureId, setEditingTechFeatureId] = useState<
    string | null
  >(null);
  const [techFeatureForm, setTechFeatureForm] = useState<Partial<TechFeature>>({
    iconName: "Activity",
    title: "",
    description: "",
    color: "text-[#000000]",
    bg: "bg-[#93ABD9]/10",
    order: 0,
    customIcon: "",
  });

  // Migration State
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [adminHistoryEntries, setAdminHistoryEntries] = useState<AdminHistoryNotification[]>([]);

  // Submission loading states
  const [isSubmittingVet, setIsSubmittingVet] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isSubmittingBlogger, setIsSubmittingBlogger] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [isSubmittingPlanWhatsapp, setIsSubmittingPlanWhatsapp] = useState(false);
  const [isSubmittingBenefitsHeader, setIsSubmittingBenefitsHeader] = useState(false);
  const [isSubmittingPerro, setIsSubmittingPerro] = useState(false);
  const [isSubmittingTechFeature, setIsSubmittingTechFeature] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingSubcategory, setIsSubmittingSubcategory] = useState(false);
  const [isSubmittingPlanSection, setIsSubmittingPlanSection] = useState(false);
  const [isSubmittingHomeHeroExplainer, setIsSubmittingHomeHeroExplainer] =
    useState(false);
  const [solicitudUpdateLoading, setSolicitudUpdateLoading] = useState(false);
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const [solicitudesPerPage, setSolicitudesPerPage] = useState<10 | 20 | 50>(10);

  const submitLockRef = useRef({
    vet: false,
    event: false,
    blogger: false,
    product: false,
    plan: false,
    perro: false,
    tech: false,
    category: false,
    subcategory: false,
    section: false,
    solicitud: false,
    order: false,
  });
  const hasFetchedInitialAdminDataRef = useRef(false);
  const fetchDataInFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const localEvents = AdminService.get("eventos", []);
      const localAdoptions = AdminService.get("adopciones", []);
      const localPets = AdminService.get("perrosAcogida", []);
      const localProducts = AdminService.get("productos", []);
      setHasLocalData(
        localEvents.length > 0 ||
          localAdoptions.length > 0 ||
          localPets.length > 0 ||
          localProducts.length > 0,
      );
    }
  }, []);

  const handleSyncData = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Sincronizando datos administrativos...");
    try {
      const localEvents = AdminService.get<Evento[]>("eventos", []);
      const localPets = AdminService.get<PerroAdopcion[]>("perrosAcogida", []);
      const localProducts = AdminService.get<TiendaProducto[]>("productos", []);

      // Sync Events
      for (const ev of localEvents) {
        if (!eventos.find((ex) => ex.titulo === ev.titulo)) {
          await AdminService.saveEvents(ev);
        }
      }

      // Sync Shelter Pets
      for (const pet of localPets) {
        if (!perrosAdopcion.find((px) => px.nombre === pet.nombre)) {
          await AdminService.savePetsForAdoption(pet);
        }
      }

      // Sync Products
      for (const prod of localProducts) {
        if (!productos.find((px) => px.nombre === prod.nombre)) {
          await AdminService.saveProducts(prod);
        }
      }

      toast.success("Sincronización de administración completada!", {
        id: toastId,
      });
      setHasLocalData(false);
      fetchData(true);
    } catch (error) {
      console.error("Admin sync error:", error);
      toast.error("Error al sincronizar datos locales", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchData = useCallback(async (silent: boolean = false, force: boolean = false) => {
    if (fetchDataInFlightRef.current) return;
    if (!force && !silent && hasFetchedInitialAdminDataRef.current) {
      setLoading(false);
      return;
    }

    fetchDataInFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      const [resUsers, resEvents, resShelterPets, resRequests, resVets, resHistory] =
        await Promise.all([
          fetch("/api/admin/users", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/shelter-pets"),
          fetch("/api/admin/requests"),
          fetch("/api/admin/vets"),
          fetch("/api/admin/history", { cache: "no-store" }),
        ]);

      let allUsers: {
        id: string;
        name: string;
        email: string;
        role: string;
        phone?: string;
        cedula?: string;
        city?: string;
        address?: string;
        createdAt?: string;
        image?: string;
        pets?: Mascota[];
        articulos?: number;
        isActive?: boolean;
      }[] = [];
      if (resUsers.ok) {
        allUsers = await resUsers.json();
        setUsuarios(
          sortNewestFirst(allUsers.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            nombre: u.name || "",
            mascota:
              u.pets && u.pets.length > 0 ? (u.pets[0].nombre || u.pets[0].name || "") : "Sin mascotas",
            mascotas: u.pets,
            estado: u.role === "admin" ? "admin" : (u.isActive === false ? "inactivo" : "activo"),
            phone: u.phone ?? "",
            telefono: u.phone ?? "", // Compatibilidad
            cedula: u.cedula ?? "",
            city: u.city ?? "",
            address: u.address ?? "",
            createdAt: u.createdAt || "",
            image: u.image || ""
          }))),
        );

        const mappedBlogueros: Blogger[] = allUsers
          .filter((u) => u.role === "bloguer")
          .map((u) => ({
            id: u.id,
            nombre: u.name,
            email: u.email,
            estado: u.isActive === false ? "inactivo" : "activo",
            articulos: u.articulos || 0,
            phone: u.phone ?? "",
            telefono: u.phone ?? "",
            cedula: u.cedula ?? "",
            city: u.city ?? "",
            address: u.address ?? "",
          }));
        setBlogueros(sortNewestFirst(mappedBlogueros));
      }

      if (resEvents.ok) {
        const eventsData = await resEvents.json();
        setEventos(
          sortNewestFirst(eventsData.map(
            (ev: Evento & { registrations?: EventRegistrationAPI[] }) => ({
              ...ev,
              inscritos: (ev.registrations || []).map((reg) => ({
                nombre: reg.user?.name || "Usuario",
                email: reg.user?.email || "",
                telefono: reg.user?.phone || "N/A",
                cedula: reg.user?.cedula || "N/A",
                fecha: formatDateTime(reg.createdAt),
                mascota: reg.petName || "",
                mascotaId: reg.mascotaId || "",
              })),
            }),
          )),
        );
      }
      if (resShelterPets.ok) setPerrosAdopcion(sortNewestFirst(await resShelterPets.json()));
      if (resRequests.ok) setSolicitudesAdopcion(sortNewestFirst(await resRequests.json()));
      if (resHistory.ok) {
        setAdminHistoryEntries(sortNewestFirst(await resHistory.json()));
      }

      const prods = await AdminService.getProducts();
      setProductos(sortNewestFirst(prods));

      const [plansData, allSectionsData, techData, catsData, planContactRes] = await Promise.all([
        AdminService.getPlans(),
        AdminService.getAllSections(),
        AdminService.getTechFeatures(),
        AdminService.getCategories(),
        fetch("/api/plan-contact", { cache: "no-store" }),
      ]);

      setPlanes(sortNewestFirst(plansData));
      const filteredPlanSections = filterPlanSections(allSectionsData);
      setAllPlanSections(filteredPlanSections);
      
      const defaultSec =
        filteredPlanSections.find((s) => s.sectionId === "products-plans") || filteredPlanSections[0];
      setSectionContent(defaultSec);

      const homeExplainerSection = allSectionsData.find(
        (s) => s.sectionId === HOME_HERO_EXPLAINER_SECTION_ID,
      );
      if (homeExplainerSection) {
        const parsed = parseHomeHeroExplainerSubtitle(homeExplainerSection.subtitle);
        setHomeHeroExplainerContent(
          normalizeExplainerCardColors({
            heading: homeExplainerSection.title || parsed.heading || defaultHomeHeroExplainerContent.heading,
            whatIsTitle: parsed.whatIsTitle || defaultHomeHeroExplainerContent.whatIsTitle,
            whatIsDescription:
              parsed.whatIsDescription || defaultHomeHeroExplainerContent.whatIsDescription,
            howToUseTitle: parsed.howToUseTitle || defaultHomeHeroExplainerContent.howToUseTitle,
            howToUseDescription:
              parsed.howToUseDescription ||
              defaultHomeHeroExplainerContent.howToUseDescription,
            shortDescriptionTitle:
              parsed.shortDescriptionTitle ||
              defaultHomeHeroExplainerContent.shortDescriptionTitle,
            shortDescription:
              parsed.shortDescription || defaultHomeHeroExplainerContent.shortDescription,
            whatIsCardBg: parsed.whatIsCardBg ?? defaultHomeHeroExplainerContent.whatIsCardBg,
            howToUseCardBg: parsed.howToUseCardBg ?? defaultHomeHeroExplainerContent.howToUseCardBg,
            shortDescriptionCardBg:
              parsed.shortDescriptionCardBg ?? defaultHomeHeroExplainerContent.shortDescriptionCardBg,
          }),
        );
      }

      const benefitsSection =
        allSectionsData.find((s) => s.sectionId === TECH_BENEFITS_SECTION_ID) ||
        ({
          sectionId: TECH_BENEFITS_SECTION_ID,
          badge: "MIAUWUAUF",
          title: "Beneficios Tecnologicos",
          subtitle: "Funciones inteligentes para el cuidado y seguimiento de tu mascota.",
        } as SectionContent);
      setBenefitsSectionContent(benefitsSection);

      setTechFeatures(sortNewestFirst(techData));
      setCategories(sortNewestFirst(catsData));

      if (planContactRes.ok) {
        const planContact = (await planContactRes.json()) as { phone?: string };
        setPlanWhatsappPhone((planContact.phone || "").trim());
      } else {
        setPlanWhatsappPhone("");
      }

      const subsData = await AdminService.getSubcategories();
      setSubcategories(sortNewestFirst(subsData));

      if (resVets.ok) {
        const vetsDataRaw = await resVets.json();
        setVeterinarios(
          sortNewestFirst(vetsDataRaw.map(
            (v: {
              id: string | number;
              name: string;
              email: string;
              specialty?: string;
              phone?: string;
              cedula?: string;
              city?: string;
              address?: string;
              createdAt?: string;
              image?: string;
              isActive?: boolean;
            }) => ({
              id: v.id,
              name: v.name,
              nombre: v.name, // Compatibilidad
              email: v.email,
              specialty: v.specialty || "General",
              especialidad: v.specialty || "General", // Compatibilidad
              estado: v.isActive === false ? "inactivo" : "activo",
              phone: v.phone ?? "",
              telefono: v.phone ?? "", // Compatibilidad
              cedula: v.cedula ?? "",
              city: v.city ?? "",
              address: v.address ?? "",
              createdAt: v.createdAt || "",
              image: v.image || ""
            }),
          )),
        );
      }

      // Fetch Stats
      const resStats = await fetch("/api/admin/stats");
      if (resStats.ok) {
        setAdminStats(await resStats.json());
      }

      // Fetch Orders for Admin
      const resOrders = await fetch("/api/admin/orders", { cache: "no-store" });
      if (resOrders.ok) {
        setAdminOrders(sortNewestFirst(await resOrders.json()));
      }

      const resStoreSettings = await fetch("/api/store/settings", { cache: "no-store" });
      if (resStoreSettings.ok) {
        const payload = (await resStoreSettings.json()) as Partial<StoreTaxSettings>;
        const normalizedSettings = normalizeStoreTaxSettings(payload);
        setStoreTaxSettings(normalizedSettings);
        setStoreTaxForm(toStoreTaxFormState(normalizedSettings));
      }

      hasFetchedInitialAdminDataRef.current = true;

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      fetchDataInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const handleSaveSectionContent = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (submitLockRef.current.section || isSubmittingPlanSection) return false;
    submitLockRef.current.section = true;
    setIsSubmittingPlanSection(true);
    try {
      const res = await AdminService.saveSectionContent(sectionContent);
      if (res) {
        toast.success("Contenido de la sección actualizado");
        const allSections = await AdminService.getAllSections();
        setAllPlanSections(filterPlanSections(allSections));
        return true;
      }
      toast.error("Error al actualizar contenido");
      return false;
    } finally {
      submitLockRef.current.section = false;
      setIsSubmittingPlanSection(false);
    }
  };

  const handleSavePlanWhatsappContact = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (isSubmittingPlanWhatsapp) return false;
    setIsSubmittingPlanWhatsapp(true);
    try {
      const res = await fetch("/api/plan-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: planWhatsappPhone.trim() }),
      });

      if (!res.ok) {
        toast.error("No se pudo guardar el WhatsApp de planes");
        return false;
      }

      const saved = (await res.json()) as { phone?: string };
      setPlanWhatsappPhone((saved.phone || "").trim());
      toast.success("WhatsApp de planes actualizado");
      return true;
    } catch (error) {
      console.error("Error saving plan WhatsApp contact:", error);
      toast.error("Error al guardar el WhatsApp de planes");
      return false;
    } finally {
      setIsSubmittingPlanWhatsapp(false);
    }
  };

  const handleSaveBenefitsSectionContent = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (isSubmittingBenefitsHeader) return false;
    setIsSubmittingBenefitsHeader(true);
    try {
      const payload: SectionContent = {
        sectionId: TECH_BENEFITS_SECTION_ID,
        badge: (benefitsSectionContent.badge || "MIAUWUAUF").trim(),
        title: benefitsSectionContent.title?.trim() || "Beneficios Tecnologicos",
        subtitle:
          benefitsSectionContent.subtitle?.trim() ||
          "Funciones inteligentes para el cuidado y seguimiento de tu mascota.",
      };
      const res = await AdminService.saveSectionContent(payload);
      if (!res) {
        toast.error("No se pudo guardar el titulo de beneficios");
        return false;
      }
      setBenefitsSectionContent({
        ...payload,
        badge: payload.badge || "",
      });
      toast.success("Titulo de beneficios actualizado");
      return true;
    } catch (error) {
      console.error("Error saving benefits section content:", error);
      toast.error("Error al guardar el titulo de beneficios");
      return false;
    } finally {
      setIsSubmittingBenefitsHeader(false);
    }
  };

  const handleCreateNewSection = async (data: SectionContent): Promise<boolean> => {
    if (submitLockRef.current.section || isSubmittingPlanSection) return false;
    submitLockRef.current.section = true;
    setIsSubmittingPlanSection(true);
    try {
      const sectionId = `plans-${data.sectionId.toLowerCase().replace(/\s+/g, "-")}`;
      const newSection: SectionContent = {
        ...data,
        sectionId,
      };
      const res = await AdminService.saveSectionContent(newSection);
      if (res) {
        toast.success(`Sección "${res.title}" creada`);
        const allSections = await AdminService.getAllSections();
        setAllPlanSections(filterPlanSections(allSections));
        setSectionContent(res);
        return true;
      }
      toast.error("Error al crear la sección");
      return false;
    } finally {
      submitLockRef.current.section = false;
      setIsSubmittingPlanSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (sectionId === "products-plans") {
      toast.error("No se puede eliminar la sección principal");
      return;
    }
    const success = await AdminService.deleteSection(sectionId);
    if (success) {
      toast.success("Sección eliminada con éxito");
      const allSections = await AdminService.getAllSections();
      setAllPlanSections(filterPlanSections(allSections));
      if (sectionContent.sectionId === sectionId) {
        setSectionContent(allSections.find(s => s.sectionId === "products-plans") || allSections[0]);
      }
    } else {
      toast.error("Error al eliminar la sección");
    }
  };

  const handleSaveHomeHeroExplainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingHomeHeroExplainer) return;
    setIsSubmittingHomeHeroExplainer(true);
    try {
      const normalized = normalizeExplainerCardColors(homeHeroExplainerContent);
      setHomeHeroExplainerContent(normalized);
      const payload: SectionContent = {
        sectionId: HOME_HERO_EXPLAINER_SECTION_ID,
        title: normalized.heading,
        subtitle: JSON.stringify(normalized),
      };
      const res = await AdminService.saveSectionContent(payload);
      if (res) {
        toast.success("Contenido del inicio actualizado");
        const allSections = await AdminService.getAllSections();
        setAllPlanSections(filterPlanSections(allSections));
      } else {
        toast.error("No se pudo guardar el contenido del inicio");
      }
    } catch (error) {
      console.error("Error saving home hero explainer:", error);
      toast.error("Error al guardar el contenido del inicio");
    } finally {
      setIsSubmittingHomeHeroExplainer(false);
    }
  };

  const handleSaveStoreIva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingStoreIva) return;
    const taxNameTrimmed = storeTaxForm.taxName.trim();
    const ivaRateValue = parseTaxRateInput(storeTaxForm.ivaRate);
    const surchargeRateValue = parseTaxRateInput(storeTaxForm.surchargeRate);
    const hasValidationError =
      !taxNameTrimmed ||
      ivaRateValue == null ||
      ivaRateValue < 0 ||
      ivaRateValue > 100 ||
      (storeTaxForm.surchargeEnabled &&
        (surchargeRateValue == null ||
          surchargeRateValue < 0 ||
          surchargeRateValue > 100));
    if (hasValidationError) {
      toast.error("Revisa los campos antes de guardar");
      return;
    }
    setIsSavingStoreIva(true);
    try {
      const nextSettings = normalizeStoreTaxSettings({
        ...storeTaxForm,
        ivaRate: ivaRateValue,
        surchargeRate: surchargeRateValue ?? 0,
        taxName: taxNameTrimmed,
      });
      const res = await fetch("/api/store/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });

      if (!res.ok) {
        toast.error("No se pudo guardar el IVA");
        return;
      }

      const saved = (await res.json()) as Partial<StoreTaxSettings>;
      const normalizedSaved = normalizeStoreTaxSettings(saved);
      setStoreTaxSettings(normalizedSaved);
      setStoreTaxForm(toStoreTaxFormState(normalizedSaved));
      toast.success("Configuración de impuestos guardada");
    } catch (error) {
      console.error("Error saving store IVA:", error);
      toast.error("Error al guardar el IVA");
    } finally {
      setIsSavingStoreIva(false);
    }
  };

  const storeTaxNameError = storeTaxForm.taxName.trim()
    ? ""
    : "El nombre del impuesto es obligatorio.";
  const storeIvaRateValue = parseTaxRateInput(storeTaxForm.ivaRate);
  const storeIvaRateError =
    storeIvaRateValue != null && storeIvaRateValue >= 0 && storeIvaRateValue <= 100
      ? ""
      : "El porcentaje debe estar entre 0 y 100.";
  const storeSurchargeRateValue = parseTaxRateInput(storeTaxForm.surchargeRate);
  const storeSurchargeRateError =
    storeSurchargeRateValue != null &&
    storeSurchargeRateValue >= 0 &&
    storeSurchargeRateValue <= 100
      ? ""
      : "El recargo debe estar entre 0 y 100.";
  const storeTaxFormHasErrors = Boolean(
    storeTaxNameError ||
      storeIvaRateError ||
      (storeTaxForm.surchargeEnabled ? storeSurchargeRateError : ""),
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session?.user?.isActive === false) {
        toast.error("Tu cuenta ha sido desactivada.");
        void signOut({ callbackUrl: "/login?error=AccountDeactivated" });
        return;
      }
      if (session?.user?.role !== "admin") {
        router.push("/mi-mascota");
      } else {
        fetchData(!hasFetchedInitialAdminDataRef.current);
        fetchNotifications();

        const interval = setInterval(() => {
          fetchNotifications();
        }, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [status, session, router, fetchData, fetchNotifications]);



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateUpload(file)) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPerroForm((prev) => ({ ...prev, foto: data.secure_url }));
      } else {
        toast.error("Error al subir la imagen");
      }
    } catch (error) {
      console.error("Error upload:", error);
      toast.error("Error en el servidor al subir imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEventFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !validateUpload(file)) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEventoForm((prev) => ({ ...prev, image: data.secure_url }));
      } else {
        toast.error("Error al subir la imagen del evento");
      }
    } catch (error) {
      console.error("Error upload event image:", error);
      toast.error("Error en el servidor al subir imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateUpload(file)) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setVetForm((prev) => ({ ...prev, image: data.secure_url }));
        toast.success("Foto de perfil subida!");
      } else {
        toast.error("Error al subir la imagen");
      }
    } catch (error) {
      console.error("Error upload vet image:", error);
      toast.error("Error en el servidor al subir imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTechFeatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateUpload(file)) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTechFeatureForm((prev) => ({ ...prev, customIcon: data.secure_url }));
        toast.success("Icono personalizado subido!");
      } else {
        toast.error("Error al subir el icono");
      }
    } catch (error) {
      console.error("Error upload tech icon:", error);
      toast.error("Error en el servidor al subir icono");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePerro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.perro || isSubmittingPerro) return;
    submitLockRef.current.perro = true;
    setIsSubmittingPerro(true);
    try {
      const method = editingPerroId ? "PUT" : "POST";
      const body = editingPerroId
        ? { ...perroForm, id: editingPerroId }
        : perroForm;

      const res = await fetch("/api/shelter-pets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchData(true);
        setPerroForm({
          nombre: "",
          raza: "",
          edad: "",
          peso: "",
          sexo: "Macho",
          color: "",
          vacunado: true,
          esterilizado: false,
          descripcion: "",
          hogarRecomendado: "",
          foto: "",
        });
        setShowPerroForm(false);
        setEditingPerroId(null);
        toast.success(
          editingPerroId ? "Mascota actualizada!" : "Mascota registrada!",
        );
      } else {
        toast.error("No se pudo guardar la mascota. Intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error saving shelter pet:", error);
      toast.error("Error de conexión al guardar la mascota");
    } finally {
      submitLockRef.current.perro = false;
      setIsSubmittingPerro(false);
    }
  };

  const handleEditPerro = (perro: PerroAdopcion) => {
    setPerroForm({
      nombre: perro.nombre,
      raza: perro.raza,
      edad: perro.edad,
      peso: perro.peso || "",
      sexo: perro.sexo || "Macho",
      color: perro.color || "",
      vacunado: perro.vacunado || false,
      esterilizado: perro.esterilizado || false,
      descripcion: perro.descripcion || "",
      hogarRecomendado: perro.hogarRecomendado || "",
      foto: perro.foto || "",
    });
    setEditingPerroId(perro.id.toString());
    setShowPerroForm(true);

    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeletePerro = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Mascota",
      description:
        "¿Estás seguro de eliminar esta mascota del centro de acogida? Esta acción es irreversible.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/shelter-pets?id=${id}`, {
            method: "DELETE",
          });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error deleting shelter pet:", error);
        }
      },
    });
  };

  const handleUpdateSolicitud = async (
    id: string,
    nuevoEstado: "entrevista" | "aprobada" | "rechazada" | "entregada",
    observacion?: string,
  ) => {
    if (submitLockRef.current.solicitud || solicitudUpdateLoading) return;
    submitLockRef.current.solicitud = true;
    setSolicitudUpdateLoading(true);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado, observacion }),
      });

      if (res.ok) {
        const solicitud = solicitudesAdopcion.find((s) => s.id === id);
        fetchData(true);
        setSolicitudDetalle(null);
        setObservacionModal(null);
        setObservacionTexto("");

        if (solicitud) {
          toast.success(
            `La solicitud de ${solicitud.perroNombre} ha sido actualizada a: ${nuevoEstado}.`,
          );
        }
      } else {
        toast.error("No se pudo actualizar la solicitud");
      }
    } catch (error) {
      console.error("Error updating solicitud:", error);
      toast.error("Error de conexión al actualizar la solicitud");
    } finally {
      submitLockRef.current.solicitud = false;
      setSolicitudUpdateLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/";
  };

  const handleMarkAsRead = async (id: string) => {
    // Actualización optimista para mayor fluidez
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      // No necesitamos re-fethcer todo si ya lo actualizamos localmente, 
      // pero fetchNotifications() asegura sincronía total con la DB.
       fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revertir en caso de error (opcional, pero recomendado)
      fetchNotifications();
    }
  };

  const handleNotificationAction = (n: AdminNotification) => {
    // 1. Marcar como leída si no lo está
    if (!n.read) handleMarkAsRead(n.id);

    if (n.actionUrl) {
      if (n.actionUrl.startsWith("/")) {
        router.push(n.actionUrl);
      } else {
        window.location.assign(n.actionUrl);
      }
      return;
    }

    const metadata = n.metadata;
    let type = n.type;
    const resourceId = metadata?.resourceId;

    // Soporte para notificaciones antiguas (legacy) detectando contenido
    if (n.title.toLowerCase().includes("descuento") || n.message.toLowerCase().includes("vencido")) {
      if (type !== "discount_expired") type = "discount_expired";
    }

    // 2. Navegación Inteligente y Apertura de Modales
    switch (type) {
      case "user_registration":
        setActiveTab("usuarios");
        if (resourceId) {
          const user = usuarios.find(u => u.id === resourceId);
          if (user) {
            setSelectedUserDetail(user);
            setShowUserViewModal(true);
          }
        }
        break;
      case "veterinario_registration":
        setActiveTab("veterinarios");
        if (resourceId) {
          const vet = veterinarios.find(v => v.id === resourceId);
          if (vet) {
            setSelectedVet(vet as unknown as Veterinario);
            setShowVetViewModal(true);
          }
        }
        break;
      case "bloguer_registration":
        setActiveTab("blogueros");
        if (resourceId) {
          const blogger = blogueros.find(b => b.id === resourceId);
          if (blogger) {
            setSelectedBloguero(blogger);
            setShowBlogueroViewModal(true);
          }
        }
        break;
      case "blog_post":
        setActiveTab("blogueros");
        // Los blogs usualmente no tienen un modal de "detalle" en el listado de admin sino edición
        break;
      case "order_pending":
        setActiveTab("tienda");
        setTiendaSubTab("pedidos");
        if (resourceId) {
          const order = adminOrders.find(o => o.id === resourceId);
          if (order) {
            setSelectedOrder(order);
            setOrderModal(true);
          }
        }
        break;
      case "adoption":
      case "adoption_request":
        setActiveTab("adopciones");
        setAdopcionSubTab("solicitudes");
        if (resourceId) {
          const solicitud = solicitudesAdopcion.find(s => s.id === resourceId);
          if (solicitud) {
            setSolicitudDetalle(solicitud);
          }
        }
        break;
      case "shelter_pet_new":
        setActiveTab("adopciones");
        setAdopcionSubTab("mascotas");
        break;
      case "pet_registration":
        setActiveTab("usuarios");
        if (resourceId) {
          for (const user of usuarios) {
            if (user.mascotas) {
              const pet = user.mascotas.find(m => m.id === resourceId);
              if (pet) {
                setSelectedPetDetail(pet);
                break;
              }
            }
          }
        }
        break;
      case "admin_audit":
        if (metadata) {
          const entity = metadata.entity || "";
          let targetType: AdminActivityEntry["type"] = "usuario";
          
          if (entity === "veterinario") targetType = "veterinario";
          else if (entity === "adopcion" || entity === "mascota_refugio") targetType = "adopcion";
          else if (entity === "producto") targetType = "producto";
          else if (entity === "blog") targetType = "blog";
          else if (entity === "evento") targetType = "evento";
          else targetType = "usuario"; // Fallback para usuario y mascota_usuario

          const auditItem = {
            entity: entity,
            entityId: metadata.entityId,
            type: targetType
          } as AdminActivityEntry;
          handleOpenActivityModule(auditItem);
        }
        break;
      case "event_registration":
        setActiveTab("eventos");
        break;
      case "discount_expired":
        setActiveTab("tienda");
        setTiendaSubTab("productos");
        
        let productToEdit = null;
        if (resourceId) {
          productToEdit = productos.find(p => p.id === resourceId);
        } else {
          // Intento de recuperación para notificaciones antiguas extrayendo el nombre del mensaje
          // Formato: La oferta del producto "Nombre" ha vencido... o similar
          const match = n.message.match(/"([^"]+)"/) || n.message.match(/producto\s+(.+)\s+ha/i);
          if (match && match[1]) {
            const productName = match[1].trim().replace(/[".]/g, "");
            productToEdit = productos.find(p => 
              p.nombre.toLowerCase().includes(productName.toLowerCase()) || 
              productName.toLowerCase().includes(p.nombre.toLowerCase())
            );
          }
        }

        if (productToEdit) {
          handleEditProducto(productToEdit);
        } else {
          toast.info("Producto no encontrado en la lista actual, pero redirigido a Tienda");
        }
        break;
      case "vet_support":
      case "appointment_reminder":
      case "appointment_confirmation":
        // Direct to a relevant section that shows appointments or users
        setActiveTab("usuarios");
        break;
      case "medical_vaccine":
      case "medical_preventive":
        setActiveTab("usuarios");
        break;
      case "admin_audit":
        setActiveTab("historial");
        break;
      default:
        console.log("Notificación sin acción específica:", type);
    }
  };

  const handleDeleteNotifications = async () => {
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      fetchNotifications();
      toast.success("Notificaciones eliminadas");
    } catch {
      console.error("Error deleting notification");
    }
  };

  const handleNotificationDelete = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleCreateVet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.vet || isSubmittingVet) return;
    submitLockRef.current.vet = true;
    setIsSubmittingVet(true);
    try {
      if (editingVetId) {
        const res = await fetch("/api/admin/vets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingVetId,
            nombre: vetForm.nombre,
            email: vetForm.email,
            especialidad: vetForm.especialidad,
            telefono: vetForm.telefono,
            cedula: vetForm.cedula,
            city: vetForm.city,
            address: vetForm.address,
            clinicName: vetForm.clinicName,
            image: vetForm.image,
          }),
        });
        if (res.ok) {
          toast.success(`¡Veterinario actualizado con éxito!`);
          fetchData(true);
          setVetForm({
            nombre: "",
            email: "",
            password: "",
            especialidad: "",
            telefono: "",
            cedula: "",
            city: "",
            address: "",
            clinicName: "",
            image: "",
          });
          setShowVetForm(false);
          setEditingVetId(null);
        } else {
          const err = await res.json();
          toast.error(`Error al actualizar: ${err.message || 'Error desconocido'}`);
        }
      } else {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: vetForm.nombre,
            email: vetForm.email,
            password: vetForm.password,
            telefono: vetForm.telefono,
            cedula: vetForm.cedula,
            role: "veterinario",
            especialidad: vetForm.especialidad,
            city: vetForm.city,
            address: vetForm.address,
            clinicName: vetForm.clinicName,
            image: vetForm.image,
          }),
        });

        if (res.ok) {
          toast.success(`¡Veterinario ${vetForm.nombre} creado con éxito!`);
          fetchData(true);
          setVetForm({
            nombre: "",
            email: "",
            password: "",
            especialidad: "",
            telefono: "",
            cedula: "",
            city: "",
            address: "",
            clinicName: "",
            image: "",
          });
          setShowVetForm(false);
        } else {
          const err = await res.json();
          toast.error(`Error al crear: ${err.message || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error("Error saving vet:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.vet = false;
      setIsSubmittingVet(false);
    }
  };

  const handleCreateEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.event || isSubmittingEvent) return;
    submitLockRef.current.event = true;
    setIsSubmittingEvent(true);
    try {
      const method = editingEventId ? "PUT" : "POST";
      const body = editingEventId
        ? { id: editingEventId, ...eventoForm }
        : eventoForm;

      const res = await fetch("/api/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(`¡Evento ${editingEventId ? 'actualizado' : 'creado'} con éxito!`);
        fetchData(true);
        setEditingEventId(null);
        setEventoForm({
          titulo: "",
          fecha: "",
          hora: "",
          lugar: "",
          descripcion: "",
          tipo: "Vacunacion",
          maximo: "100",
          image: "",
        });
        setShowEventoForm(false);
      } else {
        const err = await res.json();
        toast.error(`Error al guardar el evento: ${err.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error managing event:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.event = false;
      setIsSubmittingEvent(false);
    }
  };

  const handleEditEvento = (evento: Evento) => {
    setEventoForm({
      titulo: evento.titulo,
      fecha: evento.fecha,
      hora: evento.hora || "",
      lugar: evento.lugar,
      descripcion: evento.descripcion || "",
      tipo: evento.tipo,
      maximo: (evento.maximo || 100).toString(),
      image: evento.image || "",
    });
    setEditingEventId(String(evento.id));
    setShowEventoForm(true);
  };

  const handleViewVet = (vet: UsuarioAdmin) => {
    setSelectedVet({
      id: vet.id,
      name: vet.name || vet.nombre || "",
      nombre: vet.nombre || vet.name || "",
      email: vet.email || "",
      especialidad: vet.especialidad || vet.specialty || "General",
      estado: vet.estado || "activo",
      specialty: vet.specialty || "General",
      telefono: vet.telefono || vet.phone || "",
      cedula: vet.cedula || "",
      city: vet.city ?? "",
      address: vet.address ?? "",
      createdAt: vet.createdAt || "",
      image: vet.image || "",
    });
    setShowVetViewModal(true);
  };

  const handleEditVet = (vet: UsuarioAdmin) => {
    setVetForm({
      nombre: vet.nombre || vet.name || "",
      email: vet.email || "",
      password: "", // No mostramos el password por seguridad
      especialidad: vet.especialidad || vet.specialty || "General",
      telefono: vet.telefono || vet.phone || "",
      cedula: vet.cedula || "",
      city: vet.city || "",
      address: vet.address || "",
      clinicName: vet.clinicName || "",
      image: vet.image || "",
    });
    setEditingVetId(String(vet.id));
    setShowVetForm(true);

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetPassword = (userId: string | number, role: 'usuario' | 'veterinario') => {
    setPasswordResetModal({
      isOpen: true,
      userId,
      role,
      password: ""
    });
  };

  const confirmPasswordReset = async () => {
    if (!passwordResetModal || !passwordResetModal.password) return;
    const { userId, role, password } = passwordResetModal;

    try {
      const endpoint = role === 'veterinario' ? "/api/admin/vets" : "/api/admin/users";
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, password }),
      });
      if (res.ok) {
        toast.success(`Contraseña actualizada correctamente`);
        setPasswordResetModal(null);
      } else {
        toast.error(`Error al actualizar la contraseña`);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Error en el servidor");
    }
  };

  const handleViewUser = useCallback((user: UsuarioAdmin) => {
    setSelectedUserDetail(user);
    setShowUserViewModal(true);
  }, []);

  const handleToggleVetStatus = async (vet: UsuarioAdmin) => {
    const isCurrentlyActive = vet.estado === "activo";
    const newStatus = !isCurrentlyActive;
    
    setModalConfirmacion({
      isOpen: true,
      title: isCurrentlyActive ? "Desactivar Veterinario" : "Activar Veterinario",
      description: isCurrentlyActive
        ? `¿Estás seguro de que deseas desactivar a ${vet.name || vet.nombre}? No podrá acceder al sistema hasta que sea reactivado.`
        : `¿Estás seguro de que deseas activar a ${vet.name || vet.nombre}? Recuperará su acceso al sistema.`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: vet.id, isActive: newStatus }),
          });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error toggling vet status:", error);
        }
      },
    });
  };

  const handleDeleteVet = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Veterinario",
      description:
        "¿Estás seguro de que deseas eliminar este veterinario? Perderá acceso al sistema.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${id}`, {
            method: "DELETE",
          });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error deleting vet:", error);
        }
      },
    });
  };

  const handleDeleteUsuario = async (id: string | number) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Usuario",
      description:
        "¿Estás seguro de eliminar este usuario? Sus mascotas y registros asociados se perderán.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${id}`, {
            method: "DELETE",
          });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      },
    });
  };

  const handleDeleteEvento = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Evento",
      description:
        "¿Estás seguro de que deseas eliminar este evento? Se cancelarán todas las inscripciones.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error deleting event:", error);
        }
      },
    });
  };

  const handleCreateBloguero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.blogger || isSubmittingBlogger) return;
    submitLockRef.current.blogger = true;
    setIsSubmittingBlogger(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: blogueroForm.nombre,
          email: blogueroForm.email,
          password: blogueroForm.password,
          telefono: blogueroForm.telefono,
          cedula: blogueroForm.cedula,
          city: blogueroForm.city,
          address: blogueroForm.address,
          role: "bloguer",
        }),
      });
      if (res.ok) {
        toast.success(`¡Autor de Blog creado con éxito!`);
        fetchData(true);
        setBlogueroForm({ 
          nombre: "", 
          email: "", 
          password: "",
          telefono: "",
          cedula: "",
          city: "",
          address: "",
        });
        setShowBlogueroForm(false);
      } else {
        const err = await res.json();
        toast.error(`Error al crear: ${err.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error creating blogger:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.blogger = false;
      setIsSubmittingBlogger(false);
    }
  };

  const handleUpdateBloguero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBloguero) return;
    if (submitLockRef.current.blogger || isSubmittingBlogger) return;
    submitLockRef.current.blogger = true;
    setIsSubmittingBlogger(true);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBloguero.id,
          nombre: blogueroForm.nombre,
          email: blogueroForm.email,
          telefono: blogueroForm.telefono,
          cedula: blogueroForm.cedula,
          city: blogueroForm.city,
          address: blogueroForm.address,
          role: "bloguer"
        }),
      });
      if (res.ok) {
        toast.success(`¡Bloguero actualizado correctamente!`);
        fetchData(true);
        setBlogueroForm({ 
          nombre: "", 
          email: "", 
          password: "",
          telefono: "",
          cedula: "",
          city: "",
          address: "",
        });
        setShowBlogueroEditModal(false);
        setSelectedBloguero(null);
      } else {
        const err = await res.json();
        toast.error(`Error al actualizar: ${err.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error updating blogger:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.blogger = false;
      setIsSubmittingBlogger(false);
    }
  };

  const handleViewBloguero = useCallback((blogger: Blogger) => {
    setSelectedBloguero(blogger);
    setShowBlogueroViewModal(true);
  }, []);

  const handleEditBlogger = useCallback((blogger: Blogger) => {
    setSelectedBloguero(blogger);
    setBlogueroForm({
      nombre: blogger.nombre || "",
      email: blogger.email || "",
      password: "", // No mostramos password
      telefono: blogger.telefono || blogger.phone || "",
      cedula: blogger.cedula || "",
      city: blogger.city || "",
      address: blogger.address || "",
    });
    setShowBlogueroEditModal(true);
  }, []);

  const handleDeleteBloguero = async (id: string | number) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Autor",
      description:
        "¿Estás seguro de eliminar este autor de blog? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${id}`, {
            method: "DELETE",
          });
          if (res.ok) fetchData(true);
        } catch (error) {
          console.error("Error deleting blogger:", error);
        }
      },
    });
  };

  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.product || isSubmittingProduct) return;
    submitLockRef.current.product = true;
    setIsSubmittingProduct(true);
    try {
      const imagenesArray = Array.isArray(productoForm.imagenes)
        ? [...productoForm.imagenes]
        : [];
      if (productoForm.foto && !imagenesArray.includes(productoForm.foto)) {
        imagenesArray.unshift(productoForm.foto);
      }

      const payload: Partial<TiendaProducto> = {
        nombre: productoForm.nombre,
        precio: parseFloat(productoForm.precio),
        categoria: productoForm.categoria,
        subcategoria: productoForm.subcategoria,
        marca: productoForm.marca,
        stock: parseInt(productoForm.stock) || 0,
        foto: productoForm.foto || "/placeholder.svg",
        imagenes: imagenesArray,
        descripcion: productoForm.descripcion,
        etiqueta: productoForm.etiqueta,
        descuento: parseFloat(productoForm.descuento) || 0,
        descuentoDias: parseInt(productoForm.descuentoDias) || 0,
      };

      if (editingProductoId) {
        payload.id = editingProductoId.toString();
        const result = await AdminService.saveProducts(payload);
        if (result) {
          setProductos((prev) =>
            prev.map((p) => (p.id === editingProductoId.toString() ? result : p)),
          );
          setEditingProductoId(null);
          toast.success("¡Producto actualizado con éxito!");
        } else {
          toast.error("Error al actualizar el producto");
        }
      } else {
        const result = await AdminService.saveProducts(payload);
        if (result) {
          setProductos((prev) => sortNewestFirst([result, ...prev]));
          toast.success("¡Producto creado con éxito!");
        } else {
          toast.error("Error al crear el producto");
        }
      }

      setProductoForm({
        nombre: "",
        precio: "",
        categoria: "perros",
        subcategoria: "",
        marca: "",
        stock: "0",
        foto: "",
        imagenes: [],
        descripcion: "",
        etiqueta: "",
        descuento: "0",
        descuentoDias: "0",
      });
      setShowProductoForm(false);
    } catch (error) {
      console.error("Error managing product:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.product = false;
      setIsSubmittingProduct(false);
    }
  };

  const handleEditProducto = useCallback((prod: TiendaProducto) => {
    setProductoForm({
      nombre: prod.nombre,
      precio: (prod.precio ?? 0).toString(),
      categoria: prod.categoria,
      subcategoria: prod.subcategoria || "",
      marca: prod.marca || "",
      stock: (prod.stock ?? 0).toString(),
      foto: prod.foto || "",
      imagenes: Array.isArray(prod.imagenes) ? prod.imagenes : [],
      descripcion: prod.descripcion || "",
      etiqueta: prod.etiqueta || "",
      descuento: (prod.descuento ?? 0).toString(),
      descuentoDias: "0", // Default to 0 when editing
    });
    setEditingProductoId(prod.id);
    setShowProductoForm(true);
  }, []);

  const handleDeleteProducto = (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Producto",
      description:
        "¿Estás seguro de que deseas eliminar este producto de la tienda?",
      onConfirm: async () => {
        const success = await AdminService.deleteProduct(id);
        if (success) {
          setProductos((prev) => prev.filter((p) => p.id !== id));
          toast.success("Producto eliminado");
        } else {
          toast.error("Error al eliminar producto");
        }
      },
    });
  };

  const savePlanWhatsappDetails = async (planId: string, details: string) => {
    const res = await fetch("/api/plan-whatsapp-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, details }),
    });
    return res.ok;
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.plan || isSubmittingPlan) return;

    // Validaciones requeridas
    if (!planForm.name.trim()) {
      toast.error("El nombre del plan es obligatorio");
      return;
    }
    if (!planForm.price.trim() || planForm.price.trim() === "$") {
      toast.error("El precio del plan es obligatorio");
      return;
    }

    submitLockRef.current.plan = true;
    setIsSubmittingPlan(true);
    try {
      const whatsappDetailsDraft = planWhatsappDetailsText.trim();
      const res = await AdminService.savePlan({
        ...planForm,
        id: editingPlanId || undefined,
      });
      if (res) {
        const whatsappSaved = await savePlanWhatsappDetails(res.id, whatsappDetailsDraft);
        if (!whatsappSaved) {
          toast.error("El plan se guardo, pero no se pudo guardar el detalle de WhatsApp");
        }
        toast.success(`¡Plan ${editingPlanId ? "actualizado" : "creado"} con éxito!`);
        setPlanForm({
          name: "",
          price: "$",
          description: "",
          features: [],
          badge: "",
          color: "bg-primary",
          sectionId: "products-plans",
          billingCycle: "al mes",
        });
        setPlanWhatsappDetailsText("");
        setEditingPlanId(null);
        setShowPlanForm(false);
        fetchData(true);
      } else {
        toast.error("Error al guardar el plan");
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Error de conexión con el servidor");
    } finally {
      submitLockRef.current.plan = false;
      setIsSubmittingPlan(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setPlanForm({
      name: plan.name,
      price: plan.price.startsWith("$") ? plan.price : `$${plan.price}`,
      description: plan.description,
      features: plan.features,
      badge: plan.badge || "",
      color: plan.color || "bg-primary",
      sectionId: plan.sectionId || "products-plans",
      billingCycle: plan.billingCycle || "al mes",
    });
    setEditingPlanId(plan.id);
    setShowPlanForm(true);
    setPlanWhatsappDetailsText("");
    void (async () => {
      try {
        const res = await fetch(`/api/plan-whatsapp-details?planId=${encodeURIComponent(plan.id)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { details?: string };
        setPlanWhatsappDetailsText((data.details || "").trim());
      } catch (error) {
        console.error("Error fetching plan WhatsApp details:", error);
      }
    })();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeletePlan = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Plan",
      description:
        "¿Estás seguro de eliminar este plan de protección? No se mostrará más en la página principal.",
      onConfirm: async () => {
        try {
          await fetch(`/api/plan-whatsapp-details?planId=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          const success = await AdminService.deletePlan(id);
          if (success) {
            toast.success("Plan eliminado");
            fetchData(true);
          } else {
            toast.error("Error al eliminar el plan");
          }
        } catch (error) {
          console.error("Error deleting plan:", error);
        }
      },
    });
  };

  const handleCreateTechFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.tech || isSubmittingTechFeature) return;
    submitLockRef.current.tech = true;
    setIsSubmittingTechFeature(true);
    try {
      const res = await AdminService.saveTechFeature({
        ...techFeatureForm,
        id: editingTechFeatureId || undefined,
        order: techFeatureForm.order || 0,
      } as TechFeature);
      if (res) {
        toast.success(
          editingTechFeatureId ? "Beneficio actualizado!" : "Beneficio creado!",
        );
        setTechFeatureForm({
          iconName: "Activity",
          title: "",
          description: "",
          color: "text-[#000000]",
          bg: "bg-[#93ABD9]/10",
          order: 0,
          customIcon: "",
        });
        setEditingTechFeatureId(null);
        setShowTechFeatureForm(false);
        setTechFeatures(sortNewestFirst(await AdminService.getTechFeatures()));
      } else {
        toast.error("Error al guardar el beneficio");
      }
    } catch (error) {
      console.error("Error saving tech feature:", error);
      toast.error("Error en el servidor");
    } finally {
      submitLockRef.current.tech = false;
      setIsSubmittingTechFeature(false);
    }
  };

  const handleEditTechFeature = (feature: TechFeature) => {
    setTechFeatureForm({
      iconName: feature.iconName,
      title: feature.title,
      description: feature.description,
      color: feature.color,
      bg: feature.bg,
      order: feature.order,
      customIcon: feature.customIcon || "",
    });
    setEditingTechFeatureId(feature.id);
    setShowTechFeatureForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTechFeature = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Beneficio",
      description: "¿Estás seguro de eliminar este beneficio tecnológico?",
      onConfirm: async () => {
        try {
          const success = await AdminService.deleteTechFeature(id);
          if (success) {
            toast.success("Beneficio eliminado");
            setTechFeatures(sortNewestFirst(await AdminService.getTechFeatures()));
          } else {
            toast.error("Error al eliminar");
          }
        } catch (error) {
          console.error("Error deleting feature:", error);
        }
      },
    });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setPlanForm({
        ...planForm,
        features: [...planForm.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setPlanForm({
      ...planForm,
      features: planForm.features.filter((_, i) => i !== index),
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current.category || isSubmittingCategory) return;
    submitLockRef.current.category = true;
    setIsSubmittingCategory(true);
    try {
      const newCat = await AdminService.saveCategory(categoryForm);
      if (newCat) {
        toast.success("Categoría creada");
        setCategories((prev) => sortNewestFirst([newCat, ...prev]));
        setCategoryForm({ nombre: "", icon: "Package" });
        setShowCategoryForm(false);
      }
    } catch {
      toast.error("Error al crear categoría");
    } finally {
      submitLockRef.current.category = false;
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Categoría",
      description: "¿Estás seguro de eliminar esta categoría? Los productos asociados podrían quedar huérfanos.",
      onConfirm: async () => {
        try {
          const res = await AdminService.deleteCategory(id);
          if (res.success) {
            toast.success("Categoría eliminada");
            setCategories(categories.filter((c) => c.id !== id));
          } else {
            toast.error(res.error || "Error al eliminar");
          }
        } catch {
          toast.error("Error al eliminar");
        }
      },
    });
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryForm.categoryId) {
      toast.error("Selecciona una categoría padre");
      return;
    }
    if (submitLockRef.current.subcategory || isSubmittingSubcategory) return;
    submitLockRef.current.subcategory = true;
    setIsSubmittingSubcategory(true);
    try {
      const newSub = await AdminService.saveSubcategory(subcategoryForm);
      if (newSub) {
        toast.success("Subcategoría creada");
        setSubcategories((prev) => sortNewestFirst([newSub, ...prev]));
        setSubcategoryForm({ nombre: "", categoryId: "" });
        setShowSubcategoryForm(false);
      }
    } catch {
      toast.error("Error al crear subcategoría");
    } finally {
      submitLockRef.current.subcategory = false;
      setIsSubmittingSubcategory(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    setModalConfirmacion({
      isOpen: true,
      title: "Eliminar Subcategoría",
      description: "¿Estás seguro de eliminar esta subcategoría?",
      onConfirm: async () => {
        try {
          const res = await AdminService.deleteSubcategory(id);
          if (res.success) {
            toast.success("Subcategoría eliminada");
            setSubcategories(subcategories.filter((s) => s.id !== id));
          } else {
            toast.error(res.error || "Error al eliminar subcategoría");
          }
        } catch {
          toast.error("Error al eliminar subcategoría");
        }
      },
    });
  };

  const pendientes = useMemo(
    () => solicitudesAdopcion.filter((s) => s.estado === "pendiente").length,
    [solicitudesAdopcion]
  );
  const VETS_PAGE_SIZE = vetsPerPage;
  const filteredVeterinarios = useMemo(() => {
    const q = vetsQuery.trim().toLowerCase();
    if (!q) return veterinarios;
    return veterinarios.filter((vet) =>
      [
        vet.nombre,
        vet.name,
        vet.email,
        vet.especialidad,
        vet.specialty,
        vet.telefono,
        vet.phone,
        vet.cedula,
        vet.estado,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [veterinarios, vetsQuery]);
  const totalVetPages = Math.max(1, Math.ceil(filteredVeterinarios.length / VETS_PAGE_SIZE));
  const currentVetPage = Math.min(vetsPage, totalVetPages);
  const pagedVeterinarios = useMemo(
    () =>
      filteredVeterinarios.slice(
        (currentVetPage - 1) * VETS_PAGE_SIZE,
        currentVetPage * VETS_PAGE_SIZE
      ),
    [filteredVeterinarios, currentVetPage, VETS_PAGE_SIZE]
  );
  const SOLICITUDES_PAGE_SIZE = solicitudesPerPage;
  const totalSolicitudesPages = useMemo(
    () => Math.max(1, Math.ceil(solicitudesAdopcion.length / SOLICITUDES_PAGE_SIZE)),
    [solicitudesAdopcion.length, SOLICITUDES_PAGE_SIZE]
  );
  const currentSolicitudesPage = Math.min(solicitudesPage, totalSolicitudesPages);
  const pagedSolicitudesAdopcion = useMemo(
    () =>
      solicitudesAdopcion.slice(
        (currentSolicitudesPage - 1) * SOLICITUDES_PAGE_SIZE,
        currentSolicitudesPage * SOLICITUDES_PAGE_SIZE
      ),
    [solicitudesAdopcion, currentSolicitudesPage, SOLICITUDES_PAGE_SIZE]
  );

  const outOfStockCount = useMemo(
    () => productos.filter((p) => p.stock === 0).length,
    [productos]
  );

  const historyTypeLabels: Record<AdminActivityFilterType, string> = {
    todos: "Todos",
    veterinario: "Veterinarios",
    usuario: "Usuarios",
    adopcion: "Adopciones",
    evento: "Eventos",
    blog: "Blog",
    producto: "Tienda",
  };

  const historyFilterOptions: AdminActivityFilterType[] = [
    "todos",
    "veterinario",
    "usuario",
    "adopcion",
    "evento",
    "blog",
    "producto",
  ];

  const historyDateLabels: Record<AdminActivityDateRange, string> = {
    todo: "Todo",
    hoy: "Hoy",
    "7d": "7 días",
    "30d": "30 días",
  };

  const historyDateOptions: AdminActivityDateRange[] = [
    "todo",
    "hoy",
    "7d",
    "30d",
  ];

  const adminActivity = useMemo(() => {
    const inferTypeFromAudit = (
      entry: AdminHistoryNotification,
    ): AdminActivityEntry["type"] => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      const entity = metadata.entity;
      if (entity === "veterinario") return "veterinario";
      if (entity === "usuario") return "usuario";
      if (entity === "adopcion") return "adopcion";
      if (entity === "mascota_refugio") return "adopcion";
      if (entity === "mascota_usuario") return "usuario";
      return "evento";
    };

    const persistentAuditActivity: AdminActivityEntry[] = adminHistoryEntries.map(
      (entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
        const actorName =
          (typeof metadata.actorName === "string" && metadata.actorName.trim()) ||
          (typeof metadata.actorEmail === "string" && metadata.actorEmail.trim()) ||
          "Sistema";
        const previousStatus =
          typeof metadata.previousStatus === "string" ? metadata.previousStatus : "";
        const newStatus = typeof metadata.newStatus === "string" ? metadata.newStatus : "";
        const action = typeof metadata.action === "string" ? metadata.action : "";
        const entity = typeof metadata.entity === "string" ? metadata.entity : "";
        return {
          id: `audit-${entry.id}`,
          type: inferTypeFromAudit(entry),
          title: entry.title || "Actividad",
          detail: entry.message || "Sin detalle",
          createdAt: entry.createdAt || "",
          actor: actorName,
          action,
          entity,
          entityId: typeof metadata.entityId === "string" ? metadata.entityId : undefined,
          beforeAfter:
            previousStatus && newStatus
              ? `${previousStatus.toUpperCase()} -> ${newStatus.toUpperCase()}`
              : undefined,
        };
      },
    );

    // Datos vivos del panel para complementar la bitácora persistente.
    const activity: AdminActivityEntry[] = [
      ...veterinarios.map((v) => ({
        id: `vet-${v.id}`,
        type: "veterinario" as const,
        title: "Veterinario registrado",
        detail: v.nombre || v.email || "Veterinario",
        createdAt: v.createdAt || "",
      })),
      ...usuarios.map((u) => ({
        id: `usr-${u.id}`,
        type: "usuario" as const,
        title: "Usuario registrado",
        detail: u.nombre || u.email || "Usuario",
        createdAt: u.createdAt || "",
      })),
      ...solicitudesAdopcion.map((s) => ({
        id: `adp-${s.id}`,
        type: "adopcion" as const,
        title: "Solicitud de adopción",
        detail: `${s.nombreCompleto || "Solicitante"} · ${s.estado || "pendiente"}`,
        createdAt: s.createdAt || s.fecha || "",
      })),
      ...eventos.map((e) => ({
        id: `evt-${e.id}`,
        type: "evento" as const,
        title: "Evento creado/actualizado",
        detail: e.titulo || "Evento",
        createdAt: (e as { createdAt?: string }).createdAt || e.fecha || "",
      })),
      ...blogueros.map((b) => ({
        id: `blg-${b.id}`,
        type: "blog" as const,
        title: "Autor de blog",
        detail: b.nombre || b.email || "Autor",
        createdAt:
          (b as { createdAt?: string; fechaRegistro?: string }).createdAt ||
          (b as { createdAt?: string; fechaRegistro?: string }).fechaRegistro ||
          "",
      })),
      ...productos.map((p) => ({
        id: `prd-${p.id}`,
        type: "producto" as const,
        title: "Producto en tienda",
        detail: p.nombre || "Producto",
        createdAt: (p as { createdAt?: string }).createdAt || "",
      })),
    ];

    const merged =
      historyViewMode === "audit_only"
        ? persistentAuditActivity
        : [...persistentAuditActivity, ...activity];
    const deduped = merged.filter(
      (entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index,
    );
    return sortNewestFirst(deduped).slice(0, 300);
  }, [adminHistoryEntries, blogueros, eventos, historyViewMode, productos, solicitudesAdopcion, usuarios, veterinarios]);

  const filteredAdminActivity = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const now = Date.now();
    const rangeWindowMs: Record<Exclude<AdminActivityDateRange, "todo">, number> = {
      hoy: 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    return adminActivity.filter((item) => {
      const matchesType = historyFilter === "todos" || item.type === historyFilter;
      if (!matchesType) return false;

      if (historyDateRange !== "todo") {
        const itemTimestamp = new Date(item.createdAt).getTime();
        if (Number.isNaN(itemTimestamp)) return false;
        const minAllowed = now - rangeWindowMs[historyDateRange];
        if (itemTimestamp < minAllowed) return false;
      }

      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.detail.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    });
  }, [adminActivity, historyDateRange, historyFilter, historyQuery]);

  const HISTORY_PAGE_SIZE = 10;
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredAdminActivity.length / HISTORY_PAGE_SIZE),
  );
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const pagedAdminActivity = useMemo(() =>
      filteredAdminActivity.slice(
        (currentHistoryPage - 1) * HISTORY_PAGE_SIZE,
        currentHistoryPage * HISTORY_PAGE_SIZE,
      ),
    [currentHistoryPage, filteredAdminActivity],
  );

  const recentDeletedUsers = useMemo(
    () =>
      adminActivity
        .filter(
          (item) =>
            item.action === "delete" &&
            (item.entity === "usuario" || item.entity === "veterinario"),
        )
        .slice(0, 8),
    [adminActivity],
  );

  const adoptionOverview = useMemo(() => {
    const totalShelterPets = perrosAdopcion.length;
    const adoptedShelterPets = perrosAdopcion.filter(
      (pet) => String(pet.estado || "").toLowerCase() === "adoptado",
    ).length;
    const availableShelterPets = Math.max(0, totalShelterPets - adoptedShelterPets);
    const pendingRequests = solicitudesAdopcion.filter(
      (s) => String(s.estado || "").toLowerCase() === "pendiente",
    ).length;
    const deliveredRequests = solicitudesAdopcion.filter(
      (s) => String(s.estado || "").toLowerCase() === "entregada",
    ).length;

    return {
      totalShelterPets,
      availableShelterPets,
      adoptedShelterPets,
      pendingRequests,
      deliveredRequests,
    };
  }, [perrosAdopcion, solicitudesAdopcion]);

  const recentDeliveredAdoptions = useMemo(
    () =>
      sortNewestFirst(
        solicitudesAdopcion.filter(
          (s) => String(s.estado || "").toLowerCase() === "entregada",
        ),
      ).slice(0, 8),
    [solicitudesAdopcion],
  );

  const handleOpenActivityModule = useCallback(
    (item: AdminActivityEntry) => {
      if (item.entity === "mascota_usuario" && item.entityId) {
        for (const user of usuarios) {
          if (user.mascotas) {
            const pet = user.mascotas.find((m) => m.id === item.entityId);
            if (pet) {
              setActiveTab("usuarios");
              setSelectedPetDetail(pet);
              return;
            }
          }
        }
      }

      if (item.entity === "usuario" && item.entityId) {
        const user = usuarios.find((u) => u.id === item.entityId);
        if (user) {
          setActiveTab("usuarios");
          setSelectedUserDetail(user);
          setShowUserViewModal(true);
          return;
        }
      }

      if (item.entity === "veterinario" && item.entityId) {
        const vet = veterinarios.find((v) => v.id === item.entityId);
        if (vet) {
          setActiveTab("veterinarios");
          setSelectedVet(vet as unknown as Veterinario);
          setShowVetViewModal(true);
          return;
        }
      }

      if (item.entity === "adopcion" && item.entityId) {
        const req = solicitudesAdopcion.find((s) => s.id === item.entityId);
        if (req) {
          setActiveTab("adopciones");
          setAdopcionSubTab("solicitudes");
          setSolicitudDetalle(req);
          return;
        }
      }

      const historyTypeTargetTab: Record<AdminActivityEntry["type"], TabType> = {
        veterinario: "veterinarios",
        usuario: "usuarios",
        adopcion: "adopciones",
        evento: "eventos",
        blog: "blogueros",
        producto: "tienda",
      };
      const targetTab = historyTypeTargetTab[item.type];
      setActiveTab(targetTab);
      if (item.type === "producto") {
        setTiendaSubTab("productos");
        setIsTiendaExpanded(true);
      }
      if (item.type === "adopcion") {
        setAdopcionSubTab("solicitudes");
      }
    },
    [usuarios, veterinarios, solicitudesAdopcion],
  );

  const handleExportHistoryCsv = useCallback(() => {
    const resolveExportDate = (item: AdminActivityEntry) => {
      if (item.createdAt) {
        // Sufijo para forzar texto en Excel y evitar celdas con #######
        return `${formatDateTime(item.createdAt)} h`;
      }

      // Intentar recuperar fecha desde ObjectId (registros legacy sin createdAt explícito).
      const idCandidate = item.id.split("-").pop() || "";
      if (/^[a-f\d]{24}$/i.test(idCandidate)) {
        const ts = parseInt(idCandidate.slice(0, 8), 16) * 1000;
        if (!Number.isNaN(ts)) {
          return `${formatDateTime(new Date(ts).toISOString())} h`;
        }
      }

      return "No registrada";
    };

    const rows = filteredAdminActivity.map((item) => ({
      tipo: item.type,
      titulo: item.title,
      detalle: item.detail,
      actor: item.actor || "Sistema",
      fecha: resolveExportDate(item),
    }));

    const escapeCsvCell = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    // Excel en configuración regional ES suele separar columnas con ';'
    const separator = ";";
    const header = ["Tipo", "Titulo", "Detalle", "Actor", "Fecha"];
    const csvLines = [
      header.join(separator),
      ...rows.map((row) =>
        [row.tipo, row.titulo, row.detalle, row.actor, row.fecha]
          .map(escapeCsvCell)
          .join(separator),
      ),
    ];

    const blob = new Blob([`\uFEFF${csvLines.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `historial-admin-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Historial exportado en CSV");
  }, [filteredAdminActivity]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyDateRange, historyFilter, historyQuery, historyViewMode]);

  const tabs = [
    { id: "estadisticas" as TabType, label: "Estadísticas", icon: BarChart3 },
    {
      id: "veterinarios" as TabType,
      label: "Veterinarios",
      icon: Stethoscope,
      count: veterinarios.length,
    },
    {
      id: "usuarios" as TabType,
      label: "Usuarios",
      icon: Users,
      count: usuarios.length,
    },
    {
      id: "adopciones" as TabType,
      label: "Adopciones",
      icon: Heart,
      count: solicitudesAdopcion.length,
    },
    {
      id: "eventos" as TabType,
      label: "Eventos",
      icon: Calendar,
      count: eventos.length,
    },
    {
      id: "tienda" as TabType,
      label: "Tienda",
      icon: ShoppingBag,
      count: productos.length,
    },
    {
      id: "blogueros" as TabType,
      label: "Autores Blog",
      icon: FileText,
      count: blogueros.length,
    },
    {
      id: "historial" as TabType,
      label: "Historial",
      icon: History,
      count: adminActivity.length,
    },
    {
      id: "planes" as TabType,
      label: "Planes",
      icon: Shield,
      count: planes.length,
    },
    {
      id: "plan-qr" as TabType,
      label: "Plan QR",
      icon: QrCode,
    },
    {
      id: "beneficios" as TabType,
      label: "Beneficios",
      icon: Star,
      count: techFeatures.length,
    },
    { id: "sistema" as TabType, label: "Sistema", icon: Settings },
  ];

  if (status === "loading" || (loading && veterinarios.length === 0)) {
    return <MiauLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-[#000000]">
      {/* Header */}
      <header className="border-b-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#EDE986] text-[#000000] rounded-xl p-2 border-[2.5px] border-[#000000] shadow-[2.5px_2.5px_0px_0px_#000000] transform -rotate-3 shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="brightness-0 -mb-1 ml-[-32px]">
                  <LogoHorizontal size="sm" className="origin-left scale-[1.9]" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <h1 className="text-base font-black font-heading tracking-tight text-[#000000] leading-none">
                    Panel de Administración
                  </h1>
                  <div className="h-3 w-[1.5px] bg-[#000000]/20 mx-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#000000]/40">
                    Control Total
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AdminNotificationBell 
                notifications={notifications} 
                onMarkAsRead={handleMarkAsRead} 
                onNotificationClick={handleNotificationAction}
                onDeleteAll={handleDeleteNotifications} 
                onDeleteSingle={handleNotificationDelete}
              />
              <Button
                onClick={handleLogout}
                className="bg-[#ffadad] hover:bg-[#ff7b7b] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + Main Layout */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)] relative">
        {/* Navigation Sidebar */}
        <aside className="admin-sidebar-scroll w-full lg:w-72 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#000000] bg-[#fdfaf5]/50 backdrop-blur-sm lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] z-40 lg:overflow-y-auto lg:overflow-x-visible overflow-x-auto overflow-y-visible scroll-smooth [-webkit-overflow-scrolling:touch]">
          <div className="flex flex-row lg:flex-col gap-2 lg:gap-3 overflow-x-auto lg:overflow-visible overscroll-x-contain px-3 py-3 md:px-4 lg:p-6 lg:space-y-3 no-scrollbar">
            <p className="hidden lg:block text-[10px] font-black uppercase tracking-[2px] text-[#000000]/40 mb-2 px-2">
              Menu Principal
            </p>
            {tabs.map((tab) => {
              if (tab.id === "tienda") {
                return (
                  <div key={tab.id} className="space-y-1 shrink-0 min-w-[220px] lg:min-w-0 lg:w-full">
                    <button
                      onClick={() => setIsTiendaExpanded(!isTiendaExpanded)}
                      className={`w-full flex items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4 rounded-2xl font-heading font-bold transition-all duration-300 border-[3px] group ${
                        activeTab === tab.id
                          ? "bg-[#93ABD9] text-[#000000] border-[#000000] shadow-[4px_4px_0px_0px_#000000]"
                          : "bg-[#000000]/5 text-[#000000]/60 border-transparent hover:bg-[#000000]/10 hover:text-[#000000]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon
                          className={`h-5 w-5 shrink-0 ${activeTab === tab.id ? "text-[#000000]" : "text-[#000000]/70 group-hover:scale-110 transition-transform"}`}
                        />
                        <span className="truncate text-sm tracking-tight">
                          {tab.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tab.count !== undefined && (
                          <Badge
                            className={`shrink-0 border-[2px] border-[#000000] text-[10px] h-5 min-w-[20px] flex items-center justify-center font-black ${activeTab === tab.id ? "bg-white text-[#000000]" : "bg-[#93ABD9] text-[#000000]"} shadow-sm`}
                          >
                            {tab.count}
                          </Badge>
                        )}
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-300 ${isTiendaExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </button>

                    {isTiendaExpanded && (
                      <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        <button
                          onClick={() => {
                            setActiveTab("tienda");
                            setTiendaSubTab("productos");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === "tienda" &&
                            tiendaSubTab === "productos"
                              ? "bg-[#000000]/10 text-[#000000] translate-x-1"
                              : "text-[#000000]/50 hover:text-[#000000] hover:bg-[#000000]/5"
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          Gestionar Productos
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("tienda");
                            setTiendaSubTab("categorias");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === "tienda" &&
                            tiendaSubTab === "categorias"
                              ? "bg-[#000000]/10 text-[#000000] translate-x-1"
                              : "text-[#000000]/50 hover:text-[#000000] hover:bg-[#000000]/5"
                          }`}
                        >
                          <LayoutGrid className="h-3 w-3" />
                          Gestionar Categorías
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("tienda");
                            setTiendaSubTab("pedidos");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === "tienda" &&
                            tiendaSubTab === "pedidos"
                              ? "bg-[#000000]/10 text-[#000000] translate-x-1"
                              : "text-[#000000]/50 hover:text-[#000000] hover:bg-[#000000]/5"
                          }`}
                        >
                          <ShoppingBag className="h-3 w-3" />
                          Gestionar Pedidos
                          {pendingOrdersCount > 0 && (
                            <span className="ml-auto bg-red-500 border-2 border-[#000000] text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-[2px_2px_0px_0px_#000000]">
                              {pendingOrdersCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("tienda");
                            setTiendaSubTab("impuestos");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === "tienda" &&
                            tiendaSubTab === "impuestos"
                              ? "bg-[#000000]/10 text-[#000000] translate-x-1"
                              : "text-[#000000]/50 hover:text-[#000000] hover:bg-[#000000]/5"
                          }`}
                        >
                          <DollarSign className="h-3 w-3" />
                          IVA y Configuración
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 lg:w-full min-w-[168px] lg:min-w-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4 rounded-2xl font-heading font-bold transition-all duration-300 border-[3px] group ${
                    activeTab === tab.id
                      ? "bg-[#93ABD9] text-[#000000] border-[#000000] shadow-[4px_4px_0px_0px_#000000] lg:-translate-x-1 lg:-translate-y-1"
                      : "bg-[#000000]/5 text-[#000000]/60 border-transparent hover:bg-[#000000]/10 hover:text-[#000000]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon
                      className={`h-5 w-5 shrink-0 ${activeTab === tab.id ? "text-[#000000]" : "text-[#000000]/70 group-hover:scale-110 transition-transform"}`}
                    />
                    <span className="truncate text-sm tracking-tight">
                      {tab.label}
                    </span>
                  </div>
                  {tab.count !== undefined && (
                    <Badge
                      className={`shrink-0 border-[2px] border-[#000000] text-[10px] h-6 min-w-[24px] flex items-center justify-center font-black ${activeTab === tab.id ? "bg-white text-[#000000]" : "bg-[#93ABD9] text-[#000000]"} shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]`}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 lg:mt-10 px-4 py-4 md:px-6 lg:p-6 border-t-[3px] border-[#000000]/20">
            <div className="bg-[#93ABD9] border-[3px] border-[#000000] p-4 rounded-2xl shadow-[4px_4px_0px_0px_#000000]">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#000000]">
                Estado del Sistema
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse border border-black/20" />
                <span className="text-xs font-bold text-[#000000]">
                  Base de Datos: Conectada
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 px-4 lg:px-10 py-6 md:py-8 lg:py-10 relative overflow-y-auto no-scrollbar min-w-0">
          {hasLocalData && (
            <div className="mb-8 max-w-5xl">
              <div className="bg-[#93ABD9] border-[3px] border-[#000000] p-6 rounded-3xl shadow-[8px_8px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5 text-[#000000]">
                  <div className="bg-white p-4 rounded-2xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000]">
                    <Activity className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl">
                      ¿Migrar datos locales al Servidor?
                    </h3>
                    <p className="font-bold opacity-80">
                      Hemos detectado eventos o mascotas guardadas solo en este
                      navegador. ¿Quieres subirlos a la base de datos de
                      MongoDB?
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="bg-white hover:bg-white/90 text-[#000000] border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black h-16 px-10 rounded-2xl transition-all active:translate-y-1 active:shadow-none whitespace-nowrap"
                >
                  {isSyncing ? "Migrando..." : " Subir todo a la Nube"}
                </Button>
              </div>
            </div>
          )}
          {/* Statistics Dashboard */}
          {activeTab === "estadisticas" && (
            <div className="space-y-10 animate-fade-in pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  title="Comunidad"
                  value={adminStats?.users.total || 0}
                  icon={Users}
                  color="bg-[#93ABD9]"
                  detail={`${adminStats?.users.usuario || 0} Usuarios • ${adminStats?.users.veterinario || 0} Vets • ${adminStats?.users.bloguer || 0} Bloggers • ${adminStats?.users.admin || 0} Admin`}
                />
                <StatCard
                  title="Mascotas en adopción"
                  value={adminStats?.pets.shelterPets || 0}
                  icon={Dog}
                  color="bg-[#ffd6a5]"
                  detail="Perritos en espera de hogar"
                />
                <StatCard
                  title="Mascotas de usuarios"
                  value={adminStats?.pets.userPets || 0}
                  icon={PawPrint}
                  color="bg-[#ffc6ff]"
                  detail="Registradas por la Comunidad"
                />
                <StatCard
                  title="Solicitudes de Adopciones"
                  value={adminStats?.adoptions.totalRequests || 0}
                  icon={Heart}
                  color="bg-[#ffadad]"
                  detail={`${adminStats?.adoptions.pendiente || 0} Solicitudes Pendientes`}
                />
                <StatCard
                  title="Mascotas Adoptadas "
                  value={adminStats?.adoptions.entregadas || 0}
                  icon={CheckCircle}
                  color="bg-[#9bf6ff]"
                  detail="Hogares felices encontrados"
                />
                <StatCard
                  title="Tienda"
                  value={productos.length}
                  icon={ShoppingBag}
                  color="bg-[#bdb2ff]"
                  detail={`${outOfStockCount} Agotados`}
                />
                <StatCard
                  title="Acciones Salud"
                  value={adminStats?.health.totalActions || 0}
                  icon={PulseIcon}
                  color="bg-[#93ABD9]"
                  detail={`${adminStats?.health.vaccinations || 0} Vacunaciones`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribución de Usuarios */}
                <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                  <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#000000]" />
                      <CardTitle className="font-black">
                        Distribución de Roles
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <StatItemMini
                        label="Administradores"
                        value={adminStats?.users.admin || 0}
                        color="bg-[#ffadad]"
                      />
                      <StatItemMini
                        label="Veterinarios"
                        value={adminStats?.users.veterinario || 0}
                        color="bg-[#93ABD9]"
                      />
                      <StatItemMini
                        label="Usuarios"
                        value={adminStats?.users.usuario || 0}
                        color="bg-[#93ABD9]"
                      />
                      <StatItemMini
                        label="Autores de Blog"
                        value={adminStats?.users.bloguer || 0}
                        color="bg-[#ffd6a5]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Resumen de Salud */}
                <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                  <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#000000]" />
                      <CardTitle className="font-black">
                        Métricas de Salud
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white border-[2px] border-[#000000] rounded-2xl">
                        <p className="text-xs font-bold opacity-60 uppercase">
                          Revisión y Diagnóstico
                        </p>
                        <p className="text-2xl font-black">
                          {adminStats?.health.diagnoses || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-white border-[2px] border-[#000000] rounded-2xl">
                        <p className="text-xs font-bold opacity-60 uppercase">
                          Tratamientos
                        </p>
                        <p className="text-2xl font-black">
                          {adminStats?.health.treatments || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-white border-[2px] border-[#000000] rounded-2xl">
                        <p className="text-xs font-bold opacity-60 uppercase">
                          Vacunas
                        </p>
                        <p className="text-2xl font-black">
                          {adminStats?.health.vaccinations || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-white border-[2px] border-[#000000] rounded-2xl">
                        <p className="text-xs font-bold opacity-60 uppercase">
                          Preventivos
                        </p>
                        <p className="text-2xl font-black">
                          {adminStats?.health.preventives || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "historial" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
                  Historial del Sistema
                </h2>
                <p className="font-semibold opacity-70 text-[#000000]/70">
                  Últimos movimientos relevantes del panel admin
                </p>
              </div>

              <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                  <CardTitle className="flex items-center gap-3 font-black font-heading text-xl">
                    <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                      <History className="h-5 w-5 text-[#000000]" />
                    </div>
                    Actividad Reciente
                  </CardTitle>
                  <CardDescription className="pt-2 font-semibold text-[#000000]/70">
                    Historial conectado con usuarios, veterinarios, adopciones, eventos, blog y tienda.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-6">
                  <div className="grid gap-3">
                    <Input
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Buscar en historial..."
                      className="h-11 rounded-xl border-[2px] border-[#000000] bg-white font-semibold shadow-[2px_2px_0px_0px_#000000]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {historyFilterOptions.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          onClick={() => setHistoryFilter(option)}
                          className={`h-9 rounded-xl border-[2px] border-[#000000] px-3 font-black shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                            historyFilter === option
                              ? "bg-[#93ABD9] text-[#000000]"
                              : "bg-white text-[#000000] hover:bg-[#f3f0ff]"
                          }`}
                        >
                          {historyTypeLabels[option]}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => setHistoryViewMode("audit_plus_live")}
                        className={`h-9 rounded-xl border-[2px] border-[#000000] px-3 font-black shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                          historyViewMode === "audit_plus_live"
                            ? "bg-[#93ABD9] text-[#000000]"
                            : "bg-white text-[#000000] hover:bg-[#f3f0ff]"
                        }`}
                      >
                        Bitácora + estado actual
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setHistoryViewMode("audit_only")}
                        className={`h-9 rounded-xl border-[2px] border-[#000000] px-3 font-black shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                          historyViewMode === "audit_only"
                            ? "bg-[#bdb2ff] text-[#000000]"
                            : "bg-white text-[#000000] hover:bg-[#f3f0ff]"
                        }`}
                      >
                        Solo bitácora
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {historyDateOptions.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          onClick={() => setHistoryDateRange(option)}
                          className={`h-9 rounded-xl border-[2px] border-[#000000] px-3 font-black shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                            historyDateRange === option
                              ? "bg-[#bdb2ff] text-[#000000]"
                              : "bg-white text-[#000000] hover:bg-[#f3f0ff]"
                          }`}
                        >
                          {historyDateLabels[option]}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-[2px] border-[#000000] bg-white px-3 py-2 shadow-[2px_2px_0px_0px_#000000]">
                      <p className="text-sm font-bold text-[#000000]/70">
                        Mostrando {filteredAdminActivity.length} de {adminActivity.length} movimientos
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowDeletedUsersPanel((prev) => !prev)}
                          className={`h-8 rounded-full border-[2px] border-[#000000] px-3 text-[11px] font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                            showDeletedUsersPanel
                              ? "bg-[#93ABD9] hover:bg-[#7f9dca]"
                              : "bg-white hover:bg-[#f3f0ff]"
                          }`}
                        >
                          {showDeletedUsersPanel ? (
                            <>
                              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                              Ocultar eliminados
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Ver usuarios eliminados
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowAdoptionsPanel((prev) => !prev)}
                          className={`h-8 rounded-full border-[2px] border-[#000000] px-3 text-[11px] font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all active:translate-y-1 active:shadow-none ${
                            showAdoptionsPanel
                              ? "bg-[#E7BEF8] hover:bg-[#d9a8eb]"
                              : "bg-white hover:bg-[#f3f0ff]"
                          }`}
                        >
                          {showAdoptionsPanel ? (
                            <>
                              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                              Ocultar adopciones
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Ver panel de adopciones
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleExportHistoryCsv}
                      disabled={filteredAdminActivity.length === 0}
                      className="h-10 justify-center rounded-xl border-[2px] border-[#000000] bg-[#ffd6a5] font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#ffc48a] active:translate-y-1 active:shadow-none disabled:opacity-50"
                    >
                      Exportar historial CSV
                    </Button>
                  </div>

                  {showDeletedUsersPanel && (
                    <div className="rounded-2xl border-[2px] border-[#000000] bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
                      <p className="mb-3 text-sm font-black text-[#000000]">
                        Usuarios eliminados recientes
                      </p>
                      {recentDeletedUsers.length === 0 ? (
                        <p className="text-xs font-bold text-[#000000]/60">
                          Aún no hay eliminaciones registradas en la bitácora persistente.
                        </p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {recentDeletedUsers.map((entry) => (
                            <div
                              key={`deleted-${entry.id}`}
                              className="rounded-xl border-[2px] border-[#000000]/20 bg-[#fff5f5] p-2 text-xs font-bold text-[#000000]"
                            >
                              <p className="truncate font-black">{entry.detail}</p>
                              <p className="text-[#000000]/60">
                                {entry.createdAt ? formatDateTime(entry.createdAt) : "Sin fecha"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {showAdoptionsPanel && (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border-[2px] border-[#000000] bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
                        <p className="mb-3 text-sm font-black text-[#000000]">
                          Resumen de adopciones
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border-[2px] border-[#000000]/20 bg-[#f9f7ff] p-2">
                            <p className="text-[11px] font-black uppercase text-[#000000]/60">Disponibles</p>
                            <p className="text-lg font-black text-[#000000] tabular-nums">
                              {adoptionOverview.availableShelterPets}
                            </p>
                          </div>
                          <div className="rounded-xl border-[2px] border-[#000000]/20 bg-[#f4fff4] p-2">
                            <p className="text-[11px] font-black uppercase text-[#000000]/60">Adoptadas</p>
                            <p className="text-lg font-black text-[#000000] tabular-nums">
                              {adoptionOverview.adoptedShelterPets}
                            </p>
                          </div>
                          <div className="rounded-xl border-[2px] border-[#000000]/20 bg-[#fff9f2] p-2">
                            <p className="text-[11px] font-black uppercase text-[#000000]/60">Solicitudes pendientes</p>
                            <p className="text-lg font-black text-[#000000] tabular-nums">
                              {adoptionOverview.pendingRequests}
                            </p>
                          </div>
                          <div className="rounded-xl border-[2px] border-[#000000]/20 bg-[#eef3ff] p-2">
                            <p className="text-[11px] font-black uppercase text-[#000000]/60">Entregadas</p>
                            <p className="text-lg font-black text-[#000000] tabular-nums">
                              {adoptionOverview.deliveredRequests}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-bold text-[#000000]/60">
                          Total mascotas en refugio: {adoptionOverview.totalShelterPets}
                        </p>
                      </div>

                      <div className="rounded-2xl border-[2px] border-[#000000] bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
                        <p className="mb-3 text-sm font-black text-[#000000]">
                          Adopciones concretadas recientes
                        </p>
                        {recentDeliveredAdoptions.length === 0 ? (
                          <p className="text-xs font-bold text-[#000000]/60">
                            Aún no hay adopciones entregadas registradas.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {recentDeliveredAdoptions.map((adoption) => (
                              <div
                                key={`adopted-${String(adoption.id)}`}
                                className="rounded-xl border-[2px] border-[#000000]/20 bg-[#f7fff7] p-2"
                              >
                                <p className="truncate text-xs font-black text-[#000000]">
                                  {adoption.perroNombre || "Mascota"} {"->"} {adoption.nombreCompleto || "Adoptante"}
                                </p>
                                <p className="truncate text-[11px] font-bold text-[#000000]/65">
                                  {adoption.email || "Sin correo"} •{" "}
                                  {(adoption as { updatedAt?: string }).updatedAt
                                    ? formatDateTime((adoption as { updatedAt?: string }).updatedAt || "")
                                    : adoption.createdAt
                                      ? formatDateTime(adoption.createdAt)
                                      : adoption.fecha || "Sin fecha"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {filteredAdminActivity.length === 0 ? (
                    <div className="rounded-2xl border-[2px] border-dashed border-[#000000]/20 bg-white p-6 text-center font-bold text-[#000000]/50">
                      No hay resultados para ese filtro.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border-[2px] border-[#000000] bg-white shadow-[3px_3px_0px_0px_#000000]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-[2px] border-[#000000] bg-[#f3f0ff]">
                            <TableHead className="font-black text-[#000000]">Tipo</TableHead>
                            <TableHead className="font-black text-[#000000]">Evento</TableHead>
                            <TableHead className="font-black text-[#000000]">Actor</TableHead>
                            <TableHead className="font-black text-[#000000]">Fecha</TableHead>
                            <TableHead className="font-black text-[#000000] text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedAdminActivity.map((item) => (
                            <TableRow key={item.id} className="border-b border-[#000000]/10">
                              <TableCell>
                                <Badge className="border-[2px] border-[#000000] bg-[#E7BEF8] text-[#000000] font-black">
                                  {item.type.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[400px] min-w-[200px]">
                                <p className="font-black text-[#000000] leading-tight">{item.title}</p>
                                <p className="text-xs font-bold text-[#000000]/70 mt-1">{item.detail}</p>
                              </TableCell>
                              <TableCell className="text-xs font-black text-[#000000]/80">
                                {item.actor || "Sistema"}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-[#000000]/60">
                                {item.createdAt ? formatDateTime(item.createdAt) : "Sin fecha"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  onClick={() => handleOpenActivityModule(item)}
                                  className="h-8 rounded-lg border-[2px] border-[#000000] bg-[#93ABD9] px-3 text-xs font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#7f9dca] active:translate-y-1 active:shadow-none"
                                >
                                  Ver módulo
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {filteredAdminActivity.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[2px] border-[#000000] bg-white p-3 shadow-[2px_2px_0px_0px_#000000]">
                      <span className="text-sm font-black text-[#000000]/70">
                        Página {currentHistoryPage} de {totalHistoryPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentHistoryPage <= 1}
                          className="h-9 rounded-xl border-[2px] border-[#000000] bg-white px-3 font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#f5f5f5] active:translate-y-1 active:shadow-none disabled:opacity-50"
                        >
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            setHistoryPage((prev) =>
                              Math.min(totalHistoryPages, prev + 1),
                            )
                          }
                          disabled={currentHistoryPage >= totalHistoryPages}
                          className="h-9 rounded-xl border-[2px] border-[#000000] bg-[#93ABD9] px-3 font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#7f9dca] active:translate-y-1 active:shadow-none disabled:opacity-50"
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "veterinarios" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black font-heading tracking-tight">
                    Gestion de Veterinarios
                  </h2>
                  <p className="font-semibold opacity-70">
                    Crear, editar y eliminar cuentas de veterinarios
                  </p>
                </div>
                <Button
                  disabled={isSubmittingVet}
                  onClick={() => {
                    if (showVetForm && !editingVetId) {
                      setShowVetForm(false);
                    } else {
                      setEditingVetId(null);
                      setVetForm({
                        nombre: "",
                        email: "",
                        password: "",
                        especialidad: "",
                        telefono: "",
                        cedula: "",
                        city: "",
                        address: "",
                        clinicName: "",
                        image: "",
                      });
                      setShowVetForm(true);
                    }
                  }}
                  className="gap-2 bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {showVetForm && editingVetId
                    ? "Nuevo Veterinario"
                    : showVetForm
                      ? "Cerrar Formulario"
                      : "Nuevo Veterinario"}
                </Button>
              </div>

              {showVetForm && (
                <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                  <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                    <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Crear Cuenta de Veterinario
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <form
                      onSubmit={handleCreateVet}
                      className="space-y-6"
                    >
                      {/* Foto del Veterinario */}
                      <div className="space-y-4">
                        <Label className="font-bold">Foto de Perfil</Label>
                        <div className="flex items-center gap-6 p-4 border-[2px] border-dashed border-[#000000]/30 rounded-2xl bg-white/50">
                          <div className="h-24 w-24 rounded-2xl bg-[#93ABD9] border-[2px] border-[#000000] flex items-center justify-center overflow-hidden shadow-[3px_3px_0px_0px_#000000]">
                            {vetForm.image ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={vetForm.image}
                                  alt="Preview"
                                  fill
                                  className="object-cover"
                                  sizes="96px"
                                />
                              </div>
                            ) : (
                              <User className="h-10 w-10 text-[#000000]/30" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleVetFileUpload}
                              disabled={isUploading}
                              className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] file:bg-white file:text-[#000000] file:border-[2px] file:border-[#000000] file:rounded-lg file:px-3 file:py-1 file:mr-4 file:font-bold file:cursor-pointer file:shadow-[2px_2px_0px_0px_#000000] file:hover:bg-[#fdfaf5] transition-all"
                            />
                            <p className="text-xs text-[#000000]/60 font-bold">
                              {isUploading
                                ? "Subiendo foto... ??"
                                : "Selecciona una foto (PNG, JPG, WEBP) Máx 10MB"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Nombre Completo</Label>
                        <Input
                          placeholder="Dr. Juan Perez"
                          value={vetForm.nombre}
                          onChange={(e) =>
                            setVetForm({ ...vetForm, nombre: e.target.value })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Email Profesional</Label>
                        <Input
                          type="email"
                          placeholder="juan@miauwuauf.com"
                          value={vetForm.email}
                          onChange={(e) =>
                            setVetForm({ ...vetForm, email: e.target.value })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Contrasena Inicial</Label>
                        <div className="relative">
                          <Input
                            type={showVetPasswordAdmin ? "text" : "password"}
                            placeholder="********"
                            value={vetForm.password}
                            onChange={(e) =>
                              setVetForm({ ...vetForm, password: e.target.value })
                            }
                            required
                            className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9] pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowVetPasswordAdmin(!showVetPasswordAdmin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                          >
                            {showVetPasswordAdmin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Especialidad</Label>
                        <Input
                          placeholder="Medicina General"
                          value={vetForm.especialidad}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              especialidad: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Teléfono de contacto</Label>
                        <Input
                          placeholder="Ex: 5512345678"
                          value={vetForm.telefono}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              telefono: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Cédula</Label>
                        <Input
                          placeholder="Número de cédula"
                          value={vetForm.cedula}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              cedula: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Ciudad</Label>
                        <Input
                          placeholder="Ej: Quito"
                          value={vetForm.city}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              city: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9] h-11"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="font-bold">Nombre del Local / Clínica Veterinaria</Label>
                        <Input
                          placeholder="Ej: VetSalud, Clínica San Francisco"
                          value={vetForm.clinicName}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              clinicName: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9] h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Dirección Exacta</Label>
                        <Input
                          placeholder="Calle, Sector, Referencia"
                          value={vetForm.address}
                          onChange={(e) =>
                            setVetForm({
                              ...vetForm,
                              address: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9] h-11"
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-4 pt-6 pb-6 px-1">
                        <Button
                          type="submit"
                          disabled={isSubmittingVet || isUploading}
                          className="bg-[#93ABD9] hover:bg-[#86b1f2] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                        >
                          {isSubmittingVet ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                            </span>
                          ) : editingVetId ? (
                            "Guardar Cambios"
                          ) : (
                            "Crear Veterinario"
                          )}
                        </Button>
                        <Button
                          type="button"
                          disabled={isSubmittingVet}
                          onClick={() => setShowVetForm(false)}
                          className="bg-transparent hover:bg-black/5 text-[#000000] border-[2px] border-transparent font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Input
                  value={vetsQuery}
                  onChange={(e) => {
                    setVetsQuery(e.target.value);
                    setVetsPage(1);
                  }}
                  placeholder="Buscar por nombre, email, especialidad, cédula o estado..."
                  className="h-11 border-[2px] border-[#000000]/20 rounded-xl bg-white md:max-w-md"
                />
                <select
                  value={vetsPerPage}
                  onChange={(e) => {
                    setVetsPerPage(Number(e.target.value) as 8 | 16 | 24);
                    setVetsPage(1);
                  }}
                  className="h-11 rounded-xl border-[2px] border-[#000000]/20 bg-white px-3 text-sm font-bold text-[#000000] md:w-40"
                >
                  <option value={8}>8 por página</option>
                  <option value={16}>16 por página</option>
                  <option value={24}>24 por página</option>
                </select>
              </div>
<Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
  {/* Encabezado Verde - El protagonista absoluto */}
  <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] p-6">
    <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
      <Stethoscope className="h-5 w-5" />
      Listado de Veterinarios
    </CardTitle>
  </CardHeader>

  <CardContent className="p-0">
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
    <Table className="w-full min-w-[640px] lg:min-w-0 border-collapse">
      {/* Quitamos el fondo gris (bg-transparent) 
          y eliminamos cualquier borde negro que separe el header de la tabla.
      */}
      <TableHeader className="bg-transparent border-none">
        <TableRow className="hover:bg-transparent border-none">
          {/* py-6 da un espacio elegante para que los títulos no peguen con el verde */}
          <TableHead className="font-bold text-[#000000] py-4 px-3 md:py-6 md:px-6 h-16 opacity-70">
            Veterinario
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-4 px-3 md:py-6 md:px-6 h-16 opacity-70">
            Especialidad
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-4 px-3 md:py-6 md:px-6 h-16 opacity-70">
            Estado
          </TableHead>
          <TableHead className="text-right font-bold text-[#000000] py-4 px-3 md:py-6 md:px-6 h-16 opacity-70">
            Acciones
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {pagedVeterinarios.map((vet) => (
          <TableRow 
            key={vet.id} 
            className="border-b-[2px] border-[#000000]/10 last:border-0 hover:bg-[#93ABD9]/5 transition-colors"
          >
            <TableCell className="py-3 px-3 md:py-4 md:px-6">
              <div className="flex items-center gap-3">
                {/* Foto del Vet */}
                <div className="w-12 h-12 rounded-xl bg-[#93ABD9] border-[2px] border-[#000000] flex items-center justify-center shrink-0 overflow-hidden shadow-[2px_2px_0px_0px_#000000]">
                  {vet.image ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={vet.image}
                        alt={vet.nombre || ""}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <Stethoscope className="h-5 w-5 text-[#000000]" />
                  )}
                </div>
                <div>
                  <p className="font-bold leading-none">{vet.name || vet.nombre}</p>
                  <p className="text-xs opacity-60 mt-1">
                    ID: {vet.cedula || "No registrada"}
                  </p>
                </div>
              </div>
            </TableCell>

            <TableCell className="py-3 px-3 md:py-4 md:px-6">
              <Badge className="bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000]">
                {vet.specialty || vet.especialidad}
              </Badge>
            </TableCell>

            <TableCell className="py-3 px-3 md:py-4 md:px-6">
              <Badge
                className={`border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000] ${
                  vet.estado === "activo" 
                    ? "bg-[#93ABD9] text-[#000000]" 
                    : "bg-[#ffadad] text-[#000000]"
                }`}
              >
                {vet.estado}
              </Badge>
            </TableCell>

            <TableCell className="text-right py-3 px-3 md:py-4 md:px-6">
              <div className="flex justify-end gap-3">
                <Button
                  size="icon"
                  onClick={() => handleToggleVetStatus(vet)}
                  title={vet.estado === "activo" ? "Desactivar" : "Activar"}
                  className={`h-9 w-9 bg-white border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none ${
                    vet.estado === "activo" ? "hover:bg-[#ffadad] text-[#000000]" : "hover:bg-[#93ABD9] text-[#000000]"
                  }`}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleViewVet(vet)}
                  className="h-9 w-9 bg-white hover:bg-[#ffd6a5] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleEditVet(vet)}
                  className="h-9 w-9 bg-white hover:bg-[#bdb2ff] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleDeleteVet(String(vet.id))}
                  className="h-9 w-9 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>

    {filteredVeterinarios.length > 0 && (
      <div className="flex items-center justify-between border-t-[2px] border-[#000000]/10 px-4 py-3">
        <p className="text-xs font-bold text-[#000000]/60">
          Mostrando {pagedVeterinarios.length} de {filteredVeterinarios.length} veterinarios
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentVetPage <= 1}
            onClick={() => setVetsPage((p) => Math.max(1, p - 1))}
            className="h-8 border-[2px] border-[#000000] font-black"
          >
            Anterior
          </Button>
          <span className="text-xs font-black px-2">
            {currentVetPage}/{totalVetPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentVetPage >= totalVetPages}
            onClick={() => setVetsPage((p) => Math.min(totalVetPages, p + 1))}
            className="h-8 border-[2px] border-[#000000] font-black"
          >
            Siguiente
          </Button>
        </div>
      </div>
    )}
  </CardContent>
</Card>
            </div>
          )}

          {activeTab === "usuarios" && (
            <UsersTab
              usuarios={usuarios}

              handleDeleteUsuario={handleDeleteUsuario}
              handleViewUser={handleViewUser}
            />
          )}

          {activeTab === "eventos" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black font-heading tracking-tight">
                    Gestion de Eventos
                  </h2>
                  <p className="font-semibold opacity-70">
                    Crear y administrar eventos
                  </p>
                </div>
                <Button
                  disabled={isSubmittingEvent}
                  onClick={() => setShowEventoForm(!showEventoForm)}
                  className="gap-2 bg-[#ffc6ff] hover:bg-[#ffb0ff] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Nuevo Evento
                </Button>
              </div>

              {showEventoForm && (
                <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                  <CardHeader className="bg-white border-b-[3px] border-[#000000] p-6">
                    <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5" />
                      {editingEventId ? "Editar Evento" : "Crear Nuevo Evento"}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6">
                    <form
                      onSubmit={handleCreateEvento}
                      className="grid md:grid-cols-2 gap-4"
                    >
                      <div className="space-y-2">
                        <Label className="font-bold">Titulo del Evento</Label>
                        <Input
                          placeholder="Jornada de Vacunacion"
                          value={eventoForm.titulo}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              titulo: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Fecha</Label>
                        <Input
                          type="date"
                          value={eventoForm.fecha}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              fecha: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Lugar</Label>
                        <Input
                          placeholder="Parque Central"
                          value={eventoForm.lugar}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              lugar: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Hora / Horario</Label>
                        <Input
                          placeholder="9:00 AM - 5:00 PM"
                          value={eventoForm.hora}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              hora: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Descripción</Label>
                        <Input
                          placeholder="Detalles del evento..."
                          value={eventoForm.descripcion}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              descripcion: e.target.value,
                            })
                          }
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[#000000] font-black text-sm uppercase tracking-wider block">Tipo de Evento</Label>
                        <div className="space-y-3">
                          <Input
                            placeholder="Ej. Feria de Adopción, Vacunación, Taller..."
                            className="border-[2px] border-[#000000]/20 rounded-xl bg-white h-12 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                            value={eventoForm.tipo}
                            onChange={(e) =>
                              setEventoForm({
                                ...eventoForm,
                                tipo: e.target.value,
                              })
                            }
                          />
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: "Vacunación ", value: "Vacunación" },
                              { label: "Adopción ", value: "Adopción" },
                              { label: "Taller ", value: "Taller" },
                              { label: "Desfile ", value: "Desfile" },
                              { label: "Charla ", value: "Charla" },
                              { label: "Otro ", value: "" },
                            ].map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setEventoForm({ ...eventoForm, tipo: opt.value })}
                                className={`px-3 py-1.5 rounded-lg border-[2px] text-xs font-black transition-all ${
                                  eventoForm.tipo === opt.value
                                    ? "bg-[#93ABD9] border-[#000000] shadow-[2px_2px_0px_0px_#000000] -translate-y-0.5"
                                    : "bg-white border-[#000000]/10 hover:border-[#000000]/30"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Cupo Máximo</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="100"
                          value={eventoForm.maximo}
                          onChange={(e) =>
                            setEventoForm({
                              ...eventoForm,
                              maximo: e.target.value,
                            })
                          }
                          required
                          className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#93ABD9]"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                        <Label className="font-bold">Imagen del Evento</Label>
                        <div className="flex items-center gap-6 p-4 border-[2px] border-dashed border-[#000000]/30 rounded-2xl bg-white/50">
                          <div className="h-24 w-40 rounded-2xl bg-white border-[2px] border-[#000000] flex items-center justify-center overflow-hidden shadow-[3px_3px_0px_0px_#000000]">
                            {eventoForm.image ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={eventoForm.image}
                                  alt="Preview Evento"
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, 160px"
                                />
                              </div>
                            ) : (
                              <Calendar className="h-10 w-10 text-[#000000]/30" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                             <Input
                               type="file"
                               accept="image/*"
                               onChange={handleEventFileUpload}
                               disabled={isUploading}
                               className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] file:bg-white file:text-[#000000] file:border-[2px] file:border-[#000000] file:rounded-lg file:px-3 file:py-1 file:mr-4 file:font-bold file:cursor-pointer file:shadow-[2px_2px_0px_0px_#000000] file:hover:bg-[#fdfaf5] transition-all"
                             />
                             <p className="text-xs text-[#000000]/60 font-bold">
                               {isUploading
                                 ? "Subiendo imagen..."
                                 : "Selecciona una imagen llamativa para el evento"}
                             </p>
                           </div>
                         </div>
                       </div>
                        <div className="md:col-span-2 flex gap-4 pt-6 pb-6 px-1">
                          <Button
                            type="submit"
                            disabled={isSubmittingEvent || isUploading}
                            className="bg-[#ffc6ff] hover:bg-[#ffb0ff] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                          >
                            {isSubmittingEvent ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                              </span>
                            ) : editingEventId ? (
                              "Guardar Cambios"
                            ) : (
                              "Crear Evento"
                            )}
                          </Button>
                        <Button
                          type="button"
                          disabled={isSubmittingEvent}
                          onClick={() => {
                            setShowEventoForm(false);
                            setEditingEventId(null);
                            setEventoForm({
                              titulo: "",
                              fecha: "",
                              hora: "",
                              lugar: "",
                              descripcion: "",
                              tipo: "Vacunacion",
                              maximo: "100",
                              image: "",
                            });
                          }}
                          className="bg-transparent hover:bg-black/5 text-[#000000] border-[2px] border-transparent font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Modal de Inscritos */}
              {showAttendeesModal && selectedEventAttendees && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
                  <Card className="w-[95vw] max-w-lg sm:w-full border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden animate-scale-in p-0">
                    <CardHeader className="flex flex-row items-center justify-between bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border-[2px] border-[#000000] rounded-xl shadow-[2px_2px_0px_0px_#000000]">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="font-black font-heading text-xl leading-tight">
                            Inscritos: {selectedEventAttendees.titulo}
                          </CardTitle>
                          <CardDescription className="text-[#000000]/70 font-bold mt-0.5">
                            {selectedEventAttendees.inscritos?.length || 0}{" "}
                            personas registradas
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        onClick={() => setShowAttendeesModal(false)}
                        className="h-9 w-9 bg-white hover:bg-white/80 text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg transition-all active:translate-y-1 active:shadow-none shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </CardHeader>

                    <CardContent className="max-h-[60vh] overflow-y-auto p-0">
                      {selectedEventAttendees.inscritos &&
                      selectedEventAttendees.inscritos.length > 0 ? (
                        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
                        <Table className="min-w-[560px] md:min-w-full">
                          <TableHeader className="bg-black/5">
                            <TableRow className="border-b-[2px] border-black/10">
                              <TableHead className="font-bold text-[#000000]">
                                Nombre
                              </TableHead>
                              <TableHead className="font-bold text-[#000000]">
                                Telefono
                              </TableHead>
                              <TableHead className="font-bold text-[#000000]">
                                Email
                              </TableHead>
                              <TableHead className="font-bold text-[#000000]">
                                Fecha
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEventAttendees.inscritos.map(
                              (inscrito: EventoInscrito, idx: number) => (
                                <TableRow
                                  key={idx}
                                  className="border-b-[2px] border-black/5 last:border-0 hover:bg-black/5"
                                >
                                  <TableCell className="font-bold">
                                    {inscrito.nombre}
                                  </TableCell>
                                  <TableCell className="text-sm opacity-80">
                                    {formatEcuadorPhoneDisplay(inscrito.telefono) || inscrito.telefono || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-sm opacity-80">
                                    {inscrito.email || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDate(inscrito.fecha)}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-[#000000]/50">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p className="font-bold">
                            No hay usuarios inscritos aún.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.map((evento) => (
                  <Card
                    key={evento.id}
                    className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform p-0"
                  >
                    <CardHeader className="bg-[#ffc6ff] border-b-[3px] border-[#000000] rounded-t-[21px] flex flex-row items-center justify-between p-6">
                      <Badge className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-lg font-bold shadow-[2px_2px_0px_0px_#000000] px-3 py-1">
                        {evento.tipo}
                      </Badge>
                      <div className="flex gap-3">
                        <Button
                          size="icon"
                          onClick={() => handleEditEvento(evento)}
                          className="h-11 w-11 bg-white hover:bg-[#bdb2ff] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() =>
                            handleDeleteEvento(String(evento.id))
                          }
                          className="h-11 w-11 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <h3 className="text-xl font-black mb-3 font-heading line-clamp-1">
                        {evento.titulo}
                      </h3>

                      {evento.image && (
                        <div className="mb-4 rounded-xl overflow-hidden border-[2px] border-[#000000] h-32 w-full shadow-sm relative">
                          <Image
                            src={evento.image}
                            alt={evento.titulo}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-3 text-sm font-semibold opacity-80 mb-6 bg-black/5 p-4 rounded-xl border-[2px] border-black/10">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#93ABD9]" />
                          {formatDate(evento.fecha)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-[#93ABD9]" />
                          {evento.lugar}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#93ABD9]" />
                          {evento.inscritos?.length || 0} /{" "}
                          {evento.maximo || 100} inscritos
                        </p>
                      </div>

                      <Button
                        className="w-full gap-2 bg-[#ffd6a5] hover:bg-[#ffc278] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                        onClick={() => {
                          setSelectedEventAttendees(evento);
                          setShowAttendeesModal(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                        Ver Inscritos ({evento.inscritos?.length || 0})
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "adopciones" && (
            <div className="space-y-6 animate-fade-in">
              {/* Sub-tabs */}
              <div className="flex gap-3 border-b-[3px] border-[#000000] pb-4">
                <button
                  onClick={() => setAdopcionSubTab("mascotas")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all border-[3px] ${
                    adopcionSubTab === "mascotas"
                      ? "bg-[#93ABD9] text-[#000000] border-[#000000] shadow-[4px_4px_0px_0px_#000000] -translate-y-1"
                      : "bg-[#2d2a4a] text-white border-transparent hover:bg-[#2d2a4a]/80"
                  }`}
                >
                  <PawPrint className="h-5 w-5" />
                  Mascotas ({perrosAdopcion.length})
                </button>
                <button
                  onClick={() => setAdopcionSubTab("solicitudes")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all border-[3px] ${
                    adopcionSubTab === "solicitudes"
                      ? "bg-[#93ABD9] text-[#000000] border-[#000000] shadow-[4px_4px_0px_0px_#000000] -translate-y-1"
                      : "bg-[#2d2a4a] text-white border-transparent hover:bg-[#2d2a4a]/80"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  Solicitudes ({solicitudesAdopcion.length})
                  {pendientes > 0 && (
                    <Badge
                      className={`ml-2 border-[2px] border-[#000000] ${adopcionSubTab === "solicitudes" ? "bg-white text-[#000000]" : "bg-[#93ABD9] text-[#000000]"}`}
                    >
                      {pendientes}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Sub-tab: Mascotas */}
              {adopcionSubTab === "mascotas" && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button
                      disabled={isSubmittingPerro}
                      onClick={() => setShowPerroForm(!showPerroForm)}
                      className="gap-2 bg-[#ffd6a5] hover:bg-[#ffc278] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Mascota
                    </Button>
                  </div>

                  {/* Formulario crear mascota */}
                  {showPerroForm && (
                    <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                      <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                            <PawPrint className="h-6 w-6 text-[#000000]" />
                          </div>
                          <div>
                            <CardTitle className="font-black font-heading text-xl">
                              {editingPerroId
                                ? "Editar Mascota"
                                : "Registrar Nueva Mascota"}
                            </CardTitle>
                            <CardDescription className="text-[#000000]/70 font-bold">
                              {editingPerroId
                                ? "Actualiza los datos de la mascota"
                                : "Esta mascota aparecerá en el Centro de Acogida"}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <form
                          onSubmit={handleCreatePerro}
                          className="space-y-6"
                        >
                          {/* Foto de la mascota */}
                          <div className="space-y-4">
                            <Label className="font-bold">
                              Imagen de la Mascota
                            </Label>
                            <div className="flex items-center gap-6 p-4 border-[2px] border-dashed border-[#000000]/30 rounded-2xl bg-white/50">
                              <div className="h-24 w-24 rounded-2xl bg-[#ffd6a5] border-[2px] border-[#000000] flex items-center justify-center overflow-hidden shadow-[3px_3px_0px_0px_#000000]">
                                {perroForm.foto ? (
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={perroForm.foto}
                                      alt="Preview"
                                      fill
                                      className="object-cover"
                                      sizes="96px"
                                    />
                                  </div>
                                ) : (
                                  <PawPrint className="h-10 w-10 text-[#000000]/30" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileUpload}
                                  disabled={isUploading}
                                  className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] file:bg-white file:text-[#000000] file:border-[2px] file:border-[#000000] file:rounded-lg file:px-3 file:py-1 file:mr-4 file:font-bold file:cursor-pointer file:shadow-[2px_2px_0px_0px_#000000] file:hover:bg-[#fdfaf5] transition-all"
                                />
                                <p className="text-xs text-[#000000]/60 font-bold">
                                  {isUploading
                                    ? "Subiendo foto... "
                                    : "Selecciona una foto clara del perrito (PNG, JPG)"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Datos basicos */}
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold">Nombre</Label>
                              <Input
                                placeholder="Max"
                                value={perroForm.nombre}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    nombre: e.target.value,
                                  })
                                }
                                required
                                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold">Raza</Label>
                              <Input
                                placeholder="Golden Retriever"
                                value={perroForm.raza}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    raza: e.target.value,
                                  })
                                }
                                required
                                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold">Color</Label>
                              <Input
                                placeholder="Dorado"
                                value={perroForm.color}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    color: e.target.value,
                                  })
                                }
                                required
                                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                              />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold">Edad</Label>
                              <Input
                                placeholder="2 años"
                                value={perroForm.edad}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    edad: e.target.value,
                                  })
                                }
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && !v.toLowerCase().includes('año') && !v.toLowerCase().includes('mes')) {
                                    setPerroForm({
                                      ...perroForm,
                                      edad: `${v} años`,
                                    });
                                  }
                                }}
                                required
                                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold">Peso</Label>
                              <Input
                                placeholder="12 kg"
                                value={perroForm.peso}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    peso: e.target.value,
                                  })
                                }
                                required
                                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold">Sexo</Label>
                              <select
                                className="w-full p-2.5 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] outline-none"
                                value={perroForm.sexo}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    sexo: e.target.value,
                                  })
                                }
                              >
                                <option value="Macho">Macho</option>
                                <option value="Hembra">Hembra</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold">Vacunado</Label>
                              <select
                                className="w-full p-2.5 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] outline-none"
                                value={perroForm.vacunado ? "si" : "no"}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    vacunado: e.target.value === "si",
                                  })
                                }
                              >
                                <option value="si">Si</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold">Esterilizado</Label>
                              <select
                                className="w-full p-2.5 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] outline-none"
                                value={perroForm.esterilizado ? "si" : "no"}
                                onChange={(e) =>
                                  setPerroForm({
                                    ...perroForm,
                                    esterilizado: e.target.value === "si",
                                  })
                                }
                              >
                                <option value="si">Si</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold">Descripcion</Label>
                            <textarea
                              className="w-full p-3 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] focus:border-[#93ABD9] outline-none min-h-[80px] resize-none"
                              placeholder="Describe la personalidad y comportamiento..."
                              value={perroForm.descripcion}
                              onChange={(e) =>
                                setPerroForm({
                                  ...perroForm,
                                  descripcion: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold">
                              Hogar Recomendado
                            </Label>
                            <Input
                              placeholder="Casa con patio, familia con ninos..."
                              value={perroForm.hogarRecomendado}
                              onChange={(e) =>
                                setPerroForm({
                                  ...perroForm,
                                  hogarRecomendado: e.target.value,
                                })
                              }
                              required
                              className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                            />
                          </div>
                          <div className="flex gap-4 pt-6 pb-6 px-1">
                            <Button
                              type="submit"
                              disabled={isUploading || isSubmittingPerro}
                              className="gap-2 bg-[#ffd6a5] hover:bg-[#ffc278] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                            >
                              {isSubmittingPerro ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              {isSubmittingPerro
                                ? "Guardando…"
                                : editingPerroId
                                  ? "Guardar Cambios"
                                  : "Registrar Mascota"}
                            </Button>
                            <Button
                              type="button"
                              disabled={isSubmittingPerro}
                              onClick={() => {
                                setShowPerroForm(false);
                                setEditingPerroId(null);
                                setPerroForm({
                                  nombre: "",
                                  raza: "",
                                  edad: "",
                                  peso: "",
                                  sexo: "Macho",
                                  color: "",
                                  vacunado: true,
                                  esterilizado: false,
                                  descripcion: "",
                                  hogarRecomendado: "",
                                  foto: "",
                                });
                              }}
                              className="bg-transparent hover:bg-black/5 text-[#000000] border-[2px] border-transparent font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Grid de mascotas */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {perrosAdopcion.map((perro) => (
                      <Card
                        key={perro.id}
                        className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform group p-0"
                      >
                        <div className="aspect-video relative border-b-[3px] border-[#000000] overflow-hidden">
                          <Image
                            src={perro.foto || "/placeholder.svg"}
                            alt={perro.nombre}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 z-10">
                            <Badge
                              className={`border-[2px] border-[#000000] font-black text-xs shadow-[2px_2px_0px_0px_#000000] px-3 py-1 ${
                                perro.estado === "disponible"
                                  ? "bg-[#93ABD9] text-[#000000]"
                                  : perro.estado === "en_proceso"
                                    ? "bg-[#ffd6a5] text-[#000000]"
                                    : "bg-[#93ABD9] text-[#000000]"
                              }`}
                            >
                              {perro.estado === "disponible"
                                ? "Disponible"
                                : perro.estado === "en_proceso"
                                  ? "En proceso"
                                  : "Adoptado"}
                            </Badge>


                          </div>
                        </div>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-black font-heading text-2xl">
                              {perro.nombre}
                            </h3>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditPerro(perro)}
                                className="h-9 w-9 border-[2px] border-[#000000] bg-white hover:bg-[#93ABD9] transition-colors rounded-lg shadow-[2px_2px_0px_0px_#000000] active:translate-y-0.5 active:shadow-none"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <div className="bg-[#ffd6a5] p-2 rounded-lg border-[2px] border-[#000000]">
                                <PawPrint className="h-5 w-5 text-[#000000]" />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-bold opacity-70 mb-3">
                            {perro.raza} - {perro.edad}
                          </p>

                          <div className="flex items-center gap-2 mb-4 text-xs font-semibold bg-black/5 p-2 rounded-xl border-[2px] border-black/10 text-center justify-center">
                            <span>{perro.sexo}</span>
                            <span className="opacity-50">|</span>
                            <span>{perro.peso}</span>
                            <span className="opacity-50">|</span>
                            <span>{perro.color}</span>
                          </div>

                          <div className="flex items-center gap-2 mb-5">
                            {perro.vacunado && (
                              <Badge className="text-xs bg-white text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                <Syringe className="h-3 w-3 mr-1 text-[#93ABD9]" />
                                Vacunado
                              </Badge>
                            )}
                            {perro.esterilizado && (
                              <Badge className="text-xs bg-white text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                <CheckCircle className="h-3 w-3 mr-1 text-[#93ABD9]" />
                                Esterilizado
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              className="w-full gap-2 bg-[#ffadad] hover:bg-[#ff8f8f] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                              onClick={() =>
                                handleDeletePerro(String(perro.id))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar Registro
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab: Solicitudes */}
              {/* Sub-tab: Solicitudes */}
              {adopcionSubTab === "solicitudes" && (
                <div className="space-y-6">
                  {solicitudesAdopcion.length === 0 ? (
                    <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden mt-6 p-0">
                      <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
                        <CardTitle className="font-black font-heading flex items-center gap-2">
                          <ClipboardList className="h-5 w-5" />
                          Solicitudes de Adopción
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-12 text-center">
                        <Heart className="h-12 w-12 mx-auto text-[#000000]/30 mb-4" />
                        <h3 className="text-xl font-black font-heading text-[#000000]/70">
                          No hay solicitudes aun
                        </h3>
                        <p className="text-sm font-bold opacity-70 mt-1">
                          Las solicitudes de adopcion apareceran aqui.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Modal Observacion Adopcion */}
                      {observacionModal && observacionModal.isOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                          <Card className="w-full max-w-md border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden animate-scale-in p-0 gap-0">
                            <CardHeader
                              className={`${observacionModal.estado === "aprobada" ? "bg-[#93ABD9]" : observacionModal.estado === "rechazada" ? "bg-[#ffadad]" : "bg-[#93ABD9]"} border-b-[3px] border-[#000000] pt-6 pb-6 px-6`}
                            >
                              <CardTitle className="font-black font-heading text-xl">
                                {observacionModal.estado === "aprobada"
                                  ? "Aprobar Adopcion"
                                  : observacionModal.estado === "rechazada"
                                    ? "Rechazar Adopcion"
                                    : "Agendar Entrevista"}
                              </CardTitle>
                              <CardDescription className="text-[#000000]/80 font-bold">
                                Añade una observacion o motivo (opcional). El
                                adoptante verá este mensaje.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                              <textarea
                                className="w-full p-4 rounded-xl border-[2px] border-foreground/30 bg-white shadow-inner focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[120px] resize-none font-medium"
                                placeholder="Escribe aqui las indicaciones para la entrevista, motivos del rechazo, o instrucciones de entrega..."
                                value={observacionTexto}
                                onChange={(e) =>
                                  setObservacionTexto(e.target.value)
                                }
                              />
                              <div className="flex gap-3 justify-end mt-6">
                                <Button
                                  disabled={solicitudUpdateLoading}
                                  className="bg-transparent hover:bg-black/5 text-[#000000] border-[2px] border-transparent font-bold rounded-xl transition-all disabled:opacity-50"
                                  onClick={() => {
                                    setObservacionModal(null);
                                    setObservacionTexto("");
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  disabled={solicitudUpdateLoading}
                                  className="bg-[#000000] hover:bg-[#1a1c29] text-white border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                                  onClick={() =>
                                    handleUpdateSolicitud(
                                      observacionModal.id,
                                      observacionModal.estado,
                                      observacionTexto,
                                    )
                                  }
                                >
                                  {solicitudUpdateLoading ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                                    </span>
                                  ) : (
                                    "Confirmar y Enviar Correo"
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      {/* Detalle de solicitud */}
                      {solicitudDetalle && (
                        <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden mb-6 animate-scale-in p-0 gap-0">
                          <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] pt-6 pb-6 px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-[2px] border-[#000000]">
                                  <Image
                                    src={
                                      solicitudDetalle.shelterPet?.foto ||
                                      "/placeholder.svg"
                                    }
                                    alt={solicitudDetalle.perroNombre}
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <CardTitle className="font-black font-heading text-xl">
                                    Solicitud para{" "}
                                    {solicitudDetalle.perroNombre}
                                  </CardTitle>
                                  <CardDescription className="text-[#000000]/80 font-bold">
                                    Enviada el {formatDate(solicitudDetalle.createdAt || (solicitudDetalle.fecha + (solicitudDetalle.fecha.includes("T") ? "" : "T12:00:00")))}
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                onClick={() => setSolicitudDetalle(null)}
                                className="h-8 w-8 bg-white hover:bg-white/80 text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg transition-all active:translate-y-1 active:shadow-none"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6 p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-3 bg-white p-4 rounded-2xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                <h4 className="font-black font-heading flex items-center gap-2 text-lg">
                                  <User className="h-5 w-5 text-[#93ABD9]" />{" "}
                                  Datos del Solicitante
                                </h4>
                                <div className="space-y-2 text-sm font-semibold opacity-80">
                                  <p>
                                    <strong>Nombre:</strong>{" "}
                                    {solicitudDetalle.nombreCompleto}
                                  </p>
                                  <p>
                                    <strong>Cedula:</strong>{" "}
                                    {solicitudDetalle.cedula}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />{" "}
                                    {solicitudDetalle.email}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />{" "}
                                    {formatEcuadorPhoneDisplay(solicitudDetalle.telefono) || solicitudDetalle.telefono}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <Home className="h-3 w-3" />{" "}
                                    {solicitudDetalle.direccion}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3 bg-white p-4 rounded-2xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                <h4 className="font-black font-heading flex items-center gap-2 text-lg">
                                  <Home className="h-5 w-5 text-[#93ABD9]" />{" "}
                                  Informacion del Hogar
                                </h4>
                                <div className="space-y-2 text-sm font-semibold opacity-80">
                                  <p>
                                    <strong>Vivienda:</strong>{" "}
                                    {solicitudDetalle.tipoVivienda}
                                  </p>
                                  <p>
                                    <strong>Patio:</strong>{" "}
                                    {solicitudDetalle.tienePatio}
                                  </p>
                                  <p>
                                    <strong>Propiedad:</strong>{" "}
                                    {solicitudDetalle.viviendaPropia}
                                  </p>
                                  <p>
                                    <strong>Personas:</strong>{" "}
                                    {solicitudDetalle.personasHogar}
                                  </p>
                                  <p>
                                    <strong>Ninos:</strong>{" "}
                                    {solicitudDetalle.hayNinos}
                                  </p>
                                  <p>
                                    <strong>Otras mascotas:</strong>{" "}
                                    {solicitudDetalle.otrasMascotas}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-black font-heading flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-[#93ABD9]" />{" "}
                                Motivacion
                              </h4>
                              <p className="text-sm font-semibold bg-black/5 p-4 rounded-xl border-[2px] border-black/10">
                                {solicitudDetalle.motivoAdopcion}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm font-semibold pt-2">
                                <p className="bg-white px-3 py-1.5 rounded-lg border-[2px] border-[#000000] shadow-[1px_1px_0px_0px_#000000]">
                                  <strong>Experiencia previa:</strong>{" "}
                                  {solicitudDetalle.experienciaMascotas}
                                </p>
                                <p className="bg-white px-3 py-1.5 rounded-lg border-[2px] border-[#000000] shadow-[1px_1px_0px_0px_#000000]">
                                  <strong>Cubrir gastos vet:</strong>{" "}
                                  {solicitudDetalle.cubrirGastos}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-4 pt-6 pb-6 px-1 border-t-[3px] border-[#000000]">
                              {solicitudDetalle.estado === "pendiente" && (
                                <>
                                  <Button
                                    className="flex-1 gap-2 bg-[#93ABD9] hover:bg-[#86b1f2] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                                    onClick={() =>
                                      setObservacionModal({
                                        isOpen: true,
                                        id: String(solicitudDetalle.id),
                                        estado: "entrevista",
                                      })
                                    }
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    Agendar Entrevista
                                  </Button>
                                  <Button
                                    className="flex-1 gap-2 bg-[#ffadad] hover:bg-[#ff8f8f] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                                    onClick={() =>
                                      setObservacionModal({
                                        isOpen: true,
                                        id: String(solicitudDetalle.id),
                                        estado: "rechazada",
                                      })
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {solicitudDetalle.estado === "entrevista" && (
                                <>
                                  <Button
                                    className="flex-1 gap-2 bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                                    onClick={() =>
                                      setObservacionModal({
                                        isOpen: true,
                                        id: String(solicitudDetalle.id),
                                        estado: "aprobada",
                                      })
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Aprobar Adopcion
                                  </Button>
                                  <Button
                                    className="flex-1 gap-2 bg-[#ffadad] hover:bg-[#ff8f8f] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none"
                                    onClick={() =>
                                      setObservacionModal({
                                        isOpen: true,
                                        id: String(solicitudDetalle.id),
                                        estado: "rechazada",
                                      })
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {solicitudDetalle.estado === "aprobada" && (
                                <div className="w-full flex items-center justify-between p-4 bg-[#93ABD9] rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                  <div className="flex items-center gap-4">
                                    <CheckCircle className="h-8 w-8 text-[#000000]" />
                                    <div className="text-left">
                                      <p className="font-black font-heading text-lg">Adopcion Aprobada</p>
                                      <p className="text-sm font-bold opacity-80">Lista para entrega.</p>
                                    </div>
                                  </div>
                                  <Button
                                     disabled={solicitudUpdateLoading}
                                     onClick={() => handleUpdateSolicitud(String(solicitudDetalle.id), "entregada", "La mascota ha sido entregada exitosamente.")}
                                     className="bg-[#9bf6ff] hover:bg-[#80ebf5] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none px-6 disabled:opacity-50"
                                  >
                                     {solicitudUpdateLoading ? (
                                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                     ) : (
                                       <PawPrint className="h-4 w-4 mr-2" />
                                     )}
                                     {solicitudUpdateLoading ? "Guardando…" : "Marcar como Entregado"}
                                  </Button>
                                </div>
                              )}
                              {solicitudDetalle.estado === "entregada" && (
                                <div className="w-full p-4 bg-[#9bf6ff] rounded-xl text-center border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                  <CheckCircle className="h-8 w-8 text-[#000000] mx-auto mb-2" />
                                  <p className="font-black font-heading text-lg">
                                    Mascota Entregada
                                  </p>
                                  <p className="text-sm font-bold opacity-80">
                                    Fin del proceso de adopcion.
                                  </p>
                                </div>
                              )}
                              {solicitudDetalle.estado === "rechazada" && (
                                <div className="w-full p-4 bg-[#ffadad] rounded-xl text-center border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                  <X className="h-8 w-8 text-[#000000] mx-auto mb-2" />
                                  <p className="font-black font-heading text-lg">
                                    Solicitud Rechazada
                                  </p>
                                </div>
                              )}
                            </div>
                            {solicitudDetalle.observacion && (
                              <div className="mt-4 p-4 rounded-xl border-[2px] border-[#000000] bg-white">
                                <h4 className="font-bold flex items-center gap-2 mb-2 text-[#000000]">
                                  <MessageSquare className="h-4 w-4" />
                                  Tu Observacion Escrita:
                                </h4>
                                <p className="text-sm font-medium text-muted-foreground whitespace-pre-wrap">
                                  {solicitudDetalle.observacion}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Tabla de solicitudes */}
                      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden mt-6 p-0">
                        <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[21px] p-4 md:p-6">
                          <CardTitle className="font-black font-heading flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Listado de Solicitudes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
                          <Table className="min-w-[720px] md:min-w-full">
                            <TableHeader className="bg-black/5">
                              <TableRow className="border-b-[2px] border-black/10">
                                <TableHead className="font-bold text-[#000000]">
                                  Solicitante
                                </TableHead>
                                <TableHead className="font-bold text-[#000000]">
                                  Perro
                                </TableHead>
                                <TableHead className="font-bold text-[#000000]">
                                  Fecha
                                </TableHead>
                                <TableHead className="font-bold text-[#000000]">
                                  Estado
                                </TableHead>
                                <TableHead className="text-right font-bold text-[#000000]">
                                  Acciones
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pagedSolicitudesAdopcion.map((sol) => {
                                const estadoConfig = {
                                  pendiente: {
                                    label: "Pendiente",
                                    color: "bg-[#ffd6a5] text-[#000000]",
                                  },
                                  entrevista: {
                                    label: "Entrevista",
                                    color: "bg-[#93ABD9] text-[#000000]",
                                  },
                                  aprobada: {
                                    label: "Aprobada",
                                    color: "bg-[#93ABD9] text-[#000000]",
                                  },
                                  rechazada: {
                                    label: "Rechazada",
                                    color: "bg-[#ffadad] text-[#000000]",
                                  },
                                  entregada: {
                                    label: "Entregada",
                                    color: "bg-[#9bf6ff] text-[#000000]",
                                  },
                                };
                                const config = estadoConfig[sol.estado];
                                return (
                                  <TableRow
                                    key={sol.id}
                                    className="border-b-[2px] border-black/5 last:border-0 hover:bg-black/5"
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#93ABD9] border-[2px] border-[#000000] flex items-center justify-center shrink-0">
                                          <User className="h-5 w-5 text-[#000000]" />
                                        </div>
                                        <div>
                                          <p className="font-bold">
                                            {sol.nombreCompleto}
                                          </p>
                                          <p className="text-sm opacity-70">
                                            {sol.email}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2 font-semibold">
                                        <PawPrint className="h-4 w-4 text-[#93ABD9]" />
                                        <span className="font-bold">
                                          {sol.perroNombre}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold opacity-70">
                                      {formatDate(sol.createdAt || (sol.fecha + (sol.fecha.includes("T") ? "" : "T12:00:00")))}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={`border-[2px] border-[#000000] rounded-lg ${config.color}`}
                                      >
                                        {config.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        onClick={() => setSolicitudDetalle(sol)}
                                        className="h-8 bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg font-bold transition-all active:translate-y-1 active:shadow-none"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Ver detalle
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          </div>
                          {solicitudesAdopcion.length > 0 && (
                            <div className="flex items-center justify-between border-t-[2px] border-black/10 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <p className="text-xs font-bold text-[#000000]/60">
                                  Mostrando {pagedSolicitudesAdopcion.length} de {solicitudesAdopcion.length} solicitudes
                                </p>
                                <select
                                  value={solicitudesPerPage}
                                  onChange={(e) => {
                                    setSolicitudesPerPage(Number(e.target.value) as 10 | 20 | 50);
                                    setSolicitudesPage(1);
                                  }}
                                  className="h-8 rounded-lg border-[2px] border-[#000000]/20 bg-white px-2 text-xs font-black text-[#000000]"
                                >
                                  <option value={10}>10/página</option>
                                  <option value={20}>20/página</option>
                                  <option value={50}>50/página</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={currentSolicitudesPage <= 1}
                                  onClick={() =>
                                    setSolicitudesPage((p) => Math.max(1, p - 1))
                                  }
                                  className="h-8 border-[2px] border-[#000000] font-black"
                                >
                                  Anterior
                                </Button>
                                <span className="text-xs font-black px-2">
                                  {currentSolicitudesPage}/{totalSolicitudesPages}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={currentSolicitudesPage >= totalSolicitudesPages}
                                  onClick={() =>
                                    setSolicitudesPage((p) =>
                                      Math.min(totalSolicitudesPages, p + 1)
                                    )
                                  }
                                  className="h-8 border-[2px] border-[#000000] font-black"
                                >
                                  Siguiente
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "blogueros" && (
            <BloggersTab
              blogueros={blogueros}
              showBlogueroForm={showBlogueroForm}
              setShowBlogueroForm={setShowBlogueroForm}
              blogueroForm={blogueroForm}
              setBlogueroForm={setBlogueroForm}
              handleCreateBloguero={handleCreateBloguero}
              handleDeleteBloguero={handleDeleteBloguero}
              showBloggerPasswordAdmin={showBloggerPasswordAdmin}
              setShowBloggerPasswordAdmin={setShowBloggerPasswordAdmin}
              handleViewBloguero={handleViewBloguero}
              handleEditBlogger={handleEditBlogger}
              showBlogueroViewModal={showBlogueroViewModal}
              setShowBlogueroViewModal={setShowBlogueroViewModal}
              showBlogueroEditModal={showBlogueroEditModal}
              setShowBlogueroEditModal={setShowBlogueroEditModal}
              selectedBloguero={selectedBloguero}
              handleUpdateBloguero={handleUpdateBloguero}
              isSubmittingBlogger={isSubmittingBlogger}
            />
          )}

          {activeTab === "planes" && (
            <PlanesTab
              planes={planes}
              showPlanForm={showPlanForm}
              setShowPlanForm={setShowPlanForm}
              editingPlanId={editingPlanId}
              setEditingPlanId={setEditingPlanId}
              planForm={planForm}
              setPlanForm={setPlanForm}
              featureInput={featureInput}
              setFeatureInput={setFeatureInput}
              handleCreatePlan={handleCreatePlan}
              isSubmittingPlan={isSubmittingPlan}
              handleEditPlan={handleEditPlan}
              handleDeletePlan={handleDeletePlan}
              addFeature={addFeature}
              removeFeature={removeFeature}
              sectionContent={sectionContent}
              setSectionContent={setSectionContent}
              handleSaveSectionContent={handleSaveSectionContent}
              allPlanSections={allPlanSections}
              handleCreateNewSection={handleCreateNewSection}
              handleDeleteSection={handleDeleteSection}
              setModalConfirmacion={setModalConfirmacion}
              isSubmittingPlanSection={isSubmittingPlanSection}
              planWhatsappPhone={planWhatsappPhone}
              setPlanWhatsappPhone={setPlanWhatsappPhone}
              handleSavePlanWhatsappContact={handleSavePlanWhatsappContact}
              isSubmittingPlanWhatsapp={isSubmittingPlanWhatsapp}
              planWhatsappDetailsText={planWhatsappDetailsText}
              setPlanWhatsappDetailsText={setPlanWhatsappDetailsText}
            />
          )}

          {activeTab === "beneficios" && (
            <BeneficiosTab
              benefitsSectionContent={benefitsSectionContent}
              setBenefitsSectionContent={setBenefitsSectionContent}
              handleSaveBenefitsSectionContent={handleSaveBenefitsSectionContent}
              isSubmittingBenefitsHeader={isSubmittingBenefitsHeader}
              techFeatures={techFeatures}
              showTechFeatureForm={showTechFeatureForm}
              setShowTechFeatureForm={setShowTechFeatureForm}
              editingTechFeatureId={editingTechFeatureId}
              setEditingTechFeatureId={setEditingTechFeatureId}
              techFeatureForm={techFeatureForm}
              setTechFeatureForm={setTechFeatureForm}
              handleCreateTechFeature={handleCreateTechFeature}
              handleEditTechFeature={handleEditTechFeature}
              handleDeleteTechFeature={handleDeleteTechFeature}
              handleFileUpload={handleTechFeatureFileUpload}
              isSubmittingTechFeature={isSubmittingTechFeature}
              isUploading={isUploading}
            />
          )}

          {activeTab === "tienda" && tiendaSubTab === "productos" && (
            <ProductsTab
              productos={productos}
              categories={categories}
              subcategories={subcategories}
              showProductoForm={showProductoForm}
              setShowProductoForm={setShowProductoForm}
              productoForm={productoForm}
              setProductoForm={setProductoForm}
              handleCreateProducto={handleCreateProducto}
              isSubmittingProduct={isSubmittingProduct}
              handleDeleteProducto={handleDeleteProducto}
              handleEditProducto={handleEditProducto}
              editingProductoId={editingProductoId}
              setEditingProductoId={setEditingProductoId}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          )}

          {activeTab === "tienda" && tiendaSubTab === "categorias" && (
            <CategoriesTab
              categories={categories}
              subcategories={subcategories}
              showCategoryForm={showCategoryForm}
              setShowCategoryForm={setShowCategoryForm}
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              handleCreateCategory={handleCreateCategory}
              handleDeleteCategory={handleDeleteCategory}
              showSubcategoryForm={showSubcategoryForm}
              setShowSubcategoryForm={setShowSubcategoryForm}
              subcategoryForm={subcategoryForm}
              setSubcategoryForm={setSubcategoryForm}
              handleCreateSubcategory={handleCreateSubcategory}
              handleDeleteSubcategory={handleDeleteSubcategory}
              isSubmittingCategory={isSubmittingCategory}
              isSubmittingSubcategory={isSubmittingSubcategory}
            />
          )}
          {activeTab === "tienda" && tiendaSubTab === "impuestos" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading font-black text-3xl text-[#000000]">IVA y Configuración</h2>
                <p className="text-[#000000]/60 font-bold text-sm mt-1">
                  Ajusta impuestos y recargos globales para toda la tienda.
                </p>
              </div>

              <Card className="border-[4px] border-[#000000] shadow-[6px_6px_0px_0px_#000000] bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-[#000000]">
                    Configuración Global de Impuestos
                  </CardTitle>
                  <CardDescription className="text-[#000000]/70 font-bold">
                    Estos valores impactan checkout, pedidos y resúmenes de compra.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveStoreIva} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="store-tax-name" className="font-black text-xs uppercase tracking-wider">
                          Nombre del Impuesto
                        </Label>
                        <Input
                          id="store-tax-name"
                          value={storeTaxForm.taxName}
                          onChange={(e) =>
                            setStoreTaxForm((prev) => ({ ...prev, taxName: e.target.value }))
                          }
                          className="h-11 border-[3px] border-[#000000] font-black text-base"
                          placeholder="IVA"
                        />
                        {storeTaxNameError && (
                          <p className="text-[11px] font-black text-red-600">{storeTaxNameError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="store-iva-rate" className="font-black text-xs uppercase tracking-wider">
                          Porcentaje del Impuesto (%)
                        </Label>
                        <Input
                          id="store-iva-rate"
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={storeTaxForm.ivaRate}
                          onChange={(e) =>
                            setStoreTaxForm((prev) => ({
                              ...prev,
                              ivaRate: e.target.value,
                            }))
                          }
                          className="h-11 border-[3px] border-[#000000] font-black text-lg"
                        />
                        {storeIvaRateError && (
                          <p className="text-[11px] font-black text-red-600">{storeIvaRateError}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border-[3px] border-[#000000] bg-[#EDE986]/30 p-3">
                        <input
                          type="checkbox"
                          checked={storeTaxForm.taxEnabled}
                          onChange={(e) =>
                            setStoreTaxForm((prev) => ({ ...prev, taxEnabled: e.target.checked }))
                          }
                          className="h-4 w-4 accent-[#000000]"
                        />
                        <span className="text-xs font-black uppercase tracking-wide">
                          Activar impuesto principal
                        </span>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border-[3px] border-[#000000] bg-[#93ABD9]/20 p-3">
                        <input
                          type="checkbox"
                          checked={storeTaxForm.surchargeEnabled}
                          onChange={(e) =>
                            setStoreTaxForm((prev) => ({ ...prev, surchargeEnabled: e.target.checked }))
                          }
                          className="h-4 w-4 accent-[#000000]"
                        />
                        <span className="text-xs font-black uppercase tracking-wide">
                          Activar recargo adicional
                        </span>
                      </label>
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="store-surcharge-rate" className="font-black text-xs uppercase tracking-wider">
                        Recargo adicional (%)
                      </Label>
                      <Input
                        id="store-surcharge-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={storeTaxForm.surchargeRate}
                        onChange={(e) =>
                          setStoreTaxForm((prev) => ({ ...prev, surchargeRate: e.target.value }))
                        }
                        className="h-11 border-[3px] border-[#000000] font-black text-lg"
                        disabled={!storeTaxForm.surchargeEnabled}
                      />
                      {storeTaxForm.surchargeEnabled && storeSurchargeRateError && (
                        <p className="text-[11px] font-black text-red-600">{storeSurchargeRateError}</p>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#000000]/50">
                      Activo: {buildIvaLabel(storeTaxSettings.taxEnabled ? storeTaxSettings.ivaRate : 0, storeTaxSettings.taxName)}
                      {storeTaxSettings.surchargeEnabled
                        ? ` + Recargo (${formatIvaPercent(storeTaxSettings.surchargeRate)}%)`
                        : ""}
                    </p>
                    <p className="text-[11px] font-black text-[#000000]/45">
                      Última modificación:{" "}
                      {storeTaxSettings.updatedAt
                        ? `${formatDateTime(storeTaxSettings.updatedAt)}${
                            storeTaxSettings.updatedByName ? ` por ${storeTaxSettings.updatedByName}` : ""
                          }`
                        : "Sin registro"}
                    </p>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border-[2px] px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        storeTaxFormHasErrors
                          ? "border-red-600 bg-red-100 text-red-700"
                          : "border-emerald-700 bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {storeTaxFormHasErrors
                        ? "Hay errores en el formulario"
                        : "Configuración válida"}
                    </div>
                    <Button
                      type="submit"
                      disabled={isSavingStoreIva || storeTaxFormHasErrors}
                      className="bg-[#93ABD9] hover:bg-[#7f99c9] text-[#000000] border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black"
                    >
                      {isSavingStoreIva ? "Guardando..." : "Guardar Configuración"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === "tienda" && tiendaSubTab === "pedidos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-black text-3xl text-[#000000]">Gestionar Pedidos</h2>
                  <p className="text-[#000000]/60 font-bold text-sm mt-1">{filteredOrders.length} pedidos registrados</p>
                </div>
                {pendingOrdersCount > 0 && (
                  <div className="bg-red-100 border-[3px] border-red-500 px-4 py-2 rounded-xl shadow-[3px_3px_0px_0px_#000000] font-black text-red-600 text-sm">
                    {pendingOrdersCount} pendiente{pendingOrdersCount > 1 ? 's' : ''} de validar
                  </div>
                )}
              </div>

              <div className="max-w-md">
                <Input
                  value={ordersSearch}
                  onChange={(e) => {
                    setOrdersSearch(e.target.value);
                    setOrdersPage(1);
                  }}
                  placeholder="Buscar por cliente, email, ID, ORD-001, estado o método..."
                  className="h-11 border-[2px] border-[#000000]/20 rounded-xl bg-white"
                />
              </div>

              <div className="border-[4px] border-[#000000] rounded-2xl overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain shadow-[6px_6px_0px_0px_#000000]">
                <table className="w-full min-w-[720px] lg:min-w-full">
                  <thead>
                    <tr className="bg-[#000000] text-white">
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">ID</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Cliente</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Total</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Método</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Estado</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Fecha</th>
                      <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-widest">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((order, index) => (
                      <tr key={order.id} className={`border-t-[3px] border-[#000000] ${ index % 2 === 0 ? 'bg-white' : 'bg-[#EDE986]' }`}>
                        <td className="px-4 py-3 font-black text-xs text-[#000000]/60">
                          {order.orderCode ?? formatPrefixedSequence("ORD", order.displayId, order.id)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-sm text-[#000000]">{order.nombre || order.user?.name || "N/A"}</p>
                          <p className="text-xs text-[#000000]/50 font-bold">{order.email || order.user?.email || ""}</p>
                        </td>
                        <td className="px-4 py-3 font-black text-[#000000]">${order.total?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="bg-[#93ABD9] border-2 border-[#000000] px-2 py-0.5 rounded-full text-xs font-black">
                            {order.metodo || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`border-2 border-[#000000] px-2 py-0.5 rounded-full text-xs font-black ${getOrderStateBg(order.estado)}`}>
                            {formatOrderState(order.estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[#000000]/60">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelectedOrder(order); setOrderModal(true); setOrderRejecting(false); setOrderObservacion(""); }}
                            className="bg-[#E7BEF8] border-[3px] border-[#000000] px-3 py-1.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] transition-all"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center font-black text-[#000000]/30 text-lg">Sin pedidos registrados todavía</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl border-[2px] border-[#000000]/10 bg-white/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-[#000000]/60">
                      Mostrando {pagedOrders.length} de {filteredOrders.length} pedidos
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#000000]/60">Por página</span>
                      <select
                        value={ordersPerPage}
                        onChange={(e) => {
                          setOrdersPerPage(Number(e.target.value) as 10 | 20 | 50);
                          setOrdersPage(1);
                        }}
                        className="h-8 rounded-lg border-[2px] border-[#000000]/30 bg-white px-2 text-xs font-black"
                      >
                        {[10, 20, 50].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentOrdersPage <= 1}
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      className="h-8 border-[2px] border-[#000000] font-black"
                    >
                      Anterior
                    </Button>
                    <span className="text-xs font-black px-2">
                      {currentOrdersPage}/{totalOrdersPages}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentOrdersPage >= totalOrdersPages}
                      onClick={() => setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))}
                      className="h-8 border-[2px] border-[#000000] font-black"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              {/* Order Detail Modal */}
              {orderModal && selectedOrder && (() => {
                // Cálculo histórico por pedido: priorizamos snapshot guardado en la orden
                const orderTaxName = selectedOrder.taxName || "IVA";
                const activeTaxRate = selectedOrder.ivaRate ?? 15;
                const taxEnabled = selectedOrder.taxEnabled ?? true;
                const activeSurchargeRate = selectedOrder.surchargeRate ?? 0;
                const surchargeEnabled = selectedOrder.surchargeEnabled ?? false;
                const taxDivisor = 1 + (((taxEnabled ? activeTaxRate : 0) + (surchargeEnabled ? activeSurchargeRate : 0)) / 100);
                const hasPrecioFinal = selectedOrder.items.some(i => i.precioFinal != null);
                const itemsSubtotal =
                  selectedOrder.pricingSubtotal ??
                  (hasPrecioFinal
                    ? selectedOrder.items.reduce((acc, item) => acc + ((item.precioFinal ?? item.precio) * item.quantity), 0)
                    : (selectedOrder.total || 0) / taxDivisor);
                const iva = selectedOrder.pricingIva ?? (taxEnabled ? itemsSubtotal * (activeTaxRate / 100) : 0);
                const surcharge =
                  selectedOrder.pricingSurcharge ??
                  (surchargeEnabled ? itemsSubtotal * (activeSurchargeRate / 100) : 0);
                const fechaOrden = formatDateTime(selectedOrder.createdAt);
                return (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#EDE986] border-[5px] border-[#000000] rounded-[2.5rem] shadow-[12px_12px_0px_0px_#000000] w-[95vw] max-w-2xl sm:w-full max-h-[92vh] overflow-y-auto p-4 md:p-8 lg:p-10 animate-scale-in">
                    
                    {/* Header del Modal */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="font-heading font-black text-3xl text-[#000000] leading-tight mb-4">
                          Pedido {selectedOrder.orderCode ?? formatPrefixedSequence("ORD", selectedOrder.displayId, selectedOrder.id)}
                        </h3>
                        
                        {/* Ficha Técnica de Facturación (Admin View) */}
                        <div className="bg-white border-[4px] border-[#000000] rounded-2xl p-6 shadow-[6px_6px_0px_0px_#000000] mb-2">
                           <p className="text-[10px] font-black uppercase text-[#000000]/40 tracking-[0.2em] mb-4 border-b-2 border-dashed border-[#000000]/10 pb-2 flex items-center gap-2">
                              <span className="w-4 h-4 bg-[#93ABD9] border border-black rounded-full"></span>
                              EXPEDIENTE DE FACTURACIÓN
                           </p>
                           <div className="grid grid-cols-[90px_1fr] gap-y-3 text-xs md:text-sm">
                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">CLIENTE:</span>
                              <span className="font-black text-[#000000] text-base">{selectedOrder.nombre || selectedOrder.user?.name || 'N/A'}</span>
                              
                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">CÉDULA:</span>
                              <span className="font-black text-[#000000] tracking-widest">{selectedOrder.cedula || 'N/A'}</span>
                              
                               <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">TELÉFONO:</span>
                              <span className="font-black text-[#000000] tracking-widest">{formatEcuadorPhoneDisplay(selectedOrder.telefono) || selectedOrder.telefono || 'N/A'}</span>

                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">CORREO:</span>
                              <span className="font-black text-[#000000] break-all">
                                {selectedOrder.email || selectedOrder.user?.email || "No registrado"}
                              </span>
                              
                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">CIUDAD:</span>
                              <span className="font-black text-[#000000]">{(selectedOrder.ciudad && selectedOrder.ciudad.trim()) || (selectedOrder.user?.city && selectedOrder.user.city.trim()) || "No registrada"}</span>
                              
                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">DIRECCIÓN:</span>
                              <span className="font-black text-[#000000] text-xs">{(selectedOrder.direccion && selectedOrder.direccion.trim()) || (selectedOrder.user?.address && selectedOrder.user.address.trim()) || "No registrada"}</span>
                              
                              <span className="font-black text-[#000000]/30 uppercase tracking-tighter self-center">FECHA:</span>
                              <span className="font-black text-[#000000]/60">{fechaOrden}</span>
                           </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={orderActionLoading}
                        onClick={() => { setOrderModal(false); setOrderRejecting(false); }}
                        className="w-12 h-12 border-[3px] border-[#000000] rounded-2xl bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <X className="w-6 h-6" strokeWidth={4}/>
                      </button>
                    </div>

                    {/* Progress Bar & Management Buttons at the Top */}
                    <div className="mb-6 space-y-4">
                      {selectedOrder.estado.toUpperCase() === "PAGO_RECHAZADO" ? (
                         <div className="py-6 flex flex-col items-center justify-center text-center animate-fade-in bg-[#ffadad]/20 border-[3px] border-[#000000] rounded-2xl shadow-[4px_4px_0px_0px_#000000]">
                           <p className="font-black text-[#e63946] text-xl uppercase tracking-wider mb-1">PAGO RECHAZADO</p>
                           <p className="font-bold text-[#000000]/70 text-sm">Problema con el comprobante. El cliente ha sido notificado.</p>
                         </div>
                      ) : (
                         <OrderProgressBar
                           currentStatus={selectedOrder.estado}
                           orderId={selectedOrder.id}
                           displayId={selectedOrder.displayId}
                           orderCode={selectedOrder.orderCode}
                         />
                      )}
                      
                        {/* Las acciones se movieron abajo por petición del cliente */}
                        <div className="h-4"></div>
                      </div>

                    {/* Comprobante */}
                    {selectedOrder.comprobanteUrl ? (
                      <div className="mb-8">
                        <p className="font-black text-xs uppercase text-[#000000] mb-3 flex items-center gap-2">
                           <ImageIcon className="h-4 w-4 text-[#93ABD9]" />
                           Comprobante de Pago
                        </p>
                        <div className="border-[5px] border-[#000000] rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_#000000] bg-white ring-4 ring-white/50">
                          <Image
                            src={selectedOrder.comprobanteUrl}
                            alt="Comprobante"
                            width={1200}
                            height={900}
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, 800px"
                            className="w-full object-contain max-h-[400px] h-auto"
                          />
                        </div>
                        <a
                          href={selectedOrder.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center gap-2 bg-[#000000] text-white border-[4px] border-[#000000] px-6 py-2.5 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_#93ABD9] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#93ABD9] transition-all"
                        >
                          EXPANDIR IMAGEN 
                        </a>
                      </div>
                    ) : (
                      <div className="mb-8 bg-[#ffde91] border-[4px] border-[#000000] rounded-2xl p-5 font-black text-sm text-[#000000] shadow-[6px_6px_0px_0px_#000000] flex items-center gap-3">
                        <AlertCircle className="h-6 w-6" />
                        El cliente aún no ha subido el comprobante de transferencia.
                      </div>
                    )}

                    {/* Productos + Desglose Financiero */}
                    <div className="bg-[#f2c1bd] border-[5px] border-[#000000] rounded-[2.5rem] p-6 mb-5 shadow-[10px_10px_0px_0px_#000000]">
                      <p className="font-black text-xs uppercase mb-4 text-[#000000] border-b-2 border-black/10 pb-2">Resumen Financiero</p>
                      <div className="space-y-3 mb-6 bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        {selectedOrder.items.map(item => {
                          const pFinal = item.precioFinal ?? item.precio;
                          const totalLinea = pFinal * item.quantity;
                          const totalOriginal = item.precio * item.quantity;
                          const tieneDescuento = item.precioFinal != null && item.precioFinal < item.precio;
                          return (
                            <div key={item.id} className="py-2.5 border-b border-[#000000]/10 last:border-0">
                              {/* Fila principal: Nombre + Precios */}
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="font-black text-sm text-[#000000] leading-tight flex-1">{item.product.nombre}</span>
                                <div className="flex items-baseline gap-2 flex-shrink-0">
                                  {tieneDescuento && (
                                    <span className="text-xs line-through text-[#000000]/30 font-bold">${totalOriginal.toFixed(2)}</span>
                                  )}
                                  <span className="font-black text-sm text-[#000000]">${totalLinea.toFixed(2)}</span>
                                </div>
                              </div>
                              {/* Fila secundaria: Qty × precio unitario real */}
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#000000]/40">
                                  {item.quantity} × ${pFinal.toFixed(2)}
                                </span>
                                {tieneDescuento && (
                                  <span className="text-[10px] font-black bg-[#93ABD9] border border-[#000000]/30 px-1.5 py-0.5 rounded-full text-[#000000]/70">
                                    -{Math.round((1 - pFinal / item.precio) * 100)}% dto.
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t-[4px] border-black/10 mt-5 pt-4 space-y-2">
                        <div className="flex justify-between text-xs font-bold opacity-60">
                          <span>VALOR PRODUCTOS ({selectedOrder.items.reduce((acc, item) => acc + item.quantity, 0)} ART.):</span>
                          <span>${itemsSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold opacity-60">
                          <span>{buildIvaLabel(taxEnabled ? activeTaxRate : 0, orderTaxName)}:</span>
                          <span>${iva.toFixed(2)}</span>
                        </div>
                        {surchargeEnabled && activeSurchargeRate > 0 && (
                          <div className="flex justify-between text-xs font-bold opacity-60">
                            <span>Recargo ({formatIvaPercent(activeSurchargeRate)}):</span>
                            <span>${surcharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-black border-t-2 border-black/5 pt-3 mt-1 uppercase">
                          <span className="opacity-40">MÉTODO PAGO:</span>
                          <span>{selectedOrder.metodo || 'No especif.'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black uppercase">
                          <span className="opacity-40">CORREO:</span>
                          <span className="max-w-[60%] truncate normal-case">
                            {selectedOrder.email || selectedOrder.user?.email || "No registrado"}
                          </span>
                        </div>
                        <div className="flex justify-between font-black text-[#000000] text-2xl pt-2 border-t-[3px] border-[#000000]/10 leading-none">
                          <span className="text-sm self-center">TOTAL FINAL:</span>
                          <span>${selectedOrder.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN DE ACCIONES OPERATIVAS FINAL (MIAUWUAUF CONTROL) */}
                    <div className="mt-8 mb-4">
                       {/* 1. Validación de Pago (Aprobar/Rechazar) */}
                       {["PENDIENTE", "ESPERANDO_VALIDACION", "ESPERANDO_COMPROBANTE", "PENDIENTE_VALIDACION", "RECOLECTADO_PAGO", "RECEIBIDO", "RECIBIDO"].includes(selectedOrder.estado.trim().replace(/\s+/g, '_').toUpperCase()) && (
                         <div className="flex flex-col gap-6 bg-white/50 backdrop-blur-sm border-[4px] border-[#000000] p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_#000000] animate-in slide-in-from-bottom-4 duration-500">
                           <div className="flex items-center justify-between border-b-2 border-[#000000]/10 pb-3">
                             <div>
                               <p className="font-black text-xs uppercase tracking-[0.2em] text-[#000000]">Gestión de Pedido</p>
                               <p className="text-[10px] font-bold text-[#000000]/40">Verifica el comprobante antes de validar</p>
                             </div>
                             <Badge className="bg-[#000000] text-white font-black text-[10px] uppercase tracking-tighter py-1">Admin Control</Badge>
                           </div>

                           <div className="flex flex-col gap-4">
                             {!orderRejecting ? (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <button
                                   disabled={orderActionLoading}
                                   onClick={() => handleOrderAction(selectedOrder.id, 'VERIFICADO')}
                                   className="flex items-center justify-center gap-3 bg-[#93ABD9] border-[3px] border-[#000000] rounded-2xl py-4 font-black text-base shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all disabled:opacity-50 group"
                                 >
                                   <CheckCircle2 className="h-7 w-7 group-hover:scale-110 transition-transform text-[#000000]" />
                                   {orderActionLoading ? ' PROCESANDO...' : 'APROBAR Y VALIDAR PAGO'}
                                 </button>
                                 <button
                                   disabled={orderActionLoading}
                                   onClick={() => setOrderRejecting(true)}
                                   className="flex items-center justify-center gap-3 bg-[#ffadad] border-[3px] border-[#000000] rounded-2xl py-4 font-black text-base shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all disabled:opacity-50 group"
                                 >
                                   <XCircle className="h-7 w-7 group-hover:scale-110 transition-transform text-[#000000]" />
                                   RECHAZAR PAGO
                                 </button>
                               </div>
                             ) : (
                               <div className="space-y-4 bg-[#EDE986] p-6 border-[4px] border-[#000000] rounded-[2.5rem] shadow-[10px_10px_0px_0px_#000000] animate-in zoom-in-95 duration-300">
                                 <div className="flex items-center gap-2 text-[#000000]">
                                   <div className="w-8 h-8 rounded-lg bg-[#ffadad] border-2 border-black flex items-center justify-center">
                                     <AlertTriangle className="h-4 w-4" />
                                   </div>
                                   <div>
                                     <p className="font-black text-sm uppercase leading-none">Causa de Rechazo</p>
                                     <p className="text-[10px] font-bold opacity-50">Explica al cliente el motivo</p>
                                   </div>
                                 </div>
                                 <textarea
                                   value={orderObservacion}
                                   onChange={e => setOrderObservacion(e.target.value)}
                                   placeholder="Ej: Comprobante no coincide con el total..."
                                   rows={3}
                                   className="w-full border-[3px] border-[#000000] rounded-2xl p-4 font-bold text-sm bg-white resize-none shadow-inner focus:ring-4 focus:ring-[#ffadad]/20 transition-all outline-none"
                                 />
                                 <div className="flex gap-4 pt-2">
                                   <button 
                                     type="button"
                                     disabled={orderActionLoading}
                                     onClick={() => setOrderRejecting(false)} 
                                     className="flex-1 bg-white border-[3px] border-[#000000] rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-[#ffffff] shadow-[6px_6px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                                   >
                                     Cancelar
                                   </button>
                                   <button 
                                     disabled={orderActionLoading || !orderObservacion.trim()}
                                     onClick={() => handleOrderAction(selectedOrder.id, 'PAGO_RECHAZADO', orderObservacion)}
                                     className="flex-1 bg-[#000000] text-white border-[3px] border-[#000000] rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-[6px_6px_0px_0px_#ffadad] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-30 disabled:grayscale transition-all"
                                   >
                                     {orderActionLoading ? 'ENVIANDO...' : 'CONFIRMAR RECHAZO'}
                                   </button>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       )}

                       {/* 2. Proceso Logístico (Preparación/Envío) */}
                       {(selectedOrder.estado === "VERIFICADO" || selectedOrder.estado === "PAGO_ACEPTADO") && (
                         <button
                           disabled={orderActionLoading}
                           onClick={() => handleOrderAction(selectedOrder.id, 'PREPARANDO')}
                           className="w-full bg-[#ffd6a5] border-[3px] border-[#000000] rounded-2xl py-5 font-black text-lg shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all group"
                         >
                           <div className="flex items-center justify-center gap-3">
                             <Package className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                             {orderActionLoading ? ' PROCESANDO...' : 'INICIAR PREPARACIÓN DE PEDIDO'}
                           </div>
                         </button>
                       )}

                       {selectedOrder.estado === "PREPARANDO" && (
                         <button
                           disabled={orderActionLoading}
                           onClick={() => handleOrderAction(selectedOrder.id, 'EN_CAMINO')}
                           className="w-full bg-[#93ABD9] border-[3px] border-[#000000] rounded-2xl py-5 font-black text-lg shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all group"
                         >
                           <div className="flex items-center justify-center gap-3">
                             <Truck className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                             {orderActionLoading ? ' PROCESANDO...' : 'MARCAR COMO EN CAMINO (DESPACHO)'}
                           </div>
                         </button>
                       )}

                       {selectedOrder.estado === "EN_CAMINO" && (
                         <button
                           disabled={orderActionLoading}
                           onClick={() => handleOrderAction(selectedOrder.id, 'COMPLETADA')}
                           className="w-full bg-[#93ABD9] border-[3px] border-[#000000] rounded-2xl py-5 font-black text-lg shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all group"
                         >
                           <div className="flex items-center justify-center gap-3">
                             <CheckCircle2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                             {orderActionLoading ? ' PROCESANDO...' : 'CONFIRMAR ENTREGA FINAL'}
                           </div>
                         </button>
                       )}
                    </div>
                  </div>
                </div>
                );
              })()}

            </div>
          )}

          {activeTab === "sistema" && (
            <SystemTab
              veterinarios={veterinarios}
              usuarios={usuarios}
              eventos={eventos}
              solicitudesAdopcion={solicitudesAdopcion}
              perrosAdopcion={perrosAdopcion}
              setActiveTab={setActiveTab}
              setAdopcionSubTab={setAdopcionSubTab}
              setShowPerroForm={setShowPerroForm}
              setShowVetForm={setShowVetForm}
              setShowEventoForm={setShowEventoForm}
              adminStats={adminStats}
              homeHeroExplainerContent={homeHeroExplainerContent}
              setHomeHeroExplainerContent={setHomeHeroExplainerContent}
              handleSaveHomeHeroExplainer={handleSaveHomeHeroExplainer}
              isSubmittingHomeHeroExplainer={isSubmittingHomeHeroExplainer}
            />
          )}

          {activeTab === "plan-qr" && (
            <PlanQRTab 
              usuarios={usuarios} 
              onToggleQR={async (petId, qrEnabled) => {
                try {
                  const res = await fetch(`/api/admin/pets/${petId}/qr`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ qrEnabled })
                  });
                  if (res.ok) {
                    toast.success(`Plan QR ${qrEnabled ? 'activado' : 'desactivado'}`);
                    // Update local state to reflect change
                    setUsuarios(prev => prev.map(u => ({
                      ...u,
                      mascotas: u.mascotas?.map(p => String(p.id) === String(petId) ? { ...p, qrEnabled } : p)
                    })));
                  } else {
                    toast.error("Error al actualizar plan QR");
                  }
                } catch (error) {
                  console.error(error);
                  toast.error("Error de conexión");
                }
              }}
            />
          )}

          {/* MODAL RESET PASSWORD */}
          {passwordResetModal?.isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <Card className="w-full max-w-md overflow-hidden rounded-[2.5rem] border-[3px] border-[#000000] bg-[#fdfaf5] p-0 shadow-[8px_8px_0px_0px_#000000] animate-in zoom-in-95 duration-300">
                <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] p-6 text-center">
                  <div className="mx-auto bg-white w-14 h-14 rounded-full border-[3px] border-[#000000] flex items-center justify-center shadow-[4px_4px_0px_0px_#000000] mb-3">
                    <Key className="h-6 w-6 text-[#000000]" />
                  </div>
                  <CardTitle className="font-heading font-black text-2xl text-[#000000]">
                    Cambiar Contraseña
                  </CardTitle>
                  <p className="text-[#000000]/80 font-bold text-sm mt-2">
                    Ingrese la nueva contraseña para el {passwordResetModal.role}. Se le enviará un correo con la notificación.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-black text-[#000000]">Nueva Contraseña</Label>
                      <Input
                        type="text"
                        value={passwordResetModal.password}
                        onChange={(e) => setPasswordResetModal({ ...passwordResetModal, password: e.target.value })}
                        placeholder="Escriba la nueva contraseña"
                        className="h-12 border-[2px] border-[#000000] rounded-xl font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] focus-visible:border-[#000000]"
                        autoFocus
                      />
                    </div>
                  </div>
                </CardContent>
                <div className="border-t-[3px] border-[#000000] bg-white p-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setPasswordResetModal(null)}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-[2px] border-[#000000] font-black text-[#000000] hover:bg-[#ffadad] shadow-[3px_3px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmPasswordReset}
                    disabled={!passwordResetModal.password}
                    className="flex-1 h-12 rounded-xl border-[2px] border-[#000000] bg-[#93ABD9] hover:bg-[#7f9dca] font-black text-[#000000] shadow-[3px_3px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[3px_3px_0px_0px_#000000]"
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </Card>
            </div>
          )}

        </main>




{/* MODAL VER VETERINARIO */}
{showVetViewModal && selectedVet && (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 px-2 py-6 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4">
    <Card className="relative my-auto flex max-h-[min(88dvh,720px)] w-[95vw] max-w-md flex-col overflow-hidden rounded-3xl border-[3px] border-[#000000] bg-[#fdfaf5] p-0 text-[#000000] shadow-[8px_8px_0px_0px_#000000] animate-scale-in sm:w-full">
      
      {/* Cambiamos a bg-white y p-6 para que se rellene todo el ancho sin franjas blancas */}
      <CardHeader className="relative shrink-0 rounded-t-3xl bg-[#93ABD9] border-b-[3px] border-[#000000] p-4 pb-4 md:p-6 md:pb-6">
        <Button
          size="icon"
          className="absolute right-3 top-3 z-20 rounded-lg border-[2px] border-[#000000] bg-white text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-white/80 active:translate-y-1 active:shadow-none sm:right-4 sm:top-4"
          onClick={() => {
            setShowVetViewModal(false);
            setSelectedVet(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-12 pt-1 font-heading text-lg font-black sm:pt-2 md:text-2xl">
          <Stethoscope className="h-5 w-5 shrink-0 text-[#000000] sm:h-6 sm:w-6" />
          <span className="min-w-0 leading-tight">Perfil Profesional</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:space-y-4 md:p-6">
        <div className="mb-4 flex justify-center md:mb-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] md:h-24 md:w-24">
            {selectedVet?.image ? (
              <Image
                src={selectedVet.image}
                alt={selectedVet.nombre || ""}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-[#000000]/50" />
            )}
          </div>
        </div>
        
        <div className="space-y-3 pt-1 md:space-y-4 md:pt-2">
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            <div className="rounded-xl border-[2px] border-[#000000]/10 bg-white p-2.5 md:p-3">
              <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                <User className="h-3 w-3" /> Nombre Completo
              </p>
              <p className="font-black text-lg text-[#000000]">{selectedVet?.nombre}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-bold text-sm text-[#000000] break-all">{selectedVet?.email}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                  <Phone className="h-3 w-3" /> Teléfono
                </p>
                <p className="font-bold text-sm text-[#000000]">{formatEcuadorPhoneDisplay(selectedVet?.telefono) || selectedVet?.telefono || "N/A"}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
              <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                <Shield className="h-3 w-3" /> Cédula
              </p>
              <p className="font-bold text-[#000000] tracking-wider">{selectedVet?.cedula || "No registrada"}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
              <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                <Stethoscope className="h-3 w-3" /> Especialidad
              </p>
              <Badge className="bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] mt-1 text-sm px-3 py-1 font-black shadow-[2px_2px_0px_0px_#000000]">
                {selectedVet?.especialidad}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Ciudad
                </p>
                <p className="font-bold text-sm text-[#000000]">{selectedVet?.city || "Quito"}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                  <Home className="h-3 w-3" /> Dirección Exacta
                </p>
                <p className="font-bold text-sm text-[#000000] break-words">{selectedVet?.address || "No registrada"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase">Estado</p>
                <Badge
                  className={`border-[2px] border-[#000000] mt-1 text-xs px-2 py-0.5 font-black shadow-[2px_2px_0px_0px_#000000] ${selectedVet?.estado === "activo" ? "bg-[#93ABD9]" : "bg-[#ffadad]"} text-[#000000]`}
                >
                  {selectedVet?.estado?.toUpperCase()}
                </Badge>
              </div>

              <div className="bg-white p-3 rounded-xl border-[2px] border-[#000000]/10">
                <p className="text-xs font-bold opacity-70 uppercase flex items-center gap-2">
                   Miembro desde
                </p>
                <p className="font-bold text-sm text-[#000000] mt-1">
                  {selectedVet?.createdAt ? formatDate(selectedVet.createdAt) : "---"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#000000]/10 p-4 pt-3 md:p-6 md:pt-4">
        <Button
          onClick={() => handleResetPassword(selectedVet.id, 'veterinario')}
          variant="outline"
          className="rounded-xl border-[2px] border-[#000000] bg-white font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#ffadad] active:translate-y-1 active:shadow-none flex items-center gap-2"
        >
          <Key className="h-4 w-4" />
          Cambiar Contraseña
        </Button>
        <Button
          onClick={() => {
            setShowVetViewModal(false);
            setSelectedVet(null);
          }}
          className="rounded-xl border-[2px] border-[#000000] bg-[#93ABD9] font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#7f9dca] active:translate-y-1 active:shadow-none"
        >
          Cerrar
        </Button>
      </div>
    </Card>
  </div>
)}

        {showUserViewModal && selectedUserDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
            <Card className="my-auto w-[95vw] max-w-2xl overflow-hidden rounded-[2.5rem] border-[3px] border-[#000000] bg-[#fdfaf5] p-0 shadow-[10px_10px_0px_0px_#000000] animate-in zoom-in-95 duration-300 sm:w-full">
              <CardHeader className="relative rounded-t-[2.5rem] bg-[#93ABD9] border-b-[3px] border-[#000000] p-5 md:p-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full border-[2px] border-[#000000] bg-white transition-all hover:bg-[#ffadad] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
                  onClick={() => {
                    setShowUserViewModal(false);
                    setSelectedUserDetail(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
                <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-12 pt-1 font-heading text-lg font-black sm:gap-3 sm:pt-2 sm:text-2xl">
                  <div className="shrink-0 rounded-xl border-[2.5px] border-[#000000] bg-white p-2 shadow-[3px_3px_0px_0px_#000000] sm:p-2.5">
                    <Users className="h-5 w-5 text-[#000000] sm:h-6 sm:w-6" />
                  </div>
                  <span className="min-w-0 leading-tight">Información del Usuario</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {(() => {
                    const userImage = selectedUserDetail.image ?? "";
                    return (
                  <div className="w-32 h-32 rounded-[2rem] bg-white border-[3px] border-[#000000] shadow-[6px_6px_0px_0px_#000000] flex items-center justify-center relative overflow-hidden shrink-0">
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={selectedUserDetail.nombre || "Usuario"}
                        fill
                        loading="lazy"
                        sizes="128px"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-14 w-14 text-[#000000]/30" />
                    )}
                  </div>
                    );
                  })()}
                  
                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <User className="h-3 w-3" /> Nombre Completo
                        </p>
                        <p className="font-black text-lg text-[#000000]">{selectedUserDetail.nombre}</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <Mail className="h-3 w-3" /> Correo Electrónico
                        </p>
                        <p className="font-bold text-[#000000] break-all">{selectedUserDetail.email}</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <Phone className="h-3 w-3" /> Teléfono
                        </p>
                        <p className="font-bold text-[#000000]">{formatEcuadorPhoneDisplay(selectedUserDetail.telefono) || selectedUserDetail.telefono || "No registrado"}</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <Shield className="h-3 w-3" /> Cédula de Ciudadanía
                        </p>
                        <p className="font-bold text-[#000000]">{selectedUserDetail.cedula || "No registrada"}</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <MapPin className="h-3 w-3" /> Ciudad
                        </p>
                        <p className="font-bold text-[#000000]">{selectedUserDetail.city || "Quito"}</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm md:col-span-2">
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <Home className="h-3 w-3" /> Dirección Exacta
                        </p>
                        <p className="font-bold text-[#000000]">{selectedUserDetail.address || "No registrada"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                       <div className="bg-white px-4 py-2 rounded-xl border-[2px] border-[#000000]/10 flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">Estado:</span>
                        <Badge className={`border-[2px] border-[#000000] px-2 py-0.5 font-bold shadow-[2px_2px_0px_0px_#000000] ${selectedUserDetail.estado === 'activo' || selectedUserDetail.estado === 'admin' ? 'bg-[#93ABD9]' : 'bg-[#ffadad]'} text-[#000000]`}>
                          {selectedUserDetail.estado?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="bg-white px-4 py-2 rounded-xl border-[2px] border-[#000000]/10 flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">Desde:</span>
                        <span className="font-bold text-sm text-[#000000]">
                          {selectedUserDetail.createdAt ? formatDate(selectedUserDetail.createdAt) : "---"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] flex-1 bg-[#000000]/10" />
                    <h3 className="font-black font-heading text-lg flex items-center gap-2 uppercase tracking-tight">
                      <PawPrint className="h-5 w-5 text-[#93ABD9]" />
                      Mascotas Registradas
                    </h3>
                    <div className="h-[2px] flex-1 bg-[#000000]/10" />
                  </div>

                  {selectedUserDetail.mascotas && selectedUserDetail.mascotas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedUserDetail.mascotas.map((pet, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedPetDetail(pet)}
                          className="bg-white p-4 rounded-3xl border-[2.5px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_0px_#000000] transition-all flex items-center gap-4 group cursor-pointer"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-[#fdfaf5] border-[2px] border-[#000000] flex items-center justify-center shrink-0 overflow-hidden relative">
                            {pet.foto ? (
                              <Image src={pet.foto} alt={pet.nombre} fill className="object-cover" />
                            ) : (
                               <PawPrint className="h-8 w-8 text-[#000000]/30 group-hover:scale-110 transition-transform" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-[#000000] text-lg leading-tight">{pet.nombre}</p>
                            <p className="text-sm font-bold opacity-60 m-0">{pet.raza || pet.especie || 'Mascota'}</p>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">
                              {calcularEdad(pet.fechaNacimiento, pet.edad, pet.especie || pet.tipo, pet.raza)}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-[#000000]/30 group-hover:text-[#000000] transition-colors shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-white/50 rounded-[2rem] border-[2px] border-dashed border-[#000000]/20">
                      <div className="bg-white w-12 h-12 rounded-full border-[2px] border-[#000000]/10 flex items-center justify-center mx-auto mb-3">
                        <PawPrint className="h-6 w-6 text-[#000000]/20" />
                      </div>
                      <p className="font-bold text-[#000000]/40 italic">Este usuario no tiene mascotas registradas aún.</p>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="p-6 md:p-8 pt-0 flex flex-wrap justify-end gap-4 bg-[#fdfaf5]">
                <Button
                  onClick={() => handleResetPassword(selectedUserDetail.id, 'usuario')}
                  variant="outline"
                  className="bg-white hover:bg-[#ffadad] text-[#000000] border-[3px] border-[#000000] shadow-[5px_5px_0px_0px_#000000] font-black px-8 h-14 rounded-2xl transition-all active:translate-y-1 active:shadow-none text-lg flex items-center gap-2"
                >
                  <Key className="h-5 w-5" />
                  Cambiar Contraseña
                </Button>
                <Button
                  onClick={() => {
                    setShowUserViewModal(false);
                    setSelectedUserDetail(null);
                  }}
                  className="bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[3px] border-[#000000] shadow-[5px_5px_0px_0px_#000000] font-black px-10 h-14 rounded-2xl transition-all active:translate-y-1 active:shadow-none text-lg"
                >
                  Cerrar Detalle
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* MODAL DETALLE MASCOTA */}
        {selectedPetDetail && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedPetDetail(null)}
          >
            <Card
              className="w-[95vw] max-w-md sm:w-full border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[10px_10px_0px_0px_#000000] rounded-[2.5rem] overflow-hidden p-0 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] p-6 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 h-9 w-9 rounded-full border-[2px] border-[#000000] bg-white hover:bg-[#ffadad] transition-all"
                  onClick={() => setSelectedPetDetail(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardTitle className="flex items-center gap-3 font-black font-heading text-xl pt-1">
                  <div className="bg-white p-2 rounded-xl border-[2.5px] border-[#000000] shadow-[3px_3px_0px_0px_#000000]">
                    <PawPrint className="h-5 w-5 text-[#000000]" />
                  </div>
                  Detalle de Mascota
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* Foto y nombre */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-28 h-28 rounded-[2rem] bg-[#fdfaf5] border-[3px] border-[#000000] shadow-[6px_6px_0px_0px_#000000] flex items-center justify-center relative overflow-hidden">
                    {selectedPetDetail.foto ? (
                      <Image
                        src={selectedPetDetail.foto}
                        alt={selectedPetDetail.nombre}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <PawPrint className="h-12 w-12 text-[#000000]/30" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-black text-2xl text-[#000000] font-heading">{selectedPetDetail.nombre}</p>
                    <p className="text-sm font-bold opacity-60">{selectedPetDetail.especie || selectedPetDetail.tipo || 'Mascota'}</p>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPetDetail.raza && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Raza</p>
                      <p className="font-bold text-[#000000] text-sm">{selectedPetDetail.raza}</p>
                    </div>
                  )}
                  {selectedPetDetail.edad && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Edad</p>
                      <p className="font-bold text-[#000000] text-sm">
                        {calcularEdad(selectedPetDetail.fechaNacimiento, selectedPetDetail.edad, selectedPetDetail.especie || selectedPetDetail.tipo, selectedPetDetail.raza)}
                      </p>
                    </div>
                  )}
                  {selectedPetDetail.sexo && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Sexo</p>
                      <p className="font-bold text-[#000000] text-sm">{selectedPetDetail.sexo}</p>
                    </div>
                  )}
                  {selectedPetDetail.peso && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Peso</p>
                      <p className="font-bold text-[#000000] text-sm">{selectedPetDetail.peso} kg</p>
                    </div>
                  )}
                  {selectedPetDetail.color && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Color</p>
                      <p className="font-bold text-[#000000] text-sm">{selectedPetDetail.color}</p>
                    </div>
                  )}
                  {selectedPetDetail.esterilizado && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Esterilizado</p>
                      <p className="font-bold text-[#000000] text-sm">{selectedPetDetail.esterilizado}</p>
                    </div>
                  )}
                  {selectedPetDetail.fechaNacimiento && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm md:col-span-2">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Fecha de Nacimiento</p>
                      <p className="font-bold text-[#000000] text-sm">
                        {selectedPetDetail.fechaNacimiento ? formatDate(selectedPetDetail.fechaNacimiento) : "No registrada"}
                      </p>
                    </div>
                  )}
                  {selectedPetDetail.ultimaVisita && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm md:col-span-2">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Última Visita Vet.</p>
                      <p className="font-bold text-[#000000] text-sm">
                        {selectedPetDetail.ultimaVisita ? formatDate(selectedPetDetail.ultimaVisita) : "Sin visitas recientes"}
                      </p>
                    </div>
                  )}
                  {selectedPetDetail.createdAt && (
                    <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Miembro desde</p>
                      <p className="font-bold text-[#000000] text-sm">
                        {formatDate(selectedPetDetail.createdAt)}
                      </p>
                    </div>
                  )}
                  <div className="bg-white p-3 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Registrado por</p>
                    <p className="font-bold text-[#000000] text-sm flex items-center gap-2">
                      {selectedPetDetail.assignedVetId ? (
                        <>
                          <Stethoscope className="h-3.5 w-3.5 text-[#93ABD9]" />
                          Veterinario - {selectedPetDetail.assignedVet?.name || "Asignado"}
                        </>
                      ) : (
                        <>
                          <User className="h-3.5 w-3.5 text-[#ffadad]" />
                          Usuario - {selectedUserDetail?.nombre || "Dueño"}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 md:p-6 pt-0 flex justify-end">
                <Button
                  onClick={() => setSelectedPetDetail(null)}
                  className="bg-[#ffd6a5] hover:bg-[#93ABD9] text-[#000000] border-[3px] border-[#000000] shadow-[5px_5px_0px_0px_#000000] font-black px-8 h-12 rounded-2xl transition-all active:translate-y-1 active:shadow-none"
                >
                  Cerrar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {modalConfirmacion.isOpen && (
          <ConfirmModal
            isOpen={modalConfirmacion.isOpen}
            onClose={() =>
              setModalConfirmacion((prev: ConfirmModalState) => ({
                ...prev,
                isOpen: false,
              }))
            }
            onConfirm={modalConfirmacion.onConfirm}
            title={modalConfirmacion.title}
            description={modalConfirmacion.description}
          />
        )}
      </div>
    </div>
  );
}

interface BloggerFormData {
  nombre: string;
  email: string;
  password?: string;
  telefono: string;
  cedula: string;
  city: string;
  address: string;
}

interface BloggersTabProps {
  blogueros: Blogger[];
  showBlogueroForm: boolean;
  setShowBlogueroForm: (v: boolean) => void;
  blogueroForm: BloggerFormData;
  setBlogueroForm: (v: BloggerFormData) => void;
  handleCreateBloguero: (e: React.FormEvent) => void;
  handleDeleteBloguero: (id: string | number) => void;
  showBloggerPasswordAdmin: boolean;
  setShowBloggerPasswordAdmin: (v: boolean) => void;
  handleViewBloguero: (b: Blogger) => void;
  handleEditBlogger: (b: Blogger) => void;
  showBlogueroViewModal: boolean;
  setShowBlogueroViewModal: (v: boolean) => void;
  showBlogueroEditModal: boolean;
  setShowBlogueroEditModal: (v: boolean) => void;
  selectedBloguero: Blogger | null;
  handleUpdateBloguero: (e: React.FormEvent) => void;
  isSubmittingBlogger: boolean;
}

const BloggersTab = memo(function BloggersTab({
  blogueros,
  showBlogueroForm,
  setShowBlogueroForm,
  blogueroForm,
  setBlogueroForm,
  handleCreateBloguero,
  handleDeleteBloguero,
  showBloggerPasswordAdmin,
  setShowBloggerPasswordAdmin,
  handleViewBloguero,
  handleEditBlogger,
  showBlogueroViewModal,
  setShowBlogueroViewModal,
  showBlogueroEditModal,
  setShowBlogueroEditModal,
  selectedBloguero,
  handleUpdateBloguero,
  isSubmittingBlogger,
}: BloggersTabProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<8 | 16 | 24>(8);
  const BLOGGERS_PAGE_SIZE = perPage;
  const filteredBlogueros = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blogueros;
    return blogueros.filter((b) =>
      [b.nombre, b.email, b.cedula, b.telefono, b.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [blogueros, query]);
  const totalPages = Math.max(1, Math.ceil(filteredBlogueros.length / BLOGGERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogueros = useMemo(
    () => filteredBlogueros.slice((currentPage - 1) * BLOGGERS_PAGE_SIZE, currentPage * BLOGGERS_PAGE_SIZE),
    [filteredBlogueros, currentPage, BLOGGERS_PAGE_SIZE]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
            Gestión de Blogueros
          </h2>
          <p className="font-semibold opacity-70 text-[#000000]/70">
            Administrar cronistas y autores del blog
          </p>
        </div>
        <Button
          disabled={isSubmittingBlogger}
          onClick={() => setShowBlogueroForm(!showBlogueroForm)}
          className="gap-2 bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Bloguero
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar bloguero por nombre, email o ciudad..."
          className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white md:max-w-md"
        />
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value) as 8 | 16 | 24);
            setPage(1);
          }}
          className="h-11 rounded-xl border-[2px] border-foreground/20 bg-white px-3 text-sm font-bold text-[#000000] md:w-40"
        >
          <option value={8}>8 por página</option>
          <option value={16}>16 por página</option>
          <option value={24}>24 por página</option>
        </select>
      </div>

      {showBlogueroForm && (
        <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
          <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
            <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Registrar Nuevo Bloguero
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleCreateBloguero}
              className="grid md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label className="font-bold">Nombre del Autor</Label>
                <Input
                  placeholder="Ej. Maria Lopez"
                  value={blogueroForm.nombre}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, nombre: e.target.value })
                  }
                  required
                  className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Email</Label>
                <Input
                  type="email"
                  placeholder="autor@miauwuauf.com"
                  value={blogueroForm.email}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, email: e.target.value })
                  }
                  required
                  className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Cédula</Label>
                <Input
                  placeholder="Ej. 0123456789"
                  value={blogueroForm.cedula}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, cedula: e.target.value })
                  }
                  required
                  className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Teléfono</Label>
                <Input
                  placeholder="Ej. 0991234567"
                  value={blogueroForm.telefono}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, telefono: e.target.value })
                  }
                  required
                  className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Ciudad</Label>
                <Input
                  placeholder="Ej. Quito"
                  value={blogueroForm.city}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, city: e.target.value })
                  }
                  required
                  className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Dirección Exacta</Label>
                <Input
                  placeholder="Calle, Sector, Referencia"
                  value={blogueroForm.address}
                  onChange={(e) =>
                    setBlogueroForm({ ...blogueroForm, address: e.target.value })
                  }
                  required
                  className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">Contraseña Inicial</Label>
                <div className="relative">
                  <Input
                    type={showBloggerPasswordAdmin ? "text" : "password"}
                    placeholder="********"
                    value={blogueroForm.password}
                    onChange={(e) =>
                      setBlogueroForm({
                        ...blogueroForm,
                        password: e.target.value,
                      })
                    }
                    required
                    className="h-11 border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBloggerPasswordAdmin(!showBloggerPasswordAdmin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                  >
                    {showBloggerPasswordAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
                            <div className="md:col-span-2 flex gap-4 pt-6 pb-6 px-1 border-t-[3px] border-black/5">
                <Button
                  type="submit"
                  disabled={isSubmittingBlogger}
                  className="bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-black rounded-xl transition-all active:translate-y-1 active:shadow-none h-11 px-8 disabled:opacity-50"
                >
                  {isSubmittingBlogger ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                    </span>
                  ) : (
                    "Confirmar Registro"
                  )}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmittingBlogger}
                  onClick={() => setShowBlogueroForm(false)}
                  className="bg-white hover:bg-black/5 text-[#000000] border-[2px] border-[#000000] font-black rounded-xl transition-all h-11 px-8 disabled:opacity-50"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardHeader className="bg-[#ffadad] border-b-[3px] border-[#000000] p-6">
          <CardTitle className="font-black font-heading flex items-center gap-3 text-xl">
            <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
              <PenTool className="h-5 w-5 text-[#000000]" />
            </div>
            Gestión de Blogueros
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
          <Table className="w-full min-w-[600px] lg:min-w-0 border-collapse">
            <TableHeader className="bg-transparent border-none">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
                  Bloguero
                </TableHead>
                <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
                  Artículos
                </TableHead>
                <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
                  Estado
                </TableHead>
                <TableHead className="text-right font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pagedBlogueros.map((bloguero: Blogger) => (
                <TableRow
                  key={bloguero.id}
                  className="border-b-[2px] border-[#000000]/10 last:border-0 hover:bg-[#ffadad]/5 transition-colors"
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#bdb2ff] border-[2px] border-[#000000] flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-[#000000]" />
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{bloguero.nombre}</p>
                        <p className="text-sm opacity-60 mt-1">{bloguero.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6">
                    <Badge className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000]">
                      {bloguero.articulos || 0}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-4 px-6">
                    <Badge className="bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000]">
                      Activo
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        onClick={() => handleViewBloguero(bloguero)}
                        className="h-9 w-9 bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => handleEditBlogger(bloguero)}
                        className="h-9 w-9 bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => handleDeleteBloguero(bloguero.id)}
                        className="h-9 w-9 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {filteredBlogueros.length > 0 && (
            <div className="flex items-center justify-between border-t-[2px] border-[#000000]/10 px-4 py-3">
              <p className="text-xs font-bold text-[#000000]/60">
                Mostrando {pagedBlogueros.length} de {filteredBlogueros.length} blogueros
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 border-[2px] border-[#000000] font-black"
                >
                  Anterior
                </Button>
                <span className="text-xs font-black px-2">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 border-[2px] border-[#000000] font-black"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL VER BLOGUERO */}
      {showBlogueroViewModal && selectedBloguero && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
          <Card className="my-auto w-[95vw] max-w-lg overflow-hidden rounded-[2.5rem] border-[3px] border-[#000000] bg-[#fdfaf5] p-0 shadow-[10px_10px_0px_0px_#000000] animate-in zoom-in-95 duration-300 sm:w-full">
            <CardHeader className="relative rounded-t-[2.5rem] bg-[#bdb2ff] border-b-[3px] border-[#000000] p-4 sm:p-6">
              <Button
                size="icon"
                className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full border-[2px] border-[#000000] bg-white transition-all hover:bg-[#ffadad] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
                onClick={() => setShowBlogueroViewModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="flex items-center gap-2 pr-12 pt-1 font-black text-lg sm:gap-3 sm:pt-2 sm:text-2xl">
                <PenTool className="h-6 w-6 text-[#000000]" />
                Perfil del Bloguero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4">
              <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Nombre</p>
                <p className="font-black text-lg text-[#000000]">{selectedBloguero.nombre}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Email</p>
                  <p className="font-bold text-[#000000] truncate">{selectedBloguero.email}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Teléfono</p>
                  <p className="font-bold text-[#000000]">{formatEcuadorPhoneDisplay(selectedBloguero.telefono || selectedBloguero.phone) || selectedBloguero.telefono || selectedBloguero.phone || "N/A"}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Cédula</p>
                  <p className="font-bold text-[#000000]">{selectedBloguero.cedula || "N/A"}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Ciudad</p>
                  <p className="font-bold text-[#000000]">{selectedBloguero.city || "Quito"}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-[2px] border-[#000000]/10 shadow-sm md:col-span-2">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Dirección</p>
                  <p className="font-bold text-[#000000]">{selectedBloguero.address || "No registrada"}</p>
                </div>
              </div>
            </CardContent>
            <div className="p-6 md:p-8 pt-0 flex justify-end">
                <Button
                  onClick={() => setShowBlogueroViewModal(false)}
                  className="bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[3px] border-[#000000] shadow-[5px_5px_0px_0px_#000000] font-black px-10 h-14 rounded-2xl transition-all"
                >
                  Cerrar
                </Button>
            </div>
          </Card>
        </div>
      )}

      {showBlogueroEditModal && selectedBloguero && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
          <Card className="my-auto w-[95vw] max-w-2xl overflow-hidden rounded-[2.5rem] border-[3px] border-[#000000] bg-[#fdfaf5] p-0 shadow-[10px_10px_0px_0px_#000000] animate-in zoom-in-95 duration-300 sm:w-full">
            <CardHeader className="relative rounded-t-[2.5rem] bg-[#93ABD9] border-b-[3px] border-[#000000] p-4 sm:p-6">
              <Button
                size="icon"
                disabled={isSubmittingBlogger}
                className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full border-[2px] border-[#000000] bg-white transition-all hover:bg-[#ffadad] sm:right-4 sm:top-4 sm:h-10 sm:w-10 disabled:opacity-50"
                onClick={() => setShowBlogueroEditModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="flex items-center gap-2 pr-12 pt-1 font-black text-lg sm:gap-3 sm:pt-2 sm:text-2xl">
                <Edit className="h-6 w-6 text-[#000000]" />
                Editar Bloguero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleUpdateBloguero} className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Nombre</Label>
                    <Input
                      value={blogueroForm.nombre}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, nombre: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Email</Label>
                    <Input
                      type="email"
                      value={blogueroForm.email}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, email: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Cédula</Label>
                    <Input
                      value={blogueroForm.cedula}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, cedula: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Teléfono</Label>
                    <Input
                      value={blogueroForm.telefono}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, telefono: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Ciudad</Label>
                    <Input
                      value={blogueroForm.city}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, city: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-70">Dirección</Label>
                    <Input
                      value={blogueroForm.address}
                      onChange={(e) => setBlogueroForm({ ...blogueroForm, address: e.target.value })}
                      required
                      className="h-12 border-[2px] border-[#000000]/20 rounded-xl"
                    />
                 </div>
                                   <div className="md:col-span-2 flex gap-4 pt-6 border-t-[3px] border-[#000000]/10">
                    <Button
                      type="submit"
                      disabled={isSubmittingBlogger}
                      className="flex-1 bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[3px] border-[#000000] shadow-[5px_5px_0px_0px_#000000] font-black h-14 rounded-2xl disabled:opacity-50"
                    >
                      {isSubmittingBlogger ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" /> Guardando…
                        </span>
                      ) : (
                        "Guardar Cambios"
                      )}
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmittingBlogger}
                      onClick={() => setShowBlogueroEditModal(false)}
                      className="flex-1 bg-white hover:bg-black/5 text-[#000000] border-[3px] border-[#000000] font-black h-14 rounded-2xl disabled:opacity-50"
                    >
                      Cancelar
                    </Button>
                  </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

BloggersTab.displayName = "BloggersTab";

interface SystemTabProps {
  veterinarios: UsuarioAdmin[];
  usuarios: UsuarioAdmin[];
  eventos: Evento[];
  solicitudesAdopcion: SolicitudAdmin[];
  perrosAdopcion: PerroAdopcion[];
  setActiveTab: (tab: TabType) => void;
  setAdopcionSubTab: (sub: "mascotas" | "solicitudes") => void;
  setShowPerroForm: (v: boolean) => void;
  setShowVetForm: (v: boolean) => void;
  setShowEventoForm: (v: boolean) => void;
  adminStats?: AdminStats | null;
  homeHeroExplainerContent: HomeHeroExplainerContent;
  setHomeHeroExplainerContent: React.Dispatch<
    React.SetStateAction<HomeHeroExplainerContent>
  >;
  handleSaveHomeHeroExplainer: (e: React.FormEvent) => Promise<void>;
  isSubmittingHomeHeroExplainer: boolean;
}

function SystemTab({
  veterinarios,
  usuarios,
  eventos,
  solicitudesAdopcion,
  perrosAdopcion,
  setActiveTab,
  setAdopcionSubTab,
  setShowPerroForm,
  setShowVetForm,
  setShowEventoForm,
  adminStats,
  homeHeroExplainerContent,
  setHomeHeroExplainerContent,
  handleSaveHomeHeroExplainer,
  isSubmittingHomeHeroExplainer,
}: SystemTabProps) {
  const pendientes = solicitudesAdopcion.filter(
    (s) => s.estado === "pendiente",
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
          Estadísticas y Configuración
        </h2>
        <p className="font-semibold opacity-70 text-[#000000]/70">
          Monitoreo general del sistema
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
          <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
            <CardTitle className="flex items-center gap-3 font-black font-heading text-xl">
              <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                <Activity className="h-5 w-5 text-[#000000]" />
              </div>
              Estadísticas Generales
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-6 pt-2 pb-8">
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Total Veterinarios</span>
              <span className="font-black tabular-nums">
                {veterinarios.length}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Total Usuarios</span>
              <span className="font-black tabular-nums">{usuarios.length}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Eventos Activos</span>
              <span className="font-black tabular-nums">{eventos.length}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Solicitudes Adopción</span>
              <span className="font-black tabular-nums">
                {solicitudesAdopcion.length}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Mascotas en adopción</span>
              <span className="font-black tabular-nums">
                {adminStats?.pets.shelterPets || perrosAdopcion.length}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5">
              <span className="font-bold">Mascotas de usuarios</span>
              <span className="font-black tabular-nums">
                {adminStats?.pets.userPets || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
          <CardHeader className="bg-[#ffc6ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
            <CardTitle className="flex items-center gap-3 font-black font-heading text-xl">
              <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                <Activity className="h-5 w-5 text-[#000000]" />
              </div>
              Accesos Rápidos
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-6 pt-2 pb-8">
            <Button
              className="w-full h-12 justify-start bg-white hover:bg-[#ffd6a5] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-bold rounded-2xl transition-all active:translate-y-1 active:shadow-none"
              onClick={() => {
                setActiveTab("adopciones");
                setAdopcionSubTab("mascotas");
                setShowPerroForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Mascota en Adopción
            </Button>
            <Button
              className="w-full h-12 justify-start bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-bold rounded-2xl transition-all active:translate-y-1 active:shadow-none"
              onClick={() => {
                setActiveTab("adopciones");
                setAdopcionSubTab("solicitudes");
              }}
            >
              <Heart className="h-4 w-4 mr-2" />
              Ver Solicitudes de Adopción
              {pendientes > 0 && (
                <Badge className="ml-auto bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000]">
                  {pendientes}
                </Badge>
              )}
            </Button>
            <Button
              className="w-full h-12 justify-start bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-bold rounded-2xl transition-all active:translate-y-1 active:shadow-none"
              onClick={() => {
                setActiveTab("veterinarios");
                setShowVetForm(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Veterinario
            </Button>
            <Button
              className="w-full h-12 justify-start bg-white hover:bg-[#ffc6ff] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-bold rounded-2xl transition-all active:translate-y-1 active:shadow-none"
              onClick={() => {
                setActiveTab("eventos");
                setShowEventoForm(true);
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Crear Evento
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardHeader className="bg-[#E7BEF8] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
          <CardTitle className="flex items-center gap-3 font-black font-heading text-xl">
            <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
              <LayoutGrid className="h-5 w-5 text-[#000000]" />
            </div>
            Contenido Explicativo del Inicio
          </CardTitle>
          <CardDescription className="font-semibold text-[#000000]/70 pt-2">
            Edita el bloque que reemplaza la flecha en el home: título principal y
            las tarjetas de Qué es, Cómo se usa y Descripción breve.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSaveHomeHeroExplainer} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-black">Título del bloque</Label>
              <Input
                value={homeHeroExplainerContent.heading}
                onChange={(e) =>
                  setHomeHeroExplainerContent((prev) => ({
                    ...prev,
                    heading: e.target.value,
                  }))
                }
                placeholder="¿Qué es y cómo se usa MIAUWUAUF?"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 rounded-2xl border-[2px] border-[#000000]/15 bg-white p-4">
                <Label className="font-black">Tarjeta 1 (Qué es)</Label>
                <Input
                  value={homeHeroExplainerContent.whatIsTitle}
                  onChange={(e) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      whatIsTitle: e.target.value,
                    }))
                  }
                  placeholder="¿Qué es?"
                />
                <Textarea
                  value={homeHeroExplainerContent.whatIsDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      whatIsDescription: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Explica qué es el proyecto"
                />
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-black text-[#000000]/70">Color de fondo</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color tarjeta Qué es"
                      value={normalizeHexColor(
                        homeHeroExplainerContent.whatIsCardBg,
                        defaultHomeHeroExplainerContent.whatIsCardBg,
                      )}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          whatIsCardBg: e.target.value,
                        }))
                      }
                      className="h-9 w-14 cursor-pointer rounded-md border-[2px] border-[#000000] bg-white p-0.5"
                    />
                    <Input
                      value={homeHeroExplainerContent.whatIsCardBg}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          whatIsCardBg: e.target.value,
                        }))
                      }
                      className="h-9 min-w-[6rem] flex-1 font-mono text-xs font-bold"
                      placeholder="#e7bef8"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border-[2px] border-[#000000]/15 bg-white p-4">
                <Label className="font-black">Tarjeta 2 (Cómo se usa)</Label>
                <Input
                  value={homeHeroExplainerContent.howToUseTitle}
                  onChange={(e) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      howToUseTitle: e.target.value,
                    }))
                  }
                  placeholder="¿Cómo se usa?"
                />
                <Textarea
                  value={homeHeroExplainerContent.howToUseDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      howToUseDescription: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Explica cómo usar la plataforma"
                />
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-black text-[#000000]/70">Color de fondo</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color tarjeta Cómo se usa"
                      value={normalizeHexColor(
                        homeHeroExplainerContent.howToUseCardBg,
                        defaultHomeHeroExplainerContent.howToUseCardBg,
                      )}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          howToUseCardBg: e.target.value,
                        }))
                      }
                      className="h-9 w-14 cursor-pointer rounded-md border-[2px] border-[#000000] bg-white p-0.5"
                    />
                    <Input
                      value={homeHeroExplainerContent.howToUseCardBg}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          howToUseCardBg: e.target.value,
                        }))
                      }
                      className="h-9 min-w-[6rem] flex-1 font-mono text-xs font-bold"
                      placeholder="#ede986"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border-[2px] border-[#000000]/15 bg-white p-4">
                <Label className="font-black">Tarjeta 3 (Descripción breve)</Label>
                <Input
                  value={homeHeroExplainerContent.shortDescriptionTitle}
                  onChange={(e) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      shortDescriptionTitle: e.target.value,
                    }))
                  }
                  placeholder="Descripción breve"
                />
                <Textarea
                  value={homeHeroExplainerContent.shortDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setHomeHeroExplainerContent((prev) => ({
                      ...prev,
                      shortDescription: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Resumen corto del valor del proyecto"
                />
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-black text-[#000000]/70">Color de fondo</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color tarjeta Descripción breve"
                      value={normalizeHexColor(
                        homeHeroExplainerContent.shortDescriptionCardBg,
                        defaultHomeHeroExplainerContent.shortDescriptionCardBg,
                      )}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          shortDescriptionCardBg: e.target.value,
                        }))
                      }
                      className="h-9 w-14 cursor-pointer rounded-md border-[2px] border-[#000000] bg-white p-0.5"
                    />
                    <Input
                      value={homeHeroExplainerContent.shortDescriptionCardBg}
                      onChange={(e) =>
                        setHomeHeroExplainerContent((prev) => ({
                          ...prev,
                          shortDescriptionCardBg: e.target.value,
                        }))
                      }
                      className="h-9 min-w-[6rem] flex-1 font-mono text-xs font-bold"
                      placeholder="#9bf6ff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmittingHomeHeroExplainer}
              className="h-11 border-[2px] border-[#000000] bg-[#EDE986] text-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-xl hover:bg-[#E7BEF8] active:translate-y-1 active:shadow-none"
            >
              {isSubmittingHomeHeroExplainer ? "Guardando..." : "Guardar bloque del inicio"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface UsersTabProps {
  usuarios: UsuarioAdmin[];

  handleDeleteUsuario: (id: string | number) => void;
  handleViewUser: (user: UsuarioAdmin) => void;
}

const UsersTab = memo(function UsersTab({
  usuarios,

  handleDeleteUsuario,
  handleViewUser,
}: UsersTabProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<10 | 20 | 50>(10);
  const USERS_PAGE_SIZE = perPage;

  const filteredUsuarios = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      [u.nombre, u.email, u.estado, u.telefono, u.cedula]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [usuarios, query]);

  const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / USERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsuarios = useMemo(
    () => filteredUsuarios.slice((currentPage - 1) * USERS_PAGE_SIZE, currentPage * USERS_PAGE_SIZE),
    [filteredUsuarios, currentPage, USERS_PAGE_SIZE]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
          Gestión de Usuarios
        </h2>
        <p className="font-semibold opacity-70 text-[#000000]/70">
          Ver y administrar cuentas de usuarios
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, email, estado o cédula..."
          className="h-11 border-[2px] border-[#000000]/20 rounded-xl bg-white md:max-w-md"
        />
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value) as 10 | 20 | 50);
            setPage(1);
          }}
          className="h-11 rounded-xl border-[2px] border-[#000000]/20 bg-white px-3 text-sm font-bold text-[#000000] md:w-40"
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
      </div>

     <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
  <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] p-4 md:p-6">
    <CardTitle className="font-black font-heading flex items-center gap-3 text-xl">
      <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
        <Users className="h-5 w-5 text-[#000000]" />
      </div>
      Usuarios Registrados
    </CardTitle>
  </CardHeader>

  <CardContent className="p-0">
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
    <Table className="w-full min-w-[600px] lg:min-w-0 border-collapse">
      {/* Eliminamos bg-black/5 y cualquier borde intermedio. 
        Usamos bg-transparent para que se funda con el fondo crema de la Card.
      */}
      <TableHeader className="bg-transparent border-none">
        <TableRow className="hover:bg-transparent border-none">
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Usuario
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Mascotas
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Estado
          </TableHead>
          <TableHead className="text-right font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Acciones
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {pagedUsuarios.map((user) => (
          <TableRow
            key={user.id}
            className="border-b-[2px] border-[#000000]/10 last:border-0 hover:bg-[#93ABD9]/5 transition-colors"
          >
            <TableCell className="py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#93ABD9] border-[2px] border-[#000000] flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#000000]" />
                </div>
                <div>
                  <p className="font-bold leading-tight">{user.nombre}</p>
                  <p className="text-sm opacity-60 mt-1">{user.email}</p>
                </div>
              </div>
            </TableCell>

            <TableCell className="py-4 px-6">
              <Badge className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
                <PawPrint className="h-3.5 w-3.5 text-[#93ABD9]" />
                {(user.mascotas || []).length}
              </Badge>
            </TableCell>

            <TableCell className="py-4 px-6">
              <Badge
                className={`border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000] ${
                  user.estado === "activo" 
                    ? "bg-[#93ABD9] text-[#000000]" 
                    : "bg-[#ffadad] text-[#000000]"
                }`}
              >
                {user.estado}
              </Badge>
            </TableCell>

            <TableCell className="text-right py-4 px-6">
              <div className="flex justify-end gap-3">
                <Button
                  size="icon"
                  onClick={() => handleViewUser(user)}
                  title="Ver Perfil Detallado"
                  className="h-10 w-10 bg-white hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Eye className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleDeleteUsuario(user.id)}
                  title="Eliminar Usuario"
                  className="h-10 w-10 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>

    {filteredUsuarios.length > 0 && (
      <div className="flex items-center justify-between border-t-[2px] border-[#000000]/10 px-4 py-3">
        <p className="text-xs font-bold text-[#000000]/60">
          Mostrando {pagedUsuarios.length} de {filteredUsuarios.length} usuarios
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 border-[2px] border-[#000000] font-black"
          >
            Anterior
          </Button>
          <span className="text-xs font-black px-2">
            {currentPage}/{totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 border-[2px] border-[#000000] font-black"
          >
            Siguiente
          </Button>
        </div>
      </div>
    )}
  </CardContent>
</Card>
    </div>
  );
});

UsersTab.displayName = "UsersTab";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  detail,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  detail: string;
}) {
  return (
    <Card
      className={`border-[3px] border-[#000000] ${color} text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform`}
    >
      <CardContent className="p-4 md:p-6 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-6">
          <div className="p-2 border-[2px] border-[#000000] rounded-full bg-transparent">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-4xl font-black tracking-tighter">{value}</span>
        </div>
        <div>
          <h3 className="font-black font-heading text-xl mb-1 flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs font-bold opacity-70">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


function StatItemMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`p-4 ${color} rounded-2xl border-[2px] border-[#000000] flex items-center justify-between`}
    >
      <span className="font-bold">{label}</span>
      <span className="font-black text-2xl">{value}</span>
    </div>
  );
}

interface ProductsTabProps {
  productos: TiendaProducto[];
  categories: CategoryStore[];
  subcategories: SubcategoryStore[];
  showProductoForm: boolean;
  setShowProductoForm: (v: boolean) => void;
  productoForm: ProductoFormData;
  setProductoForm: React.Dispatch<React.SetStateAction<ProductoFormData>>;
  handleCreateProducto: (e: React.FormEvent) => void;
  isSubmittingProduct: boolean;
  handleDeleteProducto: (id: string) => void;
  handleEditProducto: (prod: TiendaProducto) => void;
  editingProductoId: string | null;
  setEditingProductoId: (id: string | null) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

const ProductsTab = memo(function ProductsTab({
  productos,
  categories,
  subcategories,
  showProductoForm,
  setShowProductoForm,
  productoForm,
  setProductoForm,
  handleCreateProducto,
  handleDeleteProducto,
  handleEditProducto,
  editingProductoId,
  setEditingProductoId,
  isUploading,
  setIsUploading,
  isSubmittingProduct,
}: ProductsTabProps) {
  const [step, setStep] = useState(1);
  const [productsSearch, setProductsSearch] = useState("");
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState<9 | 18 | 36>(9);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showProductoForm) {
      const timer = setTimeout(() => {
        setStep(1);
        const formElement = document.getElementById("producto-form-container");
        if (formElement) {
          formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editingProductoId, showProductoForm]);

  const steps = [
    { id: 1, title: "Básico", icon: LayoutGrid },
    { id: 2, title: "Inventario", icon: Package },
    { id: 3, title: "Galería", icon: ImageIcon },
  ];
  const PRODUCTS_PAGE_SIZE = productsPerPage;
  const filteredProducts = useMemo(() => {
    const q = productsSearch.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      [p.nombre, p.categoria, p.subcategoria, p.marca, p.descripcion, p.etiqueta]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [productos, productsSearch]);
  const totalProductsPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const currentProductsPage = Math.min(productsPage, totalProductsPages);
  const pagedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (currentProductsPage - 1) * PRODUCTS_PAGE_SIZE,
        currentProductsPage * PRODUCTS_PAGE_SIZE
      ),
    [filteredProducts, currentProductsPage, PRODUCTS_PAGE_SIZE]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => validateUpload(file));
    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.secure_url;

          setProductoForm((prev: ProductoFormData) => {
            const currentImages = Array.isArray(prev.imagenes)
              ? prev.imagenes
              : [];
            if (!prev.foto) {
              return { ...prev, foto: url };
            } else if (!currentImages.includes(url) && prev.foto !== url) {
              return { ...prev, imagenes: [...currentImages, url] };
            }
            return prev;
          });
        } else {
          toast.error("Error al subir una de las imágenes");
        }
      }
      toast.success("Imágenes subidas correctamente");
    } catch (error) {
      console.error("Error upload product image:", error);
      toast.error("Error de conexión al subir imágenes");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (imgToRemove: string) => {
    if (productoForm.foto === imgToRemove) {
      // Si quitamos la principal, intentar mover la primera de la galería a la principal
      const currentImages = Array.isArray(productoForm.imagenes)
        ? productoForm.imagenes
        : [];
      if (currentImages.length > 0) {
        const newMain = currentImages[0];
        const remaining = currentImages.slice(1);
        setProductoForm((prev: ProductoFormData) => ({
          ...prev,
          foto: newMain,
          imagenes: remaining,
        }));
      } else {
        setProductoForm((prev: ProductoFormData) => ({ ...prev, foto: "" }));
      }
    } else {
      const currentImages = Array.isArray(productoForm.imagenes)
        ? productoForm.imagenes
        : [];
      const filtered = currentImages.filter(
        (img: string) => img !== imgToRemove,
      );
      setProductoForm((prev: ProductoFormData) => ({
        ...prev,
        imagenes: filtered,
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#000000]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
            Gestión de Tienda
          </h2>
          <p className="font-semibold opacity-70 text-[#000000]/70">
            Administrar productos, precios y categorías
          </p>
        </div>
        <Button
          disabled={isSubmittingProduct}
          onClick={() => {
            if (showProductoForm) {
              setShowProductoForm(false);
              setEditingProductoId(null);
              setStep(1);
              setProductoForm({
                nombre: "",
                precio: "",
                categoria: "perros",
                subcategoria: "",
                marca: "",
                stock: "0",
                foto: "",
                imagenes: [],
                descripcion: "",
                etiqueta: "",
                descuento: "0",
                descuentoDias: "0",
              });
            } else {
              setShowProductoForm(true);
              setStep(1);
            }
          }}
          className="gap-2 bg-[#93ABD9] hover:bg-[#ff9933] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none whitespace-nowrap disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {editingProductoId ? "Editando Producto" : "Nuevo Producto"}
        </Button>
      </div>

      {showProductoForm && (
        <Card
          id="producto-form-container"
          className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[8px_8px_0px_0px_#000000] rounded-[2rem] overflow-hidden p-0 gap-0 animate-in slide-in-from-top duration-300"
        >
          <div className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[1.8rem] p-8">
            <CardTitle className="font-black font-heading text-2xl flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl border-[2.5px] border-[#000000] shadow-[3px_3px_0px_0px_#000000]">
                <ShoppingBag className="h-7 w-7 text-[#000000]" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">
                  {editingProductoId
                    ? `Editando: ${productoForm.nombre}`
                    : "Registrar Nuevo Producto"}
                </span>
                <span className="text-xs font-bold opacity-60 uppercase tracking-widest mt-1">
                  Gestión de Inventario
                </span>
              </div>
            </CardTitle>


            <div className="flex items-center justify-between mt-8 max-w-md mx-auto relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#000000]/20 -translate-y-1/2 z-0" />
              {steps.map((s) => (
                <div
                  key={s.id}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-10 h-10 rounded-full border-[2px] border-[#000000] flex items-center justify-center transition-all duration-300 ${
                      step >= s.id
                        ? "bg-[#93ABD9] text-[#000000] shadow-[2px_2px_0px_0px_#000000]"
                        : "bg-white text-[#000000]/40"
                    }`}
                  >
                    {step > s.id ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <s.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-tight ${step >= s.id ? "opacity-100" : "opacity-40"}`}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <CardContent className="p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 3) {
                  handleCreateProducto(e);
                } else {
                  setStep(step + 1);
                }
              }}
              className="space-y-6"
            >
              {step === 1 && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2 text-[#000000]">
                    <Label className="font-bold flex items-center gap-2 px-1">
                      <FileText className="h-3 w-3" /> Nombre del Producto
                    </Label>
                    <Input
                      placeholder="Ej. Collar GPS Gold"
                      value={productoForm.nombre}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          nombre: e.target.value,
                        })
                      }
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      Categoría
                    </Label>
                    <select
                      className="flex h-12 w-full rounded-xl border-[2px] border-foreground/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000]"
                      value={productoForm.categoria}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          categoria: e.target.value,
                        })
                      }
                    >
                      <option value="" disabled>Seleccione una categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.nombre}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      Subcategoría
                    </Label>
                    <select
                      className="flex h-12 w-full rounded-xl border-[2px] border-foreground/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000]"
                      value={productoForm.subcategoria}
                      onChange={(e) =>
                        setProductoForm({ ...productoForm, subcategoria: e.target.value })
                      }
                    >
                      <option value="">Sin subcategoría</option>
                      {subcategories
                        .filter((s) => {
                          const cat = categories.find((c) => c.nombre === productoForm.categoria);
                          return cat ? s.categoryId === cat.id : true;
                        })
                        .map((sub) => (
                          <option key={sub.id} value={sub.nombre}>{sub.nombre}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      Marca
                    </Label>
                    <Input
                      placeholder="Ej. Royal Canin"
                      value={productoForm.marca}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          marca: e.target.value,
                        })
                      }
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      Descripción Completa
                    </Label>
                    <textarea
                      placeholder="Descripción detallada del producto..."
                      value={productoForm.descripcion}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          descripcion: e.target.value,
                        })
                      }
                      required
                      rows={4}
                      className="flex min-h-[120px] w-full rounded-xl border-[2px] border-foreground/20 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000]"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      <DollarSign className="h-3 w-3" /> Precio ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={productoForm.precio}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          precio: e.target.value,
                        })
                      }
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      Descuento (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={productoForm.descuento}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          descuento: e.target.value,
                        })
                      }
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                  {Number(productoForm.descuento) > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                        <Clock className="h-3 w-3" /> Duración del descuento (Días)
                      </Label>
                      <Input
                        type="number"
                        placeholder="Ej. 15"
                        value={productoForm.descuentoDias}
                        onChange={(e) =>
                          setProductoForm({
                            ...productoForm,
                            descuentoDias: e.target.value,
                          })
                        }
                        className="border-[2px] border-[#93ABD9] rounded-xl bg-[#93ABD9]/5 shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                      />
                      <p className="text-[10px] font-bold text-[#93ABD9] px-1">
                        El descuento se quitará automáticamente al vencer.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      <Package className="h-3 w-3" /> Stock Disponible
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={productoForm.stock}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          stock: e.target.value,
                        })
                      }
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                      <Tag className="h-3 w-3" /> Etiqueta (Ej. Nuevo, Oferta)
                    </Label>
                    <Input
                      placeholder="Nuevo"
                      value={productoForm.etiqueta}
                      onChange={(e) =>
                        setProductoForm({
                          ...productoForm,
                          etiqueta: e.target.value,
                        })
                      }
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9] text-[#000000] h-12"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid md:grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-4">
                        <Label className="font-bold flex items-center gap-2 px-1 text-[#000000]">
                          <ImageIcon className="h-4 w-4 text-[#93ABD9]" />{" "}
                          Imágenes del Producto
                        </Label>

                        <div
                          className={`relative border-[3px] border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 group cursor-pointer ${
                            isUploading
                              ? "border-[#93ABD9]/50 bg-[#93ABD9]/5"
                              : "border-[#000000]/20 hover:border-[#93ABD9]/50 hover:bg-[#93ABD9]/5 bg-white"
                          }`}
                          onClick={() =>
                            !isUploading && fileInputRef.current?.click()
                          }
                        >
                          <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            multiple
                          />

                          {isUploading ? (
                            <div className="flex flex-col items-center gap-3 animate-pulse">
                              <div className="w-12 h-12 rounded-full border-4 border-t-[#93ABD9] border-white/20 animate-spin" />
                              <p className="font-black text-sm uppercase tracking-widest text-[#000000]/60">
                                Subiendo Imágenes...
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-full bg-[#93ABD9]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="h-8 w-8 text-[#93ABD9]" />
                              </div>
                              <div className="text-center">
                                <p className="font-black text-lg text-[#000000]">
                                  Seleccionar Archivos
                                </p>
                                <p className="text-xs font-bold text-[#000000]/50">
                                  Formatos: JPG, PNG, WEBP (Máx. 5MB cada uno)
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] font-bold opacity-50 px-1 italic">
                          Subiendo imagenes .
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-80 p-4 rounded-3xl bg-black/5 border-[3px] border-dashed border-[#000000]/20 flex flex-col gap-3 min-h-[300px]">
                      <Label className="font-black text-xs uppercase opacity-40 mb-1 flex items-center justify-between">
                        Previsualización de Galería
                        <Badge className="bg-[#93ABD9] text-[#000000] border-none text-[8px]">
                          CARRUSEL
                        </Badge>
                      </Label>

                      <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[400px] pr-1 min-h-0 sm:grid-cols-2">
                        {productoForm.foto && (
                          <div className="relative isolate aspect-square overflow-hidden rounded-xl border-[2px] border-[#000000] bg-white shadow-[2px_2px_0px_0px_#000000] group">
                            <Image
                              src={productoForm.foto}
                              alt="main"
                              fill
                              sizes="(max-width:640px) 100vw, 200px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                type="button"
                                variant="destructive"
                                className="h-7 w-7 rounded-lg"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(productoForm.foto);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Badge className="absolute top-1 left-1 bg-[#93ABD9] text-[#000000] text-[8px] border-none px-1">
                              PRINCIPAL
                            </Badge>
                          </div>
                        )}
                        {Array.isArray(productoForm.imagenes) &&
                          productoForm.imagenes.map(
                            (img: string, idx: number) => (
                              <div
                                key={idx}
                                className="relative isolate aspect-square overflow-hidden rounded-xl border-[2px] border-[#000000]/40 bg-white group"
                              >
                                <Image
                                  src={img}
                                  alt={`gallery-${idx}`}
                                  fill
                                  sizes="(max-width:640px) 100vw, 200px"
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    size="icon"
                                    type="button"
                                    variant="destructive"
                                    className="h-7 w-7 rounded-lg"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeImage(img);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                        {!productoForm.foto &&
                          (!productoForm.imagenes ||
                            productoForm.imagenes.length === 0) && (
                            <div className="md:col-span-2 flex flex-col items-center justify-center gap-2 h-40 opacity-30">
                              <ImageIcon className="h-10 w-10" />
                              <p className="text-[10px] font-black text-center px-4">
                                Sube fotos para ver el carrusel aquí
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t-[2px] border-[#000000]/5 px-1 pt-4 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmittingProduct}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStep(step - 1);
                    }}
                    className="order-2 box-border w-full border-[2px] border-[#000000] bg-white px-4 py-2.5 font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-black/5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:order-1 sm:w-auto sm:shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmittingProduct || isUploading}
                    className="order-1 box-border min-h-11 w-full border-[2px] border-[#000000] bg-[#93ABD9] px-3 py-2.5 text-base font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:bg-[#86b1f2] active:translate-y-1 active:shadow-none disabled:opacity-50 sm:order-2 sm:flex-1 sm:min-w-[12rem]"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmittingProduct || isUploading}
                    className="order-1 box-border min-h-11 w-full border-[2px] border-[#000000] bg-[#93ABD9] px-3 py-2.5 text-base font-black leading-snug text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:bg-[#ff9933] active:translate-y-1 active:shadow-none disabled:opacity-50 sm:order-2 sm:flex-1 sm:min-w-0"
                  >
                    {isSubmittingProduct ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                      </span>
                    ) : editingProductoId ? (
                      "Guardar Cambios Finales"
                    ) : (
                      "¡Crear Producto Ahora!"
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmittingProduct}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProductoForm(false);
                    setEditingProductoId(null);
                    setStep(1);
                    setProductoForm({
                      nombre: "",
                      precio: "",
                      categoria: "perros",
                      subcategoria: "",
                      marca: "",
                      stock: "0",
                      foto: "",
                      imagenes: [],
                      descripcion: "",
                      etiqueta: "",
                      descuento: "0",
                      descuentoDias: "0",
                    });
                  }}
                  className="order-3 box-border w-full border-[2px] border-[#000000] bg-white/90 px-4 py-2.5 font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-black/5 disabled:opacity-50 sm:ml-auto sm:w-auto sm:shrink-0"
                >
                  Cerrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="max-w-md">
        <Input
          value={productsSearch}
          onChange={(e) => {
            setProductsSearch(e.target.value);
            setProductsPage(1);
          }}
          placeholder="Buscar producto por nombre, marca o categoría..."
          className="h-11 border-[2px] border-[#000000]/20 rounded-xl bg-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pagedProducts.map((prod) => (
          <Card
            key={prod.id}
            className="border-[3px] border-[#000000] bg-white text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden animate-scale-in group hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#000000] transition-all p-0"
          >
            <div className="h-48 relative overflow-hidden bg-[#fdfaf5] border-b-[3px] border-[#000000]">

              <Image
                src={prod.foto || "/placeholder.svg"}
                alt={prod.nombre}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {prod.etiqueta && (
                <Badge className="absolute top-3 right-3 bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] font-black shadow-[2px_2px_0px_0px_#000000]">
                  {prod.etiqueta.toUpperCase()}
                </Badge>
              )}
              {prod.descuento && (
                <Badge className="absolute top-3 left-3 bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] font-black shadow-[2px_2px_0px_0px_#000000]">
                  -{prod.descuento}%
                </Badge>
              )}
            </div>
<CardHeader className="bg-white border-b-[3px] border-[#000000] p-6">

              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl font-black font-heading leading-tight">
                      {prod.nombre}
                    </CardTitle>
                    {prod.stock === 0 && (
                      <Badge className="bg-[#ffadad] text-[#000000] border-none text-[10px] px-1.5 py-0 font-black">
                        SIN STOCK
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">
                    {prod.categoria}{" "}
                    {prod.subcategoria && `> ${prod.subcategoria}`}{" "}
                    {prod.marca && `| ${prod.marca}`}
                  </p>
                  <p className="text-[10px] font-black text-[#000000]/50 uppercase tracking-[0.2em]">
                    {prod.productCode ?? formatPrefixedSequence("PRD", prod.displayId, prod.id)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex flex-col items-end">
                    {prod.descuento ? (
                      <>
                        <span className="text-xs line-through opacity-40 font-bold">
                          ${(prod.precio || 0).toFixed(2)}
                        </span>
                        <p className="text-2xl font-black text-[#7e6ccb]">
                          $
                          {(
                            (prod.precio || 0) *
                            (1 - (prod.descuento || 0) / 100)
                          ).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-black text-[#7e6ccb]">
                        ${(prod.precio || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="flex gap-3 mb-6">
                <Button
                  size="sm"
                  onClick={() => handleEditProducto(prod)}
                  className="flex-1 bg-[#93ABD9] hover:bg-[#86b1f2] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-xl h-11 transition-all active:translate-y-1 active:shadow-none"
                >
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleDeleteProducto(prod.id)}
                  className="h-11 w-11 bg-white hover:bg-[#ffadad] text-[#ffadad] hover:text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs font-semibold opacity-80 line-clamp-2 mb-3 italic leading-relaxed">
                {prod.descripcion}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#000000]/10">
                {prod.stock > 0 && prod.stock <= 5 ? (
                  <span className="text-xs font-black text-[#ffadad] animate-pulse">
                    ULTIMAS {prod.stock}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold opacity-50">
                    Stock: {prod.stock}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border-[2px] border-[#000000]/10 bg-white/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-[#000000]/60">
              Mostrando {pagedProducts.length} de {filteredProducts.length} productos
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#000000]/60">Por página</span>
              <select
                value={productsPerPage}
                onChange={(e) => {
                  setProductsPerPage(Number(e.target.value) as 9 | 18 | 36);
                  setProductsPage(1);
                }}
                className="h-8 rounded-lg border-[2px] border-[#000000]/30 bg-white px-2 text-xs font-black"
              >
                {[9, 18, 36].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentProductsPage <= 1}
              onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
              className="h-8 border-[2px] border-[#000000] font-black"
            >
              Anterior
            </Button>
            <span className="text-xs font-black px-2">
              {currentProductsPage}/{totalProductsPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentProductsPage >= totalProductsPages}
              onClick={() => setProductsPage((p) => Math.min(totalProductsPages, p + 1))}
              className="h-8 border-[2px] border-[#000000] font-black"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

ProductsTab.displayName = "ProductsTab";

// --- TAB: PLANES ---

interface PlanesTabProps {
  planes: Plan[];
  showPlanForm: boolean;
  setShowPlanForm: (v: boolean) => void;
  editingPlanId: string | null;
  setEditingPlanId: (v: string | null) => void;
  planForm: PlanFormData;
  setPlanForm: React.Dispatch<React.SetStateAction<PlanFormData>>;
  featureInput: string;
  setFeatureInput: (v: string) => void;
  handleCreatePlan: (e: React.FormEvent) => void;
  handleEditPlan: (plan: Plan) => void;
  handleDeletePlan: (id: string) => void;
  isSubmittingPlan: boolean;

  // Dynamic Content Props
  sectionContent: SectionContent;
  setSectionContent: React.Dispatch<React.SetStateAction<SectionContent>>;
  handleSaveSectionContent: (e: React.FormEvent) => Promise<boolean>;
  allPlanSections: SectionContent[];
  handleCreateNewSection: (data: SectionContent) => Promise<boolean>;
  isSubmittingPlanSection: boolean;
  handleDeleteSection: (sectionId: string) => void;
  setModalConfirmacion: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
  addFeature: () => void;
  removeFeature: (index: number) => void;
  planWhatsappPhone: string;
  setPlanWhatsappPhone: React.Dispatch<React.SetStateAction<string>>;
  handleSavePlanWhatsappContact: (e: React.FormEvent) => Promise<boolean>;
  isSubmittingPlanWhatsapp: boolean;
  planWhatsappDetailsText: string;
  setPlanWhatsappDetailsText: React.Dispatch<React.SetStateAction<string>>;
}

function PlanesTab({
  planes,
  showPlanForm,
  setShowPlanForm,
  editingPlanId,
  setEditingPlanId,
  planForm,
  setPlanForm,
  featureInput,
  setFeatureInput,
  handleCreatePlan,
  handleEditPlan,
  handleDeletePlan,
  isSubmittingPlan,
  addFeature,
  removeFeature,
  sectionContent,
  setSectionContent,
  handleSaveSectionContent,
  allPlanSections,
  handleCreateNewSection,
  handleDeleteSection,
  setModalConfirmacion,
  isSubmittingPlanSection,
  planWhatsappPhone,
  setPlanWhatsappPhone,
  handleSavePlanWhatsappContact,
  isSubmittingPlanWhatsapp,
  planWhatsappDetailsText,
  setPlanWhatsappDetailsText,
}: PlanesTabProps) {
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 1. SECCIÓN: CABECERAS Y SELECCIÓN DE SECCIÓN */}
      {/* 1. SECCIÓN: GESTIÓN DE SECCIONES (LISTADO) */}
      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[21px] p-6 flex flex-row items-center justify-between">
          <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" /> Secciones de Planes
          </CardTitle>
          <Button
            size="sm"
            disabled={isSubmittingPlanSection}
            onClick={() => {
              setSectionContent({ sectionId: "", badge: "", title: "", subtitle: "" });
              setShowNewSectionInput(!showNewSectionInput);
            }}
            className="bg-white hover:bg-white/80 text-[#000000] border-[2px] border-[#000000] font-black rounded-lg h-9 gap-2 shadow-[2px_2px_0px_0px_#000000] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Nueva Sección
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {showNewSectionInput && (
            <div className="p-6 border-b-[2px] border-[#000000]/10 bg-white/50 animate-in slide-in-from-top duration-300">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  let ok = false;
                  if (sectionContent.sectionId) {
                    ok = await handleSaveSectionContent(e);
                  } else if (newSectionName.trim()) {
                    ok = await handleCreateNewSection({ ...sectionContent, sectionId: newSectionName.trim() });
                  }
                  if (ok) {
                    setNewSectionName("");
                    setShowNewSectionInput(false);
                  }
                }} 
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {!sectionContent.sectionId && (
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase opacity-60">ID / Nombre Identificador</Label>
                      <Input
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="Ej: alimentacion-premium"
                        className="border-[2px] border-[#000000]/20 rounded-xl bg-white"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-60">Etiqueta (Badge)</Label>
                    <Input
                      value={sectionContent.badge || ""}
                      onChange={(e) => setSectionContent({ ...sectionContent, badge: e.target.value })}
                      placeholder="TECNOLOGÍA"
                      className="border-[2px] border-[#000000]/20 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-60">Título Principal</Label>
                    <Input
                      value={sectionContent.title || ""}
                      onChange={(e) => setSectionContent({ ...sectionContent, title: e.target.value })}
                      placeholder="Nuestros Planes"
                      className="border-[2px] border-[#000000]/20 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase opacity-60">Descripción</Label>
                    <Input
                      value={sectionContent.subtitle || ""}
                      onChange={(e) => setSectionContent({ ...sectionContent, subtitle: e.target.value })}
                      placeholder="Elige el mejor..."
                      className="border-[2px] border-[#000000]/20 rounded-xl bg-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmittingPlanSection}
                    onClick={() => {
                      setShowNewSectionInput(false);
                      setNewSectionName("");
                    }}
                    className="font-bold disabled:opacity-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingPlanSection}
                    className="bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl px-6 disabled:opacity-50"
                  >
                    {isSubmittingPlanSection ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                      </span>
                    ) : sectionContent.sectionId ? (
                      "Guardar Cambios"
                    ) : (
                      "Crear Sección"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
          <Table className="min-w-[520px] md:min-w-full">
            <TableHeader className="bg-[#000000]/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-black text-[#000000] uppercase text-[10px] tracking-widest">ID Sección</TableHead>
                <TableHead className="font-black text-[#000000] uppercase text-[10px] tracking-widest">Título / Cabecera</TableHead>
                <TableHead className="font-black text-[#000000] uppercase text-[10px] tracking-widest text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPlanSections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 opacity-40 font-bold italic">
                    No hay secciones creadas actualmente.
                  </TableCell>
                </TableRow>
              ) : (
                allPlanSections.map((sec) => (
                  <TableRow key={sec.sectionId} className="border-b-[2px] border-[#000000]/5 last:border-0 hover:bg-[#93ABD9]/5 transition-colors">
                    <TableCell className="font-black text-sm">{sec.sectionId}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-bold text-[#000000]">{sec.title || "Sin título"}</p>
                        {sec.badge && (
                          <Badge className="bg-[#ffd6a5] text-[#000000] border-[1px] border-[#000000] text-[9px] font-black">{sec.badge}</Badge>
                        )}
                        <p className="text-xs opacity-60 line-clamp-1">{sec.subtitle}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSectionContent(sec);
                            setShowNewSectionInput(true);
                            window.scrollTo({ top: document.getElementById('planes-header')?.offsetTop || 0, behavior: 'smooth' });
                          }}
                          className="h-8 w-8 hover:bg-[#93ABD9] hover:text-[#000000] border-[2px] border-transparent hover:border-[#000000] transition-all rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {sec.sectionId !== "products-plans" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setModalConfirmacion({
                                isOpen: true,
                                title: "Eliminar Sección",
                                description: "¿Estás seguro de eliminar esta sección? Todos los planes asociados a ella dejarán de mostrarse en la landing page.",
                                onConfirm: () => handleDeleteSection(sec.sectionId),
                              });
                            }}
                            className="h-8 w-8 hover:bg-[#ffadad] hover:text-[#000000] border-[2px] border-transparent hover:border-[#000000] transition-all rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
          <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp para Elegir Plan
          </CardTitle>
          <CardDescription className="font-semibold text-[#000000]/70">
            A este numero se enviaran los mensajes de las personas cuando hagan clic en Elegir Plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSavePlanWhatsappContact} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Numero de WhatsApp que recibe consultas</Label>
              <Input
                placeholder="Ej: +593991112233"
                value={planWhatsappPhone}
                onChange={(e) => setPlanWhatsappPhone(e.target.value)}
                className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
              />
              <p className="text-xs font-semibold text-[#000000]/60">
                Recomendado: incluye codigo de pais. Ejemplo: +593...
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSubmittingPlanWhatsapp}
              className="bg-[#93ABD9] hover:bg-[#ff9c3a] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              {isSubmittingPlanWhatsapp ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </span>
              ) : (
                "Guardar Número"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. SECCIÓN: GESTIÓN DE PLANES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
              Gestión de Planes
            </h2>
            <p className="font-semibold opacity-70 text-[#000000]/70">
              Administrar planes de protección para la landing page
            </p>
          </div>
          <Button
            disabled={isSubmittingPlan}
            onClick={() => {
              if (showPlanForm && !editingPlanId) {
                setShowPlanForm(false);
                setPlanWhatsappDetailsText("");
              } else {
                setEditingPlanId(null);
                setPlanWhatsappDetailsText("");
                setPlanForm({
                  name: "",
                  price: "$",
                  description: "",
                  features: [],
                  badge: "",
                  color: "bg-primary",
                  sectionId: sectionContent.sectionId || "products-plans",
                  billingCycle: "al mes",
                });
                setShowPlanForm(true);
              }
            }}
            className="gap-2 bg-[#93ABD9] hover:bg-[#ff9c3a] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            {showPlanForm && editingPlanId
              ? "Nuevo Plan"
              : showPlanForm
                ? "Cerrar Formulario"
                : "Nuevo Plan"}
          </Button>
        </div>

        {showPlanForm && (
          <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
            <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
              <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {editingPlanId
                  ? "Editar Plan de Protección"
                  : "Crear Nuevo Plan"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreatePlan} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nombre del Plan</Label>
                    <Input
                      placeholder="Plan Básico"
                      value={planForm.name}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, name: e.target.value })
                      }
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Sección a la que pertenece</Label>
                    <select
                      value={planForm.sectionId}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, sectionId: e.target.value })
                      }
                      required
                      className="flex h-10 w-full rounded-xl border-[2px] border-foreground/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                    >
                      {allPlanSections.map((s) => (
                        <option key={s.sectionId} value={s.sectionId}>
                          {s.title || s.sectionId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Precio (Ej: $29.99)</Label>
                    <Input
                      placeholder="$29.99"
                      value={planForm.price}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith("$")) val = "$" + val;
                        setPlanForm({ ...planForm, price: val });
                      }}
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Ciclo (Ej: al mes, anual)</Label>
                    <Input
                      placeholder="al mes"
                      value={planForm.billingCycle}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, billingCycle: e.target.value })
                      }
                      required
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">
                      Etiqueta/Badge <span className="text-[#000000]/40 font-normal text-xs">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ej: RECOMENDADO, BÁSICO, GRATIS..."
                      value={planForm.badge}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, badge: e.target.value })
                      }
                      className="border-[2px] border-foreground/20 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#93ABD9]"
                    />
                    <p className="text-xs text-[#000000]/40 font-medium">Si lo dejas vacío, no aparecerá etiqueta en la tarjeta.</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Color del Badge/Botón
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Dorado", value: "bg-[#FFD97D]", hex: "#FFD97D" },
                        { label: "Salmón", value: "bg-[#FF9B85]", hex: "#FF9B85" },
                        { label: "Menta", value: "bg-[#B9FBC0]", hex: "#B9FBC0" },
                        { label: "Lavanda", value: "bg-[#CFBAF0]", hex: "#CFBAF0" },
                        { label: "Cielo", value: "bg-[#A3C4F3]", hex: "#A3C4F3" },
                        { label: "Rosa Pop", value: "bg-[#F1C0E8]", hex: "#F1C0E8" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPlanForm({ ...planForm, color: opt.value })}
                          className={`group relative flex flex-col items-center gap-1 transition-all`}
                        >
                          <span
                            className={`w-10 h-10 rounded-xl border-[3px] transition-all ${
                              planForm.color === opt.value
                                ? "border-[#000000] scale-110 shadow-[3px_3px_0px_0px_#000000]"
                                : "border-[#000000]/20 hover:border-[#000000]/50"
                            }`}
                            style={{ backgroundColor: opt.hex }}
                          />
                          <span className="text-[10px] font-black text-[#000000]/60 uppercase">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Descripción Corta</Label>
                  <textarea
                    className="w-full p-3 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] outline-none min-h-[80px] resize-none"
                    placeholder="Pequeña descripción del plan..."
                    value={planForm.description}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Detalle Extra para WhatsApp (Opcional)</Label>
                  <textarea
                    className="w-full p-3 rounded-xl border-[2px] border-foreground/20 bg-white shadow-sm focus:ring-2 focus:ring-[#93ABD9] outline-none min-h-[180px] resize-y"
                    placeholder="Ej: Incluye cobertura 24/7, asistencia en emergencias, visitas a domicilio, etc."
                    value={planWhatsappDetailsText}
                    onChange={(e) => setPlanWhatsappDetailsText(e.target.value)}
                  />
                  <p className="text-xs font-semibold text-[#000000]/60">
                    Este texto solo se usa para el mensaje de WhatsApp cuando el usuario toca el boton Elegir Plan.
                  </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 border-t-[2px] border-[#000000]/10 pt-6">
                  {/* Features Column */}
                  <div className="space-y-4">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider block">
                       Características del Plan
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej. GPS en tiempo real"
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                        className="border-[2px] border-[#000000]/20 rounded-xl bg-white h-12 font-semibold"
                      />
                      <Button
                        type="button"
                        onClick={addFeature}
                        className="bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-black rounded-xl transition-all h-12"
                      >
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
                      {planForm.features.map((feature: string, idx: number) => (
                        <Badge
                          key={idx}
                          className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-xl py-1.5 pl-3 pr-1 gap-2 shadow-[2px_2px_0px_0px_#000000] font-black text-xs"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(idx)}
                            className="h-5 w-5 flex items-center justify-center hover:bg-[#ffadad] rounded-lg transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {planForm.features.length === 0 && (
                        <p className="text-xs font-bold text-[#000000]/40 italic py-2">No hay características añadidas aún.</p>
                      )}
                    </div>
                  </div>

                  {/* Live Preview Column */}
                  <div className="space-y-4">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider block">
                       Vista Previa (Live Preview)
                    </Label>
                    <div className="border-[3px] border-[#000000] rounded-3xl bg-white shadow-[6px_6px_0px_0px_#000000] overflow-hidden p-6 relative">
                      {planForm.badge && (
                        <div className={`absolute top-4 right-4 ${planForm.color} text-[#000000] text-[10px] font-black px-3 py-1 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] uppercase`}>
                          {planForm.badge}
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xl font-black font-heading">{planForm.name || "Nombre del Plan"}</h4>
                          <p className="text-3xl font-black text-[#000000] mt-1">{planForm.price || "$0.00"}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#000000]/60 line-clamp-2">{planForm.description || "Descripción del plan..."}</p>
                        <div className="space-y-2 pt-2">
                          {planForm.features.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold">
                              <CheckCircle className="h-3.5 w-3.5 text-[#52b788]" />
                              <span>{f}</span>
                            </div>
                          ))}
                          {planForm.features.length > 3 && (
                            <p className="text-[10px] font-black text-[#000000]/40 ml-5">+{planForm.features.length - 3} más...</p>
                          )}
                        </div>
                        <div className={`w-full py-2.5 rounded-xl border-[2px] border-[#000000] ${planForm.color} shadow-[3px_3px_0px_0px_#000000] text-center font-black text-sm`}>
                          ¡Suscribirme Ahora!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 pb-6 px-1">
                  <Button
                    type="submit"
                    disabled={isSubmittingPlan}
                    className="bg-[#93ABD9] hover:bg-[#ff9c3a] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                  >
                    {isSubmittingPlan ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                      </span>
                    ) : editingPlanId ? (
                      "Guardar Cambios"
                    ) : (
                      "Crear Plan"
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingPlan}
                    onClick={() => {
                      setShowPlanForm(false);
                      setEditingPlanId(null);
                      setPlanWhatsappDetailsText("");
                    }}
                    className="bg-transparent hover:bg-black/5 text-[#000000] border-[2px] border-transparent font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

<Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
  <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] p-6">
    <CardTitle className="font-black font-heading text-xl flex items-center gap-2">
      <Shield className="h-5 w-5" />
      Listado de Planes Activos
    </CardTitle>
  </CardHeader>

  <CardContent className="p-0">
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
    <Table className="w-full min-w-[800px] lg:min-w-0 border-collapse">
      {/* 1. bg-transparent: Quitamos el gris para que use el fondo de la Card.
          2. border-none: Quitamos la línea negra que separa el header de los datos.
      */}
      <TableHeader className="bg-transparent border-none">
        <TableRow className="hover:bg-transparent border-none">
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Nombre
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Sección
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Precio
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Etiqueta
          </TableHead>
          <TableHead className="font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Características
          </TableHead>
          <TableHead className="text-right font-bold text-[#000000] py-6 px-6 h-16 opacity-70">
            Acciones
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {planes.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-12 font-bold opacity-40 italic"
            >
              No hay planes creados. Agrega uno nuevo para que aparezca en la landing page.
            </TableCell>
          </TableRow>
        ) : (
          planes.map((plan) => (
            <TableRow
              key={plan.id}
              className="border-b-[2px] border-[#000000]/10 last:border-0 hover:bg-[#93ABD9]/5 transition-colors"
            >
              <TableCell className="py-4 px-6 font-bold">{plan.name}</TableCell>
              <TableCell className="py-4 px-6">
                <Badge className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-lg px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_0px_#000000] uppercase whitespace-nowrap">
                  {allPlanSections.find(s => s.sectionId === plan.sectionId)?.title || "Sin Sección"}
                </Badge>
              </TableCell>
              <TableCell className="py-4 px-6 font-black">{plan.price}</TableCell>
              <TableCell className="py-4 px-6">
                {plan.badge && plan.badge.trim() ? (
                  <Badge
                    className={`${plan.color} text-primary-foreground border-[2px] border-[#000000] rounded-lg px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#000000]`}
                  >
                    {plan.badge}
                  </Badge>
                ) : (
                  <span className="text-[#000000]/40 text-xs font-medium italic">Sin etiqueta</span>
                )}
              </TableCell>
              <TableCell className="py-4 px-6 max-w-[200px]">
                <div className="flex flex-wrap gap-1">
                  {plan.features.slice(0, 2).map((feat, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold bg-[#000000]/5 px-2 py-0.5 rounded-full border border-[#000000]/10"
                    >
                      {feat}
                    </span>
                  ))}
                  {plan.features.length > 2 && (
                    <span className="text-[10px] font-bold opacity-50 px-1">
                      +{plan.features.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right py-4 px-6">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    onClick={() => handleEditPlan(plan)}
                    className="h-9 w-9 bg-white hover:bg-[#bdb2ff] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => handleDeletePlan(plan.id)}
                    className="h-9 w-9 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  </CardContent>
</Card>
      </div>
    </div>
  );
}

interface BeneficiosTabProps {
  benefitsSectionContent: SectionContent;
  setBenefitsSectionContent: (v: SectionContent) => void;
  handleSaveBenefitsSectionContent: (e: React.FormEvent) => Promise<boolean>;
  isSubmittingBenefitsHeader: boolean;
  techFeatures: TechFeature[];
  showTechFeatureForm: boolean;
  setShowTechFeatureForm: (v: boolean) => void;
  editingTechFeatureId: string | null;
  setEditingTechFeatureId: (id: string | null) => void;
  techFeatureForm: Partial<TechFeature>;
  setTechFeatureForm: (v: Partial<TechFeature>) => void;
  handleCreateTechFeature: (e: React.FormEvent) => Promise<void>;
  handleEditTechFeature: (feature: TechFeature) => void;
  handleDeleteTechFeature: (id: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isSubmittingTechFeature: boolean;
  isUploading: boolean;
}

function BeneficiosTab({
  benefitsSectionContent,
  setBenefitsSectionContent,
  handleSaveBenefitsSectionContent,
  isSubmittingBenefitsHeader,
  techFeatures,
  showTechFeatureForm,
  setShowTechFeatureForm,
  editingTechFeatureId,
  setEditingTechFeatureId,
  techFeatureForm,
  setTechFeatureForm,
  handleCreateTechFeature,
  handleEditTechFeature,
  handleDeleteTechFeature,
  handleFileUpload,
  isSubmittingTechFeature,
  isUploading,
}: BeneficiosTabProps) {
  // Opciones de íconos con nombres legibles
  const ICON_OPTIONS: readonly { name: string; label: string; component: React.ComponentType<{ className?: string }> }[] = [
    { name: "Smartphone", label: "Teléfono", component: Smartphone },
    { name: "MapPin", label: "Ubicación", component: MapPin },
    { name: "Heart", label: "Corazón", component: Heart },
    { name: "Star", label: "Estrella", component: Star },
    { name: "Shield", label: "Escudo", component: Shield },
    { name: "Zap", label: "Rayo", component: Zap },
    { name: "Bell", label: "Campana", component: Bell },
    { name: "Calendar", label: "Calendario", component: Calendar },
    { name: "Camera", label: "Cámara", component: Camera },
    { name: "Dog", label: "Perro", component: Dog },
    { name: "PawPrint", label: "Huella", component: PawPrint },
    { name: "Stethoscope", label: "Estetoscopio", component: Stethoscope },
    { name: "Package", label: "Caja", component: Package },
    { name: "ShoppingBag", label: "Bolsa", component: ShoppingBag },
    { name: "Award", label: "Premio", component: Award },
    { name: "Users", label: "Usuarios", component: Users },
    { name: "Clock", label: "Reloj", component: Clock },
    { name: "CheckCircle", label: "Verificado", component: CheckCircle },
    { name: "Globe", label: "Globo", component: Globe },
    { name: "Lock", label: "Candado", component: Lock },
  ] as const;

  // Paleta de colores del ícono
  const COLOR_OPTIONS = [
    { label: "Oscuro", value: "text-[#000000]", hex: "#000000" },
    { label: "Naranja", value: "text-[#93ABD9]", hex: "#93ABD9" },
    { label: "Morado", value: "text-[#7e6ccb]", hex: "#7e6ccb" },
    { label: "Lila", value: "text-[#bdb2ff]", hex: "#bdb2ff" },
    { label: "Rojo", value: "text-[#ff6b6b]", hex: "#ff6b6b" },
    { label: "Verde", value: "text-[#52b788]", hex: "#52b788" },
    { label: "Azul", value: "text-[#74b3ce]", hex: "#74b3ce" },
    { label: "Blanco", value: "text-white", hex: "#ffffff" },
  ];

  // Paleta de fondos del contenedor del ícono
  const BG_OPTIONS = [
    { label: "Blanco", value: "bg-white", hex: "#ffffff" },
    { label: "Naranja claro", value: "bg-[#ffd6a5]", hex: "#ffd6a5" },
    { label: "Naranja", value: "bg-[#93ABD9]/20", hex: "#93ABD9" },
    { label: "Morado claro", value: "bg-[#bdb2ff]/20", hex: "#bdb2ff" },
    { label: "Lila", value: "bg-[#d4c5ff]", hex: "#d4c5ff" },
    { label: "Rojo claro", value: "bg-[#ffadad]", hex: "#ffadad" },
    { label: "Verde claro", value: "bg-[#b7e4c7]", hex: "#b7e4c7" },
    { label: "Crema", value: "bg-[#fdfaf5]", hex: "#fdfaf5" },
    { label: "Oscuro", value: "bg-[#000000]", hex: "#000000" },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
      <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black font-heading">
            Titulo de Beneficios en Landing
          </CardTitle>
          <p className="text-sm text-[#000000]/70 font-semibold">
            Este titulo se mostrara arriba de las tarjetas con color #EDE986.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBenefitsSectionContent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black text-sm uppercase tracking-wider">Titulo</Label>
                <Input
                  value={benefitsSectionContent.title || ""}
                  onChange={(e) =>
                    setBenefitsSectionContent({
                      ...benefitsSectionContent,
                      title: e.target.value,
                    })
                  }
                  placeholder="Beneficios Tecnologicos"
                  className="border-[2px] border-[#000000] rounded-xl bg-white h-12 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-sm uppercase tracking-wider">Subtitulo (opcional)</Label>
                <Input
                  value={benefitsSectionContent.subtitle || ""}
                  onChange={(e) =>
                    setBenefitsSectionContent({
                      ...benefitsSectionContent,
                      subtitle: e.target.value,
                    })
                  }
                  placeholder="Funciones inteligentes para el cuidado y seguimiento de tu mascota."
                  className="border-[2px] border-[#000000] rounded-xl bg-white h-12 font-semibold"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmittingBenefitsHeader}
              className="bg-[#EDE986] hover:bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-black rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              {isSubmittingBenefitsHeader ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </span>
              ) : (
                "Guardar Titulo"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-[#fdfaf5] border-[3px] border-[#000000] rounded-2xl shadow-[6px_6px_0px_0px_#000000]">
        <div>
          <h2 className="text-2xl font-black text-[#000000] font-heading flex flex-col sm:flex-row sm:items-center gap-2">
            {benefitsSectionContent.title?.trim() || "Beneficios Tecnologicos"}
          </h2>
          <p className="text-[#000000]/70 font-semibold">
            Gestiona las 3 tarjetas de beneficios
          </p>
        </div>
        <Button
          disabled={isSubmittingTechFeature || isUploading}
          onClick={() => {
            setShowTechFeatureForm(!showTechFeatureForm);
            if (!showTechFeatureForm) {
              setEditingTechFeatureId(null);
              setTechFeatureForm({
                iconName: "Activity",
                title: "",
                description: "",
                color: "text-[#000000]",
                bg: "bg-white/20",
                order: 0,
                customIcon: "",
              });
            }
          }}
          className="bg-[#f5d393] hover:bg-[#93ABD9] text-[#000000] font-black border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] rounded-xl px-6 transition-all disabled:opacity-50"
        >
          {showTechFeatureForm ? (
            <X className="h-5 w-5 mr-2" />
          ) : (
            <Plus className="h-5 w-5 mr-2" />
          )}
          {showTechFeatureForm ? "Cancelar" : "Nuevo Beneficio"}
        </Button>
      </div>

      {showTechFeatureForm && (() => {
        const SelectedIcon = ICON_OPTIONS.find((i) => i.name === techFeatureForm.iconName)?.component ?? Star;

        return (
          <Card className="border-[3px] border-[#000000] rounded-3xl shadow-[8px_8px_0px_0px_#000000] bg-[#fdfaf5] overflow-hidden p-0 animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[21px] p-6">
              <CardTitle className="text-2xl font-black text-[#000000] flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                  <Star className="h-6 w-6 text-[#000000]" />
                </div>
                {editingTechFeatureId ? "Editar Beneficio" : "Nuevo Beneficio"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleCreateTechFeature} className="space-y-8">

                {/* FILA 1: Título + Descripción */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Título
                    </Label>
                    <Input
                      required
                      placeholder="Ej. Seguimiento en tiempo real"
                      value={techFeatureForm.title}
                      onChange={(e) => setTechFeatureForm({ ...techFeatureForm, title: e.target.value })}
                      className="border-[2px] border-[#000000] rounded-xl bg-white h-12 font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Descripción
                    </Label>
                    <Input
                      required
                      placeholder="Ej. Localiza a tu mascota desde la app"
                      value={techFeatureForm.description}
                      onChange={(e) => setTechFeatureForm({ ...techFeatureForm, description: e.target.value })}
                      className="border-[2px] border-[#000000] rounded-xl bg-white h-12 font-semibold"
                    />
                  </div>
                </div>

                {/* FILA 2: Ícono selector visual */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Ícono — selecciona uno o sube el tuyo
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="tech-icon-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        disabled={isUploading}
                        onClick={() => document.getElementById("tech-icon-upload")?.click()}
                        className="bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold rounded-xl h-10 px-4 text-xs transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Subiendo…" : "Subir Icono Propio"}
                      </Button>
                      {techFeatureForm.customIcon && (
                         <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setTechFeatureForm({ ...techFeatureForm, customIcon: "" })}
                            className="text-[#ff6b6b] hover:text-red-600 hover:bg-red-50 h-10 w-10 p-0 rounded-xl"
                         >
                            <X className="h-4 w-4" />
                         </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {ICON_OPTIONS.map((opt) => {
                      const Ic = opt.component;
                      const isSelected = !techFeatureForm.customIcon && techFeatureForm.iconName === opt.name;
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          title={opt.label}
                          onClick={() => setTechFeatureForm({ ...techFeatureForm, iconName: opt.name, customIcon: "" })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-[2px] transition-all ${
                            isSelected
                              ? "border-[#000000] bg-[#ffd6a5] shadow-[3px_3px_0px_0px_#000000] scale-105"
                              : "border-[#000000]/20 bg-white hover:border-[#000000] hover:bg-[#fdfaf5]"
                          }`}
                        >
                          <Ic className="h-5 w-5 text-[#000000]" />
                          <span className="text-[9px] font-bold text-[#000000]/70 leading-tight text-center">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FILA 3: Color del ícono + Fondo del ícono */}
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Color del ícono (solo para iconos estándar)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((opt) => {
                        const isSelected = techFeatureForm.color === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setTechFeatureForm({ ...techFeatureForm, color: opt.value })}
                            className={`flex flex-col items-center gap-1 transition-all`}
                          >
                            <span
                              className={`w-8 h-8 rounded-full border-[2px] block ${
                                isSelected ? "border-[#000000] scale-125 shadow-[2px_2px_0px_0px_#000000]" : "border-[#000000]/30"
                              }`}
                              style={{ backgroundColor: opt.hex }}
                            />
                            <span className="text-[9px] font-bold text-[#000000]/60">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                       Fondo del contenedor
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {BG_OPTIONS.map((opt) => {
                        const isSelected = techFeatureForm.bg === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setTechFeatureForm({ ...techFeatureForm, bg: opt.value })}
                            className="flex flex-col items-center gap-1 transition-all"
                          >
                            <span
                              className={`w-8 h-8 rounded-full border-[2px] block ${
                                isSelected ? "border-[#000000] scale-125 shadow-[2px_2px_0px_0px_#000000]" : "border-[#000000]/30"
                              }`}
                              style={{ backgroundColor: opt.hex }}
                            />
                            <span className="text-[9px] font-bold text-[#000000]/60">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* PREVIEW */}
                <div className="space-y-2">
                  <Label className="text-[#000000] font-black text-sm uppercase tracking-wider">
                     Vista previa
                  </Label>
                  <div className="bg-white border-[2px] border-[#000000]/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-[2px] border-[#000000] shrink-0 ${techFeatureForm.bg || "bg-[#93ABD9]/10"}`}>
                      {techFeatureForm.customIcon ? (
                        <div className="w-full h-full p-2 relative">
                           <Image
                              src={techFeatureForm.customIcon}
                              alt="Icon Preview"
                              fill
                              className="object-contain p-1"
                           />
                        </div>
                      ) : (
                        <SelectedIcon className={`h-7 w-7 ${techFeatureForm.color}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-[#000000] text-base">{techFeatureForm.title || "Título del beneficio"}</p>
                      <p className="text-[#000000]/60 font-semibold text-sm">{techFeatureForm.description || "Descripción del beneficio"}</p>
                    </div>
                  </div>
                </div>

                {/* BOTÓN */}
                <div className="flex gap-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmittingTechFeature || isUploading}
                    className="flex-1 sm:flex-none bg-[#93ABD9] hover:bg-[#f5d393] text-[#000000] font-black border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] rounded-xl px-8 h-12 text-base transition-all disabled:opacity-50"
                  >
                    {isSubmittingTechFeature ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Guardando…
                      </span>
                    ) : editingTechFeatureId ? (
                      "Actualizar Beneficio"
                    ) : (
                      "Guardar Beneficio"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmittingTechFeature || isUploading}
                    onClick={() => setShowTechFeatureForm(false)}
                    className="border-[2px] border-transparent font-bold h-12 rounded-xl disabled:opacity-50"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );
      })()}


      <div className="grid lg:grid-cols-3 gap-6">
        {techFeatures.map((feature) => {
          const FeatureIcon = ICON_OPTIONS.find((i) => i.name === feature.iconName)?.component ?? Star;
           return (
            <Card
              key={feature.id}
              className="border-[3px] border-[#000000] rounded-2xl shadow-[6px_6px_0px_0px_#000000] overflow-hidden flex flex-col p-0 gap-0"
            >
              <CardHeader className="bg-[#ffd6a5] border-b-[3px] border-[#000000] rounded-t-[13px] flex flex-row items-center justify-between p-4 px-6">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border-[2px] border-[#000000] ${feature.bg || "bg-white"}`}
                >
                  {feature.customIcon ? (
                     <div className="w-full h-full p-1.5 relative">
                        <Image
                           src={feature.customIcon}
                           alt={feature.title}
                           fill
                           className="object-contain p-0.5"
                        />
                     </div>
                  ) : (
                     <FeatureIcon className={`h-5 w-5 ${feature.color}`} />
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    size="icon"
                    onClick={() => handleEditTechFeature(feature)}
                    className="h-11 w-11 bg-white hover:bg-[#bdb2ff] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => handleDeleteTechFeature(feature.id)}
                    className="h-11 w-11 bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex flex-col h-full bg-white">
                <div className="space-y-2 flex-grow">
                  <h3 className="text-xl font-black text-[#000000] font-heading">
                    {feature.title}
                  </h3>
                  <p className="text-[#000000]/70 font-semibold line-clamp-2">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
           );
        })}
      </div>
    </div>
  );
}

const CategoriesTab = memo(function CategoriesTab({
  categories,
  subcategories,
  showCategoryForm,
  setShowCategoryForm,
  categoryForm,
  setCategoryForm,
  handleCreateCategory,
  handleDeleteCategory,
  showSubcategoryForm,
  setShowSubcategoryForm,
  subcategoryForm,
  setSubcategoryForm,
  handleCreateSubcategory,
  handleDeleteSubcategory,
  isSubmittingCategory,
  isSubmittingSubcategory,
}: {
  categories: CategoryStore[];
  subcategories: SubcategoryStore[];
  showCategoryForm: boolean;
  setShowCategoryForm: (v: boolean) => void;
  categoryForm: { nombre: string; icon: string };
  setCategoryForm: (v: { nombre: string; icon: string }) => void;
  handleCreateCategory: (e: React.FormEvent) => void;
  handleDeleteCategory: (id: string) => void;
  showSubcategoryForm: boolean;
  setShowSubcategoryForm: (v: boolean) => void;
  subcategoryForm: { nombre: string; categoryId: string };
  setSubcategoryForm: (v: { nombre: string; categoryId: string }) => void;
  handleCreateSubcategory: (e: React.FormEvent) => void;
  handleDeleteSubcategory: (id: string) => void;
  isSubmittingCategory: boolean;
  isSubmittingSubcategory: boolean;
}) {
  const subcategoriesByCategory = useMemo(() => {
    const grouped: Record<string, SubcategoryStore[]> = {};
    for (const sub of subcategories) {
      if (!grouped[sub.categoryId]) grouped[sub.categoryId] = [];
      grouped[sub.categoryId].push(sub);
    }
    return grouped;
  }, [subcategories]);

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* ---- CATEGORÍAS ---- */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
              Gestión de Categorías
            </h2>
            <p className="font-semibold opacity-70 text-[#000000]/70">
              Organiza tus productos por tipos
            </p>
          </div>
          <Button
            disabled={isSubmittingCategory}
            onClick={() => setShowCategoryForm(true)}
            className="bg-[#93ABD9] hover:bg-[#ff9933] text-[#000000] border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-2xl h-14 px-8 transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <Plus className="h-5 w-5 mr-2" /> Nueva Categoría
          </Button>
        </div>

        {showCategoryForm && (
          <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[8px_8px_0px_0px_#000000] rounded-[2rem] overflow-hidden p-0 animate-in zoom-in-95 duration-300 max-w-2xl">
            <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[1.8rem] p-6">
              <CardTitle className="font-black flex items-center gap-3 text-xl">
                <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                  <LayoutGrid className="h-5 w-5 text-[#000000]" />
                </div>
                Crear Categoría
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleCreateCategory} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 px-1">Nombre de la Categoría</Label>
                  <Input
                    placeholder="Ej. Juguetes, Snacks..."
                    value={categoryForm.nombre}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nombre: e.target.value })}
                    required
                    className="border-[2px] border-foreground/20 rounded-xl bg-white h-12"
                  />
                </div>
                <div className="flex gap-4 pt-6 pb-6 px-1">
                  <Button type="submit" disabled={isSubmittingCategory} className="flex-1 bg-[#93ABD9] hover:bg-[#ff9933] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-xl h-12 disabled:opacity-50">
                    {isSubmittingCategory ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Guardando…
                      </span>
                    ) : (
                      "Guardar Categoría"
                    )}
                  </Button>
                  <Button type="button" disabled={isSubmittingCategory} onClick={() => setShowCategoryForm(false)} variant="ghost" className="border-[2px] border-transparent font-bold h-12 rounded-xl disabled:opacity-50">
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="border-[3px] border-[#000000] bg-white text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_#000000] group p-0"
            >
              <CardHeader className="bg-[#93ABD9] border-b-[3px] border-[#000000] rounded-t-[21px] flex flex-row items-center justify-between p-6">
                <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                  <LayoutGrid className="h-5 w-5 text-[#000000]" />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="h-9 w-9 bg-white/20 hover:bg-white/40 text-[#000000] border-[2px] border-transparent hover:border-[#000000] rounded-xl transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <h3 className="text-xl font-black font-heading">{cat.nombre}</h3>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-1">Tienda de Mascotas</p>
                {/* Sub-badge con cuenta de subcategorías */}
                {(() => {
                  const count = subcategoriesByCategory[cat.id]?.length || 0;
                  return count > 0 ? (
                    <Badge className="mt-2 bg-[#ffd6a5] text-[#000000] border-[2px] border-[#000000] rounded-lg text-[10px] font-black shadow-[2px_2px_0px_0px_#000000]">
                      {count} subcategor{count === 1 ? "ía" : "ías"}
                    </Badge>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40">
              <LayoutGrid className="h-16 w-16 mb-4 text-[#000000]/20" />
              <p className="font-black text-xl text-[#000000]/40">Sin categorías definidas</p>
              <p className="font-bold text-[#000000]/60">Crea tu primera categoría para organizar la tienda</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- SUBCATEGORÍAS ---- */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black font-heading tracking-tight text-[#000000]">
              Gestión de Subcategorías
            </h2>
            <p className="font-semibold opacity-70 text-[#000000]/70">
              Subniveles vinculados a cada categoría
            </p>
          </div>
          <Button
            onClick={() => setShowSubcategoryForm(true)}
            disabled={categories.length === 0 || isSubmittingSubcategory}
            className="bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-2xl h-14 px-8 transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5 mr-2" /> Nueva Subcategoría
          </Button>
        </div>

        {showSubcategoryForm && (
          <Card className="border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[8px_8px_0px_0px_#000000] rounded-[2rem] overflow-hidden p-0 animate-in zoom-in-95 duration-300 max-w-2xl">
            <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[1.8rem] p-6">
              <CardTitle className="font-black flex items-center gap-3 text-xl">
                <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                  <Tag className="h-5 w-5 text-[#000000]" />
                </div>
                Crear Subcategoría
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleCreateSubcategory} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 px-1">Categoría Padre</Label>
                  <select
                    className="flex h-12 w-full rounded-xl border-[2px] border-foreground/20 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bdb2ff] text-[#000000]"
                    value={subcategoryForm.categoryId}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, categoryId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecciona una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 px-1">Nombre de la Subcategoría</Label>
                  <Input
                    placeholder="Ej. Alimento húmedo, Correas de cuero..."
                    value={subcategoryForm.nombre}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, nombre: e.target.value })}
                    required
                    className="border-[2px] border-foreground/20 rounded-xl bg-white h-12"
                  />
                </div>
                <div className="flex gap-4 pt-6 pb-6 px-1">
                  <Button type="submit" disabled={isSubmittingSubcategory} className="flex-1 bg-[#bdb2ff] hover:bg-[#a394ff] text-[#000000] border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] font-black rounded-xl h-12 disabled:opacity-50">
                    {isSubmittingSubcategory ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Guardando…
                      </span>
                    ) : (
                      "Guardar Subcategoría"
                    )}
                  </Button>
                  <Button type="button" disabled={isSubmittingSubcategory} onClick={() => setShowSubcategoryForm(false)} variant="ghost" className="border-[2px] border-transparent font-bold h-12 rounded-xl disabled:opacity-50">
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Listado agrupado por categoría */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const subs = subcategoriesByCategory[cat.id] || [];
            if (subs.length === 0) return null;
            return (
              <Card key={cat.id} className="border-[3px] border-[#000000] bg-white text-[#000000] shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
                <CardHeader className="bg-[#bdb2ff] border-b-[3px] border-[#000000] rounded-t-[21px] p-4 flex flex-row items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                    <Tag className="h-4 w-4 text-[#000000]" />
                  </div>
                  <p className="font-black text-[#000000] text-base">{cat.nombre}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {subs.map((sub) => (
                      <div key={sub.id as string} className="flex items-center gap-1.5 bg-[#fdfaf5] border-[2px] border-[#000000] rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000]">
                        <span className="font-bold text-sm text-[#000000]">{sub.nombre}</span>
                        <button
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          className="ml-1 text-[#000000]/40 hover:text-[#ff6b6b] transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {subcategories.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center opacity-40">
              <Tag className="h-12 w-12 mb-3 text-[#000000]/20" />
              <p className="font-black text-lg text-[#000000]/40">Sin subcategorías aún</p>
              <p className="font-bold text-[#000000]/60">Crea una para empezar a organizar mejor tus productos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CategoriesTab.displayName = "CategoriesTab";

/**
 * PlanQRTab Component
 * Sección para gestionar la activación del Plan QR por mascota.
 */
const PlanQRTab = memo(({ 
  usuarios, 
  onToggleQR 
}: { 
  usuarios: UsuarioAdmin[], 
  onToggleQR: (petId: string, enabled: boolean) => Promise<void> 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const allPets = useMemo(() => {
    const pets: (Mascota & { ownerName: string; ownerEmail: string })[] = [];
    usuarios.forEach(u => {
      if (u.mascotas) {
        u.mascotas.forEach(p => {
          pets.push({
            ...p,
            ownerName: u.nombre || "Sin nombre",
            ownerEmail: u.email || "Sin email"
          });
        });
      }
    });
    return pets.sort((a, b) => new Date((b.createdAt as string) || 0).getTime() - new Date((a.createdAt as string) || 0).getTime());
  }, [usuarios]);

  const filteredPets = allPets.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading tracking-tight">Gestión Plan QR Anti-Pérdida</h2>
          <p className="text-[#000000]/60 font-bold mt-1">Activa o desactiva el acceso al QR para cada mascota según el pago del plan.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Input
            placeholder="Buscar mascota o dueño..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_#000] pl-10"
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
        </div>
      </div>

      <Card className="border-[3px] border-[#000000] bg-white text-[#000000] shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-[#fdfaf5] border-b-[3px] border-[#000000]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-black text-[#000000] py-4">Mascota</TableHead>
              <TableHead className="font-black text-[#000000] py-4">Dueño</TableHead>
              <TableHead className="font-black text-[#000000] py-4 text-center">Estado Plan</TableHead>
              <TableHead className="font-black text-[#000000] py-4 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center font-bold opacity-40">
                  No se encontraron mascotas
                </TableCell>
              </TableRow>
            ) : (
              filteredPets.map((pet) => (
                <TableRow key={pet.id} className="border-b-[2px] border-[#000000]/10 hover:bg-[#93ABD9]/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border-[2px] border-black overflow-hidden bg-[#f0f0f0] shrink-0">
                        {pet.foto ? (
                          <Image src={pet.foto} alt={pet.nombre} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#93ABD9]/20">
                            <PawPrint className="h-6 w-6 opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="font-black">{pet.nombre}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">{pet.ownerName}</div>
                    <div className="text-xs opacity-60 font-bold">{pet.ownerEmail}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "border-[2px] border-black shadow-[2px_2px_0px_0px_#000] px-3 py-1 font-black rounded-lg",
                      pet.qrEnabled ? "bg-[#EDE986] text-black" : "bg-white text-black/40"
                    )}>
                      {pet.qrEnabled ? "ACTIVO ✅" : "INACTIVO ⬜"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => onToggleQR(String(pet.id), !pet.qrEnabled)}
                      className={cn(
                        "font-black border-[2px] border-black rounded-xl shadow-[3px_3px_0px_0px_#000] transition-all active:translate-y-1 active:shadow-none",
                        pet.qrEnabled 
                          ? "bg-[#ffadad] hover:bg-[#ff8a8a] text-black" 
                          : "bg-[#93ABD9] hover:bg-[#86b1f2] text-black"
                      )}
                    >
                      {pet.qrEnabled ? "Desactivar Plan" : "Activar Plan"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
});

PlanQRTab.displayName = "PlanQRTab";
