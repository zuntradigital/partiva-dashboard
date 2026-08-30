import type { ActorRef } from "./common";

export type AuditAction =
  | "create"
  | "edit"
  | "publish"
  | "unpublish"
  | "archive"
  | "delete"
  | "approve"
  | "reject"
  | "verify"
  | "permission_change"
  | "upload"
  | "login"
  | "schedule"
  | "submit_review";

export interface AuditLogEntry {
  id: string;
  actor: ActorRef;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  result: "success" | "failure";
  ip?: string;
}
