'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTag,
  getAllTags,
  editTag,
  deleteTag,
} from '@/lib/actions/tag.actions';

interface Tag {
  id: string;
  name: string;
  slug: string | null;
  bgColor: string | null;
}

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

const newTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name is too long'),
});

type NewTagFormValues = z.infer<typeof newTagSchema>;

export const TagManager = ({
  selectedTags,
  onTagsChange,
  disabled = false,
}: TagManagerProps) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  const form = useForm<NewTagFormValues>({
    resolver: zodResolver(newTagSchema),
    defaultValues: { name: '' },
  });

  const toggleTag = (tagId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!disabled) {
      const newSelectedTags = selectedTags.includes(tagId)
        ? selectedTags.filter((id) => id !== tagId)
        : [...selectedTags, tagId];
      onTagsChange(newSelectedTags);
    }
  };

  const handleAddOrEditTag = async (data: NewTagFormValues) => {
    if (disabled) return;
    setLoading(true);
    try {
      if (editingTag) {
        const updatedTag = await editTag(editingTag.id, data.name);
        setAllTags(
          allTags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
        );
      } else {
        const newTag = await createTag(data.name);
        setAllTags([...allTags, newTag]);
        onTagsChange([...selectedTags, newTag.id]);
      }
      form.reset();
      setIsAddingNew(false);
      setEditingTag(null);
    } catch (error) {
      console.error('Error processing tag:', error);
      form.setError('name', {
        type: 'manual',
        message: 'Failed to process tag',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    setLoading(true);
    try {
      await deleteTag(id);
      // Remove from selected tags if it was selected
      if (selectedTags.includes(id)) {
        onTagsChange(selectedTags.filter((tagId) => tagId !== id));
      }
      setAllTags(allTags.filter((tag) => tag.id !== id));
    } catch (error) {
      console.error('Error deleting tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tag: Tag, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setEditingTag(tag);
    setIsAddingNew(true);
    form.setValue('name', tag.name);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <div
            className="flex items-center py-1 px-2 bg-gray-50 rounded-lg mr-1"
            key={tag.id}
          >
            <Badge
              variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
              className={`cursor-pointer py-1 px-2 rounded-lg ${
                selectedTags.includes(tag.id) && tag.bgColor ? tag.bgColor : ''
              }`}
              onClick={(e) => toggleTag(tag.id, e)}
            >
              {tag.name}
            </Badge>
            {!disabled && (
              <span
                className="ml-2 flex gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit
                  size={14}
                  className="cursor-pointer text-blue-600"
                  onClick={(e) => handleEditClick(tag, e)}
                />
                <Trash
                  size={14}
                  className="cursor-pointer text-red-600"
                  onClick={(e) => handleDeleteTag(tag.id, e)}
                />
              </span>
            )}
          </div>
        ))}
      </div>

      {!isAddingNew ? (
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsAddingNew(true);
          }}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          <Plus size={16} className="mr-2" /> Add Tag
        </Button>
      ) : (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={form.watch('name')}
            onChange={(e) => form.setValue('name', e.target.value)}
            placeholder="Enter tag name"
            disabled={loading || disabled}
            autoFocus
          />
          <Button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await form.handleSubmit(handleAddOrEditTag)();
            }}
            disabled={loading || disabled}
            size="sm"
          >
            {loading ? 'Saving...' : editingTag ? 'Update' : 'Add'}
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsAddingNew(false);
              setEditingTag(null);
              form.reset();
            }}
            disabled={loading || disabled}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      )}
      {form.formState.errors.name && (
        <p className="text-sm text-red-500 mt-1">
          {form.formState.errors.name.message}
        </p>
      )}
    </div>
  );
};
