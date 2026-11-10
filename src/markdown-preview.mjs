import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

const formatting = { strong: 'strong', emphasis: 'em', delete: 'del', inlineCode: 'code', code: 'code' };
const blocks = new Set(['root', 'paragraph', 'heading', 'blockquote', 'list', 'listItem', 'table', 'tableRow', 'tableCell']);

export function parseHistoryMarkdown(source) {
  const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  function read(node) {
    if (node.type === 'html' || node.type === 'definition' || node.type === 'footnoteDefinition') return [];
    if (node.type === 'text') return [node.value];
    if (node.type === 'image' || node.type === 'imageReference') return node.alt ? [node.alt] : [];
    if (node.type === 'break' || node.type === 'thematicBreak') return [' '];
    if (node.type === 'footnoteReference') return ['[' + node.identifier + ']'];
    if (node.type === 'code' || node.type === 'inlineCode') return [{ tag: 'code', children: [node.value] }];
    const children = (node.children || []).flatMap((child, index) => [
      ...(blocks.has(node.type) && index ? [' '] : []), ...read(child),
    ]);
    return formatting[node.type] ? [{ tag: formatting[node.type], children }] : children;
  }
  const content = read(tree);
  const text = nodes => nodes.map(node => typeof node === 'string' ? node : text(node.children)).join('');
  return { content, text: text(content).replace(/\s+/g, ' ').trim() };
}

export function renderHistoryMarkdown(preview, h) {
  const render = nodes => nodes.map((node, index) => typeof node === 'string' ? node
    : h(node.tag, { key: index }, ...render(node.children)));
  return render(preview.content);
}
