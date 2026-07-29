"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BellRing,
  Boxes,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutGrid,
  LogOut,
  Maximize,
  MessageSquareText,
  Minimize,
  Moon,
  Package,
  Palette,
  Percent,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  TicketPercent,
  Truck,
  UserRound,
  Users,
  Wrench,
  LayoutDashboard,
} from "lucide-react";

import { logout } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export type AdminNavKey =
  | "dashboard"
  | "users"
  | "roles"
  | "categories"
  | "products"
  | "brands"
  | "attributes"
  | "profile"
  | "shop"
  | "tax"
  | "invoice"
  | "coupons"
  | "coupon-usages"
  | "theme"
  | "inventory"
  | "orders"
  | "customers"
  | "shipments"
  | "exceptions"
  | "notifications"
  | "reports"
  | "reviews";

const SIDEBAR_PIN_KEY = "valaiyagam_sidebar_pinned";

const ECOMMERCE_KEYS: AdminNavKey[] = [
  "products",
  "categories",
  "brands",
  "attributes",
];

const OPERATIONS_KEYS: AdminNavKey[] = [
  "inventory",
  "orders",
  "customers",
  "shipments",
  "exceptions",
  "reviews",
  "notifications",
  "reports",
];

const SETTINGS_KEYS: AdminNavKey[] = [
  "profile",
  "shop",
  "tax",
  "invoice",
  "coupons",
  "coupon-usages",
  "theme",
];

function navHref(key: AdminNavKey) {
  return `/?tab=${key}`;
}

