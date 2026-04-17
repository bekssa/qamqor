import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "@features/auth/model/context";
import { useLanguage } from "@features/language/model/context";
import { useAccessibility } from "@features/accessibility/model/context";
import AuthGuard from "@app/guards/auth-guard";

import imgHousehold from "@/assets/services/household.png";
import imgMedical from "@/assets/services/medical.png";
import imgEscort from "@/assets/services/escort.png";
import imgHomeWork from "@/assets/services/homework.png";
import imgShopping from "@/assets/services/shopping.png";

import imgUserPhoto from "@assets/Ellipse_374_1776245458894.png";
import imgQamqor from "@assets/Rectangle_240662641_1776245382727.png";
import imgHelperAvatar from "@assets/image_1776248251802.png";

const GREEN = "#2C9C42";
const BLUE = "#3B82F6";

type NavKey = "dashboard" | "messages" | "requests" | "statistics" | "support";
type TabKey = "create" | "search" | "notifications" | "settings";

/* ─────────────── requests types ─────────────── */
type RequestStatus = "active" | "completed" | "cancelled";

interface ServiceRequest {
  id: number;
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

const STORAGE_KEY = (userId: number) => `qamqor-requests-v2-${userId}`;

const SEED_REQUESTS: ServiceRequest[] = [
  { id: 1,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Сходить в аптеку за лекарствами", price: "4000", dateCreated: "18.06.2026", dateExecution: "20.06.2026", address: "ул. Абая 50", helper: "Умбеталиев Али", status: "active" },
  { id: 2,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Сходить в аптеку за лекарствами", price: "4000", dateCreated: "18.06.2026", dateExecution: "20.06.2026", address: "ул. Абая 50", helper: "",               status: "active" },
  { id: 3,  serviceKey: "household", serviceLabel: "Бытовые услуги",  description: "Уборка, приготовление еды",       price: "3500", dateCreated: "18.06.2026", dateExecution: "20.06.2026", address: "ул. Абая 50", helper: "Умбеталиев Али", status: "active" },
  { id: 4,  serviceKey: "homework",  serviceLabel: "Домашние работы", description: "Починить стул",                  price: "5000", dateCreated: "18.06.2026", dateExecution: "20.06.2026", address: "ул. Абая 50", helper: "Умбеталиев Али", status: "active" },
  { id: 5,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Сходить в аптеку за лекарствами", price: "4000", dateCreated: "10.05.2026", dateExecution: "12.05.2026", address: "ул. Ленина 10", helper: "Умбеталиев Али", status: "completed" },
  { id: 6,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Поход в больницу",               price: "4000", dateCreated: "10.05.2026", dateExecution: "12.05.2026", address: "ул. Ленина 10", helper: "",               status: "completed" },
  { id: 7,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Прогулка в парке",               price: "4000", dateCreated: "01.04.2026", dateExecution: "03.04.2026", address: "пр. Республики 5", helper: "Умбеталиев Али", status: "completed" },
  { id: 8,  serviceKey: "homework",  serviceLabel: "Домашние работы", description: "Починить стул",                  price: "5000", dateCreated: "01.04.2026", dateExecution: "03.04.2026", address: "пр. Республики 5", helper: "Умбеталиев Али", status: "completed" },
  { id: 9,  serviceKey: "escort",    serviceLabel: "Сопровождение",   description: "Сходить в аптеку за лекарствами", price: "4000", dateCreated: "15.03.2026", dateExecution: "16.03.2026", address: "ул. Абая 50", helper: "Умбеталиев Али", status: "cancelled" },
  { id: 10, serviceKey: "homework",  serviceLabel: "Домашние работы", description: "Починить стул",                  price: "5000", dateCreated: "15.03.2026", dateExecution: "16.03.2026", address: "ул. Абая 50", helper: "Умбеталиев Али", status: "cancelled" },
];

const SERVICE_IMG: Record<string, string> = {
  household: imgHousehold, medical: imgMedical, escort: imgEscort, homework: imgHomeWork, shopping: imgShopping,
};

function loadRequests(userId: number): ServiceRequest[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY(userId));
    if (s) {
      const parsed: ServiceRequest[] = JSON.parse(s);
      return parsed.map(r => ({ ...r, status: r.status ?? "active" }));
    }
  } catch { /**/ }
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(SEED_REQUESTS));
  return SEED_REQUESTS;
}
function saveRequests(userId: number, reqs: ServiceRequest[]) {
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(reqs));
}

function getTodayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function formatDate(raw: string): string {
  const d = raw.replace(/\D/g,"").slice(0,8);
  if (d.length<=2) return d;
  if (d.length<=4) return `${d.slice(0,2)}.${d.slice(2)}`;
  return `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4)}`;
}
function isValidDate(v: string) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return false;
  const [dd,mm,yyyy] = v.split(".").map(Number);
  if (mm<1||mm>12||dd<1) return false;
  const d = new Date(yyyy, mm-1, dd);
  return d.getFullYear()===yyyy && d.getMonth()===mm-1 && d.getDate()===dd;
}
function isFutureDate(v: string) {
  const [dd,mm,yyyy] = v.split(".").map(Number);
  const d = new Date(yyyy, mm-1, dd);
  const today = new Date(); today.setHours(0,0,0,0);
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
  { id: 1, name: "Куаныш Дастан",         avatar: "photo",   preview: "Принимаю вашу заявку о покупке лекарств. Вскоре уточню детали и приступлю к выполнению", time: "12:45", unread: true },
  { id: 2, name: "Айбергенова Асылай",     avatar: "АА",      avatarColor: "#a78bfa", preview: "Отклонился на вашу заявку о помощи по дому.\nЗдравствуйте! Работаю в сфере бытовой помощи уже несколько лет, хорошо знаю все основные задачи по дому. Выполню всё аккуратно, быстро и с уважением к вашему пространству...", time: "11:05", unread: true },
  { id: 3, name: "Платеж успешно выполнен",avatar: "qamqor",  preview: "Заявка №1024", time: "11:05", isSystem: true },
  { id: 4, name: "Аймердинов Амир",        avatar: "photo",   preview: "Отклонил вашу заявку.\nЗдравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "11:05" },
  { id: 5, name: "Платеж успешно выполнен",avatar: "qamqor",  preview: "Заявка №1023", time: "11:05", isSystem: true },
  { id: 6, name: "Бакыт Диас",             avatar: "photo",   preview: "Я уже купил всё необходимое.", time: "вс" },
  { id: 7, name: "Абдешев Сансызбай",      avatar: "АС",      avatarColor: "#f97316", preview: "Ваш родственник активировал SOS кнопку", time: "сб" },
  { id: 8, name: "Алимова Асем",           avatar: "АА",      avatarColor: "#ec4899", preview: "Дома очень чисто, спасибо вам огромное.\nЖелаю всего наилучшего!", time: "пт", read: true },
  { id: 9, name: "Ахмет Адиль",            avatar: "АА",      avatarColor: "#6366f1", preview: "Отклонил вашу заявку.\nЗдравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "чт" },
  { id: 10,name: "Куаныш Дастан",          avatar: "КД",      avatarColor: "#14b8a6", preview: "Хорошо, спасибо вам большое!", time: "чт", read: true },
];

const CHAT_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, from: "me",    text: "Добрый день!\nМне нужна помощь по покупке лекарств, можете ли вы помочь?", time: "12:15" },
    { id: 2, from: "other", text: "Добрый день!", time: "12:14" },
    { id: 3, from: "other", text: "Принимаю вашу заявку о покупке лекарств. Вскоре уточню детали и приступлю к выполнению", time: "12:15" },
  ],
  2: [
    { id: 1, from: "me",    text: "Здравствуйте! Мне нужна помощь по дому.", time: "11:00" },
    { id: 2, from: "other", text: "Здравствуйте! Рада помочь! Работаю в сфере бытовой помощи уже несколько лет.", time: "11:05" },
  ],
  4: [
    { id: 1, from: "me",    text: "Здравствуйте! Могли бы вы помочь с моей заявкой?", time: "10:50" },
    { id: 2, from: "other", text: "Здравствуйте! Извините за неудобства, по личным причинам не могу принять вашу заявку :(", time: "11:05" },
  ],
  6: [
    { id: 1, from: "me",    text: "Добрый день! Вы купили всё из списка?", time: "вс" },
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
      <img src={imgQamqor} alt="Qamqor" className="rounded-full object-cover shrink-0"
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
  const locales = ["RU","KZ","EN"] as const;
  const map: Record<string,"ru"|"kz"|"en"> = {RU:"ru",KZ:"kz",EN:"en"};
  return (
    <div className="relative">
      <button onClick={() => setOpen(v=>!v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        <Globe className="w-3.5 h-3.5 text-gray-400"/>
        {locale.toUpperCase()}
        <ChevronDown className="w-3 h-3 text-gray-400"/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[72px]">
          {locales.map(l=>(
            <button key={l} onClick={()=>{setLocale(map[l]);setOpen(false);}}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
              style={locale===map[l]?{color:BLUE,fontWeight:600}:{color:"#374151"}}>{l}</button>
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
      style={isHighContrast?{borderColor:GREEN,background:"#f0faf2",color:GREEN}:{borderColor:"#e5e7eb",background:"white",color:"#374151"}}>
      <Eye className="w-3.5 h-3.5"/>
      {isHighContrast ? t("dashboard.accessibilityOff") : t("dashboard.accessibilityOn")}
    </button>
  );
}

/* ─────────────── user card ─────────────── */
function UserCard({ user }: { user: { firstName:string;lastName:string;email:string;phone:string;role:string;birthDate?:string;city?:string } }) {
  const { t } = useLanguage();
  const initials = `${user.firstName[0]??""}${user.lastName[0]??""}`.toUpperCase();
  const roleLabel = user.role==="seek-help" ? t("dashboard.roleSeekHelp") : t("dashboard.roleOfferHelp");
  const rows = [
    {label:t("dashboard.userRole"),  value:roleLabel},
    {label:t("dashboard.userEmail"), value:user.email},
    {label:t("dashboard.userPhone"), value:user.phone},
    {label:t("dashboard.userDob"),   value:user.birthDate ?? "—"},
    {label:t("dashboard.userCity"),  value:user.city ?? "—"},
  ];
  return (
    <div className="px-3 pt-4 pb-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{background:"linear-gradient(135deg,#5bb8f5 0%,#3b82f6 100%)"}}>
            {initials}
          </div>
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{user.lastName} {user.firstName}</p>
        </div>
        <div className="border-t border-gray-100 mx-3"/>
        <div className="px-3 py-2.5 space-y-1.5">
          {rows.map(({label,value})=>(
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
  setActiveNav: (k:NavKey) => void;
  user: { firstName:string;lastName:string;email:string;phone:string;role:string;birthDate?:string;city?:string };
}) {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const navItems: {key:NavKey;Icon:React.ElementType;label:string}[] = [
    {key:"dashboard", Icon:LayoutDashboard, label:t("dashboard.navDashboard")},
    {key:"messages",  Icon:MessageSquare,   label:t("dashboard.navMessages")},
    {key:"requests",  Icon:ClipboardList,   label:t("dashboard.navMyRequests")},
    {key:"statistics",Icon:BarChart2,       label:t("dashboard.navStatistics")},
    {key:"support",   Icon:Headphones,      label:t("dashboard.navSupport")},
  ];

  return (
    <aside className="w-56 min-h-screen bg-gray-50 flex flex-col shrink-0 border-r border-gray-100">
      <UserCard user={user}/>
      <nav className="flex-1 px-3 py-1 flex flex-col gap-1">
        {navItems.map(({key,Icon,label})=>{
          const isActive = activeNav===key;
          return (
            <button key={key} onClick={()=>setActiveNav(key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border"
              style={isActive?{background:BLUE,color:"white",borderColor:BLUE}:{background:"white",color:"#374151",borderColor:"#e5e7eb"}}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={isActive?{color:"white"}:{color:"#9ca3af"}}/>
              <span className="flex-1 leading-tight">{label}</span>
              <ChevronRight className="w-3 h-3 shrink-0" style={isActive?{color:"rgba(255,255,255,0.65)"}:{color:"#d1d5db"}}/>
            </button>
          );
        })}
        <button onClick={()=>{logout();navigate("/");}}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border border-transparent hover:bg-red-50"
          style={{color:"#EF4444"}}>
          <LogOut className="w-3.5 h-3.5 shrink-0" style={{color:"#EF4444"}}/>
          <span className="flex-1 leading-tight">{t("dashboard.navLogout")}</span>
        </button>
      </nav>
    </aside>
  );
}

/* ─────────────── service card ─────────────── */
function ServiceCard({ img,title,desc,selected,onSelect,selectLabel,serviceKey: _ }:{
  serviceKey:string;img:string;title:string;desc:string;selected:boolean;onSelect:()=>void;selectLabel:string;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-2xl cursor-pointer transition-all flex-1 min-w-[160px]"
      style={selected?{outline:"2.5px solid #2563EB",boxShadow:"0 0 0 4px rgba(37,99,235,0.12)"}:{border:"1.5px solid #f0f0f0",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}
      onClick={onSelect}>
      <div className="w-full h-28 flex items-center justify-center mb-3">
        <img src={img} alt={title} className="max-h-full max-w-full object-contain"/>
      </div>
      <p className="text-xs font-bold text-gray-800 text-center leading-tight mb-1">{title}</p>
      <p className="text-[10px] text-gray-400 text-center leading-tight flex-1 mb-3">{desc}</p>
      <button onClick={e=>{e.stopPropagation();onSelect();}}
        className="px-5 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 mt-auto"
        style={{background:GREEN}}>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{maxHeight:"90vh"}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === "map" && (
              <button onClick={() => { setStep("city"); setCityKey(null); setPickedAddress(""); setSearchQuery(""); setSuggestions([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors mr-1">
                <ArrowLeft className="w-4 h-4"/>
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{background:"#EFF6FF"}}>
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
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all"/>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2"/>
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
                  ? <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block"/><span>Определяем...</span></>
                  : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeWidth="2"/></svg><span>Моё местоположение</span></>
                }
              </button>
              {pickedAddress && (
                <span className="text-[10px] text-gray-400 truncate flex-1">{shortName(pickedAddress)}</span>
              )}
            </div>

            <div ref={mapDivRef} className="flex-1 mx-4 mb-4 rounded-xl overflow-hidden border border-gray-200" style={{minHeight:"260px"}}/>

            <div className="px-4 pb-4 shrink-0">
              <button
                disabled={!pickedAddress}
                onClick={() => { if (pickedAddress && cityKey) onSelect(pickedAddress, KZ_CITIES[cityKey].name); }}
                className="w-full py-3 text-white text-sm font-bold rounded-xl transition-opacity disabled:opacity-40"
                style={{background:GREEN}}>
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
const MONTH_NAMES_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DOW_LABELS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function DatePickerField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const todayBase = new Date(); todayBase.setHours(0,0,0,0);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(todayBase.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayBase.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  let selDate: Date | null = null;
  if (isValidDate(value)) {
    const [dd,mm,yyyy] = value.split(".").map(Number);
    selDate = new Date(yyyy, mm-1, dd);
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
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); } else setViewMonth(m=>m-1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); } else setViewMonth(m=>m+1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDayNum = new Date(viewYear, viewMonth+1, 0).getDate();
  let startDow = firstDay.getDay(); startDow = startDow===0 ? 6 : startDow-1;
  const days: (Date|null)[] = [];
  for (let i=0; i<startDow; i++) days.push(null);
  for (let d=1; d<=lastDayNum; d++) days.push(new Date(viewYear, viewMonth, d));

  const handleDayClick = (day: Date) => {
    if (day < todayBase) return;
    const dd=String(day.getDate()).padStart(2,"0");
    const mm=String(day.getMonth()+1).padStart(2,"0");
    onChange(`${dd}.${mm}.${day.getFullYear()}`);
    setOpen(false);
  };

  const atMinMonth = viewYear===todayBase.getFullYear() && viewMonth===todayBase.getMonth();

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input type="text" inputMode="numeric" value={value} maxLength={10}
          onChange={e => onChange(formatDate(e.target.value))}
          onFocus={() => setOpen(true)}
          placeholder="дд.мм.гггг"
          className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none transition-all pr-8 ${error?"border-red-400 bg-red-50":"border-gray-200 focus:border-blue-400"}`}/>
        <button type="button" tabIndex={-1} onClick={()=>setOpen(v=>!v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
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
            {DOW_LABELS_RU.map(d=>(
              <div key={d} className="text-[10px] text-center text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day,i)=>{
              if (!day) return <div key={`e${i}`}/>;
              const isPast = day < todayBase;
              const isToday = day.getTime()===todayBase.getTime();
              const isSel = selDate && day.getTime()===selDate.getTime();
              return (
                <button key={day.getTime()} type="button" onClick={()=>handleDayClick(day)} disabled={isPast}
                  className={`text-[11px] h-7 w-full rounded-lg flex items-center justify-center transition-colors
                    ${isPast?"text-gray-300 cursor-not-allowed":"hover:bg-gray-100"}
                    ${isSel?"font-bold":""}
                    ${isToday&&!isSel?"font-bold ring-1 ring-gray-300":"text-gray-700"}
                  `}
                  style={isSel?{background:GREEN,color:"white"}:{}}>
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:"#DCFCE7"}}>
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t("dashboard.requestCreatedTitle")}</h2>
          <p className="text-sm text-gray-500">{t("dashboard.requestCreatedDesc")}</p>
        </div>
        <button onClick={onClose}
          className="px-8 py-3 text-white text-sm font-bold rounded-xl transition-opacity hover:opacity-90 w-full"
          style={{background:GREEN}}>
          Отлично!
        </button>
      </div>
    </div>
  );
}

/* ─────────────── create-request tab ─────────────── */
function CreateRequestTab({ userId }: { userId:number }) {
  const { t } = useLanguage();
  const [selectedService, setSelectedService] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [requests, setRequests] = useState<ServiceRequest[]>(()=>loadRequests(userId));
  const [editingReq, setEditingReq] = useState<ServiceRequest | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const services = [
    {key:"household",img:imgHousehold,title:t("dashboard.serviceHousehold"),desc:t("dashboard.serviceHouseholdDesc")},
    {key:"medical",  img:imgMedical,  title:t("dashboard.serviceMedical"),  desc:t("dashboard.serviceMedicalDesc")},
    {key:"escort",   img:imgEscort,   title:t("dashboard.serviceEscort"),   desc:t("dashboard.serviceEscortDesc")},
    {key:"homework", img:imgHomeWork, title:t("dashboard.serviceHomeWork"), desc:t("dashboard.serviceHomeWorkDesc")},
    {key:"shopping", img:imgShopping, title:t("dashboard.serviceShopping"), desc:t("dashboard.serviceShoppingDesc")},
  ];

  const sel = services.find(s=>s.key===selectedService);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!selectedService) e.service=t("dashboard.selectService");
    if (!description.trim()) e.description=t("dashboard.required");
    if (!price) e.price=t("dashboard.required");
    if (!date) e.date=t("dashboard.required");
    else if (!isValidDate(date)) e.date=t("dashboard.dateInvalid");
    else if (!isFutureDate(date)) e.date=t("dashboard.datePast");
    if (!address.trim()) e.address=t("dashboard.required");
    return e;
  };

  const handleCreate = () => {
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length) return;
    const newReq: ServiceRequest = {id:Date.now(),serviceKey:selectedService,serviceLabel:sel?.title??selectedService,description,price,dateCreated:getTodayStr(),dateExecution:date,address,city,helper:"",status:"active"};
    const updated=[newReq,...requests]; setRequests(updated); saveRequests(userId,updated);
    setSelectedService(""); setDescription(""); setPrice(""); setDate(""); setAddress(""); setCity(""); setErrors({});
    setShowSuccess(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-800">{t("dashboard.createTitle")}</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-3">
          {services.map(s=>(
            <ServiceCard key={s.key} serviceKey={s.key} img={s.img} title={s.title} desc={s.desc}
              selected={selectedService===s.key} onSelect={()=>setSelectedService(s.key)} selectLabel={t("dashboard.selectBtn")}/>
          ))}
        </div>
        {errors.service && <p className="text-[10px] text-red-500 mt-2">{errors.service}</p>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">{t("dashboard.descLabel")}</label>
          <textarea value={description} onChange={e=>{setDescription(e.target.value);if(errors.description)setErrors(er=>({...er,description:""}));}}
            placeholder={t("dashboard.descPlaceholder")} rows={3}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none resize-none transition-all ${errors.description?"border-red-400 bg-red-50":"border-gray-200 focus:border-blue-400"}`}/>
          {errors.description && <p className="text-[10px] text-red-500">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard.priceLabel")}</label>
            <input type="text" inputMode="numeric" value={price}
              onChange={e=>{setPrice(e.target.value.replace(/\D/g,""));if(errors.price)setErrors(er=>({...er,price:""}));}}
              placeholder={t("dashboard.pricePlaceholder")}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${errors.price?"border-red-400 bg-red-50":"border-gray-200 focus:border-blue-400"}`}/>
            {errors.price && <p className="text-[10px] text-red-500">{errors.price}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard.dateLabel")}</label>
            <DatePickerField
              value={date}
              onChange={v=>{ setDate(v); if(errors.date) setErrors(er=>({...er,date:""})); }}
              error={errors.date}
            />
            {errors.date && <p className="text-[10px] text-red-500">{errors.date}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">{t("dashboard.addressLabel")}</label>
          <button type="button" onClick={() => { setShowAddressPicker(true); if(errors.address) setErrors(er=>({...er,address:""})); }}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs text-left transition-all flex items-center gap-2 ${errors.address ? "border-red-400 bg-red-50" : address ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-blue-400"}`}>
            <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
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
        <button onClick={handleCreate}
          className="px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-opacity hover:opacity-90 shadow-sm"
          style={{background:GREEN}}>
          {t("dashboard.createBtn")}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">{t("dashboard.activeRequests")}</h3>
          <button className="text-xs font-medium flex items-center gap-0.5" style={{color:BLUE}}>
            {t("dashboard.showAll")} <ChevronRight className="w-3 h-3"/>
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
                <th style={{ background:"white", borderTop:"1px solid #BFDBFE", borderBottom:"1px solid #BFDBFE", borderRight:"1px solid #BFDBFE", borderLeft:"none", borderRadius:"0 10px 10px 0", width:"100px" }}/>
              </tr>
            </thead>
            <tbody>
              {requests.filter(r=>(r.status??"active")==="active").map(req=>(
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                        <img src={SERVICE_IMG[req.serviceKey]??imgHousehold} alt={req.serviceLabel} className="w-full h-full object-contain p-1"/>
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
                      style={{background:BLUE}}>
                      {t("dashboard.editBtn")}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.filter(r=>(r.status??"active")==="active").length===0 && (
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
            const next = requests.map(r => r.id === updated.id ? updated : r);
            setRequests(next);
            saveRequests(userId, next);
            setEditingReq(null);
          }}
        />
      )}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)}/>}
    </div>
  );
}

/* ─────────────── edit request modal ─────────────── */
function EditRequestModal({
  req, services, onClose, onSave,
}: {
  req: ServiceRequest;
  services: {key:string;img:string;title:string}[];
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

  const selectedSvc = services.find(s=>s.key===serviceKey);

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
                onClick={() => setOpen(v=>!v)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-left flex items-center justify-between outline-none focus:border-blue-400"
              >
                <span className={selectedSvc ? "text-gray-800" : "text-gray-400"}>
                  {selectedSvc?.title ?? t("dashboard.selectService")}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400"/>
              </button>
              {open && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {services.map(s => (
                    <button key={s.key} type="button"
                      onClick={() => { setServiceKey(s.key); setOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                      style={serviceKey===s.key ? {color:BLUE,fontWeight:600} : {color:"#374151"}}>
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t("dashboard.descLabel")}</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none resize-none focus:border-blue-400"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("dashboard.priceLabel")}</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={price}
                  onChange={e=>setPrice(e.target.value.replace(/\D/g,""))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-8"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("dashboard.dateLabel")}</label>
              <div className="relative">
                <input type="text" value={date} placeholder="дд.мм.гггг" maxLength={10}
                  onChange={e=>{ const d=e.target.value.replace(/\D/g,"").slice(0,8); let f=d; if(d.length>2)f=`${d.slice(0,2)}.${d.slice(2)}`; if(d.length>4)f=`${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4)}`; setDate(f); }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-8"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/><line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/></svg>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t("dashboard.addressLabel")}</label>
            <input type="text" value={address} onChange={e=>setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"/>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave}
              className="px-8 py-3 text-white text-sm font-semibold rounded-xl transition-opacity hover:opacity-90"
              style={{background:GREEN}}>
              {t("dashboard.saveBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── completion modal ─────────────── */
function CompletionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const { t } = useLanguage();
  const [agreedPrice, setAgreedPrice] = useState<"yes"|"no">("yes");
  const [finalPrice, setFinalPrice] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-lg font-light">✕</button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">{t("dashboard.completionTitle")}</h2>
        <p className="text-sm text-gray-600 mb-6">{t("dashboard.completionQuestion")}</p>

        <div className="flex flex-col items-start gap-3 mb-6 px-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="price-agreement" checked={agreedPrice==="yes"} onChange={()=>setAgreedPrice("yes")}
              className="w-4 h-4 accent-green-600"/>
            <span className="text-sm text-gray-700">{t("dashboard.completionYes")}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="price-agreement" checked={agreedPrice==="no"} onChange={()=>setAgreedPrice("no")}
              className="w-4 h-4 accent-green-600"/>
            <span className="text-sm text-gray-700">{t("dashboard.completionNo")}</span>
          </label>
        </div>

        {agreedPrice==="no" && (
          <div className="relative mb-6 mx-4">
            <input type="text" inputMode="numeric" value={finalPrice}
              onChange={e=>setFinalPrice(e.target.value.replace(/\D/g,""))}
              placeholder={t("dashboard.completionPricePlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 text-center pr-8"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
          </div>
        )}

        <button onClick={onSubmit}
          className="px-10 py-3 text-white text-sm font-bold rounded-xl uppercase tracking-wide transition-opacity hover:opacity-90"
          style={{background:GREEN}}>
          {t("dashboard.completionSubmit")}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── helper dashboard (offer-help role) ─────────────── */
interface HelperRequest {
  id: number;
  name: string;
  serviceLabel: string;
  description: string;
  price: string;
  dateCreated: string;
  dateExecution: string;
  address: string;
}

const HELPER_ACTIVE: HelperRequest[] = [
  { id: 1, name: "Лидия Абдешева", serviceLabel: "Сопровождение", description: "Необходимо съездить со мной в больницу к врачу, помочь с оформлением документов", price: "4000", dateCreated: "18 июня 2026 года", dateExecution: "20 июня 2026 года", address: "Сыганак 41" },
];

const AVAILABLE_REQS: HelperRequest[] = [
  { id: 11, name: "Лидия Абдешева", serviceLabel: "Сопровождение", description: "Необходимо съездить со мной в больницу к врачу, помочь с оформлением документов", price: "4000", dateCreated: "18 июня 2026 года", dateExecution: "20 июня 2026 года", address: "Сыганак 41" },
  { id: 12, name: "Лидия Абдешева", serviceLabel: "Сопровождение", description: "Необходимо съездить со мной в больницу к врачу, помочь с оформлением документов", price: "4000", dateCreated: "18 июня 2026 года", dateExecution: "20 июня 2026 года", address: "Сыганак 41" },
  { id: 13, name: "Лидия Абдешева", serviceLabel: "Сопровождение", description: "Необходимо съездить со мной в больницу к врачу, помочь с оформлением документов", price: "4000", dateCreated: "18 июня 2026 года", dateExecution: "20 июня 2026 года", address: "Сыганак 41" },
  { id: 14, name: "Лидия Абдешева", serviceLabel: "Сопровождение", description: "Необходимо съездить со мной в больницу к врачу, помочь с оформлением документов", price: "4000", dateCreated: "18 июня 2026 года", dateExecution: "20 июня 2026 года", address: "Сыганак 41" },
];

function HelperReqTable({ reqs, onComplete }: {
  reqs: HelperRequest[];
  onComplete?: (id: number) => void;
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
              <th style={{ background:"white", borderTop:"1px solid #BFDBFE", borderBottom:"1px solid #BFDBFE", borderRight:"1px solid #BFDBFE", borderLeft:"none", borderRadius:"0 10px 10px 0", width:"110px" }}/>
            )}
          </tr>
        </thead>
        <tbody>
          {reqs.map(req => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-start gap-2.5">
                  <img src={imgHelperAvatar} alt={req.name} className="w-10 h-10 rounded-full object-cover shrink-0"/>
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
                    style={{background:"#EF4444"}}>
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

function HelperAvailableTable({ reqs }: { reqs: HelperRequest[] }) {
  const { t } = useLanguage();
  const COLS = [t("dashboard.colDescription"), t("dashboard.colDateReg"), t("dashboard.colDateExec"), t("dashboard.colPrice"), t("dashboard.colAddress")];
  const [accepted, setAccepted] = useState<number[]>([]);
  const [rejected, setRejected] = useState<number[]>([]);

  const visible = reqs.filter(r => !rejected.includes(r.id));

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
            <th style={{ background:"white", borderTop:"1px solid #BFDBFE", borderBottom:"1px solid #BFDBFE", borderRight:"1px solid #BFDBFE", borderLeft:"none", borderRadius:"0 10px 10px 0", width:"110px" }}/>
          </tr>
        </thead>
        <tbody>
          {visible.map(req => (
            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-start gap-2.5">
                  <img src={imgHelperAvatar} alt={req.name} className="w-10 h-10 rounded-full object-cover shrink-0"/>
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
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{background:"#FEF9C3", border:"1px solid #FDE047"}} title="Написать">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={() => setAccepted(a => [...a, req.id])}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{background: accepted.includes(req.id) ? GREEN : "#DCFCE7", border:`1px solid ${accepted.includes(req.id) ? GREEN : "#86EFAC"}`}} title="Принять">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={accepted.includes(req.id) ? "white" : "#22C55E"} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button onClick={() => setRejected(r => [...r, req.id])}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{background:"#FEE2E2", border:"1px solid #FCA5A5"}} title="Отклонить">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HelperDashboard({ user }: { user: { firstName: string } }) {
  const { t } = useLanguage();
  const [activeReqs, setActiveReqs] = useState<HelperRequest[]>(HELPER_ACTIVE);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleComplete = (id: number) => setCompletingId(id);
  const handleSubmitCompletion = () => {
    setActiveReqs(r => r.filter(x => x.id !== completingId));
    setCompletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
        <p className="font-bold text-gray-800 text-sm">Добро пожаловать, {user.firstName}!</p>
        <p className="text-xs text-gray-500 mt-0.5">Сегодня в вашем регионе поступило <span className="font-semibold text-gray-700">12</span> новых запросов. Готовы помочь?</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-sm" style={{color:GREEN}}>{t("dashboard.activeRequests")}</h3>
        </div>
        {activeReqs.length === 0 ? (
          <p className="px-5 py-6 text-xs text-gray-400 text-center">Нет активных заявок</p>
        ) : (
          <HelperReqTable reqs={activeReqs} onComplete={handleComplete}/>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-800">{t("dashboard.availableRequests")}</h3>
          <div className="relative">
            <button onClick={() => setFilterOpen(v=>!v)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
              {t("dashboard.filterByDistance")} <ChevronDown className="w-3.5 h-3.5"/>
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] overflow-hidden">
                {["По расстоянию","По дате","По цене"].map(opt=>(
                  <button key={opt} onClick={()=>setFilterOpen(false)}
                    className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-700">{opt}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <HelperAvailableTable reqs={AVAILABLE_REQS}/>
      </div>

      {completingId !== null && (
        <CompletionModal onClose={() => setCompletingId(null)} onSubmit={handleSubmitCompletion}/>
      )}
    </div>
  );
}

/* ─────────────── chat detail ─────────────── */
function ChatDetail({ conv }: { conv: Conversation }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES[conv.id] ?? []);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setMessages(m => [...m, { id: Date.now(), from: "me", text, time }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <Avatar conv={conv} size={40}/>
        <p className="font-bold text-gray-900 text-sm">{conv.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
        <div className="text-center">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">22 марта</span>
        </div>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from==="me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed relative ${
              msg.from==="me"
                ? "text-white rounded-tr-sm"
                : "text-gray-800 rounded-tl-sm border border-gray-200"
            }`}
            style={msg.from==="me"?{background:BLUE}:{background:"white"}}>
              {msg.text.split("\n").map((line,i)=>(
                <span key={i}>{line}{i<msg.text.split("\n").length-1 && <br/>}</span>
              ))}
              <span className={`text-[10px] ml-2 ${msg.from==="me"?"text-blue-100":"text-gray-400"} inline-flex items-center gap-0.5`}>
                {msg.time}
                {msg.from==="me" && <CheckCheck className="w-3 h-3 text-blue-200"/>}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-white">
        <input
          type="text"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter" && !e.shiftKey && handleSend()}
          placeholder="написать сообщение..."
          className="flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 bg-transparent"
        />
        <button onClick={handleSend} className="shrink-0 transition-opacity hover:opacity-75" style={{color:BLUE}}>
          <Send className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );
}

/* ─────────────── messages list ─────────────── */
type MsgFilter = "all" | "new" | "read" | "important";

function MessagesContent({ onOpenChat }: { onOpenChat: (id: number) => void }) {
  const [filter, setFilter] = useState<MsgFilter>("all");

  const filterTabs: {key:MsgFilter;label:string}[] = [
    {key:"all",label:"Все"},
    {key:"new",label:"Новые"},
    {key:"read",label:"Прочитанные"},
    {key:"important",label:"Важные"},
  ];

  const filtered = CONVERSATIONS.filter(c => {
    if (filter==="new") return c.unread;
    if (filter==="read") return c.read;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex border-b border-gray-100 px-2">
        {filterTabs.map(tab=>(
          <button key={tab.key} onClick={()=>setFilter(tab.key)}
            className="px-4 py-3.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 -mb-px"
            style={filter===tab.key
              ?{color:BLUE,borderColor:BLUE}
              :{color:"#6b7280",borderColor:"transparent"}}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-100">
        {filtered.map(conv=>(
          <button key={conv.id} onClick={()=>onOpenChat(conv.id)}
            className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
            <Avatar conv={conv} size={44}/>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-tight ${conv.unread?"font-bold text-gray-900":"font-semibold text-gray-800"}`}>
                {conv.name}
              </p>
              <p className="text-xs text-gray-400 leading-snug mt-0.5 line-clamp-2 whitespace-pre-line">
                {conv.preview}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
              <span className="text-xs text-gray-400 whitespace-nowrap">{conv.time}</span>
              {conv.read && <CheckCheck className="w-3.5 h-3.5" style={{color:BLUE}}/>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── my requests page ─────────────── */
function RequestsTable({
  requests,
  onCancel,
  emptyText,
}: {
  requests: ServiceRequest[];
  onCancel?: (id: number) => void;
  emptyText: string;
}) {
  const COLS = ["Наименование", "Дата регистрации", "Дата выполнения услуг", "Цена", "Помощник"];

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
                    <img src={SERVICE_IMG[req.serviceKey] ?? imgHousehold} alt={req.serviceLabel} className="w-full h-full object-contain p-1"/>
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

function MyRequestsContent({ userId }: { userId: number }) {
  const [requests, setRequests] = useState<ServiceRequest[]>(() => loadRequests(userId));

  const active    = requests.filter(r => (r.status ?? "active") === "active");
  const completed = requests.filter(r => r.status === "completed");
  const cancelled = requests.filter(r => r.status === "cancelled");

  const handleCancel = (id: number) => {
    const updated = requests.map(r => r.id === id ? { ...r, status: "cancelled" as RequestStatus } : r);
    setRequests(updated);
    saveRequests(userId, updated);
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
      <Section title="Активные заявки"   color={GREEN}      reqs={active}    showCancel />
      <Section title="Прошлые заявки"    color="#374151"    reqs={completed}            />
      <Section title="Отмененные заявки" color="#EF4444"    reqs={cancelled}            />
    </div>
  );
}

/* ─────────────── find helpers tab ─────────────── */
interface MockHelper {
  id: number; name: string; categoryKey: string; categoryLabel: string;
  rating: number; description: string; city: "almaty" | "astana";
}

const MOCK_HELPERS: MockHelper[] = [
  { id:1,  name:"Умбеталиев Али",        categoryKey:"household", categoryLabel:"Бытовая помощь",    rating:4.9, city:"astana",  description:"Помогаю пожилым людям с покупками и бытовыми задачами уже 3 года" },
  { id:2,  name:"Алишева Альмира",       categoryKey:"medical",   categoryLabel:"Медицинская помощь", rating:4.9, city:"astana",  description:"Медсестра с опытом, помогу купить лекарства, сходить к врачу" },
  { id:3,  name:"Аймердинов Амир",       categoryKey:"homework",  categoryLabel:"Домашние работы",    rating:4.8, city:"almaty",  description:"Опыт работы 4 года, аккуратно выполню задачи по дому" },
  { id:4,  name:"Куаныш Дастан",         categoryKey:"shopping",  categoryLabel:"Покупки",            rating:4.8, city:"astana",  description:"Помогаю пожилым людям с покупками продуктов и хозтоваров" },
  { id:5,  name:"Аденова Асем",          categoryKey:"escort",    categoryLabel:"Сопровождение",      rating:4.8, city:"almaty",  description:"Могу сопровождать на прогулки и визиты к врачу" },
  { id:6,  name:"Береке Мадина",         categoryKey:"household", categoryLabel:"Бытовая помощь",     rating:4.7, city:"almaty",  description:"Ответственная, аккуратная, готовлю домашнюю еду" },
  { id:7,  name:"Салимова Алиша",        categoryKey:"medical",   categoryLabel:"Медицинская помощь", rating:4.8, city:"astana",  description:"По образованию медсестра, помогу с посещением больницы" },
  { id:8,  name:"Бакыт Диас",            categoryKey:"household", categoryLabel:"Бытовая помощь",     rating:4.8, city:"almaty",  description:"Помогаю по дому: уборка, приготовление еды, поддержание чистоты" },
  { id:9,  name:"Алем Асыл",             categoryKey:"escort",    categoryLabel:"Сопровождение",      rating:4.9, city:"almaty",  description:"Сопровождаю в больницу, на прогулки и по делам. Очень внимателен к деталям." },
  { id:10, name:"Шаймердинов Бегарыс",   categoryKey:"homework",  categoryLabel:"Домашние работы",    rating:4.9, city:"astana",  description:"Опыт работы 3 года, занимаюсь ремонтом и хозяйственными делами" },
  { id:11, name:"Аймердинов Амир",       categoryKey:"shopping",  categoryLabel:"Покупки",            rating:4.8, city:"almaty",  description:"Помогу с покупкой продуктов и лекарств, всё привезу вовремя." },
  { id:12, name:"Айбергенова Асылай",    categoryKey:"household", categoryLabel:"Бытовая помощь",     rating:4.8, city:"almaty",  description:"Помогаю пожилым людям с покупками и хозтоваров" },
];

const AVATAR_BG = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16"];

function HelperAvatar({ name, size = 40, colorId }: { name: string; size?: number; colorId: number }) {
  const bg = AVATAR_BG[colorId % AVATAR_BG.length];
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0,2).toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{color:"white",fontWeight:"bold",fontSize:size*0.35}}>{initials}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({length:5},(_,i)=>(
        <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill={i<full?"#F59E0B":"#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      <span className="text-[10px] text-gray-500 ml-0.5">{rating}</span>
    </span>
  );
}

function SelectRequestModal({ requests, onSelect, onClose }: {
  requests: ServiceRequest[];
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{maxHeight:"85vh"}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">Выберите заявку</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-light">✕</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3" style={{maxHeight:"calc(85vh - 72px)"}}>
          {requests.map(req=>(
            <div key={req.id} className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-800 text-xs mb-1">Заявка #{req.id}</p>
              <p className="text-[11px] text-gray-500">Категория: {req.serviceLabel}</p>
              <p className="text-[11px] text-gray-500">Адрес: {req.address.split(",")[0]}</p>
              <p className="text-[11px] text-gray-500 mb-3">Дата: {req.dateExecution}</p>
              <button onClick={onSelect}
                className="w-full py-2 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90"
                style={{background:BLUE}}>
                Выбрать эту заявку
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmHelperModal({ helper, onClose, onConfirm, mode = "select" }: {
  helper: MockHelper;
  onClose: () => void;
  onConfirm: () => void;
  mode?: "select" | "response";
}) {
  const [accepted, setAccepted] = useState(false);

  if (accepted) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="flex justify-end px-4 pt-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
          </div>
          <div className="px-6 pb-8 flex flex-col items-center text-center">
            <HelperAvatar name={helper.name} size={64} colorId={helper.id}/>
            <p className="font-bold text-gray-900 text-sm mt-3 mb-0.5">{helper.name}</p>
            <p className="text-xs text-gray-400 mb-1">{helper.categoryLabel}</p>
            <StarRating rating={helper.rating}/>
            <p className="text-sm font-bold mt-4" style={{color:GREEN}}>Ваша заявка принята</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Подтвердить выбор помощника</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <HelperAvatar name={helper.name} size={60} colorId={helper.id}/>
            <div>
              <p className="font-bold text-gray-900 text-sm">{helper.name}</p>
              <p className="text-xs text-gray-400 mb-1">{helper.categoryLabel}</p>
              <StarRating rating={helper.rating}/>
            </div>
          </div>
          {mode === "response" ? (
            <p className="text-xs text-gray-600 mb-5">
              <span className="font-semibold">{helper.name}</span> откликнулся на вашу заявку.{" "}
              <span className="font-semibold">{helper.categoryLabel}:</span> {helper.description}
            </p>
          ) : (
            <p className="text-xs text-gray-600 mb-5">Вы уверены, что хотите выбрать этого помощника для выполнения заявки?</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              {mode === "response" ? "Отклонить" : "Отмена"}
            </button>
            <button onClick={() => { if (mode === "response") { setAccepted(true); } else { onConfirm(); } }}
              className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90"
              style={{background:BLUE}}>
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelperRequestForm({ helper, onBack }: { helper: MockHelper; onBack: () => void }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!date) e.date = "Обязательное поле";
    else if (!isValidDate(date)) e.date = "Такой даты не существует";
    else if (!isFutureDate(date)) e.date = "Дата не может быть в прошлом";
    if (!time) e.time = "Обязательное поле";
    if (!price) e.price = "Обязательное поле";
    if (!address) e.address = "Обязательное поле";
    return e;
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{background:"#DCFCE7"}}>
          <svg className="w-8 h-8" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="font-bold text-gray-900 text-base mb-1">Заявка отправлена!</p>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">
          Мы уведомим вас, когда <span className="font-semibold">{helper.name}</span> ответит на вашу заявку.
        </p>
        <button onClick={onBack}
          className="px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90"
          style={{background:BLUE}}>
          Вернуться к поиску
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl px-5 py-3 flex items-center gap-2" style={{background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        <p className="text-xs font-semibold" style={{color:GREEN}}>
          <span className="font-bold">{helper.name}</span> выбран для выполнения заявки
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4 mb-3">
          <HelperAvatar name={helper.name} size={56} colorId={helper.id}/>
          <div>
            <p className="font-bold text-gray-900 text-sm">{helper.name}</p>
            <p className="text-xs text-gray-400 mb-1">{helper.categoryLabel}</p>
            <StarRating rating={helper.rating}/>
          </div>
        </div>
        <p className="text-xs text-gray-500">{helper.description}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm">Дата и время выполнения</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <DatePickerField
              value={date}
              onChange={v=>{setDate(v);if(errors.date)setErrors(er=>({...er,date:""}));}}
              error={errors.date}
            />
            {errors.date && <p className="text-[10px] text-red-500">{errors.date}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <input type="text" value={time}
              onChange={e=>{setTime(e.target.value);if(errors.time)setErrors(er=>({...er,time:""}));}}
              placeholder="ЧЧ:ММ"
              className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${errors.time?"border-red-400 bg-red-50":"border-gray-200 focus:border-blue-400"}`}/>
            {errors.time && <p className="text-[10px] text-red-500">{errors.time}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Написать комментарий</label>
          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="Опишите детали вашей заявки..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none resize-none focus:border-blue-400 transition-all"/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Цена</label>
            <div className="relative">
              <input type="text" inputMode="numeric" value={price}
                onChange={e=>{setPrice(e.target.value.replace(/\D/g,""));if(errors.price)setErrors(er=>({...er,price:""}));}}
                placeholder="0"
                className={`w-full px-3 py-2.5 pr-6 rounded-xl border text-xs outline-none transition-all ${errors.price?"border-red-400 bg-red-50":"border-gray-200 focus:border-blue-400"}`}/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₸</span>
            </div>
            {errors.price && <p className="text-[10px] text-red-500">{errors.price}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Ваш адрес</label>
            <button type="button"
              onClick={()=>{setShowAddressPicker(true);if(errors.address)setErrors(er=>({...er,address:""}));}}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs text-left flex items-center gap-2 transition-all ${errors.address?"border-red-400 bg-red-50":address?"border-gray-200 bg-gray-50":"border-gray-200 hover:border-blue-400"}`}>
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {address
                ? <span className="truncate text-gray-800">{address.split(",").slice(0,2).join(",")}{city?<span className="text-gray-400 ml-1">({city})</span>:null}</span>
                : <span className="text-gray-400">Выберите адрес</span>
              }
            </button>
            {errors.address && <p className="text-[10px] text-red-500">{errors.address}</p>}
          </div>
        </div>

        {showAddressPicker && (
          <AddressPickerModal
            onClose={()=>setShowAddressPicker(false)}
            onSelect={(addr,c)=>{setAddress(addr);setCity(c);setShowAddressPicker(false);}}
          />
        )}

        <button onClick={()=>{const errs=validate();setErrors(errs);if(!Object.keys(errs).length)setSubmitted(true);}}
          className="w-full py-3 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{background:BLUE}}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/></svg>
          Отправить заявку
        </button>
        <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>
          Мы уведомим вас, когда ответит помощник.
        </p>
      </div>
    </div>
  );
}

function FindHelpersTab({ userId }: { userId: number }) {
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<"all" | "almaty" | "astana">("all");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<MockHelper | null>(null);
  const [showSelectReq, setShowSelectReq] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [view, setView] = useState<"grid" | "form">("grid");

  const activeWithNoHelper = loadRequests(userId).filter(r=>(r.status??"active")==="active"&&!r.helper);

  const filtered = MOCK_HELPERS.filter(h=>{
    const q=query.toLowerCase();
    const matchQ=!q||h.name.toLowerCase().includes(q)||h.categoryLabel.toLowerCase().includes(q)||h.description.toLowerCase().includes(q);
    const matchC=cityFilter==="all"||h.city===cityFilter;
    return matchQ&&matchC;
  });

  const handleSelect=(h:MockHelper)=>{
    setSelectedHelper(h);
    if(activeWithNoHelper.length>0) setShowSelectReq(true);
    else setShowConfirm(true);
  };

  const cityLabel=cityFilter==="almaty"?"Алматы":cityFilter==="astana"?"Астана":"Все города";

  if(view==="form"&&selectedHelper) {
    return <HelperRequestForm helper={selectedHelper} onBack={()=>{setView("grid");setSelectedHelper(null);}}/>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Поиск услуг"
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all"/>
              <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-r-xl" style={{background:BLUE}}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>
            <div className="relative shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 leading-tight">Мой город:</p>
                <button onClick={()=>setCityPickerOpen(v=>!v)}
                  className="text-xs font-bold transition-opacity hover:opacity-75"
                  style={{color:BLUE}}>
                  {cityLabel}
                </button>
              </div>
              {cityPickerOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[130px] overflow-hidden">
                  {([ ["all","Все города"],["almaty","Алматы"],["astana","Астана"] ] as const).map(([key,label])=>(
                    <button key={key} onClick={()=>{setCityFilter(key);setCityPickerOpen(false);}}
                      className="block w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                      style={{color:cityFilter===key?BLUE:"#374151",fontWeight:cityFilter===key?"700":"400"}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {filtered.length===0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm">По вашему запросу ничего не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(h=>(
              <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <HelperAvatar name={h.name} size={44} colorId={h.id}/>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-xs leading-tight">{h.name}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mb-1">{h.categoryLabel}</p>
                    <StarRating rating={h.rating}/>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug line-clamp-3 flex-1 mb-3">{h.description}</p>
                <div className="flex justify-end">
                  <button onClick={()=>handleSelect(h)}
                    className="px-4 py-1.5 text-white text-xs font-bold rounded-lg transition-opacity hover:opacity-90"
                    style={{background:BLUE}}>
                    Выбрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSelectReq&&selectedHelper&&(
        <SelectRequestModal
          requests={activeWithNoHelper}
          onSelect={()=>{setShowSelectReq(false);setShowConfirm(true);}}
          onClose={()=>{setShowSelectReq(false);setSelectedHelper(null);}}
        />
      )}
      {showConfirm&&selectedHelper&&(
        <ConfirmHelperModal
          helper={selectedHelper}
          onClose={()=>{setShowConfirm(false);setSelectedHelper(null);}}
          onConfirm={()=>{setShowConfirm(false);setView("form");}}
        />
      )}
    </>
  );
}

/* ─────────────── notifications tab ─────────────── */
interface NotifItem {
  id: number;
  type: "accepted" | "new_response" | "reminder" | "rejected" | "message";
  time: string;
  helperName?: string;
  service?: string;
  reason?: string;
  category?: string;
  rating?: number;
  preview?: string;
  date?: string;
}

const NOTIFS_TODAY: NotifItem[] = [
  { id:1, type:"accepted",     helperName:"Аймердинов Амир",    service:"Покупка",         time:"12:45" },
  { id:2, type:"new_response", helperName:"Айбергенова Асылай", category:"Бытовая помощь", rating:4.8,  time:"11:05" },
  { id:3, type:"reminder",     preview:"Сегодня в 16:00 уборка квартиры.",                 time:"" },
];
const NOTIFS_YESTERDAY: NotifItem[] = [
  { id:4, type:"rejected",  helperName:"Береке Мадина",  service:"Покупка лекарств", reason:"По личным причинам", time:"18:05" },
  { id:5, type:"accepted",  helperName:"Куаныш Дастан",  service:"Бытовая помощь",                                time:"18:05" },
];
const NOTIFS_EARLIER: NotifItem[] = [
  { id:6, type:"message", helperName:"Бакыт Диас", preview:"Я уже купил всё необходимое", date:"28 марта", time:"10:20" },
];

function NotifCard({ n, onView }: { n: NotifItem; onView?: () => void }) {
  const h = n.helperName ? MOCK_HELPERS.find(x=>x.name===n.helperName) : undefined;
  const colorId = h?.id ?? 0;

  if(n.type==="accepted") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:"#DCFCE7"}}>
        <svg className="w-4 h-4" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">{n.helperName} принял вашу заявку</p>
        <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {n.time&&<span className="text-[10px] text-gray-400">{n.time}</span>}
        <button className="px-3 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap"
          style={{color:BLUE,border:"1px solid #BFDBFE"}}>
          Открыть заявку
        </button>
      </div>
    </div>
  );

  if(n.type==="new_response") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:"#FEF9C3"}}>
        <svg className="w-4 h-4" fill="none" stroke="#EAB308" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 mb-2">Новый отклик на заявку</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          {n.helperName&&<HelperAvatar name={n.helperName} size={32} colorId={colorId}/>}
          <div>
            <p className="text-[11px] font-semibold text-gray-800 leading-tight">{n.helperName}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{n.category}</p>
            <StarRating rating={n.rating??4.8}/>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
        {n.time&&<span className="text-[10px] text-gray-400">{n.time}</span>}
        {onView&&<button onClick={onView} className="px-3 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700">Посмотреть</button>}
      </div>
    </div>
  );

  if(n.type==="reminder") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:"#FEF9C3"}}>
        <svg className="w-4 h-4" fill="none" stroke="#EAB308" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-gray-900">Напоминание: </span>
        <span className="text-xs text-gray-500">{n.preview}</span>
      </div>
    </div>
  );

  if(n.type==="rejected") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:"#FEE2E2"}}>
        <svg className="w-4 h-4" fill="none" stroke="#EF4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">{n.helperName} отклонила вашу заявку</p>
        <p className="text-[10px] text-gray-400">Заявка: {n.service}</p>
        {n.reason&&<p className="text-[10px] text-gray-400">Причина: {n.reason}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  if(n.type==="message") return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background:"#FED7AA"}}>
        <svg className="w-4 h-4" fill="none" stroke="#F97316" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900">Новое сообщение от {n.helperName}</p>
        <p className="text-[10px] text-gray-400 italic">"{n.preview}"</p>
        {n.date&&<p className="text-[10px] text-gray-300 mt-0.5">{n.date}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
    </div>
  );

  return null;
}

function NotificationsTab() {
  const [responseHelper, setResponseHelper] = useState<MockHelper|null>(null);

  const handleViewResponse=(name:string)=>{
    const found=MOCK_HELPERS.find(h=>h.name===name);
    if(found) setResponseHelper(found);
  };

  const renderGroup=(title:string, items:NotifItem[], twoCol=false)=>(
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="font-bold text-sm text-gray-800">{title}</h3>
      </div>
      {twoCol ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {items.map(n=>(
            <div key={n.id} className="border border-gray-100 rounded-xl p-4">
              <NotifCard n={n} onView={n.type==="new_response"&&n.helperName?()=>handleViewResponse(n.helperName!):undefined}/>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">
          {items.map(n=>(
            <NotifCard key={n.id} n={n} onView={n.type==="new_response"&&n.helperName?()=>handleViewResponse(n.helperName!):undefined}/>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {renderGroup("Сегодня", NOTIFS_TODAY)}
        {renderGroup("Вчера",  NOTIFS_YESTERDAY, true)}
        {renderGroup("Ранее",  NOTIFS_EARLIER)}
      </div>
      {responseHelper&&(
        <ConfirmHelperModal
          helper={responseHelper}
          onClose={()=>setResponseHelper(null)}
          onConfirm={()=>setResponseHelper(null)}
          mode="response"
        />
      )}
    </>
  );
}

/* ─────────────── account settings tab ─────────────── */
const CATEGORY_META: Record<string, {label:string; img:string}> = {
  household: { label:"Бытовая помощь",    img:imgHousehold },
  medical:   { label:"Медицинская помощь", img:imgMedical },
  escort:    { label:"Сопровождение",      img:imgEscort },
  homework:  { label:"Домашние работы",    img:imgHomeWork },
  shopping:  { label:"Покупки",            img:imgShopping },
};

const CATEGORIES_LIST = [
  { key:"household", label:"Бытовая помощь",    desc:"уборка, приготовление еды" },
  { key:"medical",   label:"Медицинская помощь", desc:"покупка лекарств, сопровождение" },
  { key:"escort",    label:"Сопровождение",      desc:"поход в больницу, прогулка" },
  { key:"homework",  label:"Домашние работы",    desc:"починка, мелкий ремонт" },
  { key:"shopping",  label:"Покупки",            desc:"продукты, хозяйственные товары" },
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
            { label:"Старый пароль",            val:oldPw, set:setOldPw, show:showOld, setShow:setShowOld },
            { label:"Новый пароль",             val:newPw, set:setNewPw, show:showNew, setShow:setShowNew },
            { label:"Подтвердите новый пароль", val:confirmPw, set:setConfirmPw, show:showConf, setShow:setShowConf },
          ].map(({label,val,set,show,setShow}) => (
            <div key={label}>
              <label className="text-xs text-gray-600 mb-1 block">{label}</label>
              <div className="relative">
                <input type={show?"text":"password"} value={val} onChange={e=>set(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 pr-10"/>
                <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Eye className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">забыли пароль?</button>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{background:BLUE}}>подтвердить</button>
        </div>
      </div>
    </div>
  );
}

function CategoryPickerModal({ selected, onToggle, onClose }: {
  selected: string[]; onToggle: (key:string)=>void; onClose: ()=>void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-xl font-light">✕</button>
        <h3 className="text-center font-bold text-gray-800 text-base mb-8">Выберите категорию, чтобы оказать услугу...</h3>
        <div className="grid grid-cols-5 gap-4">
          {CATEGORIES_LIST.map(cat=>{
            const isSel = selected.includes(cat.key);
            return (
              <div key={cat.key} className="border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center gap-3">
                <img src={CATEGORY_META[cat.key].img} className="w-20 h-20 object-contain" alt={cat.label}/>
                <div>
                  <p className="font-semibold text-gray-800 text-xs leading-tight">{cat.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{cat.desc}</p>
                </div>
                <button onClick={()=>onToggle(cat.key)}
                  className="w-full py-2 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90"
                  style={{background:isSel?"#EF4444":GREEN}}>
                  {isSel?"Убрать":"Выбрать"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onConfirm, onClose }: { onConfirm:()=>void; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-2">Удалить аккаунт?</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Вы уверены, что хотите удалить свою учётную запись? Все данные будут безвозвратно удалены и недоступны для восстановления.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{background:"#EF4444"}}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

function UnsavedChangesModal({ onSave, onDiscard }: { onSave:()=>void; onDiscard:()=>void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-2">Несохранённые изменения</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">У вас есть несохранённые изменения в настройках аккаунта. Сохранить их перед уходом?</p>
        <div className="flex gap-3">
          <button onClick={onDiscard} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Не сохранять</button>
          <button onClick={onSave} className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity" style={{background:BLUE}}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function DocumentsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingIdx, setPendingIdx] = useState<number|null>(null);
  const [docs, setDocs] = useState<Array<{type:string;date:string;size:string}|null>>([null,null,null]);

  const handleUploadClick = (i:number) => { setPendingIdx(i); fileInputRef.current?.click(); };
  const handleFileChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && pendingIdx !== null) {
      const f = e.target.files[0];
      const ext = f.name.split(".").pop()?.toUpperCase() ?? "PDF";
      const kb = Math.max(1, Math.round(f.size/1024));
      const d = new Date();
      const date = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
      setDocs(prev=>{ const n=[...prev]; n[pendingIdx]={type:ext,date,size:`${kb} KB`}; return n; });
      e.target.value="";
      setPendingIdx(null);
    }
  };

  const allDone = docs.every(d=>d!==null);

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange}/>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Название</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Тип</th>
              {allDone&&<><th className="px-5 py-3.5 text-left font-semibold text-gray-600">Дата</th><th className="px-5 py-3.5 text-left font-semibold text-gray-600">Размер</th></>}
              <th className="px-5 py-3.5 text-right font-semibold text-gray-600">Действие</th>
            </tr>
          </thead>
          <tbody>
            {REQUIRED_DOCS.map((name,i)=>(
              <tr key={i} className="border-b border-gray-50 last:border-b-0">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" style={{color:"#EF4444"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">{name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{docs[i]?.type ?? "PDF"}</td>
                {allDone&&<><td className="px-5 py-3.5 text-gray-500">{docs[i]?.date}</td><td className="px-5 py-3.5 text-gray-500">{docs[i]?.size}</td></>}
                <td className="px-5 py-3.5 text-right">
                  {docs[i] ? (
                    <button className="px-4 py-1.5 text-xs font-bold text-white rounded-lg" style={{background:BLUE}}>открыть</button>
                  ) : (
                    <button onClick={()=>handleUploadClick(i)} className="px-4 py-1.5 text-xs font-bold text-white rounded-lg" style={{background:GREEN}}>загрузить</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!allDone&&<p className="text-right text-[10px] text-gray-400 px-5 pb-3">* Обязательно загрузить эти документы</p>}
      </div>
      {allDone&&(
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:"#EFF6FF"}}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Безопасность</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Ваши документы защищены и доступны только вам и доверенным лицам. Все данные хранятся в зашифрованном виде и не передаются третьим лицам.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountSettingsTab({ onDirtyChange, settingsSaveRef }: {
  onDirtyChange: (dirty:boolean)=>void;
  settingsSaveRef: React.MutableRefObject<(()=>void)|null>;
}) {
  const { currentUser, updateProfile, logout } = useAuth();
  if (!currentUser) return null;
  const u = currentUser;

  const [settingsView, setSettingsView] = useState<"profile"|"documents">("profile");
  const [firstName,    setFirstName]    = useState(u.firstName);
  const [lastName,     setLastName]     = useState(u.lastName);
  const [email,        setEmail]        = useState(u.email);
  const [phone,        setPhone]        = useState(u.phone);
  const [city,         setCity]         = useState(u.city ?? "almaty");
  const [role,         setRole]         = useState(u.role);
  const [categories,   setCategories]   = useState<string[]>(u.role==="offer-help" ? ["shopping","household","medical"] : []);
  const [emailEditing, setEmailEditing] = useState(false);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [avatarSrc,    setAvatarSrc]    = useState<string|null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal,  setShowPasswordModal]  = useState(false);
  const [showCategoryModal,  setShowCategoryModal]  = useState(false);
  const [showDeleteModal,    setShowDeleteModal]     = useState(false);

  const initRef = useRef({
    firstName: u.firstName, lastName: u.lastName, email: u.email,
    phone: u.phone, city: u.city ?? "almaty", role: u.role,
    categories: (u.role==="offer-help" ? ["shopping","household","medical"] : []).join(","),
  });

  const isDirty =
    firstName !== initRef.current.firstName ||
    lastName  !== initRef.current.lastName  ||
    email     !== initRef.current.email     ||
    phone     !== initRef.current.phone     ||
    city      !== initRef.current.city      ||
    role      !== initRef.current.role      ||
    (role==="offer-help" && categories.join(",") !== initRef.current.categories);

  useEffect(() => { onDirtyChange(isDirty); }, [firstName,lastName,email,phone,city,role,categories]);

  settingsSaveRef.current = () => {
    updateProfile({ firstName, lastName, email, phone, city, role });
    initRef.current = { firstName, lastName, email, phone, city, role, categories: categories.join(",") };
    onDirtyChange(false);
  };

  const handleSave = () => { settingsSaveRef.current?.(); };

  const EditPen = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2"/>
      <path d="m18.5 2.5 2 2L10 15l-2.5.5.5-2.5L18.5 2.5z" strokeWidth="2"/>
    </svg>
  );
  const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke={GREEN} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="2.5"/></svg>
  );

  if (settingsView === "documents") {
    return (
      <div className="space-y-4">
        <button onClick={()=>setSettingsView("profile")}
          className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-75"
          style={{color:BLUE}}>
          <ArrowLeft className="w-4 h-4"/> Назад к профилю
        </button>
        <DocumentsView/>
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
            ? <img src={avatarSrc} className="w-20 h-20 rounded-full object-cover border border-gray-200"/>
            : <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{background:BLUE}}>
                {(u.firstName[0]+(u.lastName?.[0]??'')).toUpperCase()}
              </div>
          }
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden"
              onChange={e=>{ if(e.target.files?.[0]) setAvatarSrc(URL.createObjectURL(e.target.files[0])); }}/>
            <button onClick={()=>avatarInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity"
              style={{background:BLUE}}>
              + Изменить изображение
            </button>
            <button onClick={()=>setAvatarSrc(null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              Удалить изображение
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Мы поддерживаем формат PNG, JPEG и GIF размером менее 2 МБ</p>
          <div className="flex gap-2">
            <button onClick={()=>setRole("seek-help")}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl transition-colors"
              style={role==="seek-help"?{background:BLUE,color:"white",border:"none"}:{background:"white",color:BLUE,border:`1px solid ${BLUE}`}}>
              Запросить помощь
            </button>
            <button onClick={()=>setRole("offer-help")}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl transition-colors"
              style={role==="offer-help"?{background:BLUE,color:"white",border:"none"}:{background:"white",color:BLUE,border:`1px solid ${BLUE}`}}>
              Оказать помощь
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories (offer-help only) ── */}
      {role==="offer-help" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Категории</label>
            <span className="text-[10px] text-gray-400">Добавить ещё...</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map(key=>(
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{background:BLUE}}>
                {CATEGORY_META[key]?.label ?? key}
                <button onClick={()=>setCategories(p=>p.filter(c=>c!==key))}
                  className="text-white/80 hover:text-white font-bold leading-none">✕</button>
              </div>
            ))}
            <button onClick={()=>setShowCategoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:border-blue-300 transition-colors">
              {categories.length===0?"Добавить категорию": CATEGORIES_LIST.find(c=>!categories.includes(c.key))?.label ?? "Добавить ещё"}
              <ChevronDown className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      )}

      {/* ── Profile form ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Имя</label>
            <input value={firstName} onChange={e=>setFirstName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Фамилия</label>
            <input value={lastName} onChange={e=>setLastName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all"/>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Город</label>
          <div className="relative">
            <select value={city} onChange={e=>setCity(e.target.value)}
              className="w-full px-3 py-2.5 pr-8 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 transition-all appearance-none bg-white cursor-pointer">
              <option value="almaty">Алматы</option>
              <option value="astana">Астана</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Электронная почта</label>
          <div className="relative">
            <input type="email" value={email} readOnly={!emailEditing} onChange={e=>setEmail(e.target.value)}
              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs outline-none transition-all ${emailEditing?"border-blue-400":"border-gray-200"}`}/>
            <button type="button" onClick={()=>setEmailEditing(v=>!v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              {emailEditing ? <CheckIcon/> : <EditPen/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Номер телефона</label>
          <div className="relative">
            <input type="tel" value={phone} readOnly={!phoneEditing} onChange={e=>setPhone(e.target.value)}
              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-xs outline-none transition-all ${phoneEditing?"border-blue-400":"border-gray-200"}`}/>
            <button type="button" onClick={()=>setPhoneEditing(v=>!v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              {phoneEditing ? <CheckIcon/> : <EditPen/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Пароль</label>
          <div className="relative">
            <input type="password" value="••••••••••" readOnly
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-xs outline-none"/>
            <button type="button" onClick={()=>setShowPasswordModal(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
              <EditPen/>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={!isDirty}
            className="px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity"
            style={{background:isDirty?GREEN:"#9CA3AF", cursor:isDirty?"pointer":"not-allowed", opacity:isDirty?1:0.7}}>
            сохранить
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100"/>

      {/* ── Documents ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Мои документы</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Ваши документы защищены и доступны только вам и доверенным лицам.</p>
        </div>
        <button onClick={()=>setSettingsView("documents")}
          className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-blue-50 transition-colors"
          style={{color:BLUE,borderColor:"#BFDBFE"}}>
          посмотреть
        </button>
      </div>

      <div className="border-t border-gray-100"/>

      {/* ── Delete account ── */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{color:"#EF4444"}}>Удалить мой аккаунт</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-xl leading-relaxed">
            Безвозвратно удалите учётную запись со всеми связанными данными, включая личную информацию, историю активности и документы, без возможности последующего восстановления. После удаления доступ ко всем рабочим областям, сервисам и функциям платформы будет полностью прекращён.
          </p>
        </div>
        <button onClick={()=>setShowDeleteModal(true)}
          className="px-4 py-2 text-xs font-bold text-white rounded-xl shrink-0 hover:opacity-90 transition-opacity"
          style={{background:"#EF4444"}}>
          удалить аккаунт
        </button>
      </div>

      {showPasswordModal  && <PasswordResetModal onClose={()=>setShowPasswordModal(false)}/>}
      {showCategoryModal  && <CategoryPickerModal selected={categories} onToggle={k=>setCategories(p=>p.includes(k)?p.filter(c=>c!==k):[...p,k])} onClose={()=>setShowCategoryModal(false)}/>}
      {showDeleteModal    && <DeleteAccountModal onClose={()=>setShowDeleteModal(false)} onConfirm={()=>{logout();}}/>}
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
function DashboardContent({ activeNav, userId, userRole, firstName, openedChatId, setOpenedChatId, onSettingsDirtyChange, settingsSaveRef }: {
  activeNav: NavKey;
  userId: number;
  userRole: string;
  firstName: string;
  openedChatId: number | null;
  setOpenedChatId: (id: number | null) => void;
  onSettingsDirtyChange: (dirty: boolean) => void;
  settingsSaveRef: React.MutableRefObject<(()=>void)|null>;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("create");
  const [settingsDirtyLocal, setSettingsDirtyLocal] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey|null>(null);
  const [showUnsavedTab, setShowUnsavedTab] = useState(false);

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

  if (activeNav==="messages") {
    if (openedChatId !== null) {
      const conv = CONVERSATIONS.find(c=>c.id===openedChatId);
      if (!conv) return null;
      return (
        <div style={{ height: "calc(100vh - 108px)" }}>
          <ChatDetail conv={conv}/>
        </div>
      );
    }
    return <MessagesContent onOpenChat={setOpenedChatId}/>;
  }

  if (activeNav==="requests") return <MyRequestsContent userId={userId}/>;

  if (activeNav!=="dashboard") return <ComingSoon/>;

  const tabs: {key:TabKey;label:string}[] = [
    {key:"create",        label:t("dashboard.tabCreate")},
    {key:"search",        label:t("dashboard.tabSearch")},
    {key:"notifications", label:t("dashboard.tabNotifications")},
    {key:"settings",      label:t("dashboard.tabSettings")},
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex">
            {tabs.map(tab=>(
              <button key={tab.key} onClick={()=>handleTabClick(tab.key)}
                className="px-5 py-3 text-xs font-semibold transition-colors whitespace-nowrap border-b-2"
                style={activeTab===tab.key?{color:BLUE,borderColor:BLUE,background:"white"}:{color:"#6b7280",borderColor:"transparent"}}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {activeTab==="create"        && (userRole==="offer-help" ? <HelperDashboard user={{firstName}}/> : <CreateRequestTab userId={userId}/>)}
        {activeTab==="search"        && <FindHelpersTab userId={userId}/>}
        {activeTab==="notifications" && <NotificationsTab/>}
        {activeTab==="settings"      && <AccountSettingsTab onDirtyChange={handleDirtyChange} settingsSaveRef={settingsSaveRef}/>}
      </div>
      {showUnsavedTab && (
        <UnsavedChangesModal onSave={handleUnsavedSave} onDiscard={handleUnsavedDiscard}/>
      )}
    </>
  );
}

/* ─────────────── page root ─────────────── */
function DashboardPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const [openedChatId, setOpenedChatId] = useState<number | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<NavKey|null>(null);
  const [showNavUnsaved, setShowNavUnsaved] = useState(false);
  const settingsSaveRef = useRef<(()=>void)|null>(null);

  if (!currentUser) return null;

  const handleNavChange = (key: NavKey) => {
    if (settingsDirty && activeNav === "dashboard") {
      setPendingNav(key);
      setShowNavUnsaved(true);
    } else {
      setActiveNav(key);
      setOpenedChatId(null);
    }
  };

  const navTitleMap: Partial<Record<NavKey, string>> = {
    messages: t("dashboard.navMessages"),
    requests: t("dashboard.navMyRequests"),
  };

  const headerLeft = navTitleMap[activeNav] ? (
    <button
      onClick={() => {
        if (activeNav === "messages" && openedChatId !== null) setOpenedChatId(null);
        else handleNavChange("dashboard");
      }}
      className="flex items-center gap-1.5 font-bold text-sm transition-opacity hover:opacity-75"
      style={{ color: BLUE }}
    >
      <ArrowLeft className="w-4 h-4"/>
      {navTitleMap[activeNav]}
    </button>
  ) : (
    <p className="text-sm font-bold" style={{ color: BLUE }}>{t("dashboard.title")}</p>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar activeNav={activeNav} setActiveNav={handleNavChange} user={currentUser}/>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <div className="p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 flex items-center justify-between shrink-0">
            {headerLeft}
            <div className="flex items-center gap-2">
              <AccessibilityToggle/>
              <LanguageSwitcher/>
            </div>
          </div>

          <DashboardContent
            activeNav={activeNav}
            userId={currentUser.id}
            userRole={currentUser.role}
            firstName={currentUser.firstName}
            openedChatId={openedChatId}
            setOpenedChatId={setOpenedChatId}
            onSettingsDirtyChange={setSettingsDirty}
            settingsSaveRef={settingsSaveRef}
          />
        </div>
      </div>

      {showNavUnsaved && (
        <UnsavedChangesModal
          onSave={()=>{
            settingsSaveRef.current?.();
            setSettingsDirty(false);
            setShowNavUnsaved(false);
            if (pendingNav) { setActiveNav(pendingNav); setOpenedChatId(null); setPendingNav(null); }
          }}
          onDiscard={()=>{
            setSettingsDirty(false);
            setShowNavUnsaved(false);
            if (pendingNav) { setActiveNav(pendingNav); setOpenedChatId(null); setPendingNav(null); }
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPageWithGuard() {
  return (
    <AuthGuard>
      <DashboardPage/>
    </AuthGuard>
  );
}
