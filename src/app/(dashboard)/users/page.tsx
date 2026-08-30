"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Avatar,
  Tabs,
  EmptyState,
  Button,
  TableSkeleton,
  ToastViewport,
  ConfirmDialog,
  CardSkeleton,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { roleLabel } from "@/lib/rbac";
import { roleNameToSlug } from "@/lib/role-mapping";
import { useLanguage } from "@/lib/i18n";
import { InviteUserModal } from "@/components/users/InviteUserModal";
import { PermissionMatrix } from "@/components/users/PermissionMatrix";
import { RoleEditorModal } from "@/components/users/RoleEditorModal";
import { UserPermissionsModal } from "@/components/users/UserPermissionsModal";
import { formatDate, timeAgo } from "@/lib/utils";
import type { AdminUserStatus } from "@/types";

const STATUS_VARIANT: Record<AdminUserStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  invited: "warning",
  disabled: "neutral",
};

const USERS_POLL_INTERVAL_MS = 15_000;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function OnlineIndicator({ user }: { user: api.BackendAdminUser }) {
  const { lang, t } = useLanguage();
  if (user.status !== "active") return null;

  if (user.isOnline) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        {t("users.onlineNow")}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-surface-hover" />
      {user.lastSeenAt ? t("users.lastSeen", { time: timeAgo(user.lastSeenAt, lang) }) : t("users.neverLoggedIn")}
    </span>
  );
}

