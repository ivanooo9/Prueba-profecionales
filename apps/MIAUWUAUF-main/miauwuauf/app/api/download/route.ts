import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'archivo';
    const inline = searchParams.get('inline') === 'true';

    if (!fileUrl) {
      return new NextResponse('URL de archivo faltante', { status: 400 });
    }

    // Seguridad: permitir únicamente URLs de Cloudinary
    if (!fileUrl.startsWith('https://res.cloudinary.com/') && !fileUrl.startsWith('http://res.cloudinary.com/')) {
      return new NextResponse('Acceso no permitido a este dominio', { status: 403 });
    }

    // Firmar la URL de Cloudinary si es de Cloudinary para evitar 401 de PDFs restringidos
    let targetUrl = fileUrl;
    try {
      const urlObj = new URL(fileUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      
      if (parts.length >= 4 && urlObj.hostname === 'res.cloudinary.com') {
        const resourceType = parts[1]; // e.g. 'image', 'raw'
        const deliveryType = parts[2]; // e.g. 'upload'
        
        let remainingParts = parts.slice(3);
        let version: string | undefined = undefined;
        
        if (remainingParts[0].startsWith('v') && /^\d+$/.test(remainingParts[0].slice(1))) {
          version = remainingParts[0].slice(1);
          remainingParts = remainingParts.slice(1);
        }
        
        const fullPathWithExt = remainingParts.join('/');
        
        let publicId = fullPathWithExt;
        let format: string | undefined = undefined;
        
        if (resourceType !== 'raw') {
          const lastDotIndex = fullPathWithExt.lastIndexOf('.');
          if (lastDotIndex !== -1) {
            publicId = fullPathWithExt.slice(0, lastDotIndex);
            format = fullPathWithExt.slice(lastDotIndex + 1);
          }
        }
        
        // Generar URL firmada
        targetUrl = cloudinary.url(publicId, {
          resource_type: resourceType,
          type: deliveryType,
          secure: true,
          sign_url: true,
          version: version,
          format: resourceType !== 'raw' ? format : undefined,
        });
      }
    } catch (err) {
      console.error('Error al firmar la URL de Cloudinary:', err);
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new NextResponse('Error al obtener el archivo', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (contentType === 'application/octet-stream' || !contentType) {
      if (fileUrl.toLowerCase().split('?')[0].endsWith('.pdf') || filename.toLowerCase().endsWith('.pdf') || fileUrl.includes("/raw/upload/")) {
        contentType = 'application/pdf';
      }
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    let finalFilename = filename.trim();
    const urlPath = new URL(fileUrl).pathname;
    const extension = urlPath.slice(((urlPath.lastIndexOf(".") - 1) >>> 0) + 2);
    if (extension && !finalFilename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
      finalFilename = `${finalFilename}.${extension}`;
    }

    const safeFilename = encodeURIComponent(finalFilename);
    const disposition = inline ? 'inline' : 'attachment';
    headers.set('Content-Disposition', `${disposition}; filename*=UTF-8''${safeFilename}`);

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error en proxy de descarga/vista:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
