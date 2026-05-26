import TextNode from './TextNode.jsx';
import ImageNode from './ImageNode.jsx';

export default function NodesLayer({ nodes, tool, selectedNodeId, onSelectNode, onUpdateNode, zoom }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {nodes.map(node => {
        const commonProps = {
          key: node.id,
          node,
          tool,
          selected: node.id === selectedNodeId,
          onSelect: () => onSelectNode(node.id),
          onUpdate: (partial) => onUpdateNode(node.id, partial),
          zoom,
        };

        if (node.type === 'text') {
          return (
            <TextNode
              {...commonProps}
              onMove={(dx, dy) => onUpdateNode(node.id, { x: node.x + dx, y: node.y + dy })}
            />
          );
        }

        return <ImageNode {...commonProps} />;
      })}
    </div>
  );
}
