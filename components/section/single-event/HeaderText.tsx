import { ReactElement } from 'react';

interface HeaderTextProps {
  icon: ReactElement;
  text: string;
}

// Change this line to properly type the component
const HeaderText = ({ icon, text }: HeaderTextProps) => {
  return (
    <div className="flex gap-3 text-primary-500 text-3xl font-extrabold items-center">
      {icon}
      <h1>{text}</h1>
    </div>
  );
};

export default HeaderText;
