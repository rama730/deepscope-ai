"use client";

import React, { memo, useMemo } from "react";
import Link from "next/link";
import { escapeRegExp, cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { projectHref } from "@/lib/routing/identifiers";
import { ContentToken } from "../types";

const CodeBlock = dynamic(
  () => import("@/components/messaging/CodeBlock").then((mod) => mod.CodeBlock),
  {
    loading: () => (
      <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg font-mono text-xs p-4">
        Loading code...
      </div>
    ),
    ssr: false,
  }
);

// -- parsing helpers --

const highlightSearchTerm = (text: string, query?: string): (string | React.ReactNode)[] => {
  if (!query || !text || typeof query !== "string" || query.length > 200) return [text];

  const parts: (string | React.ReactNode)[] = [];
  const escapedQuery = escapeRegExp(query);
  // eslint-disable-next-line security/detect-non-literal-regexp
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <mark key={key++} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded text-inherit">
        {match[0]}
      </mark>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

// -- Components --

const TokenRenderer = memo(({
  token,
  selectedTag,
  searchQuery
}: {
  token: ContentToken;
  selectedTag?: string;
  searchQuery?: string;
}) => {
  const normalizeProjectToken = (raw: string): string => {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  switch (token.type) {
    case 'code':
      return (
        <div className="my-2" onClick={(e) => e.stopPropagation()}>
          <CodeBlock code={token.code} language={token.language || "text"} />
        </div>
      );
    case 'link':
      return (
        <a
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-500/30 underline-offset-2 transition-colors break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {token.content}
        </a>
      );
    case 'tag': {
      const isHighlighted = selectedTag && token.tagName.toLowerCase() === selectedTag.toLowerCase();
      return (
        <span
          className={cn(
            "cursor-pointer transition-colors",
            isHighlighted
              ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1 rounded-sm"
              : "text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-500/30 underline-offset-2"
          )}
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("open-command-palette", {
                detail: { query: `#${token.tagName}` },
              })
            );
          }}
        >
          {token.content}
        </span>
      );
    }
    case 'mention':
      return (
        <Link
          href={`/profile/${token.username}`}
          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-500/30 underline-offset-2 transition-colors font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {token.content}
        </Link>
      );
    case 'project': {
      const slug = normalizeProjectToken(token.slug);
      return (
        <Link
          href={projectHref(slug)}
          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-500/30 underline-offset-2 transition-colors font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {token.content}
        </Link>
      );
    }
    case 'text':
      if (searchQuery) {
        return <>{highlightSearchTerm(token.content, searchQuery)}</>;
      }
      return <>{token.content}</>;
    default:
      return null;
  }
});
TokenRenderer.displayName = "TokenRenderer";

interface PostContentProps {
  content: string;
  tokens?: ContentToken[];
  searchQuery?: string;
  selectedTag?: string;
  className?: string;
}

export const PostContent = memo(function PostContent({
  content,
  tokens,
  searchQuery,
  selectedTag,
  className,
}: PostContentProps) {
  const renderedContent = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      if (!content) return null;
      // Fallback if tokens are missing (legacy or error)
      const segments = [];
      const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;
      const URL_TAG_REGEX = /((?:https?:\/\/[^\s]+)|(?:#|@)\w+|(?:\/)[A-Za-z0-9\-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]+)/g;
      let lastIndex = 0;
      let match;

      // Helper to convert matched patterns to proper tokens
      const tokenizePart = (part: string, key: string): React.ReactNode => {
        if (!part) return null;
        
        if (part.match(/^https?:\/\//)) {
          return <TokenRenderer key={key} token={{ type: 'link', content: part, url: part }} selectedTag={selectedTag} searchQuery={searchQuery} />;
        } else if (part.startsWith('#')) {
          return <TokenRenderer key={key} token={{ type: 'tag', content: part, tagName: part.slice(1) }} selectedTag={selectedTag} searchQuery={searchQuery} />;
        } else if (part.startsWith('@')) {
          return <TokenRenderer key={key} token={{ type: 'mention', content: part, username: part.slice(1) }} selectedTag={selectedTag} searchQuery={searchQuery} />;
        } else if (part.startsWith('/')) {
          // Project mention pattern: /project-slug
          const slug = part.slice(1);
          return <TokenRenderer key={key} token={{ type: 'project', content: part, slug }} selectedTag={selectedTag} searchQuery={searchQuery} />;
        } else {
          return <TokenRenderer key={key} token={{ type: 'text', content: part }} selectedTag={selectedTag} searchQuery={searchQuery} />;
        }
      };

      while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const textSegment = content.substring(lastIndex, match.index);
          const parts = textSegment.split(URL_TAG_REGEX);
          segments.push(...parts.map((p, i) => tokenizePart(p, `fallback-text-${lastIndex}-${i}`)));
        }
        segments.push(<TokenRenderer key={`fallback-code-${match.index}`} token={{ type: 'code', content: match[0], code: match[2] || "", language: match[1] || 'text' }} />);
        lastIndex = CODE_BLOCK_REGEX.lastIndex;
      }
      if (lastIndex < content.length) {
        const textSegment = content.substring(lastIndex);
        const parts = textSegment.split(URL_TAG_REGEX);
        segments.push(...parts.map((p, i) => tokenizePart(p, `fallback-text-${lastIndex}-${i}`)));
      }
      return segments;
    }

    return tokens.map((token, i) => (
      <TokenRenderer
        key={`${token.type}-${i}`}
        token={token}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
      />
    ));
  }, [tokens, content, selectedTag, searchQuery]);

  // Check if className already includes a text color class
  const hasTextColor = className && /text-(?!\[)/.test(className);
  
  return (
    <div className={cn(
      "mt-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal tracking-normal text-part-container",
      // Use text-inherit to respect parent text color (for messages in chat bubbles)
      // Only apply explicit colors if no text color is specified in className
      hasTextColor ? "" : "text-zinc-900 dark:text-zinc-100",
      className
    )}>
      {renderedContent}
    </div>
  );
});
