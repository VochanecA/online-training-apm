import React, { useState } from 'react';
import { Upload, FileText, Video, File, X, Check } from 'lucide-react';

interface MaterialUploadProps {
  onUploadComplete: (url: string, fileName: string, fileType: 'pdf' | 'video' | 'pptx') => void;
  acceptedTypes?: string;
}

export const MaterialUpload: React.FC<MaterialUploadProps> = ({ 
  onUploadComplete,
  acceptedTypes = ".pdf,.mp4,.pptx,.ppt"
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validacija tipa fajla
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let materialType: 'pdf' | 'video' | 'pptx';

      if (fileExtension === 'pdf') {
        materialType = 'pdf';
      } else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(fileExtension || '')) {
        materialType = 'video';
      } else if (['ppt', 'pptx'].includes(fileExtension || '')) {
        materialType = 'pptx';
      } else {
        throw new Error('Nepodržan tip fajla. Dozvoljeni: PDF, Video (MP4, AVI, MOV, WMV), PowerPoint');
      }

      // Validacija veličine (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('Fajl je prevelik. Maksimalna veličina je 50MB.');
      }

      // Upload na Supabase Storage
      const { supabase } = await import('../lib/supabase');
      
      // Kreiranje bezbednog naziva fajla
      const timestamp = Date.now();
      
      // Čistimo naziv fajla od specijalnih karaktera
      const safeFileName = file.name
        .replace(/[/\\?%*:|"<>]/g, '-')  // Zameni specijalne karaktere sa -
        .replace(/\s+/g, '_')            // Zameni razmake sa _
        .normalize('NFD')                // Ukloni dijakritičke znakove
        .replace(/[\u0300-\u036f]/g, '')
        .substring(0, 100); // Ograniči dužinu
      
      // Koristimo let umesto const da možemo reasign-ovati
      let filePath = `${timestamp}_${safeFileName}`;
      
      console.log('Uploading file:', {
        originalName: file.name,
        safeName: safeFileName,
        filePath: filePath,
        size: file.size,
        type: file.type
      });

      // Upload fajla - koristimo let za data
      let uploadData: any;
      const { data, error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      uploadData = data;

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        
        // Ako je greška zbog postojećeg fajla, dodajte nasumični string
        if (uploadError.message.includes('already exists') || 
            uploadError.message.includes('duplicate') || 
            uploadError.message.includes('Invalid key')) {
          
          const randomString = Math.random().toString(36).substring(2, 10);
          const newFilePath = `${timestamp}_${randomString}_${fileExtension}`;
          
          console.log('Retrying with new filename:', newFilePath);
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('materials')
            .upload(newFilePath, file, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (retryError) {
            console.error('Retry error:', retryError);
            throw new Error(`Greška pri upload-u: ${retryError.message}`);
          }
          
          uploadData = retryData;
          filePath = newFilePath;
        } else {
          throw new Error(`Greška pri upload-u: ${uploadError.message}`);
        }
      }

      // Dobijanje javnog URL-a
      const { data: urlData } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Nije moguće dobiti URL fajla');
      }

      console.log('Upload successful:', {
        url: urlData.publicUrl,
        path: filePath
      });

      // Pozovi callback sa URL-om
      onUploadComplete(urlData.publicUrl, file.name, materialType);
      
      setSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      // Reset input
      event.target.value = '';
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Greška pri upload-u fajla');
    } finally {
      setUploading(false);
    }
  };

  const getIcon = () => {
    if (acceptedTypes.includes('.pdf')) return <FileText className="h-5 w-5" />;
    if (acceptedTypes.includes('.mp4')) return <Video className="h-5 w-5" />;
    if (acceptedTypes.includes('.pptx')) return <File className="h-5 w-5" />;
    return <Upload className="h-5 w-5" />;
  };

  return (
    <div className="space-y-2">
      <label className="relative cursor-pointer">
        <input
          type="file"
          accept={acceptedTypes}
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="material-upload-input"
        />
        <div className={`
          flex items-center justify-center gap-2 px-4 py-3 
          border-2 border-dashed rounded-lg
          transition-colors duration-200
          ${uploading 
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
            : success
            ? 'border-green-300 bg-green-50'
            : 'border-sky-300 bg-sky-50 hover:bg-sky-100 hover:border-sky-400'
          }
        `}>
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
              <span className="text-sm text-gray-600">Uploadovanje...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Fajl uspešno uploadovan!
              </span>
            </>
          ) : (
            <>
              {getIcon()}
              <span className="text-sm text-sky-700 font-medium">
                Klikni za upload fajla
              </span>
            </>
          )}
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-fadeIn">
          <X className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Podržani formati:</span> PDF, Video (MP4, AVI, MOV), PowerPoint (PPT/PPTX)
        </p>
        <p className="text-xs text-gray-500">
          <span className="font-medium">Maksimalna veličina:</span> 50MB
        </p>
        <p className="text-xs text-gray-400 italic">
          Fajlovi se automatski preimenuju radi bezbednosti
        </p>
      </div>
    </div>
  );
};