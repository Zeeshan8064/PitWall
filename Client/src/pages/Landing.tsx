import Navbar from "../components/Navbar";
import StrategyFeed from "../components/StrategyFeed";
import HorizontalScroller from "../components/HorizontalScroller";
import Hero from "../components/Hero";
import WhyPitwall from "../components/WhyPitwall";
import RaceReasons from "../components/RaceReasons";
import Paddock from "../components/Paddock";

export default function Landing() {
  return (
    <>
      <Navbar />

      <HorizontalScroller>
        <Hero />
        <WhyPitwall />
        <RaceReasons />
        <Paddock />
      </HorizontalScroller>

      <StrategyFeed />
    </>
  );
}