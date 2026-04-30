import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Client } from "@stomp/stompjs";
import type { Chat, Message, ResponseStatus } from "@shared/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  BarChart2,
  Headphones,
  ChevronRight,
  Eye,
  Globe,
  ChevronDown,
  LogOut,
  ArrowLeft,
  Send,
  CheckCheck,
  Menu,
  X,
} from "lucide-react";

import logoImg from "@/assets/services/logo.png";
import { useAuth } from "@features/auth/model/context";
import { useLanguage } from "@features/language/model/context";
import { useAccessibility } from "@features/accessibility/model/context";
import AuthGuard from "@app/guards/auth-guard";
import { api } from "@shared/api";

import imgHousehold from "@/assets/services/household.png";
import imgMedical from "@/assets/services/medical.png";
import imgEscort from "@/assets/services/escort.png";
import imgHomeWork from "@/assets/services/homework.png";
import imgShopping from "@/assets/services/shopping.png";

import imgUserPhoto from "@assets/Ellipse_374_1776245458894.png";
import imgQamqor from "@assets/Rectangle_240662641_1776245382727.png";

const GREEN = "#2C9C42";
const BLUE = "#3B82F6";

type NavKey = "dashboard" | "messages" | "requests" | "statistics" | "support";
type TabKey = "create" | "search" | "notifications" | "settings";

/* ─────────────── requests types ─────────────── */
type RequestStatus = "active" | "completed" | "cancelled";

interface ServiceRequest {
  id: string;
  serviceKey: string;
  serviceLabel: string;
  description: string;
  price: string;
  dateCreated: string;
  dateExecution: string;
  address: string;
  city?: string;
  helper: string;
  status?: RequestStatus;
}

const SERVICE_IMG: Record<string, string> = {
  household: imgHousehold, medical: imgMedical, escort: imgEscort, homework: imgHomeWork, shopping: imgShopping,
};

function mapBackendRequest(r: { id: string; title: string; description: string; category: string; location: string; price?: number; scheduledDate?: string; status: string; createdAt: string; executorName?: string }): ServiceRequest {
  const d = new Date(r.createdAt);
  const dateCreated = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const statusMap: Record<string, RequestStatus> = { open: "active", in_progress: "active", completed: "completed", cancelled: "cancelled" };
  const serviceLabels: Record<string, string> = { household: "Бытовые услуги", medical: "Медицинская помощь", escort: "Сопровождение", homework: "Домашние работы", shopping: "Покупки" };
  return {
    id: r.id,
    serviceKey: r.category ?? "household",
    serviceLabel: serviceLabels[r.category ?? ""] ?? r.title,
    description: r.description ?? "",
    price: r.price != null ? String(r.price) : "",
    dateCreated,
    dateExecution: r.scheduledDate ?? "",
    address: r.location ?? "",
    city: "",
    helper: r.executorName ?? "",
    status: statusMap[r.status] ?? "active",
  };
}

function getTodayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function formatDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}
function isValidDate(v: string) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return false;
  const [dd, mm, yyyy] = v.split(".").map(Number);
  if (mm < 1 || mm > 12 || dd < 1) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}
function isFutureDate(v: string) {
  const [dd, mm, yyyy] = v.split(".").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d > today;
}

/* ─────────────── messages / chat types ─────────────── */
type AvatarType = "photo" | "qamqor" | string; // string = initials key

interface Conversation {
  id: number;
  name: string;
  avatar: AvatarType;
  avatarColor?: string;
  preview: string;
  time: string;
  unread?: boolean;
  read?: boolean;
  isSystem?: boolean;
}

interface ChatMessage {
  id: number;
  from: "me" | "other";
  text: string;
  time: string;
}

const CONVERSATIONS: Conversation[] = [
  { id: 1, name: "Куаныш Дастан", avatar: "photo", preview: "Принимаю вашу заявку о покупке лекарств. Вскоре уточню детали и приступлю к выполнению", time: "12:45", unread: true },
  { id: 2, name: "Айбергенова Асылай", avatar: "АА", avatarColor: "#a78bfa", preview: "Отклонился на вашу заявку о помощи по дому.\nЗдравствуйте! Работаю в сфере бытовой помощи уже несколько лет, хорошо знаю все основные задачи по дому. Выполню всё аккуратно, быстро и с уважением к вашему пространству...", time: "11:05", unread: true },
  { id: 3, name: "Платеж успешно выполнен", avatar: "qamqor", preview: "Заявка №1024", time: "11:05", isSystem: true },
  { id: 4, name: "Аймердинов Амир", avatar: "photo", preview: "Отклонил вашу заявку.\nЗдравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "11:05" },
  { id: 5, name: "Платеж успешно выполнен", avatar: "qamqor", preview: "Заявка №1023", time: "11:05", isSystem: true },
  { id: 6, name: "Бакыт Диас", avatar: "photo", preview: "Я уже купил всё необходимое.", time: "вс" },
  { id: 7, name: "Абдешев Сансызбай", avatar: "АС", avatarColor: "#f97316", preview: "Ваш родственник активировал SOS кнопку", time: "сб" },
  { id: 8, name: "Алимова Асем", avatar: "АА", avatarColor: "#ec4899", preview: "Дома очень чисто, спасибо вам огромное.\nЖелаю всего наилучшего!", time: "пт", read: true },
  { id: 9, name: "Ахмет Адиль", avatar: "АА", avatarColor: "#6366f1", preview: "Отклонил вашу заявку.\nЗдравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "чт" },
  { id: 10, name: "Куаныш Дастан", avatar: "КД", avatarColor: "#14b8a6", preview: "Хорошо, спасибо вам большое!", time: "чт", read: true },
];

const CHAT_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, from: "me", text: "Добрый день!\nМне нужна помощь по покупке лекарств, можете ли вы помочь?", time: "12:15" },
    { id: 2, from: "other", text: "Добрый день!", time: "12:14" },
    { id: 3, from: "other", text: "Принимаю вашу заявку о покупке лекарств. Вскоре уточню детали и приступлю к выполнению", time: "12:15" },
  ],
  2: [
    { id: 1, from: "me", text: "Здравствуйте! Мне нужна помощь по дому.", time: "11:00" },
    { id: 2, from: "other", text: "Здравствуйте! Рада помочь! Работаю в сфере бытовой помощи уже несколько лет.", time: "11:05" },
  ],
  4: [
    { id: 1, from: "me", text: "Здравствуйте! Могли бы вы помочь с моей заявкой?", time: "10:50" },
    { id: 2, from: "other", text: "Здравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "11:05" },
  ],
  6: [
    { id: 1, from: "me", text: "Добрый день! Вы купили всё из списка?", time: "вс" },
    { id: 2, from: "other", text: "Я уже купил всё необходимое.", time: "вс" },
  ],
  7: [
    { id: 1, from: "other", text: "Ваш родственник активировал SOS кнопку", time: "сб" },
  ],
  8: [
    { id: 1, from: "other", text: "Дома очень чисто, спасибо вам огромное.\nЖелаю всего наилучшего!", time: "пт" },
  ],
};

