import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sonner toast wrapper.
 *
 * next-themes was previously imported here via useTheme() which caused
 * next-themes to initialise its own ThemeProvider, toggling .dark / .light
 * on <html> after React mounts -- fighting BusinessThemeProvider and
 * producing the visible jump + black status bar on tenant booking pages.
 *
 * BusinessThemeProvider owns all class and CSS-var application on <html>.
 * Sonner toast colours are driven by CSS vars (--background, --foreground,
 * etc.) so they adapt automatically. theme="light" here is a no-op signal
 * to Sonner's internal icon rendering only; it does not affect the DOM.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
