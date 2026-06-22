import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useT } from '../utils/translate';
import { usePermissions } from '../utils/permissions';
import { mediaUrl } from '../utils/media';
import { fetchFunnels } from '../store/funnelSlice';
import {
  Building2, LayoutDashboard, Users, Kanban, CheckSquare2, MessageSquare, Phone,
  X, ChevronRight, ChevronDown,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

export const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Bosh sahifa' },
  { key: 'contacts',  icon: Users,           label: 'Kontaktlar'  },
  { key: 'tasks',     icon: CheckSquare2,    label: 'Vazifalar'   },
  { key: 'inbox',     icon: MessageSquare,   label: 'Inbox'       },
  { key: 'calls',     icon: Phone,           label: "Qo'ng'iroqlar" },
];

function NavList({ active, onNavigate, mobile = false, onCloseMobile, collapsed = false, onToggleCollapse }) {
  const t = useT();
  const dispatch = useDispatch();
  const { canSeeModule } = usePermissions();
  const [openGroups, setOpenGroups] = useState([]);

  const org      = useSelector((s) => s.auth.user?.organization);
  const isAuthed = useSelector((s) => s.auth.isAuthenticated);
  const funnels  = useSelector((s) => s.funnels.list);
  const fLoaded  = useSelector((s) => s.funnels.loaded);
  const brandName = org?.name || 'CRM Line';

  useEffect(() => {
    if (isAuthed && !fLoaded) dispatch(fetchFunnels());
  }, [isAuthed, fLoaded, dispatch]);

  const navItems = NAV_ITEMS
    .filter(i => canSeeModule(i.key))
    .map(i => i.children
      ? { ...i, children: i.children.filter(c => canSeeModule(c.key)) }
      : i)
    .filter(i => !i.children || i.children.length > 0);

  const toggleGroup = (key) =>
    setOpenGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  useEffect(() => {
    const parent = NAV_ITEMS.find(i => i.children?.some(c => c.key === active));
    if (parent) setOpenGroups(prev => (prev.includes(parent.key) ? prev : [...prev, parent.key]));
  }, [active]);

  const go = (key) => { onNavigate?.(key); if (mobile) onCloseMobile?.(); };

  const renderNavItem = (item) => {
    if (item.children) {
      const isOpen = openGroups.includes(item.key);
      const hasActive = item.children.some(c => c.key === active);
      if (collapsed) {
        return (
          <div key={item.key} className="relative group">
            <button
              title={item.label}
              className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                hasActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className="w-5 h-5" />
            </button>
            <div className="absolute left-full top-0 pl-2 z-50 hidden group-hover:block">
              <div className="bg-primary-800 border border-white/10 rounded-lg shadow-modal py-2 min-w-[190px]">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-white/40 uppercase tracking-wide">{item.label}</div>
                {item.children.map(child => {
                  const isActive = active === child.key;
                  return (
                    <button
                      key={child.key}
                      onClick={() => go(child.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <child.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left whitespace-nowrap">{child.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleGroup(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
              {item.children.map(child => {
                const isActive = active === child.key;
                return (
                  <button
                    key={child.key}
                    onClick={() => go(child.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <child.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">{child.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 text-white/40" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = active === item.key;
    if (collapsed) {
      return (
        <button
          key={item.key}
          onClick={() => go(item.key)}
          title={item.label}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors ${
            isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <item.icon className="w-5 h-5" />
        </button>
      );
    }
    return (
      <button
        key={item.key}
        onClick={() => go(item.key)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
      </button>
    );
  };

  return (
    <div className={`flex flex-col h-full ${collapsed ? 'px-2 py-4' : 'p-4'}`}>
      {/* Logo + collapse toggle */}
      <div className={`flex items-center mb-6 ${collapsed ? 'flex-col gap-3' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
            {org?.logo
              ? <img src={mediaUrl(org.logo)} alt={brandName} className="w-full h-full object-cover" />
              : <Building2 className="w-4 h-4 text-white" />}
          </div>
          {!collapsed && <span className="font-bold text-white text-base truncate">{brandName}</span>}
        </div>
        {mobile ? (
          <button onClick={onCloseMobile}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={onToggleCollapse}
            title={collapsed ? 'Yoyish' : "Yig'ish"}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5">
        {navItems.map(renderNavItem)}

        {/* Varonkalar — faqat mavjud bo'lsa ko'rinadi */}
        {funnels.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Varonkalar</span>
              </div>
            )}
            {funnels.map((funnel) => {
              const key = `funnel-${funnel._id}`;
              const isActive = active === key;
              if (collapsed) {
                return (
                  <button
                    key={key}
                    onClick={() => go(key)}
                    title={funnel.name}
                    className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Kanban className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Kanban className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{funnel.name}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                </button>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

export default function Sidebar({ active, onNavigate, mobileOpen, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar.collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('sidebar.collapsed', next ? '1' : '0'); } catch {}
    return next;
  });

  return (
    <>
      <aside className={`hidden lg:block ${collapsed ? 'w-16' : 'w-60'} bg-primary-800 shrink-0 transition-[width] duration-200`}>
        <NavList active={active} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="relative z-50 w-64 h-full bg-primary-800 shadow-modal">
            <NavList active={active} onNavigate={onNavigate} mobile onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
