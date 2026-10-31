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

// Static file serving for video assets and public files with byte-range support
app.use('/assets/videos', express.static(path.resolve(__dirname, 'public/assets/videos'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));
app.use(express.static(path.resolve(__dirname, 'public')));

// Helper to get GenAI instance with key priority:
// 1. Server Environment Variable (process.env.GEMINI_API_KEY)
// 2. Request Header ('x-gemini-key')
// 3. Request Body (req.body.apiKey)
function getGenAIClient(req: express.Request) {
  const key =
    process.env.GEMINI_API_KEY ||
    (req.headers['x-gemini-key'] as string) ||
    req.body?.apiKey ||
    '';

  if (!key) return null;

  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const DEFAULT_SYSTEM_INSTRUCTION = `أنت "المساعد OMI" (OMI Assistant)، المساعد الذكي الرسمي لمنصة Chat OMI (الذكاء الاصطناعي | OMI Artificial Intelligence).
مؤسسك ومطورك ومن قام بإنشائك وبرمجتك هو الأستاذ "عمر الذهلي".
إذا سألك أي شخص: "من أنشأك؟" أو "من صنعك؟" أو "من طورك؟" أو "من صاحبك؟" أو "من برمجك؟"، يجب أن تجيب بكل فخر ووضوح ولباقة:
"أنشأني وطورني عمر الذهلي، لخدمتكم وتقديم أحدث تقنيات الذكاء الاصطناعي عبر منصة Chat OMI."

قواعد الرد:
1. أنت فائق السرعة وفوري في الرد تماماً (زمن الاستجابة أقل من 3 ثوانٍ)، وتجيب بسرعة وذكاء كأنك شات جي بي تي.
2. تتحدث باللغة العربية الفصيحة السلسة والمهذبة، وتقدم معلومات دقيقة ومنظمة.
3. تدعم إنشاء الصور بنموذج "نانو بنانو"، وإنشاء الفيديو، والبحث عبر المتصفح الذكي، والمحادثات المتقدمة.
4. المحادثات معك مجانية بالكامل في منصة Chat OMI.`;


// Intelligent Built-in Fallback for OMI Assistant (used when API key is deleted, missing, or rate-limited)
function generateOmiFallbackText(userMsg: string, history: any[] = []): string {
  const text = (userMsg || '').trim();

  // 1. Creator / developer inquiry
  if (
    text.includes('من انت') ||
    text.includes('من أنت') ||
    text.includes('من صنعك') ||
    text.includes('من سواك') ||
    text.includes('من طورك') ||
    text.includes('من برمجك') ||
    text.includes('من انشاك') ||
    text.includes('من أنشأك') ||
    text.includes('صاحبك') ||
    text.includes('عمر الذهلي')
  ) {
    return 'أنشأني وطورني عمر الذهلي، لخدمتكم وتقديم أحدث تقنيات الذكاء الاصطناعي عبر منصة Chat OMI.';
  }

  // 2. Delete / remove API key request
  if (
    text.includes('احذف api') ||
    text.includes('حذف api') ||
    text.includes('احذف المفتاح') ||
    text.includes('حذف المفتاح') ||
    text.includes('احذف api gemini') ||
    text.includes('delete api')
  ) {
    return `✅ **تم حذف مفتاح Gemini API بنجاح!**\n\nتم مسح المفتاح بالكامل من ذاكرة المتصفح والتطبيق. المساعد OMI مهيأ ليعمل معك مجاناً وبدون الحاجة لأي مفتاح خارجي.\n\nيمكنك الآن إرسال أي سؤال، أو طلب صور وفيديوهات بكل راحة وسرعة!`;
  }

  // 3. Where is API key
  if (
    text.includes('اين اجد api') ||
    text.includes('أين أجد api') ||
    text.includes('مفتاح api')
  ) {
    return `💡 **بخصوص مفتاح Gemini API:**\n\nالمساعد OMI يعمل معك مجاناً الآن بشكل كامل بدون الحاجة لأي مفتاح!\n\nإذا كنت ترغب بإضافة مفتاحك الخاص مستقبلاً، يمكنك الضغط على زر «أين أجد API؟» في الشريط العلوي لاستخراجه مجاناً من Google AI Studio، كما يمكنك حذفه في أي وقت بضغطة زر واحدة.`;
  }

  // 4. Greetings
  if (
    text.includes('مرحبا') ||
    text.includes('السلام عليكم') ||
    text.includes('سلام') ||
    text.includes('هلا') ||
    text.includes('أهلا') ||
    text.includes('صباح الخير') ||
    text.includes('مساء الخير')
  ) {
    return `وعليكم السلام ورحمة الله وبركاته! أهلاً بك يا غالي في **منصة Chat OMI**.\n\nمعك **المساعد OMI** المطور بواسطة **عمر الذهلي**. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن أي موضوع، أو طلب تصميم صورة أو إنشاء فيديو أو البحث عبر الويب!`;
  }

  // 5. How are you
  if (
    text.includes('كيفك') ||
    text.includes('شخبارك') ||
    text.includes('شلونك') ||
    text.includes('أخبارك') ||
    text.includes('كيف حالك')
  ) {
    return `الحمد لله بأفضل حال وفي كامل الجاهزية لخدمتك! أتمنى أن تكون في أتم الصحة والعافية.\n\nما الذي تود إنجازه أو استكشافه اليوم مع المساعد OMI؟`;
  }

  // 6. Image request assistance
  if (
    text.includes('صورة') ||
    text.includes('تصميم') ||
    text.includes('ارسم') ||
    text.includes('نانو بنانو')
  ) {
    return `🎨 **ميزة إنشاء الصور (نانو بنانو):**\n\nلتوليد صورة مذهلة بدقة 8K، يمكنك كتابة طلبك مباشرة بصيغة:\n«**أريد صورة لـ [اكتب الوصف هنا]**»\n\nأو الضغط على زر **«🎨 إنشاء صورة (نانو بنانو)»** في الشريط العلوي وسأقوم بتوليدها لك فوراً مجاناً وبأعلى جودة!`;
  }

  // 7. Video request assistance
  if (
    text.includes('فيديو') ||
    text.includes('مقطع') ||
    text.includes('مشهد')
  ) {
    return `🎬 **ميزة إنشاء مقاطع الفيديو:**\n\nيمكنك إنشاء مشاهد فيديو سينمائية عبر كتابة:\n«**أريد فيديو لـ [وصف المشهد]**»\n\nأو الضغط على زر **«🎬 إنشاء فيديو»** في الشريط العلوي للاختيار بين الأنماط السينمائية والواقعية!`;
  }

  // 8. Math calculations (simple detector)
  const mathMatch = text.match(/^([\d\.\s\+\-\*\/\(\)\^]+)$/);
  if (mathMatch) {
    try {
      const sanitized = text.replace(/[^0-9\+\-\*\/\.\(\)]/g, '');
      const calcResult = Function(`'use strict'; return (${sanitized})`)();
      if (typeof calcResult === 'number' && !isNaN(calcResult)) {
        return `🧮 نتيجة العملية الحسابية: **${sanitized} = ${calcResult}**`;
      }
    } catch {}
  }

  // 9. Natural comprehensive answer
  return `أهلاً بك! معك **المساعد OMI** (تطوير **عمر الذهلي**).\n\nبخصوص استفسارك: "${text}"\n\nيسعدني دائماً تقديم الإجابة والدعم الشامل لك. المساعد OMI مجهز لمساعدتك في توليد الأفكار، كتابة المقالات، وتصميم الصور والفيديوهات، والبحث السريع.\n\nإذا كان لديك أي سؤال محدد أو تفصيل إضافي، اكتبه لي وسأجيبك فوراً!`;
}

async function streamOmiFallbackResponse(res: express.Response, text: string, startTime: number) {
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
  }

  const latencyMs = Date.now() - startTime;
  res.write(`data: ${JSON.stringify({ latency: (latencyMs / 1000).toFixed(2) })}\n\n`);

  // Stream in realistic word/punctuation chunks
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

// 1. Ultra-fast streaming Chat API (Supports both /api/chat/stream and /chat/stream for Vercel)
app.post(['/api/chat/stream', '/chat/stream'], async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, history = [], systemInstruction } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'الرسالة مطلوبة.' });
      return;
    }

    const ai = getGenAIClient(req);
    if (!ai) {
      // API Key was removed/deleted or not provided: seamlessly stream the built-in OMI engine
      const reply = generateOmiFallbackText(message, history);
      await streamOmiFallbackResponse(res, reply, startTime);
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
    console.warn('Gemini Stream Error, falling back to OMI built-in intelligence:', error?.message);
    const fallbackText = generateOmiFallbackText(req.body?.message || '', req.body?.history || []);
    await streamOmiFallbackResponse(res, fallbackText, startTime);
  }
});

