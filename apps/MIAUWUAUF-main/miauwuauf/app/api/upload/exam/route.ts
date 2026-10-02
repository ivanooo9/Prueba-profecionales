import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/auth';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isPdf = typeof file !== 'string' && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

    // Upload to Cloudinary using a stream with resource_type: "raw" for PDFs and "image" for others
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'miauwuauf/examenes',
          resource_type: isPdf ? 'raw' : 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const result = uploadResult as { secure_url?: string; url?: string; format?: string; original_filename?: string }
    return NextResponse.json({
      secure_url: result.secure_url,
      url: result.secure_url ?? result.url,
      format: result.format,
      original_filename: result.original_filename
    });
  } catch (error) {
    console.error('Error al subir a Cloudinary (Examen):', error);
    return NextResponse.json({ error: 'Fallo al subir archivo' }, { status: 500 });
  }
}
