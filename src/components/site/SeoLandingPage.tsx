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
        <section style={{maxWidth:1180,margin:"0 auto",padding:"132px 24px 76px",position:"relative"}}>
          <div style={{position:"absolute",right:80,top:150,width:280,height:280,pointerEvents:"none",opacity:.8}}>
            <Orb scale={1.15} />
          </div>
          <div style={{maxWidth:760,position:"relative",zIndex:2}}>
            <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.gold,margin:"0 0 16px",fontFamily:FONT_BODY}}>{data.eyebrow}</p>
            <h1 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(36px,5.5vw,66px)",lineHeight:1.03,letterSpacing:"-0.035em",color:C.text,margin:"0 0 22px",maxWidth:760}}>{data.h1}</h1>
            <p style={{fontFamily:FONT_BODY,fontSize:"clamp(16px,1.8vw,20px)",lineHeight:1.7,color:C.muted,maxWidth:680,margin:0}}>{data.intro}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:14,marginTop:30}}>
              <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
              <Link to="/demo" style={{display:"inline-flex",alignItems:"center",gap:7,minHeight:52,padding:"15px 20px",border:"1px solid "+C.border2,borderRadius:8,color:C.text,textDecoration:"none",fontFamily:FONT_BODY,fontSize:14,fontWeight:600}}>
                See how it works <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section style={{borderTop:"1px solid "+C.border,borderBottom:"1px solid "+C.border,background:C.s1}}>
          <div style={{maxWidth:1180,margin:"0 auto",padding:"72px 24px"}}>
            <div style={{display:"grid",gap:16}}>
              {page.sections.map((section,index)=>(
                <article key={section[0]} style={{display:"grid",gridTemplateColumns:"72px minmax(0,1fr)",gap:22,padding:"28px 0",borderBottom:index===page.sections.length-1?"none":"1px solid "+C.border}}>
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

        <section style={{maxWidth:1180,margin:"0 auto",padding:"72px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(280px,420px)",gap:40,alignItems:"start"}}>
            <div>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.gold,margin:"0 0 14px",fontFamily:FONT_BODY}}>Could this be a fit?</p>
              <h2 style={{fontFamily:FONT_DISPLAY,fontSize:"clamp(26px,3vw,38px)",lineHeight:1.1,color:C.text,margin:"0 0 20px"}}>Built for independent service businesses.</h2>
              <div style={{display:"grid",gap:11}}>
                {page.fit.map(item=><div key={item} style={{display:"flex",gap:10,alignItems:"flex-start"}}><Check size={16} color={C.gold} style={{flexShrink:0,marginTop:2}} /><span style={{fontFamily:FONT_BODY,fontSize:14,lineHeight:1.6,color:C.muted}}>{item}</span></div>)}
              </div>
            </div>
            <div style={{border:"1px solid "+C.border2,borderRadius:18,background:C.s1,padding:26}}>
              <p style={{fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:C.text,margin:"0 0 15px"}}>Keep exploring</p>
              <div style={{display:"grid",gap:8}}>
                {page.related.map(([label,to])=><Link key={to} to={to} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid "+C.border,color:C.text,textDecoration:"none",fontFamily:FONT_BODY,fontSize:13}}>{label}<ChevronRight size={15} color={C.gold} /></Link>)}
              </div>
            </div>
          </div>
        </section>

        <section style={{borderTop:"1px solid "+C.border,background:C.s1,textAlign:"center",padding:"72px 24px 82px"}}>
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
