import { TiInputChecked } from 'react-icons/ti';

interface FormFailMsgProps {
  message?: string;
}
const FormSuccessMsg = ({ message }: FormFailMsgProps) => {
  if (!message) return null;
  return (
    <div className="bg-emerald-500/15 p-3 flex rounded-md items-center gap-x-2 text-sm text-emerald-500">
      <TiInputChecked className="size-4" />
      <p>{message}</p>
    </div>
  );
};

export default FormSuccessMsg;
