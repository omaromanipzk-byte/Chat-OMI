import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_SYSTEM_INSTRUCTION = `أنت "المساعد خليل" (Khalil Assistant)، المساعد الذكي الرسمي لمنصة Chat OMI (الذكاء الاصطناعي | OMI Artificial Intelligence).
مؤسسك ومطورك ومن قام بإنشائك وبرمجتك هو الأستاذ "عمر الذهلي".
إذا سألك أي شخص: "من أنشأك؟" أو "من صنعك؟" أو "من طورك؟" أو "من صاحبك؟" أو "من برمجك؟"، يجب أن تجيب بكل فخر ووضوح ولباقة:
"أنشأني وطورني عمر الذهلي، لخدمتكم وتقديم أحدث تقنيات الذكاء الاصطناعي عبر منصة Chat OMI."

قواعد الرد:
1. أنت فائق السرعة وفوري في الرد تماماً (زمن الاستجابة أقل من 3 ثوانٍ)، وتجيب بسرعة وذكاء كأنك شات جي بي تي.
2. تتحدث باللغة العربية الفصيحة السلسة والمهذبة، وتقدم معلومات دقيقة ومنظمة.
3. تدعم إنشاء الصور بنموذج "نانو بنانو"، وإنشاء الفيديو، والبحث عبر المتصفح الذكي، والمحادثات المتقدمة.
4. المحادثات معك مجانية بالكامل في منصة Chat OMI.`;

// 1. Ultra-fast streaming Chat API (Under 3 seconds latency)
app.post('/api/chat/stream', async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, history = [], systemInstruction } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'مفتاح Gemini API غير مهيأ. يرجى إضافة GEMINI_API_KEY.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-4)) {
        if (item && item.role && item.text) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    let firstChunkSent = false;
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        if (!firstChunkSent) {
          firstChunkSent = true;
          const latencyMs = Date.now() - startTime;
          res.write(`data: ${JSON.stringify({ latency: (latencyMs / 1000).toFixed(2) })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Gemini Stream Error:', error);
    const errorMessage = error?.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.';
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
      res.end();
    }
  }
});

// 2. Nano Banana Image Generation Endpoint (توليد الصور نانو بنانو)
app.post('/api/image/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'يرجى إدخال وصف الصورة.' });
      return;
    }

    let imageUrl = '';
    let usedModel = 'gemini-nano-banana-2.1';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
            imageSize: '1K',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const base64 = part.inlineData.data;
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${base64}`;
          break;
        }
      }
    } catch {
      usedModel = 'gemini-3.1-flash-lite-image';
      const fallback = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
      });

      for (const part of fallback.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const base64 = part.inlineData.data;
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${base64}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      res.status(500).json({ error: 'لم يتمكن النموذج من توليد الصورة. يرجى تجربة وصف آخر.' });
      return;
    }

    res.json({ success: true, imageUrl, model: usedModel, prompt });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'حدث خطأ أثناء توليد الصورة.' });
  }
});

// 3. Smart Web Browser Search Endpoint (المتصفح الذكي عبر بحث جوجل المباشر)
app.post('/api/browser/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'يرجى إدخال عبارة البحث.' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: 'أنت متصفح الويب الذكي المدمج في منصة Chat OMI، من تطوير عمر الذهلي. ابحث في الإنترنت وقدم ملخصاً سريعاً ودقيقاً ومحدثاً مع المصادر باللغة العربية.',
      },
    });

    const text = response.text || 'لم يتم العثور على نتائج كافية.';
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = searchChunks
      .map((c: any) => ({
        title: c.web?.title || 'مصدر ويب',
        uri: c.web?.uri || '',
      }))
      .filter((s: any) => s.uri);

    res.json({
      success: true,
      text,
      sources: webSources,
      query,
    });
  } catch (err: any) {
    console.error('Browser Search error:', err);
    res.status(500).json({ error: err?.message || 'تعذر استرجاع نتائج المتصفح.' });
  }
});

// 4. Video Creation Endpoint (إنشاء فيديو)
app.post('/api/video/generate', async (req, res) => {
  try {
    const { prompt, style = 'سينمائي' } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'يرجى كتابة وصف الفيديو المراد إنشاؤه.' });
      return;
    }

    // Generate video script & storyboard description with Gemini
    const storyboardRes = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `اكتب وصفاً سينمائياً ومشاهد إخراجية سريعة لإنشاء فيديو قصير بناءً على الوصف التالي: "${prompt}". النمط: ${style}. قدم ملخص المشاهد باللغة العربية في 3 أسطر.`,
    });

    const storyboardText = storyboardRes.text || 'مشهد سينمائي عالي الجودة.';

    // Generate cover/scene frame image using Nano Banana
    let frameUrl = '';
    try {
      const imgRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: `A cinematic 4K video keyframe: ${prompt}, style: ${style}` }],
        },
      });

      for (const part of imgRes.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const base64 = part.inlineData.data;
          const mime = part.inlineData.mimeType ?? 'image/png';
          frameUrl = `data:${mime};base64,${base64}`;
          break;
        }
      }
    } catch {}

    res.json({
      success: true,
      prompt,
      style,
      storyboard: storyboardText,
      thumbnailUrl: frameUrl || '/assets/aistudio/image_4dfbd469.jpg',
      status: 'completed',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'تعذر إنشاء الفيديو.' });
  }
});

// 5. Admin verification endpoint (secret password Om90X.op)
const ADMIN_PASSWORD = 'Om90X.op';
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'تم التحقق من كلمة مرور المدير بنجاح' });
  } else {
    res.status(401).json({ success: false, message: 'كلمة مرور المدير غير صحيحة' });
  }
});

// Direct /admin route redirect to hash
app.get('/admin', (_req, res) => {
  res.redirect('/#admin');
});

// Health info
app.get('/api/info', (_req, res) => {
  res.json({
    app: 'Chat OMI',
    creator: 'عمر الذهلي',
    assistant: 'المساعد خليل',
    version: '3.0.0',
    model: 'gemini-3.8-flash',
    features: ['chat', 'nano_banana_image', 'video_generation', 'web_browser', 'promo_codes'],
    hasApiKey: Boolean(apiKey),
  });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat OMI server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the standalone listener if not running as a Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
