import "katex/dist/katex.min.css";
import React, { cloneElement, isValidElement, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  base16AteliersulphurpoolLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import remarkMermaid from "../remark/remarkMermaid";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import Lightbox, { SlideImage } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useColorMode } from "../utils/darkModeUtils";

const countNewlinesBeforeNode = (text: string, offset: number) => {
  let newlinesBefore = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      newlinesBefore++;
    } else {
      break;
    }
  }
  return newlinesBefore;
};

const isMarkdownImageLinkAtEnd = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/(.*)(!\\[.*?\\]\\(.*?\\))$/s);
  if (match) {
    const [, beforeImage, _] = match;
    return beforeImage.trim().length === 0 || beforeImage.endsWith("\n");
  }
  return false;
};

export function Markdown({ content }: { content: string }) {
  const colorMode = useColorMode();
  const [index, setIndex] = React.useState(-1);
  const slides = useRef<SlideImage[]>();

  useEffect(() => {
    slides.current = undefined;
  }, [content]);

  const Content = useMemo(() => (
    <ReactMarkdown
      className="markdown-body prose dark:prose-invert max-w-none"
      remarkPlugins={[gfm, remarkMermaid, remarkMath, remarkAlert]}
      children={content}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        img({ node, src, ...props }) {
          const offset = node!.position!.start.offset!;
          const previousContent = content.slice(0, offset);
          const newlinesBefore = countNewlinesBeforeNode(previousContent, offset);
          
          const Image = ({ rounded, scale }: { rounded: boolean; scale: string }) => (
            <img
              src={src}
              {...props}
              onClick={() => show(src)}
              className={`mx-auto transition-all duration-200 ${rounded ? "rounded-xl" : "rounded-md"} hover:shadow-lg`}
              style={{ zoom: scale }}
            />
          );

          if (newlinesBefore >= 1 || previousContent.trim().length === 0 || isMarkdownImageLinkAtEnd(previousContent)) {
            return (
              <div className="my-6 flex justify-center">
                <Image scale="0.85" rounded={true} />
              </div>
            );
          } else {
            return (
              <span className="inline-block align-middle mx-1.5">
                <Image scale="0.65" rounded={false} />
              </span>
            );
          }
        },
        code(props) {
          const [copied, setCopied] = React.useState(false);
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const curContent = content.slice(node?.position?.start.offset || 0);
          const isCodeBlock = curContent.trimStart().startsWith("```");

          const codeBlockStyle = {
            fontFamily: '"Fira Code", monospace',
            fontSize: "0.9em",
            fontVariantLigatures: "normal",
            WebkitFontFeatureSettings: '"liga" 1',
            fontFeatureSettings: '"liga" 1',
          };

          const inlineCodeStyle = {
            ...codeBlockStyle,
            fontSize: "0.85em",
          };

          const language = match ? match[1] : "";

          if (isCodeBlock) {
            return (
              <div className="relative my-4 group">
                <SyntaxHighlighter
                  PreTag="div"
                  className="rounded-lg shadow-sm"
                  language={language}
                  style={colorMode === "dark" ? vscDarkPlus : base16AteliersulphurpoolLight}
                  wrapLongLines={true}
                  codeTagProps={{ style: codeBlockStyle }}
                  showLineNumbers={true}
                  lineNumberStyle={{ opacity: 0.5, minWidth: "2.5em" }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
                <button
                  className="absolute top-2 right-2 px-2.5 py-1 bg-opacity-90 backdrop-blur-sm rounded-md text-xs font-medium transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-opacity-100"
                  style={{
                    backgroundColor: colorMode === "dark" ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 0.9)',
                    color: colorMode === "dark" ? '#e2e8f0' : '#334155'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(String(children));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            );
          } else {
            return (
              <code
                {...rest}
                className={`font-mono bg-opacity-50 px-1.5 py-0.5 rounded-md mx-0.5 text-sm ${
                  colorMode === "dark" 
                    ? "bg-gray-700 text-gray-200" 
                    : "bg-gray-100 text-gray-800"
                } ${className || ""}`}
                style={inlineCodeStyle}
              >
                {children}
              </code>
            );
          }
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-500 pl-4 italic text-gray-600 dark:text-gray-300 my-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-r-md"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        em({ children, ...props }) {
          return (
            <em className="italic text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </em>
          );
        },
        strong({ children, ...props }) {
          return (
            <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </strong>
          );
        },
        ul({ children, className, ...props }) {
          const listClass = className?.includes("contains-task-list")
            ? "list-none pl-0 my-3"
            : "list-disc pl-6 my-3 space-y-1";
          return (
            <ul className={listClass} {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="list-decimal pl-6 my-3 space-y-1" {...props}>
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li className="pl-1 py-0.5" {...props}>
              {children}
            </li>
          );
        },
        a({ children, ...props }) {
          return (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-150"
              {...props}
            >
              {children}
            </a>
          );
        },
        h1({ children, ...props }) {
          return (
            <h1
              id={children?.toString()}
              className="text-4xl font-bold mt-8 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              {...props}
            >
              {children}
            </h1>
          );
        },
        h2({ children, ...props }) {
          return (
            <h2
              id={children?.toString()}
              className="text-3xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-200"
              {...props}
            >
              {children}
            </h2>
          );
        },
        h3({ children, ...props }) {
          return (
            <h3
              id={children?.toString()}
              className="text-2xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300"
              {...props}
            >
              {children}
            </h3>
          );
        },
        h4({ children, ...props }) {
          return (
            <h4
              id={children?.toString()}
              className="text-xl font-semibold mt-5 mb-2 text-gray-700 dark:text-gray-300"
              {...props}
            >
              {children}
            </h4>
          );
        },
        h5({ children, ...props }) {
          return (
            <h5
              id={children?.toString()}
              className="text-lg font-medium mt-4 mb-1 text-gray-700 dark:text-gray-300"
              {...props}
            >
              {children}
            </h5>
          );
        },
        h6({ children, ...props }) {
          return (
            <h6
              id={children?.toString()}
              className="text-base font-medium mt-3 mb-1 text-gray-600 dark:text-gray-400"
              {...props}
            >
              {children}
            </h6>
          );
        },
        p({ children, node, ...props }) {
          return (
            <p className="my-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </p>
          );
        },
        hr({ children, ...props }) {
          return (
            <hr className="my-8 border-t border-gray-200 dark:border-gray-700" {...props} />
          );
        },
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table 
              className="w-full border-collapse rounded-lg overflow-hidden shadow-sm"
              {...props} 
            />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th 
            className="px-4 py-3 border bg-gray-100 dark:bg-gray-700 font-semibold text-left text-gray-700 dark:text-gray-200"
            {...props} 
          />
        ),
        td: ({ node, ...props }) => (
          <td 
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            {...props} 
          />
        ),
        sup: ({ children, ...props }) => (
          <sup className="text-xs ml-0.5" {...props}>
            {children}
          </sup>
        ),
        sub: ({ children, ...props }) => (
          <sub className="text-xs ml-0.5" {...props}>
            {children}
          </sub>
        ),
        section({ children, ...props }) {
          if (props.hasOwnProperty("data-footnotes")) {
            props.className = `${props.className || ""} mt-8 border-t pt-4 border-gray-200 dark:border-gray-700`.trim();
          }
          const modifiedChildren = React.Children.map(children, (child) => {
            if (isValidElement(child) && child.props.node.tagName === "ol") {
              return cloneElement(child, {
                ...child.props,
                className: "list-decimal pl-6 text-sm text-gray-500 dark:text-gray-400 space-y-1",
              } as React.HTMLAttributes<HTMLParagraphElement>);
            }
            return child;
          });
          return <section {...props}>{modifiedChildren}</section>;
        },
        div({ children, node, ...props }) {
          return <div className="my-2" {...props}>{children}</div>;
        },
      }}
    />
  ), [content, colorMode]);

  const show = (src: string | undefined) => {
    let slidesLocal = slides.current;
    if (!slidesLocal) {
      const parent = document.getElementsByClassName("markdown-body")[0];
      if (!parent) return;
      const images = parent.querySelectorAll("img");
      slidesLocal = Array.from(images)
        .map((image) => {
          const url = image.getAttribute("src") || "";
          const filename = url.split("/").pop() || "";
          const alt = image.getAttribute("alt") || "";
          return {
            src: url,
            alt: alt,
            imageFit: "contain" as const,
            download: {
              url: url,
              filename: filename,
            },
          };
        })
        .filter((slide) => slide.src !== "");
      slides.current = slidesLocal;
    }
    const index = slidesLocal?.findIndex((slide) => slide.src === src) ?? -1;
    setIndex(index);
  };

  return (
    <>
      {Content}
      <Lightbox
        plugins={[Download, Zoom, Counter]}
        index={index}
        slides={slides.current}
        open={index >= 0}
        close={() => setIndex(-1)}
      />
    </>
  );
}
