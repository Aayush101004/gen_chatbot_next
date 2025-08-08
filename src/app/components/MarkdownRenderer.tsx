// --- src/app/components/MarkdownRenderer.tsx ---
import type { JSX } from 'react';
import React from 'react';

interface MarkdownRendererProps {
    content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const renderLineContent = (line: string): (string | JSX.Element)[] => {
        // Regex to find markdown links: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        // Regex to find bold text: **text**
        const boldRegex = /\*\*([^*]+)\*\*/g;

        let elements: (string | JSX.Element)[] = [line];

        // Function to apply a regex transformation to text parts of an array
        const applyRegex = (
            arr: (string | JSX.Element)[],
            regex: RegExp,
            transform: (match: RegExpExecArray) => JSX.Element
        ) => {
            return arr.flatMap((part) => {
                if (typeof part !== 'string') return [part];

                const newParts: (string | JSX.Element)[] = [];
                let lastIndex = 0;
                let match;

                while ((match = regex.exec(part)) !== null) {
                    if (match.index > lastIndex) {
                        newParts.push(part.substring(lastIndex, match.index));
                    }
                    newParts.push(transform(match));
                    lastIndex = match.index + match[0].length;
                }

                if (lastIndex < part.length) {
                    newParts.push(part.substring(lastIndex));
                }

                return newParts;
            });
        };

        // First, process links
        elements = applyRegex(elements, linkRegex, (match) => (
            <a key={match[2] + match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                {match[1]}
            </a>
        ));

        // Then, process bold text on the remaining string parts
        elements = applyRegex(elements, boldRegex, (match) => (
            <strong key={match.index}>{match[1]}</strong>
        ));

        return elements;
    };

    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    const listStack: { type: 'ul' | 'ol'; items: JSX.Element[]; indent: number; className: string }[] = [];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            while (listStack.length > 0) {
                const finishedList = listStack.pop()!;
                const ListTag = finishedList.type;
                elements.push(<ListTag key={`list-${index}-${listStack.length}`} className={finishedList.className}>{finishedList.items}</ListTag>);
            }
            return;
        }

        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[0].length : 0;

        if (trimmedLine.startsWith('* ')) {
            const listItemContent = trimmedLine.substring(2);
            const newItem = <li key={index}>{renderLineContent(listItemContent)}</li>;

            while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
                const finishedList = listStack.pop()!;
                const ListTag = finishedList.type;
                elements.push(<ListTag key={`list-${index}-${listStack.length}`} className={finishedList.className}>{finishedList.items}</ListTag>);
            }

            if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
                const listStyles = ['list-disc', 'list-decimal', 'list-[lower-alpha]'];
                const listLevel = listStack.length;
                const ListTag = listLevel === 0 ? 'ul' : 'ol';
                const listClass = `${listStyles[listLevel % listStyles.length]} list-inside my-1 ml-4`;
                listStack.push({ type: ListTag, items: [newItem], indent: indent, className: listClass });
            } else {
                listStack[listStack.length - 1].items.push(newItem);
            }
        } else {
            while (listStack.length > 0) {
                const finishedList = listStack.pop()!;
                const ListTag = finishedList.type;
                elements.push(<ListTag key={`list-${index}-${listStack.length}`} className={finishedList.className}>{finishedList.items}</ListTag>);
            }
            elements.push(<p key={index} className="whitespace-pre-wrap">{renderLineContent(trimmedLine)}</p>);
        }
    });

    while (listStack.length > 0) {
        const finishedList = listStack.pop()!;
        const ListTag = finishedList.type;
        elements.push(<ListTag key={`list-end-${listStack.length}`} className={finishedList.className}>{finishedList.items}</ListTag>);
    }

    return <>{elements}</>;
};

export default MarkdownRenderer;
