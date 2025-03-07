'use client';
import React from 'react';

import * as z from 'zod';
import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetSchema } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import FormSuccessMsg from '../shared/FormSuccessMsg';
import FormFailMsg from '../shared/FormFailMsg';
import { reset } from '@/lib/actions/reset.action';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';

export function ResetForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const form = useForm<z.infer<typeof ResetSchema>>({
    resolver: zodResolver(ResetSchema),
    defaultValues: {
      email: '',
    },
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>('');
  const onsubmit = (values: z.infer<typeof ResetSchema>) => {
    setError('');
    setSuccess('');
    startTransition(() => {
      reset(values).then((data) => {
        if (data.error) {
          setError(data.error);
          setSuccess('');
        } else if (data.success) {
          setSuccess(data.success);
          setError('');
        }
      });
    });
  };
  const onClickGoogleBtn = (provider: 'google') => {
    signIn(provider, {
      callbackUrl: DEFAULT_LOGIN_REDIRECT,
    });
  };
  return (
    <div>
      {' '}
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-1">
            <Form {...form}>
              <form
                className="p-6 md:p-8"
                onSubmit={form.handleSubmit(onsubmit)}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-balance text-muted-foreground ">
                      Enter your email to reset your password
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="eg emekajohn@gmail.com"
                              {...field}
                              type="email"
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormSuccessMsg message={success} />
                  <FormFailMsg message={error} />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      'Send Reset Password'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetForm;
