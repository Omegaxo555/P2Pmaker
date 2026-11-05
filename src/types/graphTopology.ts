export interface GraphNode {
  id: string;
  label: 'User' | 'DailyClose' | 'BankMethod' | 'TradeOrder';
  title: string;
  sub: string;
  tier: number; // 0: User, 1: DailyClose, 2: BankMethod, 3: TradeOrder
  parentId?: string; // Para animación jerárquica
  properties: Record<string, any>;
  targetX?: number;
  targetY?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: 'TIENE_CIERRE' | 'OPERA_CON' | 'REGISTRO_ORDEN';
  label: string;
  weight?: number;
}

export interface GraphTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
