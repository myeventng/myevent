'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useState, useRef } from 'react';
import BtnSlideEffect from '../shared/BtnSlideEffect';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import SwiperCore from 'swiper';

interface Slide {
  image: string;
  text: string;
  venue: string;
}

const slides: Slide[] = [
  {
    image: 'assets/images/image1.jpg',
    venue: 'National Stadium Lagos',
    text: 'Discover Amazing Events',
  },
  {
    image: 'assets/images/image2.jpg',
    venue: 'Orona Hall (Sweet Spirit Hotel)',
    text: 'Unforgettable Experiences Await',
  },
  {
    image: 'assets/images/image3.jpg',
    venue: 'Rickrex Event City',
    text: 'High Voltage Doings 3 with RnB (Back 2 Origin)',
  },
];

export default function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative h-[90vh] w-full">
      <Swiper
        modules={[Autoplay, Navigation]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop
        className="h-full w-full"
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={(swiper: SwiperCore) => {
          if (typeof swiper.params.navigation !== 'boolean') {
            swiper.params.navigation!.prevEl = prevRef.current;
            swiper.params.navigation!.nextEl = nextRef.current;
          }
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div
              className="relative h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-50"></div>

              <div className="absolute inset-x-0 bottom-20 text-center text-white px-4 wrapper z-30">
                <h1 className="text-3xl font-bold md:text-6xl md:leading-tight mb-6">
                  {slide.text}
                </h1>
                <h1 className="text-xl font-bold md:text-3xl md:leading-tight mb-6">
                  @ {slide.venue}
                </h1>
                <div>
                  <BtnSlideEffect text="Book Now" path="/" />
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-12 rounded-full transition-all ${
              index === activeIndex
                ? 'bg-white opacity-100'
                : 'bg-gray-400 opacity-50'
            }`}
          ></div>
        ))}
      </div>

      <div className="absolute inset-0 flex justify-between items-center px-4 z-10 wrapper">
        <button
          ref={prevRef}
          className="swiper-button-prev bg-opacity-50 hover:bg-opacity-75 rounded-full p-3"
          aria-label="Previous Slide"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <button
          ref={nextRef}
          className="swiper-button-next bg-opacity-50 hover:bg-opacity-75 rounded-full p-3"
          aria-label="Next Slide"
        >
          <FaArrowRight className="text-xl" />
        </button>
      </div>
    </div>
  );
}