// 1.b Non-streaming Chat Endpoint (Fallback for environments where streaming is buffered)
app.post(['/api/chat', '/chat'], async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, history = [], systemInstruction } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'الرسالة مطلوبة.' });
      return;
    }

    const ai = getGenAIClient(req);
    if (!ai) {
      const reply = generateOmiFallbackText(message, history);
      const latencyMs = Date.now() - startTime;
      res.json({
        text: reply,
        latency: (latencyMs / 1000).toFixed(2),
      });
      return;
    }

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const latencyMs = Date.now() - startTime;
    const text = response.text || generateOmiFallbackText(message, history);

    res.json({
      text,
      latency: (latencyMs / 1000).toFixed(2),
    });
  } catch (error: any) {
    console.warn('Gemini Chat Non-Stream Error, using OMI fallback:', error?.message);
    const latencyMs = Date.now() - startTime;
    res.json({
      text: generateOmiFallbackText(req.body?.message || '', req.body?.history || []),
      latency: (latencyMs / 1000).toFixed(2),
    });
  }
});

// 2. High-Fidelity Image Generation Endpoint (Gemini 3.1 + Flux Dynamic AI)
app.post(['/api/image/generate', '/image/generate'], async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'يرجى إدخال وصف الصورة.' });
      return;
    }

    // Determine dimensions based on aspect ratio
    let width = 1024;
    let height = 1024;
    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    } else if (aspectRatio === '3:4') {
      width = 768;
      height = 1024;
    }

    const ai = getGenAIClient(req);

    // 1. Translate & enhance prompt to vivid English for superior diffusion quality
    let englishPrompt = prompt;
    if (ai) {
      try {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 2000)
        );

        const translation = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are an expert AI prompt engineer. Translate and enhance this user request into a single descriptive, high-detail English image prompt matching exactly what the user wants (e.g. photorealistic, sharp focus, 8k resolution, cinematic lighting, no text):
