'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PulseLoader } from 'react-spinners';
import { newVerification } from '@/lib/actions/new-verification.action';
import FormFailMsg from '@/components/shared/FormFailMsg';
import FormSuccessMsg from '@/components/shared/FormSuccessMsg';
import Link from 'next/link';

const NewVerification = () => {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const onSubmit = useCallback(() => {
    if (success || error) {
      return;
    }
    if (!token) {
      setError('Missing Token!');
      return;
    }
    newVerification(token)
      .then((data) => {
        setSuccess(data.success);
        setError(data.error);
      })
      .catch(() => {
        setError('Something went wrong!');
      });
  }, [token, success, error]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <div className="flex flex-col gap-5 items-center justify-center p-7 rounded-md bg-white">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      {!success && !error && <PulseLoader />}

      {!success && <FormFailMsg message={error} />}
      <FormSuccessMsg message={success} />
      <Link className="myevent-btn" href="/login">
        Back to login
      </Link>
    </div>
  );
};

export default NewVerification;
