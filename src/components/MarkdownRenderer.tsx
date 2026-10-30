import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple yet robust custom markdown parser for AI chat outputs
  const renderFormattedText = (text: string) => {
    // Break into code blocks and normal text
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return <CodeBlock key={index} code={code} language={language} />;
      }

      return <TextBlock key={index} text={part} />;
    });
  };

  return <div className="markdown-body space-y-2">{renderFormattedText(content)}</div>;
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/70 bg-slate-950/90 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <span className="uppercase tracking-wider text-[11px] font-semibold text-blue-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 transition text-[11px]"
          title="نسخ الكود"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs text-slate-200 font-mono leading-relaxed" dir="ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={pIdx} className="text-base font-bold text-white mt-3 mb-1">
              {formatInline(trimmed.replace('### ', ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={pIdx} className="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-1">
              {formatInline(trimmed.replace('## ', ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={pIdx} className="text-xl font-black text-white mt-4 mb-2">
              {formatInline(trimmed.replace('# ', ''))}
            </h2>
          );
        }

        // Unordered List
        if (trimmed.split('\n').every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
          const items = trimmed.split('\n').map(line => line.trim().replace(/^[-*]\s+/, ''));
          return (
            <ul key={pIdx} className="list-disc pr-5 space-y-1 my-2 text-slate-200">
              {items.map((item, i) => (
                <li key={i}>{formatInline(item)}</li>
              ))}
            </ul>
          );
        }

        // Ordered List
        if (trimmed.split('\n').every(line => /^\d+\.\s+/.test(line.trim()))) {
          const items = trimmed.split('\n').map(line => line.trim().replace(/^\d+\.\s+/, ''));
          return (
            <ol key={pIdx} className="list-decimal pr-5 space-y-1 my-2 text-slate-200">
              {items.map((item, i) => (
                <li key={i}>{formatInline(item)}</li>
              ))}
            </ol>
          );
        }

        // Regular Paragraph with single-line breaks
        const lines = trimmed.split('\n');
        return (
          <p key={pIdx} className="leading-relaxed text-slate-200">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {formatInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
};

// Helper for bold, italic, and inline code formatting
function formatInline(text: string): React.ReactNode {
  // Regex to match inline code `...` and bold **...**
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-blue-300 font-mono text-xs border border-slate-700/50" dir="ltr">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return token;
  });
}
