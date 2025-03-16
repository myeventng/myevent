import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { IoIosArrowForward } from 'react-icons/io';

const HeroSection = () => {
  return (
    <section className="relative  md:h-[90vh]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm"
        style={{ backgroundImage: "url('/image1.jpg')" }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-pink-700 opacity-90" />

      {/* Transparent Black Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-transparent" />

      <div className="w-full flex items-center justify-center">
        {/* Background Image */}

        {/* Content */}
        <div className="z-10 container mx-auto px-6 pt-36 relative">
          <div className="flex items-center justify-start gap-4 container text-white/25 z-10 font-medium text-xl">
            <Link
              href="/"
              className="hover:text-white transition-all duration-300"
            >
              Home
            </Link>
            <IoIosArrowForward />
            <Link
              href="#"
              className="hover:text-white transition-all duration-300"
            >
              Comedy
            </Link>
            <IoIosArrowForward />
            <Link href="#" className="text-white">
              Jacquees & Dej Loaf
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
            {/* Image Section */}
            <div className="flex justify-center p-10">
              <Image
                src="/image.png" //
                alt="Hero Image"
                width={400}
                height={400}
                className="rounded-lg shadow-lg"
              />
            </div>

            {/* Text Section */}
            <div className="text-white text-center md:text-left flex flex-col gap-6">
              <h1 className="text-xl md:text-2xl font-bold text-white/50">
                Comedy
              </h1>
              <div>
                {/* title */}
                <h1 className="text-3xl md:text-4xl font-bold">
                  Jacquees & Dej Loaf
                </h1>
                {/* Tags */}
                <div className="mt-3 flex gap-2 flex-wrap max-w-md">
                  <span className="rounded-md px-3 py-1 font-light bg-red-500">
                    R&B
                  </span>
                  <span className="rounded-md px-3 py-1 font-light bg-pink-500">
                    Rap
                  </span>
                  <span className="rounded-md px-3 py-1 font-light bg-blue-500">
                    Comedy
                  </span>
                </div>
              </div>
              {/* startdate and end date */}
              <div>
                <p className="text-white/50 text-xl font-normal">
                  Saturday <strong>June 7th</strong>, 2025 from 7:00 pm to 11:00
                  pm
                </p>
                <p className="font-light text-xl">@ Roundhouse in London</p>
              </div>

              <div className="text-lg md:text-xl">
                <span className="font-bold mr-4">£46.75 - £57.75 </span>
                <span className="text-lg text-white/50">
                  Ticket sale closes 5th Jun 12:00 pm
                </span>
                {/* Buttons */}
                <div className="flex gap-4 mt-4">
                  <button className="w-full md:w-auto text-center border-2 border-primary-500 bg-primary-500 hover:bg-primary transition-all duration-300 rounded-md py-3 px-6 uppercase font-bold">
                    Book Now
                  </button>
                  <button className="border-2 border-white rounded-md py-3 px-6 flex items-center uppercase font-bold">
                    <Heart className="mr-3" />
                    Favorite
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