export default function UsersPage() {
  const { user: currentUser, can } = useSession();
  const { lang, t } = useLanguage();
  const { toasts, showToast, dismissToast } = useToast();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<api.BackendAdminUser[] | null>(null);
  const [roles, setRoles] = useState<api.BackendRole[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<api.BackendAdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [registry, setRegistry] = useState<api.PermissionRegistry | null>(null);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [roleEditorTarget, setRoleEditorTarget] = useState<api.BackendRole | undefined>(undefined);
  const [permissionsTarget, setPermissionsTarget] = useState<api.BackendAdminUser | null>(null);

  const STATUS_LABEL: Record<AdminUserStatus, string> = {
    active: t("users.statusActive"),
    invited: t("users.statusInvited"),
    disabled: t("users.statusDisabled"),
  };

  // Only a Super Admin ever reaches this page (gated below by canView), so
  // role/permission management is available to anyone who can see it at all.
  const canManage = can("roles_permissions", "edit") || can("roles_permissions", "create");
  const canView = can("roles_permissions", "view");

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    Promise.all([api.fetchUsers(), api.fetchRoles(), api.fetchPermissionRegistry()])
      .then(([usersRes, rolesRes, registryRes]) => {
        if (cancelled) return;
        setUsers(usersRes);
        setRoles(rolesRes);
        setRegistry(registryRes);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : t("users.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [canView, t]);

  function refreshRoles() {
    api.fetchRoles().then(setRoles).catch(() => {});
  }

  // Silent background refresh so online/offline status updates without a
  // full page reload -- doesn't touch loadError/skeleton state.
  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(() => {
      api.fetchUsers().then(setUsers).catch(() => {});
    }, USERS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [canView]);

  async function handleDelete(target: api.BackendAdminUser) {
    setDeleting(true);
    try {
      await api.deleteUser(target.id);
      setUsers((prev) => prev?.filter((u) => u.id !== target.id) ?? prev);
      showToast("success", t("users.deleteSuccess", { name: target.name }));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("users.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  if (!canView) {
    return <EmptyState icon="shield" title={t("common.unauthorizedTitle")} description={t("users.unauthorizedDesc")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        actions={
          canManage &&
          (tab === "roles" ? (
            <Button
              variant="primary"
              onClick={() => {
                setRoleEditorTarget(undefined);
                setRoleEditorOpen(true);
              }}
            >
              <Icon name="plus" className="h-4 w-4" /> {t("users.addRole")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              <Icon name="plus" className="h-4 w-4" /> {t("users.inviteUser")}
            </Button>
          ))
        }
      />

      <Tabs items={[{ key: "users", label: t("users.tabUsers") }, { key: "roles", label: t("users.tabRoles") }]} active={tab} onChange={setTab} />

      {tab === "users" && (
        <Card>
          {users === null ? (
            loadError ? (
              <EmptyState icon="alert" title={t("users.loadError")} description={loadError} />
            ) : (
              <TableSkeleton rows={5} cols={5} />
            )
          ) : users.length === 0 ? (
            <EmptyState icon="users" title={t("users.noUsersTitle")} description={t("users.noUsersDesc")} />
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <ul className="divide-y divide-border-soft md:hidden">
                {users.map((u) => (
                  <li key={u.id} className="space-y-3 p-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} initials={initials(u.name)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-soft">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <Badge variant="danger">{t("users.noRole")}</Badge>
                      ) : (
                        u.roles.map((r) => {
                          const slug = roleNameToSlug(r);
                          return (
                            <Badge key={r} variant="brand">
                              {slug ? roleLabel(slug, lang) : r}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <Badge variant={STATUS_VARIANT[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                        <OnlineIndicator user={u} />
                      </div>
                      <span className="text-xs text-muted-soft">{formatDate(u.createdAt, lang)}</span>
                    </div>
                    {(canManage || (canManage && currentUser && u.id !== Number(currentUser.id))) && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-2">
                        {canManage && (
                          <Button variant="ghost" size="sm" onClick={() => setPermissionsTarget(u)}>
                            <Icon name="shield" className="h-3.5 w-3.5" /> {t("users.permissionsBtn")}
                          </Button>
                        )}
                        {canManage && currentUser && u.id !== Number(currentUser.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                            onClick={() => setDeleteTarget(u)}
                            className="text-danger hover:bg-danger/10"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" /> {t("users.deleteBtn")}
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Tablet/desktop: full table */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <tr>
                      <TH>{t("users.colUser")}</TH>
                      <TH>{t("users.colRoles")}</TH>
                      <TH>{t("users.colStatus")}</TH>
                      <TH>{t("users.colCreated")}</TH>
                      <TH />
                    </tr>
                  </THead>
                  <TBody>
                    {users.map((u) => (
                      <TR key={u.id}>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} initials={initials(u.name)} />
                            <div>
                              <p className="font-medium text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-soft">{u.email}</p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <Badge variant="danger">{t("users.noRole")}</Badge>
                            ) : (
                              u.roles.map((r) => {
                                const slug = roleNameToSlug(r);
                                return (
                                  <Badge key={r} variant="brand">
                                    {slug ? roleLabel(slug, lang) : r}
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1">
                            <Badge variant={STATUS_VARIANT[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                            <OnlineIndicator user={u} />
                          </div>
                        </TD>
                        <TD className="text-muted">{formatDate(u.createdAt, lang)}</TD>
                        <TD>
                          <div className="flex items-center gap-1">
                            {canManage && (
                              <Button variant="ghost" size="sm" onClick={() => setPermissionsTarget(u)}>
                                <Icon name="shield" className="h-3.5 w-3.5" /> {t("users.permissionsBtn")}
                              </Button>
                            )}
                            {canManage && currentUser && u.id !== Number(currentUser.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleting}
                                onClick={() => setDeleteTarget(u)}
                                className="text-danger hover:bg-danger/10"
                              >
                                <Icon name="trash" className="h-3.5 w-3.5" /> {t("users.deleteBtn")}
                              </Button>
                            )}
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === "roles" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roles === null
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : roles.map((role) => (
              <Card key={role.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{role.name_ar || role.name}</p>
                    {role.name_ar && <p className="text-xs text-muted-soft">{role.name}</p>}
                  </div>
                  {canManage && role.name !== "Super Admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoleEditorTarget(role);
                        setRoleEditorOpen(true);
                      }}
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" /> {t("users.editRoleBtn")}
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{role.description || "—"}</p>
                <p className="mt-3 text-[11px] text-muted-soft">{t("users.permissionCount", { count: role.permissions.length })}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("users.matrixTitle")}</CardTitle>
            </CardHeader>
            <PermissionMatrix />
          </Card>
        </div>
      )}

      <InviteUserModal
        open={inviteOpen}
        roles={roles ?? []}
        onClose={() => setInviteOpen(false)}
        onCreated={(invitation) => {
          api.fetchUsers().then(setUsers).catch(() => {});
          if (invitation.emailSent) {
            showToast("success", t("users.inviteSuccess", { email: invitation.email }));
          } else {
            showToast("danger", t("users.inviteEmailError"));
          }
        }}
      />

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
          title={t("users.deleteConfirmTitle", { name: deleteTarget.name })}
          description={t("users.deleteConfirmDesc")}
          confirmLabel={t("common.delete")}
          variant="danger"
        />
      )}

      <RoleEditorModal
        open={roleEditorOpen}
        role={roleEditorTarget}
        registry={registry}
        onClose={() => setRoleEditorOpen(false)}
        onSaved={(saved) => {
          refreshRoles();
          showToast(
            "success",
            roleEditorTarget
              ? t("users.roleUpdated", { name: saved.name_ar ?? saved.name })
              : t("users.roleCreated", { name: saved.name_ar ?? saved.name }),
          );
        }}
      />

      <UserPermissionsModal
        open={Boolean(permissionsTarget)}
        user={permissionsTarget}
        registry={registry}
        onClose={() => setPermissionsTarget(null)}
        onSaved={() => showToast("success", t("users.permissionsUpdated"))}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
