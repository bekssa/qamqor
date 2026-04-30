import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Client } from "@stomp/stompjs";
import { api } from "@shared/api";
import { useAuth } from "@features/auth/model/context";
import { UserDocument, ModerationReport } from "@shared/api/types";
import {
  ShieldCheck, BarChart2, Gavel, LogOut, FileText,
  CheckCircle, XCircle, Clock, ChevronRight, Download, Eye,
  MessageSquare, Send, ArrowLeft, AlertTriangle,
} from "lucide-react";
import logoImg from "@/assets/services/logo.png";

const GREEN = "#2C9C42";
const BLUE = "#3B82F6";

const DOC_LABELS: Record<string, string> = {
  NARCO_CERT: "Справка из наркологического диспансера",
  PSYCH_CERT: "Справка из психиатрического диспансера",
  NO_CRIMINAL: "Справка об отсутствии судимости",
};

const REJECT_REASONS = [
  "Документ нечитаем или плохого качества",
  "Истёк срок действия справки",
  "Данные в документе не совпадают с профилем",
  "Документ не является официальным",
  "Неверный тип документа",
  "Отсутствует печать или подпись",
];

type AdminSection = "verification" | "statistics" | "moderation";

/* ── status badge ── */
function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: GREEN }}>
      <CheckCircle className="w-3 h-3" /> Принято
    </span>
  );
  if (status === "REJECTED") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEE2E2", color: "#EF4444" }}>
      <XCircle className="w-3 h-3" /> Отказано
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF9C3", color: "#CA8A04" }}>
      <Clock className="w-3 h-3" /> На проверке
    </span>
  );
}

