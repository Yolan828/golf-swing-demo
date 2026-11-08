'use client';

import React, { useEffect, useRef } from 'react';

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
}

/** Shows an image Blob and releases its object URL when the Blob changes or the image unmounts. */
export function BlobImage({ blob, alt, className }: BlobImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(blob);
    image.src = url;
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return <img ref={imageRef} alt={alt} className={className} />;
}
