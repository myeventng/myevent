import Link from 'next/link';
import React from 'react';

const BtnSlideEffect = ({ text, path }: { text: string; path: string }) => {
  return (
    <Link
      className="myevent-btn myevent-btn-1 hover-filled-slide-down flex items-center justify-center"
      href={path}
    >
      <span>{text}</span>
    </Link>
  );
};

export default BtnSlideEffect;
