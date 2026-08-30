import { Icon } from "@/components/icons";

/** Visual representation of RBAC gating (WEB-ADM-FR-025/093, WEB-ADM-SEC-003): fields render
 * read-only rather than being hidden, so the user understands *why* they can't act. */
export function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
      <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
