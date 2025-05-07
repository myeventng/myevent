import React from 'react';

const PagesHero = ({ header, text }: { header: string; text: string }) => {
  return (
    <section className="relative md:h-[40vh] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-70 transition-all duration-300"></div>

      <div className="relative z-10 text-center text-white">
        <h2 className="text-6xl font-bold">{header}</h2>
        <p className="text-3xl">{text}</p>
      </div>
    </section>
  );
};

export default PagesHero;
