"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Plus,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { ActionIconButtons } from "@/components/ActionIconButtons";
import {
  AdminNavProvider,
  AdminShell,
  useAdminTabState,
} from "@/components/AdminShell";
import { AttributesPanel } from "@/components/AttributesPanel";
import { BrandsPanel } from "@/components/BrandsPanel";
import { CategoriesPanel } from "@/components/CategoriesPanel";
import { CouponsPanel } from "@/components/CouponsPanel";
import { CouponUsagesPanel } from "@/components/CouponUsagesPanel";
import { CustomersPanel } from "@/components/CustomersPanel";
import { DashboardPanel } from "@/components/DashboardPanel";
import {
  FilterSelect,
  SelectTd,
  SelectTh,
  SelectionBar,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { ExceptionsPanel } from "@/components/ExceptionsPanel";
import { InventoryPanel } from "@/components/InventoryPanel";
import { InvoiceSettingsPanel } from "@/components/InvoiceSettingsPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { OrdersPanel } from "@/components/OrdersPanel";
import { ProductsPanel } from "@/components/ProductsPanel";
import { ProfileSettingsPanel } from "@/components/ProfileSettingsPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { ShipmentsPanel } from "@/components/ShipmentsPanel";
import { ShopDetailsPanel } from "@/components/ShopDetailsPanel";
import { StatusPill } from "@/components/StatusPill";
import { TaxRulesPanel } from "@/components/TaxRulesPanel";
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Role, User } from "@/lib/types";
import type { RootState } from "@/store";
import {
  createRole,
  deleteRole,
  fetchRoles,
  updateRole,
} from "@/store/rolesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDefaultTheme } from "@/store/themeSettingsSlice";
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from "@/store/usersSlice";

import { ConfirmDialog, Modal } from "./Modal";

const protectedRoles = new Set(["admin", "manager", "viewer"]);

function isProtectedRole(name: string) {
  return protectedRoles.has(name.trim().toLowerCase());
}

const tabMeta = {
  dashboard: {
    title: "Dashboard",
    breadcrumbs: [
      { label: "Admin", href: "/?tab=dashboard" },
      { label: "Dashboard" },
    ],
  },
  users: {
    title: "Users",
    breadcrumbs: [
      { label: "Admin", href: "/?tab=dashboard" },
      { label: "Users" },
    ],
  },
  roles: {
    title: "Roles",
    breadcrumbs: [
      { label: "Admin", href: "/?tab=dashboard" },
      { label: "Roles" },
    ],
  },
  categories: {
    title: "Categories",
    breadcrumbs: [
      { label: "Ecommerce", href: "/?tab=products" },
      { label: "Categories" },
    ],
  },
  products: {
    title: "Products",
    breadcrumbs: [
      { label: "Ecommerce", href: "/?tab=products" },
      { label: "Products" },
    ],
  },
  attributes: {
    title: "Attributes",
    breadcrumbs: [
      { label: "Ecommerce", href: "/?tab=products" },
      { label: "Attributes" },
    ],
  },
  brands: {
    title: "Brands",
    breadcrumbs: [
      { label: "Ecommerce", href: "/?tab=products" },
      { label: "Brands" },
    ],
  },
  profile: {
    title: "Profile settings",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Profile" },
    ],
  },
  shop: {
    title: "Our shop details",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Shop" },
    ],
  },
  tax: {
    title: "Tax",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Tax" },
    ],
  },
  coupons: {
    title: "Coupons",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Coupons" },
    ],
  },
  "coupon-usages": {
    title: "Coupon usages",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Coupon usages" },
    ],
  },
  invoice: {
    title: "Invoice",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Invoice" },
    ],
  },
  theme: {
    title: "Theme Settings",
    breadcrumbs: [
      { label: "Settings", href: "/?tab=profile" },
      { label: "Theme Settings" },
    ],
  },
  inventory: {
    title: "Inventory",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Inventory" },
    ],
  },
  orders: {
    title: "Orders",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Orders" },
    ],
  },
  customers: {
    title: "Customers",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Customers" },
    ],
  },
  shipments: {
    title: "Shipments",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Shipments" },
    ],
  },
  exceptions: {
    title: "Exceptions",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Exceptions" },
    ],
  },
  reviews: {
    title: "Reviews",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Reviews" },
    ],
  },
  notifications: {
    title: "Notifications",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Notifications" },
    ],
  },
  reports: {
    title: "Reports",
    breadcrumbs: [
      { label: "Operations", href: "/?tab=inventory" },
      { label: "Reports" },
    ],
  },
} as const;

