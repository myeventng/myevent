import React from 'react';

const HeaderText = ({ text }: { text: string }) => {
  return (
    <div>
      <h1 className="md:text-5xl text-3xl font-bold wrapper text-center p-4">
        {text}
      </h1>
    </div>
  );
};

export default HeaderText;
