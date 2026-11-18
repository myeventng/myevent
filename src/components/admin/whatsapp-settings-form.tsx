'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ExternalLink, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { saveWhatsappSettings } from '@/actions/whatsapp-actions';
import { queryKeys } from '@/lib/queries';
import { useUploadThing } from '@/lib/uploadthings';
import { WhatsappButtonView } from '@/components/layout/whatsapp-widget';
import {
  WHATSAPP_MAX_MESSAGE,
  WHATSAPP_MAX_NAME,
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
  const [contactName, setContactName] = useState(initial.contactName ?? '');
  const [contactImage, setContactImage] = useState(initial.contactImage ?? '');
  const fileInput = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing('whatsappAvatar', {
    onUploadError: (e) => {
      toast.error(e.message || 'Photo upload failed');
    },
  });
  const [saved, setSaved] = useState(initial);

  const normalized = normalizeWhatsappNumber(number);
  const numberLooksWrong = number.trim() !== '' && !normalized;
  const dirty =
    enabled !== saved.enabled ||
    (normalized ?? '') !== saved.number ||
    message.trim() !== saved.message ||
    contactName.trim() !== (saved.contactName ?? '') ||
    contactImage !== (saved.contactImage ?? '');

  async function onPickImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    const res = await startUpload([file]);
    const url = res?.[0]?.url;
    if (url) setContactImage(url);
    if (fileInput.current) fileInput.current.value = '';
  }

  function save() {
    startTransition(async () => {
      const res = await saveWhatsappSettings({ enabled, number, message, contactName, contactImage });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message ?? 'Saved');
      if (res.data) {
        setSaved(res.data);
        setNumber(res.data.number ? `+${res.data.number}` : '');
        setMessage(res.data.message);
        setContactName(res.data.contactName ?? '');
        setContactImage(res.data.contactImage ?? '');
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

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <p className="text-base font-medium">Who visitors chat with (optional)</p>
              <p className="text-sm text-muted-foreground">
                Add a name and photo so the button feels personal. Leave both empty for the plain
                green button.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-name">Name</Label>
              <Input
                id="wa-name"
                maxLength={WHATSAPP_MAX_NAME}
                placeholder="e.g. Amaka from MyEvent"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                {contactImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contactImage}
                    alt="Contact photo"
                    className="h-16 w-16 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-4 w-4" />
                    )}
                    {contactImage ? 'Change photo' : 'Upload photo'}
                  </Button>
                  {contactImage && (
                    <Button type="button" variant="ghost" onClick={() => setContactImage('')}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A square photo works best (up to 2 MB). Remember to press Save changes.
              </p>
            </div>
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
          <div className="relative flex h-40 items-end justify-end rounded-lg border bg-muted/40 p-3">
            {enabled && normalized ? (
              <span
                className={`group flex items-center rounded-full bg-[#25D366] text-white shadow-md ${
                  contactName.trim() || contactImage ? 'gap-2.5 p-1.5' : 'p-3.5'
                }`}
              >
                <WhatsappButtonView name={contactName} image={contactImage} />
              </span>
            ) : (
              <p className="mr-auto self-start p-1 text-sm text-muted-foreground">
                {enabled ? 'Add a number to show the button.' : 'The button is hidden.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
