import type { IconName } from "@/components/icons";
import type { Resource } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: IconName;
  resource?: Resource;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "الرئيسية", labelEn: "Home", icon: "dashboard" },
  { href: "/pages", label: "الصفحات", labelEn: "Pages", icon: "pages", resource: "pages" },
  { href: "/blog", label: "المدونة", labelEn: "Blog", icon: "blog", resource: "articles" },
  { href: "/pricing", label: "التسعير", labelEn: "Pricing", icon: "pricing", resource: "pricing" },
  { href: "/faq", label: "الأسئلة الشائعة", labelEn: "FAQ", icon: "faq", resource: "faq" },
  { href: "/testimonials", label: "آراء العملاء", labelEn: "Testimonials", icon: "testimonials", resource: "testimonials" },
  { href: "/media", label: "مكتبة الوسائط", labelEn: "Media Library", icon: "media", resource: "media" },
  { href: "/contact", label: "معلومات التواصل", labelEn: "Contact Info", icon: "contact", resource: "contact_info" },
  { href: "/potential-clients", label: "العملاء المحتملون", labelEn: "Potential Clients", icon: "users", resource: "company_requests" },
  { href: "/contact-requests", label: "طلبات التواصل", labelEn: "Contact Requests", icon: "send", resource: "contact_messages" },
];

export const NAV_ITEMS_SECONDARY: NavItem[] = [
  { href: "/users", label: "المستخدمون والصلاحيات", labelEn: "Users & Roles", icon: "users", resource: "roles_permissions" },
  { href: "/audit-log", label: "سجل التدقيق", labelEn: "Audit Log", icon: "audit", resource: "audit_log" },
];
