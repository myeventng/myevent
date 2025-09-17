'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues } from 'react-hook-form';
import { AgeRestriction, DressCode, EventType } from '@/generated/prisma';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { getCategories } from '@/actions/category-actions';
import { getTags, createTag } from '@/actions/tag.actions';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, Vote, Calendar } from 'lucide-react';

// Create different schemas based on event type
const standardEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  age: z.nativeEnum(AgeRestriction).optional(),
  dressCode: z.nativeEnum(DressCode).optional(),
  isFree: z.boolean().default(false),
  idRequired: z.boolean().default(false),
  attendeeLimit: z.number().optional(),
  url: z.string().url().optional().or(z.literal('')),
});

const votingContestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  url: z.string().url().optional().or(z.literal('')),
  // Voting contests don't need age restrictions, dress codes, attendance limits, etc.
});

type StandardFormValues = z.infer<typeof standardEventSchema>;
type VotingFormValues = z.infer<typeof votingContestSchema>;
type FormValues = StandardFormValues | VotingFormValues;

interface EventBasicInfoProps {
  formData: any;
  updateFormData: (data: Partial<FormValues>) => void;
  onNext: () => void;
}

export function EventBasicInfo({
  formData,
  updateFormData,
  onNext,
}: EventBasicInfoProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tag creation state
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Add selected tags state to trigger re-render
  const [selectedTags, setSelectedTags] = useState<string[]>(
    formData.tagIds || []
  );

  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

  // Use appropriate schema based on event type
  const schema = isVotingContest ? votingContestSchema : standardEventSchema;

  // Type assertion to fix the compatibility issue
  const form = useForm<FormValues & FieldValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: formData.title || '',
      description: formData.description || '',
      categoryId: formData.categoryId || '',
      tagIds: formData.tagIds || [],
      url: formData.url || '',
      ...(isStandardEvent && {
        age: formData.age || undefined,
        dressCode: formData.dressCode || undefined,
        isFree: formData.isFree || false,
        idRequired: formData.idRequired || false,
        attendeeLimit: formData.attendeeLimit || undefined,
      }),
    },
  });

  // Fetch categories and tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch categories
        const categoriesResponse = await getCategories();
        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

        // Fetch tags
        const tagsResponse = await getTags();
        if (tagsResponse.success && tagsResponse.data) {
          setTags(tagsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load categories and tags');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Clean up the values to ensure no undefined strings
    const cleanedValues = {
      ...values,
      categoryId: values.categoryId === '' ? undefined : values.categoryId,
      url: values.url === '' ? undefined : values.url,
      ...(isStandardEvent && {
        attendeeLimit:
          (values as StandardFormValues).attendeeLimit === 0
            ? undefined
            : (values as StandardFormValues).attendeeLimit,
      }),
    };

    updateFormData(cleanedValues);
    onNext();
  };

  // Toggle tag selection - FIXED
  const toggleTag = (tagId: string) => {
    const currentTags = form.getValues('tagIds') as string[];
    let newTags: string[];

    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter((id) => id !== tagId);
    } else {
      newTags = [...currentTags, tagId];
    }

    // Update both form state and local state to trigger re-render
    form.setValue('tagIds', newTags, { shouldValidate: true });
    setSelectedTags(newTags);
  };

  // Handle creating new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setIsCreatingTag(true);

      const response = await createTag({
        name: newTagName.trim(),
        bgColor: newTagColor,
      });

      if (response.success && response.data) {
        // Add new tag to the list
        setTags((prev) => [...prev, response.data]);

        // Auto-select the newly created tag
        const currentTags = form.getValues('tagIds') as string[];
        const newTagIds = [...currentTags, response.data.id];
        form.setValue('tagIds', newTagIds, {
          shouldValidate: true,
        });
        setSelectedTags(newTagIds);

        // Reset form
        setNewTagName('');
        setNewTagColor('#3b82f6');
        setShowCreateTag(false);

        toast.success('Tag created and added to your event!');
      } else {
        toast.error(response.message || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {isVotingContest ? (
            <Vote className="h-6 w-6 text-primary" />
          ) : (
            <Calendar className="h-6 w-6 text-primary" />
          )}
          <h2 className="text-2xl font-bold">
            {isVotingContest ? 'Voting Contest Details' : 'Event Details'}
          </h2>
        </div>
        <p className="text-muted-foreground">
          {isVotingContest
            ? 'Provide the basic information for your voting contest.'
            : 'Start by providing the basic information about your event.'}
        </p>
      </div>

      {isVotingContest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Vote className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">
                Voting Contest Event
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                You're creating a voting contest. This will be an online event
                where users can vote for contestants. Additional voting settings
                will be configured in later steps.
              </p>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isVotingContest ? 'Contest Title' : 'Event Title'}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      isVotingContest
                        ? 'e.g., Miss Universe Nigeria 2024'
                        : 'Enter event title'
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {isVotingContest
                    ? 'The title should clearly describe your contest.'
                    : 'The title should be catchy and descriptive.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isVotingContest
                    ? 'Contest Description'
                    : 'Event Description'}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={
                      isVotingContest
                        ? 'Describe your contest, voting rules, prizes, and other important information...'
                        : 'Describe your event...'
                    }
                    className="min-h-32"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {isVotingContest
                    ? 'Provide details about the contest, contestants, voting rules, and prizes.'
                    : 'Provide a detailed description of your event.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {isVotingContest
                      ? 'Categorize your contest to help voters find it.'
                      : 'Categorize your event to help attendees find it.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show these fields for standard events */}
            {isStandardEvent && (
              <>
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Restriction</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select age restriction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AgeRestriction).map((age) => (
                            <SelectItem key={age} value={age}>
                              {age.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set age restrictions for your event if applicable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dressCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dress Code</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select dress code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(DressCode).map((code) => (
                            <SelectItem key={code} value={code}>
                              {code.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set a dress code for your event if applicable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendeeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendee Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : parseInt(value, 10)
                            );
                          }}
                          value={field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of attendees (leave empty for unlimited).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isVotingContest
                    ? 'Contest Website URL'
                    : 'Event Website URL'}
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>
                  {isVotingContest
                    ? 'Optional website for your contest.'
                    : 'Optional website for your event.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div>
              <FormLabel htmlFor="tags">Tags (Optional)</FormLabel>
              <FormDescription>
                {isVotingContest
                  ? 'Select tags that describe your contest to help voters discover it.'
                  : 'Select tags that describe your event to help attendees discover it.'}
              </FormDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <div>Loading tags...</div>
              ) : (
                <>
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        style={{
                          backgroundColor: isSelected
                            ? tag.bgColor
                            : 'transparent',
                          color: isSelected ? 'white' : 'black',
                          borderColor: tag.bgColor,
                          borderWidth: '1px',
                        }}
                        className="cursor-pointer px-3 py-1 hover:opacity-80 transition-opacity"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </>
              )}
            </div>

            {/* Quick Tag Creation */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateTag(!showCreateTag)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create New Tag
              </Button>
              <span className="text-sm text-muted-foreground">
                Can&apos;t find the right tag? Create one!
              </span>
            </div>

            {showCreateTag && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <h4 className="font-medium">Create New Tag</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tag Name</label>
                    <Input
                      placeholder="e.g., Beauty Contest, Music"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 h-10"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                      />
                      <Input
                        placeholder="#3b82f6"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || isCreatingTag}
                    >
                      {isCreatingTag ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateTag(false);
                        setNewTagName('');
                        setNewTagColor('#3b82f6');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                {newTagName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Preview:</span>
                    <Badge
                      style={{ backgroundColor: newTagColor, color: 'white' }}
                    >
                      {newTagName}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Only show these checkboxes for standard events */}
          {isStandardEvent && (
            <div className="flex items-center space-x-8">
              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Free Event</FormLabel>
                      <FormDescription>
                        Check if this is a free event.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>ID Required</FormLabel>
                      <FormDescription>
                        Check if attendees need to bring ID.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit">Next Step</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