export function AdminDashboard() {
  const dispatch = useAppDispatch();
  const usersState = useAppSelector((state) => state.users);
  const rolesState = useAppSelector((state) => state.roles);
  const themeSettings = useAppSelector((state) => state.themeSettings);
  const currentUser = useAppSelector((state) => state.auth.user);
  const { tab, setTab } = useAdminTabState("dashboard");

  useEffect(() => {
    void dispatch(fetchUsers());
    void dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    if (tab === "theme" && !themeSettings.item && !themeSettings.loading) {
      void dispatch(fetchDefaultTheme());
    }
  }, [tab, themeSettings.item, themeSettings.loading, dispatch]);

  return (
    <AdminNavProvider onTabChange={setTab}>
      <AdminShell
        activeNav={tab}
        title={tabMeta[tab].title}
        breadcrumbs={[...tabMeta[tab].breadcrumbs]}
      >
        {tab === "dashboard" ? (
          <DashboardPanel userName={currentUser?.full_name} />
        ) : tab === "users" ? (
          <UsersPanel usersState={usersState} roles={rolesState.items} />
        ) : tab === "roles" ? (
          <RolesPanel />
        ) : tab === "categories" ? (
          <CategoriesPanel />
        ) : tab === "brands" ? (
          <BrandsPanel />
        ) : tab === "attributes" ? (
          <AttributesPanel />
        ) : tab === "profile" ? (
          <ProfileSettingsPanel />
        ) : tab === "shop" ? (
          <ShopDetailsPanel />
        ) : tab === "tax" ? (
          <TaxRulesPanel />
        ) : tab === "invoice" ? (
          <InvoiceSettingsPanel />
        ) : tab === "coupons" ? (
          <CouponsPanel />
        ) : tab === "coupon-usages" ? (
          <CouponUsagesPanel />
        ) : tab === "theme" ? (
          <ThemeSettingsPanel />
        ) : tab === "inventory" ? (
          <InventoryPanel />
        ) : tab === "orders" ? (
          <OrdersPanel />
        ) : tab === "customers" ? (
          <CustomersPanel />
        ) : tab === "shipments" ? (
          <ShipmentsPanel />
        ) : tab === "exceptions" ? (
          <ExceptionsPanel />
        ) : tab === "reviews" ? (
          <ReviewsPanel />
        ) : tab === "notifications" ? (
          <NotificationsPanel />
        ) : tab === "reports" ? (
          <ReportsPanel />
        ) : (
          <ProductsPanel />
        )}
      </AdminShell>
    </AdminNavProvider>
  );
}