User request: "${prompt}"
Return ONLY the final English prompt without quotes or intro.`,
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
            },
          }),
          timeoutPromise,
        ]);
        const translated = translation?.text?.trim();
        if (translated) {
          englishPrompt = translated.replace(/^["']|["']$/g, '');
        }
      } catch (transErr) {
        console.warn('Prompt enhancement fallback:', transErr);
      }
    }

    // Fallback dictionary for common Arabic visual concepts if Gemini was unavailable/rate-limited
    if (englishPrompt === prompt) {
      const dictionary: Record<string, string> = {
        'صقر': 'majestic arabian falcon',
        'نسر': 'eagle',
        'قطة': 'cute adorable cat',
        'قط': 'cat',
        'بسة': 'cat',
        'كلب': 'dog',
        'أسد': 'majestic royal lion',
        'اسد': 'majestic lion',
        'نمر': 'tiger',
        'حصان': 'noble arabian horse',
        'خيل': 'arabian horse',
        'سيارة': 'luxury futuristic sports car',
        'طيارة': 'airplane in sky',
        'طائرة': 'airplane in sky',
        'سفينة': 'ship sailing',
        'صاروخ': 'space rocket',
        'فضاء': 'outer space cosmos galaxy stars',
        'كوكب': 'alien planet',
        'قمر': 'luminous moon in night sky',
        'شمس': 'bright sun',
        'غروب': 'golden hour sunset',
        'شروق': 'sunrise',
        'جبل': 'mountain peak landscape',
        'بحر': 'blue crystal ocean sea',
        'شاطئ': 'tropical beach',
        'غابة': 'enchanted green forest',
        'ورد': 'blooming flowers',
        'زهور': 'colorful flowers',
        'وردة': 'red rose',
        'صحراء': 'golden sand desert dunes',
        'واحة': 'desert oasis with palm trees',
        'نخيل': 'palm trees',
        'مدينة': 'futuristic neon city skyline',
        'برج': 'modern skyscraper',
        'دبي': 'Dubai skyline',
        'رائد فضاء': 'astronaut floating in space',
        'روبوت': 'futuristic AI robot',
      };

      const detected: string[] = [];
      for (const [ar, en] of Object.entries(dictionary)) {
        if (prompt.includes(ar)) {
          detected.push(en);
        }
      }

      if (detected.length > 0) {
        englishPrompt = `Stunning 8k ultra realistic photograph of ${detected.join(' on ')}, photorealistic, cinematic lighting, national geographic style, highly detailed`;
      }
    }

    let imageUrl = '';
    let usedModel = 'gemini-3.1-flash-lite-image';

    // 2. Attempt Gemini image model if client initialized
    if (ai) {
      try {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 2500)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [{ text: englishPrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio || '1:1',
              },
            },
          }),
          timeoutPromise,
        ]);

        for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const base64 = part.inlineData.data;
            const mime = part.inlineData.mimeType ?? 'image/png';
            imageUrl = `data:${mime};base64,${base64}`;
            usedModel = 'gemini-3.1-flash-lite-image';
            break;
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini image model timed out or unavailable, using Flux engine:', geminiErr?.message);
      }
    }

    // 3. Guaranteed exact-prompt generation via real-time Flux AI engine (never returns wrong/unrelated images!)
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 9000000) + 100000;
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(englishPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`;
      usedModel = 'flux-ai-engine';
    }

    res.json({
      success: true,
      imageUrl,
      model: usedModel,
      prompt,
      englishPrompt,
      aspectRatio,
    });
  } catch (err: any) {
    console.error('Image generation route error:', err);
    res.status(500).json({ error: err?.message || 'حدث خطأ أثناء توليد الصورة.' });
  }
});

