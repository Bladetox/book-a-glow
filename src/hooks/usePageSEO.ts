import { useEffect } from "react";
import seoPages from "@/data/seo-pages.json";

const SITE_URL = "https://www.nextslot.co.za";

export function usePageSEO(path:string) {
  useEffect(() => {
    const data = (seoPages as Record<string,{title:string;description:string;indexable:boolean}>)[path];
    if (!data) return;
    const canonical = SITE_URL + (path === "/" ? "/" : path);
    const setMeta = (selector:string, attr:string, value:string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.setAttribute(attr,value);
    };
    document.title = data.title;
    setMeta('meta[name="description"]',"content",data.description);
    setMeta('meta[name="robots"]',"content",data.indexable ? "index, follow" : "noindex, nofollow");
    setMeta('meta[property="og:url"]',"content",canonical);
    setMeta('meta[property="og:title"]',"content",data.title);
    setMeta('meta[property="og:description"]',"content",data.description);
    setMeta('meta[name="twitter:url"]',"content",canonical);
    setMeta('meta[name="twitter:title"]',"content",data.title);
    setMeta('meta[name="twitter:description"]',"content",data.description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  },[path]);
}
