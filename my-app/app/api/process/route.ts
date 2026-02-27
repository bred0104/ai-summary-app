// app/api/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse-fork'; 
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase（如果需要存储文件）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. 解析 FormData 获取文件
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, message: '未选择文件' }, { status: 400 });
    }

    // 2. 检查文件类型（只处理 PDF）
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ ok: false, message: '仅支持 PDF 文件' }, { status: 400 });
    }

    // 3. 提取 PDF 文本
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch (parseErr) {
      console.error('PDF解析失败:', parseErr);
      return NextResponse.json(
        { ok: false, message: 'PDF 解析失败，可能文件损坏或受密码保护' },
        { status: 422 }
      );
    }

    // 4. 调用 DeepSeek 生成摘要
    let summary = '';
    try {
      const deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的文档摘要助手。请根据用户提供的文本，生成一份简洁、准确、结构清晰的摘要。',
            },
            { role: 'user', content: extractedText },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!deepseekRes.ok) {
        const errorData = await deepseekRes.json();
        throw new Error(errorData.error?.message || 'DeepSeek API 错误');
      }

      const data = await deepseekRes.json();
      summary = data.choices[0]?.message?.content || '';
    } catch (aiErr: any) {
      console.error('摘要生成失败:', aiErr);
      summary = `摘要生成失败: ${aiErr.message}`; // 仍返回部分信息，或可返回空
    }

    // 5. (可选) 将文件保存到 Supabase Storage
    let fileUrl = '';
    let filePath = '';
    try {
      const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.pdf`;
      filePath = `uploads/${safeFileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('ai-summary-app')
        .upload(filePath, file, { contentType: file.type });
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('ai-summary-app')
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        console.error('文件存储失败:', uploadErr);
      }
    } catch (storageErr) {
      console.error('存储异常:', storageErr);
      // 不中断流程，仍返回提取和摘要结果
    }

    // 6. 返回结果
    return NextResponse.json({
      ok: true,
      message: '处理成功',
      extractedText,
      summary,
      fileUrl,   // 可能为空
      filePath,  // 可能为空
    });
  } catch (err: any) {
    console.error('处理失败:', err);
    return NextResponse.json(
      { ok: false, message: `处理失败: ${err.message}` },
      { status: 500 }
    );
  }
}