import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
    existingImageBlob?: Blob;
    onImageSelected: (blob: Blob | null) => void;
}

export const ImageUploader = ({ existingImageBlob, onImageSelected }: ImageUploaderProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        existingImageBlob ? URL.createObjectURL(existingImageBlob) : null
    );
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        onImageSelected(file);
    }, [onImageSelected]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const clearImage = () => {
        setPreviewUrl(null);
        onImageSelected(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-3">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
            />

            {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                        src={previewUrl}
                        alt="Garment preview"
                        className="w-full h-48 object-cover"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={clearImage}
                        className="absolute top-2 right-2 h-8 w-8"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <div
                    onClick={triggerFileInput}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                        }
          `}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Upload garment image</p>
                            <p className="text-xs text-muted-foreground">
                                Drag & drop or click to browse
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};