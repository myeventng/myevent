import React, { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ImageItem {
  id: number;
  src: string;
  alt: string;
}

const ImageGallery: React.FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const images: ImageItem[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    src: `/image1.jpg`,
    alt: `Event image ${i + 1}`,
  }));

  const openModal = (index: number): void => {
    setCurrentImageIndex(index);
    setShowModal(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  };

  const closeModal = (): void => {
    setShowModal(false);
    document.body.style.overflow = 'auto'; // Enable scrolling again
  };

  const nextImage = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <>
      {/* Grid of thumbnail images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
            onClick={() => openModal(index)}
          >
            <Image src={image.src} alt={image.alt} fill objectFit="cover" />
          </div>
        ))}
      </div>

      {/* YouTube video */}
      {/* <div className="mt-4 rounded-lg overflow-hidden">
        <div className="aspect-w-16 aspect-h-9">
          <iframe
            className="w-full h-64"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div> */}

      {/* Full screen modal for image viewing */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 focus:outline-none"
            onClick={closeModal}
          >
            <FaTimes />
          </button>

          {/* Navigation buttons */}
          <button
            className="absolute left-4 text-white text-3xl hover:text-gray-300 focus:outline-none"
            onClick={prevImage}
          >
            <FaChevronLeft />
          </button>

          <button
            className="absolute right-4 text-white text-3xl hover:text-gray-300 focus:outline-none"
            onClick={nextImage}
          >
            <FaChevronRight />
          </button>

          {/* Current image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[currentImageIndex].src}
              alt={images[currentImageIndex].alt}
              fill
              objectFit="contain"
            />

            {/* Image counter */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