/* ─────────────── avatar helper ─────────────── */
function Avatar({ conv, size = 44 }: { conv: Conversation; size?: number }) {
  if (conv.avatar === "photo") {
    return (
      <img src={imgUserPhoto} alt={conv.name} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  if (conv.avatar === "qamqor") {
    return (
      <img src={logoImg} alt="Qamqor" className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: conv.avatarColor ?? "#9ca3af", fontSize: size * 0.36 }}>
      {conv.avatar}
    </div>
  );
}

/* ─────────────── small ui bits ─────────────── */
function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const locales = ["RU", "KZ", "EN"] as const;
  const map: Record<string, "ru" | "kz" | "en"> = { RU: "ru", KZ: "kz", EN: "en" };
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        {locale.toUpperCase()}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[72px]">
          {locales.map(l => (
            <button key={l} onClick={() => { setLocale(map[l]); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
              style={locale === map[l] ? { color: BLUE, fontWeight: 600 } : { color: "#374151" }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function AccessibilityToggle() {
  const { isHighContrast, toggleHighContrast } = useAccessibility();
  const { t } = useLanguage();
  return (
    <button onClick={toggleHighContrast}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
      style={isHighContrast ? { borderColor: GREEN, background: "#f0faf2", color: GREEN } : { borderColor: "#e5e7eb", background: "white", color: "#374151" }}>
      <Eye className="w-3.5 h-3.5" />
      {isHighContrast ? t("dashboard.accessibilityOff") : t("dashboard.accessibilityOn")}
    </button>
  );
}

/* ─────────────── user card ─────────────── */
function UserCard({ user }: { user: { firstName: string; lastName: string; email: string; phone: string; role: string; birthDate?: string; city?: string; avatarUrl?: string } }) {
  const { t } = useLanguage();
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const roleLabel = (user.role === "elderly" || user.role === "seek-help") ? t("dashboard.roleSeekHelp") : t("dashboard.roleOfferHelp");
  const rows = [
    { label: t("dashboard.userRole"), value: roleLabel },
    { label: t("dashboard.userEmail"), value: user.email },
    { label: t("dashboard.userPhone"), value: user.phone },
    { label: t("dashboard.userDob"), value: user.birthDate ?? "—" },
    { label: t("dashboard.userCity"), value: user.city ?? "—" },
  ];
  return (
    <div className="px-3 pt-4 pb-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-3">
          {user.avatarUrl
            ? <img src={user.avatarUrl} className="w-11 h-11 rounded-full object-cover shrink-0" alt="avatar" />
            : <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
              {initials}
            </div>
          }
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{user.lastName} {user.firstName}</p>
        </div>
        <div className="border-t border-gray-100 mx-3" />
        <div className="px-3 py-2.5 space-y-1.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <span className="text-[10px] text-gray-400 shrink-0 leading-tight">{label}</span>
              <span className="text-[10px] text-gray-800 font-medium text-right break-all leading-tight">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── sidebar ─────────────── */
function Sidebar({ activeNav, setActiveNav, user }: {
  activeNav: NavKey;
  setActiveNav: (k: NavKey) => void;
  user: { firstName: string; lastName: string; email: string; phone: string; role: string; birthDate?: string; city?: string; avatarUrl?: string };
}) {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const navItems: { key: NavKey; Icon: React.ElementType; label: string }[] = [
    { key: "dashboard", Icon: LayoutDashboard, label: t("dashboard.navDashboard") },
    { key: "messages", Icon: MessageSquare, label: t("dashboard.navMessages") },
    { key: "requests", Icon: ClipboardList, label: t("dashboard.navMyRequests") },
    { key: "statistics", Icon: BarChart2, label: t("dashboard.navStatistics") },
    { key: "support", Icon: Headphones, label: t("dashboard.navSupport") },
  ];

  return (
    <aside className="w-56 min-h-screen bg-gray-50 flex flex-col shrink-0 border-r border-gray-100">
      <UserCard user={user} />
      <nav className="flex-1 px-3 py-1 flex flex-col gap-1">
        {navItems.map(({ key, Icon, label }) => {
          const isActive = activeNav === key;
          return (
            <button key={key} onClick={() => setActiveNav(key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border"
              style={isActive ? { background: BLUE, color: "white", borderColor: BLUE } : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={isActive ? { color: "white" } : { color: "#9ca3af" }} />
              <span className="flex-1 leading-tight">{label}</span>
              <ChevronRight className="w-3 h-3 shrink-0" style={isActive ? { color: "rgba(255,255,255,0.65)" } : { color: "#d1d5db" }} />
            </button>
          );
        })}
        <button onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border border-transparent hover:bg-red-50"
          style={{ color: "#EF4444" }}>
          <LogOut className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />
          <span className="flex-1 leading-tight">{t("dashboard.navLogout")}</span>
        </button>
      </nav>
    </aside>
  );
}

/* ─────────────── service card ─────────────── */
function ServiceCard({ img, title, desc, selected, onSelect, selectLabel, serviceKey: _ }: {
  serviceKey: string; img: string; title: string; desc: string; selected: boolean; onSelect: () => void; selectLabel: string;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-2xl cursor-pointer transition-all w-[180px] shrink-0 snap-center"
      style={selected ? { border: "2px solid #2563EB", boxShadow: "0 0 0 4px rgba(37,99,235,0.12)" } : { border: "2px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      onClick={onSelect}>
      <div className="w-full h-28 flex items-center justify-center mb-3">
        <img src={img} alt={title} className="max-h-full max-w-full object-contain" />
      </div>
      <p className="text-xs font-bold text-gray-800 text-center leading-tight mb-1">{title}</p>
      <p className="text-[10px] text-gray-400 text-center leading-tight flex-1 mb-3">{desc}</p>
      <button onClick={e => { e.stopPropagation(); onSelect(); }}
        className="px-5 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 mt-auto"
        style={{ background: GREEN }}>
        {selectLabel}
      </button>
    </div>
  );
}

/* ─────────────── address picker modal ─────────────── */
const KZ_CITIES = {
  almaty: { name: "Алматы", lat: 43.2220, lng: 76.8512 },
  astana: { name: "Астана", lat: 51.1801, lng: 71.4460 },
} as const;
type CityKey = keyof typeof KZ_CITIES;

interface NominatimResult { display_name: string; lat: string; lon: string; }

function makeMarkerIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function AddressPickerModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (address: string, city: string) => void;
}) {
  const [step, setStep] = useState<"city" | "map">("city");
  const [cityKey, setCityKey] = useState<CityKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [pickedAddress, setPickedAddress] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const placeMarker = useCallback((map: L.Map, lat: number, lng: number, address: string) => {
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { icon: makeMarkerIcon(GREEN) }).addTo(map);
    map.setView([lat, lng], 16, { animate: true });
    if (mountedRef.current) { setPickedAddress(address); setSearchQuery(address); setSuggestions([]); }
  }, []);

  const reverseGeocode = useCallback(async (map: L.Map, lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { "Accept-Language": "ru" },
      });
      const d = await r.json();
      if (mountedRef.current) placeMarker(map, lat, lng, d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch { if (mountedRef.current) placeMarker(map, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
  }, [placeMarker]);

  useEffect(() => {
    if (step !== "map" || !mapDivRef.current || !cityKey) return;
    const city = KZ_CITIES[cityKey];
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([city.lat, city.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      reverseGeocode(map, e.latlng.lat, e.latlng.lng);
    });

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [step, cityKey, reverseGeocode]);

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!mountedRef.current || !mapRef.current) return;
        setLoadingGeo(false);
        reverseGeocode(mapRef.current, pos.coords.latitude, pos.coords.longitude);
      },
      () => { if (mountedRef.current) setLoadingGeo(false); },
      { timeout: 8000 }
    );
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setPickedAddress("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const cityName = cityKey ? KZ_CITIES[cityKey].name : "";
        const q = encodeURIComponent(`${val} ${cityName}`);
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=kz&limit=6`, {
          headers: { "Accept-Language": "ru" },
        });
        const data: NominatimResult[] = await r.json();
        if (mountedRef.current) setSuggestions(data);
      } catch { /**/ }
    }, 380);
  };

  const handleSuggestionClick = (s: NominatimResult) => {
    if (!mapRef.current) return;
    placeMarker(mapRef.current, parseFloat(s.lat), parseFloat(s.lon), s.display_name);
  };

  const shortName = (full: string) => full.split(",").slice(0, 3).join(",").trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === "map" && (
              <button onClick={() => { setStep("city"); setCityKey(null); setPickedAddress(""); setSearchQuery(""); setSuggestions([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors mr-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-bold text-gray-900 text-sm">
              {step === "city" ? "Выберите ваш город" : `Выберите адрес — ${cityKey ? KZ_CITIES[cityKey].name : ""}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-lg font-light">✕</button>
        </div>

        {step === "city" && (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-xs text-gray-500 text-center">Выбор города нужен для подбора помощников из вашего региона</p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {(Object.entries(KZ_CITIES) as [CityKey, typeof KZ_CITIES[CityKey]][]).map(([key, city]) => (
                <button key={key} onClick={() => { setCityKey(key); setStep("map"); }}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all hover:border-blue-400 hover:bg-blue-50 border-gray-200">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "#EFF6FF" }}>
                    {key === "almaty" ? "🏔️" : "🏛️"}
                  </div>
                  <span className="font-bold text-gray-800 text-sm">{city.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 pb-2 shrink-0 relative">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                  placeholder="Введите адрес для поиска..."
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all" />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                </svg>
              </div>
              {suggestions.length > 0 && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-[180px] overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                      {shortName(s.display_name)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 pb-2 shrink-0 flex items-center gap-2">
              <button onClick={locateMe} disabled={loadingGeo}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60">
                {loadingGeo
                  ? <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" /><span>Определяем...</span></>
                  : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeWidth="2" /></svg><span>Моё местоположение</span></>
                }
              </button>
              {pickedAddress && (
                <span className="text-[10px] text-gray-400 truncate flex-1">{shortName(pickedAddress)}</span>
              )}
            </div>

            <div ref={mapDivRef} className="flex-1 mx-4 mb-4 rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: "260px" }} />

            <div className="px-4 pb-4 shrink-0">
              <button
                disabled={!pickedAddress}
                onClick={() => { if (pickedAddress && cityKey) onSelect(pickedAddress, KZ_CITIES[cityKey].name); }}
                className="w-full py-3 text-white text-sm font-bold rounded-xl transition-opacity disabled:opacity-40"
                style={{ background: GREEN }}>
                Выбрать этот адрес
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── date picker field ─────────────── */
const MONTH_NAMES_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const DOW_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function DatePickerField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const todayBase = new Date(); todayBase.setHours(0, 0, 0, 0);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(todayBase.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayBase.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  let selDate: Date | null = null;
  if (isValidDate(value)) {
    const [dd, mm, yyyy] = value.split(".").map(Number);
    selDate = new Date(yyyy, mm - 1, dd);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prevMonth = () => {
    if (viewYear === todayBase.getFullYear() && viewMonth === todayBase.getMonth()) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDayNum = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDow = firstDay.getDay(); startDow = startDow === 0 ? 6 : startDow - 1;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDayNum; d++) days.push(new Date(viewYear, viewMonth, d));

  const handleDayClick = (day: Date) => {
    if (day < todayBase) return;
    const dd = String(day.getDate()).padStart(2, "0");
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    onChange(`${dd}.${mm}.${day.getFullYear()}`);
    setOpen(false);
  };

  const atMinMonth = viewYear === todayBase.getFullYear() && viewMonth === todayBase.getMonth();

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input type="text" inputMode="numeric" value={value} maxLength={10}
          onChange={e => onChange(formatDate(e.target.value))}
          onFocus={() => setOpen(true)}
          placeholder="дд.мм.гггг"
          className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none transition-all pr-8 ${error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`} />
        <button type="button" tabIndex={-1} onClick={() => setOpen(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-[240px]">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} disabled={atMinMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed text-base transition-colors">‹</button>
            <span className="text-xs font-semibold text-gray-700">{MONTH_NAMES_RU[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-base transition-colors">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS_RU.map(d => (
              <div key={d} className="text-[10px] text-center text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const isPast = day < todayBase;
              const isToday = day.getTime() === todayBase.getTime();
              const isSel = selDate && day.getTime() === selDate.getTime();
              return (
                <button key={day.getTime()} type="button" onClick={() => handleDayClick(day)} disabled={isPast}
                  className={`text-[11px] h-7 w-full rounded-lg flex items-center justify-center transition-colors
                    ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"}
                    ${isSel ? "font-bold" : ""}
                    ${isToday && !isSel ? "font-bold ring-1 ring-gray-300" : "text-gray-700"}
                  `}
                  style={isSel ? { background: GREEN, color: "white" } : {}}>
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── success modal ─────────────── */
function SuccessModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#DCFCE7" }}>
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t("dashboard.requestCreatedTitle")}</h2>
          <p className="text-sm text-gray-500">{t("dashboard.requestCreatedDesc")}</p>
        </div>
        <button onClick={onClose}
          className="px-8 py-3 text-white text-sm font-bold rounded-xl transition-opacity hover:opacity-90 w-full"
          style={{ background: GREEN }}>
          Отлично!
        </button>
      </div>
    </div>
  );
}

/* ─────────────── create-request tab ─────────────── */
function CreateRequestTab({ userId: _userId, version }: { userId: string; version?: number }) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const isBlocked = currentUser?.blocked ?? false;
  const { allApproved, missingDocs, pendingDocs } = useDocAccess();
  const [selectedService, setSelectedService] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReq, setEditingReq] = useState<ServiceRequest | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    api.getMyRequests().then(list => {
      setRequests(list.map(mapBackendRequest));
    }).catch(() => { }).finally(() => setLoading(false));
  }, [version]);

  const services = [
    { key: "household", img: imgHousehold, title: t("dashboard.serviceHousehold"), desc: t("dashboard.serviceHouseholdDesc") },
    { key: "medical", img: imgMedical, title: t("dashboard.serviceMedical"), desc: t("dashboard.serviceMedicalDesc") },
    { key: "escort", img: imgEscort, title: t("dashboard.serviceEscort"), desc: t("dashboard.serviceEscortDesc") },
    { key: "homework", img: imgHomeWork, title: t("dashboard.serviceHomeWork"), desc: t("dashboard.serviceHomeWorkDesc") },
    { key: "shopping", img: imgShopping, title: t("dashboard.serviceShopping"), desc: t("dashboard.serviceShoppingDesc") },
  ];

  const sel = services.find(s => s.key === selectedService);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedService) e.service = t("dashboard.selectService");
    if (!description.trim()) e.description = t("dashboard.required");
    if (!price) e.price = t("dashboard.required");
    if (!date) e.date = t("dashboard.required");
    else if (!isValidDate(date)) e.date = t("dashboard.dateInvalid");
    else if (!isFutureDate(date)) e.date = t("dashboard.datePast");
    if (!address.trim()) e.address = t("dashboard.required");
    return e;
  };

  const handleCreate = async () => {
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const created = await api.createRequest({
        title: sel?.title ?? selectedService,
        description,
        category: selectedService,
        location: address,
        price: price ? parseInt(price, 10) : undefined,
        scheduledDate: date,
      });
      setRequests(prev => [mapBackendRequest(created as any), ...prev]);
      setSelectedService(""); setDescription(""); setPrice(""); setDate(""); setAddress(""); setCity(""); setErrors({});
      setShowSuccess(true);
    } catch (e) {
      console.error("createRequest failed:", e);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-800">{t("dashboard.createTitle")}</h2>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <div>
            <p className="text-xs font-bold" style={{ color: "#B91C1C" }}>Аккаунт заблокирован</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#DC2626" }}>
              Администратор заблокировал ваш аккаунт. Создание и принятие заявок недоступно.
            </p>
          </div>
        </div>
      )}

      {/* Doc access banner */}
      {!isBlocked && !allApproved && missingDocs.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" /></svg>
          <div>
            <p className="text-xs font-bold" style={{ color: "#92400E" }}>Невозможно создать заявку</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>
              Необходимо загрузить и получить одобрение для следующих документов:
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {missingDocs.map(d => (
                <li key={d.key} className="text-[11px] flex items-center gap-1.5" style={{ color: "#B45309" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#D97706" }} />
                  {d.label}
                </li>
              ))}
            </ul>
            {pendingDocs.length > 0 && (
              <p className="text-[11px] mt-2" style={{ color: "#B45309" }}>
                <span className="font-semibold">{pendingDocs.length} документ(а)</span> на проверке у администратора.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {services.map(s => (
            <ServiceCard key={s.key} serviceKey={s.key} img={s.img} title={s.title} desc={s.desc}
              selected={selectedService === s.key} onSelect={() => setSelectedService(s.key)} selectLabel={t("dashboard.selectBtn")} />
          ))}
        </div>
        {errors.service && <p className="text-[10px] text-red-500 mt-2">{errors.service}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">{t("dashboard.descLabel")}</label>
          <textarea value={description} onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(er => ({ ...er, description: "" })); }}
            placeholder={t("dashboard.descPlaceholder")} rows={3}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none resize-none transition-all ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`} />
          {errors.description && <p className="text-[10px] text-red-500">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard.priceLabel")}</label>
            <input type="text" inputMode="numeric" value={price}
              onChange={e => { setPrice(e.target.value.replace(/\D/g, "")); if (errors.price) setErrors(er => ({ ...er, price: "" })); }}
              placeholder={t("dashboard.pricePlaceholder")}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${errors.price ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`} />
            {errors.price && <p className="text-[10px] text-red-500">{errors.price}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard.dateLabel")}</label>
            <DatePickerField
              value={date}
              onChange={v => { setDate(v); if (errors.date) setErrors(er => ({ ...er, date: "" })); }}
              error={errors.date}
            />
            {errors.date && <p className="text-[10px] text-red-500">{errors.date}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">{t("dashboard.addressLabel")}</label>
          <button type="button" onClick={() => { setShowAddressPicker(true); if (errors.address) setErrors(er => ({ ...er, address: "" })); }}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs text-left transition-all flex items-center gap-2 ${errors.address ? "border-red-400 bg-red-50" : address ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-blue-400"}`}>
            <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {address
              ? <span className="truncate text-gray-800">{address.split(",").slice(0, 3).join(", ")}{city ? <span className="text-gray-400 ml-1">({city})</span> : null}</span>
              : <span className="text-gray-400">{t("dashboard.addressPlaceholder")}</span>
            }
          </button>
          {errors.address && <p className="text-[10px] text-red-500">{errors.address}</p>}
        </div>
        {showAddressPicker && (
          <AddressPickerModal
            onClose={() => setShowAddressPicker(false)}
            onSelect={(addr, c) => { setAddress(addr); setCity(c); setShowAddressPicker(false); }}
          />
        )}
        <button onClick={allApproved && !isBlocked ? handleCreate : undefined}
          disabled={!allApproved || isBlocked}
          className="px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-opacity shadow-sm"
          style={{ background: (allApproved && !isBlocked) ? GREEN : "#9ca3af", cursor: (allApproved && !isBlocked) ? "pointer" : "not-allowed", opacity: (allApproved && !isBlocked) ? 1 : 0.7 }}>
          {t("dashboard.createBtn")}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">{t("dashboard.activeRequests")}</h3>
          <button className="text-xs font-medium flex items-center gap-0.5" style={{ color: BLUE }}>
            {t("dashboard.showAll")} <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto px-4 pt-3 pb-1">
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
            <thead>
              <tr>
                {[t("dashboard.colName"), t("dashboard.colDateReg"), t("dashboard.colDateExec"), t("dashboard.colPrice"), t("dashboard.colHelper")].map((h, i) => {
                  const isFirst = i === 0;
                  return (
                    <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap text-left"
                      style={{
                        color: BLUE,
                        background: "white",
                        borderTop: "1px solid #BFDBFE",
                        borderBottom: "1px solid #BFDBFE",
                        borderLeft: isFirst ? "1px solid #BFDBFE" : "none",
                        borderRight: "none",
                        borderRadius: isFirst ? "10px 0 0 10px" : "0",
                      }}
                    >{h}</th>
                  );
                })}
                <th style={{ background: "white", borderTop: "1px solid #BFDBFE", borderBottom: "1px solid #BFDBFE", borderRight: "1px solid #BFDBFE", borderLeft: "none", borderRadius: "0 10px 10px 0", width: "100px" }} />
              </tr>
            </thead>
            <tbody>
              {requests.filter(r => (r.status ?? "active") === "active").map(req => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                        <img src={SERVICE_IMG[req.serviceKey] ?? imgHousehold} alt={req.serviceLabel} className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 leading-tight">{req.serviceLabel}</p>
                        <p className="text-gray-400 leading-tight truncate max-w-[120px]">{req.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateCreated}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateExecution}</td>
                  <td className="px-3 py-2.5 text-gray-700 font-semibold border-b border-gray-100">{req.price}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100">
                    {req.helper ? <span className="text-gray-700">{req.helper}</span>
                      : <span className="text-gray-400 italic">{t("dashboard.helperSearching")}</span>}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right">
                    <button
                      onClick={() => setEditingReq(req)}
                      className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
                      style={{ background: BLUE }}>
                      {t("dashboard.editBtn")}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.filter(r => (r.status ?? "active") === "active").length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editingReq && (
        <EditRequestModal
          req={editingReq}
          services={services}
          onClose={() => setEditingReq(null)}
          onSave={(updated) => {
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditingReq(null);
          }}
        />
      )}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
    </div>
  );
}

/* ─────────────── edit request modal ─────────────── */
function EditRequestModal({
  req, services, onClose, onSave,
}: {
  req: ServiceRequest;
  services: { key: string; img: string; title: string }[];
  onClose: () => void;
  onSave: (updated: ServiceRequest) => void;
}) {
  const { t } = useLanguage();
  const [serviceKey, setServiceKey] = useState(req.serviceKey);
  const [description, setDescription] = useState(req.description);
  const [price, setPrice] = useState(req.price);
  const [date, setDate] = useState(req.dateExecution);
  const [address, setAddress] = useState(req.address);
  const [open, setOpen] = useState(false);

  const selectedSvc = services.find(s => s.key === serviceKey);

  const handleSave = () => {
    onSave({ ...req, serviceKey, serviceLabel: selectedSvc?.title ?? req.serviceLabel, description, price, dateExecution: date, address });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-lg font-light">✕</button>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t("dashboard.serviceNameLabel")}</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-left flex items-center justify-between outline-none focus:border-blue-400"
              >
                <span className={selectedSvc ? "text-gray-800" : "text-gray-400"}>
                  {selectedSvc?.title ?? t("dashboard.selectService")}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {open && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {services.map(s => (
                    <button key={s.key} type="button"
                      onClick={() => { setServiceKey(s.key); setOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                      style={serviceKey === s.key ? { color: BLUE, fontWeight: 600 } : { color: "#374151" }}>
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t("dashboard.descLabel")}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none resize-none focus:border-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("dashboard.priceLabel")}</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={price}
                  onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("dashboard.dateLabel")}</label>
              <div className="relative">
                <input type="text" value={date} placeholder="дд.мм.гггг" maxLength={10}
                  onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 8); let f = d; if (d.length > 2) f = `${d.slice(0, 2)}.${d.slice(2)}`; if (d.length > 4) f = `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`; setDate(f); }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" /></svg>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t("dashboard.addressLabel")}</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave}
              className="px-8 py-3 text-white text-sm font-semibold rounded-xl transition-opacity hover:opacity-90"
              style={{ background: GREEN }}>
              {t("dashboard.saveBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── completion modal ─────────────── */
function CompletionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (priceOverride?: number) => void }) {
  const { t } = useLanguage();
  const [agreedPrice, setAgreedPrice] = useState<"yes" | "no">("yes");
  const [finalPrice, setFinalPrice] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-lg font-light">✕</button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">{t("dashboard.completionTitle")}</h2>
        <p className="text-sm text-gray-600 mb-6">{t("dashboard.completionQuestion")}</p>

        <div className="flex flex-col items-start gap-3 mb-6 px-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="price-agreement" checked={agreedPrice === "yes"} onChange={() => setAgreedPrice("yes")}
              className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-700">{t("dashboard.completionYes")}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="price-agreement" checked={agreedPrice === "no"} onChange={() => setAgreedPrice("no")}
              className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-700">{t("dashboard.completionNo")}</span>
          </label>
        </div>

        {agreedPrice === "no" && (
          <div className="relative mb-6 mx-4">
            <input type="text" inputMode="numeric" value={finalPrice}
              onChange={e => setFinalPrice(e.target.value.replace(/\D/g, ""))}
              placeholder={t("dashboard.completionPricePlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 text-center pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
          </div>
        )}

        <button
          onClick={() => {
            const override = agreedPrice === "no" && finalPrice ? parseInt(finalPrice, 10) : undefined;
            onSubmit(override);
          }}
          className="px-10 py-3 text-white text-sm font-bold rounded-xl uppercase tracking-wide transition-opacity hover:opacity-90"
          style={{ background: GREEN }}>
          {t("dashboard.completionSubmit")}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── helper dashboard (volunteer role) ─────────────── */
interface HelperRequest {
  id: string;
  name: string;
  avatarUrl: string | null;
  authorId: string;
  serviceLabel: string;
  description: string;
  price: string;
  dateCreated: string;
  dateExecution: string;
  address: string;
  createdAtRaw: string;
}

const HELPER_SERVICE_LABELS: Record<string, string> = {
  household: "Бытовые услуги", medical: "Медицинская помощь",
  escort: "Сопровождение", homework: "Домашние работы", shopping: "Покупки",
};

function mapHelperRequest(r: any): HelperRequest {
  const d = new Date(r.createdAt);
  const dateCreated = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return {
    id: String(r.id),
    name: r.authorName || "Пользователь",
    avatarUrl: r.authorAvatarUrl ?? null,
    authorId: r.authorId ?? "",
    serviceLabel: HELPER_SERVICE_LABELS[r.category ?? ""] ?? r.title ?? "",
    description: r.description ?? "",
    price: r.price != null ? String(r.price) : "",
    dateCreated,
    dateExecution: r.scheduledDate ?? "",
    address: r.location ?? "",
    createdAtRaw: r.createdAt ?? "",
  };
}

function HelperReqTable({ reqs, onComplete }: {
  reqs: HelperRequest[];
  onComplete?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const COLS = [t("dashboard.colDescription"), t("dashboard.colDateReg"), t("dashboard.colDateExec"), t("dashboard.colPrice"), t("dashboard.colAddress")];
  const hasActions = !!onComplete;

  return (
    <div className="overflow-x-auto px-4 pt-3 pb-1">
      <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
        <thead>
          <tr>
            {COLS.map((h, i) => {
              const isFirst = i === 0;
              const isLast = !hasActions && i === COLS.length - 1;
              return (
                <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap text-left"
                  style={{
                    color: BLUE,
                    background: "white",
                    borderTop: "1px solid #BFDBFE",
                    borderBottom: "1px solid #BFDBFE",
                    borderLeft: isFirst ? "1px solid #BFDBFE" : "none",
                    borderRight: isLast ? "1px solid #BFDBFE" : "none",
                    borderRadius: isFirst ? "10px 0 0 10px" : isLast ? "0 10px 10px 0" : "0",
                  }}>
                  {h}
                </th>
              );
            })}
            {hasActions && (
              <th style={{ background: "white", borderTop: "1px solid #BFDBFE", borderBottom: "1px solid #BFDBFE", borderRight: "1px solid #BFDBFE", borderLeft: "none", borderRadius: "0 10px 10px 0", width: "110px" }} />
            )}
          </tr>
        </thead>
        <tbody>
          {reqs.map(req => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-start gap-2.5">
                  {req.avatarUrl
                    ? <img src={req.avatarUrl} alt={req.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                      {req.name.substring(0, 1).toUpperCase()}
                    </div>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-xs leading-tight">{req.name}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mb-0.5">↳ {req.serviceLabel}</p>
                    <p className="text-[10px] text-gray-500 leading-tight line-clamp-2 max-w-[180px]">{req.description}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateCreated}</td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateExecution}</td>
              <td className="px-3 py-3 font-semibold text-gray-700 border-b border-gray-100">{req.price}</td>
              <td className="px-3 py-3 text-gray-600 border-b border-gray-100">{req.address}</td>
              {onComplete && (
                <td className="px-3 py-3 border-b border-gray-100 text-right">
                  <button
                    onClick={() => onComplete(req.id)}
                    className="px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
                    style={{ background: "#EF4444" }}>
                    {t("dashboard.completeBtn")}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestDetailsModal({ req, onClose, onChat, onRequestRespond, responseStatus }: {
  req: HelperRequest; onClose: () => void; onChat: () => void; onRequestRespond: () => void; responseStatus: ResponseStatus | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all transform scale-100 opacity-100" onClick={e => e.stopPropagation()}>
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Полная информация о заявке</h3>
        </div>
        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center gap-4">
            {req.avatarUrl
              ? <img src={req.avatarUrl} alt={req.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
              : <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                {req.name.substring(0, 1).toUpperCase()}
              </div>
            }
            <div>
              <p className="font-bold text-gray-800 text-base">{req.name}</p>
              <p className="text-sm text-gray-500">Заказчик</p>
            </div>
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Категория</p>
              <p className="text-sm font-semibold text-gray-800">{req.serviceLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Описание задачи</p>
              <p className="text-sm text-gray-700 leading-relaxed">{req.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Дата регистрации</p>
                <p className="text-sm text-gray-800">{req.dateCreated}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Желаемая дата</p>
                <p className="text-sm text-gray-800 font-medium">{req.dateExecution}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Вознаграждение</p>
              <p className="text-base font-bold" style={{ color: "#2C9C42" }}>{req.price}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Адрес</p>
              <p className="text-sm text-gray-800">{req.address}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={() => { onClose(); onChat(); }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "#FEF9C3", color: "#EAB308", border: "1px solid #FDE047" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Написать
          </button>
          {responseStatus === "PENDING" && (
            <button disabled className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: BLUE, color: "white", border: `1px solid ${BLUE}`, cursor: "default" }}>
              Откликнуто
            </button>
          )}
          {responseStatus === "ACCEPTED" && (
            <button disabled className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "#22C55E", color: "white", border: "1px solid #22C55E", cursor: "default" }}>
              Принято
            </button>
          )}
          {responseStatus === "DECLINED" && (
            <button disabled className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "#EF4444", color: "white", border: "1px solid #EF4444", cursor: "default" }}>
              Отклонена
            </button>
          )}
          {!responseStatus && (
            <button onClick={onRequestRespond}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: "white", color: "#22C55E", border: "1px solid #22C55E", cursor: "pointer" }}>
              Откликнуться
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmRespondModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 text-center space-y-2">
          <p className="font-bold text-gray-900 text-base">Откликнуться на заявку?</p>
          <p className="text-sm text-gray-500">Заказчик получит уведомление о вашем отклике. Подтвердите действие.</p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: BLUE }}>
            Подтверждаю
          </button>
        </div>
      </div>
    </div>
  );
}

function HelperAvailableTable({ reqs, onChat, onAccept, responseStatuses, loadingRespondId, canRespond }: {
  reqs: HelperRequest[];
  onChat: (authorId: string) => void;
  onAccept: (id: string) => void;
  responseStatuses: Record<string, ResponseStatus>;
  loadingRespondId: string | null;
  canRespond?: boolean;
}) {
  const { t } = useLanguage();
  const COLS = [t("dashboard.colDescription"), t("dashboard.colDateReg"), t("dashboard.colDateExec"), t("dashboard.colPrice"), t("dashboard.colAddress")];
  const [viewingReq, setViewingReq] = useState<HelperRequest | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function respondBtn(reqId: string, compact = true) {
    const status = responseStatuses[reqId];
    const loading = loadingRespondId === reqId;
    if (status === "PENDING") return (
      <button disabled className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold" : "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"}
        style={{ background: BLUE, color: "white", border: `1px solid ${BLUE}`, cursor: "default" }}>
        Откликнуто
      </button>
    );
    if (status === "ACCEPTED") return (
      <button disabled className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold" : "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"}
        style={{ background: "#22C55E", color: "white", border: "1px solid #22C55E", cursor: "default" }}>
        Принято
      </button>
    );
    if (status === "DECLINED") return (
      <button disabled className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold" : "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"}
        style={{ background: "#EF4444", color: "white", border: "1px solid #EF4444", cursor: "default" }}>
        Отклонена
      </button>
    );
    if (loading) return (
      <button disabled className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold" : "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"}
        style={{ background: "white", color: "#9ca3af", border: "1px solid #d1d5db", cursor: "wait" }}>
        ...
      </button>
    );
    if (canRespond === false) return (
      <button disabled className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold" : "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"}
        title="Загрузите и верифицируйте документы"
        style={{ background: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb", cursor: "not-allowed" }}>
        Откликнуться
      </button>
    );
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmingId(reqId); }}
        className={compact ? "h-7 rounded-lg px-2.5 text-[10px] font-semibold transition-all" : "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"}
        style={{ background: "white", color: "#22C55E", border: "1px solid #22C55E", cursor: "pointer" }}>
        Откликнуться
      </button>
    );
  }

  return (
    <div className="overflow-x-auto px-4 pt-3 pb-1">
      <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
        <thead>
          <tr>
            {COLS.map((h, i) => (
              <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap text-left"
                style={{
                  color: BLUE,
                  background: "white",
                  borderTop: "1px solid #BFDBFE",
                  borderBottom: "1px solid #BFDBFE",
                  borderLeft: i === 0 ? "1px solid #BFDBFE" : "none",
                  borderRight: "none",
                  borderRadius: i === 0 ? "10px 0 0 10px" : "0",
                }}>
                {h}
              </th>
            ))}
            <th style={{ background: "white", borderTop: "1px solid #BFDBFE", borderBottom: "1px solid #BFDBFE", borderRight: "1px solid #BFDBFE", borderLeft: "none", borderRadius: "0 10px 10px 0", width: "110px" }} />
          </tr>
        </thead>
        <tbody>
          {reqs.map(req => (
            <tr key={req.id} onClick={() => setViewingReq(req)} className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-start gap-2.5">
                  {req.avatarUrl
                    ? <img src={req.avatarUrl} alt={req.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                      {req.name.substring(0, 1).toUpperCase()}
                    </div>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-xs leading-tight">{req.name}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mb-0.5">↳ {req.serviceLabel}</p>
                    <p className="text-[10px] text-gray-500 leading-tight line-clamp-2 max-w-[180px]">{req.description}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateCreated}</td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateExecution}</td>
              <td className="px-3 py-3 font-semibold text-gray-700 border-b border-gray-100">{req.price}</td>
              <td className="px-3 py-3 text-gray-600 border-b border-gray-100">{req.address}</td>
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-center gap-1.5 justify-end">
                  <button onClick={(e) => { e.stopPropagation(); onChat(req.authorId); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: "#FEF9C3", border: "1px solid #FDE047" }} title="Написать">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  {respondBtn(req.id)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {viewingReq && (
        <RequestDetailsModal
          req={viewingReq}
          onClose={() => setViewingReq(null)}
          onChat={() => onChat(viewingReq.authorId)}
          onRequestRespond={() => { setViewingReq(null); setConfirmingId(viewingReq.id); }}
          responseStatus={responseStatuses[viewingReq.id] ?? null}
        />
      )}
      {confirmingId && (
        <ConfirmRespondModal
          onConfirm={() => { onAccept(confirmingId); setConfirmingId(null); }}
          onCancel={() => setConfirmingId(null)}
        />
      )}
    </div>
  );
}

function HelperDashboard({ user, onOpenChat, cancelledRequestId, declinedRequestId, acceptedRequestId, activeReqsVersion }: {
  user: { firstName: string };
  onOpenChat: (chat: Chat) => void;
  cancelledRequestId?: string | null;
  declinedRequestId?: string | null;
  acceptedRequestId?: string | null;
  activeReqsVersion?: number;
}) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const isBlocked = currentUser?.blocked ?? false;
  const { allApproved, missingDocs, pendingDocs } = useDocAccess();
  const [activeReqs, setActiveReqs] = useState<HelperRequest[]>([]);
  const [availableReqs, setAvailableReqs] = useState<HelperRequest[]>([]);
  const [responseStatuses, setResponseStatuses] = useState<Record<string, ResponseStatus>>({});
  const [loadingRespondId, setLoadingRespondId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<"date" | "distance" | "price" | "accepted" | "declined">("date");

  const sortedAndFilteredAvailableReqs = useMemo(() => {
    let list = [...availableReqs];
    if (filterType === "accepted") {
      list = list.filter(r => responseStatuses[r.id] === "ACCEPTED");
    } else if (filterType === "declined") {
      list = list.filter(r => responseStatuses[r.id] === "DECLINED");
    } else {
      if (filterType === "price") {
        list.sort((a, b) => {
          const pa = a.price ? parseInt(a.price, 10) : 0;
          const pb = b.price ? parseInt(b.price, 10) : 0;
          return pb - pa;
        });
      } else if (filterType === "date") {
        list.sort((a, b) => new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime());
      } else if (filterType === "distance") {
        list.sort((a, b) => a.address.localeCompare(b.address));
      }
    }
    return list;
  }, [availableReqs, filterType, responseStatuses]);

  useEffect(() => {
    api.getAssignedRequests()
      .then(list => setActiveReqs(list.filter((r: any) => r.status === "in_progress").map(mapHelperRequest)))
      .catch(() => { });
    api.getAvailableRequests().then(list => setAvailableReqs(list.map(mapHelperRequest))).catch(() => { });
    api.getMyResponses().then(list => {
      const map: Record<string, ResponseStatus> = {};
      list.forEach(r => { map[r.requestId] = r.status; });
      setResponseStatuses(map);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (cancelledRequestId) {
      setActiveReqs(prev => prev.filter(r => r.id !== cancelledRequestId));
    }
  }, [cancelledRequestId]);

  useEffect(() => {
    if (declinedRequestId) {
      setResponseStatuses(prev => ({ ...prev, [declinedRequestId]: "DECLINED" }));
    }
  }, [declinedRequestId]);

  useEffect(() => {
    if (acceptedRequestId) {
      setResponseStatuses(prev => ({ ...prev, [acceptedRequestId]: "ACCEPTED" }));
      // убрать из доступных, добавить в активные
      setAvailableReqs(prev => prev.filter(r => r.id !== acceptedRequestId));
      api.getAssignedRequests()
        .then(list => setActiveReqs(list.filter((r: any) => r.status === "in_progress").map(mapHelperRequest)))
        .catch(() => {});
    }
  }, [acceptedRequestId]);

  useEffect(() => {
    if (activeReqsVersion && activeReqsVersion > 0) {
      api.getAssignedRequests()
        .then(list => setActiveReqs(list.filter((r: any) => r.status === "in_progress").map(mapHelperRequest)))
        .catch(() => { });
    }
  }, [activeReqsVersion]);

  const handleChat = async (authorId: string) => {
    try {
      const chat = await api.openChat(authorId);
      onOpenChat(chat);
    } catch (e) {
      console.error("[CHAT] failed to open chat", e);
    }
  };

  const handleAccept = async (id: string) => {
    setLoadingRespondId(id);
    try {
      await api.respondToRequest(id);
      setResponseStatuses(prev => ({ ...prev, [id]: "PENDING" }));
    } catch (e) {
      console.error("[RESPOND] failed", e);
    } finally {
      setLoadingRespondId(null);
    }
  };

  const handleComplete = (id: string) => setCompletingId(id);
  const handleSubmitCompletion = async (priceOverride?: number) => {
    if (!completingId) return;
    try {
      await api.updateRequestStatus(completingId, "completed", priceOverride);
      const active = await api.getAssignedRequests();
      setActiveReqs(active.filter((r: any) => r.status === "in_progress").map(mapHelperRequest));
    } catch (e) {
      console.error("[COMPLETE] failed", e);
    }
    setCompletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
        <p className="font-bold text-gray-800 text-sm">Добро пожаловать, {user.firstName}!</p>
        <p className="text-xs text-gray-500 mt-0.5">Доступных заявок по вашим категориям: <span className="font-semibold text-gray-700">{availableReqs.length}</span>. Готовы помочь?</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-sm" style={{ color: GREEN }}>{t("dashboard.activeRequests")}</h3>
        </div>
        {activeReqs.length === 0 ? (
          <p className="px-5 py-6 text-xs text-gray-400 text-center">Нет активных заявок</p>
        ) : (
          <HelperReqTable reqs={activeReqs} onComplete={handleComplete} />
        )}
      </div>

      {/* Doc warning for volunteer */}
      {!allApproved && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" /></svg>
          <div>
            <p className="text-xs font-bold" style={{ color: "#92400E" }}>Для отклика на заявки необходима верификация</p>
            {missingDocs.length > 0 && (
              <>
                <p className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>Загрузите и получите одобрение для:</p>
                <ul className="mt-1 space-y-0.5">
                  {missingDocs.map(d => (
                    <li key={d.key} className="text-[11px] flex items-center gap-1.5" style={{ color: "#B45309" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#D97706" }} />{d.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {pendingDocs.length > 0 && missingDocs.length === 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>
                Документы загружены и ожидают проверки администратором.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-800">{t("dashboard.availableRequests")}</h3>
          <div className="relative">
            <button onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
              {filterType === "distance" ? t("dashboard.filterByDistance") :
                filterType === "price" ? "По цене" :
                  filterType === "date" ? "По дате" :
                    filterType === "accepted" ? "Отклик принято" : "Отклик отклонено"} <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[150px] overflow-hidden">
                {[
                  { k: "date", label: "По дате" },
                  { k: "distance", label: "По расстоянию" },
                  { k: "price", label: "По цене" },
                  { k: "accepted", label: "Отклик принято" },
                  { k: "declined", label: "Отклик отклонено" }
                ].map(opt => (
                  <button key={opt.k} onClick={() => { setFilterType(opt.k as any); setFilterOpen(false) }}
                    className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filterType === opt.k ? "font-bold text-blue-600" : "text-gray-700"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isBlocked && (
          <div className="mx-4 mb-2 rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <div>
              <p className="text-xs font-bold" style={{ color: "#B91C1C" }}>Аккаунт заблокирован</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#DC2626" }}>Откликнуться на заявки недоступно.</p>
            </div>
          </div>
        )}
        <HelperAvailableTable reqs={sortedAndFilteredAvailableReqs} onChat={handleChat} onAccept={handleAccept} responseStatuses={responseStatuses} loadingRespondId={loadingRespondId} canRespond={!isBlocked && allApproved} />
      </div>

      {completingId !== null && (
        <CompletionModal onClose={() => setCompletingId(null)} onSubmit={(price) => handleSubmitCompletion(price)} />
      )}
    </div>
  );
}

/* ─────────────── chat detail ─────────────── */
function ChatDetail({ chat, myId }: { chat: Chat; myId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<Client | null>(null);

  const other = chat.participants.find(p => p.id !== myId) ?? chat.participants[0];

  useEffect(() => {
    api.getMessages(chat.id).then(setMessages).catch(() => { });
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const wsUrl = api.getWsUrl();
    if (!wsUrl) return;
    const client = new Client({
      brokerURL: wsUrl,
      onConnect: () => {
        client.subscribe(`/topic/chat/${chat.id}`, (frame) => {
          const msg: Message = JSON.parse(frame.body);
          if (msg.senderId !== myId) {
            setMessages(prev => [...prev, msg]);
          }
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [chat.id, myId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const now = new Date().toISOString();
    const localMsg: Message = { id: Date.now(), chatId: chat.id, senderId: myId, text, timestamp: now };
    setMessages(prev => [...prev, localMsg]);
    stompRef.current?.publish({
      destination: `/app/chat_${chat.id}`,
      body: JSON.stringify({ senderId: myId, text }),
    });
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        {other?.avatarUrl
          ? <img src={other.avatarUrl} alt={other.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
            {(other?.name ?? "?").substring(0, 1).toUpperCase()}
          </div>
        }
        <p className="font-bold text-gray-900 text-sm">{other?.name ?? "Пользователь"}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
        {messages.map(msg => {
          const isMe = msg.senderId === myId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${isMe ? "text-white rounded-tr-sm" : "text-gray-800 rounded-tl-sm border border-gray-200"
                }`}
                style={isMe ? { background: BLUE } : { background: "white" }}>
                {msg.text.split("\n").map((line, i) => (
                  <span key={i}>{line}{i < msg.text.split("\n").length - 1 && <br />}</span>
                ))}
                <span className={`text-[10px] ml-2 ${isMe ? "text-blue-100" : "text-gray-400"} inline-flex items-center gap-0.5`}>
                  {fmtTime(msg.timestamp)}
                  {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                </span>
              </div>
              {(msg as any).flagged && (
                <div className="flex items-center gap-1 mt-0.5 px-1" style={{ maxWidth: "65%" }}>
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
                  </svg>
                  <span className="text-[10px] leading-tight" style={{ color: "#B45309" }}>
                    Это сообщение может содержать подозрительный контент
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-white">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="написать сообщение..."
          className="flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 bg-transparent"
        />
        <button onClick={handleSend} className="shrink-0 transition-opacity hover:opacity-75" style={{ color: BLUE }}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── messages list ─────────────── */
function MessagesContent({ onOpenChat, myId }: { onOpenChat: (chat: Chat) => void; myId: string }) {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    api.getChats().then(setChats).catch(() => { });
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {chats.length === 0 ? (
        <p className="px-5 py-10 text-xs text-gray-400 text-center">Нет диалогов</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {chats.map(chat => {
            const other = chat.participants.find(p => p.id !== myId) ?? chat.participants[0];
            const name = other?.name || "Пользователь";
            const avatarUrl = other?.avatarUrl ?? null;
            const last = (chat as any).lastMessage;
            const lastText = last?.text ?? null;
            const lastTime = last?.timestamp ? (() => {
              const d = new Date(last.timestamp);
              const now = new Date();
              const sameDay = d.toDateString() === now.toDateString();
              return sameDay
                ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
            })() : null;
            const isMyLast = last?.senderId === myId;
            return (
              <button key={chat.id} onClick={() => onOpenChat(chat)}
                className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
                {avatarUrl
                  ? <img src={avatarUrl} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  : <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                    {name.substring(0, 1).toUpperCase()}
                  </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{name}</p>
                    {lastTime && <span className="text-[10px] text-gray-400 shrink-0">{lastTime}</span>}
                  </div>
                  {lastText && (
                    <p className="text-xs text-gray-400 leading-tight truncate mt-0.5">
                      {isMyLast && <span className="text-gray-500">Вы: </span>}
                      {lastText}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── my requests page ─────────────── */
function RequestsTable({
  requests,
  onCancel,
  emptyText,
  helperLabel = "Помощник",
}: {
  requests: ServiceRequest[];
  onCancel?: (id: string) => void;
  emptyText: string;
  helperLabel?: string;
}) {
  const COLS = ["Наименование", "Дата регистрации", "Дата выполнения услуг", "Цена", helperLabel];

  return (
    <div className="overflow-x-auto px-4 pt-3 pb-1">
      <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
        <thead>
          <tr>
            {COLS.map((h, i) => {
              const isFirst = i === 0;
              const isLast = !onCancel && i === COLS.length - 1;
              return (
                <th
                  key={h}
                  className="px-4 py-2.5 font-medium whitespace-nowrap"
                  style={{
                    color: BLUE,
                    background: "white",
                    borderTop: "1px solid #BFDBFE",
                    borderBottom: "1px solid #BFDBFE",
                    borderLeft: isFirst ? "1px solid #BFDBFE" : "none",
                    borderRight: isLast ? "1px solid #BFDBFE" : "none",
                    borderRadius: isFirst ? "10px 0 0 10px" : isLast ? "0 10px 10px 0" : "0",
                    textAlign: "left",
                  }}
                >{h}</th>
              );
            })}
            {onCancel && (
              <th
                style={{
                  background: "white",
                  borderTop: "1px solid #BFDBFE",
                  borderBottom: "1px solid #BFDBFE",
                  borderRight: "1px solid #BFDBFE",
                  borderLeft: "none",
                  borderRadius: "0 10px 10px 0",
                  width: "90px",
                }}
              />
            )}
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">{emptyText}</td></tr>
          ) : requests.map(req => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <img src={SERVICE_IMG[req.serviceKey] ?? imgHousehold} alt={req.serviceLabel} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 leading-tight">{req.serviceLabel}</p>
                    <p className="text-gray-400 leading-tight truncate max-w-[140px]">{req.description}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateCreated}</td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap border-b border-gray-100">{req.dateExecution}</td>
              <td className="px-3 py-3 font-semibold text-gray-700 border-b border-gray-100">{req.price}</td>
              <td className="px-3 py-3 border-b border-gray-100">
                {req.helper
                  ? <span className="text-gray-700">{req.helper}</span>
                  : <span className="italic text-gray-400">в поиске</span>}
              </td>
              {onCancel && (
                <td className="px-3 py-3 border-b border-gray-100 text-right">
                  <button
                    onClick={() => onCancel(req.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-red-50 whitespace-nowrap"
                    style={{ color: "#EF4444", borderColor: "#fecaca" }}
                  >
                    Отменить
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyRequestsContent({ userId: _userId }: { userId: string }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    api.getMyRequests().then(list => setRequests(list.map(mapBackendRequest))).catch(() => { });
  }, []);

  const active = requests.filter(r => (r.status ?? "active") === "active");
  const completed = requests.filter(r => r.status === "completed");
  const cancelled = requests.filter(r => r.status === "cancelled");

  const handleCancel = async (id: string) => {
    try {
      await api.updateRequestStatus(id, "cancelled");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "cancelled" as RequestStatus } : r));
    } catch (e) {
      console.error("cancel failed:", e);
    }
  };

  const Section = ({
    title,
    color,
    reqs,
    showCancel,
  }: {
    title: string;
    color: string;
    reqs: ServiceRequest[];
    showCancel?: boolean;
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="font-bold text-sm" style={{ color }}>{title}</h3>
      </div>
      <RequestsTable
        requests={reqs}
        onCancel={showCancel ? handleCancel : undefined}
        emptyText="Нет заявок"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title="Активные заявки" color={GREEN} reqs={active} showCancel />
      <Section title="Прошлые заявки" color="#374151" reqs={completed} />
      <Section title="Отмененные заявки" color="#EF4444" reqs={cancelled} />
    </div>
  );
}

function mapAssignedRequest(r: any): ServiceRequest {
  return { ...mapBackendRequest(r), helper: r.authorName ?? "" };
}

function mapBackendNotification(n: { id: string; type: string; requestId: string; requestTitle: string; actorName: string | null; actorId: string | null; responseId: string | null; status: string | null; createdAt: string }): NotifItem {
  const d = new Date(n.createdAt);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const base = { id: n.id, time, timestamp: n.createdAt, service: n.requestTitle, requestId: n.requestId, actorId: n.actorId ?? undefined };
  const s = n.status; // "ACCEPTED" | "DECLINED" | "REVIEWED" | null

  if (n.type === "NEW_RESPONSE") {
    // если статус уже проставлен — responseId не отдаём (кнопки не показываем)
    const resolved = s === "ACCEPTED" || s === "DECLINED";
    return {
      ...base, type: "new_response", helperName: n.actorName ?? "",
      responseId: resolved ? undefined : (n.responseId ?? undefined),
      responseStatus: s === "ACCEPTED" ? "accepted" : s === "DECLINED" ? "declined" : undefined,
    };
  }
  if (n.type === "REQUEST_ACCEPTED")
    return { ...base, type: "accepted", helperName: n.actorName ?? "" };
  if (n.type === "RESPONSE_ACCEPTED")
    return { ...base, type: "response_accepted", helperName: n.actorName ?? "" };
  if (n.type === "RESPONSE_DECLINED")
    return { ...base, type: "response_declined", helperName: n.actorName ?? "" };
  if (n.type === "REQUEST_CANCELLED")
    return { ...base, type: "cancelled" };
  if (n.type === "REQUEST_COMPLETED")
    return {
      ...base, type: "request_completed", helperName: n.actorName ?? "",
      inviteReplyStatus: s === "REVIEWED" ? "accepted" : undefined, // "accepted" = уже оценено
    };
  if (n.type === "NEW_INVITE")
    return {
      ...base, type: "new_invite", helperName: n.actorName ?? "",
      inviteReplyStatus: s === "ACCEPTED" ? "accepted" : s === "DECLINED" ? "declined" : undefined,
    };
  if (n.type === "INVITE_ACCEPTED")
    return { ...base, type: "invite_accepted", helperName: n.actorName ?? "" };
  if (n.type === "INVITE_DECLINED")
    return { ...base, type: "invite_declined", helperName: n.actorName ?? "" };
  if (n.type === "DOC_REVIEWED")
    return { ...base, type: "doc_reviewed", helperName: n.actorName ?? "", service: n.requestTitle };
  if (n.type === "USER_BLOCKED")
    return { ...base, type: "user_blocked", helperName: n.actorName ?? "Администратор" };
  return { ...base, type: "accepted" };
}

function MyVolunteerRequestsContent({ cancelledRequestId }: { cancelledRequestId?: string | null }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    api.getAssignedRequests().then(list => setRequests(list.map(mapAssignedRequest))).catch(() => { });
  }, []);

  useEffect(() => {
    if (cancelledRequestId) {
      api.getAssignedRequests()
        .then(list => setRequests(list.map(mapAssignedRequest)))
        .catch(() => { });
    }
  }, [cancelledRequestId]);

  const active = requests.filter(r => (r.status ?? "active") === "active");
  const completed = requests.filter(r => r.status === "completed");
  const cancelled = requests.filter(r => r.status === "cancelled");

  const Section = ({ title, color, reqs }: { title: string; color: string; reqs: ServiceRequest[] }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="font-bold text-sm" style={{ color }}>{title}</h3>
      </div>
      <RequestsTable requests={reqs} emptyText="Нет заявок" helperLabel="Заказчик" />
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title="Активные заявки" color={GREEN} reqs={active} />
      <Section title="Прошлые заявки" color="#374151" reqs={completed} />
      <Section title="Отменённые заявки" color="#EF4444" reqs={cancelled} />
    </div>
  );
}

/* ─────────────── find helpers tab ─────────────── */
interface RealHelper {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  categories: string[];
  rating: number;
  aboutMe: string;
  avatarUrl?: string;
  city?: string;
}

const AVATAR_BG = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

function HelperAvatar({ name, size = 40, colorId, avatarUrl }: { name: string; size?: number; colorId: number; avatarUrl?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  const bg = AVATAR_BG[colorId % AVATAR_BG.length];
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontWeight: "bold", fontSize: size * 0.35 }}>{initials}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill={i < full ? "#F59E0B" : "#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-[10px] text-gray-500 ml-0.5">{rating}</span>
    </span>
  );
}

function SelectRequestModal({ requests, helper, onSelect, onNewRequest, onClose }: {
  requests: ServiceRequest[];
  helper: RealHelper;
  onSelect: (req: ServiceRequest) => void;
  onNewRequest: () => void;
  onClose: () => void;
}) {
  const colorId = Math.abs(helper.id.charCodeAt(0));
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Пригласить помощника</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Выберите заявку для <span className="font-semibold">{helper.name}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-light">✕</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(85vh - 120px)" }}>
          {requests.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Нет открытых заявок без помощника</p>
          )}
          {requests.map(req => (
            <div key={req.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                  <img src={SERVICE_IMG[req.serviceKey] ?? imgHousehold} alt={req.serviceLabel} className="w-full h-full object-contain p-1" />
                </div>
                <p className="font-semibold text-gray-800 text-xs">{req.serviceLabel}</p>
              </div>
              <p className="text-[11px] text-gray-500">Адрес: {req.address.split(",")[0]}</p>
              <p className="text-[11px] text-gray-500 mb-3">Дата: {req.dateExecution || "—"}</p>
              <button onClick={() => onSelect(req)}
                className="w-full py-2 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ background: BLUE }}>
                Выбрать эту заявку
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 shrink-0 border-t border-gray-100 pt-3">
          <button onClick={onNewRequest}
            className="w-full py-2.5 text-xs font-bold rounded-xl border-2 border-dashed transition-colors hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: "#BFDBFE", color: BLUE }}>
            + Новая заявка
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmInviteModal({ helper, request, onClose, onConfirm, loading }: {
  helper: RealHelper;
  request: ServiceRequest;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const colorId = Math.abs(helper.id.charCodeAt(0));
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Подтвердить приглашение</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <HelperAvatar name={helper.name} size={56} colorId={colorId} avatarUrl={helper.avatarUrl} />
            <div>
              <p className="font-bold text-gray-900 text-sm">{helper.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {helper.categories.slice(0, 2).map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: BLUE }}>{CATEGORY_META[c]?.label ?? c}</span>
                ))}
              </div>
              <StarRating rating={helper.rating} />
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 border border-gray-100">
            <p className="text-[11px] text-gray-500 mb-1">Заявка:</p>
            <p className="text-xs font-semibold text-gray-800">{request.serviceLabel}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{request.address.split(",")[0]}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Отмена
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: BLUE }}>
              {loading ? "Отправляем..." : "Пригласить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── helper profile modal ─────────────── */
function HelperProfileModal({ helper, onClose, onSelect, colorId }: {
  helper: RealHelper;
  onClose: () => void;
  onSelect: () => void;
  colorId: number;
}) {
  const [reviews, setReviews] = useState<{ id: string; authorId: string; comment: string; rating: number; createdAt: string }[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    api.getReviewsByUserId(helper.id)
      .then((list: any[]) => setReviews(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLoadingReviews(false));
  }, [helper.id]);

  const displayed = showAll ? reviews : reviews.slice(0, 5);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : helper.rating;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-base">Профиль помощника</h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Avatar + name + rating */}
          <div className="flex items-center gap-4">
            <HelperAvatar name={helper.name} size={64} colorId={colorId} avatarUrl={helper.avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-base leading-tight">{helper.name}</p>
              <div className="flex flex-wrap gap-1 mt-1.5 mb-2">
                {helper.categories.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#EFF6FF", color: BLUE }}>{CATEGORY_META[c]?.label ?? c}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-4 h-4" viewBox="0 0 24 24" fill={i <= Math.round(avgRating) ? "#F59E0B" : "#E5E7EB"}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-700">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviews.length} отзывов)</span>
              </div>
            </div>
          </div>

          {/* About */}
          {helper.aboutMe && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 mb-1">О себе</p>
              <p className="text-xs text-gray-700 leading-relaxed">{helper.aboutMe}</p>
            </div>
          )}

          {/* Reviews */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-3">
              Отзывы {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
            </p>
            {loadingReviews ? (
              <p className="text-xs text-gray-400 text-center py-4">Загрузка...</p>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Пока нет отзывов</p>
            ) : (
              <div className="space-y-3">
                {displayed.map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={i <= r.rating ? "#F59E0B" : "#E5E7EB"}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
                {!showAll && reviews.length > 5 && (
                  <button onClick={() => setShowAll(true)}
                    className="w-full py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Посмотреть все отзывы ({reviews.length - 5} ещё)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => { onSelect(); onClose(); }}
            className="w-full py-3 text-white text-sm font-bold rounded-xl transition-opacity hover:opacity-90"
            style={{ background: BLUE }}>
            Выбрать помощника
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── new request form (inline inside modal) ─────────────── */
function NewRequestForm({ helper, onBack, onSent }: {
  helper: RealHelper;
  onBack: () => void;
  onSent: (requestId: string) => void;
}) {
  const services = [
    { key: "household", label: "Бытовые услуги" }, { key: "medical", label: "Медицинская помощь" },
    { key: "escort", label: "Сопровождение" }, { key: "homework", label: "Домашние работы" },
    { key: "shopping", label: "Покупки" },
  ];
  const [serviceKey, setServiceKey] = useState(helper.categories[0] ?? "household");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = "Обязательное поле";
    if (!date) e.date = "Обязательное поле";
    else if (!isValidDate(date)) e.date = "Неверная дата";
    else if (!isFutureDate(date)) e.date = "Дата в прошлом";
    if (!address.trim()) e.address = "Обязательное поле";
    return e;
  };

  const handleSend = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      const svc = services.find(s => s.key === serviceKey);
      const created = await api.createRequest({
        title: svc?.label ?? serviceKey,
        description,
        category: serviceKey,
        location: address,
        price: price ? parseInt(price, 10) : undefined,
        scheduledDate: date,
      });
      await api.inviteHelper((created as any).id, helper.id);
      onSent((created as any).id);
    } catch (e) {
      console.error("[NEW_REQUEST+INVITE] failed", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 130px)" }}>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Категория</label>
        <div className="flex flex-wrap gap-2">
          {services.map(s => (
            <button key={s.key} onClick={() => setServiceKey(s.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={serviceKey === s.key
                ? { background: BLUE, color: "white", border: `1px solid ${BLUE}` }
                : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Описание</label>
        <textarea value={description} onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(er => ({ ...er, description: "" })); }}
          placeholder="Опишите задачу подробно..."
          rows={3}
          className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none resize-none transition-all ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"}`} />
        {errors.description && <p className="text-[10px] text-red-500">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Дата выполнения</label>
          <DatePickerField value={date} onChange={v => { setDate(v); if (errors.date) setErrors(er => ({ ...er, date: "" })); }} error={errors.date} />
          {errors.date && <p className="text-[10px] text-red-500">{errors.date}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Цена (₸)</label>
          <input type="text" inputMode="numeric" value={price}
            onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Ваш адрес</label>
        <button type="button" onClick={() => { setShowMap(true); if (errors.address) setErrors(er => ({ ...er, address: "" })); }}
          className={`w-full px-3 py-2.5 rounded-xl border text-xs text-left flex items-center gap-2 transition-all ${errors.address ? "border-red-400 bg-red-50" : address ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-blue-400"}`}>
          <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {address ? <span className="truncate text-gray-800">{address.split(",").slice(0, 3).join(",")}{city ? <span className="text-gray-400 ml-1">({city})</span> : null}</span>
            : <span className="text-gray-400">Выберите адрес на карте</span>}
        </button>
        {errors.address && <p className="text-[10px] text-red-500">{errors.address}</p>}
      </div>

      {showMap && <AddressPickerModal onClose={() => setShowMap(false)} onSelect={(addr, c) => { setAddress(addr); setCity(c); setShowMap(false); }} />}

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          Назад
        </button>
        <button onClick={handleSend} disabled={sending}
          className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: GREEN }}>
          {sending ? "Отправляем..." : "Отправить заявку"}
        </button>
      </div>
    </div>
  );
}

function FindHelpersTab({ userId: _userId }: { userId: string }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<"all" | "almaty" | "astana">("all");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [helpers, setHelpers] = useState<RealHelper[]>([]);
  const [loadingHelpers, setLoadingHelpers] = useState(true);
  const [selectedHelper, setSelectedHelper] = useState<RealHelper | null>(null);
  const [showSelectReq, setShowSelectReq] = useState(false);
  const [newRequestHelper, setNewRequestHelper] = useState<RealHelper | null>(null);
  const [confirmData, setConfirmData] = useState<{ helper: RealHelper; req: ServiceRequest } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitedRequestId, setInvitedRequestId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [profileHelper, setProfileHelper] = useState<{ helper: RealHelper; colorId: number } | null>(null);

  useEffect(() => {
    api.getVolunteers()
      .then((list: any[]) => {
        setHelpers(list.map(u => ({
          id: u.id,
          name: u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          categories: u.categories ?? [],
          rating: u.rating ?? 0,
          aboutMe: u.aboutMe ?? "",
          avatarUrl: u.avatarUrl,
          city: u.city,
        } as RealHelper)));
      })
      .catch(() => {})
      .finally(() => setLoadingHelpers(false));
    api.getMyRequests().then(list => setMyRequests(list.map(mapBackendRequest))).catch(() => {});
  }, []);

  const activeWithNoHelper = myRequests.filter(r => (r.status ?? "active") === "active" && !r.helper);

  const CATEGORY_FILTERS = [
    { key: "all", label: "Все" },
    ...CATEGORIES_LIST.map(c => ({ key: c.key, label: c.label })),
  ];

  const cityLabel = cityFilter === "almaty" ? "Алматы" : cityFilter === "astana" ? "Астана" : "Все города";

  const filtered = helpers.filter(h => {
    const q = query.toLowerCase();
    const matchQ = !q || h.name.toLowerCase().includes(q) || h.aboutMe.toLowerCase().includes(q) ||
      h.categories.some(c => (CATEGORY_META[c]?.label ?? c).toLowerCase().includes(q));
    const matchCat = categoryFilter === "all" || h.categories.includes(categoryFilter);
    const matchCity = cityFilter === "all" || (h.city ?? "").toLowerCase() === cityFilter;
    return matchQ && matchCat && matchCity;
  });

  const handleSelect = (h: RealHelper) => {
    setSelectedHelper(h);
    setInvitedRequestId(null);
    setShowSelectReq(true);
  };

  const handleSelectRequest = (req: ServiceRequest) => {
    setShowSelectReq(false);
    setConfirmData({ helper: selectedHelper!, req });
  };

  const handleNewRequest = () => {
    setShowSelectReq(false);
    setNewRequestHelper(selectedHelper);
    setSelectedHelper(null);
  };

  const handleConfirmInvite = async () => {
    if (!confirmData) return;
    setInviteLoading(true);
    try {
      await api.inviteHelper(confirmData.req.id, confirmData.helper.id);
      setInvitedRequestId(confirmData.req.id);
      setConfirmData(null);
      setSelectedHelper(null);
    } catch (e) {
      console.error("[INVITE] failed", e);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Поиск помощников"
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all" />
              <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-r-xl" style={{ background: BLUE }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
            </div>
            <div className="relative shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 leading-tight">Мой город:</p>
                <button onClick={() => setCityPickerOpen(v => !v)}
                  className="text-xs font-bold transition-opacity hover:opacity-75 flex items-center gap-1"
                  style={{ color: BLUE }}>
                  {cityLabel}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {cityPickerOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[130px] overflow-hidden">
                  {([["all", "Все города"], ["almaty", "Алматы"], ["astana", "Астана"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => { setCityFilter(key); setCityPickerOpen(false); }}
                      className="block w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                      style={{ color: cityFilter === key ? BLUE : "#374151", fontWeight: cityFilter === key ? "700" : "400" }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {CATEGORY_FILTERS.map(f => (
              <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                style={categoryFilter === f.key
                  ? { background: BLUE, color: "white", border: `1px solid ${BLUE}` }
                  : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {invitedRequestId && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-2" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            <p className="text-xs font-semibold" style={{ color: GREEN }}>Приглашение отправлено!</p>
          </div>
        )}

        {loadingHelpers ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm">Загрузка...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm">По вашему запросу ничего не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((h, idx) => {
              const colorId = Math.abs(h.id.charCodeAt(0)) + idx;
              const displayRating = h.rating > 0 ? h.rating : null;
              return (
                <div key={h.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
                  onClick={() => setProfileHelper({ helper: h, colorId })}>
                  <div className="flex items-start gap-3 mb-2">
                    <HelperAvatar name={h.name} size={44} colorId={colorId} avatarUrl={h.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-xs leading-tight">{h.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1 mb-1">
                        {h.categories.slice(0, 2).map(c => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: BLUE }}>{CATEGORY_META[c]?.label ?? c}</span>
                        ))}
                      </div>
                      {displayRating !== null && <StarRating rating={displayRating} />}
                    </div>
                  </div>
                  {h.aboutMe && <p className="text-[11px] text-gray-500 leading-snug line-clamp-3 flex-1 mb-3">{h.aboutMe}</p>}
                  <div className="flex justify-end mt-auto">
                    <button onClick={e => { e.stopPropagation(); handleSelect(h); }}
                      className="px-4 py-1.5 text-white text-xs font-bold rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: BLUE }}>
                      Выбрать
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSelectReq && selectedHelper && (
        <SelectRequestModal
          requests={activeWithNoHelper}
          helper={selectedHelper}
          onSelect={handleSelectRequest}
          onNewRequest={handleNewRequest}
          onClose={() => { setShowSelectReq(false); setSelectedHelper(null); }}
        />
      )}
      {newRequestHelper && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Новая заявка</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Для помощника <span className="font-semibold">{newRequestHelper.name}</span></p>
              </div>
              <button onClick={() => setNewRequestHelper(null)} className="text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
            </div>
            <div className="p-5">
              <NewRequestForm
                helper={newRequestHelper}
                onBack={() => setNewRequestHelper(null)}
                onSent={reqId => { setInvitedRequestId(reqId); setNewRequestHelper(null); }}
              />
            </div>
          </div>
        </div>
      )}
      {confirmData && (
        <ConfirmInviteModal
          helper={confirmData.helper}
          request={confirmData.req}
          onClose={() => setConfirmData(null)}
          onConfirm={handleConfirmInvite}
          loading={inviteLoading}
        />
      )}
      {profileHelper && (
        <HelperProfileModal
          helper={profileHelper.helper}
          colorId={profileHelper.colorId}
          onClose={() => setProfileHelper(null)}
          onSelect={() => { handleSelect(profileHelper.helper); setProfileHelper(null); }}
        />
      )}
    </>
  );
}

/* ─────────────── notifications tab ─────────────── */
interface NotifItem {
  id: string | number;
  type: "accepted" | "new_response" | "reminder" | "rejected" | "message" | "cancelled" | "response_accepted" | "response_declined" | "request_completed" | "new_invite" | "invite_accepted" | "invite_declined" | "doc_reviewed" | "user_blocked";
  time: string;
  timestamp: string;
  helperName?: string;
  service?: string;
  reason?: string;
  category?: string;
  rating?: number;
  preview?: string;
  date?: string;
  responseId?: string;
  responseStatus?: "accepted" | "declined";
  requestId?: string;
  actorId?: string;
  inviteReplyStatus?: "accepted" | "declined";
}

/* ─────────────── review modal ─────────────── */
function ReviewModal({ targetId, requestTitle, helperName, authorId, requestId, onClose, onSubmitted }: {
  targetId: string;
  requestTitle: string;
  helperName: string;
  authorId: string;
  requestId?: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.submitReview({ targetId: targetId || authorId, rating, comment, authorId, requestId });
      setDone(true);
      setTimeout(() => { onSubmitted(); handleClose(); }, 1500);
    } catch (e) {
      console.error("[REVIEW] submit failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  const STAR_LABELS = ["", "Плохо", "Не очень", "Нормально", "Хорошо", "Отлично!"];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)", backdropFilter: "blur(4px)", transition: "background 0.2s" }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden"
        style={{
          transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), opacity 0.2s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="font-bold text-gray-900 text-base">Оцените услугу</h3>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center pb-10 pt-4 gap-3 px-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#DCFCE7", animation: "scaleIn 0.35s cubic-bezier(.34,1.56,.64,1)" }}
            >
              <svg className="w-8 h-8" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-base">Спасибо за отзыв!</p>
            <p className="text-xs text-gray-400 text-center">Ваша оценка поможет другим пользователям</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5">
            {/* Helper + request info */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                  {(helperName || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{helperName || "Помощник"}</p>
                  <p className="text-[11px] text-gray-400 leading-tight truncate">{requestTitle}</p>
                </div>
              </div>
            </div>

            {/* Stars */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(i => {
                  const active = (hovered || rating) >= i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(i)}
                      style={{
                        transform: active ? "scale(1.15)" : "scale(1)",
                        transition: "transform 0.15s cubic-bezier(.34,1.56,.64,1)",
                      }}
                    >
                      <svg className="w-10 h-10" viewBox="0 0 24 24"
                        fill={active ? "#F59E0B" : "#E5E7EB"}
                        style={{ filter: active ? "drop-shadow(0 2px 4px rgba(245,158,11,0.4))" : "none", transition: "fill 0.15s, filter 0.15s" }}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold h-4 transition-all"
                style={{ color: rating ? "#F59E0B" : "#9ca3af" }}>
                {STAR_LABELS[hovered || rating]}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Комментарий <span className="text-gray-400 font-normal">(необязательно)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Расскажите подробнее об услуге..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none resize-none focus:border-blue-400 transition-all"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full py-3 text-white text-sm font-bold rounded-xl transition-all"
              style={{
                background: rating === 0 ? "#9ca3af" : GREEN,
                cursor: rating === 0 ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Отправляем..." : "Оставить отзыв"}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── invite reply modal ─────────────── */
function InviteModal({ requestId, requestTitle, authorName, onClose, onReplied }: {
  requestId: string;
  requestTitle: string;
  authorName: string;
  onClose: () => void;
  onReplied: (accepted: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [replied, setReplied] = useState<boolean | null>(null);

  useEffect(() => {
    if (requestId) {
      api.getRequestById(requestId).then(r => setRequest(r)).catch(() => {});
    }
  }, [requestId]);

  const handleReply = async (accepted: boolean) => {
    setLoading(true);
    try {
      await api.replyToInvite(requestId, accepted);
      setReplied(accepted);
      setTimeout(() => { onReplied(accepted); onClose(); }, 1200);
    } catch (e) {
      console.error("[INVITE] reply failed", e);
    } finally {
      setLoading(false);
    }
  };

  const SERVICE_LABELS: Record<string, string> = {
    household: "Бытовые услуги", medical: "Медицинская помощь",
    escort: "Сопровождение", homework: "Домашние работы", shopping: "Покупки",
  };

  const authorInitial = (authorName || "?")[0].toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">Личное приглашение</h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {replied !== null ? (
          <div className="flex flex-col items-center py-10 px-6 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: replied ? "#DCFCE7" : "#FEE2E2" }}>
              {replied
                ? <svg className="w-8 h-8" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg className="w-8 h-8" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              }
            </div>
            <p className="font-bold text-gray-900 text-base">{replied ? "Заявка принята!" : "Приглашение отклонено"}</p>
            <p className="text-xs text-gray-400 text-center">
              {replied ? "Заявка появится в ваших активных задачах" : "Заказчик получит уведомление"}
            </p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Author card */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: "linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)" }}>
                {authorInitial}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{authorName}</p>
                <p className="text-[11px] text-gray-400">Заказчик</p>
              </div>
            </div>

            {/* Request details */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700">Информация о заявке</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex justify-between gap-2">
                  <span className="text-[11px] text-gray-400">Категория</span>
                  <span className="text-[11px] font-semibold text-gray-800">
                    {request ? (SERVICE_LABELS[request.category] ?? request.category) : requestTitle}
                  </span>
                </div>
                {request?.description && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-400">Описание</span>
                    <span className="text-[11px] text-gray-700 leading-relaxed">{request.description}</span>
                  </div>
                )}
                {request?.scheduledDate && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[11px] text-gray-400">Дата выполнения</span>
                    <span className="text-[11px] font-semibold text-gray-800">{request.scheduledDate}</span>
                  </div>
                )}
                {request?.price != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[11px] text-gray-400">Вознаграждение</span>
                    <span className="text-[11px] font-bold" style={{ color: GREEN }}>{request.price} ₸</span>
                  </div>
                )}
                {request?.location && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[11px] text-gray-400 shrink-0">Адрес</span>
                    <span className="text-[11px] text-gray-700 text-right break-words max-w-[200px]">{request.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => handleReply(false)} disabled={loading}
                className="flex-1 py-3 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Отклонить
              </button>
              <button onClick={() => handleReply(true)} disabled={loading}
                className="flex-1 py-3 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: GREEN }}>
                {loading ? "..." : "Принять"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotifCard({ n, onView, onAcceptResponse, onDeclineResponse, processingResponseId, onOpenReview, onOpenInvite }: {
  n: NotifItem;
  onView?: () => void;
  onAcceptResponse?: (responseId: string) => void;
  onDeclineResponse?: (responseId: string) => void;
  processingResponseId?: string | null;
  onOpenReview?: (n: NotifItem) => void;
  onOpenInvite?: (n: NotifItem) => void;
}) {
  const colorId = Math.abs(n.helperName?.charCodeAt(0) ?? 0) % 8;

  if (n.type === "accepted") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DCFCE7" }}>
        <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">{n.helperName} принял вашу заявку</p>
        <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {n.time && <span className="text-[10px] text-gray-400">{n.time}</span>}
        <button className="px-3 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap"
          style={{ color: BLUE, border: "1px solid #BFDBFE" }}>
          Открыть заявку
        </button>
      </div>
    </div>
  );

  if (n.type === "new_response") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEF9C3" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EAB308" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 mb-1">Новый отклик на заявку</p>
        {n.service && <p className="text-[10px] text-gray-400 mb-2">Заявка: {n.service}</p>}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-2">
          {n.helperName && <HelperAvatar name={n.helperName} size={32} colorId={colorId} />}
          <p className="text-[11px] font-semibold text-gray-800 leading-tight">{n.helperName}</p>
        </div>
        {n.responseStatus === "accepted" && (
          <p className="text-[11px] font-semibold" style={{ color: GREEN }}>✓ Вы приняли отклик</p>
        )}
        {n.responseStatus === "declined" && (
          <p className="text-[11px] font-semibold" style={{ color: "#EF4444" }}>✗ Вы отклонили отклик</p>
        )}
        {!n.responseStatus && n.responseId && (() => {
          const isProcessing = processingResponseId === n.responseId;
          return (
            <div className="flex gap-2">
              <button
                onClick={() => !isProcessing && onAcceptResponse?.(n.responseId!)}
                disabled={isProcessing}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ background: isProcessing ? "#9ca3af" : GREEN, cursor: isProcessing ? "wait" : "pointer" }}>
                {isProcessing ? "..." : "Принять"}
              </button>
              <button
                onClick={() => !isProcessing && onDeclineResponse?.(n.responseId!)}
                disabled={isProcessing}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg border transition-colors hover:bg-red-50"
                style={{ color: isProcessing ? "#9ca3af" : "#EF4444", borderColor: isProcessing ? "#d1d5db" : "#fecaca", cursor: isProcessing ? "wait" : "pointer" }}>
                {isProcessing ? "..." : "Отклонить"}
              </button>
            </div>
          );
        })()}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "response_accepted") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DCFCE7" }}>
        <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Ваш отклик принят</p>
        {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
        {n.helperName && <p className="text-[10px] text-gray-400">Принял(а): {n.helperName}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "response_declined") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Ваш отклик отклонён</p>
        {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
        {n.helperName && <p className="text-[10px] text-gray-400">Отклонил(а): {n.helperName}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "reminder") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEF9C3" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EAB308" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-gray-900">Напоминание: </span>
        <span className="text-xs text-gray-500">{n.preview}</span>
      </div>
    </div>
  );

  if (n.type === "rejected") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">{n.helperName} отклонила вашу заявку</p>
        <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>
        {n.reason && <p className="text-[10px] text-gray-400">Причина: {n.reason}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "message") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FED7AA" }}>
        <svg className="w-4 h-4" fill="none" stroke="#F97316" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Новое сообщение от {n.helperName}</p>
        <p className="text-[10px] text-gray-400 italic">"{n.preview}"</p>
        {n.date && <p className="text-[10px] text-gray-300 mt-0.5">{n.date}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "cancelled") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Заявка отменена заказчиком</p>
        {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "request_completed") {
    const reviewed = n.inviteReplyStatus === "accepted";
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: reviewed ? "#FEF9C3" : "#DCFCE7" }}>
          {reviewed
            ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">Заявка выполнена</p>
          {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
          {n.helperName && <p className="text-[10px] text-gray-400 mb-2">Помощник: {n.helperName}</p>}
          {reviewed
            ? <p className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>★ Отзыв оставлен</p>
            : (
              <button
                onClick={() => onOpenReview?.(n)}
                className="px-3 py-1 text-[11px] font-bold rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ background: "#F59E0B" }}>
                Оценить
              </button>
            )
          }
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
      </div>
    );
  }

  if (n.type === "new_invite") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: n.inviteReplyStatus === "accepted" ? "#DCFCE7" : n.inviteReplyStatus === "declined" ? "#FEE2E2" : "#EFF6FF" }}>
        {n.inviteReplyStatus === "accepted"
          ? <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          : n.inviteReplyStatus === "declined"
          ? <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          : <svg className="w-4 h-4" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        }
      </div>
      <div className="flex-1 min-w-0">
        {n.inviteReplyStatus === "accepted" && (
          <>
            <p className="text-xs font-semibold text-gray-900">Вы приняли приглашение</p>
            {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
            {n.helperName && <p className="text-[10px] text-gray-400">От заказчика: {n.helperName}</p>}
          </>
        )}
        {n.inviteReplyStatus === "declined" && (
          <>
            <p className="text-xs font-semibold text-gray-900">Вы отклонили приглашение</p>
            {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
          </>
        )}
        {!n.inviteReplyStatus && (
          <>
            <p className="text-xs font-semibold text-gray-900">Личное приглашение</p>
            {n.helperName && <p className="text-[10px] text-gray-400 mb-1">От: {n.helperName}</p>}
            {n.service && <p className="text-[10px] text-gray-400 mb-2">Заявка: {n.service}</p>}
            <button
              onClick={() => onOpenInvite?.(n)}
              className="px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors hover:bg-blue-50"
              style={{ color: BLUE, borderColor: "#BFDBFE" }}>
              Открыть заявку
            </button>
          </>
        )}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "invite_accepted") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DCFCE7" }}>
        <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Приглашение принято</p>
        {n.helperName && <p className="text-[10px] text-gray-400">Помощник: {n.helperName}</p>}
        {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "invite_declined") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
        <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Приглашение отклонено</p>
        {n.helperName && <p className="text-[10px] text-gray-400">Помощник: {n.helperName}</p>}
        {n.service && <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if (n.type === "doc_reviewed") {
    const approved = n.helperName === "APPROVED";
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: approved ? "#DCFCE7" : "#FEE2E2" }}>
          {approved
            ? <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            Документ {approved ? "принят" : "отклонён"}
          </p>
          {n.service && <p className="text-[10px] text-gray-500 mt-0.5">Файл: {n.service}</p>}
          {!approved && n.helperName && n.helperName !== "APPROVED" && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-lg text-[10px] leading-relaxed" style={{ background: "#FFF5F5", color: "#EF4444" }}>
              Причина: {n.helperName}
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
      </div>
    );
  }

  if (n.type === "user_blocked") {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
          <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">Аккаунт заблокирован</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Администратор заблокировал ваш аккаунт. Создание и принятие заявок недоступно.
          </p>
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
      </div>
    );
  }

  return null;
}

function NotificationsTab({ realtimeNotifs, onAcceptResponse, onDeclineResponse, processingResponseId, userId, onUpdateNotif }: {
  realtimeNotifs: NotifItem[];
  onAcceptResponse: (responseId: string) => void;
  onDeclineResponse: (responseId: string) => void;
  processingResponseId?: string | null;
  userId: string;
  onUpdateNotif: (id: string | number, patch: Partial<NotifItem>) => void;
}) {
  const todayStr = new Date().toDateString();
  const [reviewNotif, setReviewNotif] = useState<NotifItem | null>(null);
  const [inviteNotif, setInviteNotif] = useState<NotifItem | null>(null);

  const groups = new Map<string, NotifItem[]>();
  realtimeNotifs.forEach(n => {
    const d = new Date(n.timestamp);
    const label = d.toDateString() === todayStr
      ? "Сегодня"
      : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    groups.set(label, [...(groups.get(label) ?? []), n]);
  });

  if (groups.size === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-10 text-center">
        <p className="text-gray-400 text-sm">Уведомлений пока нет</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {[...groups.entries()].map(([label, items]) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-800">{label}</h3>
            </div>
            <div className="px-5 py-4 space-y-5">
              {items.map(n => (
                <NotifCard
                  key={n.id}
                  n={n}
                  onAcceptResponse={onAcceptResponse}
                  onDeclineResponse={onDeclineResponse}
                  processingResponseId={processingResponseId}
                  onOpenReview={setReviewNotif}
                  onOpenInvite={setInviteNotif}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {reviewNotif && (
        <ReviewModal
          targetId={reviewNotif.actorId ?? ""}
          requestTitle={reviewNotif.service ?? ""}
          helperName={reviewNotif.helperName ?? ""}
          authorId={userId}
          requestId={reviewNotif.requestId}
          onClose={() => setReviewNotif(null)}
          onSubmitted={() => {
            onUpdateNotif(reviewNotif.id, { inviteReplyStatus: "accepted" });
            setReviewNotif(null);
          }}
        />
      )}
      {inviteNotif && inviteNotif.requestId && (
        <InviteModal
          requestId={inviteNotif.requestId}
          requestTitle={inviteNotif.service ?? ""}
          authorName={inviteNotif.helperName ?? ""}
          onClose={() => setInviteNotif(null)}
          onReplied={accepted => {
            onUpdateNotif(inviteNotif.id, { inviteReplyStatus: accepted ? "accepted" : "declined" });
            setInviteNotif(null);
          }}
        />
      )}
    </>
  );
}

/* ─────────────── account settings tab ─────────────── */
const CATEGORY_META: Record<string, { label: string; img: string }> = {
  household: { label: "Бытовая помощь", img: imgHousehold },
  medical: { label: "Медицинская помощь", img: imgMedical },
  escort: { label: "Сопровождение", img: imgEscort },
  homework: { label: "Домашние работы", img: imgHomeWork },
  shopping: { label: "Покупки", img: imgShopping },
};

const CATEGORIES_LIST = [
  { key: "household", label: "Бытовая помощь", desc: "уборка, приготовление еды" },
  { key: "medical", label: "Медицинская помощь", desc: "покупка лекарств, сопровождение" },
  { key: "escort", label: "Сопровождение", desc: "поход в больницу, прогулка" },
  { key: "homework", label: "Домашние работы", desc: "починка, мелкий ремонт" },
  { key: "shopping", label: "Покупки", desc: "продукты, хозяйственные товары" },
];

const REQUIRED_DOCS = [
  "Справка из наркологического диспансера",
  "Справка из психиатрического диспансера",
  "Справка об отсутствии судимости",
];

function PasswordResetModal({ onClose }: { onClose: () => void }) {
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false); const [showNew, setShowNew] = useState(false); const [showConf, setShowConf] = useState(false);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Сбросить пароль</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
        </div>
        <div className="space-y-4 mb-6">
          {[
            { label: "Старый пароль", val: oldPw, set: setOldPw, show: showOld, setShow: setShowOld },
            { label: "Новый пароль", val: newPw, set: setNewPw, show: showNew, setShow: setShowNew },
            { label: "Подтвердите новый пароль", val: confirmPw, set: setConfirmPw, show: showConf, setShow: setShowConf },
          ].map(({ label, val, set, show, setShow }) => (
            <div key={label}>
              <label className="text-xs text-gray-600 mb-1 block">{label}</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-10" />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">забыли пароль?</button>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ background: BLUE }}>подтвердить</button>
        </div>
      </div>
    </div>
  );
}

function CategoryPickerModal({ selected, onToggle, onClose }: {
  selected: string[]; onToggle: (key: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
        <h3 className="text-center font-bold text-gray-800 text-base mb-8">Выберите категорию, чтобы оказать услугу...</h3>
        <div className="grid grid-cols-5 gap-4">
          {CATEGORIES_LIST.map(cat => {
            const isSel = selected.includes(cat.key);
            return (
              <div key={cat.key} className="border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center gap-3 h-full">
                <img src={CATEGORY_META[cat.key].img} className="w-20 h-20 object-contain" alt={cat.label} />
                <div>
                  <p className="font-semibold text-gray-800 text-xs leading-tight">{cat.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{cat.desc}</p>
                </div>
                <button onClick={() => onToggle(cat.key)}
                  className="w-full py-2 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 mt-auto"
                  style={{ background: isSel ? "#EF4444" : GREEN }}>
                  {isSel ? "Убрать" : "Выбрать"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-2">Удалить аккаунт?</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Вы уверены, что хотите удалить свою учётную запись? Все данные будут безвозвратно удалены и недоступны для восстановления.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ background: "#EF4444" }}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

function UnsavedChangesModal({ onSave, onDiscard }: { onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-2">Несохранённые изменения</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">У вас есть несохранённые изменения в настройках аккаунта. Сохранить их перед уходом?</p>
        <div className="flex gap-3">
          <button onClick={onDiscard} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Не сохранять</button>
          <button onClick={onSave} className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ background: BLUE }}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── document types config ─────────────── */
const DOC_TYPES = [
  { key: "NARCO_CERT",   label: "Справка из наркологического диспансера" },
  { key: "PSYCH_CERT",   label: "Справка из психиатрического диспансера" },
  { key: "NO_CRIMINAL",  label: "Справка об отсутствии судимости" },
] as const;

type DocType = "NARCO_CERT" | "PSYCH_CERT" | "NO_CRIMINAL";

interface UserDoc {
  id: string; userId: string; documentType: DocType; fileName: string;
  fileUrl: string; status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null; uploadedAt: string; reviewedAt: string | null;
}

function DocStatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: GREEN }}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>Принято
    </span>
  );
  if (status === "REJECTED") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEE2E2", color: "#EF4444" }}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>Отказано
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF9C3", color: "#CA8A04" }}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" /></svg>На проверке
    </span>
  );
}

function DocumentsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<DocType | null>(null);
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyDocuments().then((list: any[]) => setDocs(list)).catch(() => {});
  }, []);

  const getDoc = (type: DocType) => {
    const matches = docs.filter(d => d.documentType === type);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  };

  const handleUploadClick = (type: DocType) => {
    setError(null);
    setPendingType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingType) return;
    if (file.type !== "application/pdf") {
      setError("Разрешены только PDF файлы");
      setPendingType(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Размер файла не должен превышать 10 МБ");
      setPendingType(null);
      return;
    }
    setUploading(pendingType);
    setPendingType(null);
    try {
      const uploaded: any = await api.uploadDocument(pendingType as string, file);
      setDocs(prev => {
        const filtered = prev.filter(d => d.documentType !== uploaded.documentType);
        return [...filtered, uploaded];
      });
    } catch {
      setError("Ошибка при загрузке. Попробуйте ещё раз.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold" style={{ background: "#FEE2E2", color: "#EF4444" }}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" /></svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700">Обязательные документы</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Только PDF формат • Максимум 10 МБ</p>
        </div>
        <div className="divide-y divide-gray-50">
          {DOC_TYPES.map(({ key, label }) => {
            const doc = getDoc(key as DocType);
            const isUploading = uploading === key;
            return (
              <div key={key} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FEF2F2" }}>
                      <svg className="w-4 h-4" style={{ color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
                      {doc ? (
                        <div className="mt-1.5 space-y-1">
                          <DocStatusBadge status={doc.status} />
                          <p className="text-[10px] text-gray-400 truncate">{doc.fileName}</p>
                          {doc.status === "REJECTED" && doc.rejectReason && (
                            <p className="text-[10px] leading-relaxed" style={{ color: "#EF4444" }}>
                              Причина: {doc.rejectReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-0.5">Не загружен</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {doc && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-[10px] font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        Открыть
                      </a>
                    )}
                    <button
                      onClick={() => handleUploadClick(key as DocType)}
                      disabled={isUploading}
                      className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: doc?.status === "APPROVED" ? "#9ca3af" : doc ? "#F59E0B" : GREEN }}
                    >
                      {isUploading ? "..." : doc?.status === "APPROVED" ? "Принято" : doc ? "Обновить" : "Загрузить"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 pb-3 pt-1">
          <p className="text-[10px] text-gray-400">* Все три документа обязательны для получения доступа к функциям платформы</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EFF6FF" }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm">Безопасность документов</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Ваши документы защищены и доступны только вам и администраторам платформы. Данные хранятся в зашифрованном виде.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── doc access hook ─────────────── */
function useDocAccess() {
  const [docs, setDocs] = useState<UserDoc[]>([]);
  useEffect(() => {
    api.getMyDocuments().then((list: any[]) => setDocs(list)).catch(() => {});
  }, []);

  // Deduplicate: keep only the latest doc per type
  const latestByType = DOC_TYPES.reduce<Record<string, UserDoc>>((acc, dt) => {
    const matches = docs.filter(d => d.documentType === dt.key);
    if (matches.length > 0) {
      acc[dt.key] = matches.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    }
    return acc;
  }, {});

  const approvedTypes = new Set(Object.values(latestByType).filter(d => d.status === "APPROVED").map(d => d.documentType));
  const allApproved = DOC_TYPES.every(dt => approvedTypes.has(dt.key as DocType));
  const missingDocs = DOC_TYPES.filter(dt => {
    const d = latestByType[dt.key];
    if (!d) return true;
    if (d.status === "REJECTED") return true;
    return false;
  });
  const pendingDocs = DOC_TYPES.filter(dt => latestByType[dt.key]?.status === "PENDING");
  return { allApproved, missingDocs, pendingDocs, docs };
}

function AccountSettingsTab({ onDirtyChange, settingsSaveRef }: {
  onDirtyChange: (dirty: boolean) => void;
  settingsSaveRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { currentUser, updateProfile, uploadAvatar, deleteAvatar, updateCategories, deleteAccount, logout } = useAuth();
  if (!currentUser) return null;
  const u = currentUser;

  const [settingsView, setSettingsView] = useState<"profile" | "documents">("profile");
  const [firstName, setFirstName] = useState(u.firstName);
  const [lastName, setLastName] = useState(u.lastName);
  const [email, setEmail] = useState(u.email);
  const [phone, setPhone] = useState(u.phone);
  const [city, setCity] = useState(u.city ?? "almaty");
  const [role, setRole] = useState(u.role);
  const [categories, setCategories] = useState<string[]>(u.categories ?? []);
  const [aboutMe, setAboutMe] = useState(u.aboutMe ?? "");
  const [emailEditing, setEmailEditing] = useState(false);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(u.avatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const initRef = useRef({
    firstName: u.firstName, lastName: u.lastName, email: u.email,
    phone: u.phone, city: u.city ?? "almaty", role: u.role,
    categories: (u.categories ?? []).join(","),
    aboutMe: u.aboutMe ?? "",
  });

  const isDirty =
    firstName !== initRef.current.firstName ||
    lastName !== initRef.current.lastName ||
    email !== initRef.current.email ||
    phone !== initRef.current.phone ||
    city !== initRef.current.city ||
    role !== initRef.current.role ||
    aboutMe !== initRef.current.aboutMe ||
    avatarFile !== null ||
    (role === "volunteer" && categories.join(",") !== initRef.current.categories);

  useEffect(() => { onDirtyChange(isDirty); }, [firstName, lastName, email, phone, city, role, categories, aboutMe]);

  settingsSaveRef.current = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      await updateProfile({ firstName, lastName, email, phone, city, role, aboutMe });
      await updateCategories(categories);
      setAvatarFile(null);
      initRef.current = { firstName, lastName, email, phone, city, role, categories: categories.join(","), aboutMe };
      onDirtyChange(false);
    } catch {
      setSaveError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => { settingsSaveRef.current?.(); };

  const EditPen = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" />
      <path d="m18.5 2.5 2 2L10 15l-2.5.5.5-2.5L18.5 2.5z" strokeWidth="2" />
    </svg>
  );
  const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke={GREEN} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="2.5" /></svg>
  );

  if (settingsView === "documents") {
    return (
      <div className="space-y-4">
        <button onClick={() => setSettingsView("profile")}
          className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-75"
          style={{ color: BLUE }}>
          <ArrowLeft className="w-4 h-4" /> Назад к профилю
        </button>
        <DocumentsView />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <h2 className="font-bold text-gray-900 text-base pb-4 border-b border-gray-100">Мой профиль</h2>

      {/* ── Avatar + role toggle ── */}
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          {avatarSrc
            ? <img src={avatarSrc} className="w-20 h-20 rounded-full object-cover border border-gray-200" />
            : <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: BLUE }}>
              {(u.firstName[0] + (u.lastName?.[0] ?? '')).toUpperCase()}
            </div>
          }
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAvatarFile(file);
                setAvatarSrc(URL.createObjectURL(file));
              }} />
            <button onClick={() => avatarInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}>
              + Изменить изображение
            </button>
            <button onClick={async () => {
              setAvatarSrc(null);
              setAvatarFile(null);
              try { await deleteAvatar(); } catch { }
            }}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              Удалить изображение
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Мы поддерживаем формат PNG, JPEG и GIF размером менее 2 МБ</p>
          <div className="flex gap-2">
            <button onClick={() => setRole("elderly")}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl transition-colors"
              style={role === "elderly" ? { background: BLUE, color: "white", border: "none" } : { background: "white", color: BLUE, border: `1px solid ${BLUE}` }}>
              Запросить помощь
            </button>
            <button onClick={() => setRole("volunteer")}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl transition-colors"
              style={role === "volunteer" ? { background: BLUE, color: "white", border: "none" } : { background: "white", color: BLUE, border: `1px solid ${BLUE}` }}>
              Оказать помощь
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories (volunteer only) ── */}
      {role === "volunteer" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Категории</label>
            <span className="text-[10px] text-gray-400">Добавить ещё...</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map(key => (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: BLUE }}>
                {CATEGORY_META[key]?.label ?? key}
                <button onClick={() => setCategories(p => p.filter(c => c !== key))}
                  className="text-white/80 hover:text-white font-bold leading-none">✕</button>
              </div>
            ))}
            <button onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:border-blue-300 transition-colors">
              {categories.length === 0 ? "Добавить категорию" : CATEGORIES_LIST.find(c => !categories.includes(c.key))?.label ?? "Добавить ещё"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Profile form ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Имя</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Фамилия</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Город</label>
          <div className="relative">
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-3 py-2.5 pr-8 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all appearance-none bg-white cursor-pointer">
              <option value="almaty">Алматы</option>
              <option value="astana">Астана</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Электронная почта</label>
          <div className="relative">
            <input type="email" value={email} readOnly={!emailEditing} onChange={e => setEmail(e.target.value)}
              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs outline-none transition-all ${emailEditing ? "border-blue-400" : "border-gray-200"}`} />
            <button type="button" onClick={() => setEmailEditing(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              {emailEditing ? <CheckIcon /> : <EditPen />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Номер телефона</label>
          <div className="relative">
            <input type="tel" value={phone} readOnly={!phoneEditing} onChange={e => setPhone(e.target.value)}
              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs outline-none transition-all ${phoneEditing ? "border-blue-400" : "border-gray-200"}`} />
            <button type="button" onClick={() => setPhoneEditing(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              {phoneEditing ? <CheckIcon /> : <EditPen />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Пароль</label>
          <div className="relative">
            <input type="password" value="••••••••••" readOnly
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-xs outline-none" />
            <button type="button" onClick={() => setShowPasswordModal(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              <EditPen />
            </button>
          </div>
        </div>

        {role === "volunteer" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Кратко про себя</label>
              <span className="text-[10px] text-gray-400">
                {aboutMe.trim() ? aboutMe.trim().split(/\s+/).length : 0} / 100 слов
              </span>
            </div>
            <textarea
              value={aboutMe}
              onChange={e => setAboutMe(e.target.value)}
              placeholder="Расскажите о себе: опыт, навыки, чем можете помочь..."
              rows={3}
              maxLength={800}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none resize-none focus:border-blue-400 transition-all"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Этот текст будет виден в каталоге помощников</p>
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-500 text-right">{saveError}</p>
        )}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={!isDirty || saving}
            className="px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity"
            style={{ background: (isDirty && !saving) ? GREEN : "#9CA3AF", cursor: (isDirty && !saving) ? "pointer" : "not-allowed", opacity: (isDirty && !saving) ? 1 : 0.7 }}>
            {saving ? "Сохраняем..." : "сохранить"}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Documents ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Мои документы</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Ваши документы защищены и доступны только вам и доверенным лицам.</p>
        </div>
        <button onClick={() => setSettingsView("documents")}
          className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-blue-50 transition-colors"
          style={{ color: BLUE, borderColor: "#BFDBFE" }}>
          посмотреть
        </button>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Delete account ── */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{ color: "#EF4444" }}>Удалить мой аккаунт</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-xl leading-relaxed">
            Безвозвратно удалите учётную запись со всеми связанными данными, включая личную информацию, историю активности и документы, без возможности последующего восстановления. После удаления доступ ко всем рабочим областям, сервисам и функциям платформы будет полностью прекращён.
          </p>
        </div>
        <button onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-xs font-bold text-white rounded-xl shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: "#EF4444" }}>
          удалить аккаунт
        </button>
      </div>

      {showPasswordModal && <PasswordResetModal onClose={() => setShowPasswordModal(false)} />}
      {showCategoryModal && <CategoryPickerModal selected={categories} onToggle={k => setCategories(p => p.includes(k) ? p.filter(c => c !== k) : [...p, k])} onClose={() => setShowCategoryModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={async () => {
        try { await deleteAccount(); } catch { logout(); }
      }} />}
    </div>
  );
}

/* ─────────────── coming soon placeholder ─────────────── */
function ComingSoon() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">{t("dashboard.comingSoon")}</p>
    </div>
  );
}

/* ─────────────── main content area ─────────────── */
function DashboardContent({ activeNav, setActiveNav, userId, userRole, firstName, openedChat, setOpenedChat, onSettingsDirtyChange, settingsSaveRef }: {
  activeNav: NavKey;
  setActiveNav: (nav: NavKey) => void;
  userId: string;
  userRole: string;
  firstName: string;
  openedChat: Chat | null;
  setOpenedChat: (chat: Chat | null) => void;
  onSettingsDirtyChange: (dirty: boolean) => void;
  settingsSaveRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { t } = useLanguage();
  const isVolunteer = userRole === "volunteer";
  const [activeTab, setActiveTab] = useState<TabKey>("create");
  const [settingsDirtyLocal, setSettingsDirtyLocal] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);
  const [showUnsavedTab, setShowUnsavedTab] = useState(false);
  const [realtimeNotifs, setRealtimeNotifs] = useState<NotifItem[]>([]);
  const [cancelledRequestId, setCancelledRequestId] = useState<string | null>(null);
  const [declinedRequestId, setDeclinedRequestId] = useState<string | null>(null);
  const [acceptedRequestId, setAcceptedRequestId] = useState<string | null>(null);
  const [activeReqsVersion, setActiveReqsVersion] = useState(0);
  const notifStompRef = useRef<Client | null>(null);

  useEffect(() => {
    api.getNotifications()
      .then(list => setRealtimeNotifs(list.map(mapBackendNotification)))
      .catch(() => { });
  }, [userId]);

  useEffect(() => {
    const wsUrl = api.getWsUrl();
    if (!wsUrl) return;
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/notifications/${userId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            const now = new Date();
            const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            const ts = now.toISOString();

            if (data.type === "NEW_RESPONSE") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "new_response" as const,
                helperName: data.volunteerName, service: data.requestTitle,
                responseId: data.responseId, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "REQUEST_ACCEPTED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "accepted" as const,
                helperName: data.volunteerName, service: data.requestTitle,
                time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "RESPONSE_ACCEPTED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "response_accepted" as const,
                service: data.requestTitle, helperName: data.volunteerName, time, timestamp: ts,
              }, ...prev]);
              setActiveReqsVersion(v => v + 1);
              setAcceptedRequestId(data.requestId);
            } else if (data.type === "RESPONSE_DECLINED") {
              setDeclinedRequestId(data.requestId);
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "response_declined" as const,
                service: data.requestTitle, helperName: data.volunteerName, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "REQUEST_CANCELLED") {
              setCancelledRequestId(data.requestId);
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "cancelled" as const,
                service: data.requestTitle, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "REQUEST_COMPLETED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "request_completed" as const,
                service: data.requestTitle, helperName: data.volunteerName, requestId: data.requestId,
                actorId: data.actorId ?? undefined, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "NEW_INVITE") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "new_invite" as const,
                service: data.requestTitle, helperName: data.volunteerName, requestId: data.requestId, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "INVITE_ACCEPTED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "invite_accepted" as const,
                service: data.requestTitle, helperName: data.volunteerName, requestId: data.requestId, time, timestamp: ts,
              }, ...prev]);
              setActiveReqsVersion(v => v + 1);
            } else if (data.type === "INVITE_DECLINED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "invite_declined" as const,
                service: data.requestTitle, helperName: data.volunteerName, requestId: data.requestId, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "DOC_REVIEWED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "doc_reviewed" as const,
                service: data.requestTitle, helperName: data.volunteerName, time, timestamp: ts,
              }, ...prev]);
            } else if (data.type === "USER_BLOCKED") {
              setRealtimeNotifs(prev => [{
                id: Date.now(), type: "user_blocked" as const,
                helperName: "Администратор", time, timestamp: ts,
              }, ...prev]);
            }
          } catch { /* ignore malformed messages */ }
        });
      },
    });
    client.activate();
    notifStompRef.current = client;
    return () => { client.deactivate(); };
  }, [userId]);

  useEffect(() => {
    if (isVolunteer && activeTab === "search") setActiveTab("create");
  }, [isVolunteer]);

  const handleDirtyChange = (dirty: boolean) => {
    setSettingsDirtyLocal(dirty);
    onSettingsDirtyChange(dirty);
  };

  const handleTabClick = (key: TabKey) => {
    if (settingsDirtyLocal && activeTab === "settings" && key !== "settings") {
      setPendingTab(key);
      setShowUnsavedTab(true);
    } else {
      setActiveTab(key);
    }
  };

  const handleUnsavedSave = () => {
    settingsSaveRef.current?.();
    setShowUnsavedTab(false);
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  };

  const handleUnsavedDiscard = () => {
    handleDirtyChange(false);
    setShowUnsavedTab(false);
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  };

  const handleOpenChat = (chat: Chat) => {
    setActiveNav("messages");
    setOpenedChat(chat);
  };

  const [processingResponseId, setProcessingResponseId] = useState<string | null>(null);

  const handleAcceptResponse = async (responseId: string) => {
    setProcessingResponseId(responseId);
    try {
      await api.acceptResponse(responseId);
      // найти requestId из уведомления чтобы передать волонтёру
      const notif = realtimeNotifs.find(n => n.responseId === responseId);
      setRealtimeNotifs(prev =>
        prev.map(n => n.responseId === responseId
          ? { ...n, responseId: undefined, responseStatus: "accepted" as const }
          : n)
      );
      setActiveReqsVersion(v => v + 1);
      if (notif?.requestId) setAcceptedRequestId(notif.requestId);
    } catch (e) {
      console.error("[RESPONSE] accept failed", e);
    } finally {
      setProcessingResponseId(null);
    }
  };

  const handleDeclineResponse = async (responseId: string) => {
    setProcessingResponseId(responseId);
    try {
      await api.declineResponse(responseId);
      setRealtimeNotifs(prev =>
        prev.map(n => n.responseId === responseId
          ? { ...n, responseId: undefined, responseStatus: "declined" as const }
          : n)
      );
    } catch (e) {
      console.error("[RESPONSE] decline failed", e);
    } finally {
      setProcessingResponseId(null);
    }
  };

  if (activeNav === "messages") {
    if (openedChat !== null) {
      return (
        <div style={{ height: "calc(100vh - 108px)" }}>
          <ChatDetail chat={openedChat} myId={userId} />
        </div>
      );
    }
    return <MessagesContent onOpenChat={setOpenedChat} myId={userId} />;
  }

  if (activeNav === "requests") return isVolunteer
    ? <MyVolunteerRequestsContent cancelledRequestId={cancelledRequestId} />
    : <MyRequestsContent userId={userId} />;

  if (activeNav === "statistics") return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <iframe
        title="диплом"
        width="100%"
        height="541"
        src="https://app.powerbi.com/reportEmbed?reportId=9f87d303-055b-415c-a029-055439ae653a&autoAuth=true&ctid=347fd89f-696a-49ca-9f8b-9724f5750471"
        frameBorder={0}
        allowFullScreen
      />
    </div>
  );

  if (activeNav !== "dashboard") return <ComingSoon />;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "create", label: isVolunteer ? "Мои задачи" : t("dashboard.tabCreate") },
    ...(!isVolunteer ? [{ key: "search" as TabKey, label: t("dashboard.tabSearch") }] : []),
    { key: "notifications", label: t("dashboard.tabNotifications") },
    { key: "settings", label: t("dashboard.tabSettings") },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto snap-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => handleTabClick(tab.key)}
                className="px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 shrink-0 snap-start"
                style={activeTab === tab.key ? { color: BLUE, borderColor: BLUE, background: "white" } : { color: "#6b7280", borderColor: "transparent" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "create" && (isVolunteer ? <HelperDashboard user={{ firstName }} onOpenChat={handleOpenChat} cancelledRequestId={cancelledRequestId} declinedRequestId={declinedRequestId} acceptedRequestId={acceptedRequestId} activeReqsVersion={activeReqsVersion} /> : <CreateRequestTab userId={userId} version={activeReqsVersion} />)}
        {activeTab === "search" && <FindHelpersTab userId={userId} />}
        {activeTab === "notifications" && <NotificationsTab realtimeNotifs={realtimeNotifs} onAcceptResponse={handleAcceptResponse} onDeclineResponse={handleDeclineResponse} processingResponseId={processingResponseId} userId={userId} onUpdateNotif={(id, patch) => setRealtimeNotifs(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))} />}
        {activeTab === "settings" && <AccountSettingsTab onDirtyChange={handleDirtyChange} settingsSaveRef={settingsSaveRef} />}
      </div>
      {showUnsavedTab && (
        <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard} />
      )}
    </>
  );
}

/* ─────────────── page root ─────────────── */
function DashboardPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const [openedChat, setOpenedChat] = useState<Chat | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<NavKey | null>(null);
  const [showNavUnsaved, setShowNavUnsaved] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsSaveRef = useRef<(() => void) | null>(null);

  if (!currentUser) return null;

  const handleNavChange = (key: NavKey) => {
    setMobileMenuOpen(false);
    if (settingsDirty && activeNav === "dashboard") {
      setPendingNav(key);
      setShowNavUnsaved(true);
    } else {
      setActiveNav(key);
      setOpenedChat(null);
    }
  };

  const navTitleMap: Partial<Record<NavKey, string>> = {
    messages: t("dashboard.navMessages"),
    requests: t("dashboard.navMyRequests"),
  };

  const headerLeft = navTitleMap[activeNav] ? (
    <div className="flex items-center gap-3">
      <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-700 hover:text-blue-500 transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      <button
        onClick={() => {
          if (activeNav === "messages" && openedChat !== null) setOpenedChat(null);
          else handleNavChange("dashboard");
        }}
        className="flex items-center gap-1.5 font-bold text-sm transition-opacity hover:opacity-75"
        style={{ color: BLUE }}
      >
        <ArrowLeft className="w-4 h-4" />
        {navTitleMap[activeNav]}
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-700 hover:text-blue-500 transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      <p className="text-sm font-bold" style={{ color: BLUE }}>{t("dashboard.title")}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden md:flex">
        <Sidebar activeNav={activeNav} setActiveNav={handleNavChange} user={currentUser} />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-[85%] max-w-[320px] h-full bg-[#dae9f4] rounded-r-3xl overflow-hidden flex flex-col pt-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-6 right-6 text-[#4B688A] hover:text-[#2E486D] transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
            <div className="px-6 mb-8 flex items-center gap-3">
              <img src={logoImg} alt="Qamqor Logo" className="w-12 h-12 rounded-full border-2 border-[#5bb8f5] bg-white object-contain p-1 shadow-sm" />
              <p className="font-bold text-[#2E486D] text-2xl tracking-wide uppercase">Qamqor</p>
            </div>
            <nav className="flex-1 px-4 flex flex-col gap-1.5">
              <button onClick={() => handleNavChange("dashboard")} className={`px-4 py-3 text-left text-[15px] rounded-xl transition-all ${activeNav === "dashboard" ? "bg-white/60 font-bold text-[#2E486D] shadow-sm" : "text-[#4B688A] font-medium hover:bg-white/40"}`}>{t("dashboard.navDashboard")}</button>
              <button onClick={() => handleNavChange("messages")} className={`px-4 py-3 text-left text-[15px] rounded-xl transition-all ${activeNav === "messages" ? "bg-white/60 font-bold text-[#2E486D] shadow-sm" : "text-[#4B688A] font-medium hover:bg-white/40"}`}>{t("dashboard.navMessages")}</button>
              <button onClick={() => handleNavChange("requests")} className={`px-4 py-3 text-left text-[15px] rounded-xl transition-all ${activeNav === "requests" ? "bg-white/60 font-bold text-[#2E486D] shadow-sm" : "text-[#4B688A] font-medium hover:bg-white/40"}`}>{t("dashboard.navMyRequests")}</button>
              <button onClick={() => handleNavChange("statistics")} className={`px-4 py-3 text-left text-[15px] rounded-xl transition-all ${activeNav === "statistics" ? "bg-white/60 font-bold text-[#2E486D] shadow-sm" : "text-[#4B688A] font-medium hover:bg-white/40"}`}>{t("dashboard.navStatistics")}</button>
              <button onClick={() => handleNavChange("support")} className={`px-4 py-3 text-left text-[15px] rounded-xl transition-all ${activeNav === "support" ? "bg-white/60 font-bold text-[#2E486D] shadow-sm" : "text-[#4B688A] font-medium hover:bg-white/40"}`}>{t("dashboard.navSupport")}</button>
            </nav>
            <div className="p-6 pb-8 mt-auto">
              <button onClick={() => currentUser && window.location.replace("/")} className="bg-white rounded-full px-5 py-3.5 text-red-500 font-semibold flex items-center justify-center gap-2 border border-white shadow-sm w-full hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" /> {t("dashboard.navLogout")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-gray-50">
        <div className="p-3 md:p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between shrink-0 p-3 md:px-5 md:py-3">
            {headerLeft}
            <div className="flex items-center gap-2">
              <AccessibilityToggle />
              <LanguageSwitcher />
            </div>
          </div>

          <DashboardContent
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            userId={currentUser.id}
            userRole={currentUser.role}
            firstName={currentUser.firstName}
            openedChat={openedChat}
            setOpenedChat={setOpenedChat}
            onSettingsDirtyChange={setSettingsDirty}
            settingsSaveRef={settingsSaveRef}
          />
        </div>
      </div>

      {showNavUnsaved && (
        <UnsavedChangesModal
          onSave={() => {
            settingsSaveRef.current?.();
            setSettingsDirty(false);
            setShowNavUnsaved(false);
            if (pendingNav) { setActiveNav(pendingNav); setOpenedChat(null); setPendingNav(null); }
          }}
          onDiscard={() => {
            setSettingsDirty(false);
            setShowNavUnsaved(false);
            if (pendingNav) { setActiveNav(pendingNav); setOpenedChat(null); setPendingNav(null); }
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPageWithGuard() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}
