'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { ArrowBigLeft, ArrowBigRight } from 'lucide-react';
import HeaderText from '../shared/HeaderText';
import BtnSlideEffect from '../shared/BtnSlideEffect';

export default function Featured() {
  const events = [
    {
      title: 'Lagos Food Festival',
      category: 'Food',
      date: 'Thu May 29th',
      venue: 'National Stadium Lagos',
      ticketPrice: 2000,
      image: '/assets/images/image1.jpg',
    },
    {
      title: 'Afrobeats Concert',
      category: 'Music',
      date: 'Fri Jun 2nd',
      venue: 'Cubana Club',
      ticketPrice: 5000,
      image: '/assets/images/image2.jpg',
    },
    {
      title: 'Tech Conference 2025',
      category: 'Technology',
      date: 'Sat Jun 10th',
      venue: 'Eko Hotel',
      ticketPrice: 15000,
      image: '/assets/images/image3.jpg',
    },
    {
      title: 'Art & Culture Expo',
      category: 'Art',
      date: 'Sun Jun 15th',
      venue: 'Ikeja Mall',
      ticketPrice: 1000,
      image: '/assets/images/image1.jpg',
    },
    {
      title: 'Comedy Night',
      category: 'Comedy',
      date: 'Mon Jun 20th',
      venue: 'Terra Kulture',
      ticketPrice: 3000,
      image: '/assets/images/image2.jpg',
    },
    {
      title: 'Startup Pitch Event',
      category: 'Business',
      date: 'Wed Jun 25th',
      venue: 'Lagos Tech Hub',
      ticketPrice: 500,
      image: '/assets/images/image1.jpg',
    },
    {
      title: 'Outdoor Movie Night',
      category: 'Movie',
      date: 'Fri Jul 5th',
      venue: 'Lekki Conservation Centre',
      ticketPrice: 1500,
      image: '/assets/images/image3.jpg',
    },
    {
      title: 'Fitness Bootcamp',
      category: 'Fitness',
      date: 'Sat Jul 12th',
      venue: 'Bar Beach',
      ticketPrice: 1000,
      image: '/assets/images/image3.jpg',
    },
  ];

  return (
    <div className="py-12">
      <HeaderText text="Feature Events" />
      <div className="relative wrapper">
        <div className="mt-4 wrapper">
          <Swiper
            modules={[Virtual, Navigation]}
            virtual
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
            navigation={{
              prevEl: '.custom-next',
              nextEl: '.custom-prev',
            }}
            className="w-full"
          >
            {events.map((event, index) => (
              <SwiperSlide key={index} virtualIndex={index}>
                <div
                  className="relative group h-[400px] w-full  overflow-hidden bg-cover bg-center"
                  style={{ backgroundImage: `url(${event.image})` }}
                >
                  {/* Dark Layer */}
                  <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-all duration-300"></div>

                  <div className="absolute top-4 left-4 bg-primary text-white text-[15px] font-semibold py-1 px-3">
                    {event.category}
                  </div>

                  <h3 className="absolute bottom-4 left-4 right-4 text-white font-bold text-xl md:text-2xl group-hover:bottom-40 transition-all duration-300">
                    {event.title.length > 30
                      ? window.innerWidth >= 1024
                        ? `${event.title.slice(0, 30)}...`
                        : window.innerWidth >= 768
                        ? `${event.title.slice(0, 20)}...`
                        : `${event.title.slice(0, 10)}...`
                      : event.title}
                  </h3>

                  {/* Hover Details */}
                  <div className="absolute bottom-[-100%] left-4 right-4 group-hover:bottom-4 text-white transition-all duration-300">
                    <p className="md:text-[16px] text-[14px]">{event.date}</p>
                    <p className="md:text-[15px] text-[13px]">
                      @ {event.venue}
                    </p>
                    <div className="flex items-center justify-between mt-4 text-[14px]">
                      <p className="text-lg md:text-xl font-bold">
                        ₦{event.ticketPrice}
                      </p>
                      <BtnSlideEffect text="Book Now" path="/" />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="absolute inset-y-0 left-0 flex items-center z-10">
            <button className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all custom-prev">
              <ArrowBigLeft className="h-6 w-6" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center z-10 ">
            <button className="bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all custom-next">
              <ArrowBigRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
