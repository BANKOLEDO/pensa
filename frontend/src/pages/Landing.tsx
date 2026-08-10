import Header from "../components/Header";
import Footer from "../components/Footer";
import Hero from "../components/sections/Hero";
import TokenTicker from "../components/sections/TokenTicker";
import HowItWorks from "../components/sections/HowItWorks";
import Showcase from "../components/sections/Showcase";
import AssetClasses from "../components/sections/AssetClasses";
import SecurityBento from "../components/sections/SecurityBento";
import RiskProfiles from "../components/sections/RiskProfiles";
import CtaBand from "../components/sections/CtaBand";

export default function Landing() {
  return (
    <div id="top">
      <Header />
      <Hero />
      <TokenTicker />
      <HowItWorks />
      <Showcase />
      <AssetClasses />
      <SecurityBento />
      <RiskProfiles />
      <CtaBand />
      <Footer />
    </div>
  );
}
