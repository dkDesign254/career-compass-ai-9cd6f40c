import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGeoCountry } from "@/lib/geo.functions";

// Full ISO 3166-1 country list with English display names. Generated once
// via Intl.DisplayNames (Node has this built in) rather than hand-typed —
// see scripts note below if this ever needs regenerating.
const ALL_COUNTRY_CODES = [
  "AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BT",
  "BO","BA","BW","BR","BN","BG","BF","BI","CV","KH","CM","CA","CF","TD","CL","CN","CO","KM","CG","CD",
  "CR","CI","HR","CU","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FJ","FI",
  "FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ",
  "IE","IL","IT","JM","JP","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI",
  "LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","FM","MD","MC","MN","ME","MA","MZ","MM",
  "NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT",
  "QA","RO","RU","RW","KN","LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO",
  "ZA","SS","ES","LK","SD","SR","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM",
  "TV","UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN","YE","ZM","ZW",
] as const;

const countryDisplay = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const COUNTRIES = ALL_COUNTRY_CODES.map((code) => ({ code, label: countryDisplay?.of(code) ?? code }))
  .sort((a, b) => a.label.localeCompare(b.label));

// Languages Google's Website Translator widget supports, covering the app's
// primary markets plus global majors.
const LANGUAGES = [
  { code: "en", label: "English" }, { code: "sw", label: "Kiswahili" }, { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" }, { code: "am", label: "አማርኛ" }, { code: "pt", label: "Português" },
  { code: "es", label: "Español" }, { code: "zh-CN", label: "中文 (简体)" }, { code: "hi", label: "हिन्दी" },
  { code: "de", label: "Deutsch" }, { code: "ru", label: "Русский" }, { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" }, { code: "it", label: "Italiano" }, { code: "nl", label: "Nederlands" },
  { code: "tr", label: "Türkçe" }, { code: "pl", label: "Polski" }, { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" }, { code: "id", label: "Bahasa Indonesia" }, { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" }, { code: "ig", label: "Igbo" }, { code: "zu", label: "isiZulu" },
  { code: "xh", label: "isiXhosa" }, { code: "so", label: "Soomaali" }, { code: "rw", label: "Kinyarwanda" },
  { code: "ur", label: "اردو" }, { code: "fa", label: "فارسی" }, { code: "he", label: "עברית" },
  { code: "bn", label: "বাংলা" }, { code: "pa", label: "ਪੰਜਾਬੀ" }, { code: "ta", label: "தமிழ்" },
  { code: "el", label: "Ελληνικά" }, { code: "sv", label: "Svenska" }, { code: "uk", label: "Українська" },
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

  const [countryQuery, setCountryQuery] = useState("");
  const [langQuery, setLangQuery] = useState("");
  const filteredCountries = useMemo(
    () => COUNTRIES.filter((c) => c.label.toLowerCase().includes(countryQuery.toLowerCase())),
    [countryQuery],
  );
  const filteredLanguages = useMemo(
    () => LANGUAGES.filter((l) => l.label.toLowerCase().includes(langQuery.toLowerCase())),
    [langQuery],
  );

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <div id="google_translate_element_hidden" className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {countryLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Region</DropdownMenuLabel>
          <div className="px-2 pb-1">
            <Input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="Search country…"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <DropdownMenuSeparator />
          {filteredCountries.map((c) => (
            <DropdownMenuItem key={c.code} onSelect={() => handleCountry(c.code)}>
              {c.label}
            </DropdownMenuItem>
          ))}
          {filteredCountries.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="notranslate gap-1.5 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> {languageLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="notranslate max-h-80 w-56 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
          <div className="px-2 pb-1">
            <Input
              value={langQuery}
              onChange={(e) => setLangQuery(e.target.value)}
              placeholder="Search language…"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <DropdownMenuSeparator />
          {filteredLanguages.map((l) => (
            <DropdownMenuItem key={l.code} onSelect={() => handleLanguage(l.code)}>
              {l.label}
            </DropdownMenuItem>
          ))}
          {filteredLanguages.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
