import Link from "next/link";

type AppRoute = "dashboard" | "today" | "tasks" | "weekly-reviews";

const navigationItems: Array<{ label: string; route: AppRoute; href: string }> = [
  { label: "Dashboard", route: "dashboard", href: "/dashboard" },
  { label: "Today", route: "today", href: "/today" },
  { label: "Tasks", route: "tasks", href: "/tasks" },
  { label: "Reviews", route: "weekly-reviews", href: "/weekly-reviews" },
];

export function AppNavigation({ current }: { current: AppRoute }) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
      {navigationItems.map((item) => {
        const isCurrent = item.route === current;

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? "rounded-md bg-parchment-100 px-3 py-2 text-sm font-semibold text-plum-950"
                : "rounded-md border border-white/15 bg-white/[0.025] px-3 py-2 text-sm font-semibold text-[#fff8e7] transition hover:border-white/25 hover:bg-white/[0.07]"
            }
            href={item.href}
            key={item.route}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