type AdminNavContextValue = {
  goToTab: (key: AdminNavKey) => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function AdminNavProvider({
  children,
  onTabChange,
}: {
  children: React.ReactNode;
  activeTab?: AdminNavKey;
  onTabChange: (key: AdminNavKey) => void;
}) {
  const router = useRouter();
  const value = useMemo<AdminNavContextValue>(
    () => ({
      goToTab: (key) => {
        onTabChange(key);
        router.push(navHref(key), { scroll: false });
      },
    }),
    [onTabChange, router],
  );

  return (
    <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>
  );
}

export function useAdminTabState(defaultTab: AdminNavKey = "dashboard") {
  const urlTab = useAdminTabParam(defaultTab);
  const [tab, setTab] = useState<AdminNavKey>(urlTab);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  return { tab, setTab };
}

function initials(name?: string | null) {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "A";
}

export function AdminShell({
  children,
  title,
  breadcrumbs,
  activeNav,
}: {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  activeNav: AdminNavKey;
}) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const pathname = usePathname();
  const [pinned, setPinned] = useState(true);
  const [pinnedReady, setPinnedReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [ecommerceOpen, setEcommerceOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const expanded = pinned || hovered;
  const mini = !pinned;

  const isProductsSection =
    activeNav === "products" || pathname.startsWith("/products");
  const isEcommerceActive =
    isProductsSection || ECOMMERCE_KEYS.includes(activeNav);
  const isOperationsActive = OPERATIONS_KEYS.includes(activeNav);
  const isSettingsActive = SETTINGS_KEYS.includes(activeNav);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_PIN_KEY);
    if (saved === "0") setPinned(false);
    if (saved === "1") setPinned(true);
    setPinnedReady(true);
  }, []);

  useEffect(() => {
    if (!pinnedReady) return;
    localStorage.setItem(SIDEBAR_PIN_KEY, pinned ? "1" : "0");
  }, [pinned, pinnedReady]);

  useEffect(() => {
    if (isEcommerceActive) setEcommerceOpen(true);
  }, [isEcommerceActive]);

  useEffect(() => {
    if (isOperationsActive) setOperationsOpen(true);
  }, [isOperationsActive]);

  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
  }, [isSettingsActive]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function tabHref(key: AdminNavKey) {
    return navHref(key);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser may block fullscreen without gesture/permission.
    }
  }

  const crumbs = useMemo(
    () =>
      breadcrumbs ?? [
        { label: "Admin", href: "/" },
        { label: title },
      ],
    [breadcrumbs, title],
  );

  const sidebarWidth = expanded ? "w-[250px]" : "w-[70px]";
  const contentPad = pinned ? "lg:pl-[250px]" : "lg:pl-[70px]";
  const contentOffset = pinned ? "250px" : "70px";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside
        className={`vz-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col transition-[width] duration-200 lg:flex ${sidebarWidth} ${
          mini && expanded ? "shadow-[8px_0_24px_rgba(0,0,0,0.08)]" : ""
        }`}
        onMouseEnter={() => {
          if (!pinned) setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`relative flex h-[70px] items-center border-b border-[var(--card-border)] ${
            expanded ? "gap-3 px-3" : "justify-center px-2"
          }`}
        >
          <Link
            href="/?tab=dashboard"
            className={`flex min-w-0 items-center ${
              expanded ? "gap-2.5" : "justify-center"
            }`}
            title="Classic Way"
          >
            <span className="brand-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.jpeg" alt="Classic Way logo" />
            </span>
            {expanded && <span className="brand-title-text">Classic Way</span>}
          </Link>

          <button
            type="button"
            onClick={() => {
              setPinned((value) => !value);
              setHovered(false);
            }}
            className={`sidebar-pin absolute right-3 top-1/2 -translate-y-1/2 ${
              pinned ? "sidebar-pin-active" : ""
            } ${expanded ? "" : "hidden"}`}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar expanded"}
            title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
          >
            {pinned ? <span className="sidebar-pin-dot" /> : null}
          </button>
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto py-3">
          {expanded && <p className="nav-group-label">Administration</p>}

          <NavButton
            active={activeNav === "dashboard"}
            collapsed={!expanded}
            href={tabHref("dashboard")}
            icon={<LayoutDashboard size={16} />}
            label="Dashboard"
          />
          <NavButton
            active={activeNav === "users"}
            collapsed={!expanded}
            href={tabHref("users")}
            icon={<Users size={16} />}
            label="Users"
          />
          <NavButton
            active={activeNav === "roles"}
            collapsed={!expanded}
            href={tabHref("roles")}
            icon={<ShieldCheck size={16} />}
            label="Roles"
          />

          <GroupToggle
            expanded={expanded}
            open={ecommerceOpen}
            active={isEcommerceActive}
            label="Ecommerce"
            icon={<ShoppingBag size={14} />}
            onToggle={() => {
              if (!expanded) {
                setPinned(true);
                setEcommerceOpen(true);
              } else {
                setEcommerceOpen((open) => !open);
              }
            }}
          />
          {expanded && ecommerceOpen && (
            <div className="nav-group-panel">
              <NavButton
                active={
                  (isProductsSection && !pathname.startsWith("/products/")) ||
                  /^\/products\/\d+$/.test(pathname)
                }
                collapsed={false}
                href={tabHref("products")}
                icon={<Package size={15} />}
                label="Products"
                nested
              />
              <NavButton
                active={pathname === "/products/new"}
                collapsed={false}
                href="/products/new"
                icon={<Plus size={15} />}
                label="Create Product"
                nested
              />
              <NavButton
                active={activeNav === "categories"}
                collapsed={false}
                href={tabHref("categories")}
                icon={<FolderTree size={15} />}
                label="Categories"
                nested
              />
              <NavButton
                active={activeNav === "brands"}
                collapsed={false}
                href={tabHref("brands")}
                icon={<Award size={15} />}
                label="Brands"
                nested
              />
              <NavButton
                active={activeNav === "attributes"}
                collapsed={false}
                href={tabHref("attributes")}
                icon={<Settings2 size={15} />}
                label="Attributes"
                nested
              />
            </div>
          )}
          {!expanded && (
            <>
              <NavButton
                active={isProductsSection}
                collapsed
                href={tabHref("products")}
                icon={<Package size={16} />}
                label="Products"
              />
              <NavButton
                active={activeNav === "categories"}
                collapsed
                href={tabHref("categories")}
                icon={<FolderTree size={16} />}
                label="Categories"
              />
              <NavButton
                active={activeNav === "brands"}
                collapsed
                href={tabHref("brands")}
                icon={<Award size={16} />}
                label="Brands"
              />
              <NavButton
                active={activeNav === "attributes"}
                collapsed
                href={tabHref("attributes")}
                icon={<Settings2 size={16} />}
                label="Attributes"
              />
            </>
          )}

          <GroupToggle
            expanded={expanded}
            open={operationsOpen}
            active={isOperationsActive}
            label="Operations"
            icon={<Wrench size={14} />}
            onToggle={() => {
              if (!expanded) {
                setPinned(true);
                setOperationsOpen(true);
              } else {
                setOperationsOpen((open) => !open);
              }
            }}
          />
          {expanded && operationsOpen && (
            <div className="nav-group-panel">
              <NavButton
                active={activeNav === "inventory"}
                collapsed={false}
                href={tabHref("inventory")}
                icon={<Boxes size={15} />}
                label="Inventory"
                nested
              />
              <NavButton
                active={activeNav === "orders"}
                collapsed={false}
                href={tabHref("orders")}
                icon={<ClipboardList size={15} />}
                label="Orders"
                nested
              />
              <NavButton
                active={activeNav === "customers"}
                collapsed={false}
                href={tabHref("customers")}
                icon={<Users size={15} />}
                label="Customers"
                nested
              />
              <NavButton
                active={activeNav === "shipments"}
                collapsed={false}
                href={tabHref("shipments")}
                icon={<Truck size={15} />}
                label="Shipments"
                nested
              />
              <NavButton
                active={activeNav === "exceptions"}
                collapsed={false}
                href={tabHref("exceptions")}
                icon={<AlertTriangle size={15} />}
                label="Exceptions"
                nested
              />
              <NavButton
                active={activeNav === "reviews"}
                collapsed={false}
                href={tabHref("reviews")}
                icon={<MessageSquareText size={15} />}
                label="Reviews"
                nested
              />
              <NavButton
                active={activeNav === "notifications"}
                collapsed={false}
                href={tabHref("notifications")}
                icon={<BellRing size={15} />}
                label="Notifications"
                nested
              />
              <NavButton
                active={activeNav === "reports"}
                collapsed={false}
                href={tabHref("reports")}
                icon={<BarChart3 size={15} />}
                label="Reports"
                nested
              />
            </div>
          )}
          {!expanded && (
            <>
              <NavButton
                active={activeNav === "inventory"}
                collapsed
                href={tabHref("inventory")}
                icon={<Boxes size={16} />}
                label="Inventory"
              />
              <NavButton
                active={activeNav === "orders"}
                collapsed
                href={tabHref("orders")}
                icon={<ClipboardList size={16} />}
                label="Orders"
              />
              <NavButton
                active={activeNav === "customers"}
                collapsed
                href={tabHref("customers")}
                icon={<Users size={16} />}
                label="Customers"
              />
              <NavButton
                active={activeNav === "shipments"}
                collapsed
                href={tabHref("shipments")}
                icon={<Truck size={16} />}
                label="Shipments"
              />
              <NavButton
                active={activeNav === "exceptions"}
                collapsed
                href={tabHref("exceptions")}
                icon={<AlertTriangle size={16} />}
                label="Exceptions"
              />
              <NavButton
                active={activeNav === "reviews"}
                collapsed
                href={tabHref("reviews")}
                icon={<MessageSquareText size={16} />}
                label="Reviews"
              />
              <NavButton
                active={activeNav === "notifications"}
                collapsed
                href={tabHref("notifications")}
                icon={<BellRing size={16} />}
                label="Notifications"
              />
              <NavButton
                active={activeNav === "reports"}
                collapsed
                href={tabHref("reports")}
                icon={<BarChart3 size={16} />}
                label="Reports"
              />
            </>
          )}

          <GroupToggle
            expanded={expanded}
            open={settingsOpen}
            active={isSettingsActive}
            label="Settings"
            icon={<Settings2 size={14} />}
            onToggle={() => {
              if (!expanded) {
                setPinned(true);
                setSettingsOpen(true);
              } else {
                setSettingsOpen((open) => !open);
              }
            }}
          />
          {expanded && settingsOpen && (
            <div className="nav-group-panel">
              <NavButton
                active={activeNav === "profile"}
                collapsed={false}
                href={tabHref("profile")}
                icon={<UserRound size={15} />}
                label="Profile settings"
                nested
              />
              <NavButton
                active={activeNav === "shop"}
                collapsed={false}
                href={tabHref("shop")}
                icon={<Store size={15} />}
                label="Our shop details"
                nested
              />
              <NavButton
                active={activeNav === "tax"}
                collapsed={false}
                href={tabHref("tax")}
                icon={<Percent size={15} />}
                label="Tax"
                nested
              />
              <NavButton
                active={activeNav === "invoice"}
                collapsed={false}
                href={tabHref("invoice")}
                icon={<FileText size={15} />}
                label="Invoice"
                nested
              />
              <NavButton
                active={activeNav === "coupons"}
                collapsed={false}
                href={tabHref("coupons")}
                icon={<TicketPercent size={15} />}
                label="Coupons"
                nested
              />
              <NavButton
                active={activeNav === "coupon-usages"}
                collapsed={false}
                href={tabHref("coupon-usages")}
                icon={<TicketPercent size={15} />}
                label="Coupon usages"
                nested
              />
              <NavButton
                active={activeNav === "theme"}
                collapsed={false}
                href={tabHref("theme")}
                icon={<Palette size={15} />}
                label="Theme Settings"
                nested
              />
            </div>
          )}
          {!expanded && (
            <>
              <NavButton
                active={activeNav === "profile"}
                collapsed
                href={tabHref("profile")}
                icon={<UserRound size={16} />}
                label="Profile settings"
              />
              <NavButton
                active={activeNav === "shop"}
                collapsed
                href={tabHref("shop")}
                icon={<Store size={16} />}
                label="Our shop details"
              />
              <NavButton
                active={activeNav === "tax"}
                collapsed
                href={tabHref("tax")}
                icon={<Percent size={16} />}
                label="Tax"
              />
              <NavButton
                active={activeNav === "invoice"}
                collapsed
                href={tabHref("invoice")}
                icon={<FileText size={16} />}
                label="Invoice"
              />
              <NavButton
                active={activeNav === "coupons"}
                collapsed
                href={tabHref("coupons")}
                icon={<TicketPercent size={16} />}
                label="Coupons"
              />
              <NavButton
                active={activeNav === "coupon-usages"}
                collapsed
                href={tabHref("coupon-usages")}
                icon={<TicketPercent size={16} />}
                label="Coupon usages"
              />
              <NavButton
                active={activeNav === "theme"}
                collapsed
                href={tabHref("theme")}
                icon={<Palette size={16} />}
                label="Theme Settings"
              />
            </>
          )}
        </nav>

        <div className="border-t border-[var(--card-border)] p-3">
          <button
            onClick={() => dispatch(logout())}
            className={`flex w-full items-center gap-2 px-2 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[#f3f6f9] hover:text-[var(--foreground)] ${
              !expanded ? "justify-center" : ""
            }`}
            title="Sign out"
          >
            <LogOut size={15} />
            {expanded && "Sign out"}
          </button>
        </div>
      </aside>

      <div
        className={`transition-[padding] duration-200 ${contentPad}`}
        style={{ ["--content-offset" as string]: contentOffset }}
      >
        <header className="vz-topbar sticky top-0 z-20">
          <div className="w-full max-w-sm">
            <input
              className="form-input bg-[#f3f3f9]"
              placeholder="Search..."
              aria-label="Search"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <HeaderIconButton label="Layout">
              <LayoutGrid size={17} />
            </HeaderIconButton>
            <HeaderIconButton
              label="Toggle fullscreen"
              onClick={() => void toggleFullscreen()}
              badge="5"
              badgeTone="blue"
            >
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </HeaderIconButton>
            <HeaderIconButton label="Theme" className="theme-icon-button">
              <Moon size={17} />
            </HeaderIconButton>
            <HeaderIconButton label="Notifications" badge="1" badgeTone="orange">
              <Bell size={17} />
            </HeaderIconButton>

            <div className="relative ml-1" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 p-1.5"
                aria-label="Profile menu"
              >
                <span className="avatar-circle grid size-8 place-items-center bg-[var(--theme-green)] text-xs font-bold text-white">
                  {initials(currentUser?.full_name)}
                </span>
                <span className="hidden pr-1 text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight">
                    {currentUser?.full_name ?? "Admin"}
                  </span>
                  <span className="block text-xs text-[var(--muted)]">
                    Administrator
                  </span>
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 border border-[var(--card-border)] bg-white p-2 shadow-sm">
                  <p className="truncate px-2 py-1 text-xs text-[var(--muted)]">
                    {currentUser?.email}
                  </p>
                  <Link
                    href="/?tab=profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 px-2 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--theme-green-soft)] hover:text-[var(--theme-green-hover)]"
                  >
                    <UserRound size={15} /> Profile
                  </Link>
                  <Link
                    href="/?tab=shop"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 px-2 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--theme-green-soft)] hover:text-[var(--theme-green-hover)]"
                  >
                    <Settings2 size={15} /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      dispatch(logout());
                    }}
                    className="flex w-full items-center gap-2 px-2 py-2 text-sm font-medium text-[#f06548] hover:bg-[#fef4f2]"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeNav !== "dashboard" && (
          <div className="vz-page-title-box sticky top-[70px] z-10">
            <h1 className="vz-page-title">{title}</h1>
            <ol className="vz-breadcrumb">
              {crumbs.map((crumb, index) => (
                <li
                  key={`${crumb.label}-${index}`}
                  className="flex items-center gap-2"
                >
                  {index > 0 && <span className="vz-breadcrumb-sep">›</span>}
                  {crumb.href ? (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  ) : (
                    <span className="text-[var(--foreground)]">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        <main
          className={`px-4 pb-28 sm:px-6 ${
            activeNav === "dashboard" ? "py-5 pt-6" : "py-5"
          }`}
        >
          <div key={activeNav}>{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--card-border)] bg-white lg:hidden">
        <MobileNav active={activeNav === "dashboard"} href={tabHref("dashboard")}>
          <LayoutDashboard size={16} /> Home
        </MobileNav>
        <MobileNav active={isProductsSection} href={tabHref("products")}>
          <Package size={16} /> Products
        </MobileNav>
        <MobileNav active={activeNav === "orders"} href={tabHref("orders")}>
          <ClipboardList size={16} /> Orders
        </MobileNav>
        <MobileNav active={isSettingsActive} href={tabHref("profile")}>
          <Settings2 size={16} /> Settings
        </MobileNav>
        <MobileNav active={activeNav === "reports"} href={tabHref("reports")}>
          <BarChart3 size={16} /> Reports
        </MobileNav>
      </nav>
    </div>
  );
}

function HeaderIconButton({
  children,
  label,
  onClick,
  badge,
  badgeTone = "orange",
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
  badgeTone?: "orange" | "blue";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative hidden p-2 text-[var(--muted)] hover:text-[var(--primary)] sm:inline-flex ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
      {badge ? (
        <span
          className={`absolute -right-0.5 -top-0.5 grid size-4 place-items-center text-[9px] font-bold text-white ${
            badgeTone === "blue" ? "bg-[#3577f1]" : "bg-[#f06548]"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function GroupToggle({
  expanded,
  open,
  active,
  label,
  icon,
  onToggle,
}: {
  expanded: boolean;
  open: boolean;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`nav-group-toggle ${active ? "nav-group-toggle-active" : ""} ${
        !expanded ? "justify-center px-0" : ""
      }`}
      title={label}
    >
      {icon}
      {expanded && (
        <>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            size={14}
            className={`transition ${open ? "rotate-180" : ""}`}
          />
        </>
      )}
    </button>
  );
}

function tabKeyFromHref(href: string): AdminNavKey | null {
  if (!href.startsWith("/?tab=")) return null;
  const tab = href.slice("/?tab=".length).split("&")[0];
  const known: AdminNavKey[] = [
    "dashboard",
    "users",
    "roles",
    "categories",
    "products",
    "brands",
    "attributes",
    "profile",
    "shop",
    "tax",
    "invoice",
    "coupons",
    "coupon-usages",
    "theme",
    "inventory",
    "orders",
    "customers",
    "shipments",
    "exceptions",
    "reviews",
    "notifications",
    "reports",
  ];
  return known.includes(tab as AdminNavKey) ? (tab as AdminNavKey) : null;
}

function NavButton({
  active,
  href,
  icon,
  label,
  navKey,
  collapsed = false,
  nested = false,
}: {
  active: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
  navKey?: AdminNavKey;
  collapsed?: boolean;
  nested?: boolean;
}) {
  const router = useRouter();
  const nav = useContext(AdminNavContext);
  const resolvedKey = navKey ?? tabKeyFromHref(href);

  return (
    <Link
      href={href}
      title={label}
      prefetch={false}
      scroll={false}
      onClick={(event) => {
        if (resolvedKey && nav) {
          event.preventDefault();
          nav.goToTab(resolvedKey);
          return;
        }
        if (href.startsWith("/?")) {
          event.preventDefault();
          router.push(href, { scroll: false });
        }
      }}
      className={`nav-item ${nested ? "nav-item-nested" : ""} ${
        active ? "nav-item-active" : "nav-item-idle"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function MobileNav({
  active,
  href,
  navKey,
  children,
}: {
  active: boolean;
  href: string;
  navKey?: AdminNavKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const nav = useContext(AdminNavContext);
  const resolvedKey = navKey ?? tabKeyFromHref(href);

  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        if (resolvedKey && nav) {
          event.preventDefault();
          nav.goToTab(resolvedKey);
          return;
        }
        if (href.startsWith("/?")) {
          event.preventDefault();
          router.push(href, { scroll: false });
        }
      }}
      className={`flex flex-col items-center gap-1 px-1 py-3 text-[10px] font-semibold ${
        active
          ? "bg-[var(--theme-green)] text-white"
          : "text-[var(--muted)]"
      }`}
    >
      {children}
    </Link>
  );
}

export function useAdminTabParam(defaultTab: AdminNavKey = "dashboard"): AdminNavKey {
  const params = useSearchParams();
  const tab = params.get("tab");
  if (
    tab === "dashboard" ||
    tab === "roles" ||
    tab === "categories" ||
    tab === "products" ||
    tab === "brands" ||
    tab === "attributes" ||
    tab === "users" ||
    tab === "profile" ||
    tab === "shop" ||
    tab === "tax" ||
    tab === "invoice" ||
    tab === "coupons" ||
    tab === "coupon-usages" ||
    tab === "theme" ||
    tab === "inventory" ||
    tab === "orders" ||
    tab === "customers" ||
    tab === "shipments" ||
    tab === "exceptions" ||
    tab === "reviews" ||
    tab === "notifications" ||
    tab === "reports"
  ) {
    return tab;
  }
  return defaultTab;
}
