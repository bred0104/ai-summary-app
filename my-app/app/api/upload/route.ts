// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

type UploadResponse = {
  ok: boolean;
  message: string;
  fileUrl?: string;
  filePath?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: '未选择文件' }, { status: 400 });
    }

    // 文件大小限制 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: '文件大小不能超过10MB' }, { status: 413 });
    }

    // 生成安全文件名
    const ext = file.name.split('.').pop() || 'pdf';
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;
    const filePath = `uploads/${safeFileName}`;

    // 上传到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ai-summary-app')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // 获取公开 URL
    const { data: publicUrlData } = supabase.storage
      .from('ai-summary-app')
      .getPublicUrl(filePath);

    return NextResponse.json({
      ok: true,
      message: '文件上传成功',
      fileUrl: publicUrlData.publicUrl,
      filePath: filePath,
    });
  } catch (err: any) {
    console.error('上传失败:', err);
    return NextResponse.json({ ok: false, message: `上传失败：${err.message}` }, { status: 500 });
  }
}