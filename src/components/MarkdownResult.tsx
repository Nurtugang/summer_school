import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownResult({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-[14px] text-ink [&_p]:leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          ul: ({ children }) => <ul className="flex flex-col gap-1 pl-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="flex flex-col gap-1 pl-5 list-decimal">{children}</ol>,
          h1: ({ children }) => <p className="text-[16px] font-heading font-semibold text-ink">{children}</p>,
          h2: ({ children }) => <p className="text-[16px] font-heading font-semibold text-ink">{children}</p>,
          h3: ({ children }) => <p className="text-[15px] font-heading font-semibold text-ink">{children}</p>,
          table: ({ children }) => (
            <div className="overflow-x-auto border border-line">
              <table className="w-full border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-mint">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-line px-2.5 py-2 align-top font-medium text-ink">{children}</th>
          ),
          td: ({ children }) => <td className="border border-line px-2.5 py-2 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
