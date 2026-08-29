import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("prose prose-sm max-w-none dark:prose-invert legal-prose", className)}
      components={{
        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
