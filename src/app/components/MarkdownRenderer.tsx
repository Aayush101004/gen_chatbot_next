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

    // --- SIMPLIFIED LOGIC FOR LIST HANDLING ---

    const lines = content.split('\n');
    const rootElements: JSX.Element[] = [];
    const listStack: { items: JSX.Element[]; indent: number }[] = [];

    // Regex now just captures indentation and content, ignoring the marker type
    const listItemRegex = /^(\s*)([\*\-\+]|\d+\.)\s+(.*)/;

    const closeLists = (targetIndent: number) => {
        while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetIndent) {
            const finishedList = listStack.pop()!;
            // Always render a <ul> with list-disc style
            const listElement = (
                <ul key={`list-${rootElements.length}`} className="list-disc list-inside my-1 ml-4">
                    {finishedList.items}
                </ul>
            );

            if (listStack.length > 0) {
                const parentList = listStack[listStack.length - 1];
                const lastItem = parentList.items[parentList.items.length - 1];
                const children = React.Children.toArray(lastItem.props.children);
                children.push(listElement);
                parentList.items[parentList.items.length - 1] = React.cloneElement(lastItem, {}, ...children);
            } else {
                rootElements.push(listElement);
            }
        }
    };

    lines.forEach((line, index) => {
        const match = line.match(listItemRegex);

        if (match) {
            const indent = match[1].length;
            const itemContent = match[3];

            closeLists(indent);

            const currentList = listStack.length > 0 ? listStack[listStack.length - 1] : null;

            // Start a new list only if indentation increases
            if (!currentList || indent > currentList.indent) {
                listStack.push({ items: [], indent });
            }

            const newItem = <li key={index}>{renderLineContent(itemContent)}</li>;
            listStack[listStack.length - 1].items.push(newItem);

        } else {
            closeLists(0);
            if (line.trim()) {
                rootElements.push(<p key={index} className="whitespace-pre-wrap my-2">{renderLineContent(line)}</p>);
            }
        }
    });

    closeLists(0);

    return <>{rootElements}</>;
};

export default MarkdownRenderer;
