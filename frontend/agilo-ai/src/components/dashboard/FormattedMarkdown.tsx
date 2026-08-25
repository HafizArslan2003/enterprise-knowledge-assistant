import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-left border-collapse border border-agilo-border rounded-lg" {...props} /></div>,
          thead: ({node, ...props}) => <thead className="bg-agilo-bg text-agilo-navy font-semibold" {...props} />,
          th: ({node, ...props}) => <th className="p-3 border border-agilo-border" {...props} />,
          td: ({node, ...props}) => <td className="p-3 border border-agilo-border" {...props} />,
          tr: ({node, ...props}) => <tr className="even:bg-slate-50" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="pl-1" {...props} />,
          a: ({node, ...props}) => <a className="text-agilo-primary hover:underline font-medium" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-agilo-navy" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
