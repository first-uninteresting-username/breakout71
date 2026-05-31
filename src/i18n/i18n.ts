import en from "./en.json";
import fr from "./fr.json";
import ar from "./ar.json";
import ru from "./ru.json";
import es from "./es.json";
import tr from "./tr.json";
import de from "./de.json";
import ko from "./ko.json";
import zh from "./zh.json";
import fa from "./fa.json";
import ja from "./ja.json";
import zh_Hant from "./zh_Hant.json";
import br from "./pt_BR.json";
import pt from "./pt.json";
import sk from "./sk.json";
import it from "./it.json";
import cs from "./cs.json";
import { getSettingValue } from "../settings";

export const languages = [
  {
    text: "English",
    value: "en",
    strings: en,
    levelName: "UK",
  },
  {
    text: "Français",
    value: "fr",
    strings: fr,
    levelName: "France",
  },
  {
    text: "汉语",
    value: "zh",
    strings: zh,
    levelName: "China",
    limitTextWeight: true,
  },
  {
    text: "正體字",
    value: "zh_Hant",
    strings: zh_Hant,
    levelName: "Taiwan",
    limitTextWeight: true,
  },
  {
    text: "Brasil",
    value: "br",
    strings: br,
    levelName: "Brazil",
  },
  {
    text: "Português",
    value: "pt",
    strings: pt,
    levelName: "Portugal",
  },
  {
    text: "عربي",
    value: "ar",
    strings: ar,
    levelName: "Lebanon",
  },
  {
    text: "Español",
    value: "es",
    strings: es,

    levelName: "Chile",
  },
  {
    text: "Русский",
    value: "ru",
    strings: ru,
    levelName: "Russia",
  },

  {
    text: "Deutsch",
    value: "de",
    strings: de,
    levelName: "Germany",
  },
  {
    text: "Türkçe",
    value: "tr",
    strings: tr,

    levelName: "Türkiye",
  },
  {
    text: "한국인",
    value: "ko",
    strings: ko,
    levelName: "Korea",
    limitTextWeight: true,
  },
  {
    text: "فارسی",
    value: "fa",
    strings: fa,
    levelName: "Iran",
  },
  {
    text: "日本語",
    value: "ja",
    strings: ja,
    levelName: "Japan",
  },
  {
    text: "Slovenčina",
    value: "sk",
    strings: sk,
    levelName: "Slovakia",
  },
  {
    text: "Italiano",
    value: "it",
    strings: it,
    levelName: "Italia",
  },
  {
    text: "čeština",
    value: "cs",
    strings: cs,
    levelName: "Czech Republic",
  },
];

type translationKeys = keyof typeof en;
type translation = {
  strings: { [key in translationKeys]: string };
  limitTextWeight?: boolean;
};
const languagesMap: Record<string, translation> = {};
languages.forEach((l) => (languagesMap[l.value] = l));

let defaultLang =
  [...navigator.languages, navigator.language]
    .filter((i) => i)
    .map((i) => i.slice(0, 2).toLowerCase())
    .find((k) => k in languagesMap) || "en";

export function getCurrentLang() {
  return getSettingValue("lang", defaultLang);
}

export function t(
  key: translationKeys,
  params: { [key: string]: any } = {},
): string {
  const lang = getCurrentLang();
  let template =
    languagesMap[lang]?.strings[key] || languagesMap.en.strings[key];
  if (typeof template == "undefined")
    throw new Error("Missing translation key :" + key);
  for (let key in params) {
    template = template.split("{{" + key + "}}").join(`${params[key]}`);
  }
  return template.replace(/</gi, "&lt;").replace(/>/gi, "&gt;");
}

const supportsBold: Record<string, (typeof languages)[0]> = {};
languages.forEach((l) => {
  supportsBold[l.value] = l;
});
export function currentLanguageSupportsHeavyFontWeight() {
  return !languagesMap[getCurrentLang()].limitTextWeight;
}
