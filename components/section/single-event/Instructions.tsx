import React from 'react';

export const Instructions = () => {
  return (
    <div className="flex text-gray-100 container py-6 items-center justify-center gap-4">
      <h2 className=" text-gray-700 font-semibold">Instructions:</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          <h3 className="font-bold text-gray-800">Age:</h3>
          <span className="text-gray-500">+18</span>
        </div>
        <div className="flex gap-1">
          <h3 className="font-bold text-gray-800">Dress Code:</h3>
          <span className="text-gray-500">Not Applicable</span>
        </div>
        <div className="flex gap-1">
          <h3 className="font-bold text-gray-800">ID:</h3>
          <span className="text-gray-500">Not Required</span>
        </div>
        <div className="flex gap-1">
          <h3 className="font-bold text-gray-800">Last Entry:</h3>
          <span className="text-gray-500">9.00pm</span>
        </div>
      </div>
    </div>
  );
};
