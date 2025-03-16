'use client';
import HeroSection from '@/components/section/single-event/HeroSection';
import EventInfo from '@/components/section/single-event/EventInfo';
import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaLink, FaXTwitter } from 'react-icons/fa6';
import { MdOutlineTextsms } from 'react-icons/md';
import { SlCalender } from 'react-icons/sl';
import { MdOutlinePermMedia, MdOutlineRateReview } from 'react-icons/md';
import { GrMapLocation } from 'react-icons/gr';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import Image from 'next/image';
import MapComponent from '@/components/section/single-event/MapComponent';
import { Instructions } from '@/components/section/single-event/Instructions';
import ImageGallery from '@/components/section/single-event/ImageGallary';

const EventSingle = () => {
  // Roundhouse London coordinates
  const venueCoordinates = {
    lat: 51.5432,
    lon: -0.1495,
  };

  return (
    <div>
      <HeroSection />
      <Instructions />
      <div className="container bg-gray-200 h-[15vh] flex items-end">
        <div className="flex justify-between items-end w-full">
          {/* Navigation Links */}
          <div className="md:text-2xl text-xl flex gap-6 font-bold text-gray-500">
            <Link
              href=""
              className="p-4 border-b-4 border-primary transition duration-300"
            >
              Event Info
            </Link>
            <Link
              href=""
              className="p-4 hover:border-b-4 hover:border-primary transition duration-300"
            >
              Venue
            </Link>
            <Link
              href=""
              className="p-4 hover:border-b-4 hover:border-primary transition duration-300"
            >
              About Organizer
            </Link>
            <Link
              href=""
              className="p-4 hover:border-b-4 hover:border-primary transition duration-300"
            >
              Reviews
            </Link>
          </div>

          {/* Share Section (Hidden on Small Screens) */}
          <div className="hidden md:block">
            <div className="flex items-center gap-6 pr-5 pb-4">
              <h1 className="text-gray-500 text-2xl font-bold uppercase mb-2">
                Share:
              </h1>
              <div className="flex gap-6 text-3xl">
                <div>
                  <Link href="">
                    <FaFacebook />
                  </Link>
                </div>
                <div>
                  <Link href="">
                    <FaXTwitter />
                  </Link>
                </div>
                <div>
                  <Link href="">
                    <FaLink />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 container min-h-screen">
          <div className="col-span-2 py-8 px-4">
            <div className="py-6">
              <div className="flex gap-3  text-primary-500 text-3xl font-extrabold mb-4 justify-start items-center">
                <MdOutlineTextsms className=" " />
                <h1> Description</h1>
              </div>
              <p>
                London, the Wait is Over! For the first time ever, two of R&B
                and hip-hop's most dynamic voices, Jacquees & DeJ Loaf, are
                bringing their *F#K A FRIEND ZONE TOUR to the UK! Known for
                their smooth vocals, undeniable chemistry, and timeless anthems,
                Jacquees and DeJ Loaf are set to light up the iconic Roundhouse
                London on Saturday, June 7th for one unforgettable night. These
                two artists have dominated the charts with their soulful
                melodies, raw storytelling, and infectious hooks, making them
                fan favorites worldwide. The Music That Defined a Generation
                Jacquees & DeJ Loaf have delivered some of the most
                unforgettable R&B and hip-hop collabs, including: 🔥 "At the
                Club" – A smooth, club-ready anthem that became a massive fan
                favorite. 🔥 "You Belong to Somebody Else" – A sultry, emotional
                track that defined modern R&B. 🔥 "Favorite One" – The perfect
                blend of melodic trap and romantic vibes. 🔥 "Just Another Love
                Song" – An undeniable hit with heartfelt storytelling.
                Individually, they've worked with some of the biggest names in
                music, from Chris Brown, Lil Wayne, and Future to Big Sean,
                T-Pain, and Meek Mill—but now, they're coming together for a
                one-night-only experience that you won'
              </p>
              <div className="flex flex-wrap"></div>
            </div>
            <div className="py-6">
              <div className="flex gap-3  text-primary-500 text-3xl font-extrabold mb-4 justify-start items-center">
                <SlCalender className="" />
                <h1> Date and Time</h1>
              </div>
              <div className="flex justify-around items-center p-6 rounded-lg bg-primary-500/5 text-primary-500 max-w-md">
                <div className="flex flex-col gap-3">
                  <h3 className="text-4xl">20</h3>
                  <h4 className="text-2xl">April</h4>
                </div>
                <div className="flex flex-col gap-3">
                  <p>Start Date</p>
                  <p> End Date</p>
                  <p> Gate Closes</p>
                </div>
                <div className="flex flex-col gap-3">
                  <p>20 Apr 2025, 18:00 HRS</p>
                  <p> 20 Apr 2025, 22:30 HRS</p>
                  <p> 20 Apr 2025, 22:25 HRS</p>
                </div>
              </div>
              <div className="flex flex-wrap"></div>
            </div>
            <div className="py-6">
              <div className="flex gap-3  text-primary-500 text-3xl font-extrabold mb-4 justify-start items-center">
                <MdOutlinePermMedia className="" />
                <h1> Images and Videos</h1>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Images grid */}
                <div className="col-span-1 md:col-span-3">
                  <ImageGallery />
                </div>

                <div className="col-span-1 md:col-span-3 mt-4 rounded-lg overflow-hidden">
                  <div className="aspect-w-16 aspect-h-9">
                    <iframe
                      className="w-full h-64 md:h-96"
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
            <div className="py-6">
              <div className="flex gap-3  text-primary-500 text-3xl font-extrabold mb-4 justify-start items-center">
                <GrMapLocation className="" />
                <h1> Venue</h1>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Venue image and name */}
                <div className="md:w-1/3">
                  <div className="rounded-lg overflow-hidden h-48 relative mb-3">
                    <Image
                      src="/image1.jpg"
                      alt="Roundhouse London"
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold">Roundhouse London</h3>
                  <p className="text-gray-600">Chalk Farm Rd, London NW1 8EH</p>
                </div>
                {/* Map component */}
                <div className="md:w-2/3">
                  <MapComponent
                    lat={venueCoordinates.lat}
                    lon={venueCoordinates.lon}
                    venueName="Roundhouse London"
                  />
                </div>
              </div>
            </div>
            <div className="py-6">
              <div className="flex gap-3  text-primary-500 text-3xl font-extrabold mb-4 justify-start items-center">
                <MdOutlineRateReview className="" />
                <h1> Ratings and Review</h1>
              </div>
              <div className="flex gap-8">
                <div>
                  <h3 className="text-xl uppercase mb-1">Event</h3>
                  <p className="text-2xl text-gray-500 font-bold mb-4">
                    Jacquees & Dej Loaf
                  </p>
                  <div className="flex items-center">
                    <h4 className="text-xl text-gray-500 font-semibold mr-2">
                      5.0
                    </h4>
                    <div className="flex text-yellow-500">
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStar />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl uppercase mb-1">Organizer</h3>
                  <p className="text-2xl text-gray-500 font-bold mb-4">
                    Raw Elegance
                  </p>
                  <div className="flex items-center">
                    <h4 className="text-xl text-gray-500 font-semibold mr-2">
                      4.0
                    </h4>
                    <div className="flex text-yellow-500">
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaRegStar />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl uppercase mb-1">Venue</h3>
                  <p className="text-2xl text-gray-500 font-bold mb-4">
                    Roundhouse
                  </p>
                  <div className="flex items-center">
                    <h4 className="text-xl text-gray-500 font-semibold mr-2">
                      3.5
                    </h4>
                    <div className="flex text-yellow-500">
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStarHalfAlt />
                      <FaRegStar />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <button className="bg-primary text-white py-2 px-4 rounded hover:bg-primary-600 transition">
                  Write a Review
                </button>
              </div>
            </div>
          </div>
          <div className="col-span-1 hidden md:block">
            <div className="sticky top-20 h-fit z-10">
              <EventInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSingle;
