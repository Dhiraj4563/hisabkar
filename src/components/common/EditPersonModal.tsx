import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Person } from '../../types';
import { db } from '../../db/database';
import { Check, AlertCircle } from 'lucide-react';

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  onSuccess?: () => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  onClose,
  person,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (person && isOpen) {
      setName(person.name);
      setNickname(person.nickname || '');
      setPhone(person.phone || '');
      setEmail(person.email || '');
      setNotes(person.notes || '');
      setErrorMessage('');
    }
  }, [person, isOpen]);

  if (!person) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Person name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await db.people.put({
        ...person,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update person details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Contact"
      description="Correct name, nickname, or contact details if entered incorrectly."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Input
          label="Full Name"
          required
          placeholder="e.g. Rahul Sharma"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <Input
          label="Nickname / Known As"
          placeholder="e.g. Rahul Gym"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <Input
            label="Email"
            placeholder="rahul@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <Input
          label="Notes"
          placeholder="Work colleague, college friend..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
