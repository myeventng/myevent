import { Heart } from 'lucide-react';

const EventInfo = () => {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center text-white overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm"
        style={{ backgroundImage: "url('/image1.jpg')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-pink-700 opacity-90" />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content - Added relative and z-10 */}
      <div className="relative z-10 text-center md:text-left flex flex-col gap-6 px-6 max-w-3xl">
        {/* Event Type */}
        <h1 className="text-xl md:text-2xl font-bold text-white/50">Comedy</h1>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold">Jacquees & Dej Loaf</h1>

        {/* Tags */}
        <div className="mt-3 flex gap-2 flex-wrap">
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

        {/* Date and Venue */}
        <div>
          <p className="text-white/70 text-lg font-normal">
            Saturday <strong>June 7th</strong>, 2025 from 7:00 pm to 11:00 pm
          </p>
          <p className="font-light text-lg">@ Roundhouse in London</p>
        </div>

        {/* Ticket Price and CTA */}
        <div className="text-lg md:text-xl">
          <span className="font-bold text-white text-2xl">£46.75 - £57.75</span>
          <p className="text-white/50 text-lg">
            Ticket sale closes <strong>5th Jun 12:00 pm</strong>
          </p>

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
        <p>Ticket sales Closes by 6th Apr 10:00 pm</p>
      </div>
    </div>
  );
};

export default EventInfo;
