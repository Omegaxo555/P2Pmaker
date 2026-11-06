import { NextRequest, NextResponse } from 'next/server';
import { getUserGraphHistory } from '@/lib/neo4j/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || process.env.DEFAULT_USER_ID || 'usr_123';

    const history = await getUserGraphHistory(userId);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('[Neo4j user API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error consultando historial de grafo del usuario' },
      { status: 500 }
    );
  }
}
