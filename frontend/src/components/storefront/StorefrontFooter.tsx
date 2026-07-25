export function StorefrontFooter() {
  return (
    <footer className="border-t border-[var(--card-border)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-[var(--muted)] sm:px-6">
        <p className="font-semibold text-[var(--foreground)]">Classic Way</p>
        <p>Premium everyday apparel, crafted for comfort and style.</p>
        <p>© {new Date().getFullYear()} Classic Way Retail. All rights reserved.</p>
      </div>
    </footer>
  );
}
