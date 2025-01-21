import Featured from '@/components/section/Featured';
import HeroSlider from '@/components/section/HeroSlider';
import HomeSearch from '@/components/section/HomeSearch';
import TrendingEvents from '@/components/section/TrendingEvents';

export default function Home() {
  return (
    <div>
      <HeroSlider />
      <HomeSearch />
      <Featured />
      <TrendingEvents />
    </div>
  );
}
