'use client';

import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import BtnSlideEffect from '../shared/BtnSlideEffect';

const categories = [
  'All Categories',
  'Music',
  'Sports',
  'Arts',
  'Tech',
  'Business',
];

export default function HomeSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const handleSearch = () => {
    console.log('Search Term:', searchTerm);
    console.log('Selected Category:', selectedCategory);
  };

  return (
    <div className="py-4 bg-secondary-500">
      <div className="flex flex-col md:flex-row items-center p-6  px-6 max-w-5xl mx-auto">
        <div className="relative flex-grow w-full">
          <input
            type="text"
            placeholder="Search for events"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 text-gray-700 bg-white border border-gray-300 focus:outline-none focus:ring-2 h-[52px]"
          />
          <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500 text-xl" />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-auto px-4 py-3 bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 h-[52px] md:max-w-md"
        >
          {categories.map((category, index) => (
            <option key={index} value={category}>
              {category}
            </option>
          ))}
        </select>

        <BtnSlideEffect text="Search" path="/events" />
      </div>
    </div>
  );
}
