import React, { useRef, useState } from 'react';
import { Edit2, Camera, Coins, Loader2, LogOut } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { uploadAvatar } from '@/lib/avatarUpload';
import { useNavigate } from 'react-router-dom';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function ProfileCard({ onEdit }) {
  const { user, updateUser, tokenBalance, clearUser } = useUser();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await clearUser();
    navigate('/');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await updateUser({ avatarUrl: url });
    } catch (err) {
      console.error('[Avatar upload]', err);
      setUploadError(err.message || 'Unknown error.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-200 dark:border-[#334155]/50 relative shadow-sm mb-6">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="bg-slate-100 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors scale-on-click"
        >
          <Edit2 size={12} /> Edit
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Log out"
          className="bg-slate-100 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] hover:text-red-500 dark:hover:text-red-400 rounded-lg px-2.5 py-1.5 flex items-center transition-colors scale-on-click"
        >
          {loggingOut
            ? <Loader2 size={12} className="animate-spin" />
            : <LogOut size={12} />
          }
        </button>
      </div>

      {/* Avatar */}
      <div className="relative mb-4">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative w-[72px] h-[72px] rounded-full overflow-hidden group focus:outline-none"
          title="Change photo"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#22C55E] flex items-center justify-center text-[24px] font-medium text-[#052e16]">
              {getInitials(user.name)}
            </div>
          )}
          {/* Overlay: toujours visible pendant l'upload, sinon seulement au hover */}
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {uploading
              ? <Loader2 size={22} className="text-white animate-spin" />
              : <Camera size={18} className="text-white" />
            }
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mb-3 text-center">
          <p className="text-[12px] text-red-600 dark:text-red-400 font-medium">{uploadError}</p>
        </div>
      )}

      <h1 className="text-[20px] font-medium text-slate-900 dark:text-white mb-1">{user.name}</h1>
      <p className="text-[13px] text-slate-500 dark:text-[#94A3B8] mb-4">
        {user.level} · {user.subjects.length} {user.subjects.length === 1 ? 'Subject' : 'Subjects'}
      </p>

      {/* Token balance or Free Plan */}
      <div className="flex flex-col items-center gap-1">
        {tokenBalance !== null ? (
          <>
            <span className="bg-slate-100 dark:bg-[#334155]/50 border border-slate-200 dark:border-[#475569] text-slate-700 dark:text-[#F1F5F9] px-3.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5">
              <Coins size={11} className="text-[#22C55E]" />
              {tokenBalance} token{tokenBalance !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => navigate('/pricing')}
              className="text-[#F97316] text-[11px] underline mt-1"
            >
              Buy tokens
            </button>
          </>
        ) : (
          <>
            <span className="bg-slate-100 dark:bg-[#334155]/50 border border-slate-200 dark:border-[#475569] text-slate-700 dark:text-[#F1F5F9] px-3.5 py-1 rounded-full text-[11px] font-medium">
              Free Plan
            </span>
            <button
              onClick={() => navigate('/pricing')}
              className="text-[#F97316] text-[11px] underline mt-1"
            >
              Upgrade for unlimited AI · 3 500 FCFA/mo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