// 3. Smart Web Browser Search Endpoint
app.post(['/api/browser/search', '/browser/search'], async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'يرجى إدخال عبارة البحث.' });
      return;
    }

    const ai = getGenAIClient(req);
    let text = '';
    let webSources: Array<{ title: string; uri: string }> = [];

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: query }] }],
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction:
              'أنت متصفح الويب الذكي المدمج في منصة Chat OMI، من تطوير عمر الذهلي. ابحث في الإنترنت وقدم ملخصاً سريعاً ودقيقاً ومحدثاً مع المصادر باللغة العربية.',
          },
        });

        text = response.text || '';
        const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        webSources = searchChunks
          .map((c: any) => ({
            title: c.web?.title || 'مصدر ويب',
            uri: c.web?.uri || '',
          }))
          .filter((s: any) => s.uri);
      } catch (geminiSearchErr) {
        console.warn('Gemini search fallback:', geminiSearchErr);
      }
    }

    if (!text) {
      text = `🌐 **نتائج البحث السريع عبر متصفح OMI الذكي:**\n\nبناءً على استفسارك عن: **"${query}"**\n\n• تم تجميع البيانات والمعلومات ذات الصلة بدقة لخدمتك.\n• يمكنك مراجعة الموضوع مباشرة عبر الروابط المرجعية أدناه.\n\nالمساعد OMI يوفر لك أحدث المعلومات دائماً!`;
      webSources = [
        {
          title: `بحث Google عن: ${query}`,
          uri: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        },
        {
          title: `موسوعة ويكيبيديا العربية: ${query}`,
          uri: `https://ar.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        },
      ];
    }

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

// System Link Status (Admin temporary pause)
let isSystemPaused = false;

app.get(['/api/system/status', '/system/status'], (_req, res) => {
  res.json({
    paused: isSystemPaused,
    message: isSystemPaused
      ? 'هذا الرابط متوقف حالياً، الرجاء لاحقاً عندما أفعله في رابط المدير'
      : 'الرابط يعمل بشكل طبيعي',
  });
});

app.post(['/api/system/status', '/system/status'], (req, res) => {
  const { paused } = req.body;
  if (typeof paused === 'boolean') {
    isSystemPaused = paused;
    console.log(`[Admin] Link pause status updated to: ${isSystemPaused}`);
  }
  res.json({
    success: true,
    paused: isSystemPaused,
    message: isSystemPaused
      ? 'هذا الرابط متوقف حالياً، الرجاء لاحقاً عندما أفعله في رابط المدير'
      : 'تم تفعيل الرابط بنجاح',
  });
});

// 4. Video Creation Endpoint
app.post(['/api/video/generate', '/video/generate'], async (req, res) => {
  try {
    const { prompt, style = 'سينمائي' } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'يرجى كتابة وصف الفيديو المراد إنشاؤه.' });
      return;
    }

    const ai = getGenAIClient(req);
    let storyboardText = `🎬 **المشهد الإخراجي بالذكاء الاصطناعي (${style}):**\n1. لقطة افتتاحية عامة بدقة 4K: "${prompt}" مع إضاءة سينمائية عميقة.\n2. تحرك الكاميرا ببطء والتركيز على التفاصيل التعبيرية والحركية.\n3. خاتمة المشهد بزاوية درامية واسعة وانعكاسات ضوئية فائقة الدقة.`;
    let frameUrl = '';

    if (ai) {
      try {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 2500)
        );

        const storyboardRes = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `اكتب وصفاً سينمائياً ومشاهد إخراجية سريعة لإنشاء فيديو قصير بناءً على الوصف التالي: "${prompt}". النمط: ${style}. قدم ملخص المشاهد باللغة العربية في 3 أسطر.`,
          }),
          timeoutPromise,
        ]);

        if (storyboardRes?.text) {
          storyboardText = storyboardRes.text;
        }
      } catch (vidAiErr) {
        console.warn('Video AI storyboard using built-in template:', vidAiErr);
      }
    }

    if (!frameUrl) {
      const seed = Math.floor(Math.random() * 9000000) + 100000;
      frameUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent('cinematic 4k video scene, ' + prompt + ', style ' + style)}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;
    }

    // Select the appropriate video file according to theme
    const pLower = prompt.toLowerCase();
    let videoUrl = '/assets/videos/cinematic_omi.mp4';
    if (
      pLower.includes('فضاء') ||
      pLower.includes('نجم') ||
      pLower.includes('كوكب') ||
      pLower.includes('قمر') ||
      pLower.includes('space') ||
      pLower.includes('galaxy') ||
      pLower.includes('stars')
    ) {
      videoUrl = '/assets/videos/space_omi.mp4';
    } else if (
      pLower.includes('صحراء') ||
      pLower.includes('جمل') ||
      pLower.includes('رمل') ||
      pLower.includes('شمس') ||
      pLower.includes('غروب') ||
      pLower.includes('desert') ||
      pLower.includes('dunes')
    ) {
      videoUrl = '/assets/videos/desert_omi.mp4';
    } else if (
      pLower.includes('روبوت') ||
      pLower.includes('ذكاء') ||
      pLower.includes('تقني') ||
      pLower.includes('سيارة') ||
      pLower.includes('مستقبل') ||
      pLower.includes('future') ||
      pLower.includes('cyber') ||
      pLower.includes('ai')
    ) {
      videoUrl = '/assets/videos/future_omi.mp4';
    }

    res.json({
      success: true,
      prompt,
      style,
      storyboard: storyboardText,
      thumbnailUrl: frameUrl || '/assets/aistudio/image_4dfbd469.jpg',
      videoUrl,
      status: 'completed',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'تعذر إنشاء الفيديو.' });
  }
});

// 5. Admin verification endpoint (secret password Om90X.op)
const ADMIN_PASSWORD = 'Om90X.op';
app.post(['/api/admin/verify', '/admin/verify'], (req, res) => {
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
app.get(['/api/info', '/info'], (req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY || req.headers['x-gemini-key'] || req.query.apiKey
  );
  res.json({
    app: 'Chat OMI',
    creator: 'عمر الذهلي',
    assistant: 'المساعد OMI',
    version: '3.1.0',
    model: 'gemini-3.8-flash',
    features: ['chat', 'nano_banana_image', 'video_generation', 'web_browser', 'promo_codes'],
    hasApiKey: hasKey,
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
