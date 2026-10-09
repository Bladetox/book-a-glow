import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import MarketingLayout from "@/components/site/MarketingLayout";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import { Orb } from "@/components/home/Orb";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import seoPages from "@/data/seo-pages.json";
import pageContent from "@/data/seo-content.json";
import { usePageSEO } from "@/hooks/usePageSEO";

type PageData = { title:string; description:string; indexable:boolean; eyebrow?:string; h1?:string; intro?:string; schema?:string };
type Section = [string,string,string[]];
type PageContent = { sections:Section[]; fit:string[]; related:[string,string][] };

const SeoLandingPage = ({ path }: { path:string }) => {
  usePageSEO(path);
  const data = (seoPages as Record<string,PageData>)[path];
  const page = (pageContent as Record<string,PageContent>)[path];
  if (!data || !page || !data.indexable) return null;

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>
        <section className="seo-landing__hero">
          <div className="seo-landing__orb" aria-hidden="true">
            <Orb scale={1.15} />
          </div>
          <div className="seo-landing__hero-copy">
            <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.gold,margin:"0 0 16px",fontFamily:FONT_BODY}}>{data.eyebrow}</p>
            <h1 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(36px,5.5vw,66px)",lineHeight:1.03,letterSpacing:"-0.035em",color:C.text,margin:"0 0 22px",maxWidth:760}}>{data.h1}</h1>
            <p style={{fontFamily:FONT_BODY,fontSize:"clamp(16px,1.8vw,20px)",lineHeight:1.7,color:C.muted,maxWidth:680,margin:0}}>{data.intro}</p>
            <div className="seo-landing__hero-actions">
              <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
              <PrimaryCTA to="/demo">
                See how it works <ArrowRight className="marketing-cta__arrow" aria-hidden="true" />
              </PrimaryCTA>
            </div>
          </div>
        </section>

        <section className="seo-landing__details">
          <div className="seo-landing__details-inner">
            <div style={{display:"grid",gap:16}}>
              {page.sections.map((section,index)=>(
                <article key={section[0]} className={`seo-landing__detail-row${index===page.sections.length-1?" is-last":""}`}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:18,color:C.gold,paddingTop:2}}>{String(index+1).padStart(2,"0")}</div>
                  <div>
                    <h2 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(22px,2.7vw,32px)",lineHeight:1.15,color:C.text,margin:"0 0 12px"}}>{section[0]}</h2>
                    <p style={{fontFamily:FONT_BODY,fontSize:15,lineHeight:1.75,color:C.muted,maxWidth:760,margin:"0 0 18px"}}>{section[1]}</p>
                    <ul style={{listStyle:"none",padding:0,margin:0,display:"grid",gap:9,maxWidth:760}}>
                      {section[2].map(item=><li key={item} style={{display:"flex",alignItems:"flex-start",gap:9,fontFamily:FONT_BODY,fontSize:13,color:C.text,lineHeight:1.55}}><Check size={15} color={C.gold} style={{flexShrink:0,marginTop:2}} />{item}</li>)}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-landing__fit">
          <div className="seo-landing__fit-grid">
            <div>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.gold,margin:"0 0 14px",fontFamily:FONT_BODY}}>Could this be a fit?</p>
              <h2 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(26px,3vw,38px)",lineHeight:1.1,color:C.text,margin:"0 0 20px"}}>Built for independent service businesses.</h2>
              <div style={{display:"grid",gap:11}}>
                {page.fit.map(item=><div key={item} style={{display:"flex",gap:10,alignItems:"flex-start"}}><Check size={16} color={C.gold} style={{flexShrink:0,marginTop:2}} /><span style={{fontFamily:FONT_BODY,fontSize:14,lineHeight:1.6,color:C.muted}}>{item}</span></div>)}
              </div>
            </div>
            <div className="seo-landing__related">
              <p style={{fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:C.text,margin:"0 0 15px"}}>Keep exploring</p>
              <div style={{display:"grid",gap:8}}>
                {page.related.map(([label,to])=><Link key={to} to={to} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid "+C.border,color:C.text,textDecoration:"none",fontFamily:FONT_BODY,fontSize:13}}>{label}<ChevronRight size={15} color={C.gold} /></Link>)}
              </div>
            </div>
          </div>
        </section>

        <section className="seo-landing__final-cta">
          <h2 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(26px,3.5vw,42px)",lineHeight:1.1,color:C.text,margin:"0 0 14px"}}>More than bookings. Built for growth.</h2>
          <p style={{fontFamily:FONT_BODY,fontSize:14,lineHeight:1.7,color:C.muted,maxWidth:560,margin:"0 auto 26px"}}>Get your booking page live, then let the system build a clearer picture of the business behind it.</p>
          <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
        </section>
      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default SeoLandingPage;
