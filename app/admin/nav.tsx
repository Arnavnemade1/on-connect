"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const LINKS: [string, string][] = [["/admin", "Overview"], ["/admin/participants", "Participants"], ["/admin/sources", "Sources"], ["/admin/resources", "Resources"], ["/admin/versions", "Versions"], ["/admin/evaluation", "Evaluation"], ["/admin/export", "Export"], ["/admin/audit", "Audit log"]];
export default function AdminNav() {
  const path = usePathname();
  return <nav className="admnav" aria-label="Research admin">{LINKS.map(([h, l]) => <Link key={h} href={h} className={(h === "/admin" ? path === h : path.startsWith(h)) ? "on" : ""}>{l}</Link>)}</nav>;
}
