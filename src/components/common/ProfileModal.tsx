import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AppSettings } from '../../types';
import { db } from '../../db/database';
import { Camera, Trash2, Check, User, Upload, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings;
}

// Built-in avatar presets for quick selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, settings }) => {
  const [ownerName, setOwnerName] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings && isOpen) {
      setOwnerName(settings.ownerName || 'User');
      setProfileImage(settings.ownerProfileImage);
    }
  }, [settings, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 4MB for localStorage/IndexedDB performance
    if (file.size > 4 * 1024 * 1024) {
      alert('Please choose an image under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSaving(true);
      await db.settings.put({
        ...settings,
        ownerName: ownerName.trim() || 'User',
        ownerProfileImage: profileImage || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save profile image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setProfileImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      description="Update your profile photo and display name."
      maxWidth="sm"
    >
      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Photo Preview & Upload */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative group">
            {profileImage ? (
              <img
                src={profileImage}
                alt={ownerName}
                className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-zinc-950 font-bold text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                {ownerName ? ownerName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer gap-1"
              title="Upload new image"
            >
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-medium">Change</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex items-center gap-2 mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Upload Photo
            </Button>
            {profileImage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemovePhoto}
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Preset Avatars */}
        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          <span className="text-zinc-400 font-medium flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Or choose an avatar preset:</span>
          </span>
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            {PRESET_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProfileImage(url)}
                className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                  profileImage === url
                    ? 'border-emerald-400 scale-110 shadow-md shadow-emerald-500/25'
                    : 'border-zinc-700/60 hover:border-zinc-500 opacity-80 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Display Name Input */}
        <div>
          <Input
            label="Display Name"
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            placeholder="e.g. Dhiraj"
            required
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Save Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
};