function UsersPanel({
  usersState,
  roles,
}: {
  usersState: RootState["users"];
  roles: Role[];
}) {
  const dispatch = useAppDispatch();
  const [formUser, setFormUser] = useState<User | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const matchesSearch = useCallback((user: User, query: string) => {
    const haystack = [
      user.full_name,
      user.email,
      ...user.roles.map((role) => role.name),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }, []);

  const getSortValue = useCallback((user: User, key: "name" | "email" | "roles" | "status") => {
    switch (key) {
      case "name":
        return user.full_name;
      case "email":
        return user.email;
      case "roles":
        return user.roles.map((role) => role.name).join(", ");
      case "status":
        return user.is_active;
      default:
        return user.full_name;
    }
  }, []);

  const filteredByStatus = usersState.items.filter((user) => {
    if (statusFilter === "active") return user.is_active;
    if (statusFilter === "inactive") return !user.is_active;
    return true;
  });

  const table = useTableState<User, "name" | "email" | "roles" | "status">({
    rows: filteredByStatus,
    initialSort: { key: "name", direction: "asc" },
    getSortValue,
    matchesSearch,
  });

  const getUserId = useCallback((user: User) => user.id, []);
  const selection = useRowSelection(table.pageRows, getUserId);

  useEffect(() => {
    if (usersState.error) {
      toastError(dispatch, "Request failed", usersState.error);
    }
  }, [usersState.error, dispatch]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteUser(deleteTarget.id));
    setDeleting(false);
    if (deleteUser.fulfilled.match(result)) {
      toastSuccess(dispatch, "User deleted", `${deleteTarget.full_name} was removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(
        dispatch,
        "Could not delete user",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteUser(id));
      if (deleteUser.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Users deleted", `${ok} user(s) removed.`);
    } else {
      toastError(dispatch, "Could not delete users", "Please try again.");
    }
  }

  return (
    <>
      <section className="mb-5 grid w-full gap-4 sm:grid-cols-3">
        <Stat label="Total users" value={usersState.items.length} icon={<Users />} color="cyan" />
        <Stat
          label="Active users"
          value={usersState.items.filter((user) => user.is_active).length}
          icon={<UserRoundCheck />}
          color="emerald"
        />
        <Stat label="Available roles" value={roles.length} icon={<ShieldCheck />} color="violet" />
      </section>

      <section className="table-card">
        <PanelHeader
          title="User List"
          action={
            <button onClick={() => setFormUser("new")} className="primary-button">
              <Plus size={17} /> Create User
            </button>
          }
        />
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search..."
          filters={
            <>
              <FilterSelect
                aria-label="Status filter"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as "all" | "active" | "inactive");
                  table.setPage(1);
                }}
              >
                <option value="all">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </FilterSelect>
              <FilterSelect
                aria-label="Rows per page"
                value={String(table.pageSize)}
                onChange={(value) => table.setPageSize(Number(value))}
              >
                {table.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </FilterSelect>
            </>
          }
        />

        <SelectionBar
          count={selection.selectedCount}
          onClear={selection.clear}
          onDelete={() => setBulkDeleteOpen(true)}
          deleting={deleting}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SelectTh
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.togglePage}
                />
                <SortableTh
                  label="User"
                  sortKey="name"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Email"
                  sortKey="email"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Roles"
                  sortKey="roles"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Status"
                  sortKey="status"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="Action" align="right" />
              </tr>
            </thead>
            <tbody>
              {table.pageRows.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50/80"
                >
                  <SelectTd
                    checked={selection.isSelected(user.id)}
                    onChange={() => selection.toggleOne(user.id)}
                    label={`Select ${user.full_name}`}
                  />
                  <td className="px-4 py-3.5"><UserIdentity user={user} /></td>
                  <td className="px-4 py-3.5 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3.5"><RoleBadges roles={user.roles} /></td>
                  <td className="px-4 py-3.5"><StatusPill active={user.is_active} /></td>
                  <td className="px-4 py-3.5">
                    <ActionIconButtons
                      viewLabel={`View ${user.full_name}`}
                      editLabel={`Edit ${user.full_name}`}
                      deleteLabel={`Delete ${user.full_name}`}
                      onView={() => setFormUser(user)}
                      onEdit={() => setFormUser(user)}
                      onDelete={() => setDeleteTarget(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!usersState.loading && table.filteredCount === 0 && (
          <EmptyState
            message={
              usersState.items.length === 0
                ? "No users found. Create your first user."
                : "No users match your search or filters."
            }
          />
        )}

        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          filteredCount={table.filteredCount}
          pageSize={table.pageSize}
        />
      </section>

      <UserFormModal
        user={formUser}
        roles={roles}
        onClose={() => setFormUser(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        message={`This will permanently remove ${deleteTarget?.full_name ?? "this user"} and their role assignments. This action cannot be undone.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected users?"
        message={`This will permanently delete ${selection.selectedCount} selected user(s).`}
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function UserFormModal({
  user,
  roles,
  onClose,
}: {
  user: User | "new" | null;
  roles: Role[];
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = user !== null && user !== "new";
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    is_active: true,
    role_ids: [] as string[],
  });

  useEffect(() => {
    if (!user) return;
    setForm(
      user === "new"
        ? { full_name: "", email: "", password: "", is_active: true, role_ids: [] }
        : {
            full_name: user.full_name,
            email: user.email,
            password: "",
            is_active: user.is_active,
            role_ids: user.roles.map((role) => role.id),
          },
    );
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result =
      user === "new"
        ? await dispatch(
            createUser({
              full_name: form.full_name,
              email: form.email,
              password: form.password,
              role_ids: form.role_ids,
            }),
          )
        : user
          ? await dispatch(
              updateUser({
                id: user.id,
                changes: {
                  full_name: form.full_name,
                  is_active: form.is_active,
                  role_ids: form.role_ids,
                  ...(form.password ? { password: form.password } : {}),
                },
              }),
            )
          : null;
    setBusy(false);
    if (
      result &&
      (createUser.fulfilled.match(result) || updateUser.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "User updated" : "User created",
        editing
          ? `${form.full_name} was saved.`
          : `${form.full_name} was added.`,
      );
      onClose();
    } else if (result) {
      toastError(
        dispatch,
        editing ? "Could not update user" : "Could not create user",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      role_ids: current.role_ids.includes(roleId)
        ? current.role_ids.filter((id) => id !== roleId)
        : [...current.role_ids, roleId],
    }));
  }

  return (
    <Modal
      open={Boolean(user)}
      title={editing ? "Edit user" : "Create user"}
      description={editing ? "Update account details, status and access roles." : "Add a new administrator or team member."}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="form-input" required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
          </Field>
          <Field label="Email address">
            <input className="form-input disabled:bg-slate-100/70" type="email" required disabled={editing} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label={editing ? "New password (optional)" : "Password"}>
            <input className="form-input" type="password" required={!editing} minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          {editing && (
            <Field label="Account status">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`form-input flex items-center justify-between ${form.is_active ? "text-emerald-700" : "text-slate-500"}`}
              >
                {form.is_active ? "Active" : "Inactive"}
                <span className={`h-6 w-11 rounded-full p-1 transition ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <span className={`block size-4 rounded-full bg-white transition ${form.is_active ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </Field>
          )}
        </div>
        <Field label="Assigned roles" hint="Choose one or more roles. New users default to viewer when none is selected.">
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${form.role_ids.includes(role.id) ? "border-neutral-300 bg-neutral-100/80" : "border-slate-200 bg-white/60 hover:border-slate-300"}`}>
                <input type="checkbox" className="mt-1 form-checkbox" checked={form.role_ids.includes(role.id)} onChange={() => toggleRole(role.id)} />
                <span><span className="block text-sm font-semibold">{role.name}</span><span className="text-xs text-slate-500">{role.description || "No description"}</span></span>
              </label>
            ))}
          </div>
        </Field>
        <FormActions busy={busy} submitLabel={editing ? "Save changes" : "Create user"} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function RolesPanel() {
  const dispatch = useAppDispatch();
  const rolesState = useAppSelector((state) => state.roles);
  const [formRole, setFormRole] = useState<Role | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "system" | "custom">(
    "all",
  );

  const matchesSearch = useCallback((role: Role, query: string) => {
    return `${role.name} ${role.description ?? ""}`.toLowerCase().includes(query);
  }, []);

  const getSortValue = useCallback((role: Role, key: "name" | "description" | "type") => {
    switch (key) {
      case "name":
        return role.name;
      case "description":
        return role.description ?? "";
      case "type":
        return isProtectedRole(role.name) ? 0 : 1;
      default:
        return role.name;
    }
  }, []);

  const filteredByType = rolesState.items.filter((role) => {
    const isSystem = isProtectedRole(role.name);
    if (typeFilter === "system") return isSystem;
    if (typeFilter === "custom") return !isSystem;
    return true;
  });

  const table = useTableState<Role, "name" | "description" | "type">({
    rows: filteredByType,
    initialSort: { key: "name", direction: "asc" },
    getSortValue,
    matchesSearch,
    initialPageSize: 10,
  });

  const getRoleId = useCallback((role: Role) => role.id, []);
  const selection = useRowSelection(table.pageRows, getRoleId);

  useEffect(() => {
    void dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    if (rolesState.error) {
      toastError(dispatch, "Request failed", rolesState.error);
    }
  }, [rolesState.error, dispatch]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteRole(deleteTarget.id));
    setDeleting(false);
    if (deleteRole.fulfilled.match(result)) {
      toastSuccess(dispatch, "Role deleted", `${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(
        dispatch,
        "Could not delete role",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  async function confirmBulkDelete() {
    const ids = selection.selectedIds.filter((id) => {
      const role = rolesState.items.find((item) => item.id === id);
      return role && !isProtectedRole(role.name);
    });
    if (ids.length === 0) {
      toastError(dispatch, "Nothing to delete", "System roles cannot be deleted.");
      setBulkDeleteOpen(false);
      return;
    }
    setDeleting(true);
    let ok = 0;
    for (const id of ids) {
      const result = await dispatch(deleteRole(id));
      if (deleteRole.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Roles deleted", `${ok} role(s) removed.`);
    } else {
      toastError(dispatch, "Could not delete roles", "Please try again.");
    }
  }

  return (
    <>
      <section className="table-card">
        <PanelHeader
          title="Role List"
          action={
            <button onClick={() => setFormRole("new")} className="primary-button">
              <Plus size={17} /> Create Role
            </button>
          }
        />
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search..."
          filters={
            <>
              <FilterSelect
                aria-label="Role type filter"
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value as "all" | "system" | "custom");
                  table.setPage(1);
                }}
              >
                <option value="all">Type</option>
                <option value="system">System</option>
                <option value="custom">Custom</option>
              </FilterSelect>
              <FilterSelect
                aria-label="Rows per page"
                value={String(table.pageSize)}
                onChange={(value) => table.setPageSize(Number(value))}
              >
                {table.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </FilterSelect>
            </>
          }
        />

        <SelectionBar
          count={selection.selectedCount}
          onClear={selection.clear}
          onDelete={() => setBulkDeleteOpen(true)}
          deleting={deleting}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SelectTh
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.togglePage}
                />
                <SortableTh
                  label="Role"
                  sortKey="name"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Description"
                  sortKey="description"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Type"
                  sortKey="type"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="Action" align="right" />
              </tr>
            </thead>
            <tbody>
              {table.pageRows.map((role) => (
                <tr
                  key={role.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50/80"
                >
                  <SelectTd
                    checked={selection.isSelected(role.id)}
                    onChange={() => selection.toggleOne(role.id)}
                    label={`Select ${role.name}`}
                  />
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="avatar-circle grid size-9 place-items-center bg-[var(--theme-green-soft)] text-[var(--theme-green)]">
                        <ShieldCheck size={16} />
                      </span>
                      <p className="font-semibold capitalize">
                        {role.name.replaceAll("_", " ")}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {role.description || "No description provided."}
                  </td>
                  <td className="px-4 py-3.5">
                    {isProtectedRole(role.name) ? (
                      <StatusPill tone="warning" label="System" />
                    ) : (
                      <StatusPill tone="neutral" label="Custom" />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <ActionIconButtons
                      viewLabel={`View ${role.name}`}
                      editLabel={`Edit ${role.name}`}
                      deleteLabel={`Delete ${role.name}`}
                      onView={() => setFormRole(role)}
                      onEdit={() => setFormRole(role)}
                      onDelete={
                        isProtectedRole(role.name)
                          ? undefined
                          : () => setDeleteTarget(role)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!rolesState.loading && table.filteredCount === 0 && (
          <EmptyState
            message={
              rolesState.items.length === 0
                ? "No roles found."
                : "No roles match your search or filters."
            }
          />
        )}

        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          filteredCount={table.filteredCount}
          pageSize={table.pageSize}
        />
      </section>
      <RoleFormModal role={formRole} onClose={() => setFormRole(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete role?"
        message={`This will permanently delete the ${deleteTarget?.name ?? ""} role. Roles assigned to users must be removed first.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected roles?"
        message={`This will permanently delete ${selection.selectedCount} selected role(s). System roles are skipped.`}
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function RoleFormModal({ role, onClose }: { role: Role | "new" | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const editing = role !== null && role !== "new";
  const protectedRole = editing && isProtectedRole(role.name);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!role) return;
    setName(role === "new" ? "" : role.name);
    setDescription(role === "new" ? "" : role.description || "");
  }, [role]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result =
      role === "new"
        ? await dispatch(createRole({ name, description }))
        : role
          ? await dispatch(updateRole({ id: role.id, changes: { name, description } }))
          : null;
    setBusy(false);
    if (
      result &&
      (createRole.fulfilled.match(result) || updateRole.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "Role updated" : "Role created",
        editing ? `${name} was saved.` : `${name} was added.`,
      );
      onClose();
    } else if (result) {
      toastError(
        dispatch,
        editing ? "Could not update role" : "Could not create role",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  return (
    <Modal open={Boolean(role)} title={editing ? "Edit role" : "Create role"} description="Role names use lowercase letters, numbers, underscores or hyphens." onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Role name">
          <input className="form-input disabled:bg-slate-100/70" pattern="[a-z][a-z0-9_-]*" required disabled={protectedRole} value={name} onChange={(event) => setName(event.target.value.toLowerCase())} />
        </Field>
        <Field label="Description">
          <textarea className="form-input min-h-28 resize-y" maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <FormActions busy={busy} submitLabel={editing ? "Save changes" : "Create role"} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function PanelHeader({ title, action }: { title: string; description?: string; action: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <span className="avatar-circle grid size-10 shrink-0 place-items-center bg-[var(--theme-green-soft)] font-bold text-[var(--theme-green)]">{user.full_name.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0"><p className="truncate font-semibold">{user.full_name}</p><p className="truncate text-xs text-slate-500 sm:text-sm">{user.email}</p></div>
    </div>
  );
}

function RoleBadges({ roles }: { roles: Role[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.length ? roles.map((role) => <span key={role.id} className="rounded-full border border-neutral-100 bg-neutral-100/80 px-2.5 py-1 text-xs font-semibold text-neutral-900">{role.name}</span>) : <span className="text-xs text-slate-400">No roles</span>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}{hint && <span className="mt-2 block text-xs text-slate-500">{hint}</span>}</label>;
}

function FormActions({ busy, submitLabel, onCancel }: { busy: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="glass-secondary-button">Cancel</button>
      <button disabled={busy} className="primary-button justify-center">{busy ? "Saving..." : submitLabel}</button>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: "cyan" | "emerald" | "violet" }) {
  const colors = { cyan: "bg-cyan-100 text-cyan-700", emerald: "bg-emerald-100 text-emerald-700", violet: "bg-violet-100 text-violet-700" };
  return <article className="table-card flex items-center gap-4 p-5"><span className={`grid size-12 place-items-center rounded-2xl ${colors[color]}`}>{icon}</span><div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></div></article>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="p-10 text-center text-sm text-slate-500">{message}</p>;
}
