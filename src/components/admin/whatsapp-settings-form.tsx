'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { saveWhatsappSettings } from '@/actions/whatsapp-actions';
import { queryKeys } from '@/lib/queries';
import {
  WHATSAPP_MAX_MESSAGE,
  normalizeWhatsappNumber,
  whatsappLink,
  type WhatsappSettings,
} from '@/lib/whatsapp';
import { formatLagosTime } from '@/lib/utils';

export function WhatsappSettingsForm({ initial }: { initial: WhatsappSettings }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [number, setNumber] = useState(initial.number ? `+${initial.number}` : '');
  const [message, setMessage] = useState(initial.message);
  const [saved, setSaved] = useState(initial);

  const normalized = normalizeWhatsappNumber(number);
  const numberLooksWrong = number.trim() !== '' && !normalized;
  const dirty =
    enabled !== saved.enabled ||
    (normalized ?? '') !== saved.number ||
    message.trim() !== saved.message;

  function save() {
    startTransition(async () => {
      const res = await saveWhatsappSettings({ enabled, number, message });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message ?? 'Saved');
      if (res.data) {
        setSaved(res.data);
        setNumber(res.data.number ? `+${res.data.number}` : '');
        setMessage(res.data.message);
      }
      // the visitor-facing copy saved in this browser is now out of date
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Chat button</CardTitle>
          <CardDescription>
            Admins and staff can change this. Changes reach visitors within about 10 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="wa-enabled" className="text-base">
                Show the button on the site
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn off to hide it without losing the number.
              </p>
            </div>
            <Switch id="wa-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-number">WhatsApp number</Label>
            <Input
              id="wa-number"
              inputMode="tel"
              autoComplete="off"
              placeholder="+234 801 234 5678"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              aria-invalid={numberLooksWrong}
            />
            <p className={`text-sm ${numberLooksWrong ? 'text-destructive' : 'text-muted-foreground'}`}>
              {numberLooksWrong
                ? 'That does not look like a phone number. Include the country code, or start with 0 for a Nigerian number.'
                : normalized
                  ? `Visitors will chat with +${normalized}.`
                  : 'Include the country code. A number starting with 0 is read as Nigerian (+234).'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-message">First message</Label>
            <Textarea
              id="wa-message"
              rows={3}
              maxLength={WHATSAPP_MAX_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Already typed into the chat when a visitor opens it. {message.length}/{WHATSAPP_MAX_MESSAGE}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={pending || !dirty || numberLooksWrong}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
            {normalized && (
              <Button asChild variant="outline">
                <a href={whatsappLink(normalized, message)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Test the chat link
                </a>
              </Button>
            )}
          </div>

          {saved.updatedAt && (
            <p className="text-sm text-muted-foreground">
              Last changed {formatLagosTime(saved.updatedAt, 'd MMM yyyy, p')}
              {saved.updatedBy ? ` by ${saved.updatedBy}` : ''}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Bottom right of every public page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-40 rounded-lg border bg-muted/40">
            {enabled && normalized ? (
              <span className="absolute bottom-3 right-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md">
                <MessageCircle className="h-7 w-7" aria-hidden="true" />
              </span>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                {enabled ? 'Add a number to show the button.' : 'The button is hidden.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
