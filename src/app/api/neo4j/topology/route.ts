import { NextRequest, NextResponse } from 'next/server';
import { getGraphTopology } from '@/lib/neo4j/queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || process.env.DEFAULT_USER_ID || 'usr_123';

    const topology = await getGraphTopology(userId);
    return NextResponse.json(topology);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al obtener la topología del grafo' },
      { status: 500 }
    );
  }
}

