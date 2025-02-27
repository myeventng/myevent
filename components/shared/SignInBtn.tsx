'use client';

import { useRouter } from 'next/navigation';

interface SignInBtnProps {
  children: React.ReactNode;
  mode?: 'model' | 'redirect';
  asChild?: boolean;
}

const SignInBtn = ({
  children,
  mode = 'redirect',
  asChild,
}: SignInBtnProps) => {
  const router = useRouter();
  const onClick = () => {
    router.push('/signin');
  };
  if (mode === 'model') {
    return <span>kckcdb</span>;
  }
  return (
    <span onClick={onClick} className="cursor-pointer">
      {children}
    </span>
  );
};

export default SignInBtn;
