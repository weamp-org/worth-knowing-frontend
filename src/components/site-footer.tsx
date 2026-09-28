export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      {/* Same width as the header and the feed, so the left edges line up. */}
      <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Worth Knowing
      </div>
    </footer>
  );
}
