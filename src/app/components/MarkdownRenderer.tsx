// --- src/app/components/MarkdownRenderer.tsx ---
import type { JSX } from 'react';
import React from 'react';

interface MarkdownRendererProps {
    content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    // This function for handling bold/links within a line is correct and remains unchanged
    const renderLineContent = (line: string): (string | JSX.Element)[] => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const boldRegex = /\*\*([^*]+)\*\*/g;

        let elements: (string | JSX.Element)[] = [line];

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

        elements = applyRegex(elements, linkRegex, (match) => (
            <a key={match[2] + match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                {match[1]}
            </a>
        ));

        elements = applyRegex(elements, boldRegex, (match) => (
            <strong key={match.index}>{match[1]}</strong>
        ));

        return elements;
    };

    // --- REWRITTEN LOGIC FOR LIST HANDLING STARTS HERE ---

    const lines = content.split('\n');
    const rootElements: JSX.Element[] = [];
    const listStack: { type: 'ul' | 'ol'; items: JSX.Element[]; indent: number }[] = [];

    // Regex to capture indentation, list marker (*, -, +, or 1.), and content
    const listItemRegex = /^(\s*)([\*\-\+]|\d+\.)\s+(.*)/;

    const closeLists = (targetIndent: number) => {
        while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetIndent) {
            const finishedList = listStack.pop()!;
            const ListTag = finishedList.type;
            const listElement = (
                <ListTag key={`list-${rootElements.length}`} className={`${finishedList.type === 'ul' ? 'list-disc' : 'list-decimal'} list-inside my-1 ml-4`}>
                    {finishedList.items}
                </ListTag>
            );

            if (listStack.length > 0) {
                // This was a nested list, so add it as an `li` to its parent
                const parentList = listStack[listStack.length - 1];
                const lastItem = parentList.items[parentList.items.length - 1];
                // Append the nested list to the last list item of the parent
                parentList.items[parentList.items.length - 1] = React.cloneElement(lastItem, {}, lastItem.props.children, listElement);

            } else {
                // This was a top-level list
                rootElements.push(listElement);
            }
        }
    };


    lines.forEach((line, index) => {
        const match = line.match(listItemRegex);

        if (match) {
            const indent = match[1].length;
            const marker = match[2];
            const itemContent = match[3];

            // Determine if it's an ordered (ol) or unordered (ul) list
            const listType = /\d/.test(marker) ? 'ol' : 'ul';

            closeLists(indent);

            const currentList = listStack.length > 0 ? listStack[listStack.length - 1] : null;

            // Start a new list if we're deeper, or if the type changes (e.g., from ul to ol)
            if (!currentList || indent > currentList.indent || listType !== currentList.type) {
                listStack.push({ type: listType, items: [], indent });
            }

            // Add the new item to the current list
            const newItem = <li key={index}>{renderLineContent(itemContent)}</li>;
            listStack[listStack.length - 1].items.push(newItem);

        } else {
            // This line is not a list item, so close any open lists
            closeLists(0);
            if (line.trim()) {
                rootElements.push(<p key={index} className="whitespace-pre-wrap my-2">{renderLineContent(line)}</p>);
            }
        }
    });

    // Close any remaining lists at the end of the content
    closeLists(0);

    return <>{rootElements}</>;
};

export default MarkdownRenderer;