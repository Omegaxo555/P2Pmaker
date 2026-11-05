export interface GraphNode {
  id: string;
  label: 'User' | 'BankMethod' | 'Trade' | 'Contraparte';
  title: string;
  sub: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: 'PREFIERE' | 'EJECUTO' | 'USO_METODO' | 'BLOQUEO';
  label: string;
  weight?: number;
}

export interface GraphTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
