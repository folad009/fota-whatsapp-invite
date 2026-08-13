// import { DashboardPreview } from "@/components/landing/DashboardPreview";
// import { FeatureGrid } from "@/components/landing/FeatureGrid";
// import { HowItWorks } from "@/components/landing/HowItWorks";
// import { LandingCta } from "@/components/landing/LandingCta";
// import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNavbar } from "@/components/landing/LandingNavbar";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main>
        <LandingHero />
        {/* <FeatureGrid /> 
        <HowItWorks />
        <DashboardPreview />
        <LandingCta />
        <LandingFooter />
        */}
      </main>
      
    </div>
  );
}