/* ── approve confirm modal ── */
function ApproveModal({ doc, onClose, onConfirm }: { doc: UserDocument; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#DCFCE7" }}>
          <CheckCircle className="w-7 h-7" style={{ color: GREEN }} />
        </div>
        <h3 className="font-bold text-gray-900 text-base text-center mb-1">Подтвердить принятие</h3>
        <p className="text-xs text-gray-500 text-center mb-5">
          Документ <span className="font-semibold">{DOC_LABELS[doc.documentType] ?? doc.documentType}</span> будет принят. Пользователь получит уведомление.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: GREEN }}>
            {loading ? "..." : "Принять"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── reject modal ── */
function RejectModal({ doc, onClose, onConfirm }: { doc: UserDocument; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FEE2E2" }}>
          <XCircle className="w-7 h-7" style={{ color: "#EF4444" }} />
        </div>
        <h3 className="font-bold text-gray-900 text-base text-center mb-1">Причина отказа</h3>
        <p className="text-xs text-gray-400 text-center mb-4">
          Документ: <span className="font-semibold text-gray-600">{DOC_LABELS[doc.documentType] ?? doc.documentType}</span>
        </p>
        <div className="space-y-2 mb-5">
          {REJECT_REASONS.map(r => (
            <label key={r} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl border transition-all"
              style={{ borderColor: selected === r ? "#EF4444" : "#e5e7eb", background: selected === r ? "#FFF5F5" : "white" }}>
              <input type="radio" name="reason" value={r} checked={selected === r} onChange={() => setSelected(r)}
                className="mt-0.5 shrink-0 accent-red-500" />
              <span className="text-xs text-gray-700 leading-relaxed">{r}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button
            onClick={async () => { if (!selected) return; setLoading(true); await onConfirm(selected); setLoading(false); }}
            disabled={!selected || loading}
            className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "#EF4444" }}>
            {loading ? "..." : "Отказать"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── document card ── */
function DocCard({ doc, onApprove, onReject }: { doc: UserDocument; onApprove: (d: UserDocument) => void; onReject: (d: UserDocument) => void }) {
  const uploadedDate = new Date(doc.uploadedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  const initial = doc.userId.slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* User info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,#5bb8f5,#3b82f6)" }}>
            {initial}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">{DOC_LABELS[doc.documentType] ?? doc.documentType}</p>
            <p className="text-[10px] text-gray-400">ID пользователя: {doc.userId.slice(0, 8)}...</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* File info */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
          <FileText className="w-4 h-4" style={{ color: "#EF4444" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{doc.fileName}</p>
          <p className="text-[10px] text-gray-400">PDF • {uploadedDate}</p>
        </div>
        <div className="flex gap-1.5">
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            title="Просмотреть">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </a>
          <a href={doc.fileUrl} download={doc.fileName}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors"
            title="Скачать">
            <Download className="w-3.5 h-3.5 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Reject reason */}
      {doc.status === "REJECTED" && doc.rejectReason && (
        <div className="px-3 py-2 rounded-xl" style={{ background: "#FFF5F5", border: "1px solid #FECACA" }}>
          <p className="text-[11px] font-semibold" style={{ color: "#EF4444" }}>Причина отказа:</p>
          <p className="text-xs text-gray-600 mt-0.5">{doc.rejectReason}</p>
        </div>
      )}

      {/* Actions — only for PENDING */}
      {doc.status === "PENDING" && (
        <div className="flex gap-3 pt-1">
          <button onClick={() => onReject(doc)}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-red-50"
            style={{ color: "#EF4444", borderColor: "#FECACA" }}>
            Отказать
          </button>
          <button onClick={() => onApprove(doc)}
            className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ background: GREEN }}>
            Принять
          </button>
        </div>
      )}
    </div>
  );
}

/* ── verification section ── */
function VerificationSection() {
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingDoc, setApprovingDoc] = useState<UserDocument | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<UserDocument | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.getAdminPendingDocuments();
      setDocs(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (doc: UserDocument) => {
    const updated = await api.approveDocument(doc.id);
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
    setApprovingDoc(null);
  };

  const handleReject = async (reason: string) => {
    if (!rejectingDoc) return;
    const updated = await api.rejectDocument(rejectingDoc.id, reason);
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
    setRejectingDoc(null);
  };

  const filtered = filter === "ALL" ? docs : docs.filter(d => d.status === filter);
  const pendingCount = docs.filter(d => d.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {pendingCount > 0 ? `${pendingCount} документов ожидают проверки` : "Все документы проверены"}
        </p>
        <button onClick={load} className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Обновить
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([["PENDING", "На проверке"], ["APPROVED", "Принято"], ["REJECTED", "Отказано"], ["ALL", "Все"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filter === key
              ? { background: BLUE, color: "white", border: `1px solid ${BLUE}` }
              : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            {label}
            {key === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(255,255,255,0.3)" }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <p className="text-gray-400 text-sm">Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#d1d5db" }} />
          <p className="text-gray-400 text-sm">
            {filter === "PENDING" ? "Нет документов на проверке" : "Нет документов в этой категории"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(doc => (
            <DocCard key={doc.id} doc={doc}
              onApprove={d => setApprovingDoc(d)}
              onReject={d => setRejectingDoc(d)}
            />
          ))}
        </div>
      )}

      {approvingDoc && (
        <ApproveModal doc={approvingDoc} onClose={() => setApprovingDoc(null)} onConfirm={() => handleApprove(approvingDoc)} />
      )}
      {rejectingDoc && (
        <RejectModal doc={rejectingDoc} onClose={() => setRejectingDoc(null)} onConfirm={handleReject} />
      )}
    </div>
  );
}

/* ── statistics section ── */
function StatisticsSection() {
  return (
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
}

/* ── violation badge ── */
const VIOLATION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PROFANITY:     { label: "Нецензурная лексика", color: "#DC2626", bg: "#FEE2E2" },
  FRAUD:         { label: "Мошенничество",        color: "#B45309", bg: "#FEF3C7" },
  THREATS:       { label: "Угрозы",               color: "#7C3AED", bg: "#EDE9FE" },
  PERSONAL_DATA: { label: "Персональные данные",  color: "#0369A1", bg: "#E0F2FE" },
  SPAM:          { label: "Спам",                  color: "#047857", bg: "#D1FAE5" },
  HATE_SPEECH:   { label: "Ненависть",            color: "#BE185D", bg: "#FCE7F3" },
};

function ViolationBadge({ code }: { code: string }) {
  const info = VIOLATION_LABELS[code] ?? { label: code, color: "#6B7280", bg: "#F3F4F6" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: info.color, background: info.bg }}>
      {info.label}
    </span>
  );
}

/* ── admin chat with user ── */
function AdminUserChat({ chatId, adminId, userName, onBack }: {
  chatId: string; adminId: string; userName?: string; onBack: () => void
}) {
  const [messages, setMessages] = useState<{ id: number; senderId: string; text: string; timestamp: string }[]>([]);
  const [input, setInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<Client | null>(null);
  // Track locally-sent message IDs to avoid WebSocket echo duplicates
  const sentIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    setLoadingMessages(true);
    api.getMessages(chatId)
      .then((list: any[]) => setMessages(list))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const wsUrl = api.getWsUrl();
    if (!wsUrl) return;
    const client = new Client({
      brokerURL: wsUrl,
      onConnect: () => {
        client.subscribe(`/topic/chat/${chatId}`, frame => {
          const msg = JSON.parse(frame.body);
          // Skip echo of admin's own messages (already added optimistically)
          if (msg.senderId === adminId && sentIds.current.has(msg.id)) return;
          if (msg.senderId === adminId) return;
          setMessages(prev => [...prev, msg]);
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [chatId, adminId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !stompRef.current?.connected) return;
    setInput("");
    const tmpId = Date.now();
    const now = new Date().toISOString();
    sentIds.current.add(tmpId);
    setMessages(prev => [...prev, { id: tmpId, senderId: adminId, text, timestamp: now }]);
    stompRef.current.publish({
      destination: `/app/chat_${chatId}`,
      body: JSON.stringify({ senderId: adminId, text }),
    });
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const displayName = userName || "Пользователь";

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: "linear-gradient(135deg,#5bb8f5,#3b82f6)" }}>
          {displayName[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">{displayName}</p>
          <p className="text-[10px] text-gray-400">Чат с пользователем</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Загрузка...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Нет сообщений. Начните диалог.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === adminId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-gray-400 mb-0.5 px-1">
                  {isMe ? "Вы (Администратор)" : displayName}
                </span>
                <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${isMe ? "text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm border border-gray-200"}`}
                  style={isMe ? { background: BLUE } : {}}>
                  {msg.text}
                  <span className={`text-[10px] ml-2 ${isMe ? "text-blue-100" : "text-gray-400"}`}>{fmtTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-white shrink-0">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Написать сообщение..."
          className="flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 bg-transparent" />
        <button onClick={handleSend} disabled={!input.trim()} style={{ color: BLUE, opacity: input.trim() ? 1 : 0.4 }}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ── moderation section ── */
type ModerationSubsection = "reports" | "chats";

function ModerationSection({ adminId }: { adminId: string }) {
  const [sub, setSub] = useState<ModerationSubsection>("reports");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REVIEWED" | "DISMISSED">("PENDING");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatUserName, setActiveChatUserName] = useState<string | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setReports(await api.getModerationReports()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? reports : reports.filter(r => r.status === filter);
  const pendingCount = reports.filter(r => r.status === "PENDING").length;

  const handleOpenChat = async (report: ModerationReport) => {
    setActionLoading(report.id);
    try {
      const updated = await api.openAdminChat(report.id);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      if (updated.adminChatId) {
        setActiveChatId(updated.adminChatId);
        setActiveChatUserName(updated.senderName);
        setSub("chats");
      }
    } catch {} finally { setActionLoading(null); }
  };

  const handleReview = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await api.reviewModerationReport(id);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {} finally { setActionLoading(null); }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await api.dismissModerationReport(id);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {} finally { setActionLoading(null); }
  };

  const handleBlock = async (report: ModerationReport) => {
    if (report.senderBlocked) return;
    setActionLoading(report.id + "_block");
    try {
      const updated = await api.blockUserFromReport(report.id);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {} finally { setActionLoading(null); }
  };

  // Chats with users from reports
  const adminChats = reports.filter(r => r.adminChatId).reduce<{ chatId: string; userName: string; reportId: string }[]>((acc, r) => {
    if (r.adminChatId && !acc.find(c => c.chatId === r.adminChatId)) {
      acc.push({ chatId: r.adminChatId, userName: r.senderName, reportId: r.id });
    }
    return acc;
  }, []);

  if (sub === "chats" && activeChatId) {
    return (
      <div className="space-y-4">
        <AdminUserChat chatId={activeChatId} adminId={adminId} userName={activeChatUserName} onBack={() => setActiveChatId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Sub-tabs — same style as user dashboard tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setSub("reports")}
            className="px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 shrink-0"
            style={sub === "reports" ? { color: BLUE, borderColor: BLUE, background: "white" } : { color: "#6b7280", borderColor: "transparent" }}>
            Заявки
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: sub === "reports" ? "#EFF6FF" : "#FEE2E2", color: sub === "reports" ? BLUE : "#EF4444" }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => { setSub("chats"); setActiveChatId(null); }}
            className="px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 shrink-0"
            style={sub === "chats" ? { color: BLUE, borderColor: BLUE, background: "white" } : { color: "#6b7280", borderColor: "transparent" }}>
            Чат с пользователем
            {adminChats.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: sub === "chats" ? "#EFF6FF" : "#F3F4F6", color: sub === "chats" ? BLUE : "#6b7280" }}>
                {adminChats.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {sub === "chats" ? (
        /* ── chats list ── */
        adminChats.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "#d1d5db" }} />
            <p className="text-gray-400 text-sm">Нет чатов с пользователями</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {adminChats.map(c => (
              <button key={c.chatId} onClick={() => { setActiveChatId(c.chatId); setActiveChatUserName(c.userName); }}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: "linear-gradient(135deg,#5bb8f5,#3b82f6)" }}>
                  {(c.userName || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.userName}</p>
                  <p className="text-[11px] text-gray-400">Нажмите, чтобы открыть</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        )
      ) : (
        /* ── reports list ── */
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["PENDING", "REVIEWED", "DISMISSED", "ALL"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={filter === f ? { background: BLUE, color: "white", border: `1px solid ${BLUE}` } : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                  {f === "PENDING" ? "Ожидают" : f === "REVIEWED" ? "Рассмотрены" : f === "DISMISSED" ? "Отклонены" : "Все"}
                </button>
              ))}
            </div>
            <button onClick={load} className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Обновить</button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400 text-sm">Загрузка...</p></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "#d1d5db" }} />
              <p className="text-gray-400 text-sm">Нет заявок</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(report => (
                <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      {report.senderAvatarUrl
                        ? <img src={report.senderAvatarUrl} alt={report.senderName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg,#5bb8f5,#3b82f6)" }}>
                          {(report.senderName || "?")[0].toUpperCase()}
                        </div>
                      }
                      <div>
                        <p className="text-xs font-bold text-gray-800">{report.senderName || "Неизвестный"}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          {report.senderEmail && <p className="text-[10px] text-gray-400">{report.senderEmail}</p>}
                          {report.senderPhone && <p className="text-[10px] text-gray-400">• {report.senderPhone}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {report.senderBlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEE2E2", color: "#EF4444" }}>
                          <XCircle className="w-3 h-3" /> Заблокирован
                        </span>
                      )}
                      {report.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF9C3", color: "#CA8A04" }}>
                          <Clock className="w-3 h-3" /> Ожидает
                        </span>
                      )}
                      {report.status === "REVIEWED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: GREEN }}>
                          <CheckCircle className="w-3 h-3" /> Рассмотрено
                        </span>
                      )}
                      {report.status === "DISMISSED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#F3F4F6", color: "#6B7280" }}>
                          <XCircle className="w-3 h-3" /> Отклонено
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {/* Violations */}
                    <div className="flex flex-wrap gap-1.5">
                      {report.violations.split(",").filter(Boolean).map(v => (
                        <ViolationBadge key={v} code={v.trim()} />
                      ))}
                    </div>

                    {/* Message */}
                    <div className="px-4 py-3 rounded-xl border-l-4 bg-gray-50" style={{ borderColor: "#EF4444" }}>
                      <p className="text-[10px] text-gray-400 mb-1">Сообщение пользователя:</p>
                      <p className="text-xs text-gray-800 leading-relaxed">{report.messageText}</p>
                    </div>

                    {/* Explanation */}
                    {report.explanation && (
                      <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Анализ ИИ:</p>
                        <p className="text-xs text-amber-800 leading-relaxed">{report.explanation}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {report.status === "PENDING" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => handleOpenChat(report)}
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: BLUE }}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          {report.adminChatId ? "Открыть чат" : "Чат с пользователем"}
                        </button>
                        <button
                          onClick={() => handleBlock(report)}
                          disabled={report.senderBlocked || actionLoading === report.id + "_block"}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: report.senderBlocked ? "#9CA3AF" : "#EF4444" }}>
                          <XCircle className="w-3.5 h-3.5" />
                          {report.senderBlocked ? "Заблокирован" : "Заблокировать"}
                        </button>
                        <button
                          onClick={() => handleReview(report.id)}
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors hover:bg-green-50 disabled:opacity-50"
                          style={{ color: GREEN, borderColor: "#BBF7D0" }}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Рассмотрено
                        </button>
                        <button
                          onClick={() => handleDismiss(report.id)}
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors hover:bg-gray-50 disabled:opacity-50"
                          style={{ color: "#6B7280", borderColor: "#e5e7eb" }}>
                          <XCircle className="w-3.5 h-3.5" />
                          Ложное срабатывание
                        </button>
                      </div>
                    )}
                    {report.status === "REVIEWED" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.adminChatId && (
                          <button
                            onClick={() => { setActiveChatId(report.adminChatId!); setActiveChatUserName(report.senderName); setSub("chats"); }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors hover:bg-blue-50"
                            style={{ color: BLUE, borderColor: "#BFDBFE" }}>
                            <MessageSquare className="w-3.5 h-3.5" /> Открыть чат
                          </button>
                        )}
                        <button
                          onClick={() => handleBlock(report)}
                          disabled={report.senderBlocked || actionLoading === report.id + "_block"}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: report.senderBlocked ? "#9CA3AF" : "#EF4444" }}>
                          <XCircle className="w-3.5 h-3.5" />
                          {report.senderBlocked ? "Заблокирован" : "Заблокировать"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── main admin page ── */
export default function AdminPage() {
  const { currentUser, logout } = useAuth();
  const [, navigate] = useLocation();
  const [section, setSection] = useState<AdminSection>("verification");

  useEffect(() => {
    if (!currentUser) { navigate("/auth"); return; }
    if (currentUser.role !== "admin") { navigate("/dashboard"); }
  }, [currentUser]);

  if (!currentUser || currentUser.role !== "admin") return null;

  const navItems: { key: AdminSection; label: string; Icon: React.ElementType }[] = [
    { key: "verification", label: "Верификация документов", Icon: ShieldCheck },
    { key: "statistics", label: "Статистика платформы", Icon: BarChart2 },
    { key: "moderation", label: "Модераторство", Icon: Gavel },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
      {/* Sidebar — same style as user dashboard */}
      <aside className="w-56 min-h-screen bg-gray-50 flex flex-col shrink-0 border-r border-gray-100">
        {/* User card */}
        <div className="px-3 pt-4 pb-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 py-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }}>
                А
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">Администратор</p>
              </div>
            </div>
            <div className="border-t border-gray-100 mx-3" />
            <div className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] text-gray-400 shrink-0">Роль</span>
                <span className="text-[10px] text-gray-800 font-medium text-right">Администратор</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] text-gray-400 shrink-0">Email</span>
                <span className="text-[10px] text-gray-800 font-medium text-right break-all">adminbeks@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 flex flex-col gap-1">
          {navItems.map(({ key, label, Icon }) => {
            const active = section === key;
            return (
              <button key={key} onClick={() => setSection(key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border"
                style={active
                  ? { background: BLUE, color: "white", borderColor: BLUE }
                  : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? "white" : "#9ca3af" }} />
                <span className="flex-1 leading-tight">{label}</span>
                <ChevronRight className="w-3 h-3 shrink-0" style={{ color: active ? "rgba(255,255,255,0.65)" : "#d1d5db" }} />
              </button>
            );
          })}
          <button onClick={() => { logout(); navigate("/auth"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border border-transparent hover:bg-red-50"
            style={{ color: "#EF4444" }}>
            <LogOut className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />
            <span className="flex-1 leading-tight">Выйти</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar with tab title */}
        <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-2">
          {navItems.find(n => n.key === section) && (() => {
            const { Icon, label } = navItems.find(n => n.key === section)!;
            return (
              <>
                <Icon className="w-4 h-4" style={{ color: BLUE }} />
                <h1 className="text-sm font-bold text-gray-800">{label}</h1>
              </>
            );
          })()}
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6">
          {section === "verification" && <VerificationSection />}
          {section === "statistics" && <StatisticsSection />}
          {section === "moderation" && <ModerationSection adminId={currentUser.id} />}
        </div>
      </main>
    </div>
  );
}
