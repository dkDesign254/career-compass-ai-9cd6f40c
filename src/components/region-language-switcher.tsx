import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGeoCountry } from "@/lib/geo.functions";

const COUNTRIES = [
  { code: "KE", label: "Kenya" },
  { code: "NG", label: "Nigeria" },
  { code: "GH", label: "Ghana" },
  { code: "ZA", label: "South Africa" },
  { code: "UG", label: "Uganda" },
  { code: "TZ", label: "Tanzania" },
  { code: "RW", label: "Rwanda" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "am", label: "አማርኛ" },
  { code: "pt", label: "Português" },
] as const;

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: any } };
    googleTranslateElementInit?: () => void;
  }
}

function loadGoogleTranslate() {
  if (document.getElementById("google-translate-script")) return;
  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
  window.googleTranslateElementInit = () => {
    new window.google!.translate!.TranslateElement(
      { pageLanguage: "en", autoDisplay: false },
      "google_translate_element_hidden",
    );
  };
}

function setGoogleTranslateLanguage(code: string) {
  // Google's widget drives translation via a hidden <select>; driving it
  // programmatically is the standard (if slightly hacky) way to trigger a
  // translation from a custom-styled trigger instead of Google's default UI.
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event("change"));
  } else {
    // widget not ready yet — retry shortly
    setTimeout(() => setGoogleTranslateLanguage(code), 400);
  }
}

export function RegionLanguageSwitcher({ className }: { className?: string }) {
  const getGeo = useServerFn(getGeoCountry);
  const [country, setCountry] = useState<string>("KE");
  const [language, setLanguage] = useState<string>("en");

  useEffect(() => {
    loadGoogleTranslate();
    const saved = localStorage.getItem("cp_country");
    if (saved) {
      setCountry(saved);
    } else {
      getGeo().then((res) => {
        if (res.country && COUNTRIES.some((c) => c.code === res.country)) {
          setCountry(res.country);
          localStorage.setItem("cp_country", res.country);
        }
      }).catch(() => {});
    }
    const savedLang = localStorage.getItem("cp_lang");
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleCountry = (code: string) => {
    setCountry(code);
    localStorage.setItem("cp_country", code);
  };

  const handleLanguage = (code: string) => {
    setLanguage(code);
    localStorage.setItem("cp_lang", code);
    setGoogleTranslateLanguage(code === "en" ? "en" : code);
  };

  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label ?? "Kenya";
  const languageLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <div id="google_translate_element_hidden" className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {countryLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Region</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {COUNTRIES.map((c) => (
            <DropdownMenuItem key={c.code} onSelect={() => handleCountry(c.code)}>
              {c.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="notranslate gap-1.5 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> {languageLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="notranslate">
          <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGES.map((l) => (
            <DropdownMenuItem key={l.code} onSelect={() => handleLanguage(l.code)}>
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
