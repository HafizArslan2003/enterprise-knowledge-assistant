import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Helper to parse inline bold, italic, code, and inline references
  const renderInlineText = (text: string): React.ReactNode[] => {
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\])/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return <strong key={idx} className="font-extrabold text-agilo-navy">{inner}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        const inner = part.slice(1, -1);
        return <em key={idx} className="italic text-agilo-navy">{inner}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-agilo-deep font-mono text-[12px] border border-slate-200">
            {inner}
          </code>
        );
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        const inner = part.slice(1, -1);
        return (
          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-agilo-primary/10 text-agilo-primary text-[11px] font-bold border border-agilo-primary/20">
            📄 {inner}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let isNumbered = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-2 pl-2">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(
        <hr key={`hr-${index}`} className="my-4 border-t border-agilo-border/60" />
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      const text = trimmed.slice(4).trim();
      elements.push(
        <h3 key={`h3-${index}`} className="text-base font-extrabold text-agilo-navy mt-4 mb-2 tracking-tight">
          {renderInlineText(text)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      const text = trimmed.slice(3).trim();
      elements.push(
        <h2 key={`h2-${index}`} className="text-lg font-extrabold text-agilo-navy mt-5 mb-2 tracking-tight">
          {renderInlineText(text)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      const text = trimmed.slice(2).trim();
      elements.push(
        <h1 key={`h1-${index}`} className="text-xl font-extrabold text-agilo-navy mt-6 mb-3 tracking-tight">
          {renderInlineText(text)}
        </h1>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (currentList.length > 0 && !isNumbered) flushList();
      isNumbered = true;
      currentList.push(
        <li key={`li-num-${index}`} className="text-sm leading-relaxed text-agilo-navy font-medium">
          {renderInlineText(numberedMatch[2])}
        </li>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentList.length > 0 && isNumbered) flushList();
      isNumbered = false;
      const text = trimmed.slice(2).trim();
      currentList.push(
        <li key={`li-bullet-${index}`} className="text-sm leading-relaxed text-agilo-navy flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-agilo-primary mt-2 shrink-0" />
          <span>{renderInlineText(text)}</span>
        </li>
      );
      return;
    }

    if (trimmed === '') {
      flushList();
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed my-1.5">
        {renderInlineText(line)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
